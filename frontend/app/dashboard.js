import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from './context/AuthContext';
import { mockCamera, mockAlerts } from './config/mockData';
import { useLang } from './context/LanguageContext';

export default function Dashboard() {
  const { user } = useAuth();
  const openAlerts = mockAlerts.filter((a) => a.status !== 'resolved').length;
  const { t } = useLang();
  const latest = mockAlerts[0];

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>{t('greeting')} {user?.name || 'Supervisor'} 👋</Text>
        <Text style={styles.heroSubtitle}>{t('subtitle')}</Text>
      </View>

      <View style={styles.tilesRow}>
        <Tile color="#2E7D8C" title={t('camerasLabel')} value="1" hint="Online" />
        <Tile color="#2563EB" title={t('openAlertsLabel')} value={String(openAlerts)} hint="Open" />
      </View>

      <View style={styles.cardWide}>
        <View style={styles.cardHeader}>
          <Text style={styles.sectionTitle}>{t('latestAlert')}</Text>
          <Badge label={`${t('severityLabel')}: ${latest.severity}`} tone={latest.severity} />
        </View>
        <Text style={styles.alertTitle}>{latest.title}</Text>
        <Text style={styles.alertMeta}>{latest.cameraName} · {latest.timeAgo}</Text>
        <View style={styles.statusRow}>
          <Pill label={`${t('statusLabel')}: ${latest.status}`} tone={latest.status === 'resolved' ? 'success' : 'warning'} />
        </View>
        <Link href="/alerts" style={styles.link}>{t('seeAllAlerts')} →</Link>
      </View>

      <View style={styles.cardWide}>
        <View style={styles.cardHeader}>
          <Text style={styles.sectionTitle}>{t('cameraSection')}</Text>
          <Pill label={mockCamera.status === 'online' ? 'Online' : 'Offline'} tone={mockCamera.status === 'online' ? 'success' : 'danger'} />
        </View>
        <Text style={styles.camName}>{mockCamera.name}</Text>
        <Text style={styles.camMeta}>{mockCamera.location}</Text>
        <View style={styles.statusRow}>
          <Pill label={`${t('status')}: ${mockCamera.status}`} tone={mockCamera.status === 'online' ? 'success' : 'danger'} />
          <Pill label={`${t('uptime')}: ${mockCamera.uptime}`} tone="info" />
        </View>
        <Link href="/camera" style={styles.link}>{t('openCamera')} →</Link>
      </View>

      <Link href="/profile" style={styles.link}>{t('profileLink')}</Link>
    </View>
  );
}

const Tile = ({ color, title, value, hint }) => (
  <View style={[styles.tile, { backgroundColor: color }]}>
    <Text style={styles.tileTitle}>{title}</Text>
    <Text style={styles.tileValue}>{value}</Text>
    <Text style={styles.tileHint}>{hint}</Text>
  </View>
);

const Badge = ({ label, tone }) => {
  const palette = {
    high: { bg: '#FEE2E2', fg: '#B91C1C' },
    medium: { bg: '#FEF3C7', fg: '#B45309' },
    low: { bg: '#DCFCE7', fg: '#15803D' },
  };
  const colors = palette[tone] || palette.low;
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}> 
      <Text style={[styles.badgeText, { color: colors.fg }]}>{label}</Text>
    </View>
  );
};

const Pill = ({ label, tone }) => {
  const palette = {
    success: { bg: '#E0F2FE', fg: '#0369A1' },
    warning: { bg: '#FEF3C7', fg: '#B45309' },
    danger: { bg: '#FEE2E2', fg: '#B91C1C' },
    info: { bg: '#E2E8F0', fg: '#475569' },
  };
  const colors = palette[tone] || palette.info;
  return (
    <View style={[styles.pill, { backgroundColor: colors.bg }]}> 
      <Text style={[styles.pillText, { color: colors.fg }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#F7F9FC' },
  hero: { marginBottom: 16 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  heroSubtitle: { color: '#475569', marginTop: 4 },
  tilesRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  tile: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  tileTitle: { color: '#E0F2FE', fontWeight: '600', marginBottom: 8 },
  tileValue: { color: '#fff', fontSize: 28, fontWeight: '800' },
  tileHint: { color: '#E0F2FE', marginTop: 4 },
  cardWide: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontWeight: '700', fontSize: 16, color: '#0F172A' },
  alertTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  alertMeta: { color: '#6B7280', marginBottom: 8 },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  camName: { fontWeight: '700', fontSize: 15, marginBottom: 4 },
  camMeta: { color: '#6B7280', marginBottom: 6 },
  link: { color: '#2563EB', marginTop: 8, fontWeight: '600' },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { fontWeight: '700', fontSize: 12 },
  pill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  pillText: { fontWeight: '700', fontSize: 12 },
});
