const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

// ============================================================
// ĐĂNG KÍ
// ============================================================
exports.register = async (req, res) => {
  const { username, email, password, full_name } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin.' });
  }

  try {
    // Kiểm tra username / email đã tồn tại chưa
    const [existing] = await db.query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Username hoặc email đã được sử dụng.' });
    }

    // Hash mật khẩu
    const password_hash = await bcrypt.hash(password, 10);

    // Lấy role mặc định (viewer = id 2, tuỳ data seeding của bạn)
    const [roles] = await db.query("SELECT id FROM roles WHERE role_name = 'viewer' LIMIT 1");
    const role_id = roles.length > 0 ? roles[0].id : null;

    // Insert user mới
    const [result] = await db.query(
      'INSERT INTO users (role_id, username, password_hash, email, full_name) VALUES (?, ?, ?, ?, ?)',
      [role_id, username, password_hash, email, full_name || null]
    );

    return res.status(201).json({
      message: 'Đăng ký thành công!',
      userId: result.insertId,
    });
  } catch (err) {
    console.error('[register]', err);
    return res.status(500).json({ message: 'Lỗi server. Vui lòng thử lại.' });
  }
};

// ============================================================
// ĐĂNG NHẬP
// ============================================================
exports.login = async (req, res) => {
  const { identifier, password } = req.body; // identifier = email hoặc username

  if (!identifier || !password) {
    return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin.' });
  }

  try {
    // Tìm user theo email hoặc username
    const [rows] = await db.query(
      `SELECT u.*, r.role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.email = ? OR u.username = ?
       LIMIT 1`,
      [identifier, identifier]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Tài khoản không tồn tại.' });
    }

    const user = rows[0];

    // So sánh mật khẩu
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Mật khẩu không chính xác.' });
    }

    // Tạo JWT
    const token = jwt.sign(
      { id: user.id, role: user.role_name },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(200).json({
      message: 'Đăng nhập thành công!',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role_name,
        language: user.language,
      },
    });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ message: 'Lỗi server. Vui lòng thử lại.' });
  }
};

// ============================================================
// LẤY THÔNG TIN USER HIỆN TẠI (dùng token)
// ============================================================
exports.getMe = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.username, u.email, u.full_name, u.language, u.created_at, r.role_name
       FROM users u LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'User không tồn tại.' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('[getMe]', err);
    return res.status(500).json({ message: 'Lỗi server.' });
  }
};