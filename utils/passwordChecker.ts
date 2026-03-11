export type PasswordStrength = 'very_weak' | 'weak' | 'fair' | 'strong' | 'very_strong';

export interface PasswordCheckResult {
  strength: PasswordStrength;
  score: number; // 0-100
  feedback: string[];
  crackTime: string;
}

// よくあるパスワード (上位)
const COMMON_PASSWORDS = [
  'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', 'master',
  'dragon', '111111', 'baseball', 'iloveyou', 'trustno1', 'sunshine',
  'letmein', 'football', 'shadow', 'michael', 'login', 'starwars',
  'passw0rd', 'hello', 'charlie', 'donald', 'password1', 'qwerty123',
];

function hasSequentialChars(pw: string): boolean {
  const lower = pw.toLowerCase();
  for (let i = 0; i < lower.length - 2; i++) {
    const a = lower.charCodeAt(i);
    const b = lower.charCodeAt(i + 1);
    const c = lower.charCodeAt(i + 2);
    if (b - a === 1 && c - b === 1) return true; // abc, 123
    if (a - b === 1 && b - c === 1) return true; // cba, 321
  }
  return false;
}

function hasRepeatingChars(pw: string): boolean {
  return /(.)\1{2,}/.test(pw);
}

function calculateEntropy(pw: string): number {
  let charsetSize = 0;
  if (/[a-z]/.test(pw)) charsetSize += 26;
  if (/[A-Z]/.test(pw)) charsetSize += 26;
  if (/[0-9]/.test(pw)) charsetSize += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) charsetSize += 33;
  if (charsetSize === 0) return 0;
  return pw.length * Math.log2(charsetSize);
}

function estimateCrackTime(entropy: number): string {
  // 10 billion guesses/sec (modern GPU cluster)
  const seconds = Math.pow(2, entropy) / 1e10;
  if (seconds < 1) return '一瞬';
  if (seconds < 60) return `${Math.round(seconds)}秒`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}分`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}時間`;
  if (seconds < 86400 * 365) return `${Math.round(seconds / 86400)}日`;
  if (seconds < 86400 * 365 * 1000) return `${Math.round(seconds / (86400 * 365))}年`;
  return '1000年以上';
}

export function checkPassword(password: string): PasswordCheckResult {
  const feedback: string[] = [];
  let score = 0;

  if (password.length === 0) {
    return { strength: 'very_weak', score: 0, feedback: ['パスワードを入力してください'], crackTime: '-' };
  }

  // 長さ
  if (password.length < 8) {
    feedback.push('8文字以上にしてください');
  } else if (password.length >= 12) {
    score += 25;
  } else {
    score += 15;
  }

  // 大文字小文字
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    score += 20;
  } else {
    feedback.push('大文字と小文字の両方を使ってください');
  }

  // 数字
  if (/[0-9]/.test(password)) {
    score += 15;
  } else {
    feedback.push('数字を含めてください');
  }

  // 特殊文字
  if (/[^a-zA-Z0-9]/.test(password)) {
    score += 20;
  } else {
    feedback.push('記号（!@#$%など）を含めてください');
  }

  // よくあるパスワード
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    score = Math.min(score, 5);
    feedback.unshift('非常によくあるパスワードです');
  }

  // 連続文字
  if (hasSequentialChars(password)) {
    score = Math.max(0, score - 10);
    feedback.push('連続した文字列（abc, 123）を避けてください');
  }

  // 繰り返し文字
  if (hasRepeatingChars(password)) {
    score = Math.max(0, score - 10);
    feedback.push('同じ文字の繰り返しを避けてください');
  }

  // エントロピーボーナス
  const entropy = calculateEntropy(password);
  if (entropy > 60) score += 20;
  else if (entropy > 40) score += 10;

  score = Math.min(100, Math.max(0, score));

  let strength: PasswordStrength;
  if (score < 20) strength = 'very_weak';
  else if (score < 40) strength = 'weak';
  else if (score < 60) strength = 'fair';
  else if (score < 80) strength = 'strong';
  else strength = 'very_strong';

  return {
    strength,
    score,
    feedback,
    crackTime: estimateCrackTime(entropy),
  };
}

export function strengthLabel(s: PasswordStrength): string {
  switch (s) {
    case 'very_weak': return '非常に弱い';
    case 'weak': return '弱い';
    case 'fair': return '普通';
    case 'strong': return '強い';
    case 'very_strong': return '非常に強い';
  }
}

export function strengthColor(s: PasswordStrength): string {
  switch (s) {
    case 'very_weak': return '#ff4444';
    case 'weak': return '#ff8844';
    case 'fair': return '#ffb800';
    case 'strong': return '#88cc00';
    case 'very_strong': return '#00ff88';
  }
}
