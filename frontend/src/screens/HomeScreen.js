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
  StatusBar,
  Modal,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import { alertsAPI } from "../services/api";
import {
  getCameraBaseCandidates,
  getSocketBaseCandidates,
  getSocketPath,
  getViewerUrl,
  refreshConnectionInfo,
} from "../config/endpoints";
import BottomNav from "../components/BottomNav";

// ── Màu sắc ───────────────────────────────────────────────
const TEAL = "#2E7D8C";
const BG = "#F0F4F8";
const SURF = "#FFFFFF";
const TEXT1 = "#0F172A";
const TEXT2 = "#475569";
const TEXT3 = "#94A3B8";
const BORDER = "#E2E8F0";
const ALERT_MESSAGE = "PHÁT HIỆN XÂM NHẬP!";
const ALERT_BUTTON_IDLE = "#16A34A";
const ALERT_BUTTON_ACTIVE = "#DC2626";
const CAMERA_RETRY_INTERVAL_MS = 10000;

const buildViewerUrl = (baseUrl) => getViewerUrl(baseUrl, "Camera chinh");
const buildVideoFeedUrl = (baseUrl) =>
  `${String(baseUrl || "").replace(/\/+$/, "")}/video_feed`;

// ── Mock alerts ───────────────────────────────────────────
const MOCK_ALERTS = [
  { id: 1, time: "09:10", image_url: null, label: "Phát hiện" },
  { id: 2, time: "08:55", image_url: null, label: "Chuyển động" },
  { id: 3, time: "08:30", image_url: null, label: "Xâm nhập" },
];

// ── Helpers ───────────────────────────────────────────────
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

// ── Weather helpers ───────────────────────────────────────
const getWeatherDesc = (code) => {
  if (code === 0) return "Trời quang";
  if (code <= 2) return "Ít mây";
  if (code === 3) return "Nhiều mây";
  if (code <= 49) return "Sương mù";
  if (code <= 59) return "Mưa phùn";
  if (code <= 69) return "Mưa";
  if (code <= 79) return "Tuyết";
  if (code <= 84) return "Mưa rào";
  if (code <= 99) return "Dông bão";
  return "Không rõ";
};

const getWeatherSymbol = (code, isDay) => {
  if (code === 0) return isDay ? "☀" : "☾";
  if (code <= 2) return isDay ? "⛅" : "☁";
  if (code === 3) return "☁";
  if (code <= 49) return "≋";
  if (code <= 69) return "⛆";
  if (code <= 79) return "❄";
  if (code <= 84) return "⛆";
  return "⚡";
};

// ── Alert Thumbnail ───────────────────────────────────────
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
      <View style={styles.alertThumbTimeBox}>
        <Text style={styles.alertThumbTime}>{item.time}</Text>
      </View>
    </View>
    <Text style={styles.alertThumbLabel} numberOfLines={1}>
      {item.label}
    </Text>
  </TouchableOpacity>
);

// ── Weather Card Component ────────────────────────────────
const WeatherCard = () => {
  const [weather, setWeather] = useState(null);
  const [cityName, setCityName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchWeather = async (lat, lon) => {
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=vi`,
          { headers: { "User-Agent": "CapstoneApp/1.0" } },
        );
        const geoData = await geoRes.json();
        const city =
          geoData?.address?.city ||
          geoData?.address?.town ||
          geoData?.address?.village ||
          geoData?.address?.county ||
          "Vị trí của bạn";

        const wRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
            `&current=temperature_2m,weathercode,is_day,windspeed_10m,relativehumidity_2m` +
            `&daily=weathercode,temperature_2m_max,temperature_2m_min` +
            `&timezone=auto&forecast_days=4`,
        );
        const wData = await wRes.json();

        if (!cancelled) {
          setCityName(city);
          setWeather(wData);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    };

    const getLocationAndFetch = async () => {
      try {
        // Thử expo-location trước
        const Location = require("expo-location");
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") {
          // Quyền bị từ chối → thử IP geolocation thay vì fallback cứng
          await fetchByIP();
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
        });

        await fetchWeather(loc.coords.latitude, loc.coords.longitude);
      } catch (e) {
        // expo-location lỗi → thử IP geolocation
        await fetchByIP();
      }
    };

    const fetchByIP = async () => {
      try {
        // ip-api.com miễn phí, trả về vị trí theo IP
        const res = await fetch(
          "http://ip-api.com/json/?fields=lat,lon,city&lang=vi",
        );
        const data = await res.json();
        if (data?.lat && data?.lon) {
          await fetchWeather(data.lat, data.lon);
        } else {
          // Fallback cuối cùng mới dùng toạ độ cứng
          await fetchWeather(16.0544, 108.2022); // Đà Nẵng
        }
      } catch {
        await fetchWeather(16.0544, 108.2022); // Đà Nẵng
      }
    };

    if (Platform.OS === "web") {
      if (!navigator?.geolocation) {
        fetchByIP();
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => fetchByIP(), // từ chối → thử IP
        { timeout: 8000, enableHighAccuracy: false },
      );
    } else {
      getLocationAndFetch();
    }

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardSectionTitle}>{"DỰ BÁO THỜI TIẾT"}</Text>
        <View style={styles.weatherLoading}>
          <ActivityIndicator size="small" color={TEAL} />
          <Text style={styles.weatherLoadingText}>{"Đang lấy vị trí..."}</Text>
        </View>
      </View>
    );
  }

  if (error || !weather) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardSectionTitle}>{"DỰ BÁO THỜI TIẾT"}</Text>
        <Text style={styles.weatherError}>
          {"Không lấy được dữ liệu thời tiết"}
        </Text>
      </View>
    );
  }

  const cur = weather.current;
  const daily = weather.daily;
  const isDay = cur.is_day === 1;
  const symbol = getWeatherSymbol(cur.weathercode, isDay);
  const desc = getWeatherDesc(cur.weathercode);
  const temp = Math.round(cur.temperature_2m);
  const humid = cur.relativehumidity_2m;
  const wind = Math.round(cur.windspeed_10m);

  const dayLabels = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const forecastDays = daily.time.slice(1, 4).map((t, i) => ({
    label: dayLabels[new Date(t).getDay()],
    code: daily.weathercode[i + 1],
    max: Math.round(daily.temperature_2m_max[i + 1]),
    min: Math.round(daily.temperature_2m_min[i + 1]),
  }));

  return (
    <View style={styles.card}>
      <Text style={styles.cardSectionTitle}>{"DỰ BÁO THỜI TIẾT"}</Text>
      <View style={styles.weatherMain}>
        {/* Bên trái — thời tiết hiện tại */}
        <View style={styles.weatherLeft}>
          <Text style={styles.weatherCity}>{cityName}</Text>
          <View style={styles.weatherTempRow}>
            <Text style={styles.weatherSymbol}>{symbol}</Text>
            <View>
              <Text style={styles.weatherTemp}>{`${temp}°C`}</Text>
              <Text style={styles.weatherDesc}>{desc}</Text>
            </View>
          </View>
          <View style={styles.weatherMetaRow}>
            <Text style={styles.weatherMeta}>{`Ẩm ${humid}%`}</Text>
            <View style={styles.weatherMetaDot} />
            <Text style={styles.weatherMeta}>{`Gió ${wind} km/h`}</Text>
          </View>
        </View>

        {/* Bên phải — dự báo 3 ngày */}
        <View style={styles.weatherForecast}>
          {forecastDays.map((d, i) => (
            <View key={i} style={styles.forecastItem}>
              <Text style={styles.forecastDay}>{d.label}</Text>
              <Text style={styles.forecastSymbol}>
                {getWeatherSymbol(d.code, true)}
              </Text>
              <Text style={styles.forecastMax}>{`${d.max}°`}</Text>
              <Text style={styles.forecastMin}>{`${d.min}°`}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

// ── Main Screen ───────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [cameraBaseUrl, setCameraBaseUrl] = useState(null);
  const [cameraStreamMode, setCameraStreamMode] = useState("viewer");
  const [cameraLoading, setCameraLoading] = useState(true);
  const [cameraError, setCameraError] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [hasActiveAlarm, setHasActiveAlarm] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState(MOCK_ALERTS);
  const [discoveryVersion, setDiscoveryVersion] = useState(0);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimerRef = useRef(null);

  const cameraCandidates = useMemo(
    () => getCameraBaseCandidates(),
    [discoveryVersion],
  );
  const socketOptions = useMemo(() => {
    const socketPath = getSocketPath();
    if (Platform.OS === "web") {
      return {
        transports: ["polling"],
        upgrade: false,
        timeout: 4000,
        reconnection: false,
        forceNew: false,
        path: socketPath,
      };
    }
    return {
      transports: ["websocket"],
      timeout: 4000,
      reconnection: false,
      forceNew: false,
      path: socketPath,
    };
  }, []);
  const socketCandidates = useMemo(() => {
    const fallbackCandidates = getSocketBaseCandidates();
    if (!cameraBaseUrl) return fallbackCandidates;

    return [
      cameraBaseUrl,
      ...fallbackCandidates.filter((candidate) => candidate !== cameraBaseUrl),
    ];
  }, [cameraBaseUrl, discoveryVersion]);

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
    } catch {}
  }, [user]);

  useEffect(() => {
    let mounted = true;
    refreshConnectionInfo({ force: true }).finally(() => {
      if (mounted) {
        setDiscoveryVersion((value) => value + 1);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    let retryTimer = null;
    let probing = false;

    const scheduleRetry = () => {
      if (!mounted) return;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        probeCamera();
      }, CAMERA_RETRY_INTERVAL_MS);
    };

    const probeCamera = async () => {
      if (!mounted || probing || cameraBaseUrl) return;
      probing = true;
      setCameraLoading(true);
      setCameraError("");

      for (const baseUrl of cameraCandidates) {
        try {
          const probeUrls = [
            `${baseUrl}/status`,
            buildViewerUrl(baseUrl),
            buildVideoFeedUrl(baseUrl),
          ];

          let baseReachable = false;
          for (const probeUrl of probeUrls) {
            console.log(`[Camera Probe] Trying ${probeUrl}`);
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 2200);
            try {
              const res = await fetch(probeUrl, {
                method: "GET",
                signal: controller.signal,
              });
              if (res.ok) {
                baseReachable = true;
                break;
              }
              console.log(
                `[Camera Probe] ${probeUrl} returned status ${res.status}`,
              );
            } finally {
              clearTimeout(timer);
            }
          }

          if (!baseReachable) {
            continue;
          }

          console.log(`[Camera Probe] Connected using ${baseUrl}`);
          if (!mounted) return;
          setCameraBaseUrl(baseUrl);
          setCameraStreamMode("viewer");
          setCameraError("");
          setCameraLoading(false);
          probing = false;
          return;
        } catch (error) {
          console.log(
            `[Camera Probe] Failed ${baseUrl}: ${error?.message || "Unknown error"}`,
          );
        }
      }

      if (mounted) {
        console.log(
          `[Camera Probe] No candidate connected, retrying in ${CAMERA_RETRY_INTERVAL_MS / 1000}s`,
        );
        setCameraError("Không kết nối được camera server. Đang tự thử lại...");
        setCameraLoading(false);
        probing = false;
        scheduleRetry();
      }
    };

    probeCamera();

    return () => {
      mounted = false;
      probing = false;
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
    };
  }, [cameraBaseUrl, cameraCandidates]);

  useEffect(() => {
    fetchRecentAlerts();
  }, [fetchRecentAlerts]);

  const handleCameraWebViewFail = useCallback(async () => {
    if (!cameraBaseUrl) return;

    if (cameraStreamMode === "viewer") {
      console.log("[Camera] viewer failed, switching to /video_feed fallback");
      setCameraStreamMode("video_feed");
      setCameraLoading(false);
      return;
    }

    console.log(
      "[Camera] all stream modes failed on current base, reprobe next base",
    );
    setCameraError("Mất kết nối camera, đang chuyển sang địa chỉ khác...");
    setCameraBaseUrl(null);
    setCameraStreamMode("viewer");
    setCameraLoading(true);
    await refreshConnectionInfo({ force: true });
    setDiscoveryVersion((value) => value + 1);
  }, [cameraBaseUrl, cameraStreamMode]);

  useEffect(() => {
    if (cameraLoading) return;
    let mounted = true,
      activeSocket = null,
      connectTimer = null,
      connectResolver = null,
      retryTimer = null,
      cancelled = false;

    const connectSocket = async () => {
      for (const baseUrl of socketCandidates) {
        if (!mounted || cancelled) return;
        console.log(`[Socket] Trying ${baseUrl}`);
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
          socket.once("connect_error", (error) => {
            console.log(
              `[Socket] connect_error on ${baseUrl}: ${error?.message || "Unknown error"}`,
            );
            finish(false);
          });
        });
        if (connectTimer) {
          clearTimeout(connectTimer);
          connectTimer = null;
        }
        connectResolver = null;
        if (!connected || cancelled || !mounted) {
          console.log(`[Socket] Failed ${baseUrl}, trying next candidate`);
          socket.removeAllListeners();
          socket.disconnect();
          continue;
        }
        activeSocket = socket;
        console.log(`[Socket] Connected ${baseUrl}`);
        socket.on("new_alert", (payload) => {
          console.log("[Socket] Received new_alert", payload);
          showIntrusionToast();
          fetchRecentAlerts();
        });
        return;
      }
      if (!cancelled && mounted) {
        console.log("[Socket] No candidate connected, retrying in 10s");
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
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastAnim.stopAnimation();
    };
  }, [toastAnim]);

  const viewerUrl = cameraBaseUrl
    ? cameraStreamMode === "viewer"
      ? buildViewerUrl(cameraBaseUrl)
      : buildVideoFeedUrl(cameraBaseUrl)
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
    } catch (err) {
      Alert.alert("Lỗi", "Lỗi đăng xuất: " + err.message);
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
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Toast cảnh báo */}
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
        <View>
          <Text style={styles.headerTitle}>{"CAMERA TRỰC TIẾP"}</Text>
          <Text style={styles.headerSub}>{"Hệ thống giám sát"}</Text>
        </View>
        {user ? (
          <TouchableOpacity
            style={styles.userRow}
            onPress={() => setShowMenu(true)}
            activeOpacity={0.8}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial ?? "U"}</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={styles.loginBtnText}>{"Đăng nhập"}</Text>
          </TouchableOpacity>
        )}

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
                <View style={styles.dropdownAvatar}>
                  <Text style={styles.dropdownAvatarText}>
                    {initial ?? "U"}
                  </Text>
                </View>
                <View>
                  <Text style={styles.dropdownUserName}>
                    {user?.full_name || user?.username || ""}
                  </Text>
                  <Text style={styles.dropdownUserEmail}>
                    {user?.email || ""}
                  </Text>
                </View>
              </View>
              <View style={styles.dropdownDivider} />
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={handleLogout}
              >
                <Text style={styles.dropdownItemText}>{"Đăng xuất"}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── CAMERA FEED ─────────────────────────────── */}
        <View style={styles.cameraCard}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>{"LIVE"}</Text>
          </View>
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
                onLoadEnd={() => setCameraLoading(false)}
                onError={handleCameraWebViewFail}
                onHttpError={handleCameraWebViewFail}
              />
            ) : (
              <View style={styles.cameraEmptyState}>
                <Text style={styles.cameraStateText}>
                  {cameraLoading ? "Đang kết nối camera..." : cameraError}
                </Text>
                {!cameraLoading && (
                  <Text style={styles.cameraStateHint}>
                    {"Kiểm tra Flask server đang chạy đúng cổng."}
                  </Text>
                )}
              </View>
            )}
          </View>
          {/* Thanh thông tin phía dưới camera */}
          <View style={styles.cameraFooter}>
            <View style={styles.cameraFooterDot} />
            <Text style={styles.cameraFooterText}>{"Camera chính"}</Text>
            <Text style={styles.cameraFooterTime}>
              {new Date().toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        </View>

        {/* ── THỜI TIẾT THỰC ──────────────────────────── */}
        <WeatherCard />

        {/* ── CẢNH BÁO GẦN ĐÂY ───────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardSectionTitle}>{"CẢNH BÁO GẦN ĐÂY"}</Text>
            <TouchableOpacity
              onPress={() => requireAuth(() => navigation.navigate("Alerts"))}
            >
              <Text style={styles.seeAll}>{"Xem tất cả"}</Text>
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

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ── NÚT TRẠNG THÁI ──────────────────────────── */}
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
        <View style={styles.alertStatusInner}>
          <View
            style={[
              styles.alertStatusDot,
              { backgroundColor: hasActiveAlarm ? "#FCA5A5" : "#86EFAC" },
            ]}
          />
          <Text style={styles.alertStatusBtnText}>
            {hasActiveAlarm ? "CẢNH BÁO ĐANG KÍCH HOẠT" : "HỆ THỐNG AN TOÀN"}
          </Text>
        </View>
      </TouchableOpacity>

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

  // Toast
  alertToast: {
    position: "absolute",
    top: 10,
    right: 12,
    zIndex: 2000,
    backgroundColor: "#DC2626",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: "88%",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  alertToastText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.4,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: SURF,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT1,
    letterSpacing: 0.8,
  },
  headerSub: { fontSize: 12, color: TEXT3, marginTop: 2 },
  userRow: { alignItems: "center" },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: TEAL,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#FFF", fontWeight: "800", fontSize: 15 },
  loginBtn: {
    backgroundColor: TEAL,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  loginBtnText: { color: "#FFF", fontSize: 13, fontWeight: "700" },

  // Camera card
  cameraCard: {
    backgroundColor: "#1C2B3A",
    margin: 16,
    marginBottom: 0,
    borderRadius: 20,
    overflow: "hidden",
  },
  liveBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DC2626",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFF" },
  liveText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 1,
  },
  cameraFeed: { height: 220, backgroundColor: "#243447" },
  webview: { flex: 1, backgroundColor: "#243447" },
  cameraEmptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 8,
  },
  cameraStateText: { color: "#CBD5E1", fontSize: 13, textAlign: "center" },
  cameraStateHint: {
    color: "rgba(203,213,225,0.6)",
    fontSize: 11,
    textAlign: "center",
  },
  cameraFooter: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  cameraFooterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
  },
  cameraFooterText: { flex: 1, color: "#94A3B8", fontSize: 12 },
  cameraFooterTime: { color: "#64748B", fontSize: 12 },

  // Card chung
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
    fontSize: 11,
    fontWeight: "800",
    color: TEXT3,
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  seeAll: { fontSize: 13, color: TEAL, fontWeight: "600" },

  // Thời tiết
  weatherLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  weatherLoadingText: { fontSize: 13, color: TEXT2 },
  weatherError: { fontSize: 13, color: TEXT3, paddingVertical: 8 },
  weatherMain: { flexDirection: "row", alignItems: "center" },
  weatherLeft: { flex: 1 },
  weatherCity: {
    fontSize: 13,
    fontWeight: "600",
    color: TEXT2,
    marginBottom: 8,
  },
  weatherTempRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  weatherSymbol: { fontSize: 42, lineHeight: 48 },
  weatherTemp: {
    fontSize: 32,
    fontWeight: "800",
    color: TEXT1,
    lineHeight: 36,
  },
  weatherDesc: { fontSize: 13, color: TEXT2, marginTop: 2 },
  weatherMetaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  weatherMeta: { fontSize: 12, color: TEXT3 },
  weatherMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: TEXT3,
  },
  weatherForecast: {
    flexDirection: "row",
    gap: 6,
    borderLeftWidth: 1,
    borderLeftColor: BORDER,
    paddingLeft: 16,
  },
  forecastItem: {
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  forecastDay: { fontSize: 11, fontWeight: "700", color: TEXT3 },
  forecastSymbol: { fontSize: 18, lineHeight: 22 },
  forecastMax: { fontSize: 13, fontWeight: "700", color: TEXT1 },
  forecastMin: { fontSize: 11, color: TEXT3 },

  // Alert thumbs
  alertsScroll: { marginHorizontal: -4 },
  alertThumb: { width: 96, marginHorizontal: 4 },
  alertThumbImg: {
    height: 68,
    backgroundColor: "#EEF2F7",
    borderRadius: 12,
    overflow: "hidden",
    justifyContent: "flex-end",
    padding: 6,
    marginBottom: 5,
  },
  alertThumbPhoto: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  alertThumbTimeBox: {
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  alertThumbTime: { fontSize: 10, fontWeight: "700", color: TEXT1 },
  alertThumbLabel: { fontSize: 11, color: TEXT2, fontWeight: "500" },

  // Nút trạng thái
  alertStatusBtn: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  alertStatusInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  alertStatusDot: { width: 8, height: 8, borderRadius: 4 },
  alertStatusBtnText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.6,
  },

  // Dropdown
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "flex-start",
    paddingTop: 70,
    paddingHorizontal: 16,
  },
  dropdownMenu: {
    backgroundColor: SURF,
    borderRadius: 16,
    marginLeft: "auto",
    minWidth: 220,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 10,
    overflow: "hidden",
  },
  dropdownUser: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  dropdownAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: TEAL,
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownAvatarText: { color: "#FFF", fontWeight: "800", fontSize: 16 },
  dropdownUserName: { fontSize: 14, fontWeight: "700", color: TEXT1 },
  dropdownUserEmail: { fontSize: 12, color: TEXT3, marginTop: 2 },
  dropdownDivider: { height: 1, backgroundColor: BORDER },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 14 },
  dropdownItemText: { fontSize: 14, color: "#E74C3C", fontWeight: "600" },
});
