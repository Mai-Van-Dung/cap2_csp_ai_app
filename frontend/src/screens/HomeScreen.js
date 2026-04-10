import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
  Alert,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import { alertsAPI } from "../services/api";
import {
  getCameraBaseCandidates,
  getSocketBaseCandidates,
  getViewerUrl,
} from "../config/endpoints";
import BottomNav from "../components/BottomNav";

const TEAL = "#2E7D8C";
const BG = "#F5F6F8";
const SURF = "#FFFFFF";
const TEXT1 = "#0F172A";
const TEXT2 = "#475569";
const TEXT3 = "#94A3B8";
const BORDER = "#E5E7EB";
const ALERT_MESSAGE = "PHAT HIEN TRE EM XAM NHAP!";
const ALERT_BUTTON_IDLE = "#16A34A";
const ALERT_BUTTON_ACTIVE = "#DC2626";

// ── Mock alerts gần đây ───────────────────────────────────
const MOCK_ALERTS = [
  { id: 1, time: "09:10", thumb: null, label: "Cura..." },
  { id: 2, time: "08:55", thumb: null, label: "Phát hiện" },
  { id: 3, time: "08:30", thumb: null, label: "Chuyển động" },
];

// ── Control button (âm thanh, mic, chụp, quay) ───────────
const ControlBtn = ({ icon, onPress }) => (
  <TouchableOpacity
    style={styles.controlBtn}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={styles.controlIcon}>{icon}</Text>
  </TouchableOpacity>
);

// ── Shortcut button (Song / Lịch sử / Cài đặt) ───────────
const ShortcutBtn = ({ icon, label, onPress }) => (
  <TouchableOpacity
    style={styles.shortcutBtn}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={styles.shortcutIcon}>{icon}</Text>
    <Text style={styles.shortcutLabel}>{label}</Text>
  </TouchableOpacity>
);

// ── Alert thumbnail ───────────────────────────────────────
const formatAlertTime = (isoString) => {
  if (!isoString) return "--:--";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const AlertThumb = ({ item, onPress }) => (
  <TouchableOpacity
    style={styles.alertThumb}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={styles.alertThumbImg}>
      {item.image_url ? (
        <Image
          source={{ uri: item.image_url }}
          style={styles.alertThumbPhoto}
        />
      ) : null}
      <Text style={styles.alertThumbTime}>{item.time}</Text>
    </View>
    <Text style={styles.alertThumbLabel} numberOfLines={1}>
      {item.label}
    </Text>
  </TouchableOpacity>
);

// ── Main Screen ───────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [cameraBaseUrl, setCameraBaseUrl] = useState(null);
  const [cameraLoading, setCameraLoading] = useState(true);
  const [cameraError, setCameraError] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [hasActiveAlarm, setHasActiveAlarm] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState(MOCK_ALERTS);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimerRef = useRef(null);

  const cameraCandidates = useMemo(() => {
    return getCameraBaseCandidates();
  }, []);

  const socketOptions = useMemo(() => {
    if (Platform.OS === "web") {
      return {
        transports: ["polling"],
        upgrade: false,
        timeout: 4000,
        reconnection: false,
        forceNew: false,
      };
    }

    return {
      transports: ["websocket"],
      timeout: 4000,
      reconnection: false,
      forceNew: false,
    };
  }, []);

  const socketCandidates = useMemo(() => {
    return getSocketBaseCandidates();
  }, [cameraBaseUrl]);

  const showIntrusionToast = useCallback(() => {
    setHasActiveAlarm(true);
    setToastVisible(true);
    toastAnim.stopAnimation();
    toastAnim.setValue(0);

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }

    Animated.timing(toastAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();

    toastTimerRef.current = setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setToastVisible(false);
      });
      toastTimerRef.current = null;
    }, 2400);
  }, [toastAnim]);

  const fetchRecentAlerts = useCallback(async () => {
    if (!user) {
      setRecentAlerts(MOCK_ALERTS);
      return;
    }

    try {
      const res = await alertsAPI.getAll();
      const mapped = (res?.data || []).slice(0, 8).map((item) => ({
        id: item.id,
        time: formatAlertTime(item.created_at),
        image_url: item.image_url || null,
        label: item.object_type || "Phát hiện",
      }));
      setRecentAlerts(mapped.length > 0 ? mapped : MOCK_ALERTS);
    } catch (error) {
      // Keep existing data to avoid flicker when API is temporarily unavailable.
    }
  }, [user]);

  useEffect(() => {
    const probeCamera = async () => {
      setCameraLoading(true);
      setCameraError("");

      for (const baseUrl of cameraCandidates) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 3500);

          const res = await fetch(`${baseUrl}/viewer/camera`, {
            method: "GET",
            signal: controller.signal,
          });
          clearTimeout(timer);

          if (res.ok) {
            setCameraBaseUrl(baseUrl);
            setCameraLoading(false);
            return;
          }
        } catch (error) {
          // Keep probing next host
        }
      }

      setCameraError(
        "Không kết nối được camera server (Flask) trên cổng đã cấu hình.",
      );
      setCameraLoading(false);
    };

    probeCamera();
  }, [cameraCandidates]);

  useEffect(() => {
    fetchRecentAlerts();
  }, [fetchRecentAlerts]);

  useEffect(() => {
    if (cameraLoading) return;

    let mounted = true;
    let activeSocket = null;
    let connectTimer = null;
    let connectResolver = null;
    let retryTimer = null;
    let cancelled = false;

    const connectSocket = async () => {
      for (const baseUrl of socketCandidates) {
        if (!mounted || cancelled) return;

        const socket = io(baseUrl, socketOptions);

        const connected = await new Promise((resolve) => {
          let done = false;
          connectResolver = resolve;

          const finish = (ok) => {
            if (done) return;
            done = true;
            resolve(ok);
          };

          connectTimer = setTimeout(() => finish(false), 3500);
          socket.once("connect", () => finish(true));
          socket.once("connect_error", () => finish(false));
        });

        if (connectTimer) {
          clearTimeout(connectTimer);
          connectTimer = null;
        }
        connectResolver = null;

        if (!connected || cancelled || !mounted) {
          socket.removeAllListeners();
          socket.disconnect();
          continue;
        }

        activeSocket = socket;
        socket.on("new_alert", () => {
          showIntrusionToast();
          fetchRecentAlerts();
        });
        return;
      }

      if (!cancelled && mounted) {
        // Retry quietly instead of forcing aggressive reconnect attempts.
        retryTimer = setTimeout(connectSocket, 10000);
      }
    };

    connectSocket();

    return () => {
      mounted = false;
      cancelled = true;
      if (connectTimer) {
        clearTimeout(connectTimer);
        connectTimer = null;
      }
      if (connectResolver) {
        connectResolver(false);
        connectResolver = null;
      }
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      if (activeSocket) {
        activeSocket.off("new_alert");
        activeSocket.disconnect();
      }
    };
  }, [
    cameraLoading,
    fetchRecentAlerts,
    showIntrusionToast,
    socketCandidates,
    socketOptions,
  ]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
      toastAnim.stopAnimation();
    };
  }, [toastAnim]);

  const viewerUrl = cameraBaseUrl
    ? getViewerUrl(cameraBaseUrl, "Camera chinh")
    : null;

  const requireAuth = (action) => {
    if (!user) navigation.navigate("Login");
    else action?.();
  };

  const handleLogout = async () => {
    setShowMenu(false);
    try {
      await logout();
      navigation.navigate("Login");
      Alert.alert("✓", "Đã đăng xuất");
    } catch (error) {
      Alert.alert("Lỗi", "Lỗi đăng xuất: " + error.message);
    }
  };

  const initial = user
    ? (
        user.full_name?.charAt(0) ||
        user.username?.charAt(0) ||
        "U"
      ).toUpperCase()
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={SURF} />

      {toastVisible && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.alertToast,
            {
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-18, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.alertToastText}>{ALERT_MESSAGE}</Text>
        </Animated.View>
      )}

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
              Chào{" "}
              <Text style={styles.greetName}>
                {user.full_name || user.username}!
              </Text>
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={styles.loginBtnText}>Đăng nhập</Text>
          </TouchableOpacity>
        )}

        {/* Dropdown */}
        <Modal
          transparent
          animationType="fade"
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
                  {user?.full_name || user?.username}
                </Text>
                <Text style={styles.dropdownUserEmail}>{user?.email}</Text>
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
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── CAMERA FEED ────────────────────────────────── */}
        <View style={styles.cameraCard}>
          {/* Live badge */}
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>

          {/* Feed area */}
          <View style={styles.cameraFeed}>
            {viewerUrl ? (
              <WebView
                source={{ uri: viewerUrl }}
                style={styles.webview}
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                domStorageEnabled
                startInLoadingState
                originWhitelist={["*"]}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.cameraEmptyState}>
                <Text style={styles.cameraStateText}>
                  {cameraLoading
                    ? "Đang kết nối camera server..."
                    : cameraError}
                </Text>
                {!cameraLoading && (
                  <Text style={styles.cameraStateHint}>
                    Kiểm tra Flask app đang chạy và mở route /viewer/camera ở
                    cổng đã cấu hình.
                  </Text>
                )}
              </View>
            )}
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
          <ShortcutBtn
            icon="🎵"
            label="SONG"
            onPress={() => requireAuth(() => {})}
          />
          <ShortcutBtn
            icon="📅"
            label="LỊCH SỬ"
            onPress={() => requireAuth(() => navigation.navigate("Alerts"))}
          />
          <ShortcutBtn
            icon="⚙️"
            label="CÀI ĐẶT"
            onPress={() => requireAuth(() => navigation.navigate("Profile"))}
          />
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
                { label: "Tam", icon: "🌤", temp: "29°C", day: "Mây" },
                { label: "Tham", icon: "🌧", temp: "26°C", day: "Mưa" },
                { label: "Ngay", icon: "☀️", temp: "30°C", day: "Nắng" },
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
            <Text style={styles.cardSectionTitle}>
              SU KIỆN CẢNH BÁO GÀN ĐÂY
            </Text>
            <TouchableOpacity
              onPress={() => requireAuth(() => navigation.navigate("Alerts"))}
            >
              <Text style={styles.seeAll}>Xem tất cả →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.alertsScroll}
          >
            {recentAlerts.map((item) => (
              <AlertThumb
                key={item.id}
                item={item}
                onPress={() => requireAuth(() => navigation.navigate("Alerts"))}
              />
            ))}
          </ScrollView>
        </View>

        {/* Padding cuối */}
        <View style={{ height: 88 }} />
      </ScrollView>

      <TouchableOpacity
        activeOpacity={0.88}
        style={[
          styles.alertStatusBtn,
          {
            backgroundColor: hasActiveAlarm
              ? ALERT_BUTTON_ACTIVE
              : ALERT_BUTTON_IDLE,
          },
        ]}
        onPress={() =>
          requireAuth(() => {
            setHasActiveAlarm(false);
            navigation.navigate("Alerts");
          })
        }
      >
        <Text style={styles.alertStatusBtnText}>
          {hasActiveAlarm ? "CANH BAO DANG KICH HOAT" : "HE THONG AN TOAN"}
        </Text>
      </TouchableOpacity>

      {/* ── BOTTOM NAV ─────────────────────────────────── */}
      <BottomNav
        navigation={navigation}
        activeTab="Home"
        requireAuth={requireAuth}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scroll: { paddingBottom: 12 },
  alertToast: {
    position: "absolute",
    top: 10,
    right: 12,
    zIndex: 2000,
    backgroundColor: "#D32F2F",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: "88%",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  alertToastText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  // Header
  header: {
    backgroundColor: SURF,
    alignItems: "center",
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    gap: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: TEXT1,
    letterSpacing: 1,
  },
  userRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatarSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E53935",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarSmallText: { color: "#FFF", fontWeight: "800", fontSize: 14 },
  greetText: { fontSize: 14, color: TEXT2 },
  greetName: { fontWeight: "700", color: TEXT1 },
  loginBtn: {
    backgroundColor: TEAL,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  loginBtnText: { color: "#FFF", fontSize: 13, fontWeight: "700" },

  // Camera card
  cameraCard: {
    backgroundColor: "#1A2A3A",
    margin: 16,
    marginBottom: 0,
    borderRadius: 20,
    overflow: "hidden",
  },
  liveBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E53935",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
    zIndex: 10,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFF" },
  liveText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 1,
  },
  cameraFeed: {
    height: 220,
    backgroundColor: "#243447",
  },
  webview: {
    flex: 1,
    backgroundColor: "#243447",
  },
  cameraEmptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 8,
  },
  cameraStateText: {
    color: "#E2E8F0",
    fontSize: 13,
    textAlign: "center",
  },
  cameraStateHint: {
    color: "rgba(226,232,240,0.75)",
    fontSize: 12,
    textAlign: "center",
  },
  controlRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    paddingVertical: 14,
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  controlIcon: { fontSize: 20 },

  // Shortcuts
  shortcutRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 0,
    gap: 12,
  },
  shortcutBtn: {
    flex: 1,
    backgroundColor: SURF,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  shortcutIcon: { fontSize: 22 },
  shortcutLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: TEXT2,
    letterSpacing: 0.5,
  },

  // Card
  card: {
    backgroundColor: SURF,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: TEXT1,
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  seeAll: { fontSize: 12, color: TEAL, fontWeight: "600" },

  // Weather
  weatherMain: { flexDirection: "row", gap: 12 },
  weatherLeft: { flex: 1 },
  weatherCity: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT1,
    marginBottom: 8,
  },
  weatherTempRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  weatherIcon: { fontSize: 36 },
  weatherTemp: { fontSize: 22, fontWeight: "800", color: TEXT1 },
  weatherDesc: { fontSize: 12, color: TEXT2, marginTop: 2 },
  weatherForecast: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
  forecastItem: { alignItems: "center", gap: 3 },
  forecastDay: { fontSize: 11, fontWeight: "600", color: TEXT3 },
  forecastIcon: { fontSize: 18 },
  forecastDesc: { fontSize: 10, color: TEXT2 },
  forecastTemp: { fontSize: 12, fontWeight: "700", color: TEXT1 },

  // Alert thumbs
  alertsScroll: { marginHorizontal: -4 },
  alertThumb: { width: 100, marginHorizontal: 4 },
  alertThumbImg: {
    position: "relative",
    height: 70,
    backgroundColor: "#E8ECF0",
    borderRadius: 10,
    justifyContent: "flex-end",
    alignItems: "flex-start",
    padding: 6,
    marginBottom: 4,
    overflow: "hidden",
  },
  alertThumbPhoto: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  alertThumbTime: {
    fontSize: 11,
    fontWeight: "700",
    color: TEXT1,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  alertThumbLabel: { fontSize: 11, color: TEXT2, fontWeight: "500" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-start",
    paddingTop: 80,
    paddingHorizontal: 16,
  },
  dropdownMenu: {
    backgroundColor: SURF,
    borderRadius: 14,
    marginLeft: "auto",
    minWidth: 210,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
  },
  dropdownUser: { paddingHorizontal: 16, paddingVertical: 16 },
  dropdownUserName: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT1,
    marginBottom: 3,
  },
  dropdownUserEmail: { fontSize: 13, color: TEXT2 },
  dropdownDivider: { height: 1, backgroundColor: BORDER },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 13 },
  dropdownItemText: { fontSize: 14, color: "#E74C3C", fontWeight: "600" },
  alertStatusBtn: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  alertStatusBtnText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
