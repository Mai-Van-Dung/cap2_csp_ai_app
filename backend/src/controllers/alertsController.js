const db = require('../database/db');
const path = require('path');

// GET /api/alerts
const getAlerts = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.query(
      `SELECT 
        a.id,
        a.object_type,
        a.confidence,
        a.image_path,
        a.video_path,
        a.is_resolved,
        a.created_at,
        c.camera_name,
        z.zone_name
      FROM alerts a
      JOIN cameras c ON a.camera_id = c.id
      JOIN user_camera_access uca ON uca.camera_id = c.id
      LEFT JOIN zones z ON a.zone_id = z.id
      WHERE uca.user_id = ?
      ORDER BY a.created_at DESC`,
      [userId]
    );

    // Thêm image_url đầy đủ cho từng alert
    const BASE = process.env.BASE_URL || 'http://192.168.1.16:5003';
    const data = rows.map(row => ({
      ...row,
      image_url: row.image_path
        ? `${BASE}/${row.image_path.replace(/\\/g, '/')}`
        : null,
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('getAlerts error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// PATCH /api/alerts/:id/resolve
const resolveAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [check] = await db.query(
      `SELECT a.id FROM alerts a
       JOIN user_camera_access uca ON uca.camera_id = a.camera_id
       WHERE a.id = ? AND uca.user_id = ?`,
      [id, userId]
    );

    if (check.length === 0) {
      return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
    }

    await db.query('UPDATE alerts SET is_resolved = TRUE WHERE id = ?', [id]);
    res.json({ success: true, message: 'Đã xử lý cảnh báo' });
  } catch (error) {
    console.error('resolveAlert error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

module.exports = { getAlerts, resolveAlert };