import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
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
import { useFocusEffect } from "@react-navigation/native";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import { alertsAPI } from "../services/api";
import BottomNav from "../components/BottomNav";

const { width: SCREEN_W } = Dimensions.get("window");

const TEAL = "#2E7D8C";
const BG = "#F7F9FC";
const SURF = "#FFFFFF";
const TEXT1 = "#0F172A";
const TEXT2 = "#475569";
const TEXT3 = "#94A3B8";
const BORDER = "#E5E7EB";
const SOCKET_PORT = 5000;
const LAN_HOSTS = ["192.168.1.8", "192.168.1.10", "192.168.1.100"];
const LOCAL_HOSTS = ["localhost", "127.0.0.1"];
const IMAGE_PORTS = [5003, 5000];

// ── Helpers ───────────────────────────────────────────────
const getSeverity = (confidence) => {
  if (confidence >= 0.8) return { label: "Cao", bg: "#FEE2E2", fg: "#B91C1C" };
  if (confidence >= 0.5)
    return { label: "Trung bình", bg: "#FEF3C7", fg: "#B45309" };
  return { label: "Thấp", bg: "#DCFCE7", fg: "#15803D" };
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

const toAbsoluteImageCandidates = (item) => {
  const candidates = [];

  if (Array.isArray(item?.image_urls)) {
    candidates.push(...item.image_urls.filter(Boolean));
  }

  if (item?.image_url) {
    candidates.push(item.image_url);
  }

  const rawPath = (item?.image_path || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

  if (!rawPath) return [...new Set(candidates)];

  const hosts = [];
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const currentHost = window.location?.hostname;
    if (currentHost) hosts.push(currentHost);
  }
  hosts.push(...LAN_HOSTS, ...LOCAL_HOSTS);

  const pathVariants = [rawPath];
  if (!rawPath.startsWith("static/")) {
    pathVariants.push(`static/${rawPath}`);
  }

  for (const host of [...new Set(hosts)]) {
    for (const port of IMAGE_PORTS) {
      for (const relPath of pathVariants) {
        candidates.push(`http://${host}:${port}/${relPath}`);
      }
    }
  }

  return [...new Set(candidates)];
};

// ── Image viewer modal ────────────────────────────────────
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
          <Text style={styles.imgViewerCloseText}>✕</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  </Modal>
);

// ── Alert Item ────────────────────────────────────────────
const AlertItem = ({ item, onResolve }) => {
  const severity = getSeverity(item.confidence);
  const imageCandidates = React.useMemo(
    () => toAbsoluteImageCandidates(item),
    [item],
  );
  const [imageIndex, setImageIndex] = useState(0);
  const [viewing, setViewing] = useState(false);
  const displayImageUri = imageCandidates[imageIndex] || null;

  useEffect(() => {
    setImageIndex(0);
  }, [item.id, item.image_url, item.image_urls, item.image_path]);

  const handleImageError = useCallback(() => {
    setImageIndex((prev) => {
      if (prev >= imageCandidates.length - 1) return prev;
      return prev + 1;
    });
  }, [imageCandidates.length]);

  return (
    <View
      style={[styles.alertCard, item.is_resolved && styles.alertCardResolved]}
    >
      {/* ── Ảnh thumbnail ── */}
      {displayImageUri ? (
        <TouchableOpacity activeOpacity={0.85} onPress={() => setViewing(true)}>
          <Image
            source={{ uri: displayImageUri }}
            style={styles.alertImage}
            resizeMode="cover"
            onError={handleImageError}
          />
          {/* Overlay badge LIVE-like */}
          <View style={styles.imgOverlay}>
            <View
              style={[
                styles.imgSeverityBadge,
                { backgroundColor: severity.bg },
              ]}
            >
              <Text style={[styles.imgSeverityText, { color: severity.fg }]}>
                {severity.label}
              </Text>
            </View>
            <Text style={styles.imgTapHint}>Nhấn để phóng to</Text>
          </View>
        </TouchableOpacity>
      ) : (
        /* Placeholder khi không có ảnh */
        <View style={styles.alertImagePlaceholder}>
          <Text style={styles.alertImagePlaceholderIcon}>📷</Text>
          <Text style={styles.alertImagePlaceholderText}>Không có ảnh</Text>
        </View>
      )}

      {/* ── Image viewer ── */}
      {displayImageUri && (
        <ImageViewer
          uri={displayImageUri}
          visible={viewing}
          onClose={() => setViewing(false)}
        />
      )}

      {/* ── Info ── */}
      <View style={styles.alertBody}>
        <View style={styles.alertHeader}>
          <View style={styles.alertHeaderLeft}>
            {!displayImageUri && (
              <View style={[styles.badge, { backgroundColor: severity.bg }]}>
                <Text style={[styles.badgeText, { color: severity.fg }]}>
                  {severity.label}
                </Text>
              </View>
            )}
            {item.is_resolved && (
              <View style={styles.resolvedBadge}>
                <Text style={styles.resolvedText}>Đã xử lý</Text>
              </View>
            )}
          </View>
          <Text style={styles.alertTime}>{formatTime(item.created_at)}</Text>
        </View>

        <Text style={styles.alertTitle}>
          Phát hiện: {item.object_type || "Đối tượng lạ"}
        </Text>
        <Text style={styles.alertMeta}>
          {item.camera_name}
          {item.zone_name ? ` · ${item.zone_name}` : ""}
        </Text>
        <Text style={styles.alertConfidence}>
          Độ chính xác: {Math.round((item.confidence || 0) * 100)}%
        </Text>

        {!item.is_resolved && (
          <TouchableOpacity
            style={styles.resolveBtn}
            onPress={() => onResolve(item.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.resolveBtnText}>✓ Đánh dấu đã xử lý</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ── Filter Tab ────────────────────────────────────────────
const FilterTab = ({ label, active, count, onPress }) => (
  <TouchableOpacity
    style={[styles.filterTab, active && styles.filterTabActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>
      {label}
    </Text>
    {count > 0 && (
      <View style={[styles.filterBadge, active && styles.filterBadgeActive]}>
        <Text
          style={[
            styles.filterBadgeText,
            active && styles.filterBadgeTextActive,
          ]}
        >
          {count}
        </Text>
      </View>
    )}
  </TouchableOpacity>
);

// ── Main Screen ───────────────────────────────────────────
export default function AlertsScreen({ navigation }) {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState(null);
  const [socketHostHint, setSocketHostHint] = useState("");

  const socketOptions = React.useMemo(() => {
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

  const socketCandidates = React.useMemo(() => {
    const hosts = [];

    if (socketHostHint) hosts.push(socketHostHint);

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const currentHost = window.location?.hostname;
      if (currentHost && !socketHostHint) hosts.push(currentHost);

      if (
        !socketHostHint &&
        (currentHost === "localhost" || currentHost === "127.0.0.1")
      ) {
        hosts.push(...LOCAL_HOSTS);
      }
    } else {
      hosts.push(...LAN_HOSTS, ...LOCAL_HOSTS);
    }
    return [...new Set(hosts)].map((host) => `http://${host}:${SOCKET_PORT}`);
  }, [socketHostHint]);

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
        } catch (parseError) {
          // Ignore malformed image URLs.
        }
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
        socket.on("new_alert", () => fetchAlerts(true));
        return;
      }

      if (!cancelled && mounted) {
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
  }, [fetchAlerts, socketCandidates, socketOptions, user]);

  const handleResolve = (id) => {
    Alert.alert("Xác nhận", "Đánh dấu cảnh báo này là đã xử lý?", [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Xác nhận",
        onPress: async () => {
          try {
            await alertsAPI.resolve(id);
            setAlerts((prev) =>
              prev.map((a) => (a.id === id ? { ...a, is_resolved: true } : a)),
            );
          } catch (err) {
            Alert.alert("Lỗi", err.message);
          }
        },
      },
    ]);
  };

  const filtered = alerts.filter((a) =>
    filter === "open"
      ? !a.is_resolved
      : filter === "resolved"
        ? a.is_resolved
        : true,
  );
  const openCount = alerts.filter((a) => !a.is_resolved).length;
  const resolvedCount = alerts.filter((a) => a.is_resolved).length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={SURF} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Alerts</Text>
          <Text style={styles.headerSubtitle}>
            {openCount > 0
              ? `${openCount} cảnh báo chưa xử lý`
              : "Không có cảnh báo mới"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => fetchAlerts(true)}
        >
          <Text style={styles.refreshBtnText}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        <FilterTab
          label="Tất cả"
          active={filter === "all"}
          count={alerts.length}
          onPress={() => setFilter("all")}
        />
        <FilterTab
          label="Chưa xử lý"
          active={filter === "open"}
          count={openCount}
          onPress={() => setFilter("open")}
        />
        <FilterTab
          label="Đã xử lý"
          active={filter === "resolved"}
          count={resolvedCount}
          onPress={() => setFilter("resolved")}
        />
      </View>

      {/* Body */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={TEAL} />
          <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>⚠</Text>
          <Text style={styles.errorTitle}>Không thể tải dữ liệu</Text>
          <Text style={styles.errorMsg}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => fetchAlerts()}
          >
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>Không có cảnh báo</Text>
          <Text style={styles.emptySubtitle}>
            {filter === "open"
              ? "Tất cả cảnh báo đã được xử lý"
              : "Hệ thống đang hoạt động bình thường"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <AlertItem item={item} onResolve={handleResolve} />
          )}
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

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: SURF,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: TEXT1 },
  headerSubtitle: { fontSize: 13, color: TEXT2, marginTop: 2 },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  refreshBtnText: { fontSize: 20, color: TEAL },

  filterRow: {
    flexDirection: "row",
    backgroundColor: SURF,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
    backgroundColor: "#F1F5F9",
  },
  filterTabActive: { backgroundColor: TEAL },
  filterTabText: { fontSize: 12, fontWeight: "600", color: TEXT2 },
  filterTabTextActive: { color: "#FFFFFF" },
  filterBadge: {
    backgroundColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  filterBadgeActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  filterBadgeText: { fontSize: 11, fontWeight: "700", color: TEXT2 },
  filterBadgeTextActive: { color: "#FFFFFF" },

  listContent: { padding: 16, paddingBottom: 8 },

  // Alert card
  alertCard: {
    backgroundColor: SURF,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  alertCardResolved: { opacity: 0.6 },

  // Image
  alertImage: {
    width: "100%",
    height: 190,
    backgroundColor: "#E8ECF0",
  },
  alertImagePlaceholder: {
    width: "100%",
    height: 100,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  alertImagePlaceholderIcon: { fontSize: 28 },
  alertImagePlaceholderText: { fontSize: 12, color: TEXT3 },

  // Image overlay
  imgOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  imgSeverityBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  imgSeverityText: { fontSize: 11, fontWeight: "700" },
  imgTapHint: { fontSize: 11, color: "rgba(255,255,255,0.8)" },

  // Alert body
  alertBody: { padding: 14 },
  alertHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  alertHeaderLeft: { flexDirection: "row", gap: 6 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  resolvedBadge: {
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  resolvedText: { fontSize: 11, fontWeight: "700", color: TEXT3 },
  alertTime: { fontSize: 12, color: TEXT3 },
  alertTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT1,
    marginBottom: 4,
  },
  alertMeta: { fontSize: 13, color: TEXT2, marginBottom: 2 },
  alertConfidence: { fontSize: 12, color: TEXT3, marginBottom: 10 },
  resolveBtn: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#86EFAC",
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
  },
  resolveBtnText: { fontSize: 13, fontWeight: "600", color: "#15803D" },

  // Image viewer modal
  imgViewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
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
    backgroundColor: "rgba(255,255,255,0.2)",
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
  loadingText: { marginTop: 12, fontSize: 14, color: TEXT2 },
  errorIcon: { fontSize: 36, marginBottom: 12 },
  errorTitle: {
    fontSize: 16,
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
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  emptyIcon: { fontSize: 40, marginBottom: 16 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: TEXT1,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: TEXT2,
    textAlign: "center",
    lineHeight: 22,
  },
});
