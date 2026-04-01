import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Link } from 'expo-router';
import { mockCamera, mockAlerts } from '../config/mockData';
import { useLang } from '../context/LanguageContext';

export default function CameraScreen() {
  const { t } = useLang();
  const frames = mockAlerts.flatMap((a) => a.media || []).slice(0, 4);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('cameraTitle')}</Text>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.camName}>{mockCamera.name}</Text>
            <Text style={styles.camMeta}>{mockCamera.location}</Text>
          </View>
          <Pill label={mockCamera.status === 'online' ? 'Online' : 'Offline'} tone={mockCamera.status === 'online' ? 'success' : 'danger'} />
        </View>

        <View style={styles.playerPlaceholder}>
          <Text style={{ color: '#6B7280' }}>{t('livePreview')}</Text>
        </View>

        <View style={styles.infoRow}>
          <Info label={t('status')} value={mockCamera.status} />
          <Info label={t('lastSeen')} value={mockCamera.lastSeen} />
          <Info label={t('uptime')} value={mockCamera.uptime || '99%'} />
        </View>

        {frames.length > 0 && (
          <View style={{ marginTop: 10 }}>
            <Text style={styles.section}>{t('frames')}</Text>
            <View style={styles.grid}>
              {frames.map((src, idx) => (
                <Image key={idx} source={{ uri: src }} style={styles.thumb} />
              ))}
            </View>
          </View>
        )}

        <Link href="/(tabs)/alerts" style={styles.link}>{t('viewAlerts')} →</Link>
      </View>
    </View>
  );
}

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

const Info = ({ label, value }) => (
  <View style={styles.infoItem}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#F7F9FC' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  card: {
    backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  camName: { fontWeight: '700', marginBottom: 2, fontSize: 16, color: '#0F172A' },
  camMeta: { color: '#6B7280', marginBottom: 4 },
  playerPlaceholder: {
    height: 200, borderRadius: 14, borderWidth: 1, borderColor: '#D9E1EC',
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, gap: 8 },
  infoItem: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  infoLabel: { color: '#64748B', fontSize: 12 },
  infoValue: { color: '#0F172A', fontWeight: '700', marginTop: 4 },
  link: { color: '#2563EB', fontWeight: '700', marginTop: 10 },
  pill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  pillText: { fontWeight: '700', fontSize: 12 },
  section: { fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  thumb: { width: '48%', aspectRatio: 16 / 9, borderRadius: 12, backgroundColor: '#E2E8F0' },
});
