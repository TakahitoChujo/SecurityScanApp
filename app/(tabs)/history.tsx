import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getScanHistory,
  clearScanHistory,
  deleteScanHistoryItem,
  type ScanHistoryItem,
} from '../../utils/scanHistory';
import { riskLevelColor, riskLevelLabel } from '../../utils/urlChecker';

export default function HistoryScreen() {
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      getScanHistory().then(setHistory);
    }, [])
  );

  const handleClearAll = () => {
    Alert.alert('履歴を全て削除', '本当に全件削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          await clearScanHistory();
          setHistory([]);
        },
      },
    ]);
  };

  const handleDelete = async (id: string) => {
    await deleteScanHistoryItem(id);
    setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.pageTitle}>スキャン履歴</Text>
        {history.length > 0 && (
          <TouchableOpacity onPress={handleClearAll}>
            <Text style={styles.clearBtn}>全削除</Text>
          </TouchableOpacity>
        )}
      </View>

      {history.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="time-outline" size={64} color="#1a2040" />
          <Text style={styles.emptyText}>スキャン履歴はまだありません</Text>
        </View>
      ) : (
        history.map((item) => {
          const color = riskLevelColor(item.result.riskLevel);
          const label = riskLevelLabel(item.result.riskLevel);
          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.badge, { backgroundColor: color + '22' }]}>
                  <Text style={[styles.badgeText, { color }]}>{label}</Text>
                </View>
                <Text style={styles.date}>{formatDate(item.scannedAt)}</Text>
                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                  <Ionicons name="trash-outline" size={18} color="#4a5568" />
                </TouchableOpacity>
              </View>
              <Text style={styles.url} numberOfLines={2}>
                {item.result.url}
              </Text>
              {item.result.reasons.length > 0 && (
                <Text style={styles.reasons} numberOfLines={1}>
                  {item.result.reasons[0]}
                </Text>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e1a' },
  content: { padding: 20, paddingBottom: 48 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  pageTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  clearBtn: { color: '#ff4444', fontSize: 14 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 16 },
  emptyText: { color: '#4a5568', fontSize: 14 },
  card: {
    backgroundColor: '#0d1224',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1a2040',
    gap: 8,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  date: { flex: 1, color: '#4a5568', fontSize: 12, textAlign: 'right', marginRight: 8 },
  url: { color: '#ccc', fontSize: 13, lineHeight: 18 },
  reasons: { color: '#4a5568', fontSize: 12 },
});
