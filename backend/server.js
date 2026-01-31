import express from "express";
import cors from "cors";
import multer from "multer";
import fetch from "node-fetch";
import FormData from "form-data";

const app = express();

// ====== CONFIG ======
const PORT = process.env.PORT || 8787;

// Security: optional simple token gate (recommended if public)
const APP_TOKEN = process.env.APP_TOKEN || ""; // set in hosting env
function requireAppToken(req, res, next) {
  if (!APP_TOKEN) return next(); // if not set, skip auth
  const token = req.headers["x-app-token"];
  if (token !== APP_TOKEN) {
    return res.status(401).json({ message: "Unauthorized (bad x-app-token)" });
  }
  next();
}

// Freepik API Key handling:
// - If FREEPIK_API_KEY set on server, UI does NOT need to send api key
// - If not set, UI may send x-freepik-api-key header (less secure)
function getFreepikKey(req) {
  return process.env.FREEPIK_API_KEY || req.headers["x-freepik-api-key"];
}

const BASE_URL = "https://api.freepik.com/v1/ai/image-to-video";

// CORS (so your Canvas/React front-end can call this backend)
app.use(cors());

// Multer for multipart/form-data image upload
const upload = multer({ storage: multer.memoryStorage() });

// Health check (used by "Connected ✅" button)
app.get("/health", (req, res) => {
  res.json({ ok: true, service: "kling-backend-proxy", ts: Date.now() });
});

// Submit task (POST)
app.post("/api/kling/:model", requireAppToken, async (req, res) => {
  try {
    const { prompt, negative_prompt, image_base64, duration, creativity } = req.body;

    if (!image_base64) {
      return res.status(400).json({ message: "Missing image_base64" });
    }

    // convert base64 → buffer
    const buffer = Buffer.from(image_base64, "base64");

    const formData = new FormData();
    formData.append("prompt", prompt);
    formData.append("negative_prompt", negative_prompt || "");
    formData.append("duration", duration);
    formData.append("creativity", creativity);

    // ⬅️ INI PENTING
    formData.append("image", buffer, {
      filename: "image.png",
      contentType: "image/png"
    });

    const r = await fetch(FREEPIK_ENDPOINT, {
      method: "POST",
      headers: {
        "x-freepik-api-key": getFreepikKey(req),
      },
      body: formData
    });

    const data = await r.json();
    res.json(data);

  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Poll task (GET)
app.get("/api/kling/:model/:id", requireAppToken, async (req, res) => {
  try {
    const { model, id } = req.params;
    const apiKey = getFreepikKey(req);

    if (!apiKey) return res.status(400).json({ message: "Missing Freepik API Key (set FREEPIK_API_KEY or send x-freepik-api-key)" });

    const r = await fetch(`${BASE_URL}/${model}/${id}`, {
      method: "GET",
      headers: { "x-freepik-api-key": apiKey },
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json(data);

    res.json(data);
  } catch (e) {
    res.status(500).json({ message: e?.message || "Server error" });
  }
});

// Root message
app.get("/", (req, res) => {
  res.type("text").send("Kling Backend Proxy is running. Try GET /health");
});

app.listen(PORT, () => {
  console.log(`Kling Backend Proxy running on port ${PORT}`);
});
