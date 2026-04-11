const sendTelegramMessage = async (chatId, text) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'Markdown',
        }),
      }
    );
    const data = await response.json();
    return data.ok === true;
  } catch (err) {
    console.error('Telegram error:', err.message);
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

const notifyAlert = async (objectType, cameraName, confidence) => {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) return;

  const pct  = Math.round((confidence || 0) * 100);
  const time = new Date().toLocaleString('vi-VN');
  const text =
    `🚨 *CẢNH BÁO XÂM NHẬP!*\n\n` +
    `Đối tượng: *${objectType || 'Không xác định'}*\n` +
    `Camera: ${cameraName || 'Camera chính'}\n` +
    `Độ chính xác: ${pct}%\n` +
    `Thời gian: ${time}`;

  await sendTelegramMessage(chatId, text);
};

module.exports = { saveChatId, testNotification, sendTelegramMessage, notifyAlert };