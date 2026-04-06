import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar, Modal, Alert, Dimensions,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';

const { width } = Dimensions.get('window');

const TEAL   = '#2E7D8C';
const BG     = '#F5F6F8';
const SURF   = '#FFFFFF';
const TEXT1  = '#0F172A';
const TEXT2  = '#475569';
const TEXT3  = '#94A3B8';
const BORDER = '#E5E7EB';

// ── Mock alerts gần đây ───────────────────────────────────
const MOCK_ALERTS = [
  { id: 1, time: '09:10', thumb: null, label: 'Cura...' },
  { id: 2, time: '08:55', thumb: null, label: 'Phát hiện' },
  { id: 3, time: '08:30', thumb: null, label: 'Chuyển động' },
];

// ── Camera icon ───────────────────────────────────────────
const IconCamera = ({ size = 48, color = '#fff' }) => (
  <View style={{ width: size, height: size * 0.75, position: 'relative' }}>
    <View style={{
      width: size * 0.72, height: size * 0.58,
      backgroundColor: color, borderRadius: size * 0.08,
      position: 'absolute', left: 0, top: size * 0.08,
      justifyContent: 'center', alignItems: 'center',
    }}>
      <View style={{
        width: size * 0.36, height: size * 0.36, borderRadius: size * 0.18,
        backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center',
      }}>
        <View style={{ width: size * 0.2, height: size * 0.2, borderRadius: size * 0.1, backgroundColor: 'rgba(0,0,0,0.5)' }} />
      </View>
    </View>
    <View style={{
      width: size * 0.22, height: size * 0.14, backgroundColor: color,
      borderRadius: size * 0.04, position: 'absolute', right: 0, top: 0,
    }} />
  </View>
);

// ── Control button (âm thanh, mic, chụp, quay) ───────────
const ControlBtn = ({ icon, onPress }) => (
  <TouchableOpacity style={styles.controlBtn} onPress={onPress} activeOpacity={0.7}>
    <Text style={styles.controlIcon}>{icon}</Text>
  </TouchableOpacity>
);

// ── Shortcut button (Song / Lịch sử / Cài đặt) ───────────
const ShortcutBtn = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.shortcutBtn} onPress={onPress} activeOpacity={0.7}>
    <Text style={styles.shortcutIcon}>{icon}</Text>
    <Text style={styles.shortcutLabel}>{label}</Text>
  </TouchableOpacity>
);

// ── Alert thumbnail ───────────────────────────────────────
const AlertThumb = ({ item, onPress }) => (
  <TouchableOpacity style={styles.alertThumb} onPress={onPress} activeOpacity={0.8}>
    <View style={styles.alertThumbImg}>
      <Text style={styles.alertThumbTime}>{item.time}</Text>
    </View>
    <Text style={styles.alertThumbLabel} numberOfLines={1}>{item.label}</Text>
  </TouchableOpacity>
);

// ── Main Screen ───────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const requireAuth = (action) => {
    if (!user) navigation.navigate('Login');
    else action?.();
  };

  const handleLogout = async () => {
    setShowMenu(false);
    try {
      await logout();
      navigation.navigate('Login');
      Alert.alert('✓', 'Đã đăng xuất');
    } catch (error) {
      Alert.alert('Lỗi', 'Lỗi đăng xuất: ' + error.message);
    }
  };

  const initial = user
    ? (user.full_name?.charAt(0) || user.username?.charAt(0) || 'U').toUpperCase()
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={SURF} />

      {/* ── HEADER ─────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CAMERA TRUC TIEP</Text>

        {user ? (
          <TouchableOpacity
            style={styles.userRow}
            onPress={() => setShowMenu(true)}
            activeOpacity={0.8}
          >
            <View style={styles.avatarSmall}>
              <Text style={styles.avatarSmallText}>{initial}</Text>
            </View>
            <Text style={styles.greetText}>
              Chào <Text style={styles.greetName}>{user.full_name || user.username}!</Text>
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginBtnText}>Đăng nhập</Text>
          </TouchableOpacity>
        )}

        {/* Dropdown */}
        <Modal transparent animationType="fade" visible={showMenu} onRequestClose={() => setShowMenu(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
            <View style={styles.dropdownMenu}>
              <View style={styles.dropdownUser}>
                <Text style={styles.dropdownUserName}>{user?.full_name || user?.username}</Text>
                <Text style={styles.dropdownUserEmail}>{user?.email}</Text>
              </View>
              <View style={styles.dropdownDivider} />
              <TouchableOpacity style={styles.dropdownItem} onPress={handleLogout}>
                <Text style={styles.dropdownItemText}>Đăng xuất</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── CAMERA FEED ────────────────────────────────── */}
        <View style={styles.cameraCard}>
          {/* Live badge */}
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>

          {/* Feed area */}
          <View style={styles.cameraFeed}>
            <IconCamera size={64} color="rgba(255,255,255,0.3)" />
            <Text style={styles.cameraFeedHint}>
              {user ? 'Camera chính · Ngoài cửa' : 'Đăng nhập để xem camera'}
            </Text>
          </View>

          {/* Controls */}
          <View style={styles.controlRow}>
            <ControlBtn icon="🔊" onPress={() => requireAuth(() => {})} />
            <ControlBtn icon="🎤" onPress={() => requireAuth(() => {})} />
            <ControlBtn icon="📷" onPress={() => requireAuth(() => {})} />
            <ControlBtn icon="🎬" onPress={() => requireAuth(() => {})} />
          </View>
        </View>

        {/* ── SHORTCUTS ──────────────────────────────────── */}
        <View style={styles.shortcutRow}>
          <ShortcutBtn icon="🎵" label="SONG"    onPress={() => requireAuth(() => {})} />
          <ShortcutBtn icon="📅" label="LỊCH SỬ" onPress={() => requireAuth(() => navigation.navigate('Alerts'))} />
          <ShortcutBtn icon="⚙️" label="CÀI ĐẶT" onPress={() => requireAuth(() => navigation.navigate('Profile'))} />
        </View>

        {/* ── WEATHER ────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>ĐỀ BÁO THỜI TIẾT</Text>
          <View style={styles.weatherMain}>
            <View style={styles.weatherLeft}>
              <Text style={styles.weatherCity}>Hà Nội</Text>
              <View style={styles.weatherTempRow}>
                <Text style={styles.weatherIcon}>⛅</Text>
                <View>
                  <Text style={styles.weatherTemp}>28 °C</Text>
                  <Text style={styles.weatherDesc}>Trời nắng nhẹ</Text>
                </View>
              </View>
            </View>
            <View style={styles.weatherForecast}>
              {[
                { label: 'Tam', icon: '🌤', temp: '29°C', day: 'Mây' },
                { label: 'Tham', icon: '🌧', temp: '26°C', day: 'Mưa' },
                { label: 'Ngay', icon: '☀️', temp: '30°C', day: 'Nắng' },
              ].map((d, i) => (
                <View key={i} style={styles.forecastItem}>
                  <Text style={styles.forecastDay}>{d.label}</Text>
                  <Text style={styles.forecastIcon}>{d.icon}</Text>
                  <Text style={styles.forecastDesc}>{d.day}</Text>
                  <Text style={styles.forecastTemp}>{d.temp}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── RECENT ALERTS ──────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardSectionTitle}>SU KIỆN CẢNH BÁO GÀN ĐÂY</Text>
            <TouchableOpacity onPress={() => requireAuth(() => navigation.navigate('Alerts'))}>
              <Text style={styles.seeAll}>Xem tất cả →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.alertsScroll}>
            {MOCK_ALERTS.map(item => (
              <AlertThumb
                key={item.id}
                item={item}
                onPress={() => requireAuth(() => navigation.navigate('Alerts'))}
              />
            ))}
          </ScrollView>
        </View>

        {/* Padding cuối */}
        <View style={{ height: 12 }} />
      </ScrollView>

      {/* ── BOTTOM NAV ─────────────────────────────────── */}
      <BottomNav navigation={navigation} activeTab="Home" requireAuth={requireAuth} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scroll:    { paddingBottom: 12 },

  // Header
  header: {
    backgroundColor: SURF, alignItems: 'center',
    paddingTop: 14, paddingBottom: 12, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: BORDER,
    gap: 6,
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: TEXT1, letterSpacing: 1 },
  userRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatarSmall: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#E53935', justifyContent: 'center', alignItems: 'center',
  },
  avatarSmallText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  greetText:   { fontSize: 14, color: TEXT2 },
  greetName:   { fontWeight: '700', color: TEXT1 },
  loginBtn: {
    backgroundColor: TEAL, borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 8,
  },
  loginBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  // Camera card
  cameraCard: {
    backgroundColor: '#1A2A3A', margin: 16, marginBottom: 0,
    borderRadius: 20, overflow: 'hidden',
  },
  liveBadge: {
    position: 'absolute', top: 12, right: 12,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#E53935', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4, gap: 4, zIndex: 10,
  },
  liveDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  liveText: { color: '#FFF', fontWeight: '800', fontSize: 11, letterSpacing: 1 },
  cameraFeed: {
    height: 220, justifyContent: 'center', alignItems: 'center', gap: 12,
    backgroundColor: '#243447',
  },
  cameraFeedHint: { color: 'rgba(255,255,255,0.45)', fontSize: 12 },
  controlRow: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 20, paddingVertical: 14,
  },
  controlBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  controlIcon: { fontSize: 20 },

  // Shortcuts
  shortcutRow: {
    flexDirection: 'row', marginHorizontal: 16,
    marginTop: 14, marginBottom: 0, gap: 12,
  },
  shortcutBtn: {
    flex: 1, backgroundColor: SURF,
    borderRadius: 16, paddingVertical: 14,
    alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  shortcutIcon:  { fontSize: 22 },
  shortcutLabel: { fontSize: 11, fontWeight: '700', color: TEXT2, letterSpacing: 0.5 },

  // Card
  card: {
    backgroundColor: SURF, marginHorizontal: 16, marginTop: 14,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  cardSectionTitle: {
    fontSize: 12, fontWeight: '700', color: TEXT1,
    letterSpacing: 0.6, marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  seeAll: { fontSize: 12, color: TEAL, fontWeight: '600' },

  // Weather
  weatherMain:    { flexDirection: 'row', gap: 12 },
  weatherLeft:    { flex: 1 },
  weatherCity:    { fontSize: 15, fontWeight: '700', color: TEXT1, marginBottom: 8 },
  weatherTempRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weatherIcon:    { fontSize: 36 },
  weatherTemp:    { fontSize: 22, fontWeight: '800', color: TEXT1 },
  weatherDesc:    { fontSize: 12, color: TEXT2, marginTop: 2 },
  weatherForecast:{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  forecastItem:   { alignItems: 'center', gap: 3 },
  forecastDay:    { fontSize: 11, fontWeight: '600', color: TEXT3 },
  forecastIcon:   { fontSize: 18 },
  forecastDesc:   { fontSize: 10, color: TEXT2 },
  forecastTemp:   { fontSize: 12, fontWeight: '700', color: TEXT1 },

  // Alert thumbs
  alertsScroll: { marginHorizontal: -4 },
  alertThumb:   { width: 100, marginHorizontal: 4 },
  alertThumbImg: {
    height: 70, backgroundColor: '#E8ECF0', borderRadius: 10,
    justifyContent: 'flex-end', alignItems: 'flex-start',
    padding: 6, marginBottom: 4,
  },
  alertThumbTime:  { fontSize: 11, fontWeight: '700', color: TEXT1, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  alertThumbLabel: { fontSize: 11, color: TEXT2, fontWeight: '500' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start', paddingTop: 80, paddingHorizontal: 16,
  },
  dropdownMenu: {
    backgroundColor: SURF, borderRadius: 14, marginLeft: 'auto',
    minWidth: 210, shadowColor: '#000', shadowOpacity: 0.12,
    shadowRadius: 12, elevation: 8, overflow: 'hidden',
  },
  dropdownUser:      { paddingHorizontal: 16, paddingVertical: 16 },
  dropdownUserName:  { fontSize: 15, fontWeight: '700', color: TEXT1, marginBottom: 3 },
  dropdownUserEmail: { fontSize: 13, color: TEXT2 },
  dropdownDivider:   { height: 1, backgroundColor: BORDER },
  dropdownItem:      { paddingHorizontal: 16, paddingVertical: 13 },
  dropdownItemText:  { fontSize: 14, color: '#E74C3C', fontWeight: '600' },
});