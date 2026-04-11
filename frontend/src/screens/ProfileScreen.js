import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  Alert, TextInput, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import { telegramAPI } from '../services/api';

const TEAL   = '#2E7D8C';
const BG     = '#F0F4F8';
const SURF   = '#FFFFFF';
const TEXT1  = '#0F172A';
const TEXT2  = '#475569';
const TEXT3  = '#94A3B8';
const BORDER = '#E2E8F0';
const RED    = '#EF4444';

const TELEGRAM_STORAGE_KEY = 'telegram_chat_id';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [telegramId, setTelegramId]     = useState('');
  const [inputValue, setInputValue]     = useState('');
  const [editing, setEditing]           = useState(false);
  const [saving, setSaving]             = useState(false);
  const [testing, setTesting]           = useState(false);
  const [testResult, setTestResult]     = useState(null); // 'ok' | 'fail' | null

  const requireAuth = (action) => {
    if (!user) navigation.navigate('Login');
    else action?.();
  };

  // Load Chat ID đã lưu
  useEffect(() => {
    AsyncStorage.getItem(TELEGRAM_STORAGE_KEY).then((val) => {
      if (val) { setTelegramId(val); setInputValue(val); }
    });
  }, []);

  const handleSaveTelegram = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      Alert.alert('Lỗi', 'Vui lòng nhập Chat ID');
      return;
    }
    setSaving(true);
    try {
      // Lưu local
      await AsyncStorage.setItem(TELEGRAM_STORAGE_KEY, trimmed);
      // Gửi lên backend để lưu vào DB (xem API bên dưới)
      await telegramAPI.saveChatId(trimmed);
      setTelegramId(trimmed);
      setEditing(false);
      setTestResult(null);
      Alert.alert('Thành công', 'Đã lưu Telegram Chat ID');
    } catch (e) {
      Alert.alert('Lỗi', e.message || 'Không lưu được');
    } finally {
      setSaving(false);
    }
  };

  const handleTestTelegram = async () => {
    if (!telegramId) { Alert.alert('Chưa có Chat ID', 'Hãy lưu Chat ID trước.'); return; }
    setTesting(true);
    setTestResult(null);
    try {
      await telegramAPI.sendTest(telegramId);
      setTestResult('ok');
    } catch {
      setTestResult('fail');
    } finally {
      setTesting(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất không?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Đăng xuất', style: 'destructive',
        onPress: async () => {
          try { await logout(); navigation.navigate('Login'); }
          catch (e) { Alert.alert('Lỗi', e.message); }
        },
      },
    ]);
  };

  const initial = (user?.full_name || user?.username || 'U').charAt(0).toUpperCase();
  const displayName = user?.full_name || user?.username || 'Người dùng';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{'Tài khoản'}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Avatar + thông tin */}
        <View style={styles.profileHero}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>{initial}</Text>
          </View>
          <Text style={styles.heroName}>{displayName}</Text>
          {user?.email ? (
  <Text style={styles.heroEmail}>{user.email}</Text>
) : null}
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>{user?.role || 'viewer'}</Text>
          </View>
        </View>

        {/* Thông tin tài khoản */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{'THÔNG TIN'}</Text>
          <View style={styles.card}>
            <InfoRow label="Tên đầy đủ"  value={user?.full_name || '—'} />
            <View style={styles.rowDivider} />
            <InfoRow label="Tên đăng nhập" value={user?.username || '—'} />
            <View style={styles.rowDivider} />
            <InfoRow label="Email"        value={user?.email || '—'} />
            <View style={styles.rowDivider} />
            <InfoRow label="Vai trò"      value={user?.role || 'viewer'} />
          </View>
        </View>

        {/* Telegram */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{'THÔNG BÁO TELEGRAM'}</Text>
          <View style={styles.card}>
            {/* Hướng dẫn */}
            <View style={styles.telegramGuide}>
              <View style={styles.telegramIconBox}>
                <Text style={styles.telegramIconText}>{'TG'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.telegramGuideTitle}>
                  {'Nhận cảnh báo qua Telegram'}
                </Text>
                <Text style={styles.telegramGuideDesc}>
                  {'Nhắn /start cho bot để lấy Chat ID của bạn'}
                </Text>
              </View>
            </View>

            {/* Bot link */}
            <View style={styles.botLinkBox}>
              <Text style={styles.botLinkLabel}>{'Bot của hệ thống:'}</Text>
              <Text style={styles.botLinkValue} selectable>
                {'@your_security_bot'}
              </Text>
            </View>

            <View style={styles.rowDivider} />

            {/* Input Chat ID */}
            <View style={styles.telegramInputSection}>
              <Text style={styles.inputLabel}>{'Chat ID'}</Text>
              {editing ? (
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.textInput}
                    value={inputValue}
                    onChangeText={setInputValue}
                    placeholder="VD: 123456789"
                    placeholderTextColor={TEXT3}
                    keyboardType="numeric"
                    autoFocus
                  />
                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleSaveTelegram}
                    disabled={saving}
                  >
                    {saving
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.saveBtnText}>{'Lưu'}</Text>
                    }
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => { setEditing(false); setInputValue(telegramId); }}
                  >
                    <Text style={styles.cancelBtnText}>{'Huỷ'}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.inputRow}>
                  <View style={styles.chatIdDisplay}>
                    {telegramId ? (
                      <>
                        <View style={styles.connectedDot} />
                        <Text style={styles.chatIdValue}>{telegramId}</Text>
                      </>
                    ) : (
                      <Text style={styles.chatIdEmpty}>{'Chưa cấu hình'}</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => setEditing(true)}
                  >
<Text style={styles.editBtnText}>{telegramId ? 'Sửa' : 'Thêm'}</Text>

                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Nút test */}
            {telegramId && !editing && (
              <TouchableOpacity
                style={styles.testBtn}
                onPress={handleTestTelegram}
                disabled={testing}
                activeOpacity={0.8}
              >
                {testing ? (
                  <ActivityIndicator size="small" color={TEAL} />
                ) : (
                  <Text style={styles.testBtnText}>{'Gửi tin nhắn thử'}</Text>
                )}
              </TouchableOpacity>
            )}

            {/* Kết quả test */}
            {testResult === 'ok' && (
              <View style={styles.testResultBox}>
                <View style={styles.testResultDot} />
                <Text style={styles.testResultOk}>
                  {'Đã gửi thành công. Kiểm tra Telegram của bạn.'}
                </Text>
              </View>
            )}
            {testResult === 'fail' && (
              <View style={[styles.testResultBox, styles.testResultBoxFail]}>
                <Text style={styles.testResultFail}>
                  {'Gửi thất bại. Kiểm tra Chat ID và bot đã được /start chưa.'}
                </Text>
              </View>
            )}
          </View>

          {/* Hướng dẫn từng bước */}
          <View style={styles.stepsCard}>
            <Text style={styles.stepsTitle}>{'Cách lấy Chat ID'}</Text>
            {[
              'Mở Telegram, tìm kiếm @your_security_bot',
              'Nhấn Start hoặc gửi /start',
              'Bot sẽ trả về Chat ID của bạn',
              'Dán Chat ID vào ô bên trên và lưu',
            ].map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{String(i + 1)}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Cài đặt */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{'CÀI ĐẶT'}</Text>
          <View style={styles.card}>
            <MenuRow label="Đổi mật khẩu" />
            <View style={styles.rowDivider} />
            <MenuRow label="Thông báo đẩy" />
          </View>
        </View>

        {/* Đăng xuất */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Text style={styles.logoutText}>{'Đăng xuất'}</Text>
        </TouchableOpacity>

        <View style={{ height: 80 }} />
      </ScrollView>

      <BottomNav navigation={navigation} activeTab="Profile" requireAuth={requireAuth} />
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────
const InfoRow = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const MenuRow = ({ label, onPress }) => (
  <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
    <Text style={styles.menuRowText}>{String(label)}</Text>
    <Text style={styles.menuRowArrow}>{'›'}</Text>
  </TouchableOpacity>
);
const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: BG },
  header:           { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: BG },
  headerTitle:      { fontSize: 22, fontWeight: '700', color: TEXT1 },
  scroll:           { paddingHorizontal: 16 },

  // Hero
  profileHero:      { alignItems: 'center', paddingVertical: 24 },
  avatarLarge:      { width: 80, height: 80, borderRadius: 40, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarLargeText:  { fontSize: 32, fontWeight: '700', color: '#fff' },
  heroName:         { fontSize: 20, fontWeight: '700', color: TEXT1, marginBottom: 4 },
  heroEmail:        { fontSize: 14, color: TEXT2, marginBottom: 8 },
  rolePill:         { backgroundColor: '#E0F2F1', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  roleText:         { fontSize: 12, fontWeight: '600', color: TEAL },

  // Section
  section:          { marginBottom: 20 },
  sectionLabel:     { fontSize: 11, fontWeight: '700', color: TEXT3, letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  card:             { backgroundColor: SURF, borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  rowDivider:       { height: 1, backgroundColor: BORDER, marginVertical: 8 },

  // InfoRow
  infoRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  infoLabel:        { fontSize: 14, color: TEXT2 },
  infoValue:        { fontSize: 14, fontWeight: '500', color: TEXT1, maxWidth: '60%', textAlign: 'right' },

  // MenuRow
  menuRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  menuRowText:      { fontSize: 15, color: TEXT1 },
  menuRowArrow:     { fontSize: 20, color: TEXT3 },

  // Telegram
  telegramGuide:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  telegramIconBox:  { width: 44, height: 44, borderRadius: 12, backgroundColor: '#E3F2FD', alignItems: 'center', justifyContent: 'center' },
  telegramIconText: { fontSize: 13, fontWeight: '700', color: '#1565C0' },
  telegramGuideTitle:{ fontSize: 15, fontWeight: '600', color: TEXT1, marginBottom: 2 },
  telegramGuideDesc: { fontSize: 13, color: TEXT2 },
  botLinkBox:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  botLinkLabel:     { fontSize: 13, color: TEXT2 },
  botLinkValue:     { fontSize: 13, fontWeight: '600', color: TEAL },

  // Input
  telegramInputSection: { marginTop: 4 },
  inputLabel:       { fontSize: 13, color: TEXT2, marginBottom: 8 },
  inputRow:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  textInput:        { flex: 1, borderWidth: 1.5, borderColor: TEAL, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, color: TEXT1 },
  saveBtn:          { backgroundColor: TEAL, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  saveBtnText:      { color: '#fff', fontWeight: '600', fontSize: 14 },
  cancelBtn:        { paddingHorizontal: 10, paddingVertical: 10 },
  cancelBtnText:    { color: TEXT2, fontSize: 14 },
  chatIdDisplay:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  connectedDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },
  chatIdValue:      { fontSize: 15, fontWeight: '500', color: TEXT1 },
  chatIdEmpty:      { fontSize: 14, color: TEXT3 },
  editBtn:          { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: TEAL },
  editBtnText:      { color: TEAL, fontWeight: '600', fontSize: 14 },

  // Test button
  testBtn:          { marginTop: 12, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: TEAL, alignItems: 'center' },
  testBtnText:      { color: TEAL, fontWeight: '600', fontSize: 14 },
  testResultBox:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, padding: 10, backgroundColor: '#F0FDF4', borderRadius: 8 },
  testResultBoxFail:{ backgroundColor: '#FEF2F2' },
  testResultDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },
  testResultOk:     { fontSize: 13, color: '#16A34A', flex: 1 },
  testResultFail:   { fontSize: 13, color: RED, flex: 1 },

  // Steps
  stepsCard:        { marginTop: 12, backgroundColor: SURF, borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  stepsTitle:       { fontSize: 14, fontWeight: '700', color: TEXT1, marginBottom: 12 },
  stepRow:          { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  stepNum:          { width: 24, height: 24, borderRadius: 12, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  stepNumText:      { color: '#fff', fontSize: 12, fontWeight: '700' },
  stepText:         { flex: 1, fontSize: 13, color: TEXT2, lineHeight: 20 },

  // Logout
  logoutBtn:        { marginBottom: 12, paddingVertical: 14, borderRadius: 14, backgroundColor: '#FEF2F2', alignItems: 'center' },
  logoutText:       { fontSize: 15, fontWeight: '700', color: RED },
});