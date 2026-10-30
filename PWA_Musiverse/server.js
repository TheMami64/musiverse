const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8080;
const ROOT = __dirname;

// ---- Anahtarsız YouTube arama (InnerTube) ----
const INNERTUBE_SEARCH = "https://www.youtube.com/youtubei/v1/search?prettyPrint=false";
const WEB_CONTEXT = {
  client: {
    clientName: "WEB",
    clientVersion: "2.20240726.00.00",
    hl: "tr",
    gl: "TR"
  }
};

function postJSON(url, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const u = new URL(url);
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
          Origin: "https://www.youtube.com"
        }
      },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error("YouTube " + res.statusCode));
            return;
          }
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(err);
          }
        });
      }
    );
    req.on("error", reject);
    req.setTimeout(12000, () => req.destroy(new Error("timeout")));
    req.write(body);
    req.end();
  });
}

function runsText(obj) {
  if (!obj) return "";
  if (obj.simpleText) return obj.simpleText;
  return (obj.runs || []).map((r) => r.text || "").join("");
}

function parseCount(text) {
  if (!text) return 0;
  const m = /([\d.,]+)\s*([A-Za-zÇĞİÖŞÜçğıöşü]+)?/.exec(text);
  if (!m) return 0;
  const raw = m[1];
  const suffix = (m[2] || "").toLowerCase();
  const asFloat = parseFloat(raw.replace(/\./g, "").replace(",", "."));
  if (/^(b|bin|k|thousand)$/.test(suffix)) return Math.round(asFloat * 1e3);
  if (/^(mn|m|milyon|million)$/.test(suffix)) return Math.round(asFloat * 1e6);
  return parseInt(raw.replace(/[^\d]/g, ""), 10) || 0;
}

function parseDuration(text) {
  if (!text) return 0;
  return text
    .split(":")
    .map((p) => parseInt(p, 10) || 0)
    .reduce((acc, p) => acc * 60 + p, 0);
}

function normalizeVideo(vr) {
  const thumbs = (vr.thumbnail && vr.thumbnail.thumbnails) || [];
  const thumbUrl = (i) =>
    (thumbs[i] && thumbs[i].url) || (thumbs[thumbs.length - 1] && thumbs[thumbs.length - 1].url) || "";
  const title = runsText(vr.title);
  const channel = runsText(vr.ownerText) || runsText(vr.longBylineText);
  const views = parseCount(runsText(vr.viewCountText));
  const seconds = parseDuration(runsText(vr.lengthText));
  let live = false;
  (vr.badges || []).forEach((b) => {
    const br = b.metadataBadgeRenderer;
    if (br && (br.style === "BADGE_STYLE_TYPE_LIVE_NOW" || /canlı|live/i.test(br.label || ""))) live = true;
  });
  return {
    id: { videoId: vr.videoId },
    snippet: {
      title,
      channelTitle: channel,
      thumbnails: {
        default: { url: thumbUrl(0) },
        medium: { url: thumbUrl(1) || thumbUrl(0) },
        high: { url: thumbUrl(thumbs.length - 1) }
      },
      liveBroadcastContent: live ? "live" : ""
    },
    _views: views,
    _seconds: seconds,
    _isShort: (seconds > 0 && seconds <= 60) || /#shorts?\b/i.test(title)
  };
}

function normalizeChannel(cr) {
  const thumbs = (cr.thumbnail && cr.thumbnail.thumbnails) || [];
  return {
    name: runsText(cr.title),
    thumb: (thumbs[0] && thumbs[0].url) || "",
    channelId: cr.channelId || (cr.navigationEndpoint && cr.navigationEndpoint.browseId) || ""
  };
}

function collectFromSearch(data) {
  const videos = [];
  const channels = [];
  const sections =
    ((((data.contents || {}).twoColumnSearchResultsRenderer || {}).primaryContents || {}).sectionListRenderer || {})
      .contents || [];
  const walk = (contents) => {
    (contents || []).forEach((c) => {
      if (c.videoRenderer) videos.push(c.videoRenderer);
      else if (c.channelRenderer) channels.push(c.channelRenderer);
      else if (c.itemSectionRenderer) walk(c.itemSectionRenderer.contents);
    });
  };
  sections.forEach((s) => {
    if (s.itemSectionRenderer) walk(s.itemSectionRenderer.contents);
  });
  return { videos, channels };
}

function sendJSON(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(body);
}

async function handleSearchApi(res, urlObj) {
  const q = (urlObj.searchParams.get("q") || "").trim();
  const type = urlObj.searchParams.get("type") || "video";
  if (!q) {
    sendJSON(res, 400, { error: "Arama sorgusu (q) gerekli." });
    return;
  }
  const payload = { context: WEB_CONTEXT, query: q };
  if (type === "channel") payload.params = "EgIQAg%3D%3D";
  try {
    const data = await postJSON(INNERTUBE_SEARCH, payload);
    const { videos, channels } = collectFromSearch(data);
    if (type === "channel") {
      sendJSON(res, 200, { items: channels.map(normalizeChannel) });
    } else {
      sendJSON(res, 200, { items: videos.map(normalizeVideo) });
    }
  } catch (err) {
    console.error("YouTube arama hatası:", err.message);
    sendJSON(res, 502, { error: "YouTube araması şu an yanıt vermedi. Birkaç saniye sonra tekrar dene." });
  }
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2"
};

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, "http://" + (req.headers.host || "localhost"));

  if (urlObj.pathname === "/api/search") {
    handleSearchApi(res, urlObj);
    return;
  }

  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";

  const filePath = path.join(ROOT, urlPath);

  // Basit path traversal koruması
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "Service-Worker-Allowed": "/"
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Musiverse sunucusu çalışıyor: http://localhost:${PORT}`);
});