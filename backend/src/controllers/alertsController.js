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

module.exports = { getAlerts, resolveAlert, receiveAlert };
