import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { mockAlerts } from '../config/mockData';
import { useLang } from '../context/LanguageContext';

export default function AlertsList() {
  const router = useRouter();
  const { t } = useLang();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('alertsTitle')}</Text>
      <FlatList
        data={mockAlerts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(`/alerts/${item.id}`)}>
            <View style={styles.cardRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.badgeRow}>
                  <Badge label={item.severity} tone={item.severity} />
                  <Pill label={item.status} tone={item.status === 'resolved' ? 'success' : 'warning'} />
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardMeta}>{item.cameraName} · {item.timeAgo || item.createdAt}</Text>
              </View>
              <Image source={{ uri: item.media?.[0] || 'https://via.placeholder.com/90x70.png?text=Cam' }} style={styles.thumb} />
            </View>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </View>
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
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  card: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardTitle: { fontWeight: '700', marginBottom: 4, color: '#0F172A' },
  cardMeta: { color: '#6B7280', marginBottom: 4 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 6, alignItems: 'center' },
  thumb: { width: 86, height: 64, borderRadius: 10, backgroundColor: '#E2E8F0' },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { fontWeight: '700', fontSize: 12 },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  pillText: { fontWeight: '700', fontSize: 12 },
});
