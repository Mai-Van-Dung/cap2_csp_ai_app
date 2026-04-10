import React from 'react';
import {
  View, Text, StyleSheet,
 StatusBar, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';

const TEAL   = '#2E7D8C';
const BG     = '#F7F9FC';
const TEXT1  = '#0F172A';
const TEXT2  = '#475569';
const TEXT3  = '#94A3B8';
const BORDER = '#E5E7EB';

const IconCamera = ({ size = 60, color = '#999' }) => (
  <View style={{ width: size, height: size * 0.75, position: 'relative' }}>
    <View style={{
      width: size * 0.72, height: size * 0.58,
      backgroundColor: color, borderRadius: size * 0.08,
      position: 'absolute', left: 0, top: size * 0.08,
      justifyContent: 'center', alignItems: 'center',
    }}>
      <View style={{
        width: size * 0.36, height: size * 0.36, borderRadius: size * 0.18,
        backgroundColor: '#888', justifyContent: 'center', alignItems: 'center',
      }}>
        <View style={{
          width: size * 0.22, height: size * 0.22, borderRadius: size * 0.11,
          backgroundColor: '#444',
        }} />
      </View>
    </View>
    <View style={{
      width: size * 0.22, height: size * 0.14,
      backgroundColor: color, borderRadius: size * 0.04,
      position: 'absolute', right: 0, top: 0,
    }} />
  </View>
);

export default function CameraScreen({ navigation }) {
  const { user } = useAuth();

  const requireAuth = (action) => {
    if (!user) navigation.navigate('Login');
    else action?.();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── HEADER ─────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Camera</Text>
        <Text style={styles.headerSubtitle}>Quản lý thiết bị camera</Text>
      </View>

      {/* ── BODY ───────────────────────────────────────── */}
      <View style={styles.body}>
        {/* Camera feed placeholder */}
        <View style={styles.feedCard}>
          <View style={styles.feedFrame}>
            <IconCamera size={64} color="#bbb" />
            <Text style={styles.feedLabel}>Camera chính · Ngoài cửa</Text>
          </View>
          <View style={styles.feedFooter}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Online</Text>
            <TouchableOpacity style={styles.fullscreenBtn}>
              <Text style={styles.fullscreenText}>Xem toàn màn hình</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Thêm thiết bị */}
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => requireAuth(() => {})}
          activeOpacity={0.8}
        >
          <Text style={styles.addBtnPlus}>+</Text>
          <Text style={styles.addBtnText}>Thêm thiết bị</Text>
        </TouchableOpacity>
      </View>

      {/* ── BOTTOM NAV ─────────────────────────────────── */}
      <BottomNav
        navigation={navigation}
        activeTab="Camera"
        requireAuth={requireAuth}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  headerTitle:    { fontSize: 20, fontWeight: '800', color: TEXT1 },
  headerSubtitle: { fontSize: 13, color: TEXT2, marginTop: 2 },

  body: { flex: 1, padding: 20 },

  feedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    overflow: 'hidden', marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  feedFrame: {
    height: 220, backgroundColor: '#EAECEF',
    justifyContent: 'center', alignItems: 'center', gap: 12,
  },
  feedLabel: { fontSize: 13, color: TEXT3 },
  feedFooter: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 6,
  },
  statusDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },
  statusText:   { fontSize: 13, fontWeight: '600', color: '#22C55E', flex: 1 },
  fullscreenBtn:{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F1F5F9', borderRadius: 8 },
  fullscreenText:{ fontSize: 12, fontWeight: '600', color: TEXT1 },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: TEAL, borderStyle: 'dashed',
    borderRadius: 16, paddingVertical: 18, gap: 10,
  },
  addBtnPlus: { color: TEAL, fontSize: 22, fontWeight: '300' },
  addBtnText: { color: TEAL, fontSize: 14, fontWeight: '600' },
});