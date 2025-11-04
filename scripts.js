// Extracted from index.html inline <script>

// ---------- Utilities ----------
/**
 * Shorthand for document.querySelector
 * @param {string} sel - CSS selector
 * @returns {Element|null} The first matching element
 */
const $ = sel => document.querySelector(sel);

/**
 * Shorthand for document.querySelectorAll as array
 * @param {string} sel - CSS selector
 * @returns {Element[]} Array of matching elements
 */
const $$ = sel => Array.from(document.querySelectorAll(sel));

/**
 * Format number with locale-specific formatting
 * @param {number} n - Number to format
 * @returns {string} Formatted number string
 */
const fmt = n => new Intl.NumberFormat().format(n);

// ---------- Constants ----------
const STORAGE_KEY = 'quizLeagueData:v2-singleTeam';
const TEAM_NAME = 'Gorsko Slivovo';
const POINTS_FOR_FIRST_PLACE = 5;
const POINTS_FOR_SECOND_PLACE = 4;
const POINTS_FOR_THIRD_PLACE = 3;
const TOAST_DURATION_MS = 2200;
const CONFETTI_PARTICLE_COUNT = 80;
const CANVAS_BLUR_PX = 80;

// ---------- Demo Data ----------
/**
 * Fallback demo data for when no CSV is available
 * @type {Object}
 */
const demoData = {
  seasons: {
    '2025': {
      team: TEAM_NAME,
      quizzes: [
        { date: '2025-09-30', notes: 'General Knowledge', points: 2, teams: 13 },
        { date: '2025-10-06', notes: 'General Knowledge', points: 4, teams: 18 }
      ]
    }
  },
  currentSeason: '2025',
  quickAccess: []
};

// ---------- State Management ----------
/**
 * Load initial state from localStorage with fallback to demo data.
 * We intentionally do NOT trust localStorage as the authoritative source on boot
 * because stale saved data is the main cause of "broken" pages for users who keep
 * old data in their browser. Instead we start from demoData and prefer fetching
 * a fresh CSV from the repo. localStorage is kept only as a fallback when remote
 * data is unavailable (offline or CSV missing).
 * @returns {Object} Initial state object
 */
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge shallow so demoData provides missing keys
      return Object.assign({}, demoData, parsed);
    }
    return demoData;
  } catch (e) {
    console.warn('Failed to load from localStorage:', e);
    return demoData;
  }
}

/**
 * Save state to localStorage
 * @param {Object} data - State object to persist
 */
function save(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
}

// ---------- State ----------
let state = load();
if (!state.quickAccess) {
  state.quickAccess = [];
}
const seasonSelect = $('#seasonSelect');

// ---------- CSV Loading ----------
/**
 * Try to load CSV data for a specific season from the server
 * @param {string} year - Season year to load
 */
async function tryLoadCSVForSeason(year) {
  const urlCsv = `data/season-${year}.csv?v=${Date.now()}`; // cache-bust GitHub Pages
  try {
    const res = await fetch(urlCsv, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`CSV not found (${res.status})`);
    }
    const text = await res.text();
    const quizzes = parseCSV(text);
    
    if (!state.seasons) {
      state.seasons = {};
    }
    if (!state.seasons[year]) {
      state.seasons[year] = { team: TEAM_NAME, quizzes: [] };
    }
    
    state.seasons[year].quizzes = quizzes;
    state.currentSeason = year;
    save(state);
    toast(`Loaded CSV for ${year}`);
  } catch (e) {
    // Remote CSV failed. Try to fall back to any saved data in localStorage for this year.
    const fallbackLoaded = tryLoadFromLocalStorage(year);
    if (!fallbackLoaded) {
      // If we reach here, there was no usable local fallback — stay with demo data.
      toast(`CSV not found for ${year}`);
      console.warn('CSV load skipped:', e.message);
    }
  }
}

/**
 * Attempt to load season data from localStorage as fallback
 * @param {string} year - Season year to load
 * @returns {boolean} True if data was loaded successfully
 */
function tryLoadFromLocalStorage(year) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved && saved.seasons && saved.seasons[year]) {
        // Use the locally-saved CSV as a fallback (offline / missing file)
        if (!state.seasons) {
          state.seasons = {};
        }
        state.seasons[year] = saved.seasons[year];
        state.currentSeason = saved.currentSeason || year;
        toast(`Using cached data for ${year}`);
        return true;
      }
    }
  } catch (e) {
    console.warn('Failed to load from localStorage fallback:', e);
  }
  return false;
}

// ---------- CSV Parsing ----------
/**
 * Basic CSV parser supporting quoted fields, BOM-safe, Windows/Mac/Unix newlines
 * @param {string} text - Raw CSV text
 * @returns {Array<Object>} Array of quiz objects
 */
function parseCSV(text) {
  const lines = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  if (!lines.length) {
    return [];
  }
  
  const header = splitCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  const idx = {
    date: header.indexOf('date'),
    notes: header.indexOf('notes'),
    points: header.indexOf('points'),
    teams: header.indexOf('teams'),
    place: header.findIndex(h => ['place', 'position', 'rank'].includes(h)),
    photos: header.findIndex(h => ['photos', 'images', 'pics', 'gallery'].includes(h))
  };
  
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !line.trim()) {
      continue;
    }
    
    const cols = splitCSVLine(line);
    const q = {
      date: normalizeDate((cols[idx.date] || '').trim()),
      notes: (cols[idx.notes] || '').trim(),
      points: Number((cols[idx.points] || '').trim() || 0),
      teams: Number((cols[idx.teams] || '').trim() || 0),
      place: idx.place >= 0 ? Number((cols[idx.place] || '').trim() || 0) : 0,
      photos: idx.photos >= 0 ? parsePhotos((cols[idx.photos] || '').trim()) : []
    };
    
    if (q.date) {
      out.push(q);
    }
  }
  return out;
}

/**
 * Split a CSV line into fields, handling quoted values correctly
 * @param {string} line - CSV line to split
 * @returns {string[]} Array of field values
 */
function splitCSVLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++; // escaped quote
      } else {
        inQ = !inQ;
      }
    } else if (ch === ',' && !inQ) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/**
 * Normalize date inputs to YYYY-MM-DD format. Accepts:
 * - YYYY-MM-DD (already normalized)
 * - YYYY/MM/DD
 * - DD.MM.YYYY or D.M.YYYY (also accepts '-' or '/' as separator)
 * - Fallback: Date parseable strings
 * @param {string} raw - Raw date string
 * @returns {string} Normalized date string in YYYY-MM-DD format
 */
function normalizeDate(raw) {
  if (!raw) {
    return '';
  }
  raw = raw.trim();
  
  // ISO YYYY-MM-DD
  let m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    return `${m[1]}-${m[2]}-${m[3]}`;
  }
  
  // ISO alternative YYYY/MM/DD
  m = raw.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
  if (m) {
    return `${m[1]}-${m[2]}-${m[3]}`;
  }
  
  // DD.MM.YYYY or D.M.YYYY, also accept '-' or '/'
  m = raw.match(/^(\d{1,2})[\.\-\/](\d{1,2})[\.\-\/](\d{4})$/);
  if (m) {
    const dd = String(m[1]).padStart(2, '0');
    const mm = String(m[2]).padStart(2, '0');
    const yyyy = m[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  
  // Fallback: try Date parsing and format
  const dt = new Date(raw);
  if (!isNaN(dt.getTime())) {
    const y = dt.getFullYear();
    const mo = String(dt.getMonth() + 1).padStart(2, '0');
    const da = String(dt.getDate()).padStart(2, '0');
    return `${y}-${mo}-${da}`;
  }
  
  return '';
}

/**
 * Accept photos as one of:
 * - Semicolon- or pipe-separated list: "img1.jpg; img2.jpg" or "img1.jpg|img2.jpg"
 * - JSON array string: ["img1.jpg", "img2.jpg"]
 * - Single path
 * Paths can be relative (e.g., photos/2025-10-06/pic.jpg) or absolute URLs.
 * @param {string} raw - Raw photos string from CSV
 * @returns {string[]} Array of photo paths
 */
function parsePhotos(raw) {
  if (!raw) {
    return [];
  }
  
  try {
    const t = raw.trim();
    if (!t) {
      return [];
    }
    
    if (t.startsWith('[')) {
      const arr = JSON.parse(t);
      return Array.isArray(arr) ? arr.map(String).map(s => s.trim()).filter(Boolean) : [];
    }
    
    const parts = t.split(/[|;]+/).map(s => s.trim()).filter(Boolean);
    return parts.length ? parts : [t];
  } catch (e) {
    console.warn('Failed to parse photos:', e);
    return [];
  }
}

/**
 * Compute the next Monday date. If today is Monday, returns next week's Monday.
 * @param {Date} [from=new Date()] - Starting date
 * @returns {Date} Next Monday date
 */
function computeNextMonday(from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ...
  let daysUntil = (1 - day + 7) % 7; // days until Monday (0..6)
  if (daysUntil === 0) {
    daysUntil = 7; // if today is Monday, pick next Monday
  }
  d.setDate(d.getDate() + daysUntil);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ---------- Rendering ----------
/**
 * Render the season selector dropdown
 */
function renderSeasons() {
  const years = Object.keys(state.seasons).sort((a, b) => b.localeCompare(a));
  seasonSelect.innerHTML = years
    .map(y => `<option value="${y}" ${y === state.currentSeason ? 'selected' : ''}>${y}</option>`)
    .join('');
  
  // Update compact season label if present
  const lbl = $('#seasonLabel');
  if (lbl && state.seasons && state.seasons[state.currentSeason]) {
    lbl.textContent = `Season ${state.currentSeason} · ${state.seasons[state.currentSeason].quizzes.length} quizzes`;
  }
}

/**
 * Get the current season data
 * @returns {Object} Current season object
 */
function getSeason() {
  return state.seasons[state.currentSeason];
}

/**
 * Compute leaderboard data for current season
 * @returns {Array<Object>} Array of team statistics
 */
function computeLeaderboard() {
  const s = getSeason();
  const quizzes = s.quizzes || [];
  const total = quizzes.reduce((a, q) => a + (Number(q.points) || 0), 0);
  const avg = quizzes.length ? total / quizzes.length : 0;
  return [{
    team: s.team || TEAM_NAME,
    quizzes: quizzes.length,
    total,
    average: avg
  }];
}

/**
 * Render the leaderboard table
 */
function renderLeaderboard() {
  const tbody = $('#leaderboard tbody');
  const rows = computeLeaderboard();
  tbody.innerHTML = rows.map((r, i) => {
    const medal = '🥇';
    return `<tr>
          <td class="rank">${i + 1} <span class="medal" title="Top 1">${medal}</span></td>
          <td style="font-weight:700">${r.team}</td>
          <td>${r.quizzes}</td>
          <td>${fmt(r.total)}</td>
          <td>${r.average ? r.average.toFixed(2) : '0.00'}</td>
        </tr>`;
  }).join('');
}

/**
 * Get place description from points (when explicit place is not provided)
 * @param {number} p - Points earned
 * @returns {string} Place description
 */
function placeFromPoints(p) {
  if (p >= POINTS_FOR_FIRST_PLACE) {
    return '1st place';
  }
  if (p === POINTS_FOR_SECOND_PLACE) {
    return '2nd place';
  }
  if (p === POINTS_FOR_THIRD_PLACE) {
    return '3rd place';
  }
  return '4th place or below';
}

/**
 * Get ordinal suffix for a place number (st, nd, rd, th)
 * @param {number} place - Place number
 * @returns {string} Ordinal suffix
 */
function getPlaceSuffix(place) {
  if (place === 1) {
    return 'st';
  }
  if (place === 2) {
    return 'nd';
  }
  if (place === 3) {
    return 'rd';
  }
  return 'th';
}

function renderHistory() {
  const box = $('#quizHistory');
  const s = getSeason();
  const quizzes = [...(s.quizzes || [])].sort((a, b) => a.date.localeCompare(b.date)).reverse();
  if (!quizzes.length) { box.innerHTML = '<p class="subtitle">No quizzes yet — click “Add Quiz”.</p>'; return; }
  box.innerHTML = quizzes.map(q => {
    const placeInfo = q.place > 0 ? `${q.place}${getPlaceSuffix(q.place)} place` : placeFromPoints(Number(q.points) || 0);
    const meta = `${placeInfo} vs ${fmt(q.teams || 0)} team${(q.teams || 0) === 1 ? '' : 's'} • ${fmt(q.points)} pts`;
    const details = `<table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>
          ${q.place > 0 ? `<tr><td>Place</td><td>${q.place}${getPlaceSuffix(q.place)}</td></tr>` : ''}
          <tr><td>Points</td><td>${fmt(q.points)}</td></tr>
          <tr><td>Teams</td><td>${fmt(q.teams || 0)}</td></tr>
          ${q.notes ? `<tr><td>Notes</td><td>${q.notes}</td></tr>` : ''}
        </tbody></table>`;
    const gallery = (q.photos && q.photos.length)
      ? `<div class="subtitle" style="margin-top:10px">Photos</div>
             <div class="photo-grid" data-date="${q.date}">
               ${q.photos.map((src, i) => `<img src="${src}" loading="lazy" alt="Photo ${i + 1} from ${q.date}" class="photo-thumb" data-date="${q.date}" data-index="${i}">`).join('')}
             </div>`
      : '';
    return `<details class="quiz-card">
            <summary>
              <div>
                <div class="quiz-title">${new Date(q.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</div>
                <div class="quiz-meta">${meta}</div>
              </div>
            </summary>
            <div style="grid-column:1/-1; margin-top:10px">${details}${gallery}</div>
          </details>`
  }).join('');

}

function renderSeasonStats() {
  const s = getSeason();
  const totalQuizzes = (s.quizzes || []).length;
  const latest = (s.quizzes || []).map(q => q.date).sort().pop();
  const nextMonday = computeNextMonday();
  const bestQuiz = (s.quizzes || []).slice().sort((a, b) => (b.points || 0) - (a.points || 0))[0];
  const avgTeams = (s.quizzes || []).length ? (s.quizzes.reduce((a, q) => a + (Number(q.teams) || 0), 0) / s.quizzes.length) : 0;
  const avgPlace = (s.quizzes || []).length ? (s.quizzes.reduce((a, q) => a + (Number(q.place) || 0), 0) / s.quizzes.length) : 0;

  $('#seasonStats').innerHTML = `
        <div class="two-col">
          <div class="panel" style="padding:0">
            <div class="head"><h3 style="margin:0">Season Progress</h3></div>
            <div class="body">
              <div class="subtitle">Quizzes so far</div>
              <div class="glow" style="font-size:42px; font-weight:800">${fmt(totalQuizzes)}</div>
              <div class="subtitle" style="margin-top:8px">Latest quiz: ${latest ? new Date(latest + 'T00:00:00').toLocaleDateString() : '—'}</div>
            </div>
          </div>
          <div class="panel" style="padding:0">
            <div class="head"><h3 style="margin:0">Next Monday</h3></div>
            <div class="body">
              <div class="glow" style="font-size:32px; font-weight:800">${nextMonday.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</div>
              <div class="subtitle">Ready for the next battle ✨</div>
            </div>
          </div>
        </div>
        <div class="panel" style="margin-top:16px">
          <div class="head"><h3 style="margin:0">Highlights</h3></div>
          <div class="body">
            <div>Average place: <strong>${avgPlace ? avgPlace.toFixed(1) : '—'}</strong></div>
            ${bestQuiz ? `<div>Best place: <strong>${bestQuiz.place > 0 ? bestQuiz.place + getPlaceSuffix(bestQuiz.place) : placeFromPoints(bestQuiz.points)}</strong> on ${new Date(bestQuiz.date + 'T00:00:00').toLocaleDateString()}</div>` : ''}
            <div>Average teams per quiz: <strong>${avgTeams ? avgTeams.toFixed(1) : '—'}</strong></div>
            <div>Most teams in a quiz: <strong>${s.quizzes && s.quizzes.length ? Math.max(...s.quizzes.map(q => q.teams || 0)) : '—'}</strong></div>
            ${bestQuiz ? `<div>Best points: <strong>${fmt(bestQuiz.points)}</strong> on ${new Date(bestQuiz.date + 'T00:00:00').toLocaleDateString()}</div>` : '<div class="subtitle">No data yet</div>'}
          </div>
        </div>`;
}

function renderQuickAccess() {
  const list = $('#quickAccessList');
  const quickAccessItems = [
    { type: 'link', name: 'БГ Царе', url: 'https://www.facebook.com/photo.php?fbid=633204463902604&id=164734567416265&set=a.370650973491289', icon: '📋' },
    { type: 'photo', name: 'Trophy — 06 Oct 2025', url: 'photos/2025-10-06/06-10-2025-trophy-photo-1.JPEG', thumbnail: 'photos/2025-10-06/06-10-2025-trophy-photo-1.JPEG' }
  ];

  if (!quickAccessItems || quickAccessItems.length === 0) {
    list.innerHTML = '<li class="quick-access-empty">No quick access items yet</li>';
    return;
  }

  list.innerHTML = quickAccessItems.map(item => {
    if (item.type === 'photo') {
      return `<a href="${item.url}" target="_blank" rel="noopener noreferrer" class="quick-access-item">
            <img src="${item.thumbnail || item.url}" alt="${item.name}" class="quick-access-icon">
            <span class="quick-access-name">${item.name}</span>
          </a>`;
    } else {
      // link type
      return `<a href="${item.url}" target="_blank" rel="noopener noreferrer" class="quick-access-item">
            <div class="quick-access-link-icon">${item.icon || '🔗'}</div>
            <span class="quick-access-name">${item.name}</span>
          </a>`;
    }
  }).join('');
}

// ---------- Events ----------
/**
 * Handle season selector change event
 */
seasonSelect.addEventListener('change', async () => {
  state.currentSeason = seasonSelect.value;
  save(state);
  await tryLoadCSVForSeason(state.currentSeason);
  renderAll();
});

// ---------- Toast & Confetti ----------
/**
 * Display a toast notification
 * @param {string} msg - Message to display
 */
function toast(msg) {
  const t = $('#toast');
  if (t) {
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), TOAST_DURATION_MS);
  } else {
    console.log('Toast:', msg);
  }
}

// ---------- Confetti Effect ----------
const fx = document.getElementById('fx');
const ctx = fx.getContext('2d');
let particles = [];

/**
 * Resize canvas to match window size
 */
function resize() {
  fx.width = innerWidth;
  fx.height = innerHeight;
}
addEventListener('resize', resize);
resize();

/**
 * Trigger confetti animation
 */
function confetti() {
  for (let i = 0; i < CONFETTI_PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * fx.width,
      y: -20,
      vx: (Math.random() - 0.5) * 2,
      vy: 2 + Math.random() * 2.5,
      r: 2 + Math.random() * 4,
      a: 1
    });
  }
}

/**
 * Animation tick for confetti particles
 */
function tick() {
  ctx.clearRect(0, 0, fx.width, fx.height);
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.a -= 0.008;
    p.vy += 0.02;
    ctx.globalAlpha = Math.max(p.a, 0);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
    g.addColorStop(0, 'rgba(34,211,238,1)');
    g.addColorStop(1, 'rgba(139,92,246,0)');
    ctx.fillStyle = g;
    ctx.fill();
  });
  particles = particles.filter(p => p.a > 0 && p.y < fx.height + 20);
  requestAnimationFrame(tick);
}
tick();

// ---------- Team Presence ----------
let presenceData = null;

/**
 * Load team presence data from CSV
 */
async function loadPresenceData() {
  const urlCsv = `data/presence.csv?v=${Date.now()}`;
  try {
    const res = await fetch(urlCsv, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Presence CSV not found (${res.status})`);
    }
    const text = await res.text();
    presenceData = parsePresenceCSV(text);
  } catch (e) {
    console.warn('Failed to load presence data:', e.message);
    presenceData = null;
  }
}

/**
 * Parse team presence CSV data
 * @param {string} text - Raw CSV text
 * @returns {Object|null} Object with teamMembers array and counts object, or null if invalid
 */
function parsePresenceCSV(text) {
  const lines = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  if (!lines.length) {
    return null;
  }
  
  // First line contains team member names (skip first empty column)
  const header = splitCSVLine(lines[0]);
  const teamMembers = header.slice(1).map(name => name.trim()).filter(Boolean);
  
  // Initialize counts
  const counts = {};
  teamMembers.forEach(name => {
    counts[name] = 0;
  });
  
  // Also keep per-date attendance rows for later lookup (date -> { name: true/false })
  const rows = [];

  // Parse each attendance row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !line.trim()) {
      continue;
    }
    const cols = splitCSVLine(line);
    const dateRaw = (cols[0] || '').trim();
    const normalizedDate = normalizeDate(dateRaw) || dateRaw; // keep original if normalization fails
    const attendance = {};

    // Skip the date column (first column) and count "yes" values
    for (let j = 1; j < cols.length && j <= teamMembers.length; j++) {
      const value = (cols[j] || '').trim().toLowerCase();
      const present = value === 'yes';
      const memberName = teamMembers[j - 1];
      attendance[memberName] = present;
      if (present) {
        counts[memberName]++;
      }
    }
    rows.push({ date: normalizedDate, rawDate: dateRaw, attendance });
  }
  
  return { teamMembers, counts, rows };
}

/**
 * Render team presence visualization
 */
function renderTeamPresence() {
  const container = $('#teamPresenceSection');
  if (!container) {
    return;
  }
  
  if (!presenceData) {
    container.innerHTML = '<div class="subtitle" style="padding: 18px;">Presence data not available</div>';
    return;
  }
  
  const { teamMembers, counts } = presenceData;
  const maxCount = Math.max(...Object.values(counts), 1);
  
  // Sort by count descending for better visualization
  const sortedMembers = [...teamMembers].sort((a, b) => counts[b] - counts[a]);
  
  const barsHtml = sortedMembers.map(name => {
    const count = counts[name];
    const percentage = (count / maxCount) * 100;
    // Render the name as a focusable div (role=button) instead of a <button>
    return `
      <div class="presence-bar-item">
        <div class="presence-name" role="button" tabindex="0" data-member="${escapeHtml(name)}">${escapeHtml(name)}</div>
        <div class="presence-bar-container">
          <div class="presence-bar" style="width: ${percentage}%">
            <span class="presence-count">${count}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="head">
      <h2>Team Member Presence</h2>
      <div class="subtitle">Number of quizzes attended by each team member (only original G S '25 members)</div>
    </div>
    <div class="body">
      <div class="presence-bars">
        ${barsHtml}
      </div>
    </div>
    <div class="subtitle">Notable mentions - Kalin, Magi, Dari</div>
  `;

  // Attach click handlers for the member elements and support keyboard activation
  $$('.presence-name').forEach(el => {
    el.addEventListener('click', (e) => {
      const name = e.currentTarget.dataset.member;
      openPresenceModal(name);
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const name = e.currentTarget.dataset.member;
        openPresenceModal(name);
      }
    });
  });
}

/**
 * Escape a string for HTML insertion (minimal safe escaping)
 */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Open the presence modal for a specific team member and show attended quizzes
 * @param {string} memberName
 */
function openPresenceModal(memberName) {
  if (!presenceData) return;
  const modal = document.getElementById('presenceModal');
  const body = document.getElementById('presenceModalBody');
  const title = document.getElementById('presenceModalTitle');
  title.textContent = `Attendance — ${memberName}`;

  // Compute which quizzes (dates) this member attended by cross-referencing season quizzes and presence rows
  const season = getSeason();
  const quizzes = (season.quizzes || []).slice().sort((a, b) => a.date.localeCompare(b.date));
  const attended = [];

  // Presence rows are parsed with normalized dates; match by date (YYYY-MM-DD) or original raw if necessary
  const rowsByDate = {};
  presenceData.rows.forEach(r => { rowsByDate[r.date] = r; rowsByDate[r.rawDate] = r; });

  quizzes.forEach(q => {
    const row = rowsByDate[q.date] || rowsByDate[q.date.replace(/^0+/, '')] || null;
    // Also try matching by localized form (e.g., 03.11.2025) by comparing normalized original
    let present = false;
    if (row && row.attendance && typeof row.attendance[memberName] !== 'undefined') {
      present = !!row.attendance[memberName];
    } else {
      // Fallback: try to find any row where rawDate normalizes to q.date
      for (const r of presenceData.rows) {
        if (normalizeDate(r.rawDate) === q.date && typeof r.attendance[memberName] !== 'undefined') {
          present = !!r.attendance[memberName];
          break;
        }
      }
    }
    if (present) {
      attended.push(q);
    }
  });

  if (!attended.length) {
    body.innerHTML = `<div class="subtitle">No quizzes attended in the current season were found for ${escapeHtml(memberName)}.</div>`;
  } else {
    body.innerHTML = `<ul class="presence-attended-list">${attended.map(q => `<li><button class="link-like" data-date="${q.date}">${new Date(q.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</button> — ${escapeHtml(q.notes || '')} (${fmt(q.points || 0)} pts)</li>`).join('')}</ul>`;
  }

  // Make dates clickable to open photo gallery if photos exist
  body.querySelectorAll('button[data-date]').forEach(b => {
    b.addEventListener('click', (e) => {
      const date = e.currentTarget.dataset.date;
      openGalleryFor(date, 0);
      closePresenceModal();
    });
  });

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closePresenceModal() {
  const modal = document.getElementById('presenceModal');
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

// Presence modal close button hookup
document.getElementById('presenceModalClose')?.addEventListener('click', closePresenceModal);
// Close when clicking backdrop
document.getElementById('presenceModal')?.addEventListener('click', (e) => { if (e.target.id === 'presenceModal') closePresenceModal(); });

// ---------- Main Rendering & Initialization ----------
/**
 * Render all UI components
 */
async function renderAll() {
  renderSeasons();
  renderLeaderboard();
  renderQuickAccess();
  renderHistory();
  renderSeasonStats();
  renderTeamPresence();
}

/**
 * Initialize application on page load
 */
(async () => {
  await tryLoadCSVForSeason(state.currentSeason);
  await loadPresenceData();
  renderAll();
})();

// ---------- Photo Modal Logic ----------
const photoModal = document.getElementById('photoModal');
const photoImg = document.getElementById('photoImage');
const photoCaption = document.getElementById('photoCaption');
const photoPager = document.getElementById('photoPager');
const photoPrev = document.getElementById('photoPrev');
const photoNext = document.getElementById('photoNext');
const photoCloseBtn = document.getElementById('photoModalClose');
let currentPhotos = [];
let currentIndex = 0;
let currentDate = '';

/**
 * Open photo gallery for a specific quiz date
 * @param {string} date - Quiz date
 * @param {number} [start=0] - Starting photo index
 */
function openGalleryFor(date, start = 0) {
  const s = getSeason();
  const q = (s.quizzes || []).find(x => x.date === date);
  if (!q || !q.photos || !q.photos.length) {
    return;
  }
  currentPhotos = q.photos.slice();
  currentIndex = Math.min(Math.max(0, start), currentPhotos.length - 1);
  currentDate = date;
  showCurrentPhoto();
  photoModal.classList.add('open');
  photoModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

/**
 * Close the photo gallery modal
 */
function closeGallery() {
  photoModal.classList.remove('open');
  photoModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

/**
 * Display the current photo in the gallery
 */
function showCurrentPhoto() {
  if (!currentPhotos.length) {
    return;
  }
  const src = currentPhotos[currentIndex];
  photoImg.src = src;
  photoImg.alt = `Photo ${currentIndex + 1} of ${currentPhotos.length} from ${currentDate}`;
  photoCaption.textContent = new Date(currentDate + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  photoPager.textContent = `${currentIndex + 1} / ${currentPhotos.length}`;
}

/**
 * Navigate to next photo in gallery
 */
function nextPhoto() {
  if (!currentPhotos.length) {
    return;
  }
  currentIndex = (currentIndex + 1) % currentPhotos.length;
  showCurrentPhoto();
}

/**
 * Navigate to previous photo in gallery
 */
function prevPhoto() {
  if (!currentPhotos.length) {
    return;
  }
  currentIndex = (currentIndex - 1 + currentPhotos.length) % currentPhotos.length;
  showCurrentPhoto();
}

// ---------- Event Listeners ----------
// Event delegation for photo thumbnails
document.addEventListener('click', (e) => {
  const img = e.target.closest('img.photo-thumb');
  if (img) {
    const date = img.dataset.date;
    const idx = Number(img.dataset.index) || 0;
    openGalleryFor(date, idx);
  }
});

// Modal controls
photoPrev?.addEventListener('click', prevPhoto);
photoNext?.addEventListener('click', nextPhoto);
photoCloseBtn?.addEventListener('click', closeGallery);
photoModal?.addEventListener('click', (e) => {
  if (e.target === photoModal) {
    closeGallery();
  }
});

// Keyboard navigation for photo modal
window.addEventListener('keydown', (e) => {
  if (!photoModal.classList.contains('open')) {
    return;
  }
  if (e.key === 'Escape') {
    closeGallery();
  }
  if (e.key === 'ArrowRight') {
    nextPhoto();
  }
  if (e.key === 'ArrowLeft') {
    prevPhoto();
  }
});
