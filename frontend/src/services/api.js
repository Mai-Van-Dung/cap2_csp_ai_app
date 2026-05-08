import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getApiBaseCandidates,
  refreshConnectionInfo,
} from "../config/endpoints";
import { getAlertsApiBaseCandidates } from "../config/endpoints";

let preferredBaseUrl = null;
let unauthorizedHandler = null;

export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = typeof handler === "function" ? handler : null;
};

const INVALID_TOKEN_VALUES = new Set(["", "null", "undefined", "false"]);

const normalizeToken = (value) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (INVALID_TOKEN_VALUES.has(trimmed.toLowerCase())) return "";
  return trimmed;
};

const getStoredToken = async () => {
  const keys = ["token", "authToken", "accessToken"];
  for (const key of keys) {
    const raw = await AsyncStorage.getItem(key);
    const token = normalizeToken(raw);
    if (token) return token;
  }
  return "";
};

const fetchWithTimeout = async (url, options, timeoutMs = 8000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

// ── Helper gọi API ────────────────────────────────────────
const request = async (endpoint, method = "GET", body = null, auth = false) => {
  const connectionInfo = await refreshConnectionInfo();

  preferredBaseUrl =
    connectionInfo?.preferredBaseUrl ||
    connectionInfo?.preferred_base_url ||
    preferredBaseUrl;

  // For alerts endpoint, reject Flask base (port 5000) and use Node base only
  const isAlertsEndpoint = endpoint.includes("alerts");
  if (
    isAlertsEndpoint &&
    preferredBaseUrl &&
    preferredBaseUrl.includes(":5000")
  ) {
    console.log("[request] Alerts endpoint: skipping Flask base (5000)");
    preferredBaseUrl = null;
  }

  const headers = {};

  if (auth) {
    const token = await getStoredToken();
    if (!token) {
      throw new Error("Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.");
    }
    headers["Authorization"] = `Bearer ${token}`;
  }

  const options = { method, headers };
  if (body) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  // For alerts endpoint, use specialized candidates that prioritize Node backend (5003)
  const candidateSource = isAlertsEndpoint
    ? getAlertsApiBaseCandidates()
    : getApiBaseCandidates();
  console.log(`[API] endpoint=${endpoint}, isAlerts=${isAlertsEndpoint}`);

  const candidates = preferredBaseUrl
    ? [
        preferredBaseUrl,
        ...candidateSource.filter((u) => u !== preferredBaseUrl),
      ]
    : candidateSource;

  console.log(
    `[API] endpoint=${endpoint}, method=${method}, candidates=[${candidates.slice(0, 2).join(", ")}...]`,
  );

  let lastNetworkError = null;

  for (const baseUrl of candidates) {
    let response;
    const fullUrl = `${baseUrl}${endpoint}`;
    console.log(`[API] trying: ${fullUrl}`);
    try {
      response = await fetchWithTimeout(fullUrl, options);
    } catch (error) {
      lastNetworkError = error;
      continue;
    }

    if (response.status === 404) {
      continue;
    }

    preferredBaseUrl = baseUrl;

    let data = null;
    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }

    if (auth && response.status === 401) {
      await AsyncStorage.multiRemove(["token", "user"]);
      if (unauthorizedHandler) {
        try {
          unauthorizedHandler();
        } catch (error) {
          // Keep request flow intact even if UI logout callback fails.
        }
      }
      throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    }

    if (!response.ok) {
      throw new Error(data?.message || `API lỗi (${response.status})`);
    }

    return data ?? {};
  }

  if (lastNetworkError?.name === "AbortError") {
    throw new Error(
      "Kết nối backend bị timeout. Kiểm tra server đang chạy và đúng mạng LAN.",
    );
  }

  throw new Error(
    "Không thể kết nối backend. Kiểm tra IP LAN, cổng API và firewall.",
  );
};

// ── Auth APIs ─────────────────────────────────────────────
export const authAPI = {
  login: (identifier, password) =>
    request("/auth/login", "POST", { identifier, password }),

  register: (username, email, password, full_name) =>
    request("/auth/register", "POST", { username, email, password, full_name }),

  getMe: () => request("/auth/me", "GET", null, true),

  changePassword: (currentPassword, newPassword) =>
    request(
      "/auth/change-password",
      "POST",
      {
        current_password: currentPassword,
        new_password: newPassword,
      },
      true,
    ),
};

// ── Alerts APIs ───────────────────────────────────────────
export const alertsAPI = {
  // Lấy toàn bộ danh sách alerts của user từ Node backend (port 5003)
  // Ưu tiên Node backend thay vì Flask (5000)
  getAll: async () => {
    const result = await request("/alerts", "GET", null, true);
    console.log("[alertsAPI.getAll] raw result keys:", Object.keys(result));

    // Normalize response format:
    // Node backend returns: { success: true, data: [...] }
    // Flask returns: { alerts: [...] }
    // This function ensures: { data: [...] }

    let alerts = [];
    if (result.data && Array.isArray(result.data)) {
      // Node format
      alerts = result.data;
      console.log(
        "[alertsAPI.getAll] Node format detected, alerts count:",
        alerts.length,
      );
    } else if (result.alerts && Array.isArray(result.alerts)) {
      // Flask format
      alerts = result.alerts;
      console.log(
        "[alertsAPI.getAll] Flask format detected, alerts count:",
        alerts.length,
      );
    } else {
      console.warn("[alertsAPI.getAll] Unknown format");
      alerts = [];
    }

    return { data: alerts, success: true };
  },

  // Đánh dấu alert đã xử lý
  resolve: (id) => request(`/alerts/${id}/resolve`, "PATCH", null, true),
};

// ── Telegram APIs ─────────────────────────────────────────
export const telegramAPI = {
  // Lưu Chat ID lên backend
  saveChatId: (chatId) =>
    request("/telegram/chat-id", "POST", { chat_id: chatId }, true),

  // Gửi tin nhắn test
  sendTest: (chatId) =>
    request("/telegram/test", "POST", { chat_id: chatId }, true),
};

// ── Camera mode APIs ─────────────────────────────────────
export const cameraModeAPI = {
  toggleSupervised: (cameraId, enabled) =>
    request("/api/camera/toggle-supervised", "POST", {
      camera_id: cameraId,
      enabled,
    }),
};
