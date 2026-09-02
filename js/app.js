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
      Object.keys(vars).forEach((k) => {
        document.documentElement.style.setProperty(k, vars[k]);
      });
      localStorage.setItem("musiverse-theme", id);
      await applyThemeBackground(id);
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

async function applyThemeBackground(id) {
    const theme = THEMES.find((t) => t.id === id);
    if (!theme || !theme.image) {
      document.body.classList.remove("has-bg");
      document.body.style.backgroundImage = "";
      return;
    }
    const exists = await imageExists(theme.image);
    if (exists) {
      document.body.classList.add("has-bg");
      document.body.style.backgroundImage = "url('" + theme.image + "')";
      document.body.style.backgroundSize = "cover";
      document.body.style.backgroundPosition = "center";
      document.body.style.backgroundRepeat = "no-repeat";
      document.body.style.backgroundAttachment = "scroll";
      return;
    }
    // Resim yoksa arka planı kaldır
    document.body.classList.remove("has-bg");
    document.body.style.backgroundImage = "";
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


  // ---- YouTube arama ----
  const YT_API = "https://www.googleapis.com/youtube/v3/search";
  const YT_WATCH = "https://www.youtube.com/watch?v=";

  function getApiKey() {
    return (window.MUSIVERSE_CONFIG && window.MUSIVERSE_CONFIG.youtubeApiKey) || "";
  }

  function renderSearchError(msg) {
    searchResults.innerHTML = "";
    searchHint.textContent = msg;
  }

  async function searchYouTube(query) {
    const key = getApiKey();
    if (!key) {
      renderSearchError("API anahtarı ayarlanmadı. js/config.js dosyasına YouTube Data API v3 anahtarını ekle.");
      return;
    }
    const params = new URLSearchParams({
      part: "snippet",
      q: query,
      type: "video",
      maxResults: 50,
      key
    });
    try {
      const res = await fetch(YT_API + "?" + params.toString());
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const code = err.error && err.error.code;
        renderSearchError(
          "YouTube API hatası (" + (res.status || code) + "). Anahtarı kontrol et."
        );
        return;
      }
      const data = await res.json();
      renderSearchResults(data.items || []);
    } catch (e) {
      renderSearchError("Arama başarısız oldu. İnternet bağlantını kontrol et.");
    }
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

      li.append(img, info);
      li.addEventListener("click", () => { closeSearch(); addAndPlayYouTube(item); });
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
      thumbnail: thumb.url || ""
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
  }

  btnSearch.addEventListener("click", openSearch);
  btnCloseSearch.addEventListener("click", closeSearch);
  btnSearchGo.addEventListener("click", () => {
    if (searchInput.value.trim()) searchYouTube(searchInput.value.trim());
  });
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && searchInput.value.trim()) {
      searchYouTube(searchInput.value.trim());
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
        im.style.cssText = "width:100%;height:100%;object-fit:cover;border-radius:8px;";
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
      if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
      // Süre öğrenilince track'e kaydet (kitaplıkta görünsün)
      try {
        const d = ytPlayer.getDuration() || 0;
        if (d && !t.duration) {
          t.duration = d;
          await saveTrack(t);
          render();
        }
      } catch (err) {}
      if ("mediaSession" in navigator) {
        const t = currentTrack();
        navigator.mediaSession.metadata = new MediaMetadata({
          title: t.title,
          artist: t.artist,
          album: "Musiverse",
          artwork: t.thumbnail ? [{ src: t.thumbnail, sizes: "480x360" }] : undefined
        });
      }
    } else if (e.data === YT.PlayerState.PAUSED) {
      updatePlayUI();
      stopYTProgress();
      releaseWakeLock();
    } else if (e.data === YT.PlayerState.ENDED) {
      stopYTProgress();
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
      seek.max = d || 0;
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
    seek.max = audio.duration || 0;
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

  // Medya oturumu anahtarını kaldır (mobil tarayıcı şarkı bilgisini gösterebilir)
  if ("mediaSession" in navigator) {
    navigator.mediaSession.setActionHandler("play", () => {
      const t = currentTrack();
      if (t && t.source === "youtube") { if (ytPlayer) ytPlayer.playVideo(); }
      else audio.play();
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      const t = currentTrack();
      if (t && t.source === "youtube") pauseYT();
      else audio.pause();
    });
    navigator.mediaSession.setActionHandler("nexttrack", () => next(false));
    navigator.mediaSession.setActionHandler("previoustrack", prev);
  }

  audio.addEventListener("play", () => {
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
    updatePlayUI();
    if (currentIndex >= 0 && "mediaSession" in navigator) {
      const t = tracks[currentIndex];
      navigator.mediaSession.metadata = new MediaMetadata({
        title: t.title,
        artist: t.artist,
        album: "Musiverse",
        artwork: t.source === "youtube" && t.thumbnail
          ? [{ src: t.thumbnail, sizes: "480x360" }] : undefined
      });
    }
  });

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