const fs = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const STARTING_POINTS = 1000;
const RESET_PASSWORD_DEFAULT = '123456';
const SPECIAL_BONUS_POINTS = 300;
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-secret-in-production';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ODDS_PROVIDER = process.env.ODDS_PROVIDER || 'the-odds-api';
const ODDS_API_KEY = process.env.ODDS_API_KEY || '';
const ODDS_SPORT = process.env.ODDS_SPORT || 'soccer_fifa_world_cup';
const ODDS_REGIONS = process.env.ODDS_REGIONS || 'eu';
const ODDS_MARKETS = process.env.ODDS_MARKETS || 'h2h';
const ODDS_BOOKMAKERS = process.env.ODDS_BOOKMAKERS || '';
const ODDS_SYNC_INTERVAL_MS = Number(process.env.ODDS_SYNC_INTERVAL_MS || 300000);
const APIFOOTBALL_KEY = process.env.APIFOOTBALL_KEY || '';
const APIFOOTBALL_LEAGUE = process.env.APIFOOTBALL_LEAGUE || '';
const APIFOOTBALL_SEASON = process.env.APIFOOTBALL_SEASON || '';
const APIFOOTBALL_BOOKMAKER = process.env.APIFOOTBALL_BOOKMAKER || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const REMOTE_STATE_ID = 1;

const app = express();
const dbPath = path.join(__dirname, '..', 'data.json');
const useRemoteDb = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const supabase = useRemoteDb ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null;

function seedMatches() {
  return [
    { id: 1, team_a: 'Brazil', team_b: 'France', kickoff_at: '2026-06-20T19:00:00Z', odds_home: 2.2, odds_draw: 3.2, odds_away: 3.1, result: null, created_at: new Date().toISOString() },
    { id: 2, team_a: 'Argentina', team_b: 'Germany', kickoff_at: '2026-06-21T19:00:00Z', odds_home: 2.5, odds_draw: 3.1, odds_away: 2.8, result: null, created_at: new Date().toISOString() },
    { id: 3, team_a: 'Spain', team_b: 'England', kickoff_at: '2026-06-22T19:00:00Z', odds_home: 2.7, odds_draw: 3.0, odds_away: 2.6, result: null, created_at: new Date().toISOString() },
    { id: 4, team_a: 'Portugal', team_b: 'Netherlands', kickoff_at: '2026-06-23T19:00:00Z', odds_home: 2.8, odds_draw: 3.2, odds_away: 2.5, result: null, created_at: new Date().toISOString() }
  ];
}

function defaultDb() {
  return {
    nextUserId: 1,
    nextBetId: 1,
    nextMatchId: 5,
    lastSyncAt: null,
    lastSyncError: null,
    specialMarkets: [
      { key: 'wc_champion', title: 'Dự đoán đội vô địch World Cup', result: null, bonus_points: SPECIAL_BONUS_POINTS },
      { key: 'wc_top_scorer', title: 'Dự đoán vua phá lưới World Cup', result: null, bonus_points: SPECIAL_BONUS_POINTS },
      { key: 'wc_best_goalkeeper', title: 'Dự đoán thủ môn xuất sắc nhất World Cup', result: null, bonus_points: SPECIAL_BONUS_POINTS }
    ],
    specialPicks: [],
    dailyBonus: {
      enabled: false,
      start_date: null,
      points_per_day: 0
    },
    users: [],
    matches: seedMatches(),
    bets: []
  };
}

function loadDb() {
  if (!fs.existsSync(dbPath)) {
    const db = defaultDb();
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    return db;
  }

  const raw = fs.readFileSync(dbPath, 'utf8');
  const parsed = JSON.parse(raw || '{}');
  const db = {
    ...defaultDb(),
    ...parsed
  };

  if (!Array.isArray(db.matches) || db.matches.length === 0) {
    db.matches = seedMatches();
  }

  return db;
}

let db = loadDb();

for (const user of db.users) {
  if (typeof user.is_admin !== 'boolean') {
    user.is_admin = false;
  }
  if (!Number.isInteger(user.daily_bonus_days_awarded)) {
    user.daily_bonus_days_awarded = 0;
  }
}
if (!Array.isArray(db.specialMarkets) || db.specialMarkets.length === 0) {
  db.specialMarkets = defaultDb().specialMarkets;
}
if (!Array.isArray(db.specialPicks)) {
  db.specialPicks = [];
}
if (!db.dailyBonus || typeof db.dailyBonus !== 'object') {
  db.dailyBonus = defaultDb().dailyBonus;
}

function ensureAdminUser() {
  const existing = db.users.find((u) => u.username === ADMIN_USERNAME);
  const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);

  if (existing) {
    existing.is_admin = true;
    existing.password_hash = passwordHash;
    return;
  }

  db.users.push({
    id: db.nextUserId++,
    username: ADMIN_USERNAME,
    password_hash: passwordHash,
    points: STARTING_POINTS,
    is_admin: true,
    created_at: new Date().toISOString()
  });
}

function saveDb() {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  if (useRemoteDb) {
    persistDbRemote().catch((err) => {
      console.error(`[remote-db] save failed: ${err.message}`);
    });
  }
}

async function loadDbRemoteIfEnabled() {
  if (!useRemoteDb) return;
  const { data, error } = await supabase
    .from('app_state')
    .select('state')
    .eq('id', REMOTE_STATE_ID)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data?.state && typeof data.state === 'object') {
    db = { ...defaultDb(), ...data.state };
    for (const user of db.users) {
      if (typeof user.is_admin !== 'boolean') user.is_admin = false;
      if (!Number.isInteger(user.daily_bonus_days_awarded)) user.daily_bonus_days_awarded = 0;
    }
    if (!Array.isArray(db.specialMarkets) || db.specialMarkets.length === 0) db.specialMarkets = defaultDb().specialMarkets;
    if (!Array.isArray(db.specialPicks)) db.specialPicks = [];
    if (!db.dailyBonus || typeof db.dailyBonus !== 'object') db.dailyBonus = defaultDb().dailyBonus;
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    return;
  }

  await persistDbRemote();
}

async function persistDbRemote() {
  if (!useRemoteDb) return;
  const payload = { id: REMOTE_STATE_ID, state: db, updated_at: new Date().toISOString() };
  const { error } = await supabase.from('app_state').upsert(payload, { onConflict: 'id' });
  if (error) throw new Error(error.message);
}

function parseLocalDateToUtc(dateStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || ''));
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo, d));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function toDateOnlyKey(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function calculateBonusTargetDays(now = new Date()) {
  const cfg = db.dailyBonus;
  if (!cfg?.enabled || !cfg.start_date || !Number.isInteger(cfg.points_per_day) || cfg.points_per_day <= 0) return 0;
  const start = parseLocalDateToUtc(cfg.start_date);
  if (!start) return 0;

  const nowLocalDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startLocalDay = new Date(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const diffDays = Math.floor((nowLocalDay - startLocalDay) / 86400000);
  if (diffDays < 0) return 0;
  return diffDays + 1;
}

function applyDailyBonusToAllUsers() {
  const targetDays = calculateBonusTargetDays(new Date());
  if (targetDays <= 0) return false;

  let changed = false;
  for (const user of db.users) {
    const awarded = Number.isInteger(user.daily_bonus_days_awarded) ? user.daily_bonus_days_awarded : 0;
    if (awarded < targetDays) {
      const missingDays = targetDays - awarded;
      user.points += missingDays * db.dailyBonus.points_per_day;
      user.daily_bonus_days_awarded = targetDays;
      changed = true;
    }
  }
  if (changed) saveDb();
  return changed;
}

function normalizeName(name) {
  return String(name || '').trim().toLowerCase();
}

function buildMatchKey(teamA, teamB, kickoffAt) {
  return `${normalizeName(teamA)}__${normalizeName(teamB)}__${kickoffAt}`;
}

function pickH2H(bookmakers, homeTeam, awayTeam) {
  for (const bm of bookmakers || []) {
    for (const mk of bm.markets || []) {
      if (mk.key !== 'h2h') continue;
      const outcomes = mk.outcomes || [];
      const home = outcomes.find((o) => normalizeName(o.name) === normalizeName(homeTeam));
      const away = outcomes.find((o) => normalizeName(o.name) === normalizeName(awayTeam));
      const draw = outcomes.find((o) => normalizeName(o.name) === 'draw');
      if (home && away && draw) {
        return { home: Number(home.price), draw: Number(draw.price), away: Number(away.price) };
      }
    }
  }
  return null;
}

async function syncOddsFromProvider() {
  if (ODDS_PROVIDER === 'api-football') {
    return syncOddsFromApiFootball();
  }
  return syncOddsFromTheOddsApi();
}

async function syncOddsFromTheOddsApi() {
  if (!ODDS_API_KEY) {
    throw new Error('ODDS_API_KEY is missing.');
  }

  const params = new URLSearchParams({
    apiKey: ODDS_API_KEY,
    regions: ODDS_REGIONS,
    markets: ODDS_MARKETS,
    oddsFormat: 'decimal',
    dateFormat: 'iso'
  });

  if (ODDS_BOOKMAKERS) {
    params.set('bookmakers', ODDS_BOOKMAKERS);
  }

  const url = `https://api.the-odds-api.com/v4/sports/${ODDS_SPORT}/odds?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Odds API failed: ${res.status} ${text.slice(0, 300)}`);
  }

  const events = await res.json();
  if (!Array.isArray(events)) {
    throw new Error('Invalid odds payload.');
  }

  let inserted = 0;
  let updated = 0;
  const existingKeyToIndex = new Map();
  db.matches.forEach((m, idx) => {
    const key = m.external_key || buildMatchKey(m.team_a, m.team_b, m.kickoff_at);
    existingKeyToIndex.set(key, idx);
  });

  for (const e of events) {
    const teamA = e.home_team;
    const teamB = (e.away_team || '');
    const kickoffAt = e.commence_time;
    if (!teamA || !teamB || !kickoffAt) continue;

    const h2h = pickH2H(e.bookmakers, teamA, teamB);
    if (!h2h) continue;

    const key = buildMatchKey(teamA, teamB, kickoffAt);
    const idx = existingKeyToIndex.get(key);
    if (idx === undefined) {
      db.matches.push({
        id: db.nextMatchId++,
        team_a: teamA,
        team_b: teamB,
        kickoff_at: kickoffAt,
        odds_home: h2h.home,
        odds_draw: h2h.draw,
        odds_away: h2h.away,
        result: null,
        created_at: new Date().toISOString(),
        external_key: key
      });
      inserted += 1;
      continue;
    }

    const m = db.matches[idx];
    if (m.result) continue;
    m.team_a = teamA;
    m.team_b = teamB;
    m.kickoff_at = kickoffAt;
    m.odds_home = h2h.home;
    m.odds_draw = h2h.draw;
    m.odds_away = h2h.away;
    m.external_key = key;
    updated += 1;
  }

  db.lastSyncAt = new Date().toISOString();
  db.lastSyncError = null;
  saveDb();
  return { inserted, updated, totalEvents: events.length };
}

function pick1x2FromApiFootball(bookmakers) {
  for (const bm of bookmakers || []) {
    for (const bet of bm.bets || []) {
      const values = bet.values || [];
      const home = values.find((v) => normalizeName(v.value) === 'home');
      const away = values.find((v) => normalizeName(v.value) === 'away');
      const draw = values.find((v) => normalizeName(v.value) === 'draw');
      if (!home || !away || !draw) continue;

      const homeOdd = Number(home.odd);
      const drawOdd = Number(draw.odd);
      const awayOdd = Number(away.odd);
      if ([homeOdd, drawOdd, awayOdd].some((x) => Number.isNaN(x) || x <= 0)) continue;

      return { home: homeOdd, draw: drawOdd, away: awayOdd };
    }
  }
  return null;
}

async function syncOddsFromApiFootball() {
  const key = APIFOOTBALL_KEY || ODDS_API_KEY;
  if (!key) {
    throw new Error('APIFOOTBALL_KEY (or ODDS_API_KEY) is missing.');
  }
  if (!APIFOOTBALL_LEAGUE || !APIFOOTBALL_SEASON) {
    throw new Error('APIFOOTBALL_LEAGUE and APIFOOTBALL_SEASON are required.');
  }

  let page = 1;
  let inserted = 0;
  let updated = 0;
  let totalEvents = 0;

  const existingKeyToIndex = new Map();
  db.matches.forEach((m, idx) => {
    const key0 = m.external_key || buildMatchKey(m.team_a, m.team_b, m.kickoff_at);
    existingKeyToIndex.set(key0, idx);
  });

  while (true) {
    const params = new URLSearchParams({
      league: String(APIFOOTBALL_LEAGUE),
      season: String(APIFOOTBALL_SEASON),
      page: String(page)
    });
    if (APIFOOTBALL_BOOKMAKER) {
      params.set('bookmaker', String(APIFOOTBALL_BOOKMAKER));
    }

    const url = `https://v3.football.api-sports.io/odds?${params.toString()}`;
    const res = await fetch(url, {
      headers: {
        'x-apisports-key': key
      }
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API-Football failed: ${res.status} ${text.slice(0, 300)}`);
    }

    const payload = await res.json();
    const rows = payload?.response || [];
    const paging = payload?.paging || { current: page, total: page };
    totalEvents += rows.length;

    for (const row of rows) {
      const teamA = row?.teams?.home?.name;
      const teamB = row?.teams?.away?.name;
      const kickoffAt = row?.fixture?.date;
      if (!teamA || !teamB || !kickoffAt) continue;

      const oneXTwo = pick1x2FromApiFootball(row.bookmakers);
      if (!oneXTwo) continue;

      const keyMatch = buildMatchKey(teamA, teamB, kickoffAt);
      const idx = existingKeyToIndex.get(keyMatch);

      if (idx === undefined) {
        db.matches.push({
          id: db.nextMatchId++,
          team_a: teamA,
          team_b: teamB,
          kickoff_at: kickoffAt,
          odds_home: oneXTwo.home,
          odds_draw: oneXTwo.draw,
          odds_away: oneXTwo.away,
          result: null,
          created_at: new Date().toISOString(),
          external_key: keyMatch
        });
        inserted += 1;
      } else {
        const m = db.matches[idx];
        if (m.result) continue;
        m.team_a = teamA;
        m.team_b = teamB;
        m.kickoff_at = kickoffAt;
        m.odds_home = oneXTwo.home;
        m.odds_draw = oneXTwo.draw;
        m.odds_away = oneXTwo.away;
        m.external_key = keyMatch;
        updated += 1;
      }
    }

    if (Number(paging.current) >= Number(paging.total)) break;
    page += 1;
  }

  db.lastSyncAt = new Date().toISOString();
  db.lastSyncError = null;
  saveDb();
  return { inserted, updated, totalEvents };
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    status: 'healthy',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    storage: useRemoteDb ? 'supabase' : 'local-file'
  });
});

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
  const user = db.users.find((u) => u.id === req.session.user.id);
  if (!user || !user.is_admin) return res.status(403).json({ error: 'Forbidden' });
  next();
}

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    points: user.points,
    is_admin: Boolean(user.is_admin),
    created_at: user.created_at
  };
}

function currentUser(req) {
  applyDailyBonusToAllUsers();
  if (!req.session.user) return null;
  const user = db.users.find((u) => u.id === req.session.user.id);
  return user ? sanitizeUser(user) : null;
}

app.post('/api/register', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');

  if (username.length < 3 || username.length > 24) {
    return res.status(400).json({ error: 'Username must be 3-24 characters.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const exists = db.users.some((u) => u.username.toLowerCase() === username.toLowerCase());
  if (exists) {
    return res.status(409).json({ error: 'Username already exists.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: db.nextUserId++,
    username,
    password_hash: passwordHash,
    points: STARTING_POINTS,
    is_admin: false,
    created_at: new Date().toISOString()
  };

  db.users.push(user);
  saveDb();
  applyDailyBonusToAllUsers();

  req.session.user = { id: user.id, username: user.username };
  return res.json({ ok: true, user: currentUser(req) });
});

app.post('/api/login', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');

  const user = db.users.find((u) => u.username === username);
  if (!user) return res.status(401).json({ error: 'Invalid credentials.' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials.' });

  req.session.user = { id: user.id, username: user.username };
  return res.json({ ok: true, user: currentUser(req) });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.post('/api/change-password', requireAuth, async (req, res) => {
  const currentPassword = String(req.body.currentPassword || '');
  const newPassword = String(req.body.newPassword || '');

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }

  const user = db.users.find((u) => u.id === req.session.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const ok = await bcrypt.compare(currentPassword, user.password_hash);
  if (!ok) return res.status(400).json({ error: 'Current password is incorrect.' });

  user.password_hash = await bcrypt.hash(newPassword, 10);
  saveDb();
  return res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  res.json({ user: currentUser(req) });
});

app.get('/api/matches', (req, res) => {
  const matches = [...db.matches].sort((a, b) => new Date(a.kickoff_at) - new Date(b.kickoff_at));
  res.json({ matches });
});

app.get('/api/leaderboard', (req, res) => {
  applyDailyBonusToAllUsers();
  const leaderboard = db.users
    .map(sanitizeUser)
    .sort((a, b) => (b.points - a.points) || a.username.localeCompare(b.username))
    .slice(0, 50)
    .map((u) => ({ username: u.username, points: u.points }));

  res.json({ leaderboard });
});

app.get('/api/specials', requireAuth, (req, res) => {
  const picks = db.specialPicks
    .filter((p) => p.user_id === req.session.user.id)
    .map((p) => {
      const market = db.specialMarkets.find((m) => m.key === p.market_key);
      return {
        ...p,
        market_title: market?.title || p.market_key,
        market_result: market?.result || null
      };
    });
  res.json({ markets: db.specialMarkets, picks });
});

app.post('/api/specials/picks', requireAuth, (req, res) => {
  const marketKey = String(req.body.marketKey || '').trim();
  const prediction = String(req.body.prediction || '').trim();
  if (!marketKey || !prediction) return res.status(400).json({ error: 'Missing market or prediction.' });

  const market = db.specialMarkets.find((m) => m.key === marketKey);
  if (!market) return res.status(404).json({ error: 'Market not found.' });
  if (market.result) return res.status(400).json({ error: 'Market already settled.' });

  const existing = db.specialPicks.find((p) => p.user_id === req.session.user.id && p.market_key === marketKey);
  if (existing) {
    existing.prediction = prediction;
    existing.status = 'open';
    existing.bonus = 0;
    existing.updated_at = new Date().toISOString();
  } else {
    db.specialPicks.push({
      id: `${req.session.user.id}_${marketKey}`,
      user_id: req.session.user.id,
      market_key: marketKey,
      prediction,
      status: 'open',
      bonus: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
  saveDb();
  res.json({ ok: true });
});

app.get('/api/admin/users', requireAdmin, (req, res) => {
  const users = db.users
    .map((u) => ({ id: u.id, username: u.username, points: u.points, is_admin: Boolean(u.is_admin) }))
    .sort((a, b) => a.username.localeCompare(b.username));
  res.json({ users });
});

app.post('/api/admin/users/:id/points', requireAdmin, (req, res) => {
  const userId = Number(req.params.id);
  const delta = Number(req.body.delta);
  if (!Number.isInteger(userId)) return res.status(400).json({ error: 'Invalid user id.' });
  if (!Number.isInteger(delta) || delta === 0) return res.status(400).json({ error: 'Delta must be non-zero integer.' });

  const user = db.users.find((u) => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (user.points + delta < 0) return res.status(400).json({ error: 'Resulting points cannot be negative.' });

  user.points += delta;
  saveDb();
  res.json({ ok: true, user: sanitizeUser(user) });
});

app.post('/api/admin/users/:id/reset-password', requireAdmin, async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId)) return res.status(400).json({ error: 'Invalid user id.' });

  const user = db.users.find((u) => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  user.password_hash = await bcrypt.hash(RESET_PASSWORD_DEFAULT, 10);
  saveDb();
  res.json({ ok: true, defaultPassword: RESET_PASSWORD_DEFAULT });
});

app.post('/api/admin/users/bulk-points', requireAdmin, (req, res) => {
  const delta = Number(req.body.delta);
  if (!Number.isInteger(delta) || delta === 0) {
    return res.status(400).json({ error: 'Delta must be non-zero integer.' });
  }

  if (delta < 0) {
    const minPoints = db.users.reduce((min, u) => Math.min(min, u.points), Number.POSITIVE_INFINITY);
    if (minPoints + delta < 0) {
      return res.status(400).json({ error: 'Cannot subtract: at least one user would go negative.' });
    }
  }

  for (const user of db.users) {
    user.points += delta;
  }
  saveDb();
  res.json({ ok: true, affectedUsers: db.users.length, delta });
});

app.get('/api/admin/daily-bonus', requireAdmin, (req, res) => {
  applyDailyBonusToAllUsers();
  const targetDays = calculateBonusTargetDays(new Date());
  res.json({
    config: db.dailyBonus,
    targetDays
  });
});

app.post('/api/admin/daily-bonus', requireAdmin, (req, res) => {
  const enabled = Boolean(req.body.enabled);
  const startDate = String(req.body.startDate || '').trim();
  const pointsPerDay = Number(req.body.pointsPerDay);

  if (enabled) {
    if (!parseLocalDateToUtc(startDate)) {
      return res.status(400).json({ error: 'startDate must be YYYY-MM-DD.' });
    }
    if (!Number.isInteger(pointsPerDay) || pointsPerDay <= 0) {
      return res.status(400).json({ error: 'pointsPerDay must be positive integer.' });
    }
    db.dailyBonus = {
      enabled: true,
      start_date: startDate,
      points_per_day: pointsPerDay
    };
  } else {
    db.dailyBonus = {
      enabled: false,
      start_date: null,
      points_per_day: 0
    };
  }

  applyDailyBonusToAllUsers();
  saveDb();
  const targetDays = calculateBonusTargetDays(new Date());
  res.json({ ok: true, config: db.dailyBonus, targetDays });
});

app.get('/api/admin/specials', requireAdmin, (req, res) => {
  const markets = db.specialMarkets.map((m) => ({
    ...m,
    total_picks: db.specialPicks.filter((p) => p.market_key === m.key).length
  }));
  res.json({ markets });
});

app.post('/api/admin/specials/:key/settle', requireAdmin, (req, res) => {
  const key = String(req.params.key || '');
  const result = String(req.body.result || '').trim();
  if (!result) return res.status(400).json({ error: 'Missing result.' });

  const market = db.specialMarkets.find((m) => m.key === key);
  if (!market) return res.status(404).json({ error: 'Market not found.' });

  market.result = result;
  let winners = 0;
  for (const pick of db.specialPicks.filter((p) => p.market_key === key)) {
    const isWin = pick.prediction.toLowerCase() === result.toLowerCase();
    if (isWin) {
      pick.status = 'won';
      if (!pick.bonus || pick.bonus <= 0) {
        const user = db.users.find((u) => u.id === pick.user_id);
        if (user) {
          user.points += market.bonus_points;
          pick.bonus = market.bonus_points;
        }
      }
      winners += 1;
    } else {
      pick.status = 'lost';
      pick.bonus = 0;
    }
    pick.updated_at = new Date().toISOString();
  }

  saveDb();
  res.json({ ok: true, winners });
});

app.get('/api/admin/users/:id/export', requireAdmin, (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId)) return res.status(400).json({ error: 'Invalid user id.' });

  const user = db.users.find((u) => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const rows = db.bets
    .filter((b) => b.user_id === userId)
    .map((b) => {
      const m = db.matches.find((x) => x.id === b.match_id);
      return {
        bet_id: b.id,
        username: user.username,
        team_a: m?.team_a || '',
        team_b: m?.team_b || '',
        kickoff_at: m?.kickoff_at || '',
        pick: b.pick,
        stake: b.stake,
        odds: b.odds,
        status: b.status,
        payout: b.payout ?? '',
        match_result: m?.result || '',
        created_at: b.created_at
      };
    })
    .sort((a, b) => new Date(a.kickoff_at || 0) - new Date(b.kickoff_at || 0));

  const header = [
    'bet_id',
    'username',
    'team_a',
    'team_b',
    'kickoff_at',
    'pick',
    'stake',
    'odds',
    'status',
    'payout',
    'match_result',
    'created_at'
  ];

  const escapeCsv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [
    header.join(','),
    ...rows.map((r) => header.map((k) => escapeCsv(r[k])).join(','))
  ].join('\n');

  const fileSafe = user.username.replace(/[^a-zA-Z0-9_-]/g, '_');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=\"user_${fileSafe}_bets.csv\"`);
  res.send('\uFEFF' + csv);
});

app.get('/api/my-bets', requireAuth, (req, res) => {
  const bets = db.bets
    .filter((b) => b.user_id === req.session.user.id)
    .map((b) => {
      const m = db.matches.find((x) => x.id === b.match_id);
      return {
        ...b,
        team_a: m?.team_a,
        team_b: m?.team_b,
        kickoff_at: m?.kickoff_at,
        result: m?.result || null
      };
    })
    .sort((a, b) => new Date(a.kickoff_at) - new Date(b.kickoff_at));

  res.json({ bets });
});

app.post('/api/bets', requireAuth, (req, res) => {
  const matchId = Number(req.body.matchId);
  const pick = String(req.body.pick || '');
  const stake = Number(req.body.stake);

  if (!Number.isInteger(matchId) || !['HOME', 'DRAW', 'AWAY'].includes(pick)) {
    return res.status(400).json({ error: 'Invalid bet payload.' });
  }
  if (!Number.isInteger(stake) || stake <= 0) {
    return res.status(400).json({ error: 'Stake must be a positive integer.' });
  }

  const match = db.matches.find((m) => m.id === matchId);
  if (!match) return res.status(404).json({ error: 'Match not found.' });
  if (match.result) return res.status(400).json({ error: 'Betting closed for this match.' });
  if (Date.now() >= new Date(match.kickoff_at).getTime()) {
    return res.status(400).json({ error: 'Betting closed (kickoff passed).' });
  }

  const existed = db.bets.some((b) => b.user_id === req.session.user.id && b.match_id === matchId);
  if (existed) return res.status(409).json({ error: 'You already bet on this match.' });

  const user = db.users.find((u) => u.id === req.session.user.id);
  if (!user || user.points < stake) return res.status(400).json({ error: 'Not enough points.' });

  let odds = match.odds_draw;
  if (pick === 'HOME') odds = match.odds_home;
  if (pick === 'AWAY') odds = match.odds_away;

  user.points -= stake;
  db.bets.push({
    id: db.nextBetId++,
    user_id: user.id,
    match_id: matchId,
    pick,
    stake,
    odds,
    status: 'open',
    payout: null,
    created_at: new Date().toISOString()
  });

  saveDb();
  res.json({ ok: true, user: sanitizeUser(user) });
});

app.delete('/api/bets/:id', requireAuth, (req, res) => {
  const betId = Number(req.params.id);
  if (!Number.isInteger(betId)) {
    return res.status(400).json({ error: 'Invalid bet id.' });
  }

  const betIndex = db.bets.findIndex((b) => b.id === betId && b.user_id === req.session.user.id);
  if (betIndex === -1) {
    return res.status(404).json({ error: 'Bet not found.' });
  }

  const bet = db.bets[betIndex];
  const match = db.matches.find((m) => m.id === bet.match_id);
  if (!match) {
    return res.status(404).json({ error: 'Match not found.' });
  }

  if (match.result || Date.now() >= new Date(match.kickoff_at).getTime()) {
    return res.status(400).json({ error: 'Cannot cancel. Match already started or settled.' });
  }

  const user = db.users.find((u) => u.id === req.session.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  user.points += bet.stake;
  db.bets.splice(betIndex, 1);
  saveDb();

  return res.json({ ok: true, user: sanitizeUser(user) });
});

app.get('/api/admin/matches', requireAdmin, (req, res) => {
  const matches = [...db.matches].sort((a, b) => new Date(a.kickoff_at) - new Date(b.kickoff_at));
  res.json({ matches });
});

app.post('/api/admin/matches', requireAdmin, (req, res) => {
  const teamA = String(req.body.teamA || '').trim();
  const teamB = String(req.body.teamB || '').trim();
  const kickoffAt = String(req.body.kickoffAt || '').trim();
  const oddsHome = Number(req.body.oddsHome);
  const oddsDraw = Number(req.body.oddsDraw);
  const oddsAway = Number(req.body.oddsAway);

  if (!teamA || !teamB || !kickoffAt) return res.status(400).json({ error: 'Missing team or kickoff.' });
  if ([oddsHome, oddsDraw, oddsAway].some((x) => Number.isNaN(x) || x <= 1)) {
    return res.status(400).json({ error: 'Invalid odds.' });
  }

  const parsed = new Date(kickoffAt);
  if (Number.isNaN(parsed.getTime())) return res.status(400).json({ error: 'Invalid kickoff time.' });

  db.matches.push({
    id: db.nextMatchId++,
    team_a: teamA,
    team_b: teamB,
    kickoff_at: parsed.toISOString(),
    odds_home: oddsHome,
    odds_draw: oddsDraw,
    odds_away: oddsAway,
    result: null,
    created_at: new Date().toISOString()
  });
  saveDb();
  res.json({ ok: true });
});

app.put('/api/admin/matches/:id', requireAdmin, (req, res) => {
  const matchId = Number(req.params.id);
  if (!Number.isInteger(matchId)) return res.status(400).json({ error: 'Invalid match id.' });
  const match = db.matches.find((m) => m.id === matchId);
  if (!match) return res.status(404).json({ error: 'Match not found.' });

  if (req.body.teamA !== undefined) match.team_a = String(req.body.teamA).trim();
  if (req.body.teamB !== undefined) match.team_b = String(req.body.teamB).trim();
  if (req.body.kickoffAt !== undefined) {
    const parsed = new Date(String(req.body.kickoffAt));
    if (Number.isNaN(parsed.getTime())) return res.status(400).json({ error: 'Invalid kickoff time.' });
    match.kickoff_at = parsed.toISOString();
  }
  if (req.body.oddsHome !== undefined) {
    const v = Number(req.body.oddsHome);
    if (Number.isNaN(v) || v <= 1) return res.status(400).json({ error: 'Invalid oddsHome.' });
    match.odds_home = v;
  }
  if (req.body.oddsDraw !== undefined) {
    const v = Number(req.body.oddsDraw);
    if (Number.isNaN(v) || v <= 1) return res.status(400).json({ error: 'Invalid oddsDraw.' });
    match.odds_draw = v;
  }
  if (req.body.oddsAway !== undefined) {
    const v = Number(req.body.oddsAway);
    if (Number.isNaN(v) || v <= 1) return res.status(400).json({ error: 'Invalid oddsAway.' });
    match.odds_away = v;
  }
  saveDb();
  res.json({ ok: true });
});

app.delete('/api/admin/matches/:id', requireAdmin, (req, res) => {
  const matchId = Number(req.params.id);
  if (!Number.isInteger(matchId)) return res.status(400).json({ error: 'Invalid match id.' });
  const idx = db.matches.findIndex((m) => m.id === matchId);
  if (idx === -1) return res.status(404).json({ error: 'Match not found.' });
  const match = db.matches[idx];
  if (match.result) return res.status(400).json({ error: 'Cannot delete settled match.' });

  const relatedBets = db.bets.filter((b) => b.match_id === matchId);
  for (const bet of relatedBets) {
    const user = db.users.find((u) => u.id === bet.user_id);
    if (user) {
      user.points += bet.stake;
    }
  }

  db.bets = db.bets.filter((b) => b.match_id !== matchId);
  db.matches.splice(idx, 1);
  saveDb();
  res.json({ ok: true, refundedBets: relatedBets.length });
});

app.post('/api/admin/settle', requireAdmin, (req, res) => {

  const matchId = Number(req.body.matchId);
  const result = String(req.body.result || '');
  if (!Number.isInteger(matchId) || !['HOME', 'DRAW', 'AWAY'].includes(result)) {
    return res.status(400).json({ error: 'Invalid payload.' });
  }

  const match = db.matches.find((m) => m.id === matchId);
  if (!match) return res.status(404).json({ error: 'Match not found.' });
  if (match.result) return res.status(400).json({ error: 'Match already settled.' });

  match.result = result;

  const matchBets = db.bets.filter((b) => b.match_id === matchId);
  for (const bet of matchBets) {
    if (bet.pick === result) {
      const payout = Math.floor(bet.stake * bet.odds);
      const user = db.users.find((u) => u.id === bet.user_id);
      if (user) user.points += payout;
      bet.status = 'won';
      bet.payout = payout;
    } else {
      bet.status = 'lost';
      bet.payout = 0;
    }
  }

  saveDb();
  res.json({ ok: true, settledBets: matchBets.length });
});

app.get('/api/admin/sync-status', requireAdmin, (req, res) => {

  return res.json({
    lastSyncAt: db.lastSyncAt || null,
    lastSyncError: db.lastSyncError || null,
    autoSyncEnabled: ODDS_PROVIDER === 'api-football' ? Boolean(APIFOOTBALL_KEY || ODDS_API_KEY) : Boolean(ODDS_API_KEY),
    provider: ODDS_PROVIDER,
    sport: ODDS_PROVIDER === 'api-football' ? `league=${APIFOOTBALL_LEAGUE},season=${APIFOOTBALL_SEASON}` : ODDS_SPORT
  });
});

app.post('/api/admin/sync-odds', requireAdmin, async (req, res) => {

  try {
    const summary = await syncOddsFromProvider();
    return res.json({ ok: true, ...summary });
  } catch (err) {
    db.lastSyncAt = new Date().toISOString();
    db.lastSyncError = err.message;
    saveDb();
    return res.status(500).json({ error: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

async function startServer() {
  try {
    await loadDbRemoteIfEnabled();
    ensureAdminUser();
    saveDb();
    if (useRemoteDb) {
      console.log('[remote-db] Supabase persistence enabled.');
    } else {
      console.log('[remote-db] Using local data.json (fallback).');
    }
  } catch (err) {
    console.error(`[remote-db] init failed, fallback to local file: ${err.message}`);
  }

  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });

  const autoSyncEnabled = ODDS_PROVIDER === 'api-football' ? Boolean(APIFOOTBALL_KEY || ODDS_API_KEY) : Boolean(ODDS_API_KEY);
  if (autoSyncEnabled) {
    setInterval(async () => {
      try {
        const summary = await syncOddsFromProvider();
        console.log(`[odds-sync] inserted=${summary.inserted} updated=${summary.updated} totalEvents=${summary.totalEvents}`);
      } catch (err) {
        db.lastSyncAt = new Date().toISOString();
        db.lastSyncError = err.message;
        saveDb();
        console.error(`[odds-sync] failed: ${err.message}`);
      }
    }, ODDS_SYNC_INTERVAL_MS);
  }
}

startServer();

