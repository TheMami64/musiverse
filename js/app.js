(function () {
  "use strict";

  // ---- Intro: en başta çalışsın ki hata olsa bile disappearsin ----
  (function setupIntro() {
    const intro = document.getElementById("intro");
    if (!intro) return;
    let dismissed = false;
    function dismiss() {
      if (dismissed) return;
      dismissed = true;
      clearTimeout(timeoutId);
      intro.style.pointerEvents = "none";
      intro.classList.add('hide');
      setTimeout(() => { intro.remove(); }, 700);
    }
    let timeoutId = setTimeout(dismiss, 3500);
    intro.addEventListener('touchstart', dismiss, { passive: true });
    intro.addEventListener('mousedown', dismiss);
    intro.addEventListener('click', dismiss);
  })();

  // ---- DOM başvuruları ----
  const audio = document.getElementById("audio");
  const trackList = document.getElementById("track-list");
  const emptyState = document.getElementById("empty-state");
  const fileInput = document.getElementById("file-input");
  const btnPlay = document.getElementById("btn-play");
  const btnPrev = document.getElementById("btn-prev");
  const btnNext = document.getElementById("btn-next");
  const btnShuffle = document.getElementById("btn-shuffle");
  const btnLoop = document.getElementById("btn-loop");
  const seek = document.getElementById("seek");
  const timeCurrent = document.getElementById("time-current");
  const timeTotal = document.getElementById("time-total");
  const nowTitle = document.getElementById("now-title");
  const nowArtist = document.getElementById("now-artist");
  const trackCount = document.getElementById("track-count");
  const iconPlay = document.getElementById("icon-play");
  const iconPause = document.getElementById("icon-pause");
  // ---- Ekranı uyanık tut (arka planda müzik devam etsin) ----
  let wakeLock = null;
  async function acquireWakeLock() {
    try {
      if ("wakeLock" in navigator && document.visibilityState === "visible") {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener("release", () => { wakeLock = null; });
      }
    } catch (e) { /* desteklenmiyorsa yoksay */ }
  }
function releaseWakeLock() {
     if (wakeLock) { try { wakeLock.release(); } catch (e) {} wakeLock = null; }
   }
// ---- Ses seviyesi kontrolleri ----
  const volumeSlider = document.getElementById('volume');
  const volumeBtn = document.getElementById('btn-volume-toggle');
  let volume = parseInt(localStorage.getItem('musiverse-volume')) || 100;
  let isMuted = localStorage.getItem('musiverse-muted') === 'true';
  let lastNonZeroVolume = volume || 100;

  function updateVolumeIcon() {
    const on = volume > 0 && !isMuted;
    volumeBtn.innerHTML = on
      ? '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.79s-2.99-7.88-7-8.79z"/></svg>'
      : '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>';
  }

  function applyVolume() {
    const vol = isMuted ? 0 : volume;
    audio.volume = vol / 100;
    audio.muted = false;
    if (ytPlayer && ytPlayer.setVolume) ytPlayer.setVolume(vol);
    volumeSlider.value = isMuted ? 0 : volume;
    localStorage.setItem('musiverse-volume', volume);
    localStorage.setItem('musiverse-muted', isMuted);
    updateVolumeIcon();
  }

  volumeSlider.addEventListener('input', () => {
    volume = parseInt(volumeSlider.value);
    isMuted = volume === 0;
    if (volume > 0) lastNonZeroVolume = volume;
    applyVolume();
  });

  volumeBtn.addEventListener('click', () => {
    if (isMuted || volume === 0) {
      volume = lastNonZeroVolume || 75;
      isMuted = false;
    } else {
      lastNonZeroVolume = volume;
      isMuted = true;
    }
    applyVolume();
  });

  // ---- Görünüm toggles ----
  const btnViewList = document.getElementById('btn-view-list');
  const btnViewGrid = document.getElementById('btn-view-grid');
  let viewMode = localStorage.getItem('musiverse-view') || 'list';
  const gridSizes = ['small', 'medium', 'large'];
  let gridSize = localStorage.getItem('musiverse-grid-size') || 'medium';

  function applyView() {
    trackList.classList.remove('grid-small', 'grid-medium', 'grid-large');
    if (viewMode === 'grid') {
      trackList.classList.add('grid', 'grid-' + gridSize);
    } else {
      trackList.classList.remove('grid');
    }
    btnViewList.classList.toggle('active', viewMode === 'list');
    btnViewGrid.classList.toggle('active', viewMode === 'grid');
  }

  btnViewList.addEventListener('click', () => {
    viewMode = 'list';
    localStorage.setItem('musiverse-view', 'list');
    applyView();
  });

  btnViewGrid.addEventListener('click', () => {
    viewMode = 'grid';
    const idx = (gridSizes.indexOf(gridSize) + 1) % gridSizes.length;
    gridSize = gridSizes[idx];
    localStorage.setItem('musiverse-view', 'grid');
    localStorage.setItem('musiverse-grid-size', gridSize);
    applyView();
  });

  applyView();

  // ---- Arama DOM'u ----
  const searchPanel = document.getElementById("search-panel");
  const searchInput = document.getElementById("search-input");
  const searchResults = document.getElementById("search-results");
  const searchHint = document.getElementById("search-hint");
  const searchSuggestions = document.getElementById("search-suggestions");
  const btnSearch = document.getElementById("btn-search");
  const btnCloseSearch = document.getElementById("btn-close-search");
  const btnSearchGo = document.getElementById("btn-search-go");

  // ---- Menü / Modal DOM'u ----
  const drawer = document.getElementById("drawer");
  const drawerOverlay = document.getElementById("drawer-overlay");
  const btnMenu = document.getElementById("btn-menu");
  const btnCloseMenu = document.getElementById("btn-close-menu");
  const btnAbout = document.getElementById("btn-about");
  const aboutModal = document.getElementById("about-modal");
  const btnCloseAbout = document.getElementById("btn-close-about");
  const btnSettings = document.getElementById("btn-settings");
  const settingsModal = document.getElementById("settings-modal");
  const btnCloseSettings = document.getElementById("btn-close-settings");
  const themeGrid = document.getElementById("theme-grid");

  // ---- Tema ----
  let THEMES = [];

  async function loadThemes() {
    try {
      const res = await fetch("themes/index.json");
      THEMES = await res.json();
    } catch (e) {
      console.error("Tema listesi yüklenemedi:", e);
      THEMES = [];
    }
  }

  function getTheme() {
    return localStorage.getItem("musiverse-theme") || "blackhole";
  }

  async function applyTheme(id) {
    const theme = THEMES.find((t) => t.id === id);
    if (!theme) return;
    try {
      const res = await fetch(theme.file);
      const data = await res.json();
      document.body.setAttribute("data-theme", id);
      const vars = data.variables || {};
      // Önce --bg-image'i temizle ki önceki temanın resmi kalmasın
      document.documentElement.style.removeProperty("--bg-image");
      Object.keys(vars).forEach((k) => {
        document.documentElement.style.setProperty(k, vars[k]);
      });
      localStorage.setItem("musiverse-theme", id);
      // Tema gradyanını arka plan katmanına uygula
      const bgImg = vars["--bg-image"];
      const grad = vars["--gradient"];
      let bgGradient = "none";
      if (bgImg && bgImg !== "none" && bgImg.indexOf("gradient(") !== -1) {
        bgGradient = bgImg;
      } else if (grad) {
        bgGradient = grad;
      }
      document.documentElement.style.setProperty("--bg-gradient", bgGradient);
      await applyThemeBackground(id, vars);
      renderThemeGrid();
    } catch (e) {
      console.error("Tema yüklenemedi:", e);
    }
  }

  function imageExists(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }

  function updateHasBg() {
    const v = document.documentElement.style.getPropertyValue("--bg-image").trim();
    const active = !!v && v !== "none";
    document.body.classList.toggle("has-bg", active);
  }

  async function applyThemeBackground(id, vars) {
    document.documentElement.style.setProperty("--bg-image", "none");
    updateHasBg();
  }

  function setTheme(id) {
    applyTheme(id);
  }

  function renderThemeGrid() {
    if (!themeGrid) return;
    const current = getTheme();
    themeGrid.innerHTML = "";
    THEMES.forEach((t) => {
      const card = document.createElement("div");
      card.className = "theme-card" + (t.id === current ? " active" : "");
      card.dataset.theme = t.id;
      const swatch = document.createElement("div");
      swatch.className = "theme-swatch";
      const name = document.createElement("div");
      name.className = "theme-name";
      name.textContent = t.name || t.id;
      card.append(swatch, name);
      card.addEventListener("click", () => setTheme(t.id));
      themeGrid.appendChild(card);
      // Swatch'a tema gradient'ini yükle
      fetch(t.file)
        .then((r) => r.json())
        .then((data) => {
          swatch.style.background = (data.variables && data.variables["--gradient"]) || "";
        })
        .catch(() => {});
    });
  }

  function openDrawer() {
    drawer.classList.add("open");
    drawerOverlay.hidden = false;
    drawer.setAttribute("aria-hidden", "false");
  }
  function closeDrawer() {
    drawer.classList.remove("open");
    drawerOverlay.hidden = true;
    drawer.setAttribute("aria-hidden", "true");
  }

  btnMenu.addEventListener("click", openDrawer);
  btnCloseMenu.addEventListener("click", closeDrawer);
  drawerOverlay.addEventListener("click", closeDrawer);

  btnAbout.addEventListener("click", () => {
    closeDrawer();
    aboutModal.hidden = false;
  });
  btnCloseAbout.addEventListener("click", () => { aboutModal.hidden = true; });
  aboutModal.addEventListener("click", (e) => {
    if (e.target === aboutModal) aboutModal.hidden = true;
  });

  // Ayarlar (tema) modalı
  btnSettings.addEventListener("click", () => {
    closeDrawer();
    renderThemeGrid();
    settingsModal.hidden = false;
  });
  btnCloseSettings.addEventListener("click", () => { settingsModal.hidden = true; });
  settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) settingsModal.hidden = true;
  });


  // ---- YouTube arama (anahtarsız: sunucu proxy'si, yoksa Invidious yedeği) ----
  const INVIDIOUS_INSTANCES = [
    "https://yt.chocolatemoo53.com",
    "https://invidious.tiekoetter.com",
    "https://inv.nadeko.net",
    "https://invidious.nerdvpn.de"
  ];

  function normalizeInvidiousVideo(v) {
    const id = encodeURIComponent(v.videoId || "");
    const seconds = v.lengthSeconds || 0;
    return {
      id: { videoId: v.videoId },
      snippet: {
        title: v.title || "",
        channelTitle: v.author || "",
        thumbnails: {
          default: { url: "https://i.ytimg.com/vi/" + id + "/default.jpg" },
          medium: { url: "https://i.ytimg.com/vi/" + id + "/mqdefault.jpg" },
          high: { url: "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg" }
        },
        liveBroadcastContent: v.liveNow ? "live" : ""
      },
      _views: v.viewCount || 0,
      _seconds: seconds,
      _isShort: (seconds > 0 && seconds <= 60) || /#shorts?\b/i.test(v.title || "")
    };
  }

  function normalizeInvidiousChannel(c) {
    const thumbs = c.authorThumbnails || [];
    const big = thumbs[thumbs.length - 1] || thumbs[0] || {};
    return {
      name: c.author || "",
      thumb: big.url || "",
      channelId: c.authorId || ""
    };
  }

  async function fetchInvidious(query, type) {
    for (const base of INVIDIOUS_INSTANCES) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        const res = await fetch(
          base + "/api/v1/search?q=" + encodeURIComponent(query) + "&type=" + type,
          { signal: ctrl.signal }
        );
        clearTimeout(timer);
        if (!res.ok) continue;
        const data = await res.json();
        if (!Array.isArray(data)) continue;
        const items =
          type === "channel"
            ? data.filter((x) => x.type === "channel").map(normalizeInvidiousChannel)
            : data.filter((x) => x.type === "video").map(normalizeInvidiousVideo);
        if (items.length) return items;
      } catch (e) {
      }
    }
    return null;
  }

  async function searchMusic(query, type) {
    type = type || "video";
    try {
      const params = new URLSearchParams({ q: query, type });
      const res = await fetch("/api/search?" + params.toString());
      const ctype = res.headers.get("content-type") || "";
      if (res.ok && ctype.indexOf("application/json") !== -1) {
        const data = await res.json();
        if (Array.isArray(data.items) && data.items.length) return { items: data.items };
      }
    } catch (e) {
    }
    const items = await fetchInvidious(query, type);
    if (items) return { items };
    return { items: [], error: "Arama servisine ulaşılamadı. İnternetini kontrol edip tekrar dene." };
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function isLiveSnippet(s) {
    return !!s && s.liveBroadcastContent === "live";
  }

  function buildLiveTag() {
    const tag = document.createElement("span");
    tag.className = "live-tag";
    tag.textContent = "CANLI";
    return tag;
  }

  function trendTier(views) {
    if (!views || views < 1000000) return null;
    if (views >= 50000000) return { cls: "trend-legend", label: "EFSANE" };
    if (views >= 20000000) return { cls: "trend-famous", label: "ÜNLÜ" };
    if (views >= 10000000) return { cls: "trend-top", label: "EN SEVİLEN" };
    if (views >= 5000000) return { cls: "trend-loved", label: "SEVİLEN" };
    return { cls: "trend-trend", label: "TREND" };
  }

  function buildTrendTag(views) {
    const tier = trendTier(views);
    if (!tier) return null;
    const tag = document.createElement("span");
    tag.className = "trend-tag " + tier.cls;
    tag.textContent = tier.label;
    return tag;
  }

  function buildBadgeRow(live, views) {
    const row = document.createElement("div");
    row.className = "badge-row";
    if (live) row.appendChild(buildLiveTag());
    const trend = buildTrendTag(views);
    if (trend) row.appendChild(trend);
    return row.childElementCount ? row : null;
  }

  function renderSearchError(msg) {
    searchResults.innerHTML = "";
    searchHint.textContent = msg;
  }

  async function searchYouTube(query) {
    renderSearchError("");
    searchHint.textContent = "Aranıyor…";
    const result = await searchMusic(query, "video");
    if (result.error) {
      renderSearchError(result.error);
      return;
    }
    renderSearchResults((result.items || []).filter((it) => !it._isShort));
  }

  function renderSearchResults(items) {
    searchResults.innerHTML = "";
    searchHint.textContent = items.length ? "Sonuçlar:" : "Sonuç bulunamadı.";
    items.forEach((item) => {
      const s = item.snippet;
      const thumb = (s.thumbnails && (s.thumbnails.medium || s.thumbnails.default)) || {};
      const li = document.createElement("li");
      li.className = "search-result";

      const img = document.createElement("img");
      img.src = thumb.url || "";
      img.alt = s.title;

      const info = document.createElement("div");
      info.className = "result-info";
      const title = document.createElement("div");
      title.className = "result-title";
      title.textContent = s.title;
      const channel = document.createElement("div");
      channel.className = "result-channel";
      channel.textContent = s.channelTitle;
      info.append(title, channel);
      const badges = buildBadgeRow(isLiveSnippet(s), item._views);
      if (badges) info.appendChild(badges);

      li.append(img, info);
      li.addEventListener("click", () => { addAndPlayYouTube(item); });
      searchResults.appendChild(li);
    });
  }

  // ---- YouTube track'ini kitaplığa ekle ve çal ----
  async function addAndPlayYouTube(item) {
    const s = item.snippet;
    const thumb = (s.thumbnails && (s.thumbnails.high || s.thumbnails.medium || s.thumbnails.default)) || {};
    const track = {
      title: s.title,
      artist: s.channelTitle,
      duration: 0,
      size: 0,
      name: s.title + " (YouTube)",
      source: "youtube",
      videoId: item.id.videoId,
      thumbnail: thumb.url || "",
      live: isLiveSnippet(s),
      views: item._views || 0
    };
    const saved = await saveTrack(track);
    track.id = saved;
    tracks = await loadTracks();
    render();
    closeSearch();
    const idx = tracks.findIndex((t) => t.id === saved);
    if (idx >= 0) playAt(idx);
  }

  function openSearch() {
    searchPanel.hidden = false;
    document.getElementById("content").style.display = "none";
    searchInput.focus();
    renderSearchError("");
    searchHint.textContent = "Aramak için yaz ve Ara butonuna bas.";
  }

  function closeSearch() {
    searchPanel.hidden = true;
    document.getElementById("content").style.display = "";
    searchInput.value = "";
    searchResults.innerHTML = "";
    hideSuggestions();
  }

  btnSearch.addEventListener("click", openSearch);
  btnCloseSearch.addEventListener("click", closeSearch);
  btnSearchGo.addEventListener("click", () => {
    if (searchInput.value.trim()) {
      hideSuggestions();
      searchYouTube(searchInput.value.trim());
    }
  });
  // ---- Arama önerileri (autocomplete) ----
  let suggestTimer = null;
  let suggestToken = 0;

  function hideSuggestions() {
    searchSuggestions.hidden = true;
    searchSuggestions.innerHTML = "";
  }

  function applySuggestion(text) {
    searchInput.value = text;
    hideSuggestions();
    searchYouTube(text);
  }

  function renderSuggestions(list) {
    searchSuggestions.innerHTML = "";
    const items = (list || []).slice(0, 10);
    if (!items.length) {
      searchSuggestions.hidden = true;
      return;
    }
    items.forEach((text) => {
      const li = document.createElement("li");
      li.className = "search-suggestion";
      li.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>';
      const span = document.createElement("span");
      span.className = "sugg-text";
      span.textContent = text;
      li.appendChild(span);
      li.addEventListener("mousedown", (e) => {
        e.preventDefault();
        applySuggestion(text);
      });
      searchSuggestions.appendChild(li);
    });
    searchSuggestions.hidden = false;
    searchHint.textContent = "Öneriler:";
  }

  function fetchSuggestions(query) {
    const token = ++suggestToken;
    const cbName = "msSuggest_" + token;
    const script = document.createElement("script");
    let finished = false;
    const cleanup = () => {
      script.remove();
      try { delete window[cbName]; } catch (e) { window[cbName] = undefined; }
    };
    window[cbName] = (data) => {
      finished = true;
      cleanup();
      const raw = (data && data[1]) || [];
      const list = raw.map((row) => (Array.isArray(row) ? row[0] : row)).filter(Boolean);
      renderSuggestions(list);
    };
    script.onerror = () => {
      if (!finished) { cleanup(); hideSuggestions(); }
    };
    script.src =
      "https://suggestqueries.google.com/complete/search?client=chrome&ds=yt&hl=tr&q=" +
      encodeURIComponent(query) +
      "&callback=" + cbName;
    document.body.appendChild(script);
    setTimeout(() => {
      if (!finished) { cleanup(); hideSuggestions(); }
    }, 3500);
  }

  searchInput.addEventListener("input", () => {
    clearTimeout(suggestTimer);
    const q = searchInput.value.trim();
    if (!q) {
      hideSuggestions();
      searchHint.textContent = "Aramak için yaz ve Ara butonuna bas.";
      return;
    }
    suggestTimer = setTimeout(() => fetchSuggestions(q), 180);
  });

  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && searchInput.value.trim()) {
      hideSuggestions();
      searchYouTube(searchInput.value.trim());
    } else if (e.key === "Escape") {
      hideSuggestions();
    }
  });

  // ---- Anasayfa ("Senin için" rafları) ----
  const homeSection = document.getElementById("home");
  const homeShelves = document.getElementById("home-shelves");
  const librarySection = document.getElementById("library");
  const btnHomeNav = document.getElementById("btn-home-nav");
  const btnLibraryNav = document.getElementById("btn-library-nav");

  const HOME_QUERIES = [
    "Hip-Hop",
    "Rock",
    "Jazz",
    "Anime Musics",
    "TranceCore musics",
    "Lo-Fi",
    "Pop",
    "Chill",
    "Electronic Musics",
    "Phonk",
    "BRAZILIAN FUNK",
  ];

  function showLibrary() {
    homeSection.hidden = true;
    librarySection.hidden = false;
    document.getElementById("content").scrollTop = 0;
    closeDrawer();
  }

  function showHome() {
    librarySection.hidden = true;
    homeSection.hidden = false;
    document.getElementById("content").scrollTop = 0;
    closeDrawer();
    loadHome();
  }

  async function loadHome() {
    if (homeShelves.dataset.loaded === "1") return;
    homeShelves.dataset.loaded = "1";
    homeShelves.innerHTML = "";
    for (const query of HOME_QUERIES) {
      const shelf = document.createElement("div");
      shelf.className = "shelf";
      const title = document.createElement("h3");
      title.className = "shelf-title";
      title.textContent = query;
      const row = document.createElement("div");
      row.className = "shelf-row";
      row.innerHTML = '<p class="shelf-msg">Yükleniyor…</p>';
      shelf.append(title, row);
      homeShelves.appendChild(shelf);
      const ok = await loadShelf(query, row);
      if (!ok) {
        homeShelves.dataset.loaded = "0";
        break;
      }
      await sleep(250);
    }
  }

  async function loadShelf(query, row) {
    const result = await searchMusic(query, "video");
    if (result.error) {
      row.innerHTML = '<p class="shelf-msg">' + result.error + "</p>";
      return false;
    }
    const items = (result.items || []).filter((it) => !it._isShort).slice(0, 12);
    row.innerHTML = "";
    if (!items.length) {
      row.innerHTML = '<p class="shelf-msg">Sonuç yok.</p>';
      return true;
    }
    items.forEach((item) => row.appendChild(buildShelfCard(item)));
    return true;
  }

  function buildShelfCard(item) {
    const s = item.snippet;
    const thumb = (s.thumbnails && (s.thumbnails.medium || s.thumbnails.default)) || {};
    const card = document.createElement("div");
    card.className = "shelf-card";

    const th = document.createElement("div");
    th.className = "shelf-thumb";
    const img = document.createElement("img");
    img.src = thumb.url || "";
    img.alt = s.title;
    img.loading = "lazy";
    th.appendChild(img);

    const name = document.createElement("div");
    name.className = "shelf-name";
    name.textContent = s.title;

    const channel = document.createElement("div");
    channel.className = "shelf-channel";
    channel.textContent = s.channelTitle;

    const badges = buildBadgeRow(isLiveSnippet(s), item._views);
    if (badges) {
      card.append(th, badges, name, channel);
    } else {
      card.append(th, name, channel);
    }
    card.addEventListener("click", () => { addAndPlayYouTube(item); });
    return card;
  }

  btnHomeNav.addEventListener("click", showHome);
  btnLibraryNav.addEventListener("click", showLibrary);

  // ---- Sanatçı bul ----
  const artistPanel = document.getElementById("artist-panel");
  const artistSearchView = document.getElementById("artist-search-view");
  const artistSongsView = document.getElementById("artist-songs-view");
  const artistInput = document.getElementById("artist-input");
  const artistList = document.getElementById("artist-list");
  const artistHint = document.getElementById("artist-hint");
  const artistResults = document.getElementById("artist-results");
  const artistPanelTitle = document.getElementById("artist-panel-title");
  const btnArtistFind = document.getElementById("btn-artist-find");
  const btnArtistClose = document.getElementById("btn-artist-close");
  const btnArtistBack = document.getElementById("btn-artist-back");

  const DEFAULT_ARTISTS = [
    "The Weeknd", "Taylor Swift", "Drake", "Eminem", "Billie Eilish",
    "Ed Sheeran", "Ariana Grande", "Bruno Mars", "Rihanna", "Coldplay",
    "Imagine Dragons", "Dua Lipa", "Post Malone", "Kendrick Lamar", "Adele",
    "Queen", "Michael Jackson", "Sezen Aksu", "Tarkan", "Barış Manço",
    "Duman", "Müslüm Gürses", "Ezhel", "Sertab Erener"
  ];

  let artistDebounce = null;

  function renderArtists(items) {
    artistList.innerHTML = "";
    if (!items.length) {
      artistList.innerHTML = '<p class="artist-msg">Sonuç yok.</p>';
      return;
    }
    items.forEach((artist) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "artist-item";

      const av = document.createElement("div");
      av.className = "artist-avatar";
      if (artist.thumb) {
        const img = document.createElement("img");
        img.src = artist.thumb;
        img.alt = artist.name;
        img.loading = "lazy";
        av.appendChild(img);
      } else {
        av.textContent = (artist.name || "?").charAt(0).toUpperCase();
      }

      const nm = document.createElement("div");
      nm.className = "artist-item-name";
      nm.textContent = artist.name;

      btn.append(av, nm);
      btn.addEventListener("click", () => selectArtist(artist));
      artistList.appendChild(btn);
    });
  }

  function showArtistSearchState() {
    artistSearchView.hidden = false;
    artistSongsView.hidden = true;
    btnArtistBack.hidden = true;
    artistPanelTitle.textContent = "Sanatçı Bul";
  }

  function openArtistPanel() {
    artistPanel.hidden = false;
    showArtistSearchState();
    artistInput.value = "";
    artistInput.focus();
    artistHint.textContent = "Popüler sanatçılar";
    renderArtists(DEFAULT_ARTISTS.map((name) => ({ name })));
  }

  function closeArtistPanel() {
    clearTimeout(artistDebounce);
    artistPanel.hidden = true;
    artistResults.innerHTML = "";
  }

  async function searchArtists(query) {
    if (!query) {
      artistHint.textContent = "Popüler sanatçılar";
      renderArtists(DEFAULT_ARTISTS.map((name) => ({ name })));
      return;
    }
    artistHint.textContent = "Aranıyor…";
    const result = await searchMusic(query, "channel");
    if (result.error) {
      artistHint.textContent = result.error;
      return;
    }
    const items = (result.items || []).filter((x) => x.name);
    artistHint.textContent = items.length ? "Sanatçılar" : "Sonuç yok.";
    renderArtists(items);
  }

  function selectArtist(artist) {
    artistSearchView.hidden = true;
    artistSongsView.hidden = false;
    btnArtistBack.hidden = false;
    artistPanelTitle.textContent = artist.name;
    loadArtistSongs(artist);
  }

  async function loadArtistSongs(artist) {
    artistResults.innerHTML = '<li class="artist-msg">Yükleniyor…</li>';
    const result = await searchMusic(artist.name, "video");
    if (result.error) {
      artistResults.innerHTML = '<li class="artist-msg">' + result.error + "</li>";
      return;
    }
    const items = (result.items || []).filter((it) => !it._isShort).slice(0, 30);
    renderArtistSongs(items);
  }

  function renderArtistSongs(items) {
    artistResults.innerHTML = "";
    if (!items.length) {
      artistResults.innerHTML = '<li class="artist-msg">Sonuç yok.</li>';
      return;
    }
    items.forEach((item) => {
      const s = item.snippet;
      const thumb = (s.thumbnails && (s.thumbnails.medium || s.thumbnails.default)) || {};
      const li = document.createElement("li");
      li.className = "search-result";

      const img = document.createElement("img");
      img.src = thumb.url || "";
      img.alt = s.title;

      const info = document.createElement("div");
      info.className = "result-info";
      const title = document.createElement("div");
      title.className = "result-title";
      title.textContent = s.title;
      const channel = document.createElement("div");
      channel.className = "result-channel";
      channel.textContent = s.channelTitle;
      info.append(title, channel);
      const badges = buildBadgeRow(isLiveSnippet(s), item._views);
      if (badges) info.appendChild(badges);

      li.append(img, info);
      li.addEventListener("click", () => {
        addAndPlayYouTube(item);
        closeArtistPanel();
      });
      artistResults.appendChild(li);
    });
  }

  btnArtistFind.addEventListener("click", openArtistPanel);
  btnArtistClose.addEventListener("click", closeArtistPanel);
  btnArtistBack.addEventListener("click", () => {
    showArtistSearchState();
    artistInput.focus();
  });
  artistInput.addEventListener("input", () => {
    clearTimeout(artistDebounce);
    const q = artistInput.value.trim();
    if (!q) {
      artistHint.textContent = "Popüler sanatçılar";
      renderArtists(DEFAULT_ARTISTS.map((name) => ({ name })));
      return;
    }
    if (q.length < 2) return;
    artistDebounce = setTimeout(() => searchArtists(q), 700);
  });
  artistInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      clearTimeout(artistDebounce);
      searchArtists(artistInput.value.trim());
    }
  });

  // ---- Veri (IndexedDB) ----
  let tracks = [];
  let currentIndex = -1;
  let shuffle = false;
  let loop = false;

  const DB_NAME = "musiverse";
  const STORE = "tracks";

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function loadTracks() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  // Yerel dosyalarda süresi 0 kalmış kayıtları blob'dan okuyup düzelt
  async function repairDurations() {
    let changed = false;
    for (const t of tracks) {
      if (t.source === "youtube" || t.duration || !t.blob) continue;
      const { duration } = await readAudioMetadata(t.blob);
      if (duration) {
        t.duration = duration;
        await saveTrack(t);
        changed = true;
      }
    }
    if (changed) tracks = await loadTracks();
  }

  async function saveTrack(track) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const req = tx.objectStore(STORE).put(track);
      req.onsuccess = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function deleteTrack(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ---- Yardımcılar ----
  function formatTime(sec) {
    if (!isFinite(sec) || sec < 0) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ":" + String(s).padStart(2, "0");
  }

  function readAudioMetadata(file) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const el = document.createElement("audio");
      el.preload = "metadata";
      el.src = url;
      el.onloadedmetadata = () => {
        resolve({ url, duration: el.duration });
      };
      el.onerror = () => {
        resolve({ url, duration: 0 });
      };
      setTimeout(() => {
        if (!el.duration) resolve({ url, duration: el.duration || 0 });
      }, 4000);
    });
  }

  function cleanName(filename) {
    return filename.replace(/\.(mp3|m4a|aac|ogg|wav|flac|opus)$/i, "");
  }

  async function addFiles(fileList) {
    const added = [];
    for (const file of fileList) {
      if (!file.type.startsWith("audio/") && !/\.(mp3|m4a|aac|ogg|wav|flac)$/i.test(file.name)) continue;
      const { duration } = await readAudioMetadata(file);
      const track = {
        title: cleanName(file.name),
        artist: "Bilinmeyen",
        duration: duration || 0,
        size: file.size,
        name: file.name,
        blob: file
      };
      await saveTrack(track);
      added.push(track);
    }
    return added;
  }

  // ---- Render ----
  function render() {
    trackList.innerHTML = "";
    emptyState.style.display = tracks.length ? "none" : "block";
    trackCount.textContent = tracks.length + " şarkı";

    tracks.forEach((track, i) => {
      const li = document.createElement("li");
      li.className = "track" + (i === currentIndex ? " playing" : "");
      li.dataset.index = i;

      const thumb = document.createElement("div");
      thumb.className = "track-thumb";
      if (track.source === "youtube" && track.thumbnail) {
        thumb.style.background = "none";
        const im = document.createElement("img");
        im.src = track.thumbnail;
        im.alt = "";
        thumb.appendChild(im);
      } else {
        thumb.textContent = "♪";
      }

      const info = document.createElement("div");
      info.className = "track-info";
      const name = document.createElement("div");
      name.className = "track-name";
      name.textContent = track.title;
      const artist = document.createElement("div");
      artist.className = "track-artist";
      artist.textContent = track.artist;
      const badges = buildBadgeRow(track.live, track.views);
      if (badges) info.appendChild(badges);
      info.append(name, artist);

      const dur = document.createElement("span");
      dur.className = "track-duration";
      dur.textContent = formatTime(track.duration);

      const rm = document.createElement("button");
      rm.className = "track-remove";
      rm.textContent = "✕";
      rm.setAttribute("aria-label", "Kaldır");
      rm.addEventListener("click", (e) => {
        e.stopPropagation();
        removeTrack(track.id, i);
      });

      li.append(thumb, info, dur, rm);
      li.addEventListener("click", () => playAt(i));
      trackList.appendChild(li);
    });
  }

  async function removeTrack(id, index) {
    if (index === currentIndex) {
      audio.pause();
      pauseYT();
      currentIndex = -1;
      updatePlayUI();
    } else if (index < currentIndex) {
      currentIndex--;
    }
    await deleteTrack(id);
    tracks = await loadTracks();
    render();
  }

  // ---- YouTube IFrame API ----
  let ytPlayer = null;
  let ytReady = false;
  let pendingVideoId = null;
  let ytTimer = null;

  function currentTrack() { return tracks[currentIndex] || null; }

  function setSeekFill(pct) {
    const el = document.getElementById("seek-fill");
    if (el) el.style.width = pct + "%";
  }

  function loadYouTubeAPI() {
    if (window.YT && window.YT.Player) { ytReady = true; initYTPlayer(); return; }
    if (document.getElementById("yt-api")) return;
    const tag = document.createElement("script");
    tag.id = "yt-api";
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  }

  window.onYouTubeIframeAPIReady = function () {
    ytReady = true;
    initYTPlayer();
  };

  function initYTPlayer() {
    if (!ytReady || ytPlayer) return;
    ytPlayer = new YT.Player("yt-player", {
      height: "270",
      width: "480",
      playerVars: { autoplay: 0, controls: 0, playsinline: 1, rel: 0 },
      events: {
        onReady: () => {
          applyVolume();
          if (pendingVideoId) {
            ytPlayer.loadVideoById(pendingVideoId);
            pendingVideoId = null;
          }
        },
        onStateChange: onYTState
      }
    });
  }

  async function onYTState(e) {
    const t = currentTrack();
    if (!t || t.source !== "youtube") return;
    if (e.data === YT.PlayerState.PLAYING) {
      updatePlayUI();
      startYTProgress();
      updateMediaSession("playing");
      // Süre öğrenilince track'e kaydet (kitaplıkta görünsün)
      try {
        const d = ytPlayer.getDuration() || 0;
        if (d && !t.duration) {
          t.duration = d;
          await saveTrack(t);
          render();
        }
      } catch (err) {}
    } else if (e.data === YT.PlayerState.PAUSED) {
      updatePlayUI();
      stopYTProgress();
      updateMediaSession("paused");
      releaseWakeLock();
    } else if (e.data === YT.PlayerState.ENDED) {
      stopYTProgress();
      updateMediaSession("none");
      releaseWakeLock();
      next(true);
    }
  }

  function startYTProgress() {
    stopYTProgress();
    ytTimer = setInterval(() => {
      const t = currentTrack();
      if (!ytPlayer || !t || t.source !== "youtube") return;
      const d = ytPlayer.getDuration() || 0;
      const c = ytPlayer.getCurrentTime() || 0;
      if (isSeeking) return;
      seek.value = d ? (c / d) * 100 : 0;
      setSeekFill(seek.value);
      timeCurrent.textContent = formatTime(c);
      timeTotal.textContent = formatTime(d);
    }, 500);
  }

  function stopYTProgress() {
    if (ytTimer) { clearInterval(ytTimer); ytTimer = null; }
  }

  function pauseYT() {
    if (ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo();
    stopYTProgress();
  }

  function playYouTube(track) {
    loadYouTubeAPI();
    if (ytReady && ytPlayer) {
      if (ytPlayer.loadVideoById) {
        ytPlayer.loadVideoById(track.videoId);
        applyVolume();
      } else {
        pendingVideoId = track.videoId;
      }
    } else {
      pendingVideoId = track.videoId;
    }
  }

  // ---- Oynatma ----
  function getTrackUrl(track) {
    if (track.blob) return URL.createObjectURL(track.blob);
    return track.url;
  }

  function setArtwork(track) {
    if (track.source === "youtube" && track.thumbnail) {
      document.getElementById("artwork-img").src = track.thumbnail;
      document.getElementById("artwork-img").hidden = false;
      document.getElementById("artwork-icon").style.display = "none";
    } else {
      document.getElementById("artwork-img").hidden = true;
      document.getElementById("artwork-icon").style.display = "";
    }
  }

  function playAt(index) {
    if (index < 0 || index >= tracks.length) return;
    currentIndex = index;
    const track = tracks[index];
    nowTitle.textContent = track.title;
    nowArtist.textContent = track.artist;
    setArtwork(track);
    // Yeni parça: ilerleme çubuğunu sıfırla
    seek.value = 0;
    setSeekFill(0);
    timeCurrent.textContent = "0:00";
    timeTotal.textContent = "0:00";
    if (track.source === "youtube") {
      audio.pause();
      audio.removeAttribute("src");
      playYouTube(track);
      acquireWakeLock();
    } else {
      pauseYT();
      audio.src = getTrackUrl(track);
      audio.play().catch(() => {});
      acquireWakeLock();
    }
    render();
  }

  function next(auto) {
    if (!tracks.length) return;
    // Şarkı kendiliğinden bitince ve loop açıksa aynı parçayı baştan çal
    if (auto && loop) {
      playAt(currentIndex);
      return;
    }
    if (shuffle && tracks.length > 1) {
      let nextIdx;
      do { nextIdx = Math.floor(Math.random() * tracks.length); } while (nextIdx === currentIndex);
      playAt(nextIdx);
      return;
    }
    const nextIdx = currentIndex + 1;
    if (nextIdx >= tracks.length) {
      if (auto) {
        pauseYT();
        audio.pause();
        seek.value = 0;
        setSeekFill(0);
        updatePlayUI();
      } else {
        // Manuel next: sona gelince başa sar
        playAt(0);
      }
    } else {
      playAt(nextIdx);
    }
  }

  function prev() {
    if (!tracks.length) return;
    const t = currentTrack();
    if (t && t.source === "youtube") {
      if (ytPlayer && ytPlayer.getCurrentTime() > 3) {
        ytPlayer.seekTo(0);
        return;
      }
    } else if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const prevIdx = currentIndex - 1;
    if (prevIdx < 0) playAt(tracks.length - 1);
    else playAt(prevIdx);
  }

  function togglePlay() {
    if (!tracks.length) return;
    if (currentIndex < 0) { playAt(0); return; }
    const t = currentTrack();
    if (t.source === "youtube") {
      if (!ytReady || !ytPlayer) { loadYouTubeAPI(); return; }
      const st = ytPlayer.getPlayerState();
      if (st === YT.PlayerState.PLAYING || st === YT.PlayerState.BUFFERING) { ytPlayer.pauseVideo(); releaseWakeLock(); }
      else { ytPlayer.playVideo(); acquireWakeLock(); }
    } else {
      if (audio.paused) { audio.play(); acquireWakeLock(); }
      else { audio.pause(); releaseWakeLock(); }
    }
  }

  function updatePlayUI() {
    const t = currentTrack();
    let playing = false;
    if (t && t.source === "youtube") {
      playing = !!(ytPlayer && ytPlayer.getPlayerState &&
        (ytPlayer.getPlayerState() === YT.PlayerState.PLAYING ||
         ytPlayer.getPlayerState() === YT.PlayerState.BUFFERING));
    } else {
      playing = !audio.paused && currentIndex >= 0;
    }
    iconPlay.style.display = playing ? "none" : "block";
    iconPause.style.display = playing ? "block" : "none";
  }

  // ---- Event'ler ----
  btnPlay.addEventListener("click", togglePlay);
  btnPrev.addEventListener("click", prev);
  btnNext.addEventListener("click", () => next(false));

  if (fileInput) {
    fileInput.addEventListener("change", async (e) => {
      const added = await addFiles(e.target.files);
      if (added.length) {
        tracks = await loadTracks();
        render();
      }
      fileInput.value = "";
    });
  }

  audio.addEventListener("loadedmetadata", () => {
    timeTotal.textContent = formatTime(audio.duration);
  });

  audio.addEventListener("timeupdate", () => {
    if (isSeeking) return;
    if (audio.duration) {
      const pct = (audio.currentTime / audio.duration) * 100;
      seek.value = pct;
      setSeekFill(pct);
      timeCurrent.textContent = formatTime(audio.currentTime);
    }
  });

  audio.addEventListener("play", updatePlayUI);
  audio.addEventListener("pause", () => {
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
    updatePlayUI();
    releaseWakeLock();
  });
  audio.addEventListener("ended", () => { if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "none"; next(true); });

  function applySeek() {
    const t = currentTrack();
    if (t && t.source === "youtube") {
      if (ytPlayer && ytPlayer.getDuration) {
        const d = ytPlayer.getDuration() || 0;
        ytPlayer.seekTo((seek.value / 100) * d, true);
        setSeekFill(seek.value);
      }
    } else if (audio.duration) {
      audio.currentTime = (seek.value / 100) * audio.duration;
      setSeekFill(seek.value);
    }
  }

  // Dokunma/sürükleme sırasında bar kıpırdamaz; bırakınca dokunulan yere gider.
  const seekWrap = document.getElementById("seek-wrap");
  let isSeeking = false;
  let seekPct = 0;

  function posToPct(e) {
    const rect = seekWrap.getBoundingClientRect();
    const x = e.type === "touchmove" || e.type === "touchstart" || e.type === "touchend"
      ? e.touches ? e.touches[0].clientX : (e.changedTouches ? e.changedTouches[0].clientX : 0)
      : e.clientX;
    return Math.max(0, Math.min(1, (x - rect.left) / rect.width));
  }

  seekWrap.addEventListener("pointerdown", (e) => {
    isSeeking = true;
    seekPct = posToPct(e);
    seekWrap.setPointerCapture && seekWrap.setPointerCapture(e.pointerId);
  });

  seekWrap.addEventListener("pointermove", (e) => {
    if (isSeeking) {
      // Bar hareket etmez, sadece hedefi hatırlar
      seekPct = posToPct(e);
    }
  });

  seekWrap.addEventListener("pointerup", (e) => {
    if (!isSeeking) return;
    isSeeking = false;
    seekPct = posToPct(e);
    seek.value = seekPct * 100;
    setSeekFill(seekPct * 100);
    applySeek();
  });

  seekWrap.addEventListener("pointercancel", () => {
    isSeeking = false;
  });

  btnShuffle.addEventListener("click", () => {
    shuffle = !shuffle;
    btnShuffle.classList.toggle("active", shuffle);
  });

  btnLoop.addEventListener("click", () => {
    loop = !loop;
    btnLoop.classList.toggle("active", loop);
    audio.loop = loop;
  });

  // ---- Media Session API ----
  function updateMediaSession(state) {
    if (!("mediaSession" in navigator)) return;
    const t = currentTrack();
    if (t) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: t.title,
        artist: t.artist,
        album: "Musiverse",
        artwork: t.source === "youtube" && t.thumbnail
          ? [{ src: t.thumbnail, sizes: "480x360", type: "image/jpeg" }]
          : [{ src: "icons/icon-512.png", sizes: "512x512", type: "image/png" }]
      });
    }
    navigator.mediaSession.playbackState = state || "none";
  }

  function seekTo(seconds) {
    const t = currentTrack();
    if (t && t.source === "youtube") { if (ytPlayer && ytPlayer.seekTo) ytPlayer.seekTo(seconds, true); }
    else audio.currentTime = seconds;
  }

  if ("mediaSession" in navigator) {
    navigator.mediaSession.setActionHandler("play", () => {
      const t = currentTrack();
      if (t && t.source === "youtube") { if (ytPlayer) ytPlayer.playVideo(); }
      else audio.play().catch(() => {});
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      const t = currentTrack();
      if (t && t.source === "youtube") pauseYT();
      else audio.pause();
    });
    navigator.mediaSession.setActionHandler("nexttrack", () => next(false));
    navigator.mediaSession.setActionHandler("previoustrack", prev);
    try {
      navigator.mediaSession.setActionHandler("seekbackward", (e) => {
        const offset = e.seekOffset || 10;
        const t = currentTrack();
        const cur = t && t.source === "youtube" ? (ytPlayer ? ytPlayer.getCurrentTime() : 0) : audio.currentTime;
        seekTo(Math.max(0, cur - offset));
      });
      navigator.mediaSession.setActionHandler("seekforward", (e) => {
        const offset = e.seekOffset || 10;
        const t = currentTrack();
        const cur = t && t.source === "youtube" ? (ytPlayer ? ytPlayer.getCurrentTime() : 0) : audio.currentTime;
        const dur = t && t.source === "youtube" ? (ytPlayer ? ytPlayer.getDuration() : 0) : audio.duration;
        seekTo(Math.min(dur || Infinity, cur + offset));
      });
      navigator.mediaSession.setActionHandler("seekto", (e) => {
        if (e.seekTime != null) seekTo(e.seekTime);
      });
    } catch (e) {}
  }

  audio.addEventListener("play", () => { updateMediaSession("playing"); });
  audio.addEventListener("pause", () => { updateMediaSession("paused"); releaseWakeLock(); });
  audio.addEventListener("ended", () => { updateMediaSession("none"); next(true); });

  // ---- Başlat ----
async function init() {
    await loadThemes();
    tracks = await loadTracks();
    await repairDurations();
    render();
    applyTheme(getTheme());
    applyView();
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }

  // Sekme tekrar görünür olunca uyandırma kilidini yeniden iste
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      const t = currentTrack();
      if (t && t.source === "youtube") {
        if (ytPlayer && ytPlayer.getPlayerState && ytPlayer.getPlayerState() === YT.PlayerState.PLAYING) acquireWakeLock();
      } else if (!audio.paused) {
        acquireWakeLock();
      }
    }
  });

  // Play intro.wav if available
  (function playIntroSound() {
    const introSound = new Audio('intro.wav');
    introSound.preload = 'auto';
    let played = false;
    function tryPlay() {
      if (played) return;
      introSound.play().then(() => { played = true; }).catch(() => {});
    }
    introSound.volume = 0.6;
    tryPlay();
    document.addEventListener('click', tryPlay, { once: true });
    document.addEventListener('touchstart', tryPlay, { once: true });
  })();

  init();
})();