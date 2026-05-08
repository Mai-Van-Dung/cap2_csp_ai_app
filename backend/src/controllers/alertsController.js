const db = require("../database/db");
const { notifyAlert } = require("./telegramController");
const { broadcastNewAlert } = require("../realtime/socket");

const normalizeBaseUrl = (value) => value.replace(/\/+$/, "");

const getAlertImagePublicBaseUrl = () => {
  return normalizeBaseUrl(
    process.env.ALERT_IMAGE_PUBLIC_BASE_URL ||
      process.env.PUBLIC_BASE_URL ||
      process.env.BASE_URL ||
      "",
  );
};

const getPublicBaseUrl = (req) => {
  const configured = process.env.PUBLIC_BASE_URL || process.env.BASE_URL;
  if (configured) {
    return normalizeBaseUrl(configured);
  }

  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  return normalizeBaseUrl(`${protocol}://${req.get("host")}`);
};

const buildImageUrls = (baseUrl, imagePath) => {
  const normalizedPath = imagePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const isAlreadyStatic = normalizedPath.startsWith("static/");
  const candidates = isAlreadyStatic
    ? [
        `${baseUrl}/${normalizedPath}`,
        `${baseUrl}/${normalizedPath.replace(/^static\//, "")}`,
      ]
    : [`${baseUrl}/static/${normalizedPath}`, `${baseUrl}/${normalizedPath}`];

  return [...new Set(candidates)];
};

const isConfiguredSecret = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized) return false;
  if (normalized === "your_internal_secret") return false;
  if (normalized === "change_me_internal_secret") return false;
  return true;
};

// GET /api/alerts
const getAlerts = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`[getAlerts] userId=${userId}`);

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
      [userId],
    );

    console.log(`[getAlerts] found ${rows.length} alerts for userId=${userId}`);

    const baseUrl = getAlertImagePublicBaseUrl() || getPublicBaseUrl(req);
    const data = rows.map((row) => ({
      ...row,
      image_urls: row.image_path ? buildImageUrls(baseUrl, row.image_path) : [],
      image_url: row.image_path
        ? buildImageUrls(baseUrl, row.image_path)[0]
        : null,
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error("getAlerts error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
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
      [id, userId],
    );

    if (check.length === 0) {
      return res
        .status(403)
        .json({ success: false, message: "Không có quyền truy cập" });
    }

    await db.query("UPDATE alerts SET is_resolved = TRUE WHERE id = ?", [id]);
    res.json({ success: true, message: "Đã xử lý cảnh báo" });
  } catch (error) {
    console.error("resolveAlert error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// POST /api/alerts/notify — THÊM MỚI
// Python/Flask gọi route này khi phát hiện xâm nhập
const receiveAlert = async (req, res) => {
  try {
    const {
      object_type,
      camera_name,
      zone_id,
      confidence,
      image_path,
      image_url,
      image_urls,
      image_base64,
      image_filename,
      message,
      source,
      secret, // khoá bí mật để xác thực từ Python
    } = req.body;

    // Xác thực secret key — Python phải gửi đúng key này
    const configuredSecret = process.env.INTERNAL_SECRET;
    if (isConfiguredSecret(configuredSecret) && secret !== configuredSecret) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const imagePublicBaseUrl =
      getAlertImagePublicBaseUrl() || getPublicBaseUrl(req);
    const normalizedImageUrls = [
      ...(Array.isArray(image_urls) ? image_urls : []),
      image_url,
    ].filter(Boolean);

    const fallbackImageUrls = image_path
      ? buildImageUrls(imagePublicBaseUrl, image_path)
      : [];

    const relayImageUrls = [
      ...new Set([...normalizedImageUrls, ...fallbackImageUrls]),
    ];
    const relayImageUrl = relayImageUrls[0] || null;

    const socketPayload = {
      object_type: object_type || "unknown",
      camera_name: camera_name || "Camera",
      zone_id: zone_id || null,
      confidence: confidence ?? null,
      image_path: image_path || null,
      image_url: relayImageUrl,
      image_urls: relayImageUrls,
      message: message || null,
      created_at: new Date().toISOString(),
      source: source || "python-backend",
    };

    const socketEmitted = broadcastNewAlert(socketPayload);

    // Send Telegram and return delivery stats for easier integration debugging.
    const telegram = await notifyAlert({
      objectType: object_type,
      cameraName: camera_name,
      confidence,
      imagePath: image_path,
      imageUrl: relayImageUrl,
      imageUrls: relayImageUrls,
      imageBase64: image_base64,
      imageFilename: image_filename,
    });

    res.json({ ok: true, telegram, socket_emitted: socketEmitted });
  } catch (error) {
    console.error("receiveAlert error:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// POST /api/alerts/seed — seed dữ liệu mẫu cho user (chỉ dev)
const seedSampleAlerts = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`[seedSampleAlerts] userId=${userId}`);

    // 1. Kiểm tra/tạo camera mẫu
    const [cameraCheck] = await db.query(
      `SELECT id FROM cameras WHERE camera_name = ? LIMIT 1`,
      ["Camera Mẫu"],
    );
    let cameraId;
    if (cameraCheck.length > 0) {
      cameraId = cameraCheck[0].id;
      console.log(`[seedSampleAlerts] existing camera id=${cameraId}`);
    } else {
      const [cameraInsert] = await db.query(
        `INSERT INTO cameras (camera_name, rtsp_url, status, is_online, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        ["Camera Mẫu", "rtsp://camera-sample:554/stream", "online", 1, 1],
      );
      cameraId = cameraInsert.insertId;
      console.log(`[seedSampleAlerts] created camera id=${cameraId}`);
    }

    // 2. Kiểm tra/tạo user_camera_access
    const [accessCheck] = await db.query(
      `SELECT id FROM user_camera_access WHERE user_id = ? AND camera_id = ?`,
      [userId, cameraId],
    );
    if (accessCheck.length === 0) {
      const [accessInsert] = await db.query(
        `INSERT INTO user_camera_access (user_id, camera_id, access_level) VALUES (?, ?, ?)`,
        [userId, cameraId, "owner"],
      );
      console.log(
        `[seedSampleAlerts] created access id=${accessInsert.insertId}`,
      );
    } else {
      console.log(`[seedSampleAlerts] access already exists`);
    }

    // 3. Tạo sample alerts
    const sampleAlerts = [
      {
        object: "Child",
        confidence: 0.92,
        imagePath: "static/sample1.jpg",
        zone: "zone-main",
      },
      {
        object: "Adult",
        confidence: 0.85,
        imagePath: "static/sample2.jpg",
        zone: "zone-entrance",
      },
      {
        object: "Child",
        confidence: 0.78,
        imagePath: "static/sample3.jpg",
        zone: null,
      },
    ];

    const now = new Date();
    for (let i = 0; i < sampleAlerts.length; i++) {
      const alert = sampleAlerts[i];
      const createdAt = new Date(now.getTime() - (i + 1) * 300000); // 5 min apart
      await db.query(
        `INSERT INTO alerts (camera_id, zone_id, object_type, confidence, image_path, is_resolved, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          cameraId,
          alert.zone,
          alert.object,
          alert.confidence,
          alert.imagePath,
          0,
          createdAt,
        ],
      );
    }
    console.log(
      `[seedSampleAlerts] created ${sampleAlerts.length} sample alerts`,
    );

    res.json({
      success: true,
      message: "Dữ liệu mẫu đã được tạo thành công",
      camera_id: cameraId,
      alerts_count: sampleAlerts.length,
    });
  } catch (error) {
    console.error("[seedSampleAlerts] error:", error);
    res.status(500).json({ message: "Lỗi seed data", error: error.message });
  }
};

// GET /api/alerts/debug — kiểm tra user, camera, và quyền truy cập
const getAlertsDebug = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`[getAlertsDebug] userId=${userId}`);

    // Kiểm tra user tồn tại
    const [users] = await db.query(
      `SELECT id, username, email FROM users WHERE id = ?`,
      [userId],
    );
    console.log(`[getAlertsDebug] users found:`, users.length);

    // Kiểm tra tất cả cameras
    const [cameras] = await db.query(`SELECT id, camera_name FROM cameras`);
    console.log(`[getAlertsDebug] total cameras:`, cameras.length);

    // Kiểm tra user_camera_access
    const [accesses] = await db.query(
      `SELECT uca.id, uca.user_id, uca.camera_id, uca.access_level, c.camera_name
       FROM user_camera_access uca
       JOIN cameras c ON uca.camera_id = c.id
       WHERE uca.user_id = ?`,
      [userId],
    );
    console.log(`[getAlertsDebug] user camera access:`, accesses.length);

    // Kiểm tra tất cả alerts
    const [allAlerts] = await db.query(
      `SELECT id, camera_id, object_type, created_at FROM alerts LIMIT 10`,
    );
    console.log(`[getAlertsDebug] total alerts (latest 10):`, allAlerts.length);

    // Kiểm tra alerts mà user có quyền truy cập
    const [userAlerts] = await db.query(
      `SELECT a.id, a.camera_id, a.object_type, a.created_at, c.camera_name
       FROM alerts a
       JOIN user_camera_access uca ON a.camera_id = uca.camera_id
       WHERE uca.user_id = ?
       LIMIT 10`,
      [userId],
    );
    console.log(`[getAlertsDebug] user accessible alerts:`, userAlerts.length);

    res.json({
      user: users[0] || { id: userId, username: "[not found]" },
      total_cameras: cameras.length,
      user_camera_access_count: accesses.length,
      user_camera_access: accesses,
      total_alerts_in_db: allAlerts.length,
      user_accessible_alerts_count: userAlerts.length,
      user_accessible_alerts: userAlerts,
    });
  } catch (error) {
    console.error("[getAlertsDebug] error:", error);
    res.status(500).json({ message: "Lỗi debug", error: error.message });
  }
};

module.exports = {
  getAlerts,
  resolveAlert,
  receiveAlert,
  getAlertsDebug,
  seedSampleAlerts,
};
