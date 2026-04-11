import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiBaseCandidates } from "../config/endpoints";


let preferredBaseUrl = null;

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
  const headers = { "Content-Type": "application/json" };

  if (auth) {
    const token = await AsyncStorage.getItem("token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const candidates = preferredBaseUrl
    ? [
        preferredBaseUrl,
        ...getApiBaseCandidates().filter((u) => u !== preferredBaseUrl),
      ]
    : getApiBaseCandidates();

  let lastNetworkError = null;

  for (const baseUrl of candidates) {
    let response;
    try {
      response = await fetchWithTimeout(`${baseUrl}${endpoint}`, options);
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
};

// ── Alerts APIs ───────────────────────────────────────────
export const alertsAPI = {
  // Lấy toàn bộ danh sách alerts của user
  getAll: () => request("/alerts", "GET", null, true),

  // Đánh dấu alert đã xử lý
  resolve: (id) => request(`/alerts/${id}/resolve`, "PATCH", null, true),
};

// ── Telegram APIs ─────────────────────────────────────────
export const telegramAPI = {
  // Lưu Chat ID lên backend
  saveChatId: (chatId) =>
    request('/telegram/chat-id', 'POST', { chat_id: chatId }, true),

  // Gửi tin nhắn test
  sendTest: (chatId) =>
    request('/telegram/test', 'POST', { chat_id: chatId }, true),
};
