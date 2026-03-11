import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  calculateSecurityScore,
  scoreColor,
  type SecurityScoreResult,
} from '../../utils/securityScore';

const FEATURES = [
  {
    icon: 'qr-code' as const,
    title: 'QRスキャン',
    description: 'QRコードのURLの安全性を簡易チェック',
    color: '#00ff88',
    route: '/scanner',
  },
  {
    icon: 'phone-portrait' as const,
    title: 'デバイスチェック',
    description: 'OS・root検知・生体認証の設定を確認',
    color: '#00b4ff',
    route: '/(tabs)/device',
  },
  {
    icon: 'wifi' as const,
    title: 'Wi-Fiチェック',
    description: '接続中ネットワークのリスクを簡易チェック',
    color: '#ff6b6b',
    route: '/(tabs)/network',
  },
  {
    icon: 'key' as const,
    title: 'パスワード強度',
    description: 'パスワードの安全性をローカルで簡易チェック',
    color: '#b388ff',
    route: '/password',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const [scoreResult, setScoreResult] = useState<SecurityScoreResult | null>(null);
  useFocusEffect(
    useCallback(() => {
      calculateSecurityScore()
        .then(setScoreResult)
        .catch(() => {});
    }, [])
  );

  const color = scoreResult ? scoreColor(scoreResult.totalScore) : '#4a5568';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Ionicons name="shield-checkmark" size={64} color="#00ff88" />
        <Text style={styles.title}>Security Scan Shots</Text>
        <Text style={styles.subtitle}>スマホのセキュリティを簡易診断</Text>
      </View>

      {/* セキュリティスコア */}
      {scoreResult && (
        <View style={[styles.scoreCard, { borderColor: color }]}>
          <View style={styles.scoreHeader}>
            <Text style={[styles.scoreGrade, { color }]}>{scoreResult.grade}</Text>
            <View style={styles.scoreRight}>
              <Text style={[styles.scoreNum, { color }]}>{scoreResult.totalScore}</Text>
              <Text style={styles.scoreMax}>/100</Text>
            </View>
          </View>
          <View style={styles.scoreBar}>
            <View style={[styles.scoreBarFill, { width: `${scoreResult.totalScore}%`, backgroundColor: color }]} />
          </View>
          <View style={styles.scoreCategories}>
            {scoreResult.categories.map((cat) => {
              const catColor = cat.status === 'good' ? '#00ff88' : cat.status === 'warning' ? '#ffb800' : '#ff4444';
              return (
                <View key={cat.id} style={styles.scoreCatRow}>
                  <Ionicons
                    name={cat.status === 'good' ? 'checkmark-circle' : cat.status === 'warning' ? 'alert-circle' : 'close-circle'}
                    size={16}
                    color={catColor}
                  />
                  <Text style={styles.scoreCatTitle}>{cat.title}</Text>
                  <Text style={[styles.scoreCatScore, { color: catColor }]}>
                    {cat.score}/{cat.maxScore}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => router.push('/scanner')}
        activeOpacity={0.85}
      >
        <View style={styles.scanButtonInner}>
          <Ionicons name="scan" size={40} color="#0a0e1a" />
          <Text style={styles.scanButtonText}>スキャン開始</Text>
          <Text style={styles.scanButtonSub}>QRコードをかざす</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>チェック項目</Text>

      {FEATURES.map((feature) => (
        <TouchableOpacity
          key={feature.title}
          style={styles.card}
          onPress={() => router.push(feature.route as any)}
          activeOpacity={0.8}
        >
          <View style={[styles.iconBox, { backgroundColor: feature.color + '22' }]}>
            <Ionicons name={feature.icon} size={28} color={feature.color} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{feature.title}</Text>
            <Text style={styles.cardDesc}>{feature.description}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#4a5568" />
        </TouchableOpacity>
      ))}

      <View style={styles.disclaimer}>
        <Ionicons name="information-circle-outline" size={16} color="#4a5568" />
        <Text style={styles.disclaimerText}>
          このアプリは簡易的な診断ツールです。ヒューリスティック判定のため完全な安全性を保証するものではありません。自己のデバイス確認用としてご利用ください。
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e1a' },
  content: { padding: 20, paddingBottom: 40 },
  header: { alignItems: 'center', paddingVertical: 32 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginTop: 12 },
  subtitle: { fontSize: 14, color: '#4a7c6f', marginTop: 6 },
  scoreCard: {
    borderWidth: 2,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    backgroundColor: '#0d1224',
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreGrade: { fontSize: 40, fontWeight: 'bold' },
  scoreRight: { flexDirection: 'row', alignItems: 'baseline' },
  scoreNum: { fontSize: 32, fontWeight: 'bold' },
  scoreMax: { fontSize: 16, color: '#4a5568', marginLeft: 2 },
  scoreBar: {
    height: 8,
    backgroundColor: '#1a2040',
    borderRadius: 4,
    marginBottom: 16,
    overflow: 'hidden',
  },
  scoreBarFill: { height: '100%', borderRadius: 4 },
  scoreCategories: { gap: 8 },
  scoreCatRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreCatTitle: { flex: 1, color: '#ccc', fontSize: 13 },
  scoreCatScore: { fontSize: 13, fontWeight: '600' },
  scanButton: {
    backgroundColor: '#00ff88',
    borderRadius: 20,
    marginBottom: 32,
    shadowColor: '#00ff88',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  scanButtonInner: { alignItems: 'center', padding: 28 },
  scanButtonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0a0e1a',
    marginTop: 8,
  },
  scanButtonSub: { fontSize: 13, color: '#1a4030', marginTop: 4 },
  sectionTitle: { fontSize: 16, color: '#4a5568', marginBottom: 12, fontWeight: '600' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d1224',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1a2040',
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#fff' },
  cardDesc: { fontSize: 12, color: '#4a5568', marginTop: 3 },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 24,
    padding: 14,
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
  },
  disclaimerText: { flex: 1, fontSize: 11, color: '#4a5568', lineHeight: 16 },
});
