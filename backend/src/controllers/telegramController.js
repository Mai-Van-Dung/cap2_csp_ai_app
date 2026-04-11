const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const sendTelegramMessage = async (chatId, text) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
      }
    );
    const data = await response.json();
    return data.ok === true;
  } catch (err) {
    console.error('Telegram error:', err.message);
    return false;
  }
};

const sendTelegramPhoto = async (chatId, imagePath, caption) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  try {
    const pythonDir = process.env.PYTHON_BACKEND_DIR ||
      'C:/Users/DucThang/Desktop/casptonse_2/cap2_csp_ai/backend';
    const absPath = path.join(pythonDir, imagePath);
    console.log('Reading file from:', absPath);
    if (!fs.existsSync(absPath)) {
      console.error('Image file not found:', absPath);
      return false;
    }
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('caption', caption);
    form.append('parse_mode', 'Markdown');
    form.append('photo', fs.createReadStream(absPath), {
      filename: path.basename(absPath),
      contentType: 'image/jpeg',
    });
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendPhoto`,
      { method: 'POST', body: form, headers: form.getHeaders() }
    );
    const data = await response.json();
    console.log('sendPhoto response:', JSON.stringify(data));
    return data.ok === true;
  } catch (err) {
    console.error('Telegram sendPhoto error:', err.message);
    return false;
  }
};

const saveChatId = async (req, res) => {
  res.json({ ok: true });
};

const testNotification = async (req, res) => {
  const chatId = req.body.chat_id || process.env.TELEGRAM_CHAT_ID;
  if (!chatId) {
    return res.status(400).json({ message: 'Chưa có Chat ID' });
  }
  const ok = await sendTelegramMessage(
    chatId,
    '✅ *Kết nối thành công!*\n\nHệ thống giám sát đã kết nối với Telegram.'
  );
  if (ok) return res.json({ ok: true });
  return res.status(500).json({ message: 'Gửi thất bại. Kiểm tra BOT_TOKEN và Chat ID.' });
};

const notifyAlert = async (objectType, cameraName, confidence, imagePath) => {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) return;
  const pct     = Math.round((confidence || 0) * 100);
  const time    = new Date().toLocaleString('vi-VN');
  const caption =
    `🚨 *CẢNH BÁO XÂM NHẬP!*\n\n` +
    `Đối tượng: *${objectType || 'Không xác định'}*\n` +
    `Camera: ${cameraName || 'Camera chính'}\n` +
    `Độ chính xác: ${pct}%\n` +
    `Thời gian: ${time}`;

  if (imagePath) {
    const ok = await sendTelegramPhoto(chatId, imagePath, caption);
    if (!ok) await sendTelegramMessage(chatId, caption);
  } else {
    await sendTelegramMessage(chatId, caption);
  }
};

module.exports = { saveChatId, testNotification, sendTelegramMessage, notifyAlert };