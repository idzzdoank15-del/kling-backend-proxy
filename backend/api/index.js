import express from "express";
import cors from "cors";
import multer from "multer";
import fetch from "node-fetch";
import FormData from "form-data";

const app = express();
app.use(cors());

const APP_TOKEN = process.env.APP_TOKEN || "";
function requireAppToken(req, res, next) {
  if (!APP_TOKEN) return next();
  const token = req.headers["x-app-token"];
  if (token !== APP_TOKEN) return res.status(401).json({ message: "Unauthorized (bad x-app-token)" });
  next();
}
function getFreepikKey(req) {
  return process.env.FREEPIK_API_KEY || req.headers["x-freepik-api-key"];
}

const BASE_URL = "https://api.freepik.com/v1/ai/image-to-video";
const upload = multer({ storage: multer.memoryStorage() });

app.get("/health", (req, res) => res.json({ ok: true, service: "kling-backend-proxy", ts: Date.now() }));

app.post("/api/kling/:model", requireAppToken, upload.single("image"), async (req, res) => {
  try {
    const { model } = req.params;
    const apiKey = getFreepikKey(req);
    if (!apiKey) return res.status(400).json({ message: "Missing Freepik API Key" });
    if (!req.file) return res.status(400).json({ message: "Missing image file (field: image)" });
    if (!req.body?.prompt) return res.status(400).json({ message: "Missing prompt" });

    const fd = new FormData();
    fd.append("prompt", req.body.prompt);
    if (req.body.negative_prompt) fd.append("negative_prompt", req.body.negative_prompt);
    if (req.body.creativity !== undefined) fd.append("creativity", String(req.body.creativity));
    if (req.body.duration) fd.append("duration", String(req.body.duration));
    fd.append("image", req.file.buffer, { filename: req.file.originalname || "image.png" });

    const r = await fetch(`${BASE_URL}/${model}`, {
      method: "POST",
      headers: { "x-freepik-api-key": apiKey, ...fd.getHeaders() },
      body: fd,
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json(data);
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: e?.message || "Server error" });
  }
});

app.get("/api/kling/:model/:id", requireAppToken, async (req, res) => {
  try {
    const { model, id } = req.params;
    const apiKey = getFreepikKey(req);
    if (!apiKey) return res.status(400).json({ message: "Missing Freepik API Key" });

    const r = await fetch(`${BASE_URL}/${model}/${id}`, {
      headers: { "x-freepik-api-key": apiKey },
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json(data);
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: e?.message || "Server error" });
  }
});

export default app;
