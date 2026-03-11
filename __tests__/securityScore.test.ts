// Mutable device values
let mockOsName = 'iOS';
let mockOsVersion = '17.0';

jest.mock('expo-device', () => ({
  get osName() { return mockOsName; },
  get osVersion() { return mockOsVersion; },
  isDevice: true,
  modelName: 'iPhone 15',
  getDeviceTypeAsync: jest.fn().mockResolvedValue(1),
}));

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn().mockResolvedValue(true),
  isEnrolledAsync: jest.fn().mockResolvedValue(true),
  supportedAuthenticationTypesAsync: jest.fn().mockResolvedValue([1]),
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
}));

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn().mockResolvedValue({
    isConnected: true,
    type: 'CELLULAR',
    isInternetReachable: true,
  }),
  getIpAddressAsync: jest.fn().mockResolvedValue('192.168.1.1'),
  NetworkStateType: {
    NONE: 'NONE',
    WIFI: 'WIFI',
    CELLULAR: 'CELLULAR',
    BLUETOOTH: 'BLUETOOTH',
    ETHERNET: 'ETHERNET',
  },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

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

import { calculateSecurityScore, scoreColor } from '../utils/securityScore';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Network from 'expo-network';

beforeEach(() => {
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  mockOsName = 'iOS';
  mockOsVersion = '17.0';
  (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
  (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
  (Network.getNetworkStateAsync as jest.Mock).mockResolvedValue({
    isConnected: true,
    type: 'CELLULAR',
    isInternetReachable: true,
  });
});

describe('calculateSecurityScore', () => {
  it('returns a score with 4 categories', async () => {
    const result = await calculateSecurityScore();
    expect(result.categories).toHaveLength(4);
    expect(result.categories.map((c) => c.id)).toEqual(['os', 'biometric', 'network', 'scan']);
  });

  it('returns totalScore as sum of category scores', async () => {
    const result = await calculateSecurityScore();
    const sum = result.categories.reduce((s, c) => s + c.score, 0);
    expect(result.totalScore).toBe(sum);
  });

  it('returns a grade string', async () => {
    const result = await calculateSecurityScore();
    expect(['A+', 'A', 'B', 'C', 'D', 'F']).toContain(result.grade);
  });

  it('gives full OS score for up-to-date iOS', async () => {
    const result = await calculateSecurityScore();
    const os = result.categories.find((c) => c.id === 'os')!;
    expect(os.score).toBe(25);
    expect(os.status).toBe('good');
  });

  it('gives reduced OS score for outdated iOS', async () => {
    mockOsVersion = '15.0';
    const result = await calculateSecurityScore();
    const os = result.categories.find((c) => c.id === 'os')!;
    expect(os.score).toBe(10);
    expect(os.status).toBe('warning');
  });

  it('gives reduced OS score for outdated Android', async () => {
    mockOsName = 'Android';
    mockOsVersion = '11.0';
    const result = await calculateSecurityScore();
    const os = result.categories.find((c) => c.id === 'os')!;
    expect(os.score).toBe(10);
    expect(os.status).toBe('warning');
  });

  it('gives full biometric score when enrolled', async () => {
    const result = await calculateSecurityScore();
    const bio = result.categories.find((c) => c.id === 'biometric')!;
    expect(bio.score).toBe(25);
    expect(bio.status).toBe('good');
  });

  it('gives low biometric score when not enrolled', async () => {
    (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValueOnce(false);
    const result = await calculateSecurityScore();
    const bio = result.categories.find((c) => c.id === 'biometric')!;
    expect(bio.score).toBe(5);
    expect(bio.status).toBe('bad');
  });

  it('gives partial biometric score when no hardware', async () => {
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValueOnce(false);
    const result = await calculateSecurityScore();
    const bio = result.categories.find((c) => c.id === 'biometric')!;
    expect(bio.score).toBe(10);
    expect(bio.status).toBe('warning');
  });

  it('handles biometric check failure', async () => {
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockRejectedValueOnce(new Error('fail'));
    const result = await calculateSecurityScore();
    const bio = result.categories.find((c) => c.id === 'biometric')!;
    expect(bio.score).toBe(0);
    expect(bio.status).toBe('bad');
  });

  it('gives full network score for cellular', async () => {
    const result = await calculateSecurityScore();
    const net = result.categories.find((c) => c.id === 'network')!;
    expect(net.score).toBe(25);
    expect(net.status).toBe('good');
  });

  it('gives reduced network score for Wi-Fi', async () => {
    (Network.getNetworkStateAsync as jest.Mock).mockResolvedValueOnce({
      isConnected: true,
      type: 'WIFI',
      isInternetReachable: true,
    });
    const result = await calculateSecurityScore();
    const net = result.categories.find((c) => c.id === 'network')!;
    expect(net.score).toBe(18);
    expect(net.status).toBe('warning');
  });

  it('gives reduced network score for disconnected', async () => {
    (Network.getNetworkStateAsync as jest.Mock).mockResolvedValueOnce({
      isConnected: false,
      type: 'NONE',
      isInternetReachable: false,
    });
    const result = await calculateSecurityScore();
    const net = result.categories.find((c) => c.id === 'network')!;
    expect(net.score).toBe(15);
    expect(net.status).toBe('warning');
  });

  it('handles network check failure', async () => {
    (Network.getNetworkStateAsync as jest.Mock).mockRejectedValueOnce(new Error('fail'));
    const result = await calculateSecurityScore();
    const net = result.categories.find((c) => c.id === 'network')!;
    expect(net.score).toBe(10);
    expect(net.status).toBe('bad');
  });

  it('gives scan score of 20 when no history', async () => {
    const result = await calculateSecurityScore();
    const scan = result.categories.find((c) => c.id === 'scan')!;
    expect(scan.score).toBe(20);
    expect(scan.status).toBe('warning');
  });

  it('gives full scan score when history has no danger', async () => {
    mockStorage['scan_history'] = JSON.stringify([
      { id: '1', result: { url: 'https://safe.com', riskLevel: 'safe', reasons: [], rawText: '' }, scannedAt: '2024-01-01T00:00:00Z' },
      { id: '2', result: { url: 'https://ok.com', riskLevel: 'safe', reasons: [], rawText: '' }, scannedAt: '2024-01-01T00:00:00Z' },
    ]);
    const result = await calculateSecurityScore();
    const scan = result.categories.find((c) => c.id === 'scan')!;
    expect(scan.score).toBe(25);
    expect(scan.status).toBe('good');
  });

  it('gives low scan score when many dangerous URLs', async () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      result: { url: `https://evil${i}.tk`, riskLevel: i < 5 ? 'danger' : 'safe', reasons: [], rawText: '' },
      scannedAt: '2024-01-01T00:00:00Z',
    }));
    mockStorage['scan_history'] = JSON.stringify(items);
    const result = await calculateSecurityScore();
    const scan = result.categories.find((c) => c.id === 'scan')!;
    expect(scan.score).toBe(5);
    expect(scan.status).toBe('bad');
  });

  it('gives grade A+ for score >= 90', async () => {
    const result = await calculateSecurityScore();
    // totalScore: 25 (os) + 25 (bio) + 25 (net) + 20 (scan, no history) = 95
    expect(result.grade).toBe('A+');
  });
});

describe('scoreColor', () => {
  it('returns green for score >= 80', () => {
    expect(scoreColor(80)).toBe('#00ff88');
    expect(scoreColor(100)).toBe('#00ff88');
  });

  it('returns yellow-green for score >= 60', () => {
    expect(scoreColor(60)).toBe('#88cc00');
    expect(scoreColor(79)).toBe('#88cc00');
  });

  it('returns orange for score >= 40', () => {
    expect(scoreColor(40)).toBe('#ffb800');
    expect(scoreColor(59)).toBe('#ffb800');
  });

  it('returns red for score < 40', () => {
    expect(scoreColor(0)).toBe('#ff4444');
    expect(scoreColor(39)).toBe('#ff4444');
  });
});
