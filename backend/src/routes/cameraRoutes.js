const express = require("express");
const {
  getSupervisedStatus,
  toggleSupervised,
} = require("../controllers/cameraController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/supervised-status/:cameraId", protect, getSupervisedStatus);
router.post("/toggle-supervised", protect, toggleSupervised);

module.exports = router;
