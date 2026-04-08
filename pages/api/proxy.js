// pages/api/proxy.js
import axios from "axios";

const ALLOWED_HOSTS = [
  "tiktokcdn.com",
  "muscdn.com",
  "fbcdn.net",
  "fbsbx.com",
  "instagram.com",
  "cdninstagram.com",
  "googlevideo.com",
  "ytimg.com",
  "pinimg.com",
  "sndcdn.com",
  "soundcloud.com"
];

// ===== SIMPLE RATE LIMIT (in-memory) =====
const RATE_LIMIT = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 menit
  const maxRequests = 20;     // max 20 request per menit

  if (!RATE_LIMIT.has(ip)) {
    RATE_LIMIT.set(ip, { count: 1, start: now });
    return { allowed: true };
  }

  const data = RATE_LIMIT.get(ip);

  if (now - data.start > windowMs) {
    RATE_LIMIT.set(ip, { count: 1, start: now });
    return { allowed: true };
  }

  if (data.count >= maxRequests) {
    return { allowed: false };
  }

  data.count++;
  return { allowed: true };
}

function isAllowed(urlString) {
  try {
    const url = new URL(urlString);
    if (url.protocol !== "https:") return false;

    const hostname = url.hostname.toLowerCase();
    return ALLOWED_HOSTS.some(domain =>
      hostname === domain || hostname.endsWith("." + domain)
    );
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket?.remoteAddress ||
    "unknown";

  const limit = checkRateLimit(ip);

  if (!limit.allowed) {
    return res.status(429).json({
      error: "Terlalu banyak request. Coba lagi sebentar."
    });
  }

  const { url, filename } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Missing URL" });
  }

  if (!isAllowed(url)) {
    return res.status(403).json({ error: "Domain not allowed" });
  }

  try {
    const response = await axios.get(url, {
      responseType: "stream",
      timeout: 15000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename || "download"}"`
    );

    res.setHeader(
      "Content-Type",
      response.headers["content-type"] || "application/octet-stream"
    );

    response.data.pipe(res);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch media" });
  }
        }
