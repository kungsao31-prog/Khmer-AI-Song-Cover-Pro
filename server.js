
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
  limits: { fileSize: 50 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    const allowed =
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("audio/");
    cb(allowed ? null : new Error("Unsupported file type"), allowed);
  }
});

// ==================================
// GEMINI AI SONG WRITER
// ==================================

async function writeKhmerSong({ title, topic, style, voice, details }) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY មិនទាន់បានកំណត់ក្នុង Render");
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const prompt = `
អ្នកគឺជាអ្នកនិពន្ធបទចម្រៀងខ្មែរដែលមានជំនាញ។

សូមនិពន្ធបទចម្រៀងថ្មីជាភាសាខ្មែរទាំងស្រុង។

ចំណងជើងដែលចង់បាន៖ ${title || "សូមបង្កើតដោយស្វ័យប្រវត្តិ"}
ប្រធានបទ៖ ${topic || "ប្រធានបទទូទៅ"}
ប្រភេទភ្លេង៖ ${style || "Khmer Pop"}
សំឡេងច្រៀង៖ ${voice || "male"}
ព័ត៌មានបន្ថែម៖ ${details || "គ្មាន"}

តម្រូវការ៖
1. បង្កើតចំណងជើងបទចម្រៀងសមស្រប។
2. សរសេរអត្ថបទជាភាសាខ្មែរធម្មជាតិ។
3. មាន Intro, Verse 1, Chorus, Verse 2,
   Bridge, Final Chorus និង Outro។
4. ច្រៀងងាយស្រួល មានចង្វាក់ និងពាក្យចួន។
5. កុំចម្លងអត្ថបទបទចម្រៀងដែលមានស្រាប់។
6. បង្កើតអត្ថបទថ្មីពេញបទ។
7. កុំសរសេរការពន្យល់ក្រៅពីបទចម្រៀង។

សូមបង្ហាញលទ្ធផលជាទម្រង់៖
ចំណងជើង៖ ...
ប្រភេទភ្លេង៖ ...
សំឡេងច្រៀង៖ ...

[Intro]
...

[Verse 1]
...

[Chorus]
...

[Verse 2]
...

[Bridge]
...

[Final Chorus]
...

[Outro]
...
`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: prompt }] }
        ],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 5000
        }
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("Gemini error:", JSON.stringify(data));
    throw new Error(
      data.error?.message || "Gemini AI មិនអាចបង្កើតបទចម្រៀងបាន"
    );
  }

  const lyrics = data.candidates?.[0]?.content?.parts
    ?.map(part => part.text || "")
    .join("\n")
    .trim();

  if (!lyrics) {
    throw new Error("AI មិនបានផ្ញើអត្ថបទចម្រៀងមកទេ");
  }

  return lyrics;
}

// ==================================
// MAIN APP
// ==================================

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
body{
 margin:0;background:#080d18;color:white;
 font-family:Arial,sans-serif
}
header{
 padding:22px;background:#111b2c;
 border-bottom:1px solid #26364d
}
h1{color:#27d8ee;font-size:23px}
main{padding:16px;max-width:750px;margin:auto}
.card{
 background:#111b2c;padding:18px;
 border:1px solid #26364d;border-radius:15px;
 margin-bottom:17px
}
h2{font-size:18px;color:#35d9ef}
label{display:block;margin:14px 0 7px}
input,textarea,select{
 width:100%;padding:13px;border-radius:9px;
 background:#091321;color:white;
 border:1px solid #35465c;font-size:15px
}
textarea{min-height:110px}
button{
 width:100%;padding:14px;border:0;
 border-radius:10px;background:#08b9d2;
 color:#001018;font-size:16px;
 font-weight:bold;margin-top:12px
}
button:disabled{opacity:.5}
.secondary{background:#263a53;color:white}
#status{color:#39e5b0;white-space:pre-wrap}
#lyrics{min-height:350px;line-height:1.8}
small{color:#9eb2c9}
</style>
</head>

<body>
<header>
<h1>🎵 Khmer AI Song Cover Pro</h1>
<small>AI Khmer Music & Video Studio</small>
</header>

<main>

<section class="card">
<h2>01 - AI សរសេរបទចម្រៀងស្វ័យប្រវត្តិ</h2>

<label>ចំណងជើងបទចម្រៀង (អាចទុកទទេ)</label>
<input id="title" placeholder="AI អាចបង្កើតចំណងជើងឱ្យ">

<label>ប្រធានបទចម្រៀង</label>
<select id="topic">
<option>ស្នេហា និងការបែកបាក់</option>
<option>ជីវិតគ្រួសារ</option>
<option>ជីវិតស្រុកស្រែ</option>
<option>ព្រះពុទ្ធសាសនា និងសីលធម៌</option>
<option>វប្បធម៌ និងប្រពៃណីខ្មែរ</option>
<option>ការតស៊ូក្នុងជីវិត</option>
<option>ការនឹករលឹកស្រុកកំណើត</option>
<option>បទអបអរសាទរ និងកម្សាន្ត</option>
<option>គ្រប់ប្រធានបទ</option>
</select>

<label>ពិពណ៌នាបន្ថែម (អាចទុកទទេ)</label>
<input id="details" placeholder="ឧទាហរណ៍៖ ស្នេហាស្មោះត្រង់">

<label>ប្រភេទភ្លេង</label>
<select id="style">
<option>Khmer Pop</option>
<option>បទមនោសញ្ចេតនា</option>
<option>ភ្លេងប្រពៃណីខ្មែរ</option>
<option>បទស្រុកស្រែ</option>
<option>Dance Music</option>
<option>Rock</option>
<option>Slow Rock</option>
<option>Acoustic</option>
</select>

<label>សំឡេងច្រៀង</label>
<select id="voice">
<option value="male">ប្រុស</option>
<option value="female">ស្រី</option>
<option value="duet">ប្រុស និងស្រី</option>
</select>

<button id="writeBtn" onclick="generateSong()">
✍️ AI សរសេរបទចម្រៀង
</button>

<label>អត្ថបទចម្រៀងដែល AI បង្កើត</label>
<textarea id="lyrics" placeholder="បទចម្រៀងនឹងបង្ហាញនៅទីនេះ..."></textarea>

<button class="secondary" onclick="copyLyrics()">
📋 ចម្លងអត្ថបទចម្រៀង
</button>
</section>

<section class="card">
<h2>02 - Song Cover</h2>
<label>Upload បទចម្រៀងដើម</label>
<input type="file" id="audio" accept="audio/*">

<label>សំឡេង Cover</label>
<select id="coverVoice">
<option value="male">សំឡេងប្រុស</option>
<option value="female">សំឡេងស្រី</option>
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
<p id="status">ប្រព័ន្ធរង់ចាំ...</p>
</section>

</main>

<script>
async function requestAPI(url, options) {
  const status = document.getElementById("status");
  status.textContent = "កំពុងដំណើរការ...";

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    status.textContent = data.message || "ជោគជ័យ";
    return data;
  } catch (error) {
    status.textContent = "បញ្ហា៖ " + error.message;
    return null;
  }
}

async function generateSong() {
  const btn = document.getElementById("writeBtn");
  const lyricsBox = document.getElementById("lyrics");

  btn.disabled = true;
  btn.textContent = "កំពុងសរសេរបទចម្រៀង...";

  const data = await requestAPI("/api/song/write", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      title: document.getElementById("title").value,
      topic: document.getElementById("topic").value,
      details: document.getElementById("details").value,
      style: document.getElementById("style").value,
      voice: document.getElementById("voice").value
    })
  });

  if (data && data.lyrics) {
    lyricsBox.value = data.lyrics;
    document.getElementById("result").textContent =
      "បានបង្កើតអត្ថបទចម្រៀងដោយ AI ជោគជ័យ!";
  }

  btn.disabled = false;
  btn.textContent = "✍️ AI សរសេរបទចម្រៀង";
}

function copyLyrics() {
  const text = document.getElementById("lyrics").value;

  if (!text.trim()) {
    document.getElementById("status").textContent =
      "មិនទាន់មានអត្ថបទចម្រៀងទេ";
    return;
  }

  navigator.clipboard.writeText(text)
    .then(() => {
      document.getElementById("status").textContent =
        "បានចម្លងអត្ថបទចម្រៀងហើយ!";
    })
    .catch(() => {
      document.getElementById("status").textContent =
        "សូមជ្រើសរើស និងចម្លងអត្ថបទដោយដៃ";
    });
}

async function makeCover() {
  const file = document.getElementById("audio").files[0];

  if (!file) {
    document.getElementById("status").textContent =
      "សូម Upload បទចម្រៀងជាមុន";
    return;
  }

  const form = new FormData();
  form.append("audio", file);
  form.append("voice", document.getElementById("coverVoice").value);

  await requestAPI("/api/song/cover", {
    method: "POST",
    body: form
  });
}

async function makeVideo() {
  const files = document.getElementById("images").files;

  if (!files.length) {
    document.getElementById("status").textContent =
      "សូមបញ្ចូលរូបភាពជាមុន";
    return;
  }

  const form = new FormData();

  for (const file of files) {
    form.append("images", file);
  }

  form.append("format", document.getElementById("format").value);
  form.append("subtitles", document.getElementById("subtitles").value);
  form.append("lyrics", document.getElementById("lyrics").value);

  await requestAPI("/api/video/create", {
    method: "POST",
    body: form
  });
}
</script>

</body>
</html>`);
});

// ==================================
// HEALTH CHECK
// ==================================

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    name: "Khmer AI Song Cover Pro",
    status: "running",
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    elevenLabsConfigured: !!process.env.ELEVENLABS_API_KEY
  });
});

// ==================================
// GENERATE SONG AUTOMATICALLY
// ==================================

app.post("/api/song/write", async (req, res) => {
  try {
    const lyrics = await writeKhmerSong(req.body || {});

    res.json({
      ok: true,
      message: "បានសរសេរបទចម្រៀងខ្មែរជោគជ័យ!",
      lyrics
    });
  } catch (error) {
    console.error("Song writer error:", error.message);

    res.status(500).json({
      ok: false,
      message: error.message
    });
  }
});

// ==================================
// LEGACY GENERATE ENDPOINT
// ==================================

app.post("/api/song/generate", async (req, res) => {
  try {
    const lyrics = await writeKhmerSong(req.body || {});

    res.json({
      ok: true,
      message: "បានបង្កើតបទចម្រៀងជោគជ័យ!",
      lyrics
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: error.message
    });
  }
});

// ==================================
// SONG COVER - NOT CONNECTED YET
// ==================================

app.post("/api/song/cover", upload.single("audio"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      ok: false,
      message: "សូម Upload បទចម្រៀងជាមុន"
    });
  }

  res.status(501).json({
    ok: false,
    message: "មុខងារ Song Cover ត្រូវការភ្ជាប់ Voice Conversion Provider បន្ថែម"
  });
});

// ==================================
// IMAGE UPLOAD
// ==================================

app.post("/api/images/upload", upload.array("images", 10), (req, res) => {
  res.json({
    ok: true,
    count: req.files.length,
    message: "បានទទួលរូបភាពជោគជ័យ"
  });
});

// ==================================
// MUSIC VIDEO - NOT CONNECTED YET
// ==================================

app.post("/api/video/create", upload.array("images", 10), (req, res) => {
  if (!req.files || !req.files.length) {
    return res.status(400).json({
      ok: false,
      message: "សូមបញ្ចូលរូបភាពជាមុន"
    });
  }

  res.status(501).json({
    ok: false,
    message: "មុខងារ Music Video ត្រូវការភ្ជាប់ Video Rendering Provider បន្ថែម"
  });
});

// ==================================
// ERROR HANDLING
// ==================================

app.use((err, req, res, next) => {
  console.error(err.message);

  res.status(err.status || 500).json({
    ok: false,
    message: err.message || "Internal Server Error"
  });
});

// ==================================
// START SERVER
// ==================================

app.listen(PORT, "0.0.0.0", () => {
  console.log("Khmer AI Song Cover Pro running on port " + PORT);
});
