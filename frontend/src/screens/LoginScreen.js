import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const { login, register } = useAuth();

  const [activeTab, setActiveTab] = useState('login');
  const [loading, setLoading] = useState(false);

  // Đăng nhập
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);

  // Đăng ký
  const [regUsername, setRegUsername] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail]       = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm]   = useState('');
  const [showRegPass, setShowRegPass] = useState(false);

  // ── ĐĂNG NHẬP ──
  const handleLogin = async () => {
    if (!identifier || !password) {
      return Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin.');
    }
    try {
      setLoading(true);
      await login(identifier, password);
      navigation.replace('Home');
    } catch (err) {
      Alert.alert('Đăng nhập thất bại', err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── ĐĂNG KÍ ──
  const handleRegister = async () => {
    if (!regUsername || !regEmail || !regPassword || !regConfirm) {
      return Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin.');
    }
    if (regPassword !== regConfirm) {
      return Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp.');
    }
    if (regPassword.length < 6) {
      return Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự.');
    }
    try {
      setLoading(true);
      await register(regUsername, regEmail, regPassword, regFullName);
      Alert.alert('Thành công', 'Đăng ký thành công! Vui lòng đăng nhập.', [
        { text: 'OK', onPress: () => setActiveTab('login') },
      ]);
      // Reset form
      setRegUsername(''); setRegFullName(''); setRegEmail('');
      setRegPassword(''); setRegConfirm('');
    } catch (err) {
      Alert.alert('Đăng ký thất bại', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoBox}>
            <Text style={styles.logoEmoji}>🎥</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Chào mừng đến{'\n'}CSP-AI</Text>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {['login', 'register'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={styles.tabBtn}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'login' ? 'Đăng Nhập' : 'Đăng Kí'}
              </Text>
              {activeTab === tab && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── ĐĂNG NHẬP ── */}
        {activeTab === 'login' && (
          <View style={styles.form}>
            <Text style={styles.label}>Email / Tên người dùng</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập email hoặc tên người dùng"
              placeholderTextColor="#B0B8C1"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.label}>Mật khẩu</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.inputFlex}
                placeholder="Nhập mật khẩu"
                placeholderTextColor="#B0B8C1"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(!showPass)}>
                <Text style={styles.eyeIcon}>{showPass ? '👁️' : '🙈'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>Đăng nhập</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotWrap}>
              <Text style={styles.forgotText}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Hoặc</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity onPress={() => setActiveTab('register')}>
              <Text style={styles.createAccountText}>Tạo tài khoản mới</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── ĐĂNG KÍ ── */}
        {activeTab === 'register' && (
          <View style={styles.form}>
            <Text style={styles.label}>Tên người dùng *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập username"
              placeholderTextColor="#B0B8C1"
              value={regUsername}
              onChangeText={setRegUsername}
              autoCapitalize="none"
            />

            <Text style={styles.label}>Họ và tên</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập họ tên đầy đủ (tuỳ chọn)"
              placeholderTextColor="#B0B8C1"
              value={regFullName}
              onChangeText={setRegFullName}
            />

            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập địa chỉ email"
              placeholderTextColor="#B0B8C1"
              value={regEmail}
              onChangeText={setRegEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.label}>Mật khẩu *</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.inputFlex}
                placeholder="Tạo mật khẩu (ít nhất 6 ký tự)"
                placeholderTextColor="#B0B8C1"
                value={regPassword}
                onChangeText={setRegPassword}
                secureTextEntry={!showRegPass}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowRegPass(!showRegPass)}>
                <Text style={styles.eyeIcon}>{showRegPass ? '👁️' : '🙈'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Xác nhận mật khẩu *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập lại mật khẩu"
              placeholderTextColor="#B0B8C1"
              value={regConfirm}
              onChangeText={setRegConfirm}
              secureTextEntry
            />

            <TouchableOpacity style={styles.primaryBtn} onPress={handleRegister} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>Đăng kí</Text>
              }
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Hoặc</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity onPress={() => setActiveTab('login')}>
              <Text style={styles.createAccountText}>Đã có tài khoản? Đăng nhập</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const TEAL = '#2E7D8C';

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#FFFFFF' },
  inner:      { flex: 1, paddingHorizontal: 28, paddingTop: 32 },

  logoWrap:   { alignItems: 'center', marginBottom: 20 },
  logoBox: {
    width: 72, height: 72, borderRadius: 18,
    backgroundColor: '#E8F4F6', justifyContent: 'center',
    alignItems: 'center', borderWidth: 1, borderColor: '#C8E6EA',
  },
  logoEmoji:  { fontSize: 36 },

  title: {
    fontSize: 24, fontWeight: '700', color: '#1A1A2E',
    textAlign: 'center', lineHeight: 32, marginBottom: 24,
  },

  tabRow: {
    flexDirection: 'row', marginBottom: 24,
    borderBottomWidth: 1, borderBottomColor: '#E8ECF0',
  },
  tabBtn:         { flex: 1, alignItems: 'center', paddingBottom: 12 },
  tabText:        { fontSize: 15, fontWeight: '500', color: '#A0AEC0' },
  tabTextActive:  { color: TEAL, fontWeight: '700' },
  tabUnderline: {
    position: 'absolute', bottom: -1,
    left: '20%', right: '20%', height: 2,
    backgroundColor: TEAL, borderRadius: 2,
  },

  form:  { flex: 1 },
  label: { fontSize: 13, fontWeight: '500', color: '#4A5568', marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1, borderColor: '#DDE3EA', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 14,
    color: '#1A1A2E', backgroundColor: '#FAFBFC', marginBottom: 14,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#DDE3EA', borderRadius: 10,
    backgroundColor: '#FAFBFC', marginBottom: 14,
  },
  inputFlex:  { flex: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: '#1A1A2E' },
  eyeBtn:     { paddingHorizontal: 12, paddingVertical: 10 },
  eyeIcon:    { fontSize: 18 },

  primaryBtn: {
    backgroundColor: TEAL, borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginTop: 6, marginBottom: 4,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  forgotWrap: { alignItems: 'flex-end', marginTop: 10, marginBottom: 6 },
  forgotText: { color: TEAL, fontSize: 13 },

  dividerRow:  { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E8ECF0' },
  dividerText: { marginHorizontal: 12, color: '#A0AEC0', fontSize: 13 },

  createAccountText: { textAlign: 'center', color: TEAL, fontSize: 14, fontWeight: '600' },
});