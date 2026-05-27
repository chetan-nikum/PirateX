/* ============================================
   PIRATE X — script.js
   TMDB Integration + Full Homepage Logic
   ============================================ */

const TMDB_KEY = '4e44d9029b1270a757cddc766a1bcb63';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';
const TITLE_ARTWORK_LANG = 'en';

// Genre map
const GENRE_MAP = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
  10759: 'Action & Adventure', 10765: 'Sci-Fi & Fantasy',
  10768: 'War & Politics'
};

// ============ HERO DATA ============
let heroMovies = [];
let heroIndex = 0;
let heroTimer = null;

async function fetchHero() {
  try {
    const res = await fetch(`${TMDB_BASE}/trending/movie/week?api_key=${TMDB_KEY}&language=en-US`);
    const data = await res.json();
    heroMovies = data.results.filter(m => m.backdrop_path).slice(0, 6);
    renderHero(0);
    setupHeroDots();
    startHeroTimer();
  } catch (e) {
    console.error('Hero fetch error:', e);
  }
}

async function renderHero(idx) {
  heroIndex = idx;
  const m = heroMovies[idx];
  if (!m) return;

  const heroBg = document.getElementById('heroBg');
  const heroContent = document.getElementById('heroContent');
  if (!heroBg || !heroContent) return;

  heroBg.style.backgroundImage = `url(${IMG_BASE}/original${m.backdrop_path})`;
  const genres = (m.genre_ids || []).slice(0, 3).map(id => GENRE_MAP[id]).filter(Boolean);
  const year = (m.release_date || '').slice(0, 4);
  const rating = m.vote_average ? m.vote_average.toFixed(1) : 'N/A';
  const overview = m.overview || '';
  let duration = '';

  try {
    const res = await fetch(`${TMDB_BASE}/movie/${m.id}?api_key=${TMDB_KEY}&language=en-US`);
    const details = await res.json();
    duration = formatDuration(details.runtime);
  } catch (e) {}

  heroContent.innerHTML = `
    <div class="hero-badge">Featured</div>
    <h1 class="hero-title">${m.title || m.name}</h1>
    <div class="hero-meta">
      <div class="hero-rating">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        ${rating}
      </div>
      ${year ? `<span class="hero-sep"></span><span class="hero-year">${year}</span>` : ''}
      ${duration ? `<span class="hero-sep"></span><span class="hero-duration">${duration}</span>` : ''}
      ${m.original_language ? `<span class="hero-sep"></span><span class="hero-lang">${m.original_language.toUpperCase()}</span>` : ''}
      ${genres.length ? `<span class="hero-sep"></span><div class="hero-genres">${genres.map(g => `<span class="hero-genre-tag">${g}</span>`).join('')}</div>` : ''}
    </div>
    <p class="hero-desc">${overview}</p>
    <div class="hero-btns">
      <button class="btn-play" onclick="goWatch(${m.id}, 'movie')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
        Play Now
      </button>
      <button class="btn-info" onclick="goWatch(${m.id}, 'movie')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        More Info
      </button>
    </div>
  `;

  document.querySelectorAll('#heroContent .btn-play, #heroContent .btn-info').forEach(btn => {
    btn.onclick = () => goWatch(m.id, 'movie', m);
  });

  updateHeroDots(idx);
}

function setupHeroDots() {
  const dotsEl = document.getElementById('heroDots');
  if (!dotsEl) return;
  dotsEl.innerHTML = heroMovies.map((_, i) =>
    `<span class="hero-dot${i === 0 ? ' active' : ''}" onclick="renderHero(${i}); resetHeroTimer()"></span>`
  ).join('');
}

function updateHeroDots(idx) {
  document.querySelectorAll('.hero-dot').forEach((d, i) => {
    d.classList.toggle('active', i === idx);
  });
}

function startHeroTimer() {
  heroTimer = setInterval(() => {
    renderHero((heroIndex + 1) % heroMovies.length);
  }, 6000);
}

function resetHeroTimer() {
  clearInterval(heroTimer);
  startHeroTimer();
}

window.resetHeroTimer = resetHeroTimer;

document.getElementById('heroPrev')?.addEventListener('click', () => {
  const idx = (heroIndex - 1 + heroMovies.length) % heroMovies.length;
  renderHero(idx);
  resetHeroTimer();
});
document.getElementById('heroNext')?.addEventListener('click', () => {
  const idx = (heroIndex + 1) % heroMovies.length;
  renderHero(idx);
  resetHeroTimer();
});

// ============ MOVIE ROW RENDERING ============
function renderSkeletons(rowId, count = 8) {
  const row = document.getElementById(rowId);
  if (!row) return;
  row.innerHTML = Array.from({ length: count }, () => `
    <div class="card-skeleton">
      <div class="card-skel-img"></div>
      <div class="card-skel-info">
        <div class="card-skel-line" style="width:80%"></div>
        <div class="card-skel-line" style="width:50%"></div>
      </div>
    </div>
  `).join('');
}

const durationCache = new Map();
const artworkCache = new Map();

function formatDuration(minutes) {
  const total = Number(minutes);
  if (!Number.isFinite(total) || total <= 0) return '';
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return hours ? `${hours}h${mins ? `${mins}m` : ''}` : `${mins}m`;
}

function getItemDuration(m) {
  if (m.runtime) return formatDuration(m.runtime);
  if (Array.isArray(m.episode_run_time) && m.episode_run_time[0]) {
    return formatDuration(m.episode_run_time[0]);
  }
  return '';
}

function normalizeMediaType(mediaType) {
  return mediaType === 'tv' ? 'tv' : 'movie';
}

function getFallbackArtwork(m) {
  if (m.backdrop_path) {
    return {
      src: `${IMG_BASE}/w780${m.backdrop_path}`,
      isPoster: false
    };
  }

  if (m.poster_path) {
    return {
      src: `${IMG_BASE}/w500${m.poster_path}`,
      isPoster: true
    };
  }

  return {
    src: `https://via.placeholder.com/334x188/111111/333333?text=No+Image`,
    isPoster: false
  };
}

function pickBestImage(images, preferredAspect) {
  return [...images]
    .filter(img => img?.file_path)
    .sort((a, b) => {
      const langScore = img => img.iso_639_1 === TITLE_ARTWORK_LANG ? 2 : (img.iso_639_1 ? 1 : 0);
      const voteScore = img => (img.vote_average || 0) + (img.vote_count || 0) * 0.02;
      const aspectScore = img => {
        if (!preferredAspect || !img.aspect_ratio) return 0;
        return Math.max(0, 2 - Math.abs(img.aspect_ratio - preferredAspect));
      };

      return (
        (langScore(b) - langScore(a)) ||
        (aspectScore(b) - aspectScore(a)) ||
        (voteScore(b) - voteScore(a))
      );
    })[0];
}

async function getTitleArtwork(id, mediaType, fallbackItem) {
  const detailType = normalizeMediaType(mediaType);
  const cacheKey = `${detailType}:${id}`;

  if (artworkCache.has(cacheKey)) {
    return artworkCache.get(cacheKey);
  }

  const fallback = getFallbackArtwork(fallbackItem);

  try {
    const url = `${TMDB_BASE}/${detailType}/${id}/images?api_key=${TMDB_KEY}&include_image_language=${TITLE_ARTWORK_LANG}`;
    const res = await fetch(url);
    const data = await res.json();

    const titleBackdrops = (data.backdrops || []).filter(img => img.iso_639_1);
    const titlePosters = (data.posters || []).filter(img => img.iso_639_1);
    const bestBackdrop = pickBestImage(titleBackdrops, 16 / 9);
    const bestPoster = pickBestImage(titlePosters, 2 / 3);

    const artwork = bestBackdrop
      ? { src: `${IMG_BASE}/w780${bestBackdrop.file_path}`, isPoster: false }
      : bestPoster
        ? { src: `${IMG_BASE}/w500${bestPoster.file_path}`, isPoster: true }
        : fallback;

    artworkCache.set(cacheKey, artwork);
    return artwork;
  } catch (e) {
    artworkCache.set(cacheKey, fallback);
    return fallback;
  }
}

async function hydrateCardDuration(card, id, mediaType) {
  const durationEl = card.querySelector('.card-duration');
  const seasonsEl = card.querySelector('.card-seasons');
  const episodesEl = card.querySelector('.card-episodes');
  if (!durationEl) return;

  const detailType = mediaType === 'tv' ? 'tv' : 'movie';
  const cacheKey = `${detailType}:${id}`;

  if (durationCache.has(cacheKey)) {
    const cached = durationCache.get(cacheKey) || {};
    durationEl.textContent = cached.duration || '';
    durationEl.hidden = !durationEl.textContent;
    if (seasonsEl) {
      seasonsEl.textContent = cached.seasons || '';
      seasonsEl.hidden = !cached.seasons;
    }
    if (episodesEl) {
      episodesEl.textContent = cached.episodes || '';
      episodesEl.hidden = !cached.episodes;
    }
    return;
  }

  try {
    const res = await fetch(`${TMDB_BASE}/${detailType}/${id}?api_key=${TMDB_KEY}&language=en-US`);
    const data = await res.json();
    const meta = {
      duration: detailType === 'tv' ? '' : formatDuration(data.runtime),
      seasons: detailType === 'tv' && data.number_of_seasons
        ? `${data.number_of_seasons} ${data.number_of_seasons === 1 ? 'Season' : 'Seasons'}`
        : '',
      episodes: detailType === 'tv' && data.number_of_episodes
        ? `${data.number_of_episodes} ${data.number_of_episodes === 1 ? 'Episode' : 'Episodes'}`
        : ''
    };

    durationCache.set(cacheKey, meta);
    durationEl.textContent = meta.duration;
    durationEl.hidden = !meta.duration;
    if (seasonsEl) {
      seasonsEl.textContent = meta.seasons;
      seasonsEl.hidden = !meta.seasons;
    }
    if (episodesEl) {
      episodesEl.textContent = meta.episodes;
      episodesEl.hidden = !meta.episodes;
    }
  } catch (e) {
    durationCache.set(cacheKey, {});
    durationEl.hidden = true;
    if (seasonsEl) seasonsEl.hidden = true;
    if (episodesEl) episodesEl.hidden = true;
  }
}

function createMovieCard(m, mediaType = 'movie', extra = {}) {
  const title = m.title || m.name || 'Unknown';
  const year = (m.release_date || m.first_air_date || '').slice(0, 4);
  const rating = m.vote_average ? m.vote_average.toFixed(1) : '';
  const type = mediaType === 'tv' ? 'TV' : 'MOVIE';
  const genres = (m.genre_ids || []).slice(0, 3).map(id => GENRE_MAP[id]).filter(Boolean);
  const duration = mediaType === 'tv' ? '' : getItemDuration(m);
  const fallbackArtwork = getFallbackArtwork(m);

  const card = document.createElement('div');
  card.className = `movie-card${extra.continue ? ' continue-card' : ''}`;
  card.setAttribute('data-id', m.id);
  card.setAttribute('data-type', mediaType);

  const progressHtml = extra.continue
    ? `<div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${extra.progress || 40}%"></div></div>`
    : '';

  card.innerHTML = `
    <div class="movie-card-img-wrap">
      <img class="movie-card-img${fallbackArtwork.isPoster ? ' poster-fallback' : ''}" src="${fallbackArtwork.src}" alt="${title}" loading="lazy" />
      ${progressHtml}
      <div class="movie-card-overlay">
        <div class="card-play-btn" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><polygon points="6,4 20,12 6,20"/></svg>
        </div>
        <div class="card-hover-content">
          <div class="card-overlay-title">${title}</div>
          <div class="card-overlay-meta">
            ${rating ? `<span>IMDb ${rating}</span>` : ''}
            <span class="card-duration"${duration ? '' : ' hidden'}>${duration}</span>
            ${mediaType === 'tv' ? '<span class="card-seasons" hidden></span><span class="card-episodes" hidden></span>' : ''}
            ${year ? `<span>${year}</span>` : ''}
          </div>
          ${genres.length ? `<div class="card-overlay-genres">${genres.map(g => `<span>${g}</span>`).join('')}</div>` : ''}
        </div>
      </div>
    </div>
    <div class="movie-card-info">
      <div class="movie-card-title">${title}</div>
      <div class="movie-card-meta">
        ${rating ? `<span class="card-rating">★ ${rating}</span>` : ''}
        ${year ? `<span class="card-year">${year}</span>` : ''}
        <span class="card-type-badge">${type}</span>
      </div>
    </div>
  `;

  hydrateCardDuration(card, m.id, mediaType);
  hydrateTitleArtwork(card, m, mediaType);
  card.addEventListener('click', () => goWatch(m.id, mediaType, m));
  return card;
}

async function hydrateTitleArtwork(card, m, mediaType) {
  const img = card.querySelector('.movie-card-img');
  if (!img || !m.id) return;

  const artwork = await getTitleArtwork(m.id, mediaType, m);
  if (!artwork?.src || !card.isConnected) return;

  img.src = artwork.src;
  img.classList.toggle('poster-fallback', artwork.isPoster);
}

function populateRow(rowId, movies, mediaType = 'movie', extra = {}) {
  const row = document.getElementById(rowId);
  if (!row) return;
  row.innerHTML = '';
  movies.forEach(m => {
    row.appendChild(createMovieCard(m, mediaType, extra));
  });
}

function getSavedContinueItems() {
  try {
    const saved = JSON.parse(localStorage.getItem('px_continue') || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch (e) {
    return [];
  }
}

function saveContinueWatchingItem(item, mediaType) {
  if (!item?.id) return;

  const saved = getSavedContinueItems();
  const existing = saved.find(savedItem => String(savedItem.id) === String(item.id) && savedItem.mediaType === mediaType);
  const progress = Math.max(existing?.progress || 0, item.progress || 8);
  const continueItem = {
    ...item,
    mediaType,
    progress,
    savedAt: Date.now()
  };

  const nextItems = [
    continueItem,
    ...saved.filter(savedItem => !(String(savedItem.id) === String(item.id) && savedItem.mediaType === mediaType))
  ].slice(0, 20);

  localStorage.setItem('px_continue', JSON.stringify(nextItems));
}

// ============ TMDB FETCHES ============
async function fetchAndRender(url, rowId, mediaType = 'movie', extra = {}) {
  renderSkeletons(rowId);
  try {
    const res = await fetch(url);
    const data = await res.json();
    populateRow(rowId, data.results || [], mediaType, extra);
  } catch (e) {
    console.error('Fetch error:', e);
    const row = document.getElementById(rowId);
    if (row) row.innerHTML = `<p style="color:var(--gray-500);padding:20px;font-family:var(--font-cond);letter-spacing:1px;">Failed to load.</p>`;
  }
}

// ============ CONTINUE WATCHING (mock local) ============
function loadContinueWatching() {
  const saved = getSavedContinueItems();
  if (saved.length === 0) {
    const section = document.getElementById('continue-watching');
    if (section) section.style.display = 'none';
    return;
  }
  const row = document.getElementById('continueRow');
  if (!row) return;
  row.innerHTML = '';
  saved.forEach(item => {
    const card = createMovieCard(item, item.mediaType, { continue: true, progress: item.progress });
    row.appendChild(card);
  });
}

// ============ NAVIGATION ============
window.goWatch = function(id, type, item = null) {
  if (item) {
    saveContinueWatchingItem(item, type);
  }

  window.location.href = `watch.html?id=${id}&type=${type}`;
};

// ============ ROW ARROWS ============
function setupRowArrows() {
  document.querySelectorAll('.row-arrow').forEach(btn => {
    btn.addEventListener('click', () => {
      const rowId = btn.dataset.row + 'Row';
      const row = document.getElementById(rowId) || btn.closest('.movies-row-wrap').querySelector('.movies-row');
      if (!row) return;
      const dir = btn.classList.contains('row-prev') ? -1 : 1;
      row.scrollBy({ left: dir * 700, behavior: 'smooth' });
    });
  });
}

// ============ SEARCH ============
let searchDebounce = null;

function openSearch() {
  document.getElementById('searchOverlay')?.classList.add('active');
  setTimeout(() => document.getElementById('searchInput')?.focus(), 100);
}
function closeSearch() {
  document.getElementById('searchOverlay')?.classList.remove('active');
  const input = document.getElementById('searchInput');
  if (input) input.value = '';
  const results = document.getElementById('searchResults');
  if (results) results.innerHTML = '';
}

document.getElementById('searchToggle')?.addEventListener('click', openSearch);
document.getElementById('searchClose')?.addEventListener('click', closeSearch);
document.getElementById('searchOverlay')?.addEventListener('click', e => {
  if (e.target.id === 'searchOverlay') closeSearch();
});

document.getElementById('searchInput')?.addEventListener('input', e => {
  clearTimeout(searchDebounce);
  const q = e.target.value.trim();
  const results = document.getElementById('searchResults');
  if (!q) { if (results) results.innerHTML = ''; return; }
  if (results) results.innerHTML = `<div class="search-loading">Searching…</div>`;
  searchDebounce = setTimeout(() => doSearch(q), 350);
});

async function doSearch(q) {
  const results = document.getElementById('searchResults');
  if (!results) return;
  try {
    const res = await fetch(`${TMDB_BASE}/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&language=en-US&page=1`);
    const data = await res.json();
    const items = (data.results || []).filter(m => (m.media_type === 'movie' || m.media_type === 'tv') && (m.poster_path || m.backdrop_path));
    if (!items.length) {
      results.innerHTML = `<div class="no-results">No results for "${q}"</div>`;
      return;
    }
    results.innerHTML = '';
    items.slice(0, 20).forEach(m => {
      const card = createMovieCard(m, m.media_type);
      card.addEventListener('click', () => { closeSearch(); });
      results.appendChild(card);
    });
  } catch (e) {
    if (results) results.innerHTML = `<div class="no-results">Search failed. Try again.</div>`;
  }
}

// ============ NAVBAR SCROLL ============
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 60);
});

// ============ HAMBURGER ============
document.getElementById('hamburger')?.addEventListener('click', function() {
  this.classList.toggle('open');
  document.getElementById('navLinks')?.classList.toggle('open');
});

// ============ SCROLL FADE IN ============
function initFadeObserver() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.row-section').forEach(el => {
    el.classList.add('fade-in');
    observer.observe(el);
  });
}

// ============ INIT ============
async function init() {
  loadContinueWatching();
  fetchHero();

  await Promise.all([
    fetchAndRender(`${TMDB_BASE}/trending/all/week?api_key=${TMDB_KEY}&language=en-US`, 'trendingRow', 'movie'),
    fetchAndRender(`${TMDB_BASE}/movie/popular?api_key=${TMDB_KEY}&language=en-US&page=1`, 'popularRow', 'movie'),
    fetchAndRender(`${TMDB_BASE}/movie/top_rated?api_key=${TMDB_KEY}&language=en-US&page=1`, 'topratedRow', 'movie'),
    fetchAndRender(`${TMDB_BASE}/tv/popular?api_key=${TMDB_KEY}&language=en-US&page=1`, 'seriesRow', 'tv'),
    fetchAndRender(`${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}&with_genres=28&language=en-US&sort_by=popularity.desc`, 'actionRow', 'movie'),
    fetchAndRender(`${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}&with_genres=878&language=en-US&sort_by=popularity.desc`, 'scifiRow', 'movie'),
    fetchAndRender(`${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}&with_genres=27&language=en-US&sort_by=popularity.desc`, 'horrorRow', 'movie'),
  ]);

  // Fix trending row media type per item
  const trendingRow = document.getElementById('trendingRow');
  if (trendingRow) {
    try {
      const res = await fetch(`${TMDB_BASE}/trending/all/week?api_key=${TMDB_KEY}&language=en-US`);
      const data = await res.json();
      trendingRow.innerHTML = '';
      (data.results || []).forEach(m => {
        trendingRow.appendChild(createMovieCard(m, m.media_type || 'movie'));
      });
    } catch (e) {}
  }

  setupRowArrows();
  initFadeObserver();
}

document.addEventListener('DOMContentLoaded', init);
