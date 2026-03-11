import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import * as Network from 'expo-network';
import { Ionicons } from '@expo/vector-icons';

type RiskLevel = 'low' | 'medium' | 'high';

interface NetworkCheckResult {
  isConnected: boolean;
  networkType: string;
  ipAddress: string;
  isInternetReachable: boolean | null;
  riskLevel: RiskLevel;
  risks: string[];
  suggestions: string[];
}

function classifyNetworkType(type: Network.NetworkStateType): string {
  switch (type) {
    case Network.NetworkStateType.WIFI: return 'Wi-Fi';
    case Network.NetworkStateType.CELLULAR: return 'モバイルデータ';
    case Network.NetworkStateType.ETHERNET: return '有線LAN';
    case Network.NetworkStateType.BLUETOOTH: return 'Bluetooth';
    case Network.NetworkStateType.NONE: return '未接続';
    default: return '不明';
  }
}

function analyzeNetwork(
  state: Network.NetworkState,
  ip: string
): NetworkCheckResult {
  const risks: string[] = [];
  const suggestions: string[] = [];
  const networkType = classifyNetworkType(state.type ?? Network.NetworkStateType.NONE);

  // プライベートIPアドレスかチェック
  const isPrivateIp =
    /^10\./.test(ip) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    /^192\.168\./.test(ip) ||
    ip === '0.0.0.0' ||
    ip === '127.0.0.1';

  // パブリックIPに直接接続 (Wi-Fi以外の場合は普通だがWi-Fiで変なIPは注意)
  if (state.type === Network.NetworkStateType.WIFI && !isPrivateIp && ip !== '0.0.0.0') {
    risks.push('Wi-Fi接続なのにパブリックIPが割り当てられています (通常は異常)');
    suggestions.push('接続しているWi-Fiの設定を確認してください');
  }

  // モバイルデータのリスク
  if (state.type === Network.NetworkStateType.CELLULAR) {
    suggestions.push('モバイルデータは比較的安全ですが、通信量に注意してください');
  }

  // インターネット到達性
  if (state.isInternetReachable === false) {
    risks.push('インターネットに接続できていない可能性があります');
  }

  // Wi-Fiのリスク評価
  if (state.type === Network.NetworkStateType.WIFI) {
    // Expo managed workflowではSSIDや暗号化方式を直接取得できないため
    // ユーザーへの注意喚起を行う
    risks.push('公共Wi-Fiの場合: 通信傍受のリスクがあります');
    suggestions.push('公共の場所では VPN の使用を推奨します');
    suggestions.push('ネットバンキングや重要な操作は避けることを推奨します');
  }

  // リスクレベル判定
  let riskLevel: RiskLevel = 'low';
  if (
    state.type === Network.NetworkStateType.WIFI &&
    state.isInternetReachable !== false
  ) {
    riskLevel = 'medium'; // Wi-Fiは常に中リスク (公共の可能性)
  }
  if (risks.some((r) => r.includes('パブリックIP') || r.includes('到達できていない'))) {
    riskLevel = 'high';
  }

  return {
    isConnected: state.isConnected ?? false,
    networkType,
    ipAddress: ip || '取得不可',
    isInternetReachable: state.isInternetReachable ?? null,
    riskLevel,
    risks,
    suggestions,
  };
}

const riskColor = { low: '#00ff88', medium: '#ffb800', high: '#ff4444' };
const riskLabel = { low: '低リスク', medium: '中リスク', high: '高リスク' };
const riskIcon = { low: 'shield-checkmark', medium: 'shield-half', high: 'shield' } as const;

export default function NetworkScreen() {
  const [result, setResult] = useState<NetworkCheckResult | null>(null);
  const [scanning, setScanning] = useState(false);

  const runCheck = async () => {
    setScanning(true);
    try {
      const [state, ip] = await Promise.all([
        Network.getNetworkStateAsync(),
        Network.getIpAddressAsync(),
      ]);
      setResult(analyzeNetwork(state, ip));
    } catch (e) {
      setResult({
        isConnected: false,
        networkType: '取得失敗',
        ipAddress: '取得失敗',
        isInternetReachable: null,
        riskLevel: 'high',
        risks: ['ネットワーク情報の取得に失敗しました'],
        suggestions: ['位置情報・ネットワーク権限を確認してください'],
      });
    } finally {
      setScanning(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>ネットワーク簡易セキュリティチェック</Text>

      {result && (
        <>
          {/* リスクレベル */}
          <View style={[styles.riskCard, { borderColor: riskColor[result.riskLevel] }]}>
            <Ionicons
              name={riskIcon[result.riskLevel]}
              size={48}
              color={riskColor[result.riskLevel]}
            />
            <Text style={[styles.riskLabel, { color: riskColor[result.riskLevel] }]}>
              {riskLabel[result.riskLevel]}
            </Text>
          </View>

          {/* ネットワーク情報 */}
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>接続情報</Text>
            <InfoRow label="接続タイプ" value={result.networkType} />
            <InfoRow label="IPアドレス" value={result.ipAddress} />
            <InfoRow
              label="接続状態"
              value={result.isConnected ? '接続中' : '未接続'}
              valueColor={result.isConnected ? '#00ff88' : '#ff4444'}
            />
            <InfoRow
              label="インターネット"
              value={
                result.isInternetReachable === null
                  ? '確認中'
                  : result.isInternetReachable
                  ? '到達可能'
                  : '到達不可'
              }
              valueColor={result.isInternetReachable ? '#00ff88' : '#ff4444'}
            />
          </View>

          {/* リスク */}
          {result.risks.length > 0 && (
            <View style={styles.listCard}>
              <Text style={styles.listCardTitle}>検出されたリスク</Text>
              {result.risks.map((r, i) => (
                <View key={i} style={styles.listRow}>
                  <Ionicons name="warning-outline" size={16} color="#ffb800" />
                  <Text style={styles.listText}>{r}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 推奨事項 */}
          {result.suggestions.length > 0 && (
            <View style={styles.listCard}>
              <Text style={styles.listCardTitle}>推奨事項</Text>
              {result.suggestions.map((s, i) => (
                <View key={i} style={styles.listRow}>
                  <Ionicons name="bulb-outline" size={16} color="#00b4ff" />
                  <Text style={styles.listText}>{s}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      <TouchableOpacity
        style={[styles.scanBtn, scanning && styles.scanBtnDisabled]}
        onPress={runCheck}
        disabled={scanning}
        activeOpacity={0.8}
      >
        <Ionicons name={scanning ? 'hourglass-outline' : 'wifi-outline'} size={22} color="#0a0e1a" />
        <Text style={styles.scanBtnText}>
          {scanning ? 'チェック中...' : result ? '再チェック' : 'チェック開始'}
        </Text>
      </TouchableOpacity>

      <View style={styles.note}>
        <Ionicons name="information-circle-outline" size={14} color="#4a5568" />
        <Text style={styles.noteText}>
          Wi-Fiの暗号化方式(WPA2/WPA3)はOSの制限により直接取得できません。
          暗号化方式はルーターの設定画面で確認してください。
        </Text>
      </View>
    </ScrollView>
  );
}

function InfoRow({
  label,
  value,
  valueColor = '#fff',
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e1a' },
  content: { padding: 20, paddingBottom: 48 },
  pageTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 20 },
  riskCard: {
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 20,
    padding: 28,
    marginBottom: 16,
  },
  riskLabel: { fontSize: 24, fontWeight: 'bold', marginTop: 10 },
  infoCard: {
    backgroundColor: '#0d1224',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1a2040',
    gap: 12,
  },
  infoCardTitle: { color: '#4a5568', fontSize: 12, marginBottom: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { color: '#4a5568', fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '500' },
  listCard: {
    backgroundColor: '#0d1224',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1a2040',
    gap: 10,
  },
  listCardTitle: { color: '#4a5568', fontSize: 12, marginBottom: 4 },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  listText: { flex: 1, color: '#ccc', fontSize: 13, lineHeight: 19 },
  scanBtn: {
    backgroundColor: '#00ff88',
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
    marginBottom: 16,
  },
  scanBtnDisabled: { opacity: 0.6 },
  scanBtnText: { color: '#0a0e1a', fontSize: 17, fontWeight: 'bold' },
  note: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  noteText: { flex: 1, color: '#4a5568', fontSize: 11, lineHeight: 16 },
});
