import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from './context/AuthContext';
import { useLang } from './context/LanguageContext';

export default function LoginScreen() {
  const { login, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { t } = useLang();

  const onLogin = async () => {
    await login(email, password);
    router.replace('/(tabs)/dashboard');
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>{t('loginTitle')}</Text>
        <Text style={styles.heroSubtitle}>{t('loginTagline')}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('loginTitle')}</Text>
        <Text style={styles.cardSubtitle}>{t('loginTagline')}</Text>

        <TextInput
          style={styles.input}
          placeholder={t('emailPlaceholder')}
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder={t('passwordPlaceholder')}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.button} onPress={onLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('loginButton')}</Text>}
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.divider} />
        </View>

        <Text style={styles.linkText}>
          {t('noAccount')} <Link href="/register" style={styles.linkStrong}>{t('registerLink')}</Link>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#E8F1F6' },
  hero: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 12,
    backgroundColor: '#2E7D8C',
  },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 4 },
  heroSubtitle: { color: '#D4EAEE', fontSize: 14 },
  card: {
    marginTop: -26,
    marginHorizontal: 18,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E6EDF4',
  },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  cardSubtitle: { color: '#64748B', marginBottom: 14 },
  input: {
    borderWidth: 1,
    borderColor: '#D9E1EC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#F9FBFD',
    color: '#0F172A',
  },
  button: {
    backgroundColor: '#2E7D8C',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 12, columnGap: 8 },
  divider: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { color: '#94A3B8', fontSize: 12 },
  linkText: { textAlign: 'center', marginTop: 2, color: '#475569' },
  linkStrong: { color: '#2563EB', fontWeight: '700' },
});
