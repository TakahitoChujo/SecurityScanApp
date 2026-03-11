import {
  checkPassword,
  strengthLabel,
  strengthColor,
} from '../utils/passwordChecker';

describe('checkPassword', () => {
  it('returns very_weak for empty password', () => {
    const result = checkPassword('');
    expect(result.strength).toBe('very_weak');
    expect(result.score).toBe(0);
  });

  it('returns very_weak for common passwords', () => {
    const result = checkPassword('password');
    expect(result.strength).toBe('very_weak');
    expect(result.feedback.some((f) => f.includes('よくあるパスワード'))).toBe(true);
  });

  it('returns very_weak for "123456"', () => {
    const result = checkPassword('123456');
    expect(result.strength).toBe('very_weak');
  });

  it('scores higher for longer passwords with mixed chars', () => {
    const weak = checkPassword('abc');
    const strong = checkPassword('MyP@ssw0rd!2024');
    expect(strong.score).toBeGreaterThan(weak.score);
  });

  it('detects sequential characters', () => {
    const result = checkPassword('abcdef123');
    expect(result.feedback.some((f) => f.includes('連続した文字列'))).toBe(true);
  });

  it('detects repeating characters', () => {
    const result = checkPassword('aaabbb111');
    expect(result.feedback.some((f) => f.includes('繰り返し'))).toBe(true);
  });

  it('gives good score for strong password', () => {
    const result = checkPassword('Kj#9xL$mPq2!vW');
    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(['strong', 'very_strong']).toContain(result.strength);
  });

  it('provides feedback for missing uppercase', () => {
    const result = checkPassword('alllowercase1!');
    expect(result.feedback.some((f) => f.includes('大文字と小文字'))).toBe(true);
  });

  it('provides feedback for missing numbers', () => {
    const result = checkPassword('NoNumbers!Here');
    expect(result.feedback.some((f) => f.includes('数字'))).toBe(true);
  });

  it('provides feedback for missing symbols', () => {
    const result = checkPassword('NoSymbols123ABC');
    expect(result.feedback.some((f) => f.includes('記号'))).toBe(true);
  });

  it('estimates crack time', () => {
    const weak = checkPassword('123');
    expect(weak.crackTime).toBe('一瞬');

    const strong = checkPassword('Kj#9xL$mPq2!vWzR');
    expect(strong.crackTime).not.toBe('一瞬');
  });
});

describe('strengthLabel', () => {
  it('returns correct labels', () => {
    expect(strengthLabel('very_weak')).toBe('非常に弱い');
    expect(strengthLabel('weak')).toBe('弱い');
    expect(strengthLabel('fair')).toBe('普通');
    expect(strengthLabel('strong')).toBe('強い');
    expect(strengthLabel('very_strong')).toBe('非常に強い');
  });
});

describe('strengthColor', () => {
  it('returns correct colors', () => {
    expect(strengthColor('very_weak')).toBe('#ff4444');
    expect(strengthColor('weak')).toBe('#ff8844');
    expect(strengthColor('fair')).toBe('#ffb800');
    expect(strengthColor('strong')).toBe('#88cc00');
    expect(strengthColor('very_strong')).toBe('#00ff88');
  });
});
