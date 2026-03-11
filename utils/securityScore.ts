import * as Device from 'expo-device';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Network from 'expo-network';
import { Platform } from 'react-native';
import { getScanHistory } from './scanHistory';

export interface ScoreCategory {
  id: string;
  title: string;
  score: number; // 0-100
  maxScore: number;
  status: 'good' | 'warning' | 'bad';
  detail: string;
}

export interface SecurityScoreResult {
  totalScore: number; // 0-100
  grade: string;
  categories: ScoreCategory[];
}

function gradeFromScore(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

export async function calculateSecurityScore(): Promise<SecurityScoreResult> {
  const categories: ScoreCategory[] = [];

  // 1. OS バージョン (25点満点)
  const osVersion = Device.osVersion;
  const osMajor = osVersion ? parseInt(osVersion.split('.')[0], 10) : 0;
  let osScore = 25;
  let osDetail = `${Device.osName ?? '不明'} ${osVersion ?? '不明'}`;
  if (Device.osName === 'iOS' && osMajor < 16) {
    osScore = 10;
    osDetail += ' → アップデートを推奨';
  } else if (Device.osName === 'Android' && osMajor < 12) {
    osScore = 10;
    osDetail += ' → アップデートを推奨';
  }
  categories.push({
    id: 'os',
    title: 'OSバージョン',
    score: osScore,
    maxScore: 25,
    status: osScore >= 25 ? 'good' : 'warning',
    detail: osDetail,
  });

  // 2. 生体認証 / 画面ロック (25点満点)
  let bioScore = 0;
  let bioDetail = '';
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware) {
      bioScore = 10;
      bioDetail = '生体認証ハードウェアなし';
    } else if (isEnrolled) {
      bioScore = 25;
      bioDetail = '生体認証が有効です';
    } else {
      bioScore = 5;
      bioDetail = '生体認証が未設定 → 設定を推奨';
    }
  } catch {
    bioScore = 0;
    bioDetail = '確認できませんでした';
  }
  categories.push({
    id: 'biometric',
    title: '画面ロック / 生体認証',
    score: bioScore,
    maxScore: 25,
    status: bioScore >= 25 ? 'good' : bioScore >= 10 ? 'warning' : 'bad',
    detail: bioDetail,
  });

  // 3. ネットワーク (25点満点)
  let netScore = 25;
  let netDetail = '';
  try {
    const state = await Network.getNetworkStateAsync();
    if (!state.isConnected) {
      netScore = 15;
      netDetail = '未接続';
    } else if (state.type === Network.NetworkStateType.WIFI) {
      netScore = 18;
      netDetail = 'Wi-Fi接続 (公共Wi-Fiに注意)';
    } else if (state.type === Network.NetworkStateType.CELLULAR) {
      netScore = 25;
      netDetail = 'モバイルデータ (比較的安全)';
    } else {
      netScore = 20;
      netDetail = `${state.type ?? '不明'}接続`;
    }
  } catch {
    netScore = 10;
    netDetail = 'ネットワーク確認失敗';
  }
  categories.push({
    id: 'network',
    title: 'ネットワーク',
    score: netScore,
    maxScore: 25,
    status: netScore >= 25 ? 'good' : netScore >= 15 ? 'warning' : 'bad',
    detail: netDetail,
  });

  // 4. スキャン履歴から危険URL率 (25点満点)
  let scanScore = 25;
  let scanDetail = '';
  try {
    const history = await getScanHistory();
    if (history.length === 0) {
      scanScore = 20;
      scanDetail = 'まだスキャン履歴がありません';
    } else {
      const dangerCount = history.filter((h) => h.result.riskLevel === 'danger').length;
      const ratio = dangerCount / history.length;
      if (ratio > 0.3) {
        scanScore = 5;
        scanDetail = `危険なURL多数 (${dangerCount}/${history.length}件)`;
      } else if (ratio > 0.1) {
        scanScore = 15;
        scanDetail = `一部危険なURL検出 (${dangerCount}/${history.length}件)`;
      } else {
        scanScore = 25;
        scanDetail = `${history.length}件スキャン済み (問題なし)`;
      }
    }
  } catch {
    scanScore = 20;
    scanDetail = '履歴取得失敗';
  }
  categories.push({
    id: 'scan',
    title: 'スキャン履歴',
    score: scanScore,
    maxScore: 25,
    status: scanScore >= 25 ? 'good' : scanScore >= 15 ? 'warning' : 'bad',
    detail: scanDetail,
  });

  const totalScore = categories.reduce((sum, c) => sum + c.score, 0);

  return {
    totalScore,
    grade: gradeFromScore(totalScore),
    categories,
  };
}

export function scoreColor(score: number): string {
  if (score >= 80) return '#00ff88';
  if (score >= 60) return '#88cc00';
  if (score >= 40) return '#ffb800';
  return '#ff4444';
}
