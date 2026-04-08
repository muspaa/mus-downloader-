// lib/rateLimit.js

const store = global.__RATE_LIMIT_STORE__ || {
  data: {},
  lastReset: Date.now(),
};

global.__RATE_LIMIT_STORE__ = store;

function getIP(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

export function rateLimit(req, options = {}) {
  const {
    cooldownMs = 120000, // 2 menit
    maxPerDay = 25,
  } = options;

  const ip = getIP(req);
  const now = Date.now();

  // reset tiap 24 jam
  if (now - store.lastReset > 24 * 60 * 60 * 1000) {
    store.data = {};
    store.lastReset = now;
  }

  if (!store.data[ip]) {
    store.data[ip] = {
      count: 0,
      lastRequest: 0,
    };
  }

  const user = store.data[ip];

  // cek cooldown
  const diff = now - user.lastRequest;
  if (diff < cooldownMs) {
    const wait = Math.ceil((cooldownMs - diff) / 1000);
    return {
      allowed: false,
      status: 429,
      message: `Cooldown aktif. Tunggu ${wait} detik.`,
      waitSeconds: wait,
      remaining: maxPerDay - user.count,
    };
  }

  // cek limit harian
  if (user.count >= maxPerDay) {
    return {
      allowed: false,
      status: 429,
      message: `Limit harian habis (max ${maxPerDay}/hari).`,
      waitSeconds: null,
      remaining: 0,
    };
  }

  // update
  user.count += 1;
  user.lastRequest = now;

  return {
    allowed: true,
    status: 200,
    remaining: maxPerDay - user.count,
  };
}