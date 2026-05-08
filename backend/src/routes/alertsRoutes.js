const express = require("express");
const router = express.Router();
// ✅ Thêm receiveAlert
const {
  getAlerts,
  resolveAlert,
  receiveAlert,
  getAlertsDebug,
  seedSampleAlerts,
} = require("../controllers/alertsController");
const { protect } = require("../middleware/authMiddleware");

// GET  /api/alerts          — lấy danh sách alerts
router.get("/", protect, getAlerts);

// GET  /api/alerts/debug    — kiểm tra user, camera, access
router.get("/debug", protect, getAlertsDebug);

// POST /api/alerts/seed     — seed dữ liệu mẫu (dev only)
router.post("/seed", protect, seedSampleAlerts);

// PATCH /api/alerts/:id/resolve — đánh dấu đã xử lý
router.patch("/:id/resolve", protect, resolveAlert);
router.post("/notify", receiveAlert);

module.exports = router;
