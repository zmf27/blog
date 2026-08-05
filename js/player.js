(function () {
  'use strict';

  const root = document.querySelector('[data-player]');
  if (!root) return;

  const audio = root.querySelector('[data-audio]');
  const title = root.querySelector('[data-title]');
  const artist = root.querySelector('[data-artist]');
  const cover = root.querySelector('[data-cover]');
  const play = root.querySelector('[data-play]');
  const prev = root.querySelector('[data-prev]');
  const next = root.querySelector('[data-next]');
  const progress = root.querySelector('[data-progress]');
  const progressFill = root.querySelector('[data-progress-fill]');
  const currentTime = root.querySelector('[data-current]');
  const duration = root.querySelector('[data-duration]');
  const queueToggle = root.querySelector('[data-queue-toggle]');
  const queue = root.querySelector('[data-queue]');
  const queueList = root.querySelector('[data-queue-list]');
  const queueCount = root.querySelector('[data-queue-count]');
  const playlistId = root.dataset.playlistId;
  const fallbackCover = cover.src;
  const api = `https://api.i-meto.com/meting/api?server=netease&type=playlist&id=${encodeURIComponent(playlistId)}`;
  const storageKey = 'nilcherdim-player-v2';

  let songs = [];
  let index = 0;
  let restoredTime = 0;
  let failures = 0;

  function formatTime(value) {
    if (!Number.isFinite(value)) return '0:00';
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  function readState() {
    try { return JSON.parse(sessionStorage.getItem(storageKey) || '{}'); }
    catch (_) { return {}; }
  }

  function saveState() {
    if (!songs.length) return;
    sessionStorage.setItem(storageKey, JSON.stringify({ index, time: audio.currentTime || 0, volume: audio.volume, wasPlaying: !audio.paused }));
  }

  function safeIndex(value) {
    if (!songs.length) return 0;
    return (value + songs.length) % songs.length;
  }

  function setTrack(nextIndex, shouldPlay, startAt) {
    if (!songs.length) return;
    index = safeIndex(nextIndex);
    const song = songs[index];
    title.textContent = song.title || '未知曲目';
    artist.textContent = song.author || '网易云音乐';
    cover.src = song.pic || fallbackCover;
    cover.alt = `${song.title || '当前歌曲'} 封面`;
    audio.src = song.url;
    audio.load();
    restoredTime = Number(startAt) || 0;
    updateQueueState();
    saveState();
    if (shouldPlay) {
      audio.play().then(() => { failures = 0; }).catch(() => setPlaying(false));
    }
  }

  function setPlaying(playing) {
    root.classList.toggle('is-playing', playing);
    play.setAttribute('aria-label', playing ? '暂停' : '播放');
  }

  function renderQueue() {
    queueCount.textContent = `${songs.length} 首`;
    queueList.innerHTML = songs.map((song, songIndex) => `
      <button class="queue-item${songIndex === index ? ' is-active' : ''}" type="button" data-track-index="${songIndex}">
        <span class="queue-index">${String(songIndex + 1).padStart(2, '0')}</span>
        <span class="queue-copy"><strong>${escapeHtml(song.title || '未知曲目')}</strong><span>${escapeHtml(song.author || '网易云音乐')}</span></span>
        <span class="queue-state">▶</span>
      </button>`).join('');
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }

  function updateQueueState() {
    queueList.querySelectorAll('[data-track-index]').forEach((item) => item.classList.toggle('is-active', Number(item.dataset.trackIndex) === index));
  }

  async function loadPlaylist() {
    try {
      const response = await fetch(api, { mode: 'cors' });
      if (!response.ok) throw new Error('Playlist unavailable');
      const data = await response.json();
      songs = Array.isArray(data) ? data.filter((song) => song && song.url) : [];
      if (!songs.length) throw new Error('Empty playlist');
      const state = readState();
      audio.volume = Number.isFinite(state.volume) ? Math.min(1, Math.max(0, state.volume)) : .72;
      index = safeIndex(Number(state.index) || 0);
      renderQueue();
      setTrack(index, false, Number(state.time) || 0);
      if (state.wasPlaying) artist.textContent = `${songs[index].author || '网易云音乐'} · 点击继续`;
    } catch (_) {
      title.textContent = '歌单暂时无法连接';
      artist.textContent = '点击歌名可前往网易云音乐';
      queueCount.textContent = '离线';
      play.disabled = true;
      prev.disabled = true;
      next.disabled = true;
    }
  }

  play.addEventListener('click', () => {
    if (!songs.length) return;
    if (audio.paused) audio.play().catch(() => setPlaying(false));
    else audio.pause();
  });
  prev.addEventListener('click', () => setTrack(index - 1, !audio.paused, 0));
  next.addEventListener('click', () => setTrack(index + 1, !audio.paused, 0));

  queueToggle.addEventListener('click', () => {
    const open = queue.hidden;
    queue.hidden = !open;
    queueToggle.setAttribute('aria-expanded', String(open));
  });

  queueList.addEventListener('click', (event) => {
    const item = event.target.closest('[data-track-index]');
    if (!item) return;
    setTrack(Number(item.dataset.trackIndex), true, 0);
  });

  document.addEventListener('click', (event) => {
    if (!queue.hidden && !root.contains(event.target)) {
      queue.hidden = true;
      queueToggle.setAttribute('aria-expanded', 'false');
    }
  });

  progress.addEventListener('click', (event) => {
    if (!Number.isFinite(audio.duration)) return;
    const rect = progress.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audio.duration;
  });

  audio.addEventListener('loadedmetadata', () => {
    duration.textContent = formatTime(audio.duration);
    if (restoredTime > 0 && restoredTime < audio.duration - 1) audio.currentTime = restoredTime;
    restoredTime = 0;
  });
  audio.addEventListener('timeupdate', () => {
    currentTime.textContent = formatTime(audio.currentTime);
    duration.textContent = formatTime(audio.duration);
    progressFill.style.width = `${Number.isFinite(audio.duration) ? (audio.currentTime / audio.duration) * 100 : 0}%`;
  });
  audio.addEventListener('play', () => setPlaying(true));
  audio.addEventListener('pause', () => { setPlaying(false); saveState(); });
  audio.addEventListener('ended', () => setTrack(index + 1, true, 0));
  audio.addEventListener('error', () => {
    if (!songs.length || failures >= Math.min(songs.length, 6)) {
      setPlaying(false);
      artist.textContent = '当前歌曲暂不可用，请手动切换';
      return;
    }
    failures += 1;
    setTrack(index + 1, true, 0);
  });
  cover.addEventListener('error', () => { cover.src = fallbackCover; });
  window.addEventListener('pagehide', saveState);
  window.setInterval(saveState, 3000);

  loadPlaylist();
})();
