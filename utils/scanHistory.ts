import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UrlCheckResult } from './urlChecker';

const HISTORY_KEY = 'scan_history';
const MAX_HISTORY = 50;

export interface ScanHistoryItem {
  id: string;
  result: UrlCheckResult;
  scannedAt: string; // ISO 8601
}

function isValidHistoryItem(item: unknown): item is ScanHistoryItem {
  if (typeof item !== 'object' || item === null) return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.scannedAt === 'string' &&
    typeof obj.result === 'object' &&
    obj.result !== null &&
    typeof (obj.result as Record<string, unknown>).url === 'string' &&
    typeof (obj.result as Record<string, unknown>).riskLevel === 'string'
  );
}

export async function getScanHistory(): Promise<ScanHistoryItem[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidHistoryItem);
  } catch {
    return [];
  }
}

export async function addScanHistory(result: UrlCheckResult): Promise<void> {
  const history = await getScanHistory();
  const item: ScanHistoryItem = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    result,
    scannedAt: new Date().toISOString(),
  };
  const updated = [item, ...history].slice(0, MAX_HISTORY);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export async function clearScanHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
}

export async function deleteScanHistoryItem(id: string): Promise<void> {
  const history = await getScanHistory();
  const updated = history.filter((h) => h.id !== id);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}
