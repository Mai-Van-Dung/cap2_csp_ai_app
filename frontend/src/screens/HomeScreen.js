import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Modal,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');
const TEAL   = '#2E7D8C';
const BG     = '#FFFFFF';
const SURF   = '#F5F6F8';
const SURF2  = '#EEEFF2';
const TEXT1  = '#1A1A2E';
const TEXT2  = '#718096';
const TEXT3  = '#A0AEC0';
const BORDER = '#E8ECF0';

// ── Icon components (no emoji) ────────────────────────────
const IconHome = ({ color = TEXT3, size = 22 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
    {/* roof */}
    <View style={{
      position: 'absolute', top: 0,
      borderLeftWidth: size * 0.55, borderRightWidth: size * 0.55,
      borderBottomWidth: size * 0.5,
      borderLeftColor: 'transparent', borderRightColor: 'transparent',
      borderBottomColor: color,
    }} />
    {/* body */}
    <View style={{
      width: size * 0.65, height: size * 0.52,
      backgroundColor: color, borderRadius: 2,
    }} />
  </View>
);

const IconLines = ({ color = TEXT3, size = 22 }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', gap: 4 }}>
    {[0, 1, 2].map(i => (
      <View key={i} style={{
        height: 2, backgroundColor: color,
        width: i === 0 ? '100%' : i === 1 ? '75%' : '55%',
        borderRadius: 2,
      }} />
    ))}
  </View>
);

const IconCircle = ({ color = TEXT3, size = 22 }) => (
  <View style={{
    width: size, height: size, borderRadius: size / 2,
    borderWidth: 2, borderColor: color,
    justifyContent: 'center', alignItems: 'center',
  }}>
    <View style={{
      width: size * 0.35, height: size * 0.35,
      borderRadius: size * 0.175, backgroundColor: color,
    }} />
  </View>
);

const IconCamera = ({ size = 80, color = '#555' }) => (
  <View style={{ width: size, height: size * 0.75, position: 'relative' }}>
    {/* body */}
    <View style={{
      width: size * 0.72, height: size * 0.58,
      backgroundColor: color, borderRadius: size * 0.08,
      position: 'absolute', left: 0, top: size * 0.08,
      justifyContent: 'center', alignItems: 'center',
    }}>
      {/* lens outer */}
      <View style={{
        width: size * 0.36, height: size * 0.36, borderRadius: size * 0.18,
        backgroundColor: '#888', justifyContent: 'center', alignItems: 'center',
      }}>
        {/* lens inner */}
        <View style={{
          width: size * 0.22, height: size * 0.22, borderRadius: size * 0.11,
          backgroundColor: '#444',
        }} />
      </View>
    </View>
    {/* viewfinder bump */}
    <View style={{
      width: size * 0.22, height: size * 0.14,
      backgroundColor: color, borderRadius: size * 0.04,
      position: 'absolute', right: 0, top: 0,
    }} />
    {/* red dot */}
    <View style={{
      width: size * 0.07, height: size * 0.07, borderRadius: size * 0.035,
      backgroundColor: '#E74C3C',
      position: 'absolute', left: size * 0.08, bottom: size * 0.1,
    }} />
    {/* green dot */}
    <View style={{
      width: size * 0.07, height: size * 0.07, borderRadius: size * 0.035,
      backgroundColor: '#2ECC71',
      position: 'absolute', left: size * 0.18, bottom: size * 0.1,
    }} />
  </View>
);

const IconHeart = ({ color = TEAL, size = 14 }) => (
  <Text style={{ color, fontSize: size, lineHeight: size + 4 }}>♥</Text>
);

const TAB_ITEMS = [
  { key: 'home',     label: 'Màn hình chính', Icon: IconHome   },
  { key: 'activity', label: 'Hoạt động',       Icon: IconLines  },
  { key: 'account',  label: 'Tài khoản',       Icon: IconCircle },
];

const CAMERAS = [
  {
    id: 1,
    name: 'Camera chính',
    location: 'Ngoài cửa',
    status: 'online',
  },
];

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [activeTab,  setActiveTab]  = useState('home');
  const [showMenu,   setShowMenu]   = useState(false);

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── HEADER ─────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <View style={styles.pinDot} />
          <Text style={styles.searchText}>CSP-AI Camera</Text>
        </View>

        {user ? (
          <>
            <TouchableOpacity
              style={styles.avatar}
              onPress={() => setShowMenu(!showMenu)}
            >
              <Text style={styles.avatarText}>
                {user.full_name?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </TouchableOpacity>

            {/* Dropdown Menu */}
            <Modal
              transparent
              animationType="none"
              visible={showMenu}
              onRequestClose={() => setShowMenu(false)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowMenu(false)}
              >
                <View style={styles.dropdownMenu}>
                  <View style={styles.dropdownUser}>
                    <Text style={styles.dropdownUserName}>
                      {user.full_name || user.username || 'User'}
                    </Text>
                    <Text style={styles.dropdownUserEmail}>
                      {user.email || user.username}
                    </Text>
                  </View>
                  <View style={styles.dropdownDivider} />
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={handleLogout}
                  >
                    <Text style={styles.dropdownItemText}>Đăng xuất</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Modal>
          </>
        ) : (
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginBtnText}>Đăng nhập</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── BODY ───────────────────────────────────────── */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Chưa đăng nhập ── */}
        {!user && (
          <View style={styles.emptyState}>
            {/* Illustration */}
            <View style={styles.illustrationWrap}>
              <View style={styles.illustrationCircle}>
                <IconCamera size={90} color="#555" />
              </View>
              <View style={[styles.heartDot, { top: 8, left: width * 0.15 }]}>
                <IconHeart color="#E74C3C" size={18} />
              </View>
              <View style={[styles.heartDot, { top: 8, right: width * 0.15 }]}>
                <IconHeart color="#E74C3C" size={18} />
              </View>
            </View>

            <Text style={styles.emptyTitle}>
              Quản lý camera của bạn{'\n'}mọi lúc, mọi nơi
            </Text>
            <Text style={styles.emptySubtitle}>
              Đăng nhập để xem và quản lý{'\n'}toàn bộ hệ thống camera của bạn
            </Text>

            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => requireAuth(() => {})}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyBtnPlus}>+</Text>
              <Text style={styles.emptyBtnText}>Thêm thiết bị</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Đã đăng nhập ── */}
        {user && (
          <View>
            <Text style={styles.sectionLabel}>Camera của bạn</Text>

            {/* Camera Display */}
            <TouchableOpacity style={styles.cameraContainer} activeOpacity={0.8}>
              <View style={styles.cameraFrame}>
                <IconCamera size={80} color="#999" />
              </View>
              <View style={styles.cameraInfo}>
                <View>
                  <Text style={styles.cameraName}>{CAMERAS[0].name}</Text>
                  <Text style={styles.cameraLocation}>{CAMERAS[0].location}</Text>
                </View>
                <View style={styles.cameraStatus}>
                  <View style={[
                    styles.statusIndicator,
                    { backgroundColor: CAMERAS[0].status === 'online' ? '#27AE60' : '#E74C3C' },
                  ]} />
                  <Text style={[
                    styles.statusText,
                    { color: CAMERAS[0].status === 'online' ? '#27AE60' : '#E74C3C' },
                  ]}>
                    {CAMERAS[0].status === 'online' ? 'Online' : 'Offline'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addCamBtn}
              onPress={() => requireAuth(() => {})}
              activeOpacity={0.8}
            >
              <Text style={styles.addCamPlus}>+</Text>
              <Text style={styles.addCamText}>Thêm thiết bị</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ── BOTTOM NAV ─────────────────────────────────── */}
      <View style={styles.bottomNav}>
        {TAB_ITEMS.map(({ key, label, Icon }) => {
          const active = activeTab === key;
          const iconColor = active ? TEAL : TEXT3;
          return (
            <TouchableOpacity
              key={key}
              style={styles.tabItem}
              onPress={() => {
                if (key !== 'home') requireAuth(() => setActiveTab(key));
                else setActiveTab(key);
              }}
            >
              <View style={[styles.tabPill, active && styles.tabPillActive]}>
                <Icon color={iconColor} size={22} />
              </View>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURF,
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 8,
    // đảm bảo không tràn ra ngoài
    minWidth: 0,
    overflow: 'hidden',
  },
  pinDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: TEAL,
    flexShrink: 0,
  },
  searchText: {
    color: TEXT1, fontSize: 15, fontWeight: '500',
    flexShrink: 1,          // co lại nếu không đủ chỗ
    numberOfLines: 1,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#E53935',
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,           // không bao giờ bị co
  },
  avatarText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  loginBtn: {
    backgroundColor: TEAL,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexShrink: 0,           // không bao giờ bị co hay cắt
  },
  loginBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  // Body
  body: { flex: 1, backgroundColor: BG },
  bodyContent: { padding: 16, paddingBottom: 24 },

  // Toggle (removed - no longer needed)

  // Empty state
  emptyState: { alignItems: 'center', paddingTop: 20 },
  illustrationWrap: {
    width: width * 0.7,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
    position: 'relative',
    paddingVertical: 20,
  },
  illustrationCircle: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: SURF,
    justifyContent: 'center', alignItems: 'center',
  },
  heartDot: {
    position: 'absolute',
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: BG,
    borderWidth: 1, borderColor: BORDER,
    justifyContent: 'center', alignItems: 'center',
    elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
  },
  emptyTitle: {
    color: TEXT1, fontSize: 20, fontWeight: '700',
    textAlign: 'center', lineHeight: 30, marginBottom: 12,
  },
  emptySubtitle: {
    color: TEXT2, fontSize: 14,
    textAlign: 'center', lineHeight: 22, marginBottom: 36,
  },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: SURF, borderRadius: 30,
    paddingHorizontal: 36, paddingVertical: 16,
    gap: 10,
    borderWidth: 1, borderColor: BORDER,
  },
  emptyBtnPlus: { color: TEAL, fontSize: 20, fontWeight: '300', lineHeight: 24 },
  emptyBtnText: { color: TEXT1, fontSize: 15, fontWeight: '600' },

  sectionLabel: {
    color: TEXT3, fontSize: 12, fontWeight: '600',
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 16,
  },

  // Camera container
  cameraContainer: {
    backgroundColor: SURF,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cameraFrame: {
    width: '100%',
    height: 240,
    backgroundColor: '#E8EAED',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  cameraInfo: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cameraName: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT1,
    marginBottom: 4,
  },
  cameraLocation: {
    fontSize: 13,
    color: TEXT2,
  },
  cameraStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Section
  sectionLabel: {
    color: TEXT3, fontSize: 12, fontWeight: '600',
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 16,
  },

  // Old camera styles (removed)

  // Add cam
  addCamBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: TEAL, borderStyle: 'dashed',
    borderRadius: 16, paddingVertical: 18, marginTop: 6, gap: 10,
  },
  addCamPlus: { color: TEAL, fontSize: 22, fontWeight: '300' },
  addCamText: { color: TEAL, fontSize: 14, fontWeight: '600' },

  // Bottom nav
  bottomNav: {
    flexDirection: 'row', backgroundColor: BG,
    borderTopWidth: 1, borderTopColor: BORDER,
    paddingBottom: 20, paddingTop: 8,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 4 },
  tabPill: {
    width: 60, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  tabPillActive: { backgroundColor: SURF2 },
  tabLabel: { fontSize: 11, color: TEXT3, fontWeight: '500' },
  tabLabelActive: { color: TEAL, fontWeight: '700' },

  // Dropdown menu
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 60,
  },
  dropdownMenu: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginLeft: 'auto',
    marginRight: 16,
    minWidth: 200,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  dropdownUser: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownUserName: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT1,
    marginBottom: 4,
  },
  dropdownUserEmail: {
    fontSize: 13,
    color: TEXT2,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#E8ECF0',
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#E74C3C',
    fontWeight: '500',
  },
});