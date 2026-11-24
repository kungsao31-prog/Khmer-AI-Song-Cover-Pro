
"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "5mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 10
  }
});

app.get("/", (req, res) => {
  res.json({
    name: "Khmer AI Song Cover Pro",
    status: "running",
    version: "1.0.0"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "Khmer AI Song Cover Pro Backend Ready"
  });
});

// Song generation endpoint
app.post("/api/song/generate", (req, res) => {
  res.status(501).json({
    ok: false,
    message: "AI music provider integration is pending"
  });
});

// Song cover endpoint
app.post("/api/song/cover", (req, res) => {
  res.status(501).json({
    ok: false,
    message: "AI cover provider integration is pending"
  });
});

// Image upload endpoint
app.post("/api/images/upload", upload.array("images", 10), (req, res) => {
  res.json({
    ok: true,
    count: req.files.length,
    message: "Images received successfully"
  });
});

// Music video endpoint
app.post("/api/video/create", (req, res) => {
  res.status(501).json({
    ok: false,
    message: "AI video rendering integration is pending"
  });
});

app.use((err, req, res, next) => {
  console.error(err.message);

  res.status(err.status || 500).json({
    ok: false,
    error: err.message || "Internal server error"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Khmer AI Song Cover Pro running on port ${PORT}`);
});
  
