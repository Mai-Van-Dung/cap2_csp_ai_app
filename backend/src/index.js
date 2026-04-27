const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const authRoutes = require("./routes/authRoutes");
const alertsRoutes = require("./routes/alertsRoutes");
const bodyParser = require("body-parser");
const telegramRoutes = require("./routes/telegramRoutes");
const { initSocket } = require("./realtime/socket");
require("dotenv").config();
const pool = require("./config/database");
const app = express();
const server = http.createServer(app);

const trimTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");

const isHttpUrl = (value) => /^https?:\/\//i.test(String(value || ""));

const normalizeBaseUrl = (value) => {
  const trimmed = trimTrailingSlash(value);
  if (!trimmed) return "";
  try {
    return new URL(trimmed).origin;
  } catch {
    return "";
  }
};

const mapBaseToPort = (value, port) => {
  const base = normalizeBaseUrl(value);
  if (!base) return "";
  try {
    const parsed = new URL(base);
    return `${parsed.protocol}//${parsed.hostname}:${port}`;
  } catch {
    return "";
  }
};

const unique = (items) => [...new Set(items.filter(Boolean))];

const buildConnectionInfo = (req) => {
  const publicBaseUrl = normalizeBaseUrl(
    process.env.PUBLIC_BASE_URL || process.env.BASE_URL || "",
  );
  const cameraBaseUrl = normalizeBaseUrl(
    process.env.ALERT_IMAGE_PUBLIC_BASE_URL ||
      process.env.CAMERA_PUBLIC_BASE_URL ||
      process.env.PUBLIC_BASE_URL ||
      process.env.BASE_URL ||
      "",
  );
  const requestHost = normalizeBaseUrl(
    `${req.headers["x-forwarded-proto"] || req.protocol}://${req.get("host")}`,
  );

  const candidateBases = unique([
    cameraBaseUrl,
    mapBaseToPort(publicBaseUrl, 5000),
    publicBaseUrl,
    mapBaseToPort(requestHost, 5000),
    "http://10.0.2.2:5000",
    "http://127.0.0.1:5000",
    "http://localhost:5000",
  ]).filter(isHttpUrl);

  const preferredBaseUrl = candidateBases[0] || "";

  return {
    status: "success",
    preferred_base_url: preferredBaseUrl,
    base_candidates: candidateBases,
    camera: {
      viewer_path: "/viewer/camera",
      video_feed_path: "/video_feed",
      status_path: "/status",
      viewer_url: preferredBaseUrl
        ? `${trimTrailingSlash(preferredBaseUrl)}/viewer/camera?label=${encodeURIComponent("Camera chinh")}`
        : "",
    },
    socket: {
      path: "/socket.io",
      event: "new_alert",
      handshake_url: publicBaseUrl || requestHost || "",
    },
  };
};

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Define port
const PORT = process.env.PORT || 5003;

// Routes placeholder
app.get("/", (req, res) => {
  res.json({ message: "CAPS AI App Backend API" });
});
app.get("/status", (req, res) => {
  res.json({ ok: true, service: "caps-backend", port: PORT });
});
app.get("/api/connection-info", (req, res) => {
  res.json(buildConnectionInfo(req));
});
app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "caps-backend", port: PORT });
});
app.use("/api/auth", authRoutes);
app.use("/api/alerts", alertsRoutes);
app.use("/api/telegram", telegramRoutes);
app.use("/static", express.static(path.join(__dirname, "../static")));

initSocket(server);

server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  try {
    const connection = await pool.getConnection();
    console.log("✅ Database connected successfully");
    connection.release();
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
  }
});
