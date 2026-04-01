import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { mockAlerts } from '../config/mockData';
import { useLang } from '../context/LanguageContext';

export default function AlertDetail() {
  const { id } = useLocalSearchParams();
  const alert = mockAlerts.find((a) => a.id === id);
  const { t } = useLang();

  if (!alert) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('alertNotFound')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.title}>{alert.title}</Text>
          <Badge label={alert.severity} tone={alert.severity} />
        </View>
        <Text style={styles.meta}>{alert.cameraName} · {alert.timeAgo || alert.createdAt}</Text>
        <View style={styles.statusRow}>
          <Pill label={`${t('statusLabel')}: ${alert.status}`} tone={alert.status === 'resolved' ? 'success' : 'warning'} />
          <Pill label={`${t('severityLabel')}: ${alert.severity}`} tone={alert.severity === 'high' ? 'danger' : alert.severity === 'medium' ? 'warning' : 'success'} />
        </View>
        <Text style={styles.section}>{t('description')}</Text>
        <Text style={styles.body}>{alert.description}</Text>
        <Text style={styles.section}>{t('recommendedAction')}</Text>
        <Text style={styles.body}>Stay alert, review live feed, and ensure children are supervised.</Text>
      </View>

      {alert.media.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.section}>{t('frames')}</Text>
          <View style={styles.grid}>
            {alert.media.map((src, idx) => (
              <Image key={idx} source={{ uri: src }} style={styles.thumb} />
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

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
  card: {
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 0, color: '#0F172A' },
  meta: { color: '#6B7280', marginBottom: 10 },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  section: { fontWeight: '700', marginTop: 8, marginBottom: 6, color: '#0F172A' },
  body: { color: '#334155', lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  thumb: { width: '48%', aspectRatio: 16 / 9, borderRadius: 12, backgroundColor: '#E2E8F0' },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { fontWeight: '700', fontSize: 12 },
  pill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  pillText: { fontWeight: '700', fontSize: 12 },
});
