/* ============================================
PIRATE X — watch.js
Player Page: TMDB + VidAPI Integration
============================================ */

const TMDB_KEY = '4e44d9029b1270a757cddc766a1bcb63';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';

const GENRE_MAP = {
28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
10759: 'Action & Adventure', 10765: 'Sci-Fi & Fantasy',
10768: 'War & Politics'
};

// ============ PARSE URL PARAMS ============
function getParams() {
const params = new URLSearchParams(window.location.search);

return {
id: params.get('id'),
type: params.get('type') || 'movie',
season: parseInt(params.get('season') || '1'),
episode: parseInt(params.get('episode') || '1'),
};
}

// ============ LOAD PLAYER ============
// Show loading animation
const loading = document.getElementById('playerLoading');

if (loading) {
loading.style.display = 'flex';
loading.innerHTML = `     <div class="player-spinner"></div>     <p>Launching Player...</p>
  `;
}

// Smooth delay before opening player
setTimeout(() => {

window.open(
embedUrl,
"_blank",
"noopener,noreferrer"
);

}, 1200);


// ============ FETCH IMDB ID ============
async function getImdbId(tmdbId, type) {

try {

const res = await fetch(
  `${TMDB_BASE}/${type}/${tmdbId}/external_ids?api_key=${TMDB_KEY}`
);

const data = await res.json();

return data.imdb_id || null;

} catch (e) {

console.error('IMDb fetch failed:', e);
return null;

}
}

// ============ BUILD EMBED URL ============
async function buildEmbedUrl(tmdbId, type, season = 1, episode = 1) {

const imdbId = await getImdbId(tmdbId, type);

if (!imdbId) {
return null;
}

// MOVIES
if (type === 'movie') {
return `https://www.playimdb.com/title/${imdbId}`;
}

// TV SHOWS
return `https://www.playimdb.com/title/${imdbId}`;
}


// ============ FETCH DETAILS ============
async function fetchDetails(tmdbId, type) {

try {

const res = await fetch(
  `${TMDB_BASE}/${type}/${tmdbId}?api_key=${TMDB_KEY}&language=en-US`
);

return await res.json();

} catch (e) {

console.error('Details fetch failed:', e);
return null;

}
}

// ============ FETCH TV SEASONS ============
async function fetchTvSeasons(tmdbId) {

try {

const res = await fetch(
  `${TMDB_BASE}/tv/${tmdbId}?api_key=${TMDB_KEY}&language=en-US`
);

const data = await res.json();

return data.seasons || [];

} catch (e) {

return [];

}
}

async function fetchSeasonEpisodes(tmdbId, seasonNum) {

try {

const res = await fetch(
  `${TMDB_BASE}/tv/${tmdbId}/season/${seasonNum}?api_key=${TMDB_KEY}&language=en-US`
);

const data = await res.json();

return data.episodes || [];

} catch (e) {

return [];

}
}

// ============ EPISODE CONTROLS ============
let currentSeason = 1;
let currentEpisode = 1;

async function setupEpisodeControls(tmdbId, initialSeason, initialEpisode) {

const controls = document.getElementById('episodeControls');
const seasonSel = document.getElementById('seasonSelect');
const episodeSel = document.getElementById('episodeSelect');
const goBtn = document.getElementById('epGoBtn');

if (!controls || !seasonSel || !episodeSel) return;

controls.style.display = 'block';

const seasons = await fetchTvSeasons(tmdbId);

const validSeasons = seasons.filter(s => s.season_number > 0);

seasonSel.innerHTML = validSeasons.map(s => `     <option value="${s.season_number}">
      Season ${s.season_number}     </option>
  `).join('');

seasonSel.value = initialSeason;

async function updateEpisodes(seasonNum) {

episodeSel.innerHTML = '<option>Loading...</option>';

const eps = await fetchSeasonEpisodes(tmdbId, seasonNum);

episodeSel.innerHTML = eps.map(ep => `
  <option value="${ep.episode_number}">
    E${ep.episode_number} — ${ep.name}
  </option>
`).join('');

episodeSel.value = initialEpisode;

}

await updateEpisodes(initialSeason);

seasonSel.addEventListener('change', async () => {

currentSeason = parseInt(seasonSel.value);
currentEpisode = 1;

await updateEpisodes(currentSeason);

});

goBtn.addEventListener('click', async () => {

currentSeason = parseInt(seasonSel.value);
currentEpisode = parseInt(episodeSel.value);

const imdbId = await getImdbId(tmdbId, 'tv');

const url = imdbId
  ? `https://streamimdb.ru/embed/tv/${imdbId}/${currentSeason}/${currentEpisode}`
  : `https://vaplayer.ru/embed/tv/${tmdbId}/${currentSeason}/${currentEpisode}`;

loadPlayer(url);

});
}

// ============ RENDER INFO ============
function renderWatchInfo(m, type) {

document.title = `${m.title || m.name} — PIRATE X`;

const titleEl = document.getElementById('watchTitle');
const descEl = document.getElementById('watchDesc');
const metaEl = document.getElementById('watchMeta');
const genresEl = document.getElementById('watchGenres');
const details = document.getElementById('watchDetails');
const skeleton = document.getElementById('watchSkeleton');

if (skeleton) skeleton.style.display = 'none';
if (details) details.style.display = 'block';

titleEl.textContent = m.title || m.name;
descEl.textContent = m.overview || 'No description available.';

metaEl.innerHTML = `     <span class="watch-rating">
      ★ ${m.vote_average?.toFixed(1) || 'N/A'}     </span>
  `;

genresEl.innerHTML = (m.genres || []).map(g => `     <span class="watch-genre-pill">${g.name}</span>
  `).join('');

if (m.backdrop_path) {

const backdrop = document.getElementById('watchBackdrop');

backdrop.style.backgroundImage =
  `url(${IMG_BASE}/original${m.backdrop_path})`;

}
}

// ============ INIT ============
async function init() {

const { id, type, season, episode } = getParams();

if (!id) return;

const details = await fetchDetails(id, type);

if (!details) return;

renderWatchInfo(details, type);

const embedUrl = await buildEmbedUrl(id, type, season, episode);

window.location.href = embedUrl;

if (type === 'tv') {
setupEpisodeControls(id, season, episode);
}
}

init();
