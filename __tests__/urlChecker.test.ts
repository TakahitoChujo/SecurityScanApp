import { checkUrl, isSafeScheme, riskLevelLabel, riskLevelColor } from '../utils/urlChecker';

describe('isSafeScheme', () => {
  it('allows http:// and https://', () => {
    expect(isSafeScheme('https://example.com')).toBe(true);
    expect(isSafeScheme('http://example.com')).toBe(true);
    expect(isSafeScheme('HTTP://EXAMPLE.COM')).toBe(true);
  });

  it('rejects non-http schemes', () => {
    expect(isSafeScheme('tel:+1234567890')).toBe(false);
    expect(isSafeScheme('sms:+1234567890')).toBe(false);
    expect(isSafeScheme('mailto:test@example.com')).toBe(false);
    expect(isSafeScheme('javascript:alert(1)')).toBe(false);
    expect(isSafeScheme('ftp://example.com')).toBe(false);
    expect(isSafeScheme('file:///etc/passwd')).toBe(false);
  });

  it('rejects strings that look like http but are not', () => {
    expect(isSafeScheme('httpx://evil.com')).toBe(false);
    expect(isSafeScheme('http-evil://payload')).toBe(false);
  });
});

describe('checkUrl', () => {
  it('returns safe for a normal https URL', async () => {
    const result = await checkUrl('https://www.google.com');
    expect(result.riskLevel).toBe('safe');
    expect(result.url).toBe('https://www.google.com');
    // APIキー未設定のためローカル判定のみの注記が入る
    expect(result.reasons.some((r) => r.includes('ローカル簡易判定'))).toBe(true);
  });

  it('returns warning for http URL (non-encrypted)', async () => {
    const result = await checkUrl('http://example.com');
    expect(result.riskLevel).toBe('warning');
    expect(result.reasons).toContain('HTTPで暗号化されていない接続');
  });

  it('returns danger for suspicious TLD', async () => {
    const result = await checkUrl('https://evil-site.tk');
    expect(result.riskLevel).toBe('danger');
    expect(result.reasons.some((r) => r.includes('危険なTLD'))).toBe(true);
  });

  it('returns danger for IP address URL', async () => {
    const result = await checkUrl('https://192.168.1.1/admin');
    expect(result.riskLevel).toBe('danger');
    expect(result.reasons.some((r) => r.includes('IPアドレス'))).toBe(true);
  });

  it('returns unknown for non-URL text', async () => {
    const result = await checkUrl('hello world');
    expect(result.riskLevel).toBe('unknown');
  });

  it('returns unknown for tel: scheme', async () => {
    const result = await checkUrl('tel:+1234567890');
    expect(result.riskLevel).toBe('unknown');
  });

  it('returns unknown for sms: scheme', async () => {
    const result = await checkUrl('sms:+1234567890?body=hack');
    expect(result.riskLevel).toBe('unknown');
  });

  it('returns unknown for javascript: scheme', async () => {
    const result = await checkUrl('javascript:alert(1)');
    expect(result.riskLevel).toBe('unknown');
  });

  it('prepends https:// for domain-like input', async () => {
    const result = await checkUrl('example.com');
    expect(result.url).toBe('https://example.com');
  });

  it('detects URL with userinfo (@ in host)', async () => {
    const result = await checkUrl('https://apple.com@evil.com/login');
    expect(result.reasons.some((r) => r.includes('ユーザー情報'))).toBe(true);
  });

  it('warns about shortened URLs', async () => {
    const result = await checkUrl('https://bit.ly/abc123');
    expect(result.reasons.some((r) => r.includes('短縮URL'))).toBe(true);
  });

  it('warns about excessive subdomains', async () => {
    const result = await checkUrl('https://a.b.c.d.example.com');
    expect(result.reasons.some((r) => r.includes('サブドメイン'))).toBe(true);
  });

  it('truncates very long input', async () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(3000);
    const result = await checkUrl(longUrl);
    expect(result.url.length).toBeLessThanOrEqual(2048 + 10); // https:// prefix
  });
});

describe('riskLevelLabel', () => {
  it('returns correct labels', () => {
    expect(riskLevelLabel('safe')).toBe('問題なし');
    expect(riskLevelLabel('warning')).toBe('注意');
    expect(riskLevelLabel('danger')).toBe('危険');
    expect(riskLevelLabel('unknown')).toBe('不明');
  });
});

describe('riskLevelColor', () => {
  it('returns correct colors', () => {
    expect(riskLevelColor('safe')).toBe('#00ff88');
    expect(riskLevelColor('warning')).toBe('#ffb800');
    expect(riskLevelColor('danger')).toBe('#ff4444');
    expect(riskLevelColor('unknown')).toBe('#4a5568');
  });
});
