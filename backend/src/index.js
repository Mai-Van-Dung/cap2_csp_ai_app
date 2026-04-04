const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const bodyParser = require("body-parser");
require("dotenv").config();
const pool = require("./config/database");
const app = express();

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
app.use("/api/auth", authRoutes);

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  try {
    const connection = await pool.getConnection();
    console.log("✅ Database connected successfully");
    connection.release();
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
  }
});
