import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { checkUrl, isSafeScheme, riskLevelColor, riskLevelLabel, type UrlCheckResult } from '../utils/urlChecker';
import { addScanHistory } from '../utils/scanHistory';

type ScanState = 'scanning' | 'checking' | 'result';

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<ScanState>('scanning');
  const [result, setResult] = useState<UrlCheckResult | null>(null);
  const isProcessing = useRef(false);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (isProcessing.current) return;
    isProcessing.current = true;

    try {
      setScanState('checking');
      const checkResult = await checkUrl(data);
      setResult(checkResult);
      await addScanHistory(checkResult);
      setScanState('result');
    } catch {
      setScanState('scanning');
      isProcessing.current = false;
    }
  };

  const reset = () => {
    setResult(null);
    setScanState('scanning');
    isProcessing.current = false;
  };

  const openUrl = () => {
    if (!result?.url || !isSafeScheme(result.url)) return;
    Alert.alert(
      '外部ブラウザで開きますか？',
      result.riskLevel === 'danger'
        ? '⚠️ このURLは危険と判定されています。本当に開きますか？'
        : result.url,
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '開く', onPress: () => Linking.openURL(result.url) },
      ]
    );
  };

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Ionicons name="camera-outline" size={64} color="#4a5568" />
        <Text style={styles.permText}>カメラの許可が必要です</Text>
        <TouchableOpacity style={styles.permButton} onPress={requestPermission}>
          <Text style={styles.permButtonText}>続ける</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (scanState === 'result' && result) {
    const color = riskLevelColor(result.riskLevel);
    const label = riskLevelLabel(result.riskLevel);

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.resultContent}>
        <View style={[styles.riskBadge, { borderColor: color }]}>
          <Ionicons
            name={
              result.riskLevel === 'safe'
                ? 'checkmark-circle'
                : result.riskLevel === 'danger'
                ? 'warning'
                : 'alert-circle'
            }
            size={56}
            color={color}
          />
          <Text style={[styles.riskLabel, { color }]}>{label}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>スキャン結果</Text>
          <Text style={styles.infoUrl} numberOfLines={3}>
            {result.url}
          </Text>
        </View>

        {result.reasons.length > 0 && (
          <View style={styles.reasonsCard}>
            <Text style={styles.reasonsTitle}>検出された問題点</Text>
            {result.reasons.map((r, i) => (
              <View key={i} style={styles.reasonRow}>
                <Ionicons name="alert-circle-outline" size={16} color={color} />
                <Text style={styles.reasonText}>{r}</Text>
              </View>
            ))}
          </View>
        )}

        {result.riskLevel === 'safe' && (
          <View style={styles.reasonsCard}>
            <Text style={[styles.reasonText, { color: '#00ff88' }]}>
              簡易判定で問題は検出されませんでした
            </Text>
          </View>
        )}

        <View style={styles.actions}>
          {result.riskLevel !== 'danger' && result.riskLevel !== 'unknown' && isSafeScheme(result.url) && (
            <TouchableOpacity style={styles.openButton} onPress={openUrl}>
              <Ionicons name="open-outline" size={18} color="#fff" />
              <Text style={styles.openButtonText}>ブラウザで開く</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.retryButton} onPress={reset}>
            <Ionicons name="scan-outline" size={18} color="#00ff88" />
            <Text style={styles.retryButtonText}>もう一度スキャン</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr', 'aztec', 'datamatrix'] }}
        onBarcodeScanned={scanState === 'scanning' ? handleBarCodeScanned : undefined}
      />

      {/* オーバーレイ */}
      <View style={styles.overlay}>
        <View style={styles.scanFrame} />
      </View>

      <View style={styles.hintBox}>
        {scanState === 'checking' ? (
          <>
            <Ionicons name="hourglass-outline" size={24} color="#00ff88" />
            <Text style={styles.hintText}>チェック中...</Text>
          </>
        ) : (
          <>
            <Ionicons name="scan-outline" size={24} color="#00ff88" />
            <Text style={styles.hintText}>QRコードをフレームに合わせてください</Text>
          </>
        )}
      </View>
    </View>
  );
}

const FRAME = 260;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e1a' },
  centered: { flex: 1, backgroundColor: '#0a0e1a', alignItems: 'center', justifyContent: 'center', padding: 32 },
  permText: { color: '#fff', fontSize: 16, marginTop: 16, marginBottom: 24, textAlign: 'center' },
  permButton: { backgroundColor: '#00ff88', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 },
  permButtonText: { color: '#0a0e1a', fontWeight: 'bold', fontSize: 16 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scanFrame: {
    width: FRAME,
    height: FRAME,
    borderWidth: 3,
    borderColor: '#00ff88',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  hintBox: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  hintText: { color: '#fff', fontSize: 14 },
  resultContent: { padding: 24, paddingBottom: 48 },
  riskBadge: {
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
  },
  riskLabel: { fontSize: 28, fontWeight: 'bold', marginTop: 10 },
  infoCard: {
    backgroundColor: '#0d1224',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1a2040',
  },
  infoTitle: { color: '#4a5568', fontSize: 12, marginBottom: 6 },
  infoUrl: { color: '#fff', fontSize: 14, lineHeight: 20 },
  reasonsCard: {
    backgroundColor: '#0d1224',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1a2040',
    gap: 10,
  },
  reasonsTitle: { color: '#4a5568', fontSize: 12, marginBottom: 4 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reasonText: { color: '#ccc', fontSize: 14, flex: 1 },
  actions: { gap: 12, marginTop: 8 },
  openButton: {
    backgroundColor: '#1a2040',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  openButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  retryButton: {
    borderWidth: 1,
    borderColor: '#00ff88',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  retryButtonText: { color: '#00ff88', fontSize: 15, fontWeight: '600' },
});
