import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getCameraBaseCandidates,
  getApiBaseCandidates,
  refreshConnectionInfo,
} from "../config/endpoints";
import { getAlertsApiBaseCandidates } from "../config/endpoints";

let preferredBaseUrl = null;
let unauthorizedHandler = null;

const stripTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");
const unique = (items) => [...new Set(items.filter(Boolean))];

const buildPreferredApiCandidates = (baseUrl, candidateSource) => {
  const normalizedBase = stripTrailingSlash(baseUrl);
  if (!normalizedBase) return [];

  let parsedBase;
  try {
    parsedBase = new URL(normalizedBase);
  } catch {
    return [];
  }

  const directApiBase = `${normalizedBase}/api`;
  const prioritized = [];

  if (candidateSource.includes(normalizedBase)) {
    prioritized.push(normalizedBase);
  }

  if (candidateSource.includes(directApiBase)) {
    prioritized.push(directApiBase);
  }

  for (const candidate of candidateSource) {
    try {
      const parsedCandidate = new URL(candidate);
      const isSameHost =
        parsedCandidate.protocol === parsedBase.protocol &&
        parsedCandidate.hostname === parsedBase.hostname;

      if (isSameHost) {
        prioritized.push(candidate);
      }
    } catch {
      // Ignore invalid candidate entries and continue probing the rest.
    }
  }

  return unique(prioritized);
};

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

const getStoredTelegramChatId = async () => {
  const raw = await AsyncStorage.getItem("telegram_chat_id");
  if (typeof raw !== "string") return "";
  return raw.trim();
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

const buildAbsoluteUrls = (bases, path) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return unique(
    (Array.isArray(bases) ? bases : []).map((base) => {
      const normalizedBase = stripTrailingSlash(base);
      return normalizedBase ? `${normalizedBase}${normalizedPath}` : "";
    }),
  );
};

const requestAbsolute = async (
  urls,
  method = "GET",
  body = null,
  { auth = false, timeoutMs = 8000 } = {},
) => {
  const headers = {};

  if (auth) {
    const token = await getStoredToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const options = { method, headers };
  if (body) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  let lastNetworkError = null;
  let lastHttpError = null;

  for (const url of urls) {
    try {
      const response = await fetchWithTimeout(url, options, timeoutMs);
      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (response.ok) {
        return data ?? {};
      }

      lastHttpError = new Error(
        data?.message || data?.error || `API loi (${response.status})`,
      );
    } catch (error) {
      lastNetworkError = error;
    }
  }

  if (lastHttpError) throw lastHttpError;
  if (lastNetworkError?.name === "AbortError") {
    throw new Error("Ket noi supervised mode bi timeout.");
  }
  throw new Error("Khong the ket noi endpoint supervised mode.");
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

  const preferredCandidates = buildPreferredApiCandidates(
    preferredBaseUrl,
    candidateSource,
  );
  const candidates = unique([...preferredCandidates, ...candidateSource]);

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
  getSupervisedStatus: async (cameraId) => {
    const nodeUrls = buildAbsoluteUrls(
      getApiBaseCandidates(),
      `/camera/supervised-status/${cameraId}`,
    );
    return requestAbsolute(nodeUrls, "GET", null, { auth: true });
  },

  toggleSupervised: async (cameraId, enabled) => {
    const body = {
      camera_id: cameraId,
      enabled,
    };

    const flaskUrls = buildAbsoluteUrls(
      getCameraBaseCandidates(),
      "/api/camera/toggle-supervised",
    );
    const nodeUrls = buildAbsoluteUrls(
      getApiBaseCandidates(),
      "/camera/toggle-supervised",
    );

    return requestAbsolute([...flaskUrls, ...nodeUrls], "POST", body, {
      auth: true,
    });
  },

  captureSnapshot: async (
    cameraId,
    { mode = "processed", sendTelegram = true, telegramChatId = "" } = {},
  ) => {
    const normalizedMode = mode === "raw" ? "raw" : "processed";
    const resolvedChatId = telegramChatId || (await getStoredTelegramChatId());
    const query = new URLSearchParams({
      mode: normalizedMode,
      send_telegram: sendTelegram ? "true" : "false",
    });

    const body = {
      mode: normalizedMode,
      send_telegram: Boolean(sendTelegram),
    };

    if (resolvedChatId) {
      query.set("telegram_chat_id", resolvedChatId);
      body.telegram_chat_id = resolvedChatId;
    }

    const flaskUrls = buildAbsoluteUrls(
      getCameraBaseCandidates(),
      `/api/cameras/${cameraId}/snapshot?${query.toString()}`,
    );

    return requestAbsolute(flaskUrls, "POST", body, { auth: true, timeoutMs: 12000 });
  },
};
