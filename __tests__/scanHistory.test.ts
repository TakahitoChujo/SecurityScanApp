// Mock AsyncStorage
const mockStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      mockStorage[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      delete mockStorage[key];
      return Promise.resolve();
    }),
  },
}));

import {
  getScanHistory,
  addScanHistory,
  clearScanHistory,
  deleteScanHistoryItem,
} from '../utils/scanHistory';
import type { UrlCheckResult } from '../utils/urlChecker';

const makeFakeResult = (url: string, riskLevel: string): UrlCheckResult => ({
  url,
  riskLevel: riskLevel as UrlCheckResult['riskLevel'],
  reasons: [],
  rawText: url,
});

beforeEach(() => {
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
});

describe('scanHistory', () => {
  it('returns empty array when no history', async () => {
    const history = await getScanHistory();
    expect(history).toEqual([]);
  });

  it('adds an item to history', async () => {
    await addScanHistory(makeFakeResult('https://example.com', 'safe'));
    const history = await getScanHistory();
    expect(history).toHaveLength(1);
    expect(history[0].result.url).toBe('https://example.com');
  });

  it('prepends new items (newest first)', async () => {
    await addScanHistory(makeFakeResult('https://first.com', 'safe'));
    await addScanHistory(makeFakeResult('https://second.com', 'safe'));
    const history = await getScanHistory();
    expect(history[0].result.url).toBe('https://second.com');
    expect(history[1].result.url).toBe('https://first.com');
  });

  it('clears all history', async () => {
    await addScanHistory(makeFakeResult('https://example.com', 'safe'));
    await clearScanHistory();
    const history = await getScanHistory();
    expect(history).toEqual([]);
  });

  it('deletes a specific item', async () => {
    await addScanHistory(makeFakeResult('https://keep.com', 'safe'));
    await addScanHistory(makeFakeResult('https://delete.com', 'warning'));
    let history = await getScanHistory();
    const deleteId = history[0].id;
    await deleteScanHistoryItem(deleteId);
    history = await getScanHistory();
    expect(history).toHaveLength(1);
    expect(history[0].result.url).toBe('https://keep.com');
  });

  it('limits history to 50 items', async () => {
    for (let i = 0; i < 55; i++) {
      await addScanHistory(makeFakeResult(`https://site${i}.com`, 'safe'));
    }
    const history = await getScanHistory();
    expect(history.length).toBeLessThanOrEqual(50);
  });

  it('handles corrupted JSON gracefully', async () => {
    mockStorage['scan_history'] = 'not valid json{{{';
    const history = await getScanHistory();
    expect(history).toEqual([]);
  });

  it('filters out invalid items from storage', async () => {
    mockStorage['scan_history'] = JSON.stringify([
      { id: 'valid', result: { url: 'https://test.com', riskLevel: 'safe', reasons: [], rawText: 'test' }, scannedAt: '2024-01-01T00:00:00Z' },
      { bad: 'item' },
      'not an object',
      null,
    ]);
    const history = await getScanHistory();
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe('valid');
  });
});
