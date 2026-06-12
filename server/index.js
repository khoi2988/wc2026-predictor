const fs = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const STARTING_POINTS = 1000;
const MAX_PLAYERS = 100;
const RESET_PASSWORD_DEFAULT = '123456';
const SPECIAL_BONUS_POINTS = 5000;
const SPECIAL_PREDICTION_DEADLINE_ISO = '2026-06-14T16:59:59.999Z';
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
    { id: 1, team_a: 'Brazil', team_b: 'France', kickoff_at: '2026-06-20T19:00:00Z', bet_mode: '1X2', odds_home: 2.2, odds_draw: 3.2, odds_away: 3.1, handicap_line: null, odds_handicap_home: null, odds_handicap_away: null, result: null, created_at: new Date().toISOString() },
    { id: 2, team_a: 'Argentina', team_b: 'Germany', kickoff_at: '2026-06-21T19:00:00Z', bet_mode: '1X2', odds_home: 2.5, odds_draw: 3.1, odds_away: 2.8, handicap_line: null, odds_handicap_home: null, odds_handicap_away: null, result: null, created_at: new Date().toISOString() },
    { id: 3, team_a: 'Spain', team_b: 'England', kickoff_at: '2026-06-22T19:00:00Z', bet_mode: '1X2', odds_home: 2.7, odds_draw: 3.0, odds_away: 2.6, handicap_line: null, odds_handicap_home: null, odds_handicap_away: null, result: null, created_at: new Date().toISOString() },
    { id: 4, team_a: 'Portugal', team_b: 'Netherlands', kickoff_at: '2026-06-23T19:00:00Z', bet_mode: '1X2', odds_home: 2.8, odds_draw: 3.2, odds_away: 2.5, handicap_line: null, odds_handicap_home: null, odds_handicap_away: null, result: null, created_at: new Date().toISOString() }
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
    specialPredictionConfig: {
      deadline_iso: SPECIAL_PREDICTION_DEADLINE_ISO,
      manually_locked: false
    },
    dailyBonus: {
      enabled: false,
      start_date: null,
      points_per_day: 0
    },
    maintenance: {
      enabled: false,
      message: ''
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
  if (typeof user.can_manage_odds !== 'boolean') {
    user.can_manage_odds = false;
  }
  if (typeof user.can_set_result !== 'boolean') {
    user.can_set_result = false;
  }
  if (!Number.isInteger(user.daily_bonus_days_awarded)) {
    user.daily_bonus_days_awarded = 0;
  }
  if (typeof user.full_name !== 'string') {
    user.full_name = '';
  }
}
for (const match of db.matches) {
  if (!Number.isInteger(match.home_score)) match.home_score = null;
  if (!Number.isInteger(match.away_score)) match.away_score = null;
  if (!['1X2', 'HANDICAP'].includes(match.bet_mode)) {
    match.bet_mode = typeof match.handicap_line === 'number' ? 'HANDICAP' : '1X2';
  }
  if (typeof match.handicap_line !== 'number') match.handicap_line = null;
  if (typeof match.odds_handicap_home !== 'number') match.odds_handicap_home = null;
  if (typeof match.odds_handicap_away !== 'number') match.odds_handicap_away = null;
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
if (!db.maintenance || typeof db.maintenance !== 'object') {
  db.maintenance = defaultDb().maintenance;
}
if (typeof db.maintenance.enabled !== 'boolean') {
  db.maintenance.enabled = false;
}
if (typeof db.maintenance.message !== 'string') {
  db.maintenance.message = '';
}
if (!db.specialPredictionConfig || typeof db.specialPredictionConfig !== 'object') {
  db.specialPredictionConfig = defaultDb().specialPredictionConfig;
}
if (typeof db.specialPredictionConfig.deadline_iso !== 'string' || !db.specialPredictionConfig.deadline_iso) {
  db.specialPredictionConfig.deadline_iso = SPECIAL_PREDICTION_DEADLINE_ISO;
}
if (typeof db.specialPredictionConfig.manually_locked !== 'boolean') {
  db.specialPredictionConfig.manually_locked = false;
}
for (const market of db.specialMarkets) {
  market.bonus_points = SPECIAL_BONUS_POINTS;
}

function ensureAdminUser() {
  const existing = db.users.find((u) => u.username === ADMIN_USERNAME);
  const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);

  if (existing) {
    existing.is_admin = true;
    existing.can_manage_odds = true;
    existing.can_set_result = true;
    if (!existing.full_name || !String(existing.full_name).trim()) {
      existing.full_name = 'Quản trị viên';
    }
    existing.password_hash = passwordHash;
    return;
  }

  db.users.push({
    id: db.nextUserId++,
    username: ADMIN_USERNAME,
    password_hash: passwordHash,
    points: STARTING_POINTS,
    is_admin: true,
    can_manage_odds: true,
    can_set_result: true,
    full_name: 'Quản trị viên',
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
      if (typeof user.can_manage_odds !== 'boolean') user.can_manage_odds = false;
      if (typeof user.can_set_result !== 'boolean') user.can_set_result = false;
      if (!Number.isInteger(user.daily_bonus_days_awarded)) user.daily_bonus_days_awarded = 0;
    }
    for (const match of db.matches) {
      if (!Number.isInteger(match.home_score)) match.home_score = null;
      if (!Number.isInteger(match.away_score)) match.away_score = null;
      if (!['1X2', 'HANDICAP'].includes(match.bet_mode)) {
        match.bet_mode = typeof match.handicap_line === 'number' ? 'HANDICAP' : '1X2';
      }
      if (typeof match.handicap_line !== 'number') match.handicap_line = null;
      if (typeof match.odds_handicap_home !== 'number') match.odds_handicap_home = null;
      if (typeof match.odds_handicap_away !== 'number') match.odds_handicap_away = null;
    }
    if (!Array.isArray(db.specialMarkets) || db.specialMarkets.length === 0) db.specialMarkets = defaultDb().specialMarkets;
    if (!Array.isArray(db.specialPicks)) db.specialPicks = [];
    if (!db.dailyBonus || typeof db.dailyBonus !== 'object') db.dailyBonus = defaultDb().dailyBonus;
    if (!db.maintenance || typeof db.maintenance !== 'object') db.maintenance = defaultDb().maintenance;
    if (typeof db.maintenance.enabled !== 'boolean') db.maintenance.enabled = false;
    if (typeof db.maintenance.message !== 'string') db.maintenance.message = '';
    if (!db.specialPredictionConfig || typeof db.specialPredictionConfig !== 'object') db.specialPredictionConfig = defaultDb().specialPredictionConfig;
    if (typeof db.specialPredictionConfig.deadline_iso !== 'string' || !db.specialPredictionConfig.deadline_iso) db.specialPredictionConfig.deadline_iso = SPECIAL_PREDICTION_DEADLINE_ISO;
    if (typeof db.specialPredictionConfig.manually_locked !== 'boolean') db.specialPredictionConfig.manually_locked = false;
    for (const market of db.specialMarkets) {
      market.bonus_points = SPECIAL_BONUS_POINTS;
    }
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

function isSpecialPredictionLocked(now = new Date()) {
  const cfg = db.specialPredictionConfig || {};
  if (cfg.manually_locked) return true;
  const deadlineIso = cfg.deadline_iso || SPECIAL_PREDICTION_DEADLINE_ISO;
  return now.getTime() > new Date(deadlineIso).getTime();
}

function formatSpecialPredictionDeadlineText(deadlineIso) {
  const dt = new Date(deadlineIso || SPECIAL_PREDICTION_DEADLINE_ISO);
  const day = String(dt.getUTCDate()).padStart(2, '0');
  const month = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const year = dt.getUTCFullYear();
  const hour = String((dt.getUTCHours() + 7) % 24).padStart(2, '0');
  const minute = String(dt.getUTCMinutes()).padStart(2, '0');
  return `${hour}:${minute} ngày ${day}/${month}/${year} (GMT+7)`;
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
app.use('/assets/flag-icons', express.static(path.join(__dirname, '..', 'node_modules', 'flag-icons')));

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

function getSessionUserRecord(req) {
  if (!req.session.user) return null;
  return db.users.find((u) => u.id === req.session.user.id) || null;
}

function hasPermission(req, permissionKey) {
  const user = getSessionUserRecord(req);
  if (!user) return false;
  if (user.is_admin) return true;
  return Boolean(user[permissionKey]);
}

function requirePermission(permissionKey) {
  return (req, res, next) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!hasPermission(req, permissionKey)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

function resolveResultFromScore(homeScore, awayScore) {
  if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore)) return null;
  if (homeScore > awayScore) return 'HOME';
  if (homeScore < awayScore) return 'AWAY';
  return 'DRAW';
}

function splitStakeInteger(stake) {
  const first = Math.floor(stake / 2);
  const second = stake - first;
  return [first, second];
}

function settleAsianLeg(scoreDiff, handicapFromHome, sidePick) {
  const adjusted = scoreDiff + handicapFromHome;
  if (adjusted > 0) return sidePick === 'HOME' ? 'WIN' : 'LOSE';
  if (adjusted < 0) return sidePick === 'AWAY' ? 'WIN' : 'LOSE';
  return 'PUSH';
}

function settleAsianHandicapBet({ homeScore, awayScore, line, pick, stake, odds }) {
  const sideScore = pick === 'HOME' ? homeScore : awayScore;
  const oppScore = pick === 'HOME' ? awayScore : homeScore;
  const signedHandicap = pick === 'HOME' ? -line : line;
  const decimalPart = Math.abs(signedHandicap % 1);
  const isQuarter = Math.abs(decimalPart - 0.25) < 1e-9 || Math.abs(decimalPart - 0.75) < 1e-9;

  const evaluate = (legStake, sideHandicap) => {
    const adjusted = (sideScore + sideHandicap) - oppScore;
    let outcome = 'LOSE';
    if (adjusted > 0) outcome = 'WIN';
    else if (adjusted === 0) outcome = 'PUSH';
    if (outcome === 'WIN') return { credit: Math.floor(legStake * odds), outcome: 'WIN' };
    if (outcome === 'PUSH') return { credit: legStake, outcome: 'PUSH' };
    return { credit: 0, outcome: 'LOSE' };
  };

  if (!isQuarter) {
    const leg = evaluate(stake, signedHandicap);
    const status = leg.outcome === 'WIN' ? 'won' : (leg.outcome === 'PUSH' ? 'refund' : 'lost');
    return { status, payout: leg.credit };
  }

  const [stakeA, stakeB] = splitStakeInteger(stake);
  const direction = signedHandicap >= 0 ? 1 : -1;
  const legA = evaluate(stakeA, signedHandicap - 0.25 * direction);
  const legB = evaluate(stakeB, signedHandicap + 0.25 * direction);
  const payout = legA.credit + legB.credit;
  const outcomes = [legA.outcome, legB.outcome].sort().join('_');

  let status = 'lost';
  if (outcomes === 'WIN_WIN') status = 'won';
  else if (outcomes === 'LOSE_LOSE') status = 'lost';
  else if (outcomes === 'PUSH_PUSH') status = 'refund';
  else if (outcomes.includes('WIN') && outcomes.includes('PUSH')) status = 'half_won';
  else if (outcomes.includes('LOSE') && outcomes.includes('PUSH')) status = 'half_lost';

  return { status, payout };
}

function calculateBetSettlement(match, bet) {
  const market = String(bet.market || '1X2');
  if (market === 'HANDICAP') {
    if (!Number.isInteger(match.home_score) || !Number.isInteger(match.away_score) || typeof bet.handicap_line !== 'number') {
      return null;
    }
    return settleAsianHandicapBet({
      homeScore: match.home_score,
      awayScore: match.away_score,
      line: bet.handicap_line,
      pick: bet.pick,
      stake: bet.stake,
      odds: bet.odds
    });
  }

  if (bet.pick === match.result) {
    return { status: 'won', payout: Math.floor(bet.stake * bet.odds) };
  }
  return { status: 'lost', payout: 0 };
}

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    full_name: user.full_name || '',
    points: user.points,
    is_admin: Boolean(user.is_admin),
    can_manage_odds: Boolean(user.can_manage_odds),
    can_set_result: Boolean(user.can_set_result),
    created_at: user.created_at
  };
}

function canBypassMaintenance(user) {
  return Boolean(user && (user.is_admin || user.can_manage_odds || user.can_set_result));
}

function getMaintenanceState(user = null) {
  const cfg = db.maintenance || {};
  const enabled = Boolean(cfg.enabled);
  const message = String(cfg.message || '').trim();
  return {
    enabled,
    message,
    can_access: !enabled || canBypassMaintenance(user)
  };
}

function currentUser(req) {
  applyDailyBonusToAllUsers();
  const user = getSessionUserRecord(req);
  return user ? sanitizeUser(user) : null;
}

app.use('/api', (req, res, next) => {
  if (req.path === '/health' || req.path === '/me' || req.path === '/login' || req.path === '/logout') {
    return next();
  }
  const maintenance = getMaintenanceState(getSessionUserRecord(req));
  if (maintenance.enabled && !maintenance.can_access) {
    return res.status(503).json({
      error: 'Maintenance mode',
      message: maintenance.message || 'Trang đang bảo trì. Vui lòng quay lại sau.',
      maintenance
    });
  }
  next();
});

app.post('/api/register', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  const fullName = String(req.body.fullName || '').trim();

  if (db.users.length >= MAX_PLAYERS) {
    return res.status(400).json({ error: `Player limit reached (${MAX_PLAYERS}).` });
  }

  if (username.length < 3 || username.length > 24) {
    return res.status(400).json({ error: 'Username must be 3-24 characters.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  if (fullName.length < 2 || fullName.length > 80) {
    return res.status(400).json({ error: 'Full name must be 2-80 characters.' });
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
    full_name: fullName,
    points: STARTING_POINTS,
    is_admin: false,
    can_manage_odds: false,
    can_set_result: false,
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

  const user = db.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid credentials.' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials.' });

  const maintenance = getMaintenanceState(user);
  if (maintenance.enabled && !maintenance.can_access) {
    return res.status(503).json({
      error: 'Maintenance mode',
      message: maintenance.message || 'Trang đang bảo trì. Chỉ admin/operator mới có thể đăng nhập lúc này.',
      maintenance
    });
  }

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
  const userRecord = getSessionUserRecord(req);
  const maintenance = getMaintenanceState(userRecord);
  res.json({
    user: maintenance.enabled && !maintenance.can_access ? null : currentUser(req),
    maintenance
  });
});

app.get('/api/matches', (req, res) => {
  const matches = [...db.matches].sort((a, b) => new Date(a.kickoff_at) - new Date(b.kickoff_at));
  res.json({ matches });
});

app.get('/api/leaderboard', (req, res) => {
  applyDailyBonusToAllUsers();
  const leaderboard = db.users
    .map((u) => {
      const pointsOnBet = db.bets
        .filter((b) => b.user_id === u.id && b.status === 'open')
        .reduce((sum, b) => sum + b.stake, 0);
      const pointsAvailable = u.points;
      const pointsTotal = pointsAvailable + pointsOnBet;
      return {
        username: u.username,
        full_name: u.full_name || '',
        points_available: pointsAvailable,
        points_on_bet: pointsOnBet,
        points_total: pointsTotal
      };
    })
    .sort((a, b) => (b.points_total - a.points_total) || (b.points_available - a.points_available) || a.username.localeCompare(b.username));

  res.json({ leaderboard });
});

app.get('/api/specials', requireAuth, (req, res) => {
  const locked = isSpecialPredictionLocked();
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
  res.json({
    markets: db.specialMarkets,
    picks,
    locked,
    deadline_iso: db.specialPredictionConfig.deadline_iso,
    deadline_text: formatSpecialPredictionDeadlineText(db.specialPredictionConfig.deadline_iso)
  });
});

app.post('/api/specials/picks', requireAuth, (req, res) => {
  const marketKey = String(req.body.marketKey || '').trim();
  const prediction = String(req.body.prediction || '').trim();
  if (!marketKey || !prediction) return res.status(400).json({ error: 'Missing market or prediction.' });
  if (isSpecialPredictionLocked()) {
    return res.status(400).json({ error: 'Đã hết hạn dự đoán vui (sau 23:59 ngày 14/06/2026 GMT+7).' });
  }

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

app.post('/api/profile/full-name', requireAuth, (req, res) => {
  const fullName = String(req.body.fullName || '').trim();
  if (fullName.length < 2 || fullName.length > 80) {
    return res.status(400).json({ error: 'Họ và tên phải từ 2 đến 80 ký tự.' });
  }
  const user = db.users.find((u) => u.id === req.session.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (user.full_name && user.full_name.trim()) {
    return res.status(400).json({ error: 'Họ và tên đã được khóa, không thể sửa.' });
  }
  user.full_name = fullName;
  saveDb();
  res.json({ ok: true, user: sanitizeUser(user) });
});

app.get('/api/admin/users', requireAdmin, (req, res) => {
  const users = db.users
    .map((u) => ({
      id: u.id,
      username: u.username,
      full_name: u.full_name || '',
      points: u.points,
      is_admin: Boolean(u.is_admin),
      can_manage_odds: Boolean(u.can_manage_odds),
      can_set_result: Boolean(u.can_set_result)
    }))
    .sort((a, b) => a.username.localeCompare(b.username));
  res.json({ users });
});

app.post('/api/admin/users/:id/permissions', requireAdmin, (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId)) return res.status(400).json({ error: 'Invalid user id.' });
  const user = db.users.find((u) => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (user.is_admin) return res.status(400).json({ error: 'Admin always has full permissions.' });

  user.can_manage_odds = Boolean(req.body.canManageOdds);
  user.can_set_result = Boolean(req.body.canSetResult);
  saveDb();
  res.json({ ok: true, user: sanitizeUser(user) });
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

app.post('/api/admin/users/reset-points', requireAdmin, (req, res) => {
  for (const user of db.users) {
    user.points = STARTING_POINTS;
  }
  saveDb();
  res.json({ ok: true, affectedUsers: db.users.length, points: STARTING_POINTS });
});

app.get('/api/admin/maintenance', requireAdmin, (req, res) => {
  const maintenance = getMaintenanceState(getSessionUserRecord(req));
  res.json({ maintenance });
});

app.post('/api/admin/maintenance', requireAdmin, (req, res) => {
  db.maintenance.enabled = Boolean(req.body.enabled);
  db.maintenance.message = String(req.body.message || '').trim().slice(0, 500);
  saveDb();
  res.json({ ok: true, maintenance: getMaintenanceState(getSessionUserRecord(req)) });
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
  const locked = isSpecialPredictionLocked();
  const markets = db.specialMarkets.map((m) => ({
    ...m,
    total_picks: db.specialPicks.filter((p) => p.market_key === m.key).length
  }));
  res.json({
    markets,
    locked,
    deadline_iso: db.specialPredictionConfig.deadline_iso,
    deadline_text: formatSpecialPredictionDeadlineText(db.specialPredictionConfig.deadline_iso),
    manually_locked: Boolean(db.specialPredictionConfig.manually_locked)
  });
});

app.post('/api/admin/specials/config', requireAdmin, (req, res) => {
  const deadlineIso = String(req.body.deadlineIso || '').trim();
  const manuallyLocked = Boolean(req.body.manuallyLocked);
  const parsed = new Date(deadlineIso);
  if (Number.isNaN(parsed.getTime())) {
    return res.status(400).json({ error: 'Deadline không hợp lệ.' });
  }

  db.specialPredictionConfig.deadline_iso = parsed.toISOString();
  db.specialPredictionConfig.manually_locked = manuallyLocked;
  saveDb();
  res.json({
    ok: true,
    deadline_iso: db.specialPredictionConfig.deadline_iso,
    deadline_text: formatSpecialPredictionDeadlineText(db.specialPredictionConfig.deadline_iso),
    manually_locked: db.specialPredictionConfig.manually_locked
  });
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
        market: b.market || '1X2',
        handicap_line: b.handicap_line ?? '',
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
    'market',
    'handicap_line',
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

app.get('/api/admin/matches/:id/export-settlement', requirePermission('can_set_result'), (req, res) => {
  const matchId = Number(req.params.id);
  if (!Number.isInteger(matchId)) return res.status(400).json({ error: 'Invalid match id.' });

  const match = db.matches.find((m) => m.id === matchId);
  if (!match) return res.status(404).json({ error: 'Match not found.' });
  if (!match.result) return res.status(400).json({ error: 'Match chưa chốt kết quả.' });

  const bets = db.bets.filter((b) => b.match_id === matchId);
  const rows = bets.map((b) => {
    const user = db.users.find((u) => u.id === b.user_id);
    const payout = Number.isInteger(b.payout) ? b.payout : 0;
    const netDelta = payout - b.stake;
    return {
      user_id: b.user_id,
      username: user?.username || '',
      full_name: user?.full_name || '',
      market: b.market || '1X2',
      pick: b.pick,
      handicap_line: b.handicap_line ?? '',
      stake: b.stake,
      odds: b.odds,
      status: b.status || '',
      payout,
      net_delta: netDelta
    };
  });

  const header = [
    'match_id',
    'team_a',
    'team_b',
    'kickoff_at',
    'result',
    'home_score',
    'away_score',
    'user_id',
    'username',
    'full_name',
    'market',
    'pick',
    'handicap_line',
    'stake',
    'odds',
    'status',
    'payout',
    'net_delta'
  ];

  const escapeCsv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csvRows = rows.map((r) => {
    const record = {
      match_id: match.id,
      team_a: match.team_a,
      team_b: match.team_b,
      kickoff_at: match.kickoff_at,
      result: match.result,
      home_score: match.home_score ?? '',
      away_score: match.away_score ?? '',
      ...r
    };
    return header.map((k) => escapeCsv(record[k])).join(',');
  });

  const csv = [header.join(','), ...csvRows].join('\n');
  const safeA = String(match.team_a || 'A').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeB = String(match.team_b || 'B').replace(/[^a-zA-Z0-9_-]/g, '_');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=\"match_${match.id}_${safeA}_vs_${safeB}_settlement.csv\"`);
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
  const market = String(req.body.market || '1X2').toUpperCase();

  if (!Number.isInteger(matchId) || !['1X2', 'HANDICAP'].includes(market)) {
    return res.status(400).json({ error: 'Invalid bet payload.' });
  }
  if ((market === '1X2' && !['HOME', 'DRAW', 'AWAY'].includes(pick)) || (market === 'HANDICAP' && !['HOME', 'AWAY'].includes(pick))) {
    return res.status(400).json({ error: 'Invalid bet payload.' });
  }
  if (!Number.isInteger(stake) || stake <= 0) {
    return res.status(400).json({ error: 'Stake must be a positive integer.' });
  }

  const match = db.matches.find((m) => m.id === matchId);
  if (!match) return res.status(404).json({ error: 'Match not found.' });
  if (market !== String(match.bet_mode || '1X2')) {
    return res.status(400).json({ error: 'Trận này chỉ cho phép một thể thức cược đã cấu hình.' });
  }
  if (match.result) return res.status(400).json({ error: 'Betting closed for this match.' });
  if (Date.now() >= new Date(match.kickoff_at).getTime()) {
    return res.status(400).json({ error: 'Betting closed (kickoff passed).' });
  }

  const existed = db.bets.some((b) => b.user_id === req.session.user.id && b.match_id === matchId);
  if (existed) return res.status(409).json({ error: 'You already bet on this match.' });

  const user = db.users.find((u) => u.id === req.session.user.id);
  if (!user || user.points < stake) return res.status(400).json({ error: 'Not enough points.' });

  let odds = match.odds_draw;
  let handicapLine = null;
  if (market === '1X2') {
    if (pick === 'HOME') odds = match.odds_home;
    if (pick === 'AWAY') odds = match.odds_away;
  } else {
    if (typeof match.handicap_line !== 'number' || typeof match.odds_handicap_home !== 'number' || typeof match.odds_handicap_away !== 'number') {
      return res.status(400).json({ error: 'Trận này chưa cấu hình kèo chấp.' });
    }
    handicapLine = match.handicap_line;
    odds = pick === 'HOME' ? match.odds_handicap_home : match.odds_handicap_away;
  }

  user.points -= stake;
  db.bets.push({
    id: db.nextBetId++,
    user_id: user.id,
    match_id: matchId,
    market,
    pick,
    stake,
    odds,
    handicap_line: handicapLine,
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

app.get('/api/admin/matches', requirePermission('can_manage_odds'), (req, res) => {
  const matches = [...db.matches].sort((a, b) => new Date(a.kickoff_at) - new Date(b.kickoff_at));
  res.json({ matches });
});

app.post('/api/admin/matches', requirePermission('can_manage_odds'), (req, res) => {
  const teamA = String(req.body.teamA || '').trim();
  const teamB = String(req.body.teamB || '').trim();
  const kickoffAt = String(req.body.kickoffAt || '').trim();
  const oddsHome = Number(req.body.oddsHome);
  const oddsDraw = Number(req.body.oddsDraw);
  const oddsAway = Number(req.body.oddsAway);
  const betMode = String(req.body.betMode || '1X2').toUpperCase();
  const handicapLineRaw = req.body.handicapLine;
  const handicapLine = handicapLineRaw === undefined || handicapLineRaw === null || handicapLineRaw === '' ? null : Number(handicapLineRaw);
  const oddsHandicapHomeRaw = req.body.oddsHandicapHome;
  const oddsHandicapAwayRaw = req.body.oddsHandicapAway;
  const oddsHandicapHome = oddsHandicapHomeRaw === undefined || oddsHandicapHomeRaw === null || oddsHandicapHomeRaw === '' ? null : Number(oddsHandicapHomeRaw);
  const oddsHandicapAway = oddsHandicapAwayRaw === undefined || oddsHandicapAwayRaw === null || oddsHandicapAwayRaw === '' ? null : Number(oddsHandicapAwayRaw);

  if (!teamA || !teamB || !kickoffAt) return res.status(400).json({ error: 'Missing team or kickoff.' });
  if (!['1X2', 'HANDICAP'].includes(betMode)) {
    return res.status(400).json({ error: 'Invalid bet mode.' });
  }
  if (betMode === '1X2' && [oddsHome, oddsDraw, oddsAway].some((x) => Number.isNaN(x) || x <= 1)) {
    return res.status(400).json({ error: 'Invalid 1X2 odds.' });
  }
  if (betMode === 'HANDICAP') {
    if (handicapLine === null || Number.isNaN(handicapLine) || handicapLine < 0) return res.status(400).json({ error: 'Invalid handicap line.' });
    if (oddsHandicapHome === null || oddsHandicapAway === null) return res.status(400).json({ error: 'Missing handicap odds.' });
    if ([oddsHandicapHome, oddsHandicapAway].some((x) => Number.isNaN(x) || x <= 1)) {
      return res.status(400).json({ error: 'Invalid handicap odds.' });
    }
  }

  const parsed = new Date(kickoffAt);
  if (Number.isNaN(parsed.getTime())) return res.status(400).json({ error: 'Invalid kickoff time.' });

  db.matches.push({
    id: db.nextMatchId++,
    team_a: teamA,
    team_b: teamB,
    kickoff_at: parsed.toISOString(),
    bet_mode: betMode,
    odds_home: oddsHome,
    odds_draw: oddsDraw,
    odds_away: oddsAway,
    handicap_line: betMode === 'HANDICAP' ? handicapLine : null,
    odds_handicap_home: betMode === 'HANDICAP' ? oddsHandicapHome : null,
    odds_handicap_away: betMode === 'HANDICAP' ? oddsHandicapAway : null,
    home_score: null,
    away_score: null,
    result: null,
    created_at: new Date().toISOString()
  });
  saveDb();
  res.json({ ok: true });
});

app.put('/api/admin/matches/:id', requirePermission('can_manage_odds'), (req, res) => {
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
  if (req.body.handicapLine !== undefined) {
    if (req.body.handicapLine === null || req.body.handicapLine === '') {
      match.handicap_line = null;
      match.odds_handicap_home = null;
      match.odds_handicap_away = null;
    } else {
      const v = Number(req.body.handicapLine);
      if (Number.isNaN(v) || v < 0) return res.status(400).json({ error: 'Invalid handicapLine.' });
      match.handicap_line = v;
    }
  }
  if (req.body.oddsHandicapHome !== undefined) {
    if (req.body.oddsHandicapHome === null || req.body.oddsHandicapHome === '') {
      match.odds_handicap_home = null;
    } else {
      const v = Number(req.body.oddsHandicapHome);
      if (Number.isNaN(v) || v <= 1) return res.status(400).json({ error: 'Invalid oddsHandicapHome.' });
      match.odds_handicap_home = v;
    }
  }
  if (req.body.oddsHandicapAway !== undefined) {
    if (req.body.oddsHandicapAway === null || req.body.oddsHandicapAway === '') {
      match.odds_handicap_away = null;
    } else {
      const v = Number(req.body.oddsHandicapAway);
      if (Number.isNaN(v) || v <= 1) return res.status(400).json({ error: 'Invalid oddsHandicapAway.' });
      match.odds_handicap_away = v;
    }
  }
  if (match.handicap_line !== null && (typeof match.odds_handicap_home !== 'number' || typeof match.odds_handicap_away !== 'number')) {
    return res.status(400).json({ error: 'Handicap line requires both handicap odds.' });
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

app.post('/api/admin/settle', requirePermission('can_set_result'), (req, res) => {

  const matchId = Number(req.body.matchId);
  const resultRaw = String(req.body.result || '');
  const homeScore = req.body.homeScore === undefined || req.body.homeScore === null || req.body.homeScore === ''
    ? null
    : Number(req.body.homeScore);
  const awayScore = req.body.awayScore === undefined || req.body.awayScore === null || req.body.awayScore === ''
    ? null
    : Number(req.body.awayScore);
  const resultFromScore = resolveResultFromScore(homeScore, awayScore);
  const result = ['HOME', 'DRAW', 'AWAY'].includes(resultRaw) ? resultRaw : resultFromScore;

  if (!Number.isInteger(matchId) || !['HOME', 'DRAW', 'AWAY'].includes(result)) {
    return res.status(400).json({ error: 'Invalid payload.' });
  }
  if (homeScore !== null && (!Number.isInteger(homeScore) || homeScore < 0)) {
    return res.status(400).json({ error: 'Invalid homeScore.' });
  }
  if (awayScore !== null && (!Number.isInteger(awayScore) || awayScore < 0)) {
    return res.status(400).json({ error: 'Invalid awayScore.' });
  }

  const match = db.matches.find((m) => m.id === matchId);
  if (!match) return res.status(404).json({ error: 'Match not found.' });
  if (match.result) return res.status(400).json({ error: 'Match already settled.' });

  match.result = result;
  if (homeScore !== null && awayScore !== null) {
    match.home_score = homeScore;
    match.away_score = awayScore;
  }

  const matchBets = db.bets.filter((b) => b.match_id === matchId);
  for (const bet of matchBets) {
    const settled = calculateBetSettlement(match, bet);
    if (!settled) return res.status(400).json({ error: 'Cần nhập tỷ số để chốt kèo chấp.' });
    const user = db.users.find((u) => u.id === bet.user_id);
    if (user && settled.payout > 0) user.points += settled.payout;
    bet.status = settled.status;
    bet.payout = settled.payout;
  }

  saveDb();
  res.json({ ok: true, settledBets: matchBets.length });
});

app.post('/api/admin/recalculate-match/:id', requireAdmin, (req, res) => {
  const matchId = Number(req.params.id);
  if (!Number.isInteger(matchId)) return res.status(400).json({ error: 'Invalid match id.' });

  const match = db.matches.find((m) => m.id === matchId);
  if (!match) return res.status(404).json({ error: 'Match not found.' });
  if (!match.result) return res.status(400).json({ error: 'Match chưa chốt kết quả.' });

  const bets = db.bets.filter((b) => b.match_id === matchId);
  let adjustedUsers = 0;
  let totalDelta = 0;

  for (const bet of bets) {
    const settled = calculateBetSettlement(match, bet);
    if (!settled) {
      return res.status(400).json({ error: 'Kèo chấp cần tỷ số đầy đủ để tính lại.' });
    }
    const oldPayout = Number.isInteger(bet.payout) ? bet.payout : 0;
    const delta = settled.payout - oldPayout;
    const user = db.users.find((u) => u.id === bet.user_id);
    if (!user) continue;
    user.points += delta;
    bet.payout = settled.payout;
    bet.status = settled.status;
    adjustedUsers += 1;
    totalDelta += delta;
  }

  saveDb();
  res.json({ ok: true, matchId, adjustedBets: bets.length, adjustedUsers, totalDelta });
});

app.put('/api/admin/matches/:id/odds', requirePermission('can_manage_odds'), (req, res) => {
  const matchId = Number(req.params.id);
  if (!Number.isInteger(matchId)) return res.status(400).json({ error: 'Invalid match id.' });
  const match = db.matches.find((m) => m.id === matchId);
  if (!match) return res.status(404).json({ error: 'Match not found.' });
  if (match.result) return res.status(400).json({ error: 'Cannot edit odds of settled match.' });

  const oddsHome = Number(req.body.oddsHome);
  const oddsDraw = Number(req.body.oddsDraw);
  const oddsAway = Number(req.body.oddsAway);
  const betMode = String(req.body.betMode || match.bet_mode || '1X2').toUpperCase();
  if (!['1X2', 'HANDICAP'].includes(betMode)) return res.status(400).json({ error: 'Invalid bet mode.' });

  if (betMode === '1X2') {
    if ([oddsHome, oddsDraw, oddsAway].some((x) => Number.isNaN(x) || x <= 1)) {
      return res.status(400).json({ error: 'Invalid 1X2 odds.' });
    }
    match.bet_mode = '1X2';
    match.odds_home = oddsHome;
    match.odds_draw = oddsDraw;
    match.odds_away = oddsAway;
    match.handicap_line = null;
    match.odds_handicap_home = null;
    match.odds_handicap_away = null;
  } else {
    const handicapLine = req.body.handicapLine === undefined || req.body.handicapLine === null || req.body.handicapLine === ''
      ? null
      : Number(req.body.handicapLine);
    const oddsHandicapHome = Number(req.body.oddsHandicapHome);
    const oddsHandicapAway = Number(req.body.oddsHandicapAway);
    if (handicapLine === null || Number.isNaN(handicapLine) || handicapLine < 0) return res.status(400).json({ error: 'Invalid handicap line.' });
    if ([oddsHandicapHome, oddsHandicapAway].some((x) => Number.isNaN(x) || x <= 1)) {
      return res.status(400).json({ error: 'Invalid handicap odds.' });
    }
    match.bet_mode = 'HANDICAP';
    match.handicap_line = handicapLine;
    match.odds_handicap_home = oddsHandicapHome;
    match.odds_handicap_away = oddsHandicapAway;
  }
  saveDb();
  res.json({ ok: true });
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

