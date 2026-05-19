import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { authAPI } from "../services/api";

const TEAL = "#2E7D8C";
const BG = "#F0F4F8";
const SURF = "#FFFFFF";
const TEXT1 = "#0F172A";
const TEXT2 = "#475569";
const TEXT3 = "#94A3B8";
const BORDER = "#E2E8F0";

const createShadow = (y, blur, opacity, elevation) =>
  Platform.OS === "web"
    ? { boxShadow: `0px ${y}px ${blur * 2}px rgba(0, 0, 0, ${opacity})` }
    : {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: y },
        shadowOpacity: opacity,
        shadowRadius: blur,
        elevation,
      };

const Field = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  onToggle,
}) => (
  <View style={styles.fieldWrap}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.inputRow}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={TEXT3}
        secureTextEntry={secureTextEntry}
        autoCapitalize="none"
      />
      {onToggle ? (
        <TouchableOpacity style={styles.eyeBtn} onPress={onToggle}>
          <Text style={styles.eyeText}>{secureTextEntry ? "👁" : "🙈"}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  </View>
);

export default function ChangePasswordScreen({ navigation }) {
  const { logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmedCurrent = currentPassword.trim();
    const trimmedNew = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedCurrent || !trimmedNew || !trimmedConfirm) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    if (trimmedNew.length < 6) {
      Alert.alert("Lỗi", "Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    if (trimmedNew !== trimmedConfirm) {
      Alert.alert("Lỗi", "Mật khẩu mới xác nhận không khớp.");
      return;
    }

    try {
      setSaving(true);
      await authAPI.changePassword(trimmedCurrent, trimmedNew);
      Alert.alert("Thành công", "Đã đổi mật khẩu. Vui lòng đăng nhập lại.", [
        {
          text: "OK",
          onPress: async () => {
            await logout();
            navigation.reset({ index: 0, routes: [{ name: "Login" }] });
          },
        },
      ]);
    } catch (error) {
      Alert.alert("Không thể đổi mật khẩu", error.message || "Đã xảy ra lỗi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Text style={styles.backText}>{"‹"}</Text>
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>{"Đổi mật khẩu"}</Text>
            <Text style={styles.headerSubtitle}>
              {"Cập nhật mật khẩu đăng nhập của bạn"}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.card}>
            <Field
              label="Mật khẩu hiện tại"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Nhập mật khẩu hiện tại"
              secureTextEntry={!showCurrent}
              onToggle={() => setShowCurrent((prev) => !prev)}
            />

            <Field
              label="Mật khẩu mới"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Nhập mật khẩu mới"
              secureTextEntry={!showNew}
              onToggle={() => setShowNew((prev) => !prev)}
            />

            <Field
              label="Xác nhận mật khẩu mới"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Nhập lại mật khẩu mới"
              secureTextEntry={!showConfirm}
              onToggle={() => setShowConfirm((prev) => !prev)}
            />

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>{"Lưu thay đổi"}</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.noteCard}>
            <Text style={styles.noteTitle}>{"Lưu ý"}</Text>
            <Text style={styles.noteText}>
              {
                "Sau khi đổi mật khẩu, app sẽ đăng xuất để bạn đăng nhập lại với mật khẩu mới."
              }
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SURF,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  backText: {
    fontSize: 26,
    lineHeight: 26,
    color: TEXT1,
    marginTop: -2,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: TEXT1,
  },
  headerSubtitle: {
    fontSize: 13,
    color: TEXT2,
    marginTop: 2,
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  card: {
    backgroundColor: SURF,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    ...createShadow(2, 10, 0.05, 2),
  },
  fieldWrap: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: TEXT2,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: TEXT1,
    backgroundColor: "#FAFBFC",
  },
  eyeBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: "#FAFBFC",
  },
  eyeText: {
    fontSize: 18,
  },
  saveBtn: {
    marginTop: 6,
    backgroundColor: TEAL,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  noteCard: {
    marginTop: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#E8F4F6",
    borderWidth: 1,
    borderColor: "#CDE7EA",
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: TEXT1,
    marginBottom: 6,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 19,
    color: TEXT2,
  },
});
