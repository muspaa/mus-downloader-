import axios from "axios";

// ===== SIMPLE RATE LIMIT (in-memory) =====
const RATE_LIMIT = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 menit
  const maxRequests = 15;     // max 15 request per menit per IP

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

class DownrScraper {
  constructor() {
    this.baseURL = "https://downr.org";
    this.headers = {
      accept: "*/*",
      "content-type": "application/json",
      origin: "https://downr.org",
      referer: "https://downr.org/",
      "user-agent":
        "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    };
  }

  async getSessionCookie() {
    const baseCookie =
      "_ga=GA1.1.536005378.1770437315; _clck=17lj13q%5E2%5Eg3d";

    const res = await axios.get(
      `${this.baseURL}/.netlify/functions/analytics`,
      { headers: { ...this.headers, cookie: baseCookie } }
    );

    const sess = res.headers["set-cookie"]?.[0]?.split(";")[0];
    return sess ? `${baseCookie}; ${sess}` : baseCookie;
  }

  async fetch(url) {
    const cookie = await this.getSessionCookie();

    const res = await axios.post(
      `${this.baseURL}/.netlify/functions/nyt`,
      { url },
      {
        headers: {
          ...this.headers,
          cookie,
        },
      }
    );

    return res.data;
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
      error: "Terlalu banyak request. Coba lagi sebentar.",
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL kosong" });
    }

    const downr = new DownrScraper();
    const data = await downr.fetch(url);

    if (!data?.medias?.length) {
      return res.status(404).json({ error: "Media tidak ditemukan" });
    }

    return res.status(200).json({
      title: data.title || "",
      source: url,
      medias: data.medias.map((m) => ({
        type: m.type,
        url: m.url,
        quality: m.quality || "",
      })),
    });
  } catch (err) {
    console.error("DOWNLOAD API ERROR:", err?.message || err);
    return res.status(500).json({ error: "Gagal mengambil media" });
  }
      }
