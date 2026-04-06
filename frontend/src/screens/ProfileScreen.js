import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';

const TEAL   = '#2E7D8C';
const BG     = '#F7F9FC';
const TEXT1  = '#0F172A';
const TEXT2  = '#6B7280';
const BORDER = '#E5E7EB';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();

  const requireAuth = (action) => {
    if (!user) navigation.navigate('Login');
    else action?.();
  };

  const handleLogout = async () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc muốn đăng xuất không?',
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              navigation.navigate('Login');
            } catch (error) {
              Alert.alert('Lỗi', 'Lỗi đăng xuất: ' + error.message);
            }
          },
        },
      ]
    );
  };

  const initial = (user?.full_name || user?.username || user?.email || 'U')
    .charAt(0)
    .toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── HEADER ─────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tài khoản</Text>
      </View>

      <View style={styles.body}>
        {/* ── Thông tin người dùng ── */}
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>
                {user?.full_name || user?.username || 'Unknown user'}
              </Text>
              <Text style={styles.meta}>{user?.email || 'Chưa có email'}</Text>
              <Text style={styles.meta}>
                Vai trò: {user?.role || 'viewer'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Cài đặt ── */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Cài đặt</Text>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Đổi mật khẩu</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Thông báo</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── Đăng xuất ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>

      {/* ── BOTTOM NAV ─────────────────────────────────── */}
      <BottomNav
        navigation={navigation}
        activeTab="Profile"
        requireAuth={requireAuth}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: TEXT1 },

  body: { flex: 1, padding: 20 },

  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  headerRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: TEAL,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 20 },
  name:       { fontSize: 18, fontWeight: '700', color: TEXT1 },
  meta:       { color: TEXT2, marginTop: 4, fontSize: 13 },

  sectionLabel: {
    fontWeight: '700', color: TEXT1,
    marginBottom: 12, fontSize: 14,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  menuItemText:  { fontSize: 14, color: TEXT1 },
  menuItemArrow: { fontSize: 20, color: '#CBD5E1' },
  divider:       { height: 1, backgroundColor: BORDER },

  logoutBtn: {
    backgroundColor: '#EF4444',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  logoutText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});