import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const API_PORT = 5003;
const STATIC_HOSTS = ["192.168.1.8", "192.168.1.10", "localhost", "127.0.0.1"];
let preferredBaseUrl = null;

const getCandidateBaseUrls = () => {
  const hosts = [...STATIC_HOSTS];

  if (Platform.OS === "web" && typeof window !== "undefined") {
    const currentHost = window.location?.hostname;
    if (currentHost) hosts.unshift(currentHost);
  }

  return [...new Set(hosts)].map((host) => `http://${host}:${API_PORT}/api`);
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
        ...getCandidateBaseUrls().filter((u) => u !== preferredBaseUrl),
      ]
    : getCandidateBaseUrls();

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
    "Không thể kết nối backend. Kiểm tra IP LAN, cổng 5003 và firewall.",
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
