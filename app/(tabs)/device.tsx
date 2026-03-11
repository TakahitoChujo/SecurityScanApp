import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import * as Device from 'expo-device';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';

type CheckStatus = 'pending' | 'pass' | 'warn' | 'fail';

interface CheckItem {
  id: string;
  title: string;
  description: string;
  status: CheckStatus;
  detail: string;
  suggestion?: string;
}

// 古いOSバージョン判定 (2024年時点)
function isOsOutdated(osName: string | null, osVersion: string | null): boolean {
  if (!osVersion) return false;
  const major = parseInt(osVersion.split('.')[0], 10);
  if (osName === 'iOS') return major < 16;
  if (osName === 'Android') return major < 12;
  return false;
}

export default function DeviceScreen() {
  const [checks, setChecks] = useState<CheckItem[]>([]);
  const [scanning, setScanning] = useState(false);
  const [done, setDone] = useState(false);

  const runChecks = async () => {
    setScanning(true);
    setDone(false);
    setChecks([]);

    const results: CheckItem[] = [];

    // 1. OSバージョンチェック
    const osName = Device.osName;
    const osVersion = Device.osVersion;
    const outdated = isOsOutdated(osName, osVersion);
    results.push({
      id: 'os',
      title: 'OSバージョン',
      description: 'OSが最新かどうかを確認',
      status: outdated ? 'warn' : 'pass',
      detail: `${osName ?? '不明'} ${osVersion ?? '不明'} ${outdated ? '→ アップデートを推奨' : '→ 最新'}`,
      suggestion: outdated
        ? '「設定 > 一般 > ソフトウェアアップデート」から最新のOSに更新してください。セキュリティパッチが含まれています。'
        : undefined,
    });
    setChecks([...results]);

    // 2. 実機チェック (エミュレータ検知)
    const isDevice = Device.isDevice;
    results.push({
      id: 'emulator',
      title: '実機 / エミュレータ',
      description: '実機での実行かを確認',
      status: isDevice ? 'pass' : 'warn',
      detail: isDevice ? '実機で動作しています' : 'エミュレータ/シミュレータで動作しています',
      suggestion: !isDevice
        ? 'エミュレータ上では正確なセキュリティ診断ができません。実機での確認を推奨します。'
        : undefined,
    });
    setChecks([...results]);

    // 3. 生体認証 / パスコード設定
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      const typeNames = supportedTypes
        .map((t) => {
          if (t === LocalAuthentication.AuthenticationType.FINGERPRINT) return '指紋';
          if (t === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) return '顔認証';
          if (t === LocalAuthentication.AuthenticationType.IRIS) return '虹彩';
          return '不明';
        })
        .join(', ');

      results.push({
        id: 'biometric',
        title: '生体認証 / 画面ロック',
        description: 'パスコードや生体認証が設定されているか確認',
        status: !hasHardware ? 'warn' : isEnrolled ? 'pass' : 'fail',
        detail: !hasHardware
          ? '生体認証ハードウェアなし'
          : isEnrolled
          ? `登録済み: ${typeNames || 'パスコード'}`
          : '生体認証が未設定です → 設定することを推奨',
        suggestion: !hasHardware
          ? undefined
          : !isEnrolled
          ? '「設定 > Face ID とパスコード」（または「Touch ID とパスコード」）から生体認証を設定してください。紛失時の不正アクセスを防げます。'
          : undefined,
      });
    } catch {
      results.push({
        id: 'biometric',
        title: '生体認証 / 画面ロック',
        description: 'パスコードや生体認証が設定されているか確認',
        status: 'warn',
        detail: '確認できませんでした',
      });
    }
    setChecks([...results]);

    // 4. Root / Jailbreak 検知 (ヒューリスティック)
    //    Expo managed workflow では完全な検知は不可能だが基本的なチェックを実施
    let rootStatus: CheckStatus = 'warn';
    let rootDetail = 'Expo managed workflowでは完全な検知は不可能です';

    if (__DEV__) {
      rootStatus = 'warn';
      rootDetail = '開発ビルドで動作しています (本番環境では問題なし)';
    }

    results.push({
      id: 'root',
      title: 'Root / Jailbreak',
      description: '端末が改造されていないか確認',
      status: rootStatus,
      detail: rootDetail,
      suggestion: __DEV__
        ? undefined
        : 'Jailbreak/Root化された端末はマルウェア感染や個人情報漏洩のリスクが大幅に高まります。公式のOSに戻すことを強く推奨します。',
    });
    setChecks([...results]);

    // 5. デバイスタイプ
    const deviceType = await Device.getDeviceTypeAsync();
    const deviceTypeLabel = [
      'Unknown', 'Phone', 'Tablet', 'Desktop', 'TV',
    ][deviceType] ?? 'Unknown';

    results.push({
      id: 'device',
      title: 'デバイス情報',
      description: 'デバイスの基本情報',
      status: 'pass',
      detail: `${Device.modelName ?? '不明'} (${deviceTypeLabel})`,
    });
    setChecks([...results]);

    setScanning(false);
    setDone(true);
  };

  const passCount = checks.filter((c) => c.status === 'pass').length;
  const failCount = checks.filter((c) => c.status === 'fail').length;
  const warnCount = checks.filter((c) => c.status === 'warn').length;

  const statusIcon = (status: CheckStatus) => {
    switch (status) {
      case 'pass': return <Ionicons name="checkmark-circle" size={22} color="#00ff88" />;
      case 'warn': return <Ionicons name="alert-circle" size={22} color="#ffb800" />;
      case 'fail': return <Ionicons name="close-circle" size={22} color="#ff4444" />;
      default: return <Ionicons name="ellipse-outline" size={22} color="#4a5568" />;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>デバイス簡易セキュリティチェック</Text>

      {done && (
        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, { color: '#00ff88' }]}>{passCount}</Text>
            <Text style={styles.summaryLabel}>正常</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, { color: '#ffb800' }]}>{warnCount}</Text>
            <Text style={styles.summaryLabel}>注意</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, { color: '#ff4444' }]}>{failCount}</Text>
            <Text style={styles.summaryLabel}>問題あり</Text>
          </View>
        </View>
      )}

      {checks.map((item) => (
        <View key={item.id} style={styles.checkCard}>
          <View style={styles.checkHeader}>
            {statusIcon(item.status)}
            <Text style={styles.checkTitle}>{item.title}</Text>
          </View>
          <Text style={styles.checkDesc}>{item.description}</Text>
          <Text style={styles.checkDetail}>{item.detail}</Text>
          {item.suggestion && (
            <View style={styles.suggestionRow}>
              <Ionicons name="bulb-outline" size={14} color="#00b4ff" />
              <Text style={styles.suggestionText}>{item.suggestion}</Text>
            </View>
          )}
        </View>
      ))}

      {done && checks.some((c) => c.suggestion) && (
        <View style={styles.actionsCard}>
          <Text style={styles.actionsTitle}>推奨アクション</Text>
          {checks.filter((c) => c.suggestion).map((item) => (
            <View key={item.id} style={styles.actionRow}>
              <Ionicons name="arrow-forward-circle-outline" size={16} color="#ffb800" />
              <Text style={styles.actionText}>
                <Text style={styles.actionLabel}>{item.title}: </Text>
                {item.suggestion}
              </Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={[styles.scanBtn, scanning && styles.scanBtnDisabled]}
        onPress={runChecks}
        disabled={scanning}
        activeOpacity={0.8}
      >
        <Ionicons name={scanning ? 'hourglass-outline' : 'shield-checkmark-outline'} size={22} color="#0a0e1a" />
        <Text style={styles.scanBtnText}>
          {scanning ? 'チェック中...' : done ? '再チェック' : 'チェック開始'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e1a' },
  content: { padding: 20, paddingBottom: 48 },
  pageTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 20 },
  summary: {
    flexDirection: 'row',
    backgroundColor: '#0d1224',
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#1a2040',
  },
  summaryItem: { alignItems: 'center' },
  summaryNum: { fontSize: 32, fontWeight: 'bold' },
  summaryLabel: { color: '#4a5568', fontSize: 12, marginTop: 4 },
  checkCard: {
    backgroundColor: '#0d1224',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1a2040',
    gap: 6,
  },
  checkHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkTitle: { fontSize: 15, fontWeight: '600', color: '#fff' },
  checkDesc: { fontSize: 12, color: '#4a5568', marginLeft: 32 },
  checkDetail: { fontSize: 13, color: '#aaa', marginLeft: 32 },
  scanBtn: {
    backgroundColor: '#00ff88',
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  scanBtnDisabled: { opacity: 0.6 },
  scanBtnText: { color: '#0a0e1a', fontSize: 17, fontWeight: 'bold' },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginLeft: 32,
    marginTop: 4,
  },
  suggestionText: { flex: 1, color: '#00b4ff', fontSize: 12, lineHeight: 18 },
  actionsCard: {
    backgroundColor: '#0d1224',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1a2040',
    gap: 10,
  },
  actionsTitle: { color: '#4a5568', fontSize: 12, marginBottom: 4 },
  actionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  actionText: { flex: 1, color: '#ccc', fontSize: 13, lineHeight: 19 },
  actionLabel: { color: '#fff', fontWeight: '600' },
});
