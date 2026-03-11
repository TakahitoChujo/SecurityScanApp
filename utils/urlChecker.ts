// URL安全性チェックユーティリティ
// APIキーは環境変数経由で設定してください（ソースコードに直接記載しないこと）
// expo-constants + app.config.js の extra フィールドを使用推奨

const SAFE_BROWSING_API_KEY = process.env.EXPO_PUBLIC_SAFE_BROWSING_KEY ?? '';

const MAX_URL_LENGTH = 2048;

export type RiskLevel = 'safe' | 'warning' | 'danger' | 'unknown';

export interface UrlCheckResult {
  url: string;
  riskLevel: RiskLevel;
  reasons: string[];
  rawText: string;
}

// 危険なTLD一覧
const SUSPICIOUS_TLDS = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.click', '.loan', '.win'];

// フィッシングによく使われるキーワード
const PHISHING_KEYWORDS = [
  'login', 'signin', 'verify', 'account', 'secure', 'update', 'confirm',
  'password', 'banking', 'paypal', 'amazon', 'apple', 'microsoft', 'google',
];

// 短縮URLサービス
const URL_SHORTENERS = [
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'buff.ly',
  'short.io', 'rebrand.ly', 'cutt.ly',
];

function extractDomain(url: string): string {
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : 'https://' + url);
    return u.hostname.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/** http: / https: のみ安全なスキームとして許可 */
export function isSafeScheme(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function checkHeuristics(url: string): { riskLevel: RiskLevel; reasons: string[] } {
  const reasons: string[] = [];
  const lower = url.toLowerCase();
  const domain = extractDomain(url);

  // HTTP (非暗号化)
  if (url.startsWith('http://')) {
    reasons.push('HTTPで暗号化されていない接続');
  }

  // 疑わしいTLD
  const suspiciousTld = SUSPICIOUS_TLDS.find((tld) => domain.endsWith(tld));
  if (suspiciousTld) {
    reasons.push(`危険なTLD: ${suspiciousTld}`);
  }

  // IPアドレスによる直接アクセス
  if (/^https?:\/\/\d{1,3}(\.\d{1,3}){3}/.test(url)) {
    reasons.push('IPアドレスによる直接アクセス');
  }

  // 過剰なサブドメイン (フィッシングの特徴)
  const subdomainCount = domain.split('.').length - 2;
  if (subdomainCount > 2) {
    reasons.push(`サブドメインが多すぎる (${subdomainCount}段階)`);
  }

  // フィッシングキーワード + 別ドメイン
  const hasPhishingKeyword = PHISHING_KEYWORDS.some(
    (kw) => lower.includes(kw) && !domain.includes(kw.split('-')[0])
  );
  if (hasPhishingKeyword) {
    reasons.push('フィッシングに使われるキーワードを含む');
  }

  // 短縮URL
  const isShortened = URL_SHORTENERS.some((s) => domain.includes(s));
  if (isShortened) {
    reasons.push('短縮URLのため転送先が不明');
  }

  // 異常に長いURL
  if (url.length > 200) {
    reasons.push('URLが異常に長い');
  }

  // ユーザー情報が埋め込まれている (user:pass@domain)
  // extractDomainはhostnameのみ返すので、生URLで@をチェック
  const afterScheme = url.replace(/^https?:\/\//i, '');
  if (/@/.test(afterScheme.split('/')[0])) {
    reasons.push('URLにユーザー情報が含まれている（偽装の可能性）');
  }

  // 判定
  const dangerCount = reasons.filter(
    (r) => r.includes('IPアドレス') || r.includes('危険なTLD') || r.includes('ユーザー情報')
  ).length;

  if (dangerCount > 0 || reasons.length >= 3) {
    return { riskLevel: 'danger', reasons };
  }
  if (reasons.length >= 1) {
    return { riskLevel: 'warning', reasons };
  }
  return { riskLevel: 'safe', reasons };
}

async function checkSafeBrowsing(url: string): Promise<RiskLevel | null> {
  if (!SAFE_BROWSING_API_KEY) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${SAFE_BROWSING_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          client: { clientId: 'security-scan-app', clientVersion: '1.0.0' },
          threatInfo: {
            threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
            platformTypes: ['ANY_PLATFORM'],
            threatEntryTypes: ['URL'],
            threatEntries: [{ url }],
          },
        }),
      }
    );
    clearTimeout(timeout);
    if (!response.ok) return null;
    const data = await response.json();
    return data.matches && data.matches.length > 0 ? 'danger' : 'safe';
  } catch {
    return null;
  }
}

export async function checkUrl(rawText: string): Promise<UrlCheckResult> {
  // 入力長制限
  const trimmed = rawText.slice(0, MAX_URL_LENGTH);

  // URLかどうか判定（http/https スキームのみ許可）
  const isHttpUrl = /^https?:\/\//i.test(trimmed);
  const isDomainLike = /^[a-z0-9.-]+\.[a-z]{2,}/i.test(trimmed);
  if (!isHttpUrl && !isDomainLike) {
    return {
      url: trimmed,
      riskLevel: 'unknown',
      reasons: ['URLではないテキスト'],
      rawText: trimmed,
    };
  }

  const url = isHttpUrl ? trimmed : 'https://' + trimmed;

  // Safe Browsing API チェック (APIキーがある場合)
  const apiResult = await checkSafeBrowsing(url);

  if (apiResult === 'danger') {
    return {
      url,
      riskLevel: 'danger',
      reasons: ['Google Safe Browsingで危険なURLとして検出'],
      rawText: trimmed,
    };
  }

  // ヒューリスティックチェック
  const { riskLevel, reasons } = checkHeuristics(url);

  // APIキー未設定時はローカル判定のみであることを明記
  if (!SAFE_BROWSING_API_KEY && riskLevel === 'safe') {
    reasons.push('ローカル簡易判定のみ（Google Safe Browsing未使用）');
  }

  return { url, riskLevel, reasons, rawText: trimmed };
}

export function riskLevelLabel(level: RiskLevel): string {
  switch (level) {
    case 'safe': return '問題なし';
    case 'warning': return '注意';
    case 'danger': return '危険';
    default: return '不明';
  }
}

export function riskLevelColor(level: RiskLevel): string {
  switch (level) {
    case 'safe': return '#00ff88';
    case 'warning': return '#ffb800';
    case 'danger': return '#ff4444';
    default: return '#4a5568';
  }
}
