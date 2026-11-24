
"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 10
  },
  fileFilter: (req, file, cb) => {
    const allowed =
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("audio/");

    cb(allowed ? null : new Error("Unsupported file type"), allowed);
  }
});

// ================================
// MAIN APP INTERFACE
// ================================

app.get("/", (req, res) => {
  res.type("html").send(`<!DOCTYPE html>
<html lang="km">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#080d18">
<title>Khmer AI Song Cover Pro</title>
<style>
*{box-sizing:border-box}
body{margin:0;background:#080d18;color:white;font-family:Arial,sans-serif}
header{padding:22px;background:#111b2c;border-bottom:1px solid #26364d}
h1{color:#27d8ee;font-size:23px}
main{padding:16px;max-width:750px;margin:auto}
.card{background:#111b2c;padding:18px;border:1px solid #26364d;border-radius:15px;margin-bottom:17px}
h2{font-size:18px;color:#35d9ef}
label{display:block;margin:14px 0 7px}
input,textarea,select{width:100%;padding:13px;border-radius:9px;background:#091321;color:white;border:1px solid #35465c;font-size:15px}
textarea{min-height:110px}
button{width:100%;padding:14px;border:0;border-radius:10px;background:#08b9d2;color:#001018;font-size:16px;font-weight:bold;margin-top:12px}
button:disabled{opacity:.5}
small{color:#9eb2c9}
#status{color:#39e5b0;white-space:pre-wrap}
</style>
</head>
<body>
<header>
<h1>🎵 Khmer AI Song Cover Pro</h1>
<small>AI Khmer Music & Video Studio</small>
</header>
<main>

<section class="card">
<h2>01 - បង្កើតបទចម្រៀងថ្មី</h2>
<label>ចំណងជើងបទចម្រៀង</label>
<input id="title" placeholder="បញ្ចូលចំណងជើង">

<label>អត្ថបទចម្រៀងខ្មែរ</label>
<textarea id="lyrics" placeholder="សរសេរអត្ថបទចម្រៀងនៅទីនេះ..."></textarea>

<label>ប្រភេទភ្លេង</label>
<select id="style">
<option value="Khmer Pop">Khmer Pop</option>
<option value="Romantic">បទមនោសញ្ចេតនា</option>
<option value="Traditional">ភ្លេងប្រពៃណីខ្មែរ</option>
<option value="Country">បទស្រុកស្រែ</option>
<option value="Dance">Dance Music</option>
</select>

<label>សំឡេងច្រៀង</label>
<select id="voice">
<option value="male">ប្រុស</option>
<option value="female">ស្រី</option>
<option value="duet">ប្រុស និងស្រី</option>
</select>
<button onclick="generateSong()">🎵 បង្កើតបទចម្រៀង</button>
</section>

<section class="card">
<h2>02 - Song Cover</h2>
<label>Upload បទចម្រៀងដើម</label>
<input type="file" id="audio" accept="audio/*">
<label>សំឡេង Cover</label>
<select id="coverVoice">
<option value="male">ប្រុស</option>
<option value="female">ស្រី</option>
</select>
<button onclick="makeCover()">🎤 បង្កើត Song Cover</button>
</section>

<section class="card">
<h2>03 - AI Music Video</h2>
<label>បញ្ចូលរូបភាព</label>
<input type="file" id="images" accept="image/*" multiple>

<label>ទំហំវីដេអូ</label>
<select id="format">
<option value="9:16">បញ្ឈរ 9:16</option>
<option value="16:9">ផ្ដេក 16:9</option>
</select>

<label>អក្សរចម្រៀង</label>
<select id="subtitles">
<option value="yes">បង្ហាញអក្សរខ្មែរ</option>
<option value="no">មិនបង្ហាញ</option>
</select>

<button onclick="makeVideo()">🎬 បង្កើតវីដេអូពេញបទ</button>
</section>

<section class="card">
<h2>04 - លទ្ធផល</h2>
<div id="result">មិនទាន់មានលទ្ធផល</div>
<p id="status">កំពុងរង់ចាំ...</p>
</section>

</main>

<script>
async function requestAPI(url, options) {
  const status = document.getElementById("status");
  status.textContent = "កំពុងដំណើរការ...";
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || data.error || "Request failed");
    status.textContent = data.message || "ជោគជ័យ";
    return data;
  } catch (error) {
    status.textContent = "បញ្ហា៖ " + error.message;
  }
}

async function generateSong() {
  const title = document.getElementById("title").value;
  const lyrics = document.getElementById("lyrics").value;
  if (!lyrics.trim()) {
    document.getElementById("status").textContent = "សូមបញ្ចូលអត្ថបទចម្រៀង";
    return;
  }
  await requestAPI("/api/song/generate", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      title, lyrics,
      style:document.getElementById("style").value,
      voice:document.getElementById("voice").value
    })
  });
}

async function makeCover() {
  const file = document.getElementById("audio").files[0];
  if (!file) {
    document.getElementById("status").textContent = "សូម Upload បទចម្រៀងជាមុន";
    return;
  }
  const form = new FormData();
  form.append("audio", file);
  form.append("voice", document.getElementById("coverVoice").value);
  await requestAPI("/api/song/cover", {method:"POST",body:form});
}

async function makeVideo() {
  const files = document.getElementById("images").files;
  if (!files.length) {
    document.getElementById("status").textContent = "សូមបញ្ចូលរូបភាពជាមុន";
    return;
  }
  const form = new FormData();
  for (const file of files) form.append("images", file);
  form.append("format", document.getElementById("format").value);
  form.append("subtitles", document.getElementById("subtitles").value);
  await requestAPI("/api/video/create", {method:"POST",body:form});
}
</script>
</body>
</html>`);
});

// ================================
// API HEALTH
// ================================

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    name: "Khmer AI Song Cover Pro",
    status: "running"
  });
});

// ================================
// AI SONG GENERATION
// ================================

app.post("/api/song/generate", (req, res) => {
  const { title, lyrics, style, voice } = req.body;

  if (!lyrics || !lyrics.trim()) {
    return res.status(400).json({
      ok: false,
      message: "Please enter song lyrics"
    });
  }

  res.status(501).json({
    ok: false,
    message: "AI Music Provider integration is pending"
  });
});

// ================================
// AI SONG COVER
// ================================

app.post("/api/song/cover", upload.single("audio"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      ok: false,
      message: "Please upload an audio file"
    });
  }

  res.status(501).json({
    ok: false,
    message: "AI Voice Cover Provider integration is pending"
  });
});

// ================================
// IMAGE UPLOAD
// ================================

app.post("/api/images/upload", upload.array("images", 10), (req, res) => {
  res.json({
    ok: true,
    count: req.files.length,
    message: "Images received successfully"
  });
});

// ================================
// AI MUSIC VIDEO
// ================================

app.post("/api/video/create", upload.array("images", 10), (req, res) => {
  if (!req.files || !req.files.length) {
    return res.status(400).json({
      ok: false,
      message: "Please upload images"
    });
  }

  res.status(501).json({
    ok: false,
    message: "AI Video Provider and MP4 rendering integration is pending"
  });
});

// ================================
// ERROR HANDLING
// ================================

app.use((err, req, res, next) => {
  console.error(err.message);

  res.status(err.status || 500).json({
    ok: false,
    message: err.message || "Internal Server Error"
  });
});

// ================================
// START SERVER
// ================================

app.listen(PORT, "0.0.0.0", () => {
  console.log("Khmer AI Song Cover Pro running on port " + PORT);
});
