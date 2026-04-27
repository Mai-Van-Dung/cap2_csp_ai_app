import React, { useState, useEffect, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import { alertsAPI } from "../services/api";
import {
  getAlertImageCandidates,
  getSocketOriginFromHostname,
  getSocketBaseCandidates,
  getSocketPath,
  refreshConnectionInfo,
} from "../config/endpoints";
import BottomNav from "../components/BottomNav";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
  Modal,
  Dimensions,
  Platform,
} from "react-native";

const { width: SCREEN_W } = Dimensions.get("window");

const TEAL = "#2E7D8C";
const BG = "#F0F4F8"; // nền tổng thể xám xanh nhạt
const SURF = "#FFFFFF"; // card trắng
const SURF2 = "#F1F5F9"; // nền phụ
const TEXT1 = "#0F172A"; // chữ đậm
const TEXT2 = "#475569"; // chữ phụ
const TEXT3 = "#94A3B8"; // chữ mờ
const BORDER = "#E2E8F0"; // viền
const ACCENT = "#EF4444";

// ── Helpers ───────────────────────────────────────────────
const getSeverity = (confidence) => {
  if (confidence >= 0.8)
    return { label: "NGUY HIỂM CAO", color: "#EF4444", bar: "#EF4444" };
  if (confidence >= 0.5)
    return { label: "TRUNG BÌNH", color: "#F59E0B", bar: "#F59E0B" };
  return { label: "THẤP", color: "#22C55E", bar: "#22C55E" };
};

const formatTime = (isoString) => {
  const date = new Date(isoString);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return `${diff} giây trước`;
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return date.toLocaleDateString("vi-VN");
};

// ── Image Viewer ──────────────────────────────────────────
const ImageViewer = ({ uri, visible, onClose }) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <TouchableOpacity
      style={styles.imgViewerOverlay}
      activeOpacity={1}
      onPress={onClose}
    >
      <View style={styles.imgViewerBox}>
        <Image
          source={{ uri }}
          style={styles.imgViewerImg}
          resizeMode="contain"
        />
        <TouchableOpacity style={styles.imgViewerClose} onPress={onClose}>
          <Text style={styles.imgViewerCloseText}>{"✕"}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  </Modal>
);

// ── Alert Card ────────────────────────────────────────────
const AlertItem = ({ item }) => {
  const severity = getSeverity(item.confidence);
  const imageCandidates = React.useMemo(
    () => getAlertImageCandidates(item),
    [item],
  );
  const [imageIndex, setImageIndex] = useState(0);
  const [viewing, setViewing] = useState(false);
  const displayImageUri = imageCandidates[imageIndex] || null;

  useEffect(() => {
    setImageIndex(0);
  }, [item.id, item.image_url, item.image_urls, item.image_path]);

  const handleImageError = useCallback(() => {
    setImageIndex((prev) =>
      prev >= imageCandidates.length - 1 ? prev : prev + 1,
    );
  }, [imageCandidates.length]);

  const confidencePct = Math.round((item.confidence || 0) * 100);

  return (
    <View style={styles.card}>
      {/* Thanh màu severity bên trái */}
      <View
        style={[styles.cardAccentBar, { backgroundColor: severity.color }]}
      />

      <View style={styles.cardInner}>
        {/* Ảnh */}
        {displayImageUri ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setViewing(true)}
          >
            <View style={styles.imageWrapper}>
              <Image
                source={{ uri: displayImageUri }}
                style={styles.alertImage}
                resizeMode="cover"
                onError={handleImageError}
              />
              <View style={styles.imageOverlay}>
                <Text style={styles.imageTap}>{"Nhấn để phóng to"}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.noImageBox}>
            <Text style={styles.noImageText}>{"Không có hình ảnh"}</Text>
          </View>
        )}

        {displayImageUri && (
          <ImageViewer
            uri={displayImageUri}
            visible={viewing}
            onClose={() => setViewing(false)}
          />
        )}

        {/* Thông tin */}
        <View style={styles.cardBody}>
          {/* Hàng trên: severity label + thời gian */}
          <View style={styles.cardTopRow}>
            <View
              style={[styles.severityPill, { borderColor: severity.color }]}
            >
              <View
                style={[
                  styles.severityDot,
                  { backgroundColor: severity.color },
                ]}
              />
              <Text style={[styles.severityLabel, { color: severity.color }]}>
                {severity.label}
              </Text>
            </View>
            <Text style={styles.timeText}>{formatTime(item.created_at)}</Text>
          </View>

          {/* Tên đối tượng */}
          <Text style={styles.objectTitle}>
            {item.object_type || "Đối tượng không xác định"}
          </Text>

          {/* Camera + zone */}
          <Text style={styles.metaText}>
            {[item.camera_name, item.zone_name].filter(Boolean).join("  ·  ")}
          </Text>

          {/* Thanh độ chính xác */}
          <View style={styles.confRow}>
            <Text style={styles.confLabel}>{"Độ chính xác"}</Text>
            <Text style={[styles.confValue, { color: severity.color }]}>
              {`${confidencePct}%`}
            </Text>
          </View>
          <View style={styles.confBarBg}>
            <View
              style={[
                styles.confBarFill,
                {
                  width: `${confidencePct}%`,
                  backgroundColor: severity.color,
                },
              ]}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

// ── Main Screen ───────────────────────────────────────────
export default function AlertsScreen({ navigation }) {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [socketHostHint, setSocketHostHint] = useState("");
  const [discoveryVersion, setDiscoveryVersion] = useState(0);

  const socketOptions = React.useMemo(() => {
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

  const socketCandidates = React.useMemo(() => {
    if (socketHostHint) {
      try {
        return [new URL(socketHostHint).origin];
      } catch {
        return [getSocketOriginFromHostname(socketHostHint)];
      }
    }
    return getSocketBaseCandidates();
  }, [socketHostHint, discoveryVersion]);

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

  const requireAuth = (action) => {
    if (!user) navigation.navigate("Login");
    else action?.();
  };

  const fetchAlerts = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await alertsAPI.getAll();
      const incoming = res.data || [];
      setAlerts(incoming);
      const imageUrl = incoming.find((a) => !!a.image_url)?.image_url;
      if (imageUrl) {
        try {
          const hostname = new URL(imageUrl).hostname;
          if (
            hostname &&
            hostname !== "localhost" &&
            hostname !== "127.0.0.1"
          ) {
            setSocketHostHint((prev) => prev || hostname);
          }
        } catch {}
      }
    } catch (err) {
      setError(err.message || "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (user) fetchAlerts(true);
    }, [fetchAlerts, user]),
  );

  useEffect(() => {
    if (!user) return;
    let mounted = true,
      activeSocket = null,
      connectTimer = null,
      connectResolver = null,
      retryTimer = null,
      cancelled = false;

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
        socket.on("new_alert", () => fetchAlerts(true));
        return;
      }
      if (!cancelled && mounted) retryTimer = setTimeout(connectSocket, 10000);
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
  }, [fetchAlerts, socketCandidates, socketOptions, user]);

  const totalCount = alerts.length;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{"NHẬT KÝ CẢNH BÁO"}</Text>
          <Text style={styles.headerSub}>
            {totalCount > 0
              ? `${totalCount} sự kiện được ghi nhận`
              : "Chưa có sự kiện nào"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => fetchAlerts(true)}
        >
          <Text style={styles.refreshBtnText}>{"↻"}</Text>
        </TouchableOpacity>
      </View>

      {/* Divider accent */}
      <View style={styles.headerAccentLine} />

      {/* Body */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={TEAL} />
          <Text style={styles.loadingText}>{"Đang tải..."}</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>{"Không thể tải dữ liệu"}</Text>
          <Text style={styles.errorMsg}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => fetchAlerts()}
          >
            <Text style={styles.retryText}>{"Thử lại"}</Text>
          </TouchableOpacity>
        </View>
      ) : alerts.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyDot} />
          <Text style={styles.emptyTitle}>{"Hệ thống an toàn"}</Text>
          <Text style={styles.emptySubtitle}>
            {"Không có cảnh báo nào được ghi nhận"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <AlertItem item={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchAlerts(true)}
              colors={[TEAL]}
              tintColor={TEAL}
            />
          }
        />
      )}

      <BottomNav
        navigation={navigation}
        activeTab="Alerts"
        requireAuth={requireAuth}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: BG,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: TEXT1,
    letterSpacing: 1.5,
  },
  headerSub: { fontSize: 12, color: TEXT2, marginTop: 3 },
  headerAccentLine: {
    height: 1,
    backgroundColor: BORDER,
    marginHorizontal: 20,
    marginBottom: 4,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#EEF2F7",
    borderWidth: 1,
    borderColor: BORDER,
    justifyContent: "center",
    alignItems: "center",
  },
  refreshBtnText: { fontSize: 20, color: TEAL },

  // List
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },

  // Card
  card: {
    flexDirection: "row",
    backgroundColor: SURF,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
  },
  cardAccentBar: { width: 4 },
  cardInner: { flex: 1 },

  // Image
  imageWrapper: { position: "relative" },
  alertImage: { width: "100%", height: 180, backgroundColor: "#0F1923" },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "flex-end",
  },
  imageTap: { fontSize: 11, color: "rgba(255,255,255,0.6)" },
  noImageBox: {
    height: 72,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
  },
  noImageText: { fontSize: 12, color: TEXT3 },

  // Card body
  cardBody: { padding: 14 },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  severityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  severityDot: { width: 6, height: 6, borderRadius: 3 },
  severityLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  timeText: { fontSize: 11, color: TEXT3 },

  objectTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT1,
    marginBottom: 5,
  },
  metaText: { fontSize: 12, color: TEXT2, marginBottom: 12 },

  // Confidence bar
  confRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  confLabel: { fontSize: 11, color: TEXT3 },
  confValue: { fontSize: 11, fontWeight: "700" },
  confBarBg: {
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    overflow: "hidden",
  },
  confBarFill: { height: 4, borderRadius: 2 },

  // Image viewer
  imgViewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  imgViewerBox: { width: SCREEN_W, position: "relative" },
  imgViewerImg: { width: SCREEN_W, height: SCREEN_W * 0.75 },
  imgViewerClose: {
    position: "absolute",
    top: -44,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  imgViewerCloseText: { color: "#FFF", fontSize: 16, fontWeight: "700" },

  // States
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingText: { marginTop: 12, fontSize: 13, color: TEXT2 },
  errorTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT1,
    marginBottom: 6,
  },
  errorMsg: {
    fontSize: 13,
    color: TEXT2,
    textAlign: "center",
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: TEAL,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
  emptyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22C55E",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT1,
    marginBottom: 6,
  },
  emptySubtitle: { fontSize: 13, color: TEXT2, textAlign: "center" },
});
