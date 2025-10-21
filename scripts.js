// Extracted from index.html inline <script>

// ---------- Utilities ----------
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const fmt = n => new Intl.NumberFormat().format(n);

const STORAGE_KEY = 'quizLeagueData:v2-singleTeam';
const TEAM_NAME = 'Gorsko Slivovo';

// Demo fallback
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

// Load initial in-memory state. We intentionally do NOT trust localStorage as the
// authoritative source on boot because stale saved data is the main cause of "broken"
// pages for users who keep old data in their browser. Instead we start from demoData
// and prefer fetching a fresh CSV from the repo. localStorage is kept only as a
// fallback when remote data is unavailable (offline or CSV missing).
function load() {
  try {
    // Return a safe initial state (demo) — we'll replace it with fresh CSV data soon.
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge shallow so demoData provides missing keys
      return Object.assign({}, demoData, parsed);
    }
    return demoData;
  } catch (e) {
    return demoData;
  }
}
function save(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

// ---------- State ----------
let state = load();
if (!state.quickAccess) state.quickAccess = [];
const seasonSelect = $('#seasonSelect');

// ---------- CSV LOADING ----------
async function tryLoadCSVForSeason(year) {
  const urlCsv = `data/season-${year}.csv?v=${Date.now()}`; // cache-bust GitHub Pages
  try {
    const res = await fetch(urlCsv, { cache: 'no-store' });
    if (!res.ok) throw new Error(`CSV not found (${res.status})`);
    const text = await res.text();
    const quizzes = parseCSV(text);
    if (!state.seasons) state.seasons = {};
    if (!state.seasons[year]) state.seasons[year] = { team: TEAM_NAME, quizzes: [] };
    state.seasons[year].quizzes = quizzes;
    state.currentSeason = year;
    save(state);
    toast(`Loaded CSV for ${year}`);
  } catch (e) {
    // Remote CSV failed. Try to fall back to any saved data in localStorage for this year.
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && saved.seasons && saved.seasons[year]) {
          // Use the locally-saved CSV as a fallback (offline / missing file)
          if (!state.seasons) state.seasons = {};
          state.seasons[year] = saved.seasons[year];
          state.currentSeason = saved.currentSeason || year;
          toast(`Using cached data for ${year}`);
          return;
        }
      }
    } catch (_) { /* ignore parse errors */ }

    // If we reach here, there was no usable local fallback — stay with demo data.
    toast('CSV not found for ' + year);
    console.warn('CSV load skipped:', e.message);
  }
}

// Basic CSV parser supporting quoted fields + BOM-safe + Windows/Mac/Unix newlines
function parseCSV(text) {
  const lines = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  if (!lines.length) return [];
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
    if (!line || !line.trim()) continue;
    const cols = splitCSVLine(line);
    const q = {
      date: normalizeDate((cols[idx.date] || '').trim()),
      notes: (cols[idx.notes] || '').trim(),
      points: Number((cols[idx.points] || '').trim() || 0),
      teams: Number((cols[idx.teams] || '').trim() || 0),
      place: idx.place >= 0 ? Number((cols[idx.place] || '').trim() || 0) : 0,
      photos: idx.photos >= 0 ? parsePhotos((cols[idx.photos] || '').trim()) : []
    };
    if (q.date) out.push(q);
  }
  return out;
}

function splitCSVLine(line) {
  const out = []; let cur = ''; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; } // escaped quote
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) {
      out.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

// Normalize date inputs to YYYY-MM-DD. Accepts:
// - already YYYY-MM-DD
// - YYYY/MM/DD
// - DD.MM.YYYY or D.M.YYYY (user requested)
// - fallback: Date parseable strings
function normalizeDate(raw) {
  if (!raw) return '';
  raw = raw.trim();
  // ISO YYYY-MM-DD
  let m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // ISO alternative YYYY/MM/DD
  m = raw.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
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

// Accept photos as one of:
// - Semicolon- or pipe-separated list: "img1.jpg; img2.jpg" or "img1.jpg|img2.jpg"
// - JSON array string: ["img1.jpg", "img2.jpg"]
// - Single path
// Paths can be relative (e.g., photos/2025-10-06/pic.jpg) or absolute URLs.
function parsePhotos(raw) {
  if (!raw) return [];
  try {
    const t = raw.trim();
    if (!t) return [];
    if (t.startsWith('[')) {
      const arr = JSON.parse(t);
      return Array.isArray(arr) ? arr.map(String).map(s => s.trim()).filter(Boolean) : [];
    }
    const parts = t.split(/[|;]+/).map(s => s.trim()).filter(Boolean);
    return parts.length ? parts : [t];
  } catch (_) {
    return [];
  }
}

// Compute the next Monday date (returns a Date object). If today is Monday, returns next week's Monday.
function computeNextMonday(from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ...
  let daysUntil = (1 - day + 7) % 7; // days until Monday (0..6)
  if (daysUntil === 0) daysUntil = 7; // if today is Monday, pick next Monday
  d.setDate(d.getDate() + daysUntil);
  d.setHours(0,0,0,0);
  return d;
}

// ---------- Rendering ----------
function renderSeasons() {
  const years = Object.keys(state.seasons).sort((a, b) => b.localeCompare(a));
  seasonSelect.innerHTML = years.map(y => `<option value="${y}" ${y === state.currentSeason ? 'selected' : ''}>${y}</option>`).join('');
  // The compact season label in the header was removed; update it only if present
  const lbl = $('#seasonLabel');
  if (lbl && state.seasons && state.seasons[state.currentSeason]) {
    lbl.textContent = `Season ${state.currentSeason} · ${state.seasons[state.currentSeason].quizzes.length} quizzes`;
  }
}

function getSeason() { return state.seasons[state.currentSeason]; }

function computeLeaderboard() {
  const s = getSeason();
  const quizzes = s.quizzes || [];
  const total = quizzes.reduce((a, q) => a + (Number(q.points) || 0), 0);
  const avg = quizzes.length ? total / quizzes.length : 0;
  return [{ team: s.team || TEAM_NAME, quizzes: quizzes.length, total, average: avg }];
}

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
        </tr>`
  }).join('');
}

function placeFromPoints(p) {
  if (p >= 5) return '1st place';
  if (p === 4) return '2nd place';
  if (p === 3) return '3rd place';
  return '4th place or below';
}

function getPlaceSuffix(place) {
  if (place === 1) return 'st';
  if (place === 2) return 'nd';
  if (place === 3) return 'rd';
  return 'th';
}

function renderHistory() {
  const box = $('#quizHistory');
  const s = getSeason();
  const quizzes = [...(s.quizzes || [])].sort((a, b) => a.date.localeCompare(b.date)).reverse();
  if (!quizzes.length) { box.innerHTML = '<p class="subtitle">No quizzes yet — click “Add Quiz”.</p>'; return; }
  box.innerHTML = quizzes.map(q => {
    const placeInfo = q.place > 0 ? `${q.place}${getPlaceSuffix(q.place)} place` : placeFromPoints(Number(q.points) || 0);
    const meta = `${placeInfo} • ${fmt(q.points)} pts • vs ${fmt(q.teams || 0)} team${(q.teams || 0) === 1 ? '' : 's'}`;
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
            <div>Average teams per quiz: <strong>${avgTeams ? avgTeams.toFixed(1) : '—'}</strong></div>
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
// Note: the interactive add/edit form was removed to simplify this build.
seasonSelect.addEventListener('change', async () => { state.currentSeason = seasonSelect.value; save(state); await tryLoadCSVForSeason(state.currentSeason); renderAll(); });


// ---------- Toast & Confetti ----------
function toast(msg) { const t = $('#toast'); if (t) { t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2200); } else { console.log('Toast:', msg); } }

// Minimal confetti effect
const fx = document.getElementById('fx');
const ctx = fx.getContext('2d');
let particles = [];
function resize() { fx.width = innerWidth; fx.height = innerHeight }
addEventListener('resize', resize); resize();
function confetti() {
  for (let i = 0; i < 80; i++) {
    particles.push({ x: Math.random() * fx.width, y: -20, vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 2.5, r: 2 + Math.random() * 4, a: 1 })
  }
}
function tick() {
  ctx.clearRect(0, 0, fx.width, fx.height);
  particles.forEach(p => {
    p.x += p.vx; p.y += p.vy; p.a -= 0.008; p.vy += 0.02;
    ctx.globalAlpha = Math.max(p.a, 0);
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
    g.addColorStop(0, 'rgba(34,211,238,1)');
    g.addColorStop(1, 'rgba(139,92,246,0)');
    ctx.fillStyle = g; ctx.fill();
  });
  particles = particles.filter(p => p.a > 0 && p.y < fx.height + 20);
  requestAnimationFrame(tick);
}
tick();

// ---------- Team Presence ----------
let presenceData = null;

async function loadPresenceData() {
  const urlCsv = `data/presence.csv?v=${Date.now()}`;
  try {
    const res = await fetch(urlCsv, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Presence CSV not found (${res.status})`);
    const text = await res.text();
    presenceData = parsePresenceCSV(text);
  } catch (e) {
    console.warn('Failed to load presence data:', e.message);
    presenceData = null;
  }
}

function parsePresenceCSV(text) {
  const lines = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  if (!lines.length) return null;
  
  // First line contains team member names (skip first empty column)
  const header = splitCSVLine(lines[0]);
  const teamMembers = header.slice(1).map(name => name.trim()).filter(Boolean);
  
  // Initialize counts
  const counts = {};
  teamMembers.forEach(name => counts[name] = 0);
  
  // Parse each attendance row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !line.trim()) continue;
    const cols = splitCSVLine(line);
    
    // Skip the date column (first column) and count "yes" values
    for (let j = 1; j < cols.length && j <= teamMembers.length; j++) {
      const value = (cols[j] || '').trim().toLowerCase();
      if (value === 'yes') {
        counts[teamMembers[j - 1]]++;
      }
    }
  }
  
  return { teamMembers, counts };
}

function renderTeamPresence() {
  const container = $('#teamPresenceSection');
  if (!container) return;
  
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
    return `
      <div class="presence-bar-item">
        <div class="presence-name">${name}</div>
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
      <div class="subtitle">Number of quizzes attended by each team member</div>
    </div>
    <div class="body">
      <div class="presence-bars">
        ${barsHtml}
      </div>
    </div>
  `;
}

// ---------- Boot ----------
async function renderAll() { renderSeasons(); renderLeaderboard(); renderQuickAccess(); renderHistory(); renderSeasonStats(); renderTeamPresence(); }
(async () => { await tryLoadCSVForSeason(state.currentSeason); await loadPresenceData(); renderAll(); })();

// ---------- Photo modal logic ----------
const photoModal = document.getElementById('photoModal');
const photoImg = document.getElementById('photoImage');
const photoCaption = document.getElementById('photoCaption');
const photoPager = document.getElementById('photoPager');
const photoPrev = document.getElementById('photoPrev');
const photoNext = document.getElementById('photoNext');
const photoCloseBtn = document.getElementById('photoModalClose');
let currentPhotos = []; let currentIndex = 0; let currentDate = '';

function openGalleryFor(date, start = 0) {
  const s = getSeason();
  const q = (s.quizzes || []).find(x => x.date === date);
  if (!q || !q.photos || !q.photos.length) return;
  currentPhotos = q.photos.slice();
  currentIndex = Math.min(Math.max(0, start), currentPhotos.length - 1);
  currentDate = date;
  showCurrentPhoto();
  photoModal.classList.add('open');
  photoModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeGallery() {
  photoModal.classList.remove('open');
  photoModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function showCurrentPhoto() {
  if (!currentPhotos.length) return;
  const src = currentPhotos[currentIndex];
  photoImg.src = src;
  photoImg.alt = `Photo ${currentIndex + 1} of ${currentPhotos.length} from ${currentDate}`;
  photoCaption.textContent = new Date(currentDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
  photoPager.textContent = `${currentIndex + 1} / ${currentPhotos.length}`;
}

function nextPhoto() { if (!currentPhotos.length) return; currentIndex = (currentIndex + 1) % currentPhotos.length; showCurrentPhoto(); }
function prevPhoto() { if (!currentPhotos.length) return; currentIndex = (currentIndex - 1 + currentPhotos.length) % currentPhotos.length; showCurrentPhoto(); }

// Event delegation for thumbnails
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
photoModal?.addEventListener('click', (e) => { if (e.target === photoModal) closeGallery(); });
window.addEventListener('keydown', (e) => {
  if (!photoModal.classList.contains('open')) return;
  if (e.key === 'Escape') closeGallery();
  if (e.key === 'ArrowRight') nextPhoto();
  if (e.key === 'ArrowLeft') prevPhoto();
});
