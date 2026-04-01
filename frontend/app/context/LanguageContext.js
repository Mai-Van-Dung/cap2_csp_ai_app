import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const translations = {
  en: {
    greeting: 'Hi',
    subtitle: 'Pool safety overview',
    loginTagline: 'Stay safe around the pool',
    registerTagline: 'Create your CSP-AI account',
    camerasLabel: 'Cameras',
    openAlertsLabel: 'Open alerts',
    latestAlert: 'Latest alert',
    seeAllAlerts: 'See all alerts',
    cameraSection: 'Camera',
    openCamera: 'Open camera',
    profileLink: 'Profile',
    alertsTitle: 'Alerts',
    severityLabel: 'Severity',
    statusLabel: 'Status',
    filtersAll: 'All',
    filtersOpen: 'Open',
    filtersResolved: 'Resolved',
    filtersHigh: 'High',
    filtersMedium: 'Medium',
    filtersLow: 'Low',
    alertNotFound: 'Alert not found',
    description: 'Description',
    frames: 'Frames',
    cameraTitle: 'Camera',
    status: 'Status',
    lastSeen: 'Last seen',
    profileTitle: 'Profile',
    roleLabel: 'Role',
    languageLabel: 'Language',
    switchLanguage: 'Switch language',
    notifications: 'Notifications',
    logout: 'Logout',
    loginTitle: 'CSP-AI Login',
    emailPlaceholder: 'Email',
    passwordPlaceholder: 'Password',
    loginButton: 'Login',
    noAccount: 'No account?',
    registerLink: 'Register',
    registerTitle: 'Create account',
    namePlaceholder: 'Full name',
    registerButton: 'Sign up',
    haveAccount: 'Already have an account?',
    loginLink: 'Login',
    uptime: 'Uptime',
    viewAlerts: 'View alerts',
    livePreview: 'Live preview (mock)',
    recommendedAction: 'Recommended action',
  },
  vi: {
    greeting: 'Chào',
    subtitle: 'Tổng quan an toàn hồ bơi',
    loginTagline: 'Giữ an toàn quanh hồ bơi',
    registerTagline: 'Tạo tài khoản CSP-AI',
    camerasLabel: 'Camera',
    openAlertsLabel: 'Cảnh báo mở',
    latestAlert: 'Cảnh báo mới nhất',
    seeAllAlerts: 'Xem tất cả cảnh báo',
    cameraSection: 'Camera',
    openCamera: 'Mở camera',
    profileLink: 'Hồ sơ',
    alertsTitle: 'Cảnh báo',
    severityLabel: 'Mức độ',
    statusLabel: 'Trạng thái',
    filtersAll: 'Tất cả',
    filtersOpen: 'Đang mở',
    filtersResolved: 'Đã xử lý',
    filtersHigh: 'Cao',
    filtersMedium: 'Trung bình',
    filtersLow: 'Thấp',
    alertNotFound: 'Không tìm thấy cảnh báo',
    description: 'Mô tả',
    frames: 'Khung hình',
    cameraTitle: 'Camera',
    status: 'Trạng thái',
    lastSeen: 'Lần cuối',
    profileTitle: 'Hồ sơ',
    roleLabel: 'Vai trò',
    languageLabel: 'Ngôn ngữ',
    switchLanguage: 'Đổi ngôn ngữ',
    notifications: 'Thông báo',
    logout: 'Đăng xuất',
    loginTitle: 'Đăng nhập CSP-AI',
    emailPlaceholder: 'Email',
    passwordPlaceholder: 'Mật khẩu',
    loginButton: 'Đăng nhập',
    noAccount: 'Chưa có tài khoản?',
    registerLink: 'Đăng ký',
    registerTitle: 'Tạo tài khoản',
    namePlaceholder: 'Họ tên',
    registerButton: 'Đăng ký',
    haveAccount: 'Đã có tài khoản?',
    loginLink: 'Đăng nhập',
    uptime: 'Thời gian hoạt động',
    viewAlerts: 'Xem cảnh báo',
    livePreview: 'Xem thử (mock)',
    recommendedAction: 'Khuyến nghị',
  },
};

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState('vi');

  const toggleLang = useCallback(() => {
    setLang((prev) => (prev === 'vi' ? 'en' : 'vi'));
  }, []);

  const t = useCallback(
    (key) => translations[lang]?.[key] || translations.en[key] || key,
    [lang]
  );

  const value = useMemo(() => ({ lang, toggleLang, t }), [lang, toggleLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLang = () => useContext(LanguageContext);
