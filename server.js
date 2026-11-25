"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");
const ffmpegPath = require("ffmpeg-static");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 12 },
  fileFilter: (req, file, cb) => {
    const allowed =
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("audio/");
    cb(allowed ? null : new Error("ប្រភេទឯកសារមិនគាំទ្រទេ"), allowed);
  }
});

const OUTPUT_DIR = path.join(os.tmpdir(), "khmer_ai_videos");
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// រក្សាទុកស្ថានភាពភាគរយនៃការបង្កើតវីដេអូ
const jobs = new Map();

// ==================================
// GEMINI AI SONG WRITER
// ==================================

async function writeKhmerSong({ title, topic, style, voice, details }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY មិនទាន់បានកំណត់ក្នុង Render");
  }

  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const prompt = `
អ្នកគឺជាអ្នកនិពន្ធបទចម្រៀងខ្មែរដែលមានជំនាញ។ សូមនិពន្ធបទចម្រៀងថ្មីជាភាសាខ្មែរទាំងស្រុង។
ចំណងជើង៖ ${title || "បង្កើតដោយស្វ័យប្រវត្តិ"}
ប្រធានបទ៖ ${topic || "ប្រធានបទទូទៅ"}
ប្រភេទភ្លេង៖ ${style || "Khmer Pop"}
សំឡេងច្រៀង៖ ${voice || "male"}
ព័ត៌មានបន្ថែម៖ ${details || "គ្មាន"}

សូមសរសេរឱ្យមាន [Intro], [Verse 1], [Chorus], [Verse 2], [Bridge], [Final Chorus], [Outro] ដោយមានចង្វាក់ និងពាក្យចួនពីរោះ។ កុំសរសេរការពន្យល់ក្រៅពីបទចម្រៀង។
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
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 5000 }
      })
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "Gemini AI មិនអាចបង្កើតបទចម្រៀងបាន");
  }

  const lyrics = data.candidates?.[0]?.content?.parts
    ?.map(p => p.text || "")
    .join("\n")
    .trim();

  if (!lyrics) throw new Error("AI មិនបានផ្ញើអត្ថបទចម្រៀងមកទេ");
  return lyrics;
}

// ==================================
// FFMPEG WITH PROGRESS %
// ==================================

function runFfmpegWithProgress(args, jobId, estimatedDurationSec) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args);
    let stderrLog = "";

    proc.stderr.on("data", chunk => {
      const text = chunk.toString();
      stderrLog += text;

      // គណនាភាគរយពីពេលវេលាដែល FFmpeg កំពុងដំណើរការ
      const match = text.match(/time=(\d+):(\d+):(\d+\.\d+)/);
      if (match && jobs.has(jobId)) {
        const hrs = parseFloat(match[1]);
        const mins = parseFloat(match[2]);
        const secs = parseFloat(match[3]);
        const currentSec = hrs * 3600 + mins * 60 + secs;
        const pct = Math.min(95, Math.max(15, Math.round((currentSec / estimatedDurationSec) * 80) + 15));
        const job = jobs.get(jobId);
        job.progress = pct;
        job.message = "កំពុងបង្កើតវីដេអូ និងចលនា... (" + pct + "%)";
      }
    });

    proc.on("close", code => {
      if (code === 0) {
        resolve();
      } else {
        console.error("FFmpeg stderr:", stderrLog.slice(-1000));
        reject(new Error("FFmpeg មិនអាចបង្កើតវីដេអូបានទេ (Code " + code + ")"));
      }
    });

    proc.on("error", err => {
      reject(err);
    });
  });
}

// ==================================
// MAIN WEB INTERFACE
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
body{margin:0;background:#080d18;color:white;font-family:Arial,sans-serif}
header{padding:20px;background:#111b2c;border-bottom:1px solid #26364d}
h1{color:#27d8ee;font-size:22px;margin:0 0 5px}
main{padding:16px;max-width:750px;margin:auto}
.card{background:#111b2c;padding:18px;border:1px solid #26364d;border-radius:15px;margin-bottom:17px}
h2{font-size:18px;color:#35d9ef;margin-top:0}
label{display:block;margin:14px 0 7px;font-size:14px;color:#d6e4f0}
input,textarea,select{width:100%;padding:12px;border-radius:9px;background:#091321;color:white;border:1px solid #35465c;font-size:15px}
textarea{min-height:110px}
button,.download-btn{display:block;width:100%;padding:14px;border:0;border-radius:10px;background:#08b9d2;color:#001018;font-size:16px;text-align:center;font-weight:bold;margin-top:12px;text-decoration:none;cursor:pointer}
button:disabled{opacity:.5;cursor:not-allowed}
.secondary{background:#263a53;color:white}
#status{color:#39e5b0;white-space:pre-wrap;font-size:14px;margin-top:10px}
#lyrics{min-height:260px;line-height:1.7}
video{width:100%;max-height:460px;border-radius:10px;margin-top:10px;background:#000}
small{color:#9eb2c9}

/* Progress Bar */
.progress-wrap{display:none;margin-top:14px;background:#091321;border-radius:10px;overflow:hidden;border:1px solid #35465c;height:26px;position:relative}
.progress-bar{height:100%;width:0%;background:linear-gradient(90deg,#08b9d2,#39e5b0);transition:width 0.4s ease}
.progress-text{position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:bold;color:#fff;text-shadow:0 1px 3px #000}
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
<option>ការតស៊ូក្នុងជីវិត</option>
<option>ការនឹករលឹកស្រុកកំណើត</option>
<option>បទអបអរសាទរ និងកម្សាន្ត</option>
</select>

<label>ប្រភេទភ្លេង</label>
<select id="style">
<option>Khmer Pop</option>
<option>បទមនោសញ្ចេតនា</option>
<option>ភ្លេងប្រពៃណីខ្មែរ</option>
<option>Dance Music</option>
<option>Slow Rock</option>
</select>

<label>សំឡេងច្រៀង</label>
<select id="voice">
<option value="male">ប្រុស</option>
<option value="female">ស្រី</option>
<option value="duet">ប្រុស និងស្រី</option>
</select>

<button id="writeBtn" onclick="generateSong()">✍️ AI សរសេរបទចម្រៀង</button>
<label>អត្ថបទចម្រៀង</label>
<textarea id="lyrics" placeholder="បទចម្រៀងនឹងបង្ហាញនៅទីនេះ..."></textarea>
<button class="secondary" onclick="copyLyrics()">📋 ចម្លងអត្ថបទចម្រៀង</button>
</section>

<section class="card">
<h2>02 - បញ្ចូលរូបភាព និងបទចម្រៀងបង្កើតវីដេអូ</h2>

<label>១. បញ្ចូលរូបភាព (១ ឬច្រើនសន្លឹក)</label>
<input type="file" id="images" accept="image/*" multiple>

<label>២. បញ្ចូលបទចម្រៀង (MP3 / WAV ដែលមានរួចហើយ)</label>
<input type="file" id="audio" accept="audio/*">

<label>៣. ទំហំវីដេអូ</label>
<select id="format">
<option value="9:16">បញ្ឈរ 9:16 (TikTok / Reels)</option>
<option value="16:9">ផ្ដេក 16:9 (YouTube)</option>
</select>

<label>៤. ប្រភេទចលនាវីដេអូ</label>
<select id="motion">
<option value="zoom">មានចលនា Zoom រលូន (ណែនាំ)</option>
<option value="static">រូបភាពនឹង (លឿនបំផុត)</option>
</select>

<button id="videoBtn" onclick="makeVideo()">🎬 បង្កើតវីដេអូពេញបទ</button>

<div class="progress-wrap" id="progressWrap">
  <div class="progress-bar" id="progressBar"></div>
  <div class="progress-text" id="progressText">0%</div>
</div>
</section>

<section class="card">
<h2>03 - លទ្ធផលវីដេអូ</h2>
<div id="result">មិនទាន់មានលទ្ធផល</div>
<p id="status">ប្រព័ន្ធរង់ចាំ...</p>
</section>

</main>

<script>
async function generateSong() {
  var btn = document.getElementById("writeBtn");
  var status = document.getElementById("status");
  btn.disabled = true;
  btn.textContent = "⏳ កំពុងសរសេរបទចម្រៀង...";
  status.textContent = "កំពុងទាក់ទង Gemini AI...";

  try {
    var res = await fetch("/api/song/write", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        title: document.getElementById("title").value,
        topic: document.getElementById("topic").value,
        style: document.getElementById("style").value,
        voice: document.getElementById("voice").value
      })
    });
    var data = await res.json();
    if (!res.ok) throw new Error(data.message || "មានបញ្ហា");
    document.getElementById("lyrics").value = data.lyrics;
    status.textContent = "បានសរសេរបទចម្រៀងជោគជ័យ!";
  } catch (err) {
    status.textContent = "បញ្ហា៖ " + err.message;
  }

  btn.disabled = false;
  btn.textContent = "✍️ AI សរសេរបទចម្រៀង";
}

function copyLyrics() {
  var text = document.getElementById("lyrics").value;
  if (!text.trim()) return;
  navigator.clipboard.writeText(text);
  document.getElementById("status").textContent = "បានចម្លងអត្ថបទចម្រៀងហើយ!";
}

function setProgress(pct, msg) {
  var wrap = document.getElementById("progressWrap");
  var bar = document.getElementById("progressBar");
  var txt = document.getElementById("progressText");
  wrap.style.display = "block";
  bar.style.width = pct + "%";
  txt.textContent = pct + "%";
  if (msg) document.getElementById("status").textContent = msg;
}

async function makeVideo() {
  var files = document.getElementById("images").files;
  var audioFile = document.getElementById("audio").files[0];
  var btn = document.getElementById("videoBtn");
  var resultBox = document.getElementById("result");

  if (!files.length) {
    document.getElementById("status").textContent = "សូមបញ្ចូលរូបភាពយ៉ាងតិច ១ សន្លឹកជាមុន";
    return;
  }

  btn.disabled = true;
  btn.textContent = "⏳ កំពុងបង្កើតវីដេអូ...";
  resultBox.textContent = "កំពុងដំណើរការ...";
  setProgress(5, "កំពុងបញ្ជូនរូបភាព និងសំឡេងទៅម៉ាស៊ីនមេ...");

  var form = new FormData();
  for (var i = 0; i < files.length; i++) {
    form.append("images", files[i]);
  }
  if (audioFile) {
    form.append("audio", audioFile);
  }
  form.append("format", document.getElementById("format").value);
  form.append("motion", document.getElementById("motion").value);

  try {
    var res = await fetch("/api/video/create", { method: "POST", body: form });
    var data = await res.json();
    if (!res.ok) throw new Error(data.message || "មិនអាចចាប់ផ្ដើមបានទេ");

    var jobId = data.jobId;
    setProgress(15, "កំពុងរៀបចំបង្កើតវីដេអូ...");

    // តាមដានភាគរយរៀងរាល់ ១.៥ វិនាទី
    var timer = setInterval(async function() {
      try {
        var stRes = await fetch("/api/video/status/" + jobId);
        var stData = await stRes.json();

        if (stData.status === "processing") {
          setProgress(stData.progress || 20, stData.message);
        } else if (stData.status === "done") {
          clearInterval(timer);
          setProgress(100, "បង្កើតវីដេអូជោគជ័យ 100%!");
          resultBox.innerHTML =
            '<video controls playsinline preload="metadata" src="' + stData.videoUrl + '"></video>' +
            '<a class="download-btn" href="' + stData.videoUrl + '" download="khmer-music-video.mp4">⬇️ ទាញយកវីដេអូ (Download MP4)</a>';
          btn.disabled = false;
          btn.textContent = "🎬 បង្កើតវីដេអូពេញបទ";
        } else if (stData.status === "error") {
          clearInterval(timer);
          document.getElementById("status").textContent = "បញ្ហា៖ " + stData.error;
          btn.disabled = false;
          btn.textContent = "🎬 បង្កើតវីដេអូពេញបទ";
        }
      } catch (e) {
        clearInterval(timer);
        document.getElementById("status").textContent = "បញ្ហាការតភ្ជាប់៖ " + e.message;
        btn.disabled = false;
        btn.textContent = "🎬 បង្កើតវីដេអូពេញបទ";
      }
    }, 1500);

  } catch (err) {
    document.getElementById("status").textContent = "បញ្ហា៖ " + err.message;
    btn.disabled = false;
    btn.textContent = "🎬 បង្កើតវីដេអូពេញបទ";
  }
}
</script>

</body>
</html>`);
});

// ==================================
// API: WRITE SONG
// ==================================

app.post("/api/song/write", async (req, res) => {
  try {
    const lyrics = await writeKhmerSong(req.body || {});
    res.json({ ok: true, lyrics });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

// ==================================
// API: CREATE VIDEO (ASYNC + PROGRESS %)
// ==================================

app.post(
  "/api/video/create",
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "audio", maxCount: 1 }
  ]),
  (req, res) => {
    const imageFiles = req.files?.images || [];
    const audioFile = req.files?.audio?.[0] || null;

    if (!imageFiles.length) {
      return res.status(400).json({ ok: false, message: "សូមបញ្ចូលរូបភាពជាមុន" });
    }

    const jobId = Date.now().toString();
    jobs.set(jobId, {
      status: "processing",
      progress: 10,
      message: "កំពុងរក្សាទុកឯកសារ...",
      videoUrl: null,
      error: null
    });

    // ផ្ញើ jobId ត្រឡប់ទៅភ្លាមៗ ដើម្បីឱ្យទូរស័ព្ទតាមដានភាគរយបាន
    res.json({ ok: true, jobId });

    // ដំណើរការ FFmpeg នៅផ្ទៃខាងក្រោយ
    (async () => {
      const jobDir = path.join(os.tmpdir(), "job_" + jobId);
      fs.mkdirSync(jobDir, { recursive: true });

      try {
        const format = req.body.format === "16:9" ? "16:9" : "9:16";
        const useMotion = req.body.motion !== "static";
        // ប្រើទំហំសមល្មមដើម្បីកុំឱ្យ Render Free អស់ RAM
        const width = format === "16:9" ? 960 : 540;
        const height = format === "16:9" ? 540 : 960;

        const savedImages = [];
        for (let i = 0; i < imageFiles.length; i++) {
          const ext = path.extname(imageFiles[i].originalname) || ".jpg";
          const imgPath = path.join(jobDir, `img_${i}${ext}`);
          fs.writeFileSync(imgPath, imageFiles[i].buffer);
          savedImages.push(imgPath);
        }

        let audioPath = null;
        if (audioFile) {
          const ext = path.extname(audioFile.originalname) || ".mp3";
          audioPath = path.join(jobDir, `audio${ext}`);
          fs.writeFileSync(audioPath, audioFile.buffer);
        }

        const outputFileName = `video_${jobId}.mp4`;
        const outputPath = path.join(OUTPUT_DIR, outputFileName);
        const args = [];
        const estimatedSec = audioPath ? 60 : Math.max(10, savedImages.length * 5);

        if (savedImages.length === 1) {
          args.push("-loop", "1", "-i", savedImages[0]);
          if (audioPath) {
            args.push("-i", audioPath);
          } else {
            args.push("-t", "10");
          }

          const vf = useMotion
            ? `scale=${width * 2}:${height * 2}:force_original_aspect_ratio=decrease,pad=${width * 2}:${height * 2}:(ow-iw)/2:(oh-ih)/2,zoompan=z='min(zoom+0.0005,1.25)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=20,format=yuv420p`
            : `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,format=yuv420p`;

          args.push(
            "-vf", vf,
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-r", "20"
          );

          if (audioPath) {
            args.push("-c:a", "aac", "-b:a", "128k", "-shortest");
          }
          args.push("-movflags", "+faststart", "-y", outputPath);
        } else {
          const durationPerImage = 5;
          let filterComplex = "";
          for (let i = 0; i < savedImages.length; i++) {
            args.push("-loop", "1", "-t", String(durationPerImage), "-i", savedImages[i]);
            if (useMotion) {
              filterComplex += `[${i}:v]scale=${width * 2}:${height * 2}:force_original_aspect_ratio=decrease,pad=${width * 2}:${height * 2}:(ow-iw)/2:(oh-ih)/2,zoompan=z='min(zoom+0.001,1.2)':d=${durationPerImage * 20}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=20,format=yuv420p[v${i}];`;
            } else {
              filterComplex += `[${i}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=20,format=yuv420p[v${i}];`;
            }
          }
          for (let i = 0; i < savedImages.length; i++) {
            filterComplex += `[v${i}]`;
          }
          filterComplex += `concat=n=${savedImages.length}:v=1:a=0[v]`;

          if (audioPath) {
            args.push("-i", audioPath);
          }

          args.push("-filter_complex", filterComplex, "-map", "[v]");
          if (audioPath) {
            args.push("-map", `${savedImages.length}:a`, "-c:a", "aac", "-b:a", "128k", "-shortest");
          }
          args.push("-c:v", "libx264", "-preset", "ultrafast", "-movflags", "+faststart", "-y", outputPath);
        }

        await runFfmpegWithProgress(args, jobId, estimatedSec);

        fs.rmSync(jobDir, { recursive: true, force: true });

        jobs.set(jobId, {
          status: "done",
          progress: 100,
          message: "បានបង្កើតវីដេអូជោគជ័យ!",
          videoUrl: `/api/video/file/${outputFileName}`,
          error: null
        });
      } catch (err) {
        fs.rmSync(jobDir, { recursive: true, force: true });
        jobs.set(jobId, {
          status: "error",
          progress: 0,
          message: "បរាជ័យ",
          videoUrl: null,
          error: err.message
        });
      }
    })();
  }
);

// ==================================
// API: CHECK PROGRESS STATUS
// ==================================

app.get("/api/video/status/:jobId", (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ status: "error", error: "រកមិនឃើញការងារនេះទេ" });
  }
  res.json(job);
});

// ==================================
// API: STREAM & DOWNLOAD VIDEO
// ==================================

app.get("/api/video/file/:filename", (req, res) => {
  const safeName = path.basename(req.params.filename);
  const filePath = path.join(OUTPUT_DIR, safeName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send("រកមិនឃើញវីដេអូទេ");
  }
  res.setHeader("Content-Type", "video/mp4");
  res.sendFile(filePath);
});

app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.status || 500).json({ ok: false, message: err.message || "Internal Server Error" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Khmer AI Song Cover Pro running on port " + PORT);
});
          
