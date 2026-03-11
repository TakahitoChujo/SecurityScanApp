import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  checkPassword,
  strengthLabel,
  strengthColor,
  type PasswordCheckResult,
} from '../utils/passwordChecker';

export default function PasswordScreen() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [result, setResult] = useState<PasswordCheckResult | null>(null);

  // アンマウント時にパスワードをメモリからクリア
  useEffect(() => () => { setPassword(''); setResult(null); }, []);

  const handleTextChange = (text: string) => {
    setPassword(text);
    if (text.length > 0) {
      setResult(checkPassword(text));
    } else {
      setResult(null);
    }
  };

  const color = result ? strengthColor(result.strength) : '#4a5568';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>パスワード強度チェック</Text>
      <Text style={styles.desc}>
        パスワードは端末外に送信されません。ローカルで解析します。
      </Text>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="パスワードを入力..."
          placeholderTextColor="#4a5568"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={handleTextChange}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="none"
          maxLength={128}
        />
        <TouchableOpacity
          style={styles.eyeBtn}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color="#4a5568"
          />
        </TouchableOpacity>
      </View>

      {result && password.length > 0 && (
        <>
          {/* 強度バー */}
          <View style={styles.barContainer}>
            <View style={[styles.bar, { width: `${result.score}%`, backgroundColor: color }]} />
          </View>
          <View style={styles.strengthRow}>
            <Text style={[styles.strengthText, { color }]}>
              {strengthLabel(result.strength)}
            </Text>
            <Text style={styles.scoreText}>{result.score}/100</Text>
          </View>

          {/* 解析時間 */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="timer-outline" size={18} color="#4a5568" />
              <Text style={styles.infoLabel}>推定解読時間</Text>
              <Text style={[styles.infoValue, { color }]}>{result.crackTime}</Text>
            </View>
          </View>

          {/* フィードバック */}
          {result.feedback.length > 0 && (
            <View style={styles.feedbackCard}>
              <Text style={styles.feedbackTitle}>改善ポイント</Text>
              {result.feedback.map((f, i) => (
                <View key={i} style={styles.feedbackRow}>
                  <Ionicons name="arrow-forward-circle-outline" size={16} color="#ffb800" />
                  <Text style={styles.feedbackText}>{f}</Text>
                </View>
              ))}
            </View>
          )}

          {result.feedback.length === 0 && (
            <View style={styles.feedbackCard}>
              <View style={styles.feedbackRow}>
                <Ionicons name="checkmark-circle" size={18} color="#00ff88" />
                <Text style={[styles.feedbackText, { color: '#00ff88' }]}>
                  優秀なパスワードです！
                </Text>
              </View>
            </View>
          )}
        </>
      )}

      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>安全なパスワードのコツ</Text>
        {[
          '12文字以上を推奨',
          '大文字・小文字・数字・記号を混ぜる',
          '辞書に載っている単語を避ける',
          'サービスごとに異なるパスワードを使う',
          'パスワードマネージャの活用を検討',
        ].map((tip, i) => (
          <View key={i} style={styles.tipRow}>
            <Ionicons name="shield-checkmark-outline" size={14} color="#00b4ff" />
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e1a' },
  content: { padding: 20, paddingBottom: 48 },
  pageTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  desc: { color: '#4a5568', fontSize: 12, marginBottom: 20 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d1224',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1a2040',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    padding: 16,
  },
  eyeBtn: { padding: 16 },
  barContainer: {
    height: 8,
    backgroundColor: '#1a2040',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  bar: { height: '100%', borderRadius: 4 },
  strengthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  strengthText: { fontSize: 16, fontWeight: 'bold' },
  scoreText: { color: '#4a5568', fontSize: 14 },
  infoCard: {
    backgroundColor: '#0d1224',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1a2040',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoLabel: { flex: 1, color: '#4a5568', fontSize: 14 },
  infoValue: { fontSize: 16, fontWeight: '600' },
  feedbackCard: {
    backgroundColor: '#0d1224',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1a2040',
    gap: 10,
  },
  feedbackTitle: { color: '#4a5568', fontSize: 12, marginBottom: 4 },
  feedbackRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  feedbackText: { flex: 1, color: '#ccc', fontSize: 14 },
  tipsCard: {
    backgroundColor: '#0d1224',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1a2040',
    gap: 10,
    marginTop: 8,
  },
  tipsTitle: { color: '#4a5568', fontSize: 12, marginBottom: 4 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tipText: { flex: 1, color: '#ccc', fontSize: 13 },
});
