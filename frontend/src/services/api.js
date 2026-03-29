import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://172.26.168.53:5000/api'; // phải đúng IP này// ⚠️ Thay YOUR_IP bằng IP máy tính (không dùng localhost trên thiết bị thật)

// ── Helper gọi API ──
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

// ── Auth APIs ──
export const authAPI = {
  login: (identifier, password) =>
    request('/auth/login', 'POST', { identifier, password }),

  register: (username, email, password, full_name) =>
    request('/auth/register', 'POST', { username, email, password, full_name }),

  getMe: () => request('/auth/me', 'GET', null, true),
};