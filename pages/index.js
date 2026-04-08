// pages/index.js
import { useEffect, useMemo, useState } from "react";

// --- KONFIGURASI ---
const DEV_NAME = "Musfa";
const APP_NAME = "Musfa Downloader";
const LOGO_URL = "/musfoto1.jpeg";

// Background image
const BG_IMAGE = "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?auto=format&fit=crop&w=1600&q=80";

const PLATFORM_BG = {
  default: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?auto=format&fit=crop&w=1600&q=80",
  tiktok: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=1600&q=80",
  instagram: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?auto=format&fit=crop&w=1600&q=80",
  youtube: "https://images.unsplash.com/photo-1611162616475-46b635cb6868?auto=format&fit=crop&w=1600&q=80",
  facebook: "https://images.unsplash.com/photo-1611162618071-b39a2ec05542?auto=format&fit=crop&w=1600&q=80",
  x: "https://images.unsplash.com/photo-1611605698383-ee9845280d39?auto=format&fit=crop&w=1600&q=80",
  spotify: "https://images.unsplash.com/photo-1614680376593-902f74cf0d41?auto=format&fit=crop&w=1600&q=80",
};

// --- FUNCTIONS ---
function detectPlatform(url = "") {
  const u = (url || "").toLowerCase();
  if (u.includes("tiktok")) return "tiktok";
  if (u.includes("instagram")) return "instagram";
  if (u.includes("youtu")) return "youtube";
  if (u.includes("facebook") || u.includes("fb.watch")) return "facebook";
  if (u.includes("twitter") || u.includes("x.com")) return "x";
  if (u.includes("spotify")) return "spotify";
  return "default";
}

function clampText(text = "", limit = 240) {
  if (!text) return { short: "", isLong: false };
  const isLong = text.length > limit;
  return { short: isLong ? text.slice(0, limit) + "…" : text, isLong };
}

function shortUrl(url = "", limit = 72) {
  if (!url) return "";
  return url.length > limit ? url.slice(0, limit) + "…" : url;
}

function safeFilename(str = "") {
  return (str || "").replace(/[/\\?%*:|"<>]/g, "-").replace(/\s+/g, " ").trim().slice(0, 80);
}

function normalizeQuality(q = "") {
  const s = (q || "").toLowerCase();
  if (s.includes("no_watermark") || s.includes("nowatermark")) return "No Watermark";
  if (s.includes("watermark")) return "Watermark";
  if (s.includes("original")) return "Original";
  return q || "Standard"; 
}

function getQualityScore(quality = "", type = "") {
  const q = quality.toLowerCase();
  let score = 0;
  if (q.includes("8k") || q.includes("4320")) score += 100;
  else if (q.includes("4k") || q.includes("2160")) score += 90;
  else if (q.includes("2k") || q.includes("1440")) score += 80;
  else if (q.includes("1080")) score += 70;
  else if (q.includes("720")) score += 60;
  else if (q.includes("480")) score += 50;
  else if (q.includes("360")) score += 40;
  else if (q.includes("240")) score += 30;
  else if (q.includes("144")) score += 20;

  if (type === "audio") {
    if (q.includes("320")) score += 50;
    else if (q.includes("256")) score += 40;
    else if (q.includes("192")) score += 30;
    else if (q.includes("128")) score += 20;
    else score += 10;
  }
  if (q.includes("no watermark") || q.includes("nowatermark")) score += 1000;
  if (q.includes("hd") && !q.match(/\d/)) score += 65; 
  return score;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState("default");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [showFullTitle, setShowFullTitle] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);

  useEffect(() => {
    setPlatform(detectPlatform(url));
  }, [url]);

  const bg = PLATFORM_BG[platform] || PLATFORM_BG.default;
  const title = data?.title || "";
  const { short: shortTitle, isLong: titleLong } = clampText(title, 260);

  const medias = useMemo(() => {
    let list = (data?.medias || []).map((m) => ({
      ...m,
      qualityLabel: normalizeQuality(m.quality || ""),
      score: getQualityScore(m.quality || "", m.type)
    }));
    if (typeFilter !== "all") {
      list = list.filter((m) => m.type === typeFilter);
    }
    list.sort((a, b) => b.score - a.score);
    return list;
  }, [data, typeFilter]);

  async function onSubmit() {
    setError("");
    setData(null);
    setShowFullTitle(false);
    const u = url.trim();
    if (!u) return setError("Tempelkan link dulu, ya.");
    if (!/^https?:\/\//i.test(u)) return setError("Link harus diawali http:// atau https://");

    setLoading(true);
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: u }),
      });
      const txt = await res.text();
      let json;
      try { json = JSON.parse(txt); } catch { throw new Error("Server Error: Invalid JSON response."); }
      
      if (!res.ok || json?.error) throw new Error(json?.error || "Gagal mengambil media.");
      if (!json?.medias?.length) throw new Error("Media tidak ditemukan.");

      setData({
        title: json.title || "",
        source: json.source || u,
        medias: (json.medias || []).filter((m) => m?.url && m?.type).map((m) => ({
          type: m.type, url: m.url, quality: m.quality || "",
        })),
      });
    } catch (e) {
      setError(String(e?.message || e));
    }
    setLoading(false);
  }

  function openPreview(item) { setPreviewItem(item); setPreviewOpen(true); }
  function closePreview() { setPreviewOpen(false); setPreviewItem(null); }
  function buildDownloadLink(item) {
    const name = safeFilename(`${item.type}${item.quality ? "-" + item.quality : ""}`);
    return `/api/proxy?url=${encodeURIComponent(item.url)}&filename=${encodeURIComponent(name || "download")}`;
  }

  return (
    <div className="page">
      <header className="header">
        <div className="brandLeft">
          <div className="logoWrapper">
            <img src={LOGO_URL} alt="Profile" className="brandLogo" />
          </div>
          <div className="brandText">
            <span className="brandName">{DEV_NAME}</span>
            <span className="brandSub">Dev Tools</span>
          </div>
        </div>
        <div className="systemStatus">
          <div className="statusDot" />
          <span className="statusText">Online</span>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="heroMain" style={{ backgroundImage: `url(${bg})` }}>
        <div className="heroOverlay" />
        
        <div className="heroContent">
          <div className="heroTexts">
            <h1 className="heroTitle">
              {APP_NAME} <br />
              <span className="textGradient">Media Downloader</span>
            </h1>
            <p className="heroDesc">
              Download video, musik, dan foto dari berbagai platform. Kualitas terbaik, diurutkan otomatis untuk Anda.
            </p>
          </div>

          <div className="inputCard glass">
            <div className="inputLabel">
              Detected Platform: <span className="platformBadge">{platform === 'default' ? 'Auto' : platform.toUpperCase()}</span>
            </div>
            
            <div className="inputRow">
              <input
                className="input"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste link video/post disini..."
                inputMode="url"
              />
              <button className="btnMain" onClick={onSubmit} disabled={loading}>
                {loading ? "Processing..." : "Download"}
              </button>
            </div>
            
            {error && <div className="errorMsg">⚠️ {error}</div>}
            
            <div className="inputFooter">
              Support: TikTok • Instagram • YouTube • Facebook • Twitter • Spotify
            </div>
          </div>
        </div>
      </section>

      {/* HASIL DOWNLOAD */}
      {data && (
        <section className="contentSection slideUp">
          <div className="panel">
            <div className="panelTop">
              <h2 className="panelH2">📥 Download Results</h2>
              
              <div className="filtersWrap">
                <div className="filters">
                  {["all", "video", "image", "audio"].map((t) => (
                    <button
                      key={t}
                      className={typeFilter === t ? "chip chipActive" : "chip"}
                      onClick={() => setTypeFilter(t)}
                    >
                      {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="metaInfo">
              <div className="metaRow">
                <span className="metaLabel">📌 Title</span>
                <span className="metaValue">
                  {title ? (
                    <>
                      {showFullTitle ? title : shortTitle}
                      {titleLong && (
                        <span className="seeMore" onClick={() => setShowFullTitle((v) => !v)}>
                          {showFullTitle ? " Show less" : " Show more"}
                        </span>
                      )}
                    </>
                  ) : "-"}
                </span>
              </div>
            </div>

            <div className="list">
              {medias.map((m, i) => (
                <div className="item" key={i}>
                  <div className="left">
                    <div className="typeRow">
                      <span className={`typeTag ${m.type}`}>{m.type}</span>
                      <span className="qualityTag">
                         {m.quality ? m.quality : "Standard"}
                      </span>
                    </div>
                    <div className="urlPreview">{shortUrl(m.url, 40)}</div>
                  </div>
                  <div className="actions">
                    <button className="btnSec" onClick={() => openPreview(m)}>👁️ Preview</button>
                    <a className="btnPri" href={buildDownloadLink(m)}>⬇️ Download</a>
                  </div>
                </div>
              ))}
              {!medias.length && <div className="emptyState">❌ Format ini tidak tersedia.</div>}
            </div>
          </div>
        </section>
      )}

      {/* FITUR - Tanpa WhatsApp */}
      {!data && (
        <section className="contentSection">
          <div className="featureGrid">
            <div className="featureCard">
              <div className="fIconBox">⚡</div>
              <div className="fContent">
                <div className="fTitle">Super Fast</div>
                <div className="fDesc">Proses cepat dengan teknologi terbaru.</div>
              </div>
            </div>
            <div className="featureCard">
              <div className="fIconBox">🛡️</div>
              <div className="fContent">
                <div className="fTitle">Secure & Safe</div>
                <div className="fDesc">Privasi terjaga, tanpa penyimpanan data.</div>
              </div>
            </div>
            <div className="featureCard">
              <div className="fIconBox">✨</div>
              <div className="fContent">
                <div className="fTitle">Best Quality</div>
                <div className="fDesc">Auto pilih kualitas tertinggi hingga 4K.</div>
              </div>
            </div>
            <div className="featureCard">
              <div className="fIconBox">🎵</div>
              <div className="fContent">
                <div className="fTitle">Audio Extract</div>
                <div className="fDesc">Ekstrak audio dari video dengan mudah.</div>
              </div>
            </div>
          </div>
        </section>
      )}

      <footer className="footer">
        <p>© 2024 {DEV_NAME} • Media Downloader Tools</p>
      </footer>

      {/* MODAL PREVIEW */}
      {previewOpen && previewItem && (
        <div className="modalBackdrop" onMouseDown={closePreview}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <span className="modalHTitle">🎬 Media Preview</span>
              <button className="modalClose" onClick={closePreview}>✕</button>
            </div>
            <div className="modalContent">
              {previewItem.type === "image" && <img className="modalMedia" src={previewItem.url} alt="preview" />}
              {previewItem.type === "video" && <video className="modalMedia" src={previewItem.url} controls autoPlay />}
              {previewItem.type === "audio" && <audio className="modalAudio" src={previewItem.url} controls autoPlay />}
            </div>
            <div className="modalFooter">
              <a className="modalBtnDownload" href={buildDownloadLink(previewItem)}>⬇️ Download</a>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL STYLES */}
      <style jsx global>{`
        html, body {
          margin: 0; padding: 0;
          background: #0a0a0a;
          color: #ffffff;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          overflow-x: hidden;
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #1a1a1a; }
        ::-webkit-scrollbar-thumb { background: #4facfe; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #00f2fe; }
      `}</style>

      <style jsx>{`
        .page { min-height: 100vh; display: flex; flex-direction: column; }

        .header {
          position: absolute; top: 0; left: 0; right: 0;
          padding: 20px 32px;
          display: flex; justify-content: space-between; align-items: center;
          z-index: 50;
          backdrop-filter: blur(10px);
          background: rgba(0,0,0,0.3);
        }
        .brandLeft { display: flex; align-items: center; gap: 14px; }
        .logoWrapper {
            width: 48px; height: 48px; border-radius: 50%; overflow: hidden;
            border: 2px solid #4facfe;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .logoWrapper:hover { transform: scale(1.05); box-shadow: 0 0 20px rgba(79,172,254,0.5); }
        .brandLogo { width: 100%; height: 100%; object-fit: cover; }
        .brandText { display: flex; flex-direction: column; }
        .brandName { font-weight: 800; font-size: 18px; background: linear-gradient(135deg, #4facfe, #00f2fe); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .brandSub { font-size: 11px; color: rgba(255,255,255,0.6); font-weight: 500; }

        .systemStatus {
            display: flex; align-items: center; gap: 8px;
            background: rgba(0,255,157,0.1);
            border: 1px solid rgba(0,255,157,0.3);
            padding: 6px 14px; border-radius: 100px;
        }
        .statusDot {
            width: 8px; height: 8px; background-color: #00ff9d;
            border-radius: 50%; box-shadow: 0 0 10px #00ff9d;
            animation: pulse 2s infinite;
        }
        .statusText { font-size: 11px; font-weight: 600; color: #00ff9d; }
        @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }

        .heroMain {
          position: relative; min-height: 85vh;
          display: flex; align-items: center; justify-content: center;
          background-size: cover; background-position: center;
          padding: 120px 20px 80px;
        }
        .heroOverlay {
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.85) 100%);
        }
        .heroContent {
          position: relative; z-index: 2; width: min(700px, 100%);
          display: flex; flex-direction: column; gap: 40px; text-align: center;
        }
        .heroTitle {
          font-size: clamp(40px, 8vw, 70px); margin: 0; line-height: 1.2; font-weight: 900;
          letter-spacing: -2px;
        }
        .textGradient {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 50%, #4facfe 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-size: 200% auto;
          animation: shimmer 3s infinite;
        }
        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .heroDesc { font-size: 18px; color: rgba(255,255,255,0.7); line-height: 1.6; }

        .inputCard {
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 32px; padding: 32px;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
          transition: all 0.3s ease;
        }
        .inputCard:hover { transform: translateY(-5px); border-color: rgba(79,172,254,0.5); }
        .inputLabel { font-size: 13px; color: rgba(255,255,255,0.5); margin-bottom: 16px; text-align: left; font-weight: 500; }
        .platformBadge { color: #4facfe; font-weight: 700; }
        
        .inputRow { display: flex; gap: 12px; }
        .input {
          flex: 1; background: rgba(0,0,0,0.4); 
          border: 1px solid rgba(255,255,255,0.15);
          color: white; padding: 16px 24px; border-radius: 24px; font-size: 16px; outline: none;
          transition: all 0.3s;
        }
        .input:focus { 
            border-color: #4facfe; 
            background: rgba(0,0,0,0.6);
            box-shadow: 0 0 20px rgba(79,172,254,0.2);
        }
        .btnMain {
          background: linear-gradient(135deg, #4facfe, #00f2fe);
          color: white; font-weight: 700; border: none;
          padding: 16px 40px; border-radius: 24px; cursor: pointer; font-size: 16px;
          transition: all 0.3s;
        }
        .btnMain:hover { transform: scale(1.02); box-shadow: 0 10px 30px rgba(79,172,254,0.4); }
        .btnMain:disabled { opacity: 0.6; cursor: wait; transform: none; }
        .errorMsg { text-align: left; color: #ff6b6b; margin-top: 12px; font-size: 14px; }
        .inputFooter { margin-top: 20px; font-size: 12px; color: rgba(255,255,255,0.4); text-align: center; }

        .contentSection { width: min(900px, 100%); margin: 0 auto; padding: 40px 20px 80px; }

        .featureGrid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 24px;
        }
        .featureCard {
          display: flex; align-items: flex-start; gap: 16px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          padding: 24px; border-radius: 24px;
          transition: all 0.3s ease;
        }
        .featureCard:hover {
            background: rgba(255,255,255,0.06);
            transform: translateY(-8px);
            border-color: #4facfe;
        }
        .fIconBox {
            font-size: 28px;
            background: linear-gradient(135deg, #4facfe, #00f2fe);
            width: 56px; height: 56px;
            border-radius: 18px;
            display: flex; align-items: center; justify-content: center;
        }
        .fTitle { font-weight: 700; font-size: 18px; margin-bottom: 8px; }
        .fDesc { font-size: 14px; color: rgba(255,255,255,0.6); line-height: 1.5; }

        .panel {
          background: rgba(20,20,30,0.8);
          border-radius: 32px;
          border: 1px solid rgba(255,255,255,0.08);
          padding: 32px;
          backdrop-filter: blur(10px);
        }
        .panelH2 { margin: 0 0 20px 0; font-size: 24px; font-weight: 700; background: linear-gradient(135deg, #4facfe, #00f2fe); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .filtersWrap { margin-bottom: 24px; }
        .chip {
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #aaa;
          padding: 8px 20px; border-radius: 40px; font-size: 13px; font-weight: 600; cursor: pointer;
          transition: all 0.2s; margin-right: 10px;
        }
        .chip:hover { background: rgba(79,172,254,0.2); color: white; }
        .chipActive { background: linear-gradient(135deg, #4facfe, #00f2fe); color: white; border-color: transparent; }
        
        .metaInfo { margin: 24px 0; padding: 20px; background: rgba(0,0,0,0.3); border-radius: 20px; border-left: 3px solid #4facfe; }
        .metaLabel { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #4facfe; font-weight: 600; }
        .metaValue { font-size: 14px; color: #fff; line-height: 1.6; margin-top: 8px; }
        .seeMore { cursor: pointer; color: #4facfe; font-size: 12px; margin-left: 8px; }

        .list { display: flex; flex-direction: column; gap: 16px; }
        .item {
          display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;
          background: rgba(255,255,255,0.03); 
          border: 1px solid rgba(255,255,255,0.06);
          padding: 20px; border-radius: 20px;
          transition: all 0.2s;
        }
        .item:hover { background: rgba(79,172,254,0.1); border-color: #4facfe; transform: translateX(5px); }
        
        .typeTag { font-size: 11px; font-weight: 800; background: linear-gradient(135deg, #4facfe, #00f2fe); color: white; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; margin-right: 10px; }
        .qualityTag { font-size: 12px; color: #00f2fe; font-weight: 600; }
        .urlPreview { font-family: monospace; font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 8px; }
        
        .btnPri, .btnSec {
          padding: 10px 24px; border-radius: 40px; font-size: 13px; font-weight: 600; text-decoration: none; cursor: pointer; transition: all 0.2s; display: inline-block; text-align: center;
        }
        .btnSec { background: rgba(255,255,255,0.05); color: #ccc; border: 1px solid rgba(255,255,255,0.1); }
        .btnSec:hover { background: rgba(255,255,255,0.1); color: white; }
        .btnPri { background: linear-gradient(135deg, #4facfe, #00f2fe); color: white; margin-left: 10px; border: none; }
        .btnPri:hover { transform: translateY(-2px); box-shadow: 0 5px 20px rgba(79,172,254,0.4); }

        .footer { padding: 40px 0 30px; text-align: center; border-top: 1px solid rgba(255,255,255,0.05); margin-top: 40px; }
        .footer p { font-size: 13px; color: rgba(255,255,255,0.3); }

        .modalBackdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,0.9);
          backdrop-filter: blur(20px); z-index: 1000;
          display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .modal {
          width: min(650px, 90%); background: #1a1a2e; border: 1px solid rgba(79,172,254,0.3);
          border-radius: 32px; overflow: hidden; box-shadow: 0 50px 100px rgba(0,0,0,0.6);
        }
        .modalHeader { padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; }
        .modalHTitle { font-weight: 700; color: #4facfe; font-size: 18px; }
        .modalClose { background: none; border: none; color: #fff; cursor: pointer; font-size: 24px; opacity: 0.7; transition: opacity 0.2s; }
        .modalClose:hover { opacity: 1; }
        .modalContent { padding: 24px; display: flex; justify-content: center; background: #0a0a0a; }
        .modalMedia { max-width: 100%; max-height: 60vh; border-radius: 16px; }
        .modalFooter { padding: 20px 24px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: flex-end; background: #1a1a2e; }
        .modalBtnDownload { background: linear-gradient(135deg, #4facfe, #00f2fe); color: white; padding: 12px 28px; border-radius: 40px; text-decoration: none; font-size: 14px; font-weight: 700; }
        
        .slideUp { animation: slideUp 0.5s ease forwards; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 768px) {
          .header { padding: 16px 20px; }
          .heroTitle { font-size: 36px; }
          .heroDesc { font-size: 14px; }
          .inputRow { flex-direction: column; }
          .btnMain { padding: 14px; }
          .featureGrid { grid-template-columns: 1fr; }
          .item { flex-direction: column; text-align: center; }
          .actions { display: flex; gap: 10px; justify-content: center; }
          .btnPri { margin-left: 0; }
        }
      `}</style>
    </div>
  );
}
