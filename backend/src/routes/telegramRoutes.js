const express = require('express');
const router  = express.Router();
const { saveChatId, testNotification } = require('../controllers/telegramController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/telegram/chat-id
router.post('/chat-id', protect, saveChatId);

// POST /api/telegram/test
router.post('/test', protect, testNotification);

module.exports = router;