const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const db = require("../database/db");
const CHAT_ID_PATTERN = /^-?\d{6,20}$/;

const normalizeChatId = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const isValidChatIdFormat = (chatId) => CHAT_ID_PATTERN.test(chatId);

const getStoredChatIds = async () => {
  try {
    const [rows] = await db.query(
      "SELECT telegram_chat_id FROM users WHERE telegram_chat_id IS NOT NULL AND telegram_chat_id <> ''",
    );
    return rows
      .map((row) => normalizeChatId(row.telegram_chat_id))
      .filter(Boolean);
  } catch (error) {
    console.error("Failed to load Telegram chat ids from DB:", error.message);
    return [];
  }
};

const getAlertRecipientChatIds = async () => {
  const fromEnv = normalizeChatId(process.env.TELEGRAM_CHAT_ID);
  const fromDb = await getStoredChatIds();
  return [...new Set([fromEnv, ...fromDb].filter(isValidChatIdFormat))];
};

const normalizeImageRelativePath = (value) => {
  const raw = String(value || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
  if (!raw) return "";
  return raw.startsWith("static/") ? raw : `static/${raw}`;
};

const getAlertImagePublicBaseUrl = () => {
  return String(
    process.env.ALERT_IMAGE_PUBLIC_BASE_URL ||
      process.env.PUBLIC_BASE_URL ||
      process.env.BASE_URL ||
      "",
  )
    .trim()
    .replace(/\/+$/, "");
};

const getImageBaseDirs = () => {
  const dirs = [
    process.env.ALERT_IMAGE_BASE_DIR,
    process.env.PYTHON_BACKEND_DIR,
    process.cwd(),
    path.join(process.cwd(), "backend"),
    path.join(__dirname, "..", ".."),
  ];

  return [...new Set(dirs.map((dir) => normalizeChatId(dir)).filter(Boolean))];
};

const resolveImageAbsolutePath = (imagePath) => {
  const rawPath = String(imagePath || "").trim();
  if (!rawPath) return "";

  const normalizedPath = normalizeImageRelativePath(rawPath);
  const baseDirs = getImageBaseDirs();
  const relativeCandidates = [
    normalizedPath,
    normalizedPath.replace(/^static[\/]/, ""),
    path.join("static", normalizedPath.replace(/^static[\/]/, "")),
  ];

  const candidates = [
    ...relativeCandidates,
    ...baseDirs.flatMap((baseDir) => [
      path.join(baseDir, normalizedPath),
      path.join(baseDir, normalizedPath.replace(/^static[\/]/, "")),
      path.join(baseDir, "static", normalizedPath.replace(/^static[\/]/, "")),
    ]),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return "";
};

const buildPublicImageUrls = (imagePath) => {
  const baseUrl = getAlertImagePublicBaseUrl();
  const rawPath = normalizeImageRelativePath(imagePath);
  if (!baseUrl || !rawPath) return [];

  return [
    ...new Set(
      [
        `${baseUrl}/${rawPath}`,
        `${baseUrl}/${rawPath.replace(/^static\//, "")}`,
      ].filter(Boolean),
    ),
  ];
};

const fetchImageBufferFromUrl = async (imageUrl) => {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    return await response.buffer();
  } catch (error) {
    console.error(
      "Failed to fetch image from public URL:",
      imageUrl,
      error.message,
    );
    return null;
  }
};

const isBase64Image = (value) => {
  const normalized = String(value || "").trim();
  return (
    normalized.startsWith("data:image/") ||
    /^[A-Za-z0-9+/=\r\n]+$/.test(normalized)
  );
};

const base64ToBuffer = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized) return null;

  const raw = normalized.startsWith("data:image/")
    ? normalized.split(",")[1] || ""
    : normalized;

  if (!raw) return null;

  return Buffer.from(raw, "base64");
};

const sendTelegramMessage = async (chatId, text) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      },
    );
    const data = await response.json();
    if (!data.ok) {
      console.error("Telegram sendMessage failed:", JSON.stringify(data));
    }
    return data.ok === true;
  } catch (err) {
    console.error("Telegram error:", err.message);
    return false;
  }
};

const sendTelegramPhoto = async (chatId, payload) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  try {
    const imagePath = payload?.imagePath || payload?.image_path || "";
    const imageUrl = payload?.imageUrl || payload?.image_url || "";
    const imageUrls = Array.isArray(payload?.imageUrls)
      ? payload.imageUrls
      : Array.isArray(payload?.image_urls)
        ? payload.image_urls
        : [];
    const imageBase64 = payload?.imageBase64 || payload?.image_base64 || "";
    const caption = payload?.caption || "";
    const imageFilename =
      payload?.imageFilename ||
      payload?.image_filename ||
      path.basename(
        String(imagePath || imageUrl || "alert.jpg").replace(/\\/g, "/"),
      ) ||
      "alert.jpg";

    let photoSource = null;

    if (imageBase64 && isBase64Image(imageBase64)) {
      photoSource = base64ToBuffer(imageBase64);
      console.log("Reading image from base64 payload");
    }

    if (!photoSource && imageUrl) {
      photoSource = await fetchImageBufferFromUrl(imageUrl);
      if (photoSource) {
        console.log("Reading file from provided image_url:", imageUrl);
      }
    }

    if (!photoSource && imageUrls.length > 0) {
      for (const candidateUrl of imageUrls) {
        const buffer = await fetchImageBufferFromUrl(candidateUrl);
        if (buffer) {
          photoSource = buffer;
          console.log("Reading file from image_urls candidate:", candidateUrl);
          break;
        }
      }
    }

    const absPath = !photoSource ? resolveImageAbsolutePath(imagePath) : "";

    if (!photoSource && absPath && fs.existsSync(absPath)) {
      photoSource = fs.createReadStream(absPath);
      console.log("Reading file from local path:", absPath);
    }

    if (!photoSource && imagePath) {
      const publicUrls = buildPublicImageUrls(imagePath);
      for (const imageUrl of publicUrls) {
        const buffer = await fetchImageBufferFromUrl(imageUrl);
        if (buffer) {
          photoSource = buffer;
          console.log("Reading file from public URL:", imageUrl);
          break;
        }
      }

      if (!photoSource) {
        console.error("Image file not found for image_path:", imagePath);
        return false;
      }
    }
    const form = new FormData();
    form.append("chat_id", chatId);
    form.append("caption", caption);
    form.append("photo", photoSource, {
      filename: imageFilename,
      contentType: "image/jpeg",
    });
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendPhoto`,
      { method: "POST", body: form, headers: form.getHeaders() },
    );
    const data = await response.json();
    if (!data.ok) {
      console.error("Telegram sendPhoto failed:", JSON.stringify(data));
    }
    return data.ok === true;
  } catch (err) {
    console.error("Telegram sendPhoto error:", err.message);
    return false;
  }
};

const saveChatId = async (req, res) => {
  try {
    const chatId = normalizeChatId(req.body?.chat_id);
    if (!chatId) {
      return res.status(400).json({ message: "Chưa có Chat ID" });
    }

    if (!isValidChatIdFormat(chatId)) {
      return res.status(400).json({
        message: "Chat ID không đúng định dạng. Ví dụ: 6333686779 hoặc -100...",
      });
    }

    const verifyOk = await sendTelegramMessage(
      chatId,
      "✅ Đã liên kết Chat ID thành công với hệ thống cảnh báo.",
    );
    if (!verifyOk) {
      return res.status(400).json({
        message:
          "Không gửi được tới Chat ID này. Hãy mở bot và gửi /start trước.",
      });
    }

    await db.query("UPDATE users SET telegram_chat_id = ? WHERE id = ?", [
      chatId,
      req.user.id,
    ]);

    res.json({ ok: true, chat_id: chatId });
  } catch (error) {
    console.error("saveChatId error:", error.message);
    res.status(500).json({ message: "Không lưu được Chat ID" });
  }
};

const testNotification = async (req, res) => {
  const chatId = normalizeChatId(
    req.body.chat_id || process.env.TELEGRAM_CHAT_ID,
  );
  if (!chatId) {
    return res.status(400).json({ message: "Chưa có Chat ID" });
  }
  if (!isValidChatIdFormat(chatId)) {
    return res.status(400).json({ message: "Chat ID không đúng định dạng" });
  }
  const ok = await sendTelegramMessage(
    chatId,
    "✅ *Kết nối thành công!*\n\nHệ thống giám sát đã kết nối với Telegram.",
  );
  if (ok) return res.json({ ok: true });
  return res
    .status(500)
    .json({ message: "Gửi thất bại. Kiểm tra BOT_TOKEN và Chat ID." });
};

const notifyAlert = async (payload = {}) => {
  const objectType = payload.objectType || payload.object_type;
  const cameraName = payload.cameraName || payload.camera_name;
  const confidence = payload.confidence;
  const imagePath = payload.imagePath || payload.image_path;
  const imageUrl = payload.imageUrl || payload.image_url;
  const imageUrls = payload.imageUrls || payload.image_urls || [];
  const imageBase64 = payload.imageBase64 || payload.image_base64;
  const imageFilename = payload.imageFilename || payload.image_filename;

  const recipientIds = await getAlertRecipientChatIds();
  if (recipientIds.length === 0) {
    console.warn(
      "Telegram alert skipped: no chat id configured in env or users table",
    );
    return { sent: 0, failed: 0, total: 0 };
  }

  const pct = Math.round((confidence || 0) * 100);
  const time = new Date().toLocaleString("vi-VN");
  const caption =
    `CẢNH BÁO XÂM NHẬP!\n\n` +
    `Đối tượng: ${objectType || "Không xác định"}\n` +
    `Camera: ${cameraName || "Camera chính"}\n` +
    `Độ chính xác: ${pct}%\n` +
    `Thời gian: ${time}`;

  let sent = 0;
  let failed = 0;

  const hasImagePayload = Boolean(imagePath || imageUrl || imageBase64);

  for (const chatId of recipientIds) {
    if (hasImagePayload) {
      const ok = await sendTelegramPhoto(chatId, {
        imagePath,
        imageUrl,
        imageUrls,
        imageBase64,
        imageFilename,
        caption,
      });
      if (!ok) {
        const fallbackOk = await sendTelegramMessage(chatId, caption);
        if (fallbackOk) sent += 1;
        else failed += 1;
      } else {
        sent += 1;
      }
      continue;
    }

    const ok = await sendTelegramMessage(chatId, caption);
    if (ok) sent += 1;
    else failed += 1;
  }

  return { sent, failed, total: recipientIds.length };
};

module.exports = {
  saveChatId,
  testNotification,
  sendTelegramMessage,
  notifyAlert,
};
