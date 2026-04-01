import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';

export default function Profile() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { t, lang, toggleLang } = useLang();
  const [notifications, setNotifications] = useState(true);

  const onLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('profileTitle')}</Text>

      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name || user?.email || 'U').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.name || 'Unknown user'}</Text>
            <Text style={styles.meta}>{user?.email || 'No email'}</Text>
            <Text style={styles.meta}>{t('roleLabel')}: {user?.role || 'viewer'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>{t('languageLabel')}</Text>
        <View style={styles.rowBetween}>
          <Text style={styles.meta}>{lang.toUpperCase()} {lang === 'vi' ? '🇻🇳' : '🇺🇸'}</Text>
          <TouchableOpacity style={styles.secondaryBtn} onPress={toggleLang}>
            <Text style={styles.secondaryText}>{t('switchLanguage')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>{t('notifications')}</Text>
        <View style={styles.rowBetween}>
          <Text style={styles.meta}>{notifications ? 'On' : 'Off'}</Text>
          <Switch value={notifications} onValueChange={setNotifications} trackColor={{ true: '#2E7D8C' }} />
        </View>
      </View>

      <TouchableOpacity style={styles.button} onPress={onLogout}>
        <Text style={styles.buttonText}>{t('logout')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#F7F9FC' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#2E7D8C', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 20 },
  name: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  meta: { color: '#6B7280', marginTop: 4 },
  sectionLabel: { fontWeight: '700', color: '#0F172A', marginBottom: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  secondaryBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#E2E8F0' },
  secondaryText: { color: '#0F172A', fontWeight: '700' },
  button: { backgroundColor: '#EF4444', padding: 14, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  buttonText: { color: '#fff', fontWeight: '700' },
});
