// Placeholder for utility functions
// Thêm các hàm tiện ích chung ở đây

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('vi-VN');
};
