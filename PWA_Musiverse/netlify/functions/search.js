const INNERTUBE_SEARCH = "https://www.youtube.com/youtubei/v1/search?prettyPrint=false";
const WEB_CONTEXT = {
  client: {
    clientName: "WEB",
    clientVersion: "2.20240726.00.00",
    hl: "tr",
    gl: "TR"
  }
};

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

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const q = (params.q || "").trim();
  const type = params.type || "video";

  if (!q) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ error: "Arama sorgusu (q) gerekli." })
    };
  }

  const payload = { context: WEB_CONTEXT, query: q };
  if (type === "channel") payload.params = "EgIQAg%3D%3D";

  try {
    const res = await fetch(INNERTUBE_SEARCH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
        Origin: "https://www.youtube.com",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("YouTube " + res.status);
    const data = await res.json();
    const { videos, channels } = collectFromSearch(data);
    const items = type === "channel" ? channels.map(normalizeChannel) : videos.map(normalizeVideo);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
      body: JSON.stringify({ items })
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ error: "YouTube araması şu an yanıt vermedi. Birkaç saniye sonra tekrar dene." })
    };
  }
};
