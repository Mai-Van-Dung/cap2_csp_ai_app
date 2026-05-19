const db = require("../config/database");

const normalizeEnabled = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return ["1", "true", "on", "yes"].includes(normalized);
  }
  return false;
};

const toggleSupervised = async (req, res) => {
  try {
    const userId = req.user?.id;
    const cameraId = Number(req.body?.camera_id);
    const enabled = normalizeEnabled(req.body?.enabled);

    if (!Number.isInteger(cameraId) || cameraId <= 0) {
      return res.status(400).json({
        success: false,
        message: "camera_id khong hop le.",
      });
    }

    const [accessRows] = await db.query(
      `SELECT c.id
       FROM cameras c
       JOIN user_camera_access uca ON uca.camera_id = c.id
       WHERE c.id = ? AND uca.user_id = ?
       LIMIT 1`,
      [cameraId, userId],
    );

    if (accessRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Ban khong co quyen truy cap camera nay.",
      });
    }

    await db.query(
      `INSERT INTO ai_settings (camera_id, supervised_mode)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE supervised_mode = VALUES(supervised_mode)`,
      [cameraId, enabled ? 1 : 0],
    );

    const [rows] = await db.query(
      `SELECT camera_id, supervised_mode
       FROM ai_settings
       WHERE camera_id = ?
       LIMIT 1`,
      [cameraId],
    );

    return res.json({
      success: true,
      camera_id: cameraId,
      supervised_mode: Boolean(rows[0]?.supervised_mode),
    });
  } catch (error) {
    console.error("toggleSupervised error:", error);
    return res.status(500).json({
      success: false,
      message: "Loi server khi cap nhat supervised mode.",
    });
  }
};

const getSupervisedStatus = async (req, res) => {
  try {
    const userId = req.user?.id;
    const cameraId = Number(req.params?.cameraId);

    if (!Number.isInteger(cameraId) || cameraId <= 0) {
      return res.status(400).json({
        success: false,
        message: "camera_id khong hop le.",
      });
    }

    const [accessRows] = await db.query(
      `SELECT c.id
       FROM cameras c
       JOIN user_camera_access uca ON uca.camera_id = c.id
       WHERE c.id = ? AND uca.user_id = ?
       LIMIT 1`,
      [cameraId, userId],
    );

    if (accessRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Ban khong co quyen truy cap camera nay.",
      });
    }

    const [rows] = await db.query(
      `SELECT supervised_mode
       FROM ai_settings
       WHERE camera_id = ?
       LIMIT 1`,
      [cameraId],
    );

    return res.json({
      success: true,
      camera_id: cameraId,
      supervised_mode: Boolean(rows[0]?.supervised_mode),
    });
  } catch (error) {
    console.error("getSupervisedStatus error:", error);
    return res.status(500).json({
      success: false,
      message: "Loi server khi lay supervised mode.",
    });
  }
};

module.exports = {
  getSupervisedStatus,
  toggleSupervised,
};
