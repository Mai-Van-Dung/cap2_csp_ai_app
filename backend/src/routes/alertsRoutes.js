const express = require('express');
const router = express.Router();
const { getAlerts, resolveAlert } = require('../controllers/alertsController');
const { protect } = require('../middleware/authMiddleware');

// GET  /api/alerts          — lấy danh sách alerts
router.get('/', protect, getAlerts);

// PATCH /api/alerts/:id/resolve — đánh dấu đã xử lý
router.patch('/:id/resolve', protect, resolveAlert);

module.exports = router;