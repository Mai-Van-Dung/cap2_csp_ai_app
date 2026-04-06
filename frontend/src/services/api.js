import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://192.168.10.95:5003/api';

// ── Helper gọi API ────────────────────────────────────────
const request = async (endpoint, method = 'GET', body = null, auth = false) => {
  const headers = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = await AsyncStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Lỗi không xác định');
  }

  return data;
};

// ── Auth APIs ─────────────────────────────────────────────
export const authAPI = {
  login: (identifier, password) =>
    request('/auth/login', 'POST', { identifier, password }),

  register: (username, email, password, full_name) =>
    request('/auth/register', 'POST', { username, email, password, full_name }),

  getMe: () => request('/auth/me', 'GET', null, true),
};

// ── Alerts APIs ───────────────────────────────────────────
export const alertsAPI = {
  // Lấy toàn bộ danh sách alerts của user
  getAll: () => request('/alerts', 'GET', null, true),

  // Đánh dấu alert đã xử lý
  resolve: (id) => request(`/alerts/${id}/resolve`, 'PATCH', null, true),
};