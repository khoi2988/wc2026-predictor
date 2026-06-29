async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (data.error === 'You already bet on this match.') {
      throw new Error('Bạn đã đặt cược trận này rồi.');
    }
    if (data.error === 'You already bet this exact score.') {
      throw new Error('Bạn đã chọn tỷ số này rồi. Hãy chọn tỷ số khác.');
    }
    if (data.error === 'You can only keep up to 3 exact score bets for this match.') {
      throw new Error('Mỗi trận chỉ được giữ tối đa 3 vé tỷ số chính xác.');
    }
    if (res.status === 401) {
      if (data.error === 'Invalid credentials.') {
        throw new Error('Sai tên đăng nhập hoặc mật khẩu.');
      }
      if (data.error === 'Unauthorized') {
        throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      }
      throw new Error(data.error || 'Yêu cầu đăng nhập lại.');
    }
    if (res.status === 403) {
      if (data.error === 'Account disabled.') {
        throw new Error('Tài khoản này đã bị vô hiệu hóa.');
      }
      if (data.error === 'Forbidden') {
        throw new Error('Bạn không có quyền thao tác chức năng này.');
      }
      throw new Error(data.error || 'Bạn không có quyền thao tác chức năng này.');
    }
    if (res.status === 503 && data.error === 'Maintenance mode') {
      throw new Error(data.message || 'Trang đang bảo trì. Vui lòng quay lại sau.');
    }
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

const els = {
  auth: document.getElementById('auth'),
  loginForm: document.getElementById('loginForm'),
  registerForm: document.getElementById('registerForm'),
  maintenanceCard: document.getElementById('maintenanceCard'),
  maintenanceText: document.getElementById('maintenanceText'),
  maintenanceHint: document.getElementById('maintenanceHint'),
  main: document.getElementById('main'),
  me: document.getElementById('me'),
  msg: document.getElementById('msg'),
  openMatches: document.getElementById('openMatches'),
  scoreMatches: document.getElementById('scoreMatches'),
  closedMatches: document.getElementById('closedMatches'),
  leaderboard: document.getElementById('leaderboard'),
  myBets: document.getElementById('myBets'),
  specialMarkets: document.getElementById('specialMarkets'),
  mySpecialPicks: document.getElementById('mySpecialPicks'),
  health: document.getElementById('health'),
  adminMatchesActive: document.getElementById('adminMatchesActive'),
  adminMatchesHistory: document.getElementById('adminMatchesHistory'),
  adminPanel: document.getElementById('adminPanel'),
  adminOnlyDailyBonus: document.getElementById('adminOnlyDailyBonus'),
  maintenanceConfigBlock: document.getElementById('maintenanceConfigBlock'),
  adminUserExportBlock: document.getElementById('adminUserExportBlock'),
  adminOnlyExtra: document.getElementById('adminOnlyExtra'),
  matchCreateRow: document.getElementById('matchCreateRow'),
  adminUsers: document.getElementById('adminUsers'),
  adminSpecials: document.getElementById('adminSpecials'),
  adminSpecialsStatus: document.getElementById('adminSpecialsStatus'),
  dailyBonusInfo: document.getElementById('dailyBonusInfo'),
  maintenanceInfo: document.getElementById('maintenanceInfo'),
  currentUserLabel: document.getElementById('currentUserLabel'),
  changePasswordForm: document.getElementById('changePasswordForm'),
  fullNameLockCard: document.getElementById('fullNameLockCard'),
  betConfirmModal: document.getElementById('betConfirmModal'),
  betConfirmContent: document.getElementById('betConfirmContent'),
  adminConfirmModal: document.getElementById('adminConfirmModal'),
  adminConfirmContent: document.getElementById('adminConfirmContent'),
  adminMatchesOpenTab: document.getElementById('btnAdminMatchesOpenTab'),
  adminMatchesHistoryTab: document.getElementById('btnAdminMatchesHistoryTab'),
  tabButtons: Array.from(document.querySelectorAll('.tab-btn')),
  tabPanels: Array.from(document.querySelectorAll('.tab-panel'))
};
let currentUser = null;
let pendingBetPayload = null;
let pendingAdminAction = null;
let activeTabId = 'openMatchesTab';
let activeAdminMatchesTab = 'open';
let maintenanceState = { enabled: false, can_access: true, message: '' };
let selectedOpenMatchDay = 'ALL';
let selectedScoreMatchDay = 'ALL';
let selectedClosedMatchDay = 'ALL';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function tr(key, params = {}, fallback = '') {
  const api = window.__i18n;
  if (api && typeof api.t === 'function') {
    return api.t(key, params, fallback || key);
  }
  return fallback || key;
}

function currentLocale() {
  const api = window.__i18n;
  if (api && typeof api.locale === 'function') return api.locale();
  return 'vi-VN';
}

function setVisible(el, visible) {
  if (!el) return;
  el.classList.toggle('hidden', !visible);
}

function switchTab(tabId) {
  activeTabId = tabId;
  for (const button of els.tabButtons) {
    button.classList.toggle('active', button.dataset.tab === tabId);
  }
  for (const panel of els.tabPanels) {
    const isActive = panel.id === tabId;
    panel.classList.toggle('active', isActive);
    panel.classList.toggle('hidden', !isActive);
  }
}

function switchAdminMatchesTab(tabId) {
  activeAdminMatchesTab = tabId;
  const isOpen = tabId === 'open';
  if (els.adminMatchesOpenTab) {
    els.adminMatchesOpenTab.classList.toggle('active', isOpen);
  }
  if (els.adminMatchesHistoryTab) {
    els.adminMatchesHistoryTab.classList.toggle('active', !isOpen);
  }
  if (els.adminMatchesActive) {
    els.adminMatchesActive.classList.toggle('hidden', !isOpen);
  }
  if (els.adminMatchesHistory) {
    els.adminMatchesHistory.classList.toggle('hidden', isOpen);
  }
}

function syncNewMatchModeUI() {
  const modeEl = document.getElementById('newBetMode');
  if (!modeEl) return;
  const mode = modeEl.value;
  const is1x2 = mode === '1X2';
  const isHandicap = mode === 'HANDICAP';
  const isScore = mode === 'SCORE';
  setVisible(document.getElementById('newOddsHome'), is1x2);
  setVisible(document.getElementById('newOddsDraw'), is1x2);
  setVisible(document.getElementById('newOddsAway'), is1x2);
  setVisible(document.getElementById('newHandicapLine'), isHandicap);
  setVisible(document.getElementById('newOddsHandicapHome'), isHandicap);
  setVisible(document.getElementById('newOddsHandicapAway'), isHandicap);
  setVisible(document.getElementById('newScoreOdds'), isScore);
  setVisible(document.getElementById('newScoreTools'), isScore);
}

function syncRowModeUI(matchId) {
  const modeEl = document.getElementById(`mode-${matchId}`);
  if (!modeEl) return;
  const is1x2 = modeEl.value === '1X2';
  const isHandicap = modeEl.value === 'HANDICAP';
  const ids1x2 = [`odds-home-${matchId}`, `odds-draw-${matchId}`, `odds-away-${matchId}`];
  const idsHcp = [`hcp-line-${matchId}`, `hcp-home-${matchId}`, `hcp-away-${matchId}`];
  const idsScore = [`score-odds-${matchId}`];
  for (const id of ids1x2) {
    const el = document.getElementById(id);
    if (el) el.disabled = !is1x2;
  }
  for (const id of idsHcp) {
    const el = document.getElementById(id);
    if (el) el.disabled = !isHandicap;
  }
  for (const id of idsScore) {
    const el = document.getElementById(id);
    if (el) el.disabled = modeEl.value !== 'SCORE';
  }
}

function setMessage(text, cls = '') {
  els.msg.className = `small ${cls}`;
  els.msg.textContent = text;
}

function showLoginForm() {
  els.loginForm.classList.remove('hidden');
  els.registerForm.classList.add('hidden');
}

function showRegisterForm() {
  els.loginForm.classList.add('hidden');
  els.registerForm.classList.remove('hidden');
}

function syncMaintenanceUI() {
  const isBlocked = Boolean(maintenanceState.enabled && !maintenanceState.can_access);
  const isMaintenanceEnabled = Boolean(maintenanceState.enabled);
  setVisible(els.maintenanceCard, isBlocked);

  if (els.maintenanceText) {
    els.maintenanceText.textContent = maintenanceState.message || 'Hệ thống đang tạm bảo trì. Vui lòng quay lại sau.';
  }
  if (els.maintenanceHint) {
    els.maintenanceHint.textContent = '';
  }

  const showRegisterLink = document.getElementById('showRegister');
  const loginHint = document.getElementById('loginHint');
  if (showRegisterLink) {
    showRegisterLink.classList.toggle('hidden', isMaintenanceEnabled);
  }
  if (loginHint) {
    loginHint.textContent = isMaintenanceEnabled
      ? 'Đăng ký tạm thời bị tắt khi bảo trì.'
      : 'Chưa có tài khoản?';
  }
  if (isMaintenanceEnabled && !els.registerForm.classList.contains('hidden')) {
    showLoginForm();
  }
}

function fmtTime(iso) {
  return new Date(iso).toLocaleString(currentLocale());
}

function matchDayKey(iso) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function matchDayLabel(dayKey) {
  const [y, m, d] = String(dayKey).split('-');
  return `${d}/${m}`;
}

function renderMatchDayTabs(matches, selectedDay, clickHandlerName) {
  const days = [...new Set(matches.map((m) => matchDayKey(m.kickoff_at)))];
  if (!days.length) return '';
  const buttons = [
    `<button type="button" class="subtab-btn ${selectedDay === 'ALL' ? 'active' : ''}" onclick="${clickHandlerName}('ALL')">Tất cả</button>`,
    ...days.map((day) => `<button type="button" class="subtab-btn ${selectedDay === day ? 'active' : ''}" onclick="${clickHandlerName}('${day}')">${matchDayLabel(day)}</button>`)
  ];
  return `<div class="subtab-bar match-day-tabs">${buttons.join('')}</div>`;
}

function filterMatchesByDay(matches, selectedDay) {
  if (selectedDay === 'ALL') return matches;
  return matches.filter((m) => matchDayKey(m.kickoff_at) === selectedDay);
}

function scoreOddsSummary(scoreOdds) {
  const entries = Object.entries(scoreOdds || {});
  if (!entries.length) return '-';
  return entries
    .slice(0, 6)
    .map(([score, odds]) => `${score}=${odds}`)
    .join(', ') + (entries.length > 6 ? '...' : '');
}

function formatScoreOddsInput(scoreOdds) {
  return Object.entries(scoreOdds || {})
    .map(([score, odds]) => `${score}=${odds}`)
    .join(', ');
}

function normalizeOcrScoreToken(token) {
  const normalized = String(token || '')
    .replace(/[OoD]/g, '0')
    .replace(/[Il|]/g, '1')
    .replace(/[–—−:]/g, '-')
    .replace(/\s+/g, '');
  const match = normalized.match(/^(\d{1,2})-(\d{1,2})$/);
  if (!match) return '';
  return `${Number(match[1])}-${Number(match[2])}`;
}

function extractScoreOddsPairsFromOcr(rawText) {
  const raw = String(rawText || '');
  if (!raw.trim()) return [];

  const lines = raw
    .replace(/[|]/g, ' ')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const pairs = [];
  const seen = new Set();
  const scorePattern = /([0-9OIlD]{1,2}\s*[-:]\s*[0-9OIlD]{1,2})/g;

  const pushPair = (score, oddsText) => {
    const normalizedScore = normalizeOcrScoreToken(score);
    const odds = Number(String(oddsText || '').replace(/,/g, '.'));
    if (!normalizedScore || Number.isNaN(odds) || odds <= 1) return;
    if (seen.has(normalizedScore)) return;
    seen.add(normalizedScore);
    pairs.push({ score: normalizedScore, odds: String(odds) });
  };

  for (const line of lines) {
    const scoreMatches = [...line.matchAll(scorePattern)].map((match) => match[0]);
    if (!scoreMatches.length) continue;

    let strippedLine = line;
    for (const scoreText of scoreMatches) {
      strippedLine = strippedLine.replace(scoreText, ' ');
    }

    const oddsMatches = [...strippedLine.matchAll(/\d+(?:[.,]\d+)?/g)]
      .map((match) => match[0])
      .filter((token) => Number(String(token).replace(/,/g, '.')) > 1);

    if (scoreMatches.length === oddsMatches.length) {
      scoreMatches.forEach((score, index) => pushPair(score, oddsMatches[index]));
    }
  }

  if (pairs.length) return pairs;

  const normalized = raw
    .replace(/[–—−]/g, '-')
    .replace(/[:]/g, '-')
    .replace(/[|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const tokens = normalized.split(' ').filter(Boolean);
  const scoreTokens = [];
  const oddTokens = [];

  for (const token of tokens) {
    const normalizedScore = normalizeOcrScoreToken(token);
    if (normalizedScore) {
      scoreTokens.push(normalizedScore);
      continue;
    }
    const oddMatch = token.match(/^(\d+(?:[.,]\d+)?)$/);
    if (oddMatch) {
      const odds = Number(oddMatch[1].replace(/,/g, '.'));
      if (!Number.isNaN(odds) && odds > 1) {
        oddTokens.push(String(odds));
      }
    }
  }

  const count = Math.min(scoreTokens.length, oddTokens.length);
  for (let i = 0; i < count; i += 1) {
    pushPair(scoreTokens[i], oddTokens[i]);
  }

  return pairs;
}

function extractScoreOddsFromOcrText(rawText) {
  return extractScoreOddsPairsFromOcr(rawText)
    .map(({ score, odds }) => `${score}=${odds}`)
    .join(', ');
}

function renderScoreOddsParsedPreview(pairs) {
  const preview = document.getElementById('scoreOddsParsedPreview');
  if (!preview) return;
  if (!Array.isArray(pairs) || !pairs.length) {
    preview.innerHTML = '';
    preview.classList.add('hidden');
    return;
  }
  preview.innerHTML = `
    <strong>Preview odds nhận từ ảnh</strong>
    <table>
      <thead>
        <tr>
          <th>Tỷ số</th>
          <th>Odds</th>
        </tr>
      </thead>
      <tbody>
        ${pairs.map((item) => `<tr><td>${escapeHtml(item.score)}</td><td>${escapeHtml(item.odds)}</td></tr>`).join('')}
      </tbody>
    </table>
    <div class="small">Hãy kiểm tra nhanh lại trước khi bấm thêm trận hoặc lưu kèo.</div>
  `;
  preview.classList.remove('hidden');
}

function setScoreOddsPreview(src, processed = false) {
  const preview = document.getElementById('scoreOddsPreview');
  if (!preview) return;
  if (!src) {
    preview.src = '';
    preview.classList.add('hidden');
    preview.classList.remove('processed');
    return;
  }
  preview.src = src;
  preview.classList.remove('hidden');
  preview.classList.toggle('processed', processed);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Không đọc được file ảnh.'));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Không mở được ảnh để OCR.'));
    image.src = src;
  });
}

async function preprocessScoreOddsImage(file) {
  const dataUrl = await fileToDataUrl(file);
  const image = await loadImageElement(dataUrl);

  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = image.naturalWidth || image.width;
  sourceCanvas.height = image.naturalHeight || image.height;
  const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  sourceCtx.drawImage(image, 0, 0);

  const sourceImage = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  const { data, width, height } = sourceImage;

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const avg = (r + g + b) / 3;
      const contrast = Math.max(r, g, b) - Math.min(r, g, b);
      if (avg < 244 || contrast > 14) {
        found = true;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!found) {
    minX = 0;
    minY = 0;
    maxX = width - 1;
    maxY = height - 1;
  }

  const padding = 16;
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(width - 1, maxX + padding);
  maxY = Math.min(height - 1, maxY + padding);

  const cropWidth = Math.max(1, maxX - minX + 1);
  const cropHeight = Math.max(1, maxY - minY + 1);
  const scale = Math.max(1.8, Math.min(3, 1800 / cropWidth));

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = Math.round(cropWidth * scale);
  outputCanvas.height = Math.round(cropHeight * scale);
  const outputCtx = outputCanvas.getContext('2d', { willReadFrequently: true });
  outputCtx.imageSmoothingEnabled = true;
  outputCtx.imageSmoothingQuality = 'high';
  outputCtx.drawImage(
    sourceCanvas,
    minX,
    minY,
    cropWidth,
    cropHeight,
    0,
    0,
    outputCanvas.width,
    outputCanvas.height
  );

  const processedImage = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
  const processedData = processedImage.data;
  for (let i = 0; i < processedData.length; i += 4) {
    const gray = Math.round(processedData[i] * 0.299 + processedData[i + 1] * 0.587 + processedData[i + 2] * 0.114);
    const boosted = gray > 225 ? 255 : Math.max(0, Math.min(255, Math.round((gray - 128) * 1.55 + 128)));
    processedData[i] = boosted;
    processedData[i + 1] = boosted;
    processedData[i + 2] = boosted;
  }
  outputCtx.putImageData(processedImage, 0, 0);

  const processedDataUrl = outputCanvas.toDataURL('image/png');
  const processedBlob = await new Promise((resolve, reject) => {
    outputCanvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Không tạo được ảnh OCR sau tiền xử lý.'));
    }, 'image/png');
  });

  return {
    blob: processedBlob,
    previewUrl: processedDataUrl
  };
}

function assignFileToScoreInput(file) {
  const input = document.getElementById('scoreOddsImage');
  if (!input) return;
  try {
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
  } catch (_) {
    // Some browsers may block programmatic assignment; preview still works via direct read.
  }
}

const TEAM_CATALOG = Array.isArray(window.__TEAM_CATALOG__) ? window.__TEAM_CATALOG__ : [];

function normalizeTeamKey(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const TEAM_LOOKUP = TEAM_CATALOG.reduce((acc, team) => {
  const names = [team.canonical, ...(team.aliases || [])];
  for (const name of names) {
    acc[normalizeTeamKey(name)] = team;
  }
  return acc;
}, {});

function canonicalTeamDisplay(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return '';
  return TEAM_LOOKUP[normalizeTeamKey(trimmed)]?.canonical || trimmed;
}

function teamFlagCode(name) {
  return TEAM_LOOKUP[normalizeTeamKey(name)]?.flag || '';
}

function teamLabel(name) {
  const displayName = canonicalTeamDisplay(name);
  const flagCode = teamFlagCode(displayName);
  return `<span class="team-name">${flagCode ? `<img class="team-flag" src="/assets/flag-icons/flags/4x3/${flagCode}.svg" alt="${displayName}" loading="lazy" />` : ''}<span>${displayName}</span></span>`;
}

function matchLabel(teamA, teamB) {
  return `
    <div class="match-pair">
      <div class="team-line">${teamLabel(teamA)}</div>
      <div class="match-vs">vs</div>
      <div class="team-line">${teamLabel(teamB)}</div>
    </div>
  `;
}

function pickLabel(pick) {
  if (pick === 'HOME') return tr('pickHomeWin', {}, 'Đội nhà thắng');
  if (pick === 'DRAW') return tr('pickDraw', {}, 'Hòa');
  return tr('pickAwayWin', {}, 'Đội khách thắng');
}

function matchResultText(match) {
  if (!match?.result) return tr('resultPending', {}, 'Chưa có kết quả');
  if (match.result === 'HOME') return tr('betPickWin', { team: match.team_a }, `${match.team_a} thắng`);
  if (match.result === 'AWAY') return tr('betPickWin', { team: match.team_b }, `${match.team_b} thắng`);
  return tr('pickDraw', {}, 'Hòa');
}

function betMatchResultText(bet) {
  return matchResultText({
    result: bet.result,
    team_a: bet.team_a,
    team_b: bet.team_b
  });
}

function marketLabel(market, line) {
  if (market === 'HANDICAP') return tr('marketHandicap', { line: line ?? 0 }, `Kèo chấp (${line ?? 0})`);
  if (market === 'SCORE') return tr('marketScore', {}, 'Tỷ số chính xác');
  return tr('market1x2', {}, '1X2');
}

function betStatusText(status) {
  if (status === 'won') return tr('betStatusWon', {}, 'Thắng');
  if (status === 'lost') return tr('betStatusLost', {}, 'Thua');
  if (status === 'refund') return tr('betStatusRefund', {}, 'Hoàn tiền');
  if (status === 'half_won') return tr('betStatusHalfWon', {}, 'Thắng nửa');
  if (status === 'half_lost') return tr('betStatusHalfLost', {}, 'Thua nửa');
  return status || '-';
}

function betPickText(bet) {
  if (bet.market === 'HANDICAP') {
    if (bet.pick === 'HOME') return `${bet.team_a} -${bet.handicap_line ?? 0}`;
    if (bet.pick === 'AWAY') return `${bet.team_b} +${bet.handicap_line ?? 0}`;
  }
  if (bet.market === 'SCORE') return bet.pick;
  if (bet.pick === 'HOME') return tr('betPickWin', { team: bet.team_a }, `${bet.team_a} thắng`);
  if (bet.pick === 'DRAW') return tr('pickDraw', {}, 'Hòa');
  return tr('betPickWin', { team: bet.team_b }, `${bet.team_b} thắng`);
}

function closeBetConfirm() {
  pendingBetPayload = null;
  els.betConfirmModal.classList.add('hidden');
  els.betConfirmContent.innerHTML = '';
}

function closeAdminConfirm() {
  pendingAdminAction = null;
  els.adminConfirmModal.classList.add('hidden');
  els.adminConfirmContent.innerHTML = '';
}

function openAdminConfirm(html, action) {
  pendingAdminAction = action;
  els.adminConfirmContent.innerHTML = html;
  els.adminConfirmModal.classList.remove('hidden');
}

function openBetConfirm(payload) {
  pendingBetPayload = payload;
  els.betConfirmContent.innerHTML = `
    <p><strong>${tr('confirmMatch', {}, 'Trận')}:</strong> ${payload.teamA} vs ${payload.teamB}</p>
    <p><strong>${tr('confirmMarket', {}, 'Thể thức')}:</strong> ${marketLabel(payload.market, payload.handicapLine)}</p>
    <p><strong>${tr('confirmPick', {}, 'Lựa chọn')}:</strong> ${payload.pickText}</p>
    <p><strong>${tr('confirmOdds', {}, 'Tỷ lệ')}:</strong> ${payload.odds}</p>
    <p><strong>${tr('confirmStake', {}, 'Số điểm đặt')}:</strong> ${payload.stake}</p>
  `;
  els.betConfirmModal.classList.remove('hidden');
}

async function renderHealth() {
  try {
    const data = await api('/api/health');
    const updated = new Date(data.timestamp).toLocaleTimeString(currentLocale());
    const storage = data.storage === 'supabase'
      ? tr('storageSupabase', {}, 'Supabase Online')
      : tr('storageLocal', {}, 'Local file');
    els.health.className = 'small health-line health-ok';
    els.health.textContent = tr('healthOk', { storage, time: updated }, `Trạng thái hệ thống: OK | Lưu dữ liệu: ${storage} | Check lúc ${updated}`);
  } catch (e) {
    els.health.className = 'small health-line health-bad';
    els.health.textContent = tr('healthError', { message: e.message }, `Trạng thái hệ thống: Lỗi kiểm tra health (${e.message})`);
  }
}

async function adminApi(url, options = {}) {
  return api(url, options);
}

async function refresh() {
  const meRes = await api('/api/me');
  maintenanceState = meRes.maintenance || { enabled: false, can_access: true, message: '' };
  syncMaintenanceUI();
  const user = meRes.user;

  if (maintenanceState.enabled && !maintenanceState.can_access) {
    currentUser = null;
    els.auth.classList.remove('hidden');
    els.main.classList.add('hidden');
    els.adminPanel.classList.add('hidden');
    els.adminMatchesActive.innerHTML = '';
    els.adminMatchesHistory.innerHTML = '';
    els.adminUsers.innerHTML = '';
    els.currentUserLabel.textContent = '';
    els.fullNameLockCard.classList.add('hidden');
    els.changePasswordForm.classList.add('hidden');
    els.me.innerHTML = `<span class="badge">Bảo trì</span>`;
    await renderHealth();
    showLoginForm();
    return;
  }

  if (!user) {
    currentUser = null;
    els.auth.classList.remove('hidden');
    els.main.classList.add('hidden');
    els.adminPanel.classList.add('hidden');
    els.adminMatchesActive.innerHTML = '';
    els.adminMatchesHistory.innerHTML = '';
    els.adminUsers.innerHTML = '';
    els.currentUserLabel.textContent = '';
    els.fullNameLockCard.classList.add('hidden');
    els.changePasswordForm.classList.add('hidden');
    els.me.innerHTML = `<span class="badge">${tr('notLoggedIn', {}, 'Chưa đăng nhập')}</span>`;
    await renderHealth();
    showLoginForm();
    return;
  }

  els.auth.classList.add('hidden');
  els.main.classList.remove('hidden');
  const canOperate = user.is_admin || user.can_manage_odds || user.can_set_result || user.can_export_user_history;
  currentUser = user;
  const adminRenderTasks = [];
  if (canOperate) {
    const canManageOdds = user.is_admin || user.can_manage_odds;
    const canSetResult = user.is_admin || user.can_set_result;
    const canExportUsers = user.is_admin || user.can_export_user_history;
    els.adminPanel.classList.remove('hidden');
    els.adminOnlyDailyBonus.classList.toggle('hidden', !user.is_admin);
    els.maintenanceConfigBlock.classList.toggle('hidden', !user.is_admin);
    els.adminUserExportBlock.classList.toggle('hidden', !canExportUsers);
    els.adminOnlyExtra.classList.toggle('hidden', !user.is_admin);
    els.matchCreateRow.classList.toggle('hidden', !canManageOdds);
    document.getElementById('btnAdminLoad').classList.toggle('hidden', !(canManageOdds || canSetResult));
    document.getElementById('btnAdminLoadUsers').classList.toggle('hidden', !canExportUsers);
    if (user.is_admin) {
      adminRenderTasks.push(renderDailyBonusConfig(), renderMaintenanceConfig(), renderAdminSpecials());
    }
  } else {
    els.adminPanel.classList.add('hidden');
  }
  const displayName = user.full_name && user.full_name.trim() ? user.full_name : user.username;
  els.currentUserLabel.textContent = `${tr('accountLabel', {}, 'Tài khoản')}: ${user.username} | ${tr('fullNameLabel', {}, 'Họ tên')}: ${displayName}`;
  els.me.innerHTML = `<span class="badge">${displayName}</span> <span class="badge">${user.points} ${tr('pointsLabel', {}, 'điểm')}</span>`;
  if (!user.full_name || !user.full_name.trim()) {
    els.fullNameLockCard.classList.remove('hidden');
  } else {
    els.fullNameLockCard.classList.add('hidden');
  }

  await Promise.all([renderMatches(), renderLeaderboard(), renderMyBets(), renderSpecials(), renderHealth(), ...adminRenderTasks]);
}
window.refresh = refresh;

async function renderDailyBonusConfig() {
  try {
    const data = await adminApi('/api/admin/daily-bonus');
    document.getElementById('dailyBonusEnabled').checked = Boolean(data.config?.enabled);
    document.getElementById('dailyBonusStartDate').value = data.config?.start_date || '';
    document.getElementById('dailyBonusPoints').value = data.config?.points_per_day || '';
    els.dailyBonusInfo.textContent = `Đã cộng lũy kế: ${data.targetDays || 0} ngày.`;
  } catch (e) {
    els.dailyBonusInfo.textContent = e.message;
  }
}

async function renderMaintenanceConfig() {
  try {
    const data = await adminApi('/api/admin/maintenance');
    document.getElementById('maintenanceEnabled').checked = Boolean(data.maintenance?.enabled);
    document.getElementById('maintenanceMessageInput').value = data.maintenance?.message || '';
    els.maintenanceInfo.textContent = data.maintenance?.enabled
      ? 'Đang bật chế độ bảo trì.'
      : 'Trang đang hoạt động bình thường.';
  } catch (e) {
    els.maintenanceInfo.textContent = e.message;
  }
}

async function renderAdminMatches() {
  try {
    const canManageOdds = Boolean(currentUser && (currentUser.is_admin || currentUser.can_manage_odds));
    const canSetResult = Boolean(currentUser && (currentUser.is_admin || currentUser.can_set_result));
    const canDelete = Boolean(currentUser && currentUser.is_admin);
    const data = await adminApi('/api/admin/matches');
    const activeMatches = data.matches.filter((m) => !m.result);
    const settledMatches = data.matches.filter((m) => m.result);
    const activeRows = activeMatches.map((m) => `
      <tr>
        <td>${m.id}</td>
        <td>${m.team_a}</td>
        <td>${m.team_b}</td>
        <td>${fmtTime(m.kickoff_at)}</td>
        <td>
          <select id="mode-${m.id}" ${canManageOdds ? '' : 'disabled'}>
            <option value="1X2" ${m.bet_mode === '1X2' ? 'selected' : ''}>1X2</option>
            <option value="HANDICAP" ${m.bet_mode === 'HANDICAP' ? 'selected' : ''}>Kèo chấp</option>
            <option value="SCORE" ${m.bet_mode === 'SCORE' ? 'selected' : ''}>Tỷ số</option>
          </select>
        </td>
        <td>
          <input id="odds-home-${m.id}" type="number" step="0.01" min="1.01" value="${m.bet_mode === '1X2' ? m.odds_home : ''}" style="width:88px" ${canManageOdds ? '' : 'disabled'} />
        </td>
        <td>
          <input id="odds-draw-${m.id}" type="number" step="0.01" min="1.01" value="${m.bet_mode === '1X2' ? m.odds_draw : ''}" style="width:88px" ${canManageOdds ? '' : 'disabled'} />
        </td>
        <td>
          <input id="odds-away-${m.id}" type="number" step="0.01" min="1.01" value="${m.bet_mode === '1X2' ? m.odds_away : ''}" style="width:88px" ${canManageOdds ? '' : 'disabled'} />
        </td>
        <td>
          <input id="hcp-line-${m.id}" type="number" step="0.25" min="0" value="${m.bet_mode === 'HANDICAP' ? (m.handicap_line ?? '') : ''}" style="width:88px" ${canManageOdds ? '' : 'disabled'} />
          <input id="hcp-home-${m.id}" type="number" step="0.01" min="1.01" value="${m.bet_mode === 'HANDICAP' ? (m.odds_handicap_home ?? '') : ''}" style="width:88px" ${canManageOdds ? '' : 'disabled'} />
          <input id="hcp-away-${m.id}" type="number" step="0.01" min="1.01" value="${m.bet_mode === 'HANDICAP' ? (m.odds_handicap_away ?? '') : ''}" style="width:88px" ${canManageOdds ? '' : 'disabled'} />
          <input id="score-odds-${m.id}" value="${m.bet_mode === 'SCORE' ? formatScoreOddsInput(m.score_odds) : ''}" placeholder="1-0=9.3, 2-0=8.9" style="width:220px" ${canManageOdds ? '' : 'disabled'} />
        </td>
        <td>${m.result || '-'}${Number.isInteger(m.home_score) && Number.isInteger(m.away_score) ? `<br><span class="small">${m.home_score}-${m.away_score}</span>` : ''}</td>
        <td>
          ${canManageOdds ? `<button onclick="updateOdds(${m.id})">Lưu kèo</button>` : ''}
          ${canSetResult ? `<button onclick="settleMatch(${m.id},'HOME')">Chốt ${m.team_a}</button>` : ''}
          ${canSetResult ? `<button onclick="settleMatch(${m.id},'DRAW')">Chốt Hòa</button>` : ''}
          ${canSetResult ? `<button onclick="settleMatch(${m.id},'AWAY')">Chốt ${m.team_b}</button>` : ''}
          ${canSetResult ? `<input id="score-home-${m.id}" type="number" min="0" placeholder="${m.team_a}" style="width:75px" />` : ''}
          ${canSetResult ? `<input id="score-away-${m.id}" type="number" min="0" placeholder="${m.team_b}" style="width:75px" />` : ''}
          ${canSetResult ? `<button onclick="settleByScore(${m.id})">Chốt tỷ số</button>` : ''}
          ${canSetResult ? `<button onclick="recalculateMatch(${m.id})">Tính lại trả thưởng</button>` : ''}
          ${canSetResult && m.result ? `<button onclick="exportMatchSettlement(${m.id})">Export kết quả</button>` : ''}
          ${canDelete ? `<button onclick="deleteMatch(${m.id})">Xóa</button>` : ''}
        </td>
      </tr>
    `).join('');
    const settledRows = settledMatches.map((m) => `
      <tr>
        <td>${m.id}</td>
        <td>${m.team_a}</td>
        <td>${m.team_b}</td>
        <td>${fmtTime(m.kickoff_at)}</td>
        <td>${marketLabel(m.bet_mode, m.handicap_line)}</td>
        <td>${matchResultText(m)}${Number.isInteger(m.home_score) && Number.isInteger(m.away_score) ? `<br><span class="small">${m.home_score}-${m.away_score}</span>` : ''}</td>
        <td>
          ${canSetResult ? `<button onclick="exportMatchSettlement(${m.id})">Export kết quả</button>` : ''}
          ${currentUser?.is_admin ? `<button onclick="recalculateMatch(${m.id})">Tính lại trả thưởng</button>` : ''}
        </td>
      </tr>
    `).join('');
    els.adminMatchesActive.innerHTML = activeMatches.length
      ? `<table><thead><tr><th>ID</th><th>A</th><th>B</th><th>Giờ đá</th><th>Thể thức</th><th>1</th><th>X</th><th>2</th><th>Kèo chấp / Tỷ số</th><th>KQ</th><th>Hành động</th></tr></thead><tbody>${activeRows}</tbody></table>`
      : `<p class="small">Hiện không còn trận nào chờ set kèo/kết quả.</p>`;
    els.adminMatchesHistory.innerHTML = settledMatches.length
      ? `<table><thead><tr><th>ID</th><th>A</th><th>B</th><th>Giờ đá</th><th>Thể thức</th><th>KQ</th><th>Hành động</th></tr></thead><tbody>${settledRows}</tbody></table>`
      : `<p class="small">Hiện chưa có trận nào đã chốt kết quả.</p>`;
    for (const m of activeMatches) {
      syncRowModeUI(m.id);
      const modeEl = document.getElementById(`mode-${m.id}`);
      if (modeEl) {
        modeEl.onchange = () => syncRowModeUI(m.id);
      }
    }
    switchAdminMatchesTab(activeAdminMatchesTab);
  } catch (e) {
    els.adminMatchesActive.innerHTML = `<p class="small error">${e.message}</p>`;
    els.adminMatchesHistory.innerHTML = '';
  }
}

async function renderAdminUsers() {
  try {
    const isAdmin = Boolean(currentUser?.is_admin);
    const data = await adminApi('/api/admin/users');
    const rows = data.users.map((u) => `
      <tr>
        <td>${u.id}</td>
        <td>${u.username}<br><span class="small">${u.full_name || '-'}</span></td>
        <td>
          <button onclick="exportUserHistory(${u.id})">Export lịch sử</button>
          ${isAdmin ? `<button onclick="resetUserPassword(${u.id})">Reset password</button>` : ''}
          ${u.is_disabled ? '<div class="small error">Đã disable / Ẩn BXH</div>' : ''}
        </td>
        ${isAdmin ? `
        <td>${u.points}</td>
        <td>
          ${u.is_admin ? '<span class="small">-</span>' : `
            <label><input type="checkbox" id="perm-odds-${u.id}" ${u.can_manage_odds ? 'checked' : ''} /> Set kèo</label><br>
            <label><input type="checkbox" id="perm-result-${u.id}" ${u.can_set_result ? 'checked' : ''} /> Set tỷ số/KQ</label><br>
            <label><input type="checkbox" id="perm-export-${u.id}" ${u.can_export_user_history ? 'checked' : ''} /> Export lịch sử user</label><br>
            <label><input type="checkbox" id="perm-disabled-${u.id}" ${u.is_disabled ? 'checked' : ''} /> Disable nick + Ẩn khỏi BXH</label><br>
            <button onclick="savePermissions(${u.id})">Lưu quyền</button>
          `}
        </td>
        <td>
          <input id="delta-${u.id}" type="number" step="1" value="100" style="width:90px" />
          <button onclick="adjustPoints(${u.id}, 1)">Cộng</button>
          <button onclick="adjustPoints(${u.id}, -1)">Trừ</button>
        </td>
        ` : ''}
      </tr>
    `).join('');
    els.adminUsers.innerHTML = isAdmin
      ? `<table><thead><tr><th>ID</th><th>User</th><th>Xuất lịch sử</th><th>Điểm</th><th>Phân quyền</th><th>Điều chỉnh</th></tr></thead><tbody>${rows}</tbody></table>`
      : `<table><thead><tr><th>ID</th><th>User</th><th>Xuất lịch sử</th></tr></thead><tbody>${rows}</tbody></table>`;
  } catch (e) {
    els.adminUsers.innerHTML = `<p class="small error">${e.message}</p>`;
  }
}

async function renderSpecials() {
  const data = await api('/api/specials');
  const actionColLabel = 'Thao tác';
  const formRows = data.markets.map((m) => `
    <tr>
      <td>${m.title}</td>
      <td>${m.result || '-'}</td>
      <td>
        <input id="special-${m.key}" placeholder="Nhập dự đoán..." style="min-width:240px" ${m.locked ? 'disabled' : ''} />
        <div class="small">Thưởng đúng: ${m.bonus_points} điểm</div>
      </td>
      <td>${m.locked ? '<span class="small">Đã khóa</span>' : `<button onclick="saveSpecialPick('${m.key}')">Lưu dự đoán</button>`}</td>
    </tr>
  `).join('');
  els.specialMarkets.innerHTML = `
    <div class="small">${data.locked ? 'Dự đoán vui tổng đang khóa theo hạn chung.' : 'Dự đoán vui tổng đang mở theo hạn chung.'} Hạn chót: ${data.deadline_text}. Một số câu có thể được mở/khóa riêng bởi admin.</div>
    <table><thead><tr><th>Hạng mục</th><th>Kết quả chính thức</th><th>Dự đoán</th><th>${actionColLabel}</th></tr></thead><tbody>${formRows}</tbody></table>
  `;

  const pickRows = data.picks.map((p) => `
    <tr>
      <td>${p.market_title}</td>
      <td>${p.prediction}</td>
      <td>${p.status}</td>
      <td>${p.bonus || 0}</td>
    </tr>
  `).join('');
  els.mySpecialPicks.innerHTML = `<table><thead><tr><th>Hạng mục</th><th>Dự đoán</th><th>Trạng thái</th><th>Thưởng</th></tr></thead><tbody>${pickRows}</tbody></table>`;
}

async function renderAdminSpecials() {
  try {
    const data = await adminApi('/api/admin/specials');
    const deadlineLocal = new Date(data.deadline_iso);
    const pad = (v) => String(v).padStart(2, '0');
    document.getElementById('adminSpecialDeadline').value = `${deadlineLocal.getFullYear()}-${pad(deadlineLocal.getMonth() + 1)}-${pad(deadlineLocal.getDate())}T${pad(deadlineLocal.getHours())}:${pad(deadlineLocal.getMinutes())}`;
    document.getElementById('adminSpecialManualLock').checked = Boolean(data.manually_locked);
    els.adminSpecialsStatus.textContent = `${data.locked ? 'Dự đoán vui đã khóa.' : 'Dự đoán vui đang mở.'} Hạn chót: ${data.deadline_text}. Mỗi dự đoán đúng được ${data.markets[0]?.bonus_points || 0} điểm.`;
    const rows = data.markets.map((m) => `
      <tr>
        <td>${m.title}</td>
        <td>${m.total_picks}</td>
        <td>${m.result || '-'}</td>
        <td>
          <select id="special-lock-${m.key}">
            <option value="default" ${m.lock_mode === 'default' ? 'selected' : ''}>Theo hạn chung</option>
            <option value="open" ${m.lock_mode === 'open' ? 'selected' : ''}>Mở riêng</option>
            <option value="locked" ${m.lock_mode === 'locked' ? 'selected' : ''}>Khóa riêng</option>
          </select>
          <button onclick="saveSpecialLockMode('${m.key}')">Lưu trạng thái</button>
          <div class="small">Hiện tại: ${m.locked ? 'Đang khóa' : 'Đang mở'}</div>
        </td>
        <td>
          <input id="settle-${m.key}" placeholder="Kết quả chính thức..." style="min-width:220px" />
          <button onclick="settleSpecial('${m.key}')">Chốt hạng mục</button>
        </td>
      </tr>
    `).join('');
    els.adminSpecials.innerHTML = `<table><thead><tr><th>Hạng mục</th><th>Số dự đoán</th><th>Kết quả</th><th>Mở/khóa riêng</th><th>Thao tác</th></tr></thead><tbody>${rows}</tbody></table>`;
  } catch (e) {
    els.adminSpecialsStatus.textContent = '';
    els.adminSpecials.innerHTML = `<p class="small error">${e.message}</p>`;
  }
}

document.getElementById('btnSaveSpecialConfig').onclick = async () => {
  try {
    const deadlineLocal = document.getElementById('adminSpecialDeadline').value;
    const manuallyLocked = document.getElementById('adminSpecialManualLock').checked;
    if (!deadlineLocal) {
      setMessage('Vui lòng chọn hạn dự đoán vui', 'error');
      return;
    }
    const deadlineIso = new Date(deadlineLocal).toISOString();
    await adminApi('/api/admin/specials/config', {
      method: 'POST',
      body: JSON.stringify({ deadlineIso, manuallyLocked })
    });
    setMessage('Đã cập nhật cấu hình dự đoán vui', 'success');
    await Promise.all([renderAdminSpecials(), renderSpecials()]);
  } catch (e) {
    setMessage(e.message, 'error');
  }
};

async function renderMatches() {
  const [data, myBetsData] = await Promise.all([
    api('/api/matches'),
    api('/api/my-bets')
  ]);
  const openBets = (myBetsData.bets || []).filter((b) => b.status === 'open');
  const myOpenMatchIds = new Set(
    openBets
      .map((b) => b.match_id)
  );
  const myOpenScoreBetsByMatch = openBets.reduce((acc, bet) => {
    if (bet.market !== 'SCORE') return acc;
    if (!acc[bet.match_id]) acc[bet.match_id] = [];
    acc[bet.match_id].push(bet);
    return acc;
  }, {});
  const buildScoreCard = (m) => {
    const myScoreBets = myOpenScoreBetsByMatch[m.id] || [];
    const myScorePicks = new Set(myScoreBets.map((bet) => bet.pick));
    const scoreBetCount = myScoreBets.length;
    const reachedScoreLimit = scoreBetCount >= 3;
    const availableScoreEntries = Object.entries(m.score_odds || {}).filter(([score]) => !myScorePicks.has(score));
    const selectableScoreEntries = availableScoreEntries.length ? availableScoreEntries : Object.entries(m.score_odds || {});
    const openStatus = scoreBetCount > 0
      ? `Đã đặt ${scoreBetCount}/3`
      : tr('matchNotYetBet', {}, 'Chưa đặt cược');
    const scoreEntries = Object.entries(m.score_odds || {});
    return `
      <div class="score-match-card">
        <div class="score-card-head">
          <div>
            <div class="match-title">${matchLabel(m.team_a, m.team_b)}</div>
            <div class="small match-kickoff">${fmtTime(m.kickoff_at)}</div>
          </div>
          <div class="score-card-meta">
            <span class="status-pill ${reachedScoreLimit ? 'status-closed' : 'status-open'}">${openStatus}</span>
            <div class="small match-substatus">${m.result ? `KQ: ${matchResultText(m)}` : tr('resultPending', {}, 'Chưa có kết quả')}</div>
          </div>
        </div>
        <div class="score-odds-grid">
          ${scoreEntries.map(([score, odds]) => `
            <div class="score-odds-chip">
              <strong>${score}</strong>
              <span class="small">Odds: ${odds}</span>
            </div>
          `).join('')}
        </div>
        <div class="score-bet-panel">
          <select id="score-pick-${m.id}" ${reachedScoreLimit ? 'disabled' : ''}>
            ${selectableScoreEntries.map(([score, odds]) => `<option value="${score}">${score} (odds ${odds})</option>`).join('')}
          </select>
          <input id="score-stake-${m.id}" type="number" min="1" value="100" ${reachedScoreLimit ? 'disabled' : ''} />
          <button class="bet-action" onclick="placeBet(${m.id}, 'SCORE')" ${reachedScoreLimit ? 'disabled' : ''}>${tr('betAction', {}, 'Đặt')}</button>
          <div class="small bet-meta">
            ${scoreBetCount ? `Bạn đang giữ ${scoreBetCount}/3 vé tỷ số.` : 'Bạn có thể đặt tối đa 3 tỷ số cho trận này.'}
            ${myScoreBets.length ? `<br>Đã chọn: ${myScoreBets.map((bet) => `${bet.pick} (${bet.odds})`).join(', ')}` : ''}
          </div>
        </div>
      </div>
    `;
  };
  const buildRow = (m, closed) => {
    const isAdmin = Boolean(currentUser?.is_admin);
    const myScoreBets = myOpenScoreBetsByMatch[m.id] || [];
    const myScorePicks = new Set(myScoreBets.map((bet) => bet.pick));
    const scoreBetCount = myScoreBets.length;
    const reachedScoreLimit = scoreBetCount >= 3;
    const resultText = m.result ? matchResultText(m) : tr('resultPending', {}, 'Chưa có kết quả');
    const result = m.result
      ? tr('resultLabel', { result: resultText }, `KQ: ${resultText}`)
      : tr('resultPending', {}, 'Chưa có kết quả');
    const hasMyBet = myOpenMatchIds.has(m.id);
    const openStatus = hasMyBet
      ? tr('matchAlreadyBet', {}, 'Đã đặt cược')
      : tr('matchNotYetBet', {}, 'Chưa đặt cược');
    const mode = String(m.bet_mode || '1X2');
    const odds1Cell = mode === '1X2'
      ? `<div class="odds-block"><div>${tr('odds1Text', { team: teamLabel(m.team_a) }, `Kèo 1: ${teamLabel(m.team_a)} thắng`)}</div><span class="small">${tr('oddsRate', { value: m.odds_home }, `Tỷ lệ: ${m.odds_home}`)}</span></div>`
      : '<span class="small">-</span>';
    const oddsXCell = mode === '1X2'
      ? `<div class="odds-block"><div>${tr('oddsXText', {}, 'Kèo X: Hòa')}</div><span class="small">${tr('oddsRate', { value: m.odds_draw }, `Tỷ lệ: ${m.odds_draw}`)}</span></div>`
      : '<span class="small">-</span>';
    const odds2Cell = mode === '1X2'
      ? `<div class="odds-block"><div>${tr('odds2Text', { team: teamLabel(m.team_b) }, `Kèo 2: ${teamLabel(m.team_b)} thắng`)}</div><span class="small">${tr('oddsRate', { value: m.odds_away }, `Tỷ lệ: ${m.odds_away}`)}</span></div>`
      : '<span class="small">-</span>';
    const scoreEntries = Object.entries(m.score_odds || {});
    const availableScoreEntries = scoreEntries.filter(([score]) => !myScorePicks.has(score));
    const selectableScoreEntries = availableScoreEntries.length ? availableScoreEntries : scoreEntries;
    const scoreCell = mode === 'SCORE'
      ? `<div class="odds-block"><div>Tỷ số mở cược</div><span class="small">${scoreOddsSummary(m.score_odds)}</span></div>`
      : '';

    return `
      <tr>
        <td>
          <div class="match-title">${matchLabel(m.team_a, m.team_b)}</div>
          <div class="small match-kickoff">${fmtTime(m.kickoff_at)}</div>
        </td>
        <td>${odds1Cell}</td>
        <td>${oddsXCell}</td>
        <td>${mode === 'SCORE' ? scoreCell : odds2Cell}</td>
        <td>
          ${closed
            ? `<span class="status-pill status-closed">${result}</span>`
            : `<span class="status-pill ${hasMyBet ? 'status-closed' : 'status-open'}">${openStatus}</span><div class="small match-substatus">${tr('resultPending', {}, 'Chưa có kết quả')}</div>`}
        </td>
        <td>
          ${closed && !isAdmin ? `<div class="bet-box closed"><span class="small">${tr('statusClosedBetting', {}, 'Đã đóng cược')}</span></div>` : `
            ${mode === 'HANDICAP' ? `
              <div class="bet-box">
                <div class="small bet-mode">${tr('betModeLabelHandicap', {}, 'Thể thức: Kèo chấp')}</div>
                <div class="small bet-meta">${teamLabel(m.team_a)} -${m.handicap_line} (${m.odds_handicap_home}) | ${teamLabel(m.team_b)} +${m.handicap_line} (${m.odds_handicap_away})</div>
                <div class="bet-controls">
                  <select id="hcp-pick-${m.id}">
                    <option value="HOME">${m.team_a} -${m.handicap_line}</option>
                    <option value="AWAY">${m.team_b} +${m.handicap_line}</option>
                  </select>
                  <input id="hcp-stake-${m.id}" type="number" min="1" value="100" />
                </div>
                <button class="bet-action" onclick="placeBet(${m.id}, 'HANDICAP')">${tr('betAction', {}, 'Đặt')}</button>
              </div>
            ` : mode === 'SCORE' ? `
              ${closed && isAdmin ? `
                <div class="bet-box">
                  <div class="small bet-mode">${tr('betModeScore', {}, 'Tỷ số chính xác')}</div>
                  <div class="small bet-meta">
                    ${scoreBetCount ? `Bạn đang giữ ${scoreBetCount}/3 vé tỷ số.` : 'Bạn có thể đặt tối đa 3 tỷ số cho trận này.'}
                    ${myScoreBets.length ? `<br>Đã chọn: ${myScoreBets.map((bet) => `${bet.pick} (${bet.odds})`).join(', ')}` : ''}
                  </div>
                  <div class="bet-controls">
                    <select id="score-pick-${m.id}" ${reachedScoreLimit ? 'disabled' : ''}>
                      ${selectableScoreEntries.map(([score, odds]) => `<option value="${score}">${score} (odds ${odds})</option>`).join('')}
                    </select>
                    <input id="score-stake-${m.id}" type="number" min="1" value="100" ${reachedScoreLimit ? 'disabled' : ''} />
                  </div>
                  <button class="bet-action" onclick="placeBet(${m.id}, 'SCORE')" ${reachedScoreLimit ? 'disabled' : ''}>${tr('betAction', {}, 'Đặt')}</button>
                </div>
              ` : `<div class="bet-box closed"><span class="small">Qua tab Tỷ số chính xác để đặt cược.</span></div>`}
            ` : `
              <div class="bet-box">
                <div class="small bet-mode">${tr('betModeLabel1x2', {}, 'Thể thức: 1X2')}</div>
                <div class="bet-controls">
                  <select id="pick-${m.id}">
                    <option value="HOME">${m.team_a}</option>
                    <option value="DRAW">${tr('pickDraw', {}, 'Hòa')}</option>
                    <option value="AWAY">${m.team_b}</option>
                  </select>
                  <input id="stake-${m.id}" type="number" min="1" value="100" />
                </div>
                <button class="bet-action" onclick="placeBet(${m.id}, '1X2')">${tr('betAction', {}, 'Đặt')}</button>
              </div>
            `}
          `}
        </td>
      </tr>
    `;
  };

  const openMatches = data.matches
    .filter((m) => Date.now() < new Date(m.kickoff_at).getTime() && !m.result && String(m.bet_mode || '1X2') !== 'SCORE');
  const scoreMatches = data.matches
    .filter((m) => Date.now() < new Date(m.kickoff_at).getTime() && !m.result && String(m.bet_mode || '1X2') === 'SCORE');
  const closedMatches = data.matches
    .filter((m) => Date.now() >= new Date(m.kickoff_at).getTime() || m.result);

  if (selectedOpenMatchDay !== 'ALL' && !openMatches.some((m) => matchDayKey(m.kickoff_at) === selectedOpenMatchDay)) {
    selectedOpenMatchDay = 'ALL';
  }
  if (selectedScoreMatchDay !== 'ALL' && !scoreMatches.some((m) => matchDayKey(m.kickoff_at) === selectedScoreMatchDay)) {
    selectedScoreMatchDay = 'ALL';
  }
  if (selectedClosedMatchDay !== 'ALL' && !closedMatches.some((m) => matchDayKey(m.kickoff_at) === selectedClosedMatchDay)) {
    selectedClosedMatchDay = 'ALL';
  }

  const filteredOpenMatches = filterMatchesByDay(openMatches, selectedOpenMatchDay);
  const filteredScoreMatches = filterMatchesByDay(scoreMatches, selectedScoreMatchDay);
  const filteredClosedMatches = filterMatchesByDay(closedMatches, selectedClosedMatchDay);

  const openRows = filteredOpenMatches
    .map((m) => buildRow(m, false))
    .join('');
  const scoreRows = filteredScoreMatches
    .map((m) => buildScoreCard(m))
    .join('');
  const closedRows = filteredClosedMatches
    .map((m) => buildRow(m, true))
    .join('');

  els.openMatches.innerHTML = `
    ${renderMatchDayTabs(openMatches, selectedOpenMatchDay, 'setOpenMatchDay')}
    <table class="matches-table">
      <thead><tr><th>${tr('tableMatch', {}, 'Trận')}</th><th>${tr('tableOdds1', {}, 'Kèo 1 (đội nhà)')}</th><th>${tr('tableOddsX', {}, 'Kèo X (hòa)')}</th><th>${tr('tableOdds2', {}, 'Kèo 2 (đội khách)')}</th><th>${tr('tableStatus', {}, 'Trạng thái')}</th><th>${tr('tableBet', {}, 'Đặt cược')}</th></tr></thead>
      <tbody>${openRows || `<tr><td colspan="6" class="small">${tr('openMatchesEmpty', {}, 'Hiện chưa có trận nào mở cược.')}</td></tr>`}</tbody>
    </table>
  `;

  els.scoreMatches.innerHTML = `
    ${renderMatchDayTabs(scoreMatches, selectedScoreMatchDay, 'setScoreMatchDay')}
    <div class="score-matches-grid">${scoreRows || `<p class="small">Hiện chưa có trận nào mở cược tỷ số chính xác.</p>`}</div>
  `;

  els.closedMatches.innerHTML = `
    ${renderMatchDayTabs(closedMatches, selectedClosedMatchDay, 'setClosedMatchDay')}
    <table class="matches-table">
      <thead><tr><th>${tr('tableMatch', {}, 'Trận')}</th><th>${tr('tableOdds1', {}, 'Kèo 1 (đội nhà)')}</th><th>${tr('tableOddsX', {}, 'Kèo X (hòa)')}</th><th>${tr('tableOdds2', {}, 'Kèo 2 (đội khách)')}</th><th>${tr('tableStatus', {}, 'Trạng thái')}</th><th>${tr('tableBet', {}, 'Đặt cược')}</th></tr></thead>
      <tbody>${closedRows || `<tr><td colspan="6" class="small">${tr('closedMatchesEmpty', {}, 'Chưa có trận nào đóng cược.')}</td></tr>`}</tbody>
    </table>
  `;
}

window.setOpenMatchDay = function (day) {
  selectedOpenMatchDay = day;
  renderMatches().catch((e) => setMessage(e.message, 'error'));
};

window.setScoreMatchDay = function (day) {
  selectedScoreMatchDay = day;
  renderMatches().catch((e) => setMessage(e.message, 'error'));
};

window.setClosedMatchDay = function (day) {
  selectedClosedMatchDay = day;
  renderMatches().catch((e) => setMessage(e.message, 'error'));
};

async function renderLeaderboard() {
  const data = await api('/api/leaderboard');
  const rows = data.leaderboard.map((u, i) => `
    <tr>
      <td>#${i + 1}</td>
      <td>${u.username}<br><span class="small">${u.full_name || '-'}</span></td>
      <td>${u.points_available}</td>
      <td>${u.points_on_bet}</td>
      <td>${u.points_total}</td>
    </tr>
  `).join('');

  els.leaderboard.innerHTML = `<table><thead><tr><th>${tr('leaderboardRank', {}, 'Rank')}</th><th>${tr('leaderboardUser', {}, 'User')}</th><th>${tr('leaderboardAvailable', {}, 'Điểm đang có')}</th><th>${tr('leaderboardOnBet', {}, 'Điểm đang đặt cược')}</th><th>${tr('leaderboardTotal', {}, 'Điểm tổng')}</th></tr></thead><tbody>${rows}</tbody></table>`;
}

async function renderMyBets() {
  const data = await api('/api/my-bets');
  const rows = data.bets.map((b) => `
    <tr>
      <td>
        ${b.team_a || '-'} vs ${b.team_b || '-'}
        <br><span class="small">#${b.match_id} / bet #${b.id}</span>
      </td>
      <td>${marketLabel(b.market, b.handicap_line)}</td>
      <td>${betPickText(b)}</td>
      <td>${b.stake}</td>
      <td>${b.odds}</td>
      <td>${betMatchResultText(b)}</td>
      <td>${betStatusText(b.status)}</td>
      <td>${b.payout ?? '-'}</td>
      <td>
        ${(!b.result && Date.now() < new Date(b.kickoff_at).getTime() && b.status === 'open')
          ? `<button onclick="cancelBet(${b.id})">${tr('cancelBet', {}, 'Hủy')}</button>`
          : '<span class="small">-</span>'}
      </td>
    </tr>
  `).join('');

  els.myBets.innerHTML = `<table><thead><tr><th>${tr('tableMatch', {}, 'Trận')}</th><th>${tr('tableMode', {}, 'Thể thức')}</th><th>${tr('myBetsChoice', {}, 'Chọn')}</th><th>${tr('myBetsStake', {}, 'Cược')}</th><th>${tr('myBetsOdds', {}, 'Tỷ lệ')}</th><th>Kết quả trận</th><th>Trạng thái cược</th><th>${tr('myBetsPayout', {}, 'Thưởng')}</th><th>${tr('myBetsAction', {}, 'Hành động')}</th></tr></thead><tbody>${rows}</tbody></table>`;
}

window.placeBet = async function (matchId, market = '1X2') {
  try {
    const matchesRes = await api('/api/matches');
    const match = matchesRes.matches.find((m) => m.id === matchId);
    if (!match) {
      setMessage('Không tìm thấy trận đấu', 'error');
      return;
    }
    const pick = market === 'HANDICAP'
      ? document.getElementById(`hcp-pick-${matchId}`).value
      : market === 'SCORE'
        ? document.getElementById(`score-pick-${matchId}`).value
        : document.getElementById(`pick-${matchId}`).value;
    const stake = Number(market === 'HANDICAP'
      ? document.getElementById(`hcp-stake-${matchId}`).value
      : market === 'SCORE'
        ? document.getElementById(`score-stake-${matchId}`).value
        : document.getElementById(`stake-${matchId}`).value);
    const odds = market === 'HANDICAP'
      ? (pick === 'HOME' ? match.odds_handicap_home : match.odds_handicap_away)
      : market === 'SCORE'
        ? Number((match.score_odds || {})[pick])
        : (pick === 'HOME' ? match.odds_home : (pick === 'DRAW' ? match.odds_draw : match.odds_away));
    const pickText = betPickText({
      market,
      pick,
      handicap_line: match.handicap_line,
      team_a: match.team_a,
      team_b: match.team_b
    });
    openBetConfirm({
      matchId,
      market,
      pick,
      stake,
      odds,
      handicapLine: match.handicap_line,
      teamA: match.team_a,
      teamB: match.team_b,
      pickText
    });
  } catch (e) {
    setMessage(e.message, 'error');
  }
};

document.getElementById('btnCancelBetConfirm').onclick = closeBetConfirm;
document.getElementById('betConfirmBackdrop').onclick = closeBetConfirm;
document.getElementById('btnConfirmBet').onclick = async () => {
  try {
    if (!pendingBetPayload) return;
    const { matchId, market, pick, stake } = pendingBetPayload;
    await api('/api/bets', {
      method: 'POST',
      body: JSON.stringify({ matchId, market, pick, stake })
    });
    closeBetConfirm();
    setMessage('Đặt cược thành công', 'success');
    await refresh();
  } catch (e) {
    setMessage(e.message, 'error');
  }
};

document.getElementById('btnCancelAdminConfirm').onclick = closeAdminConfirm;
document.getElementById('adminConfirmBackdrop').onclick = closeAdminConfirm;
document.getElementById('btnConfirmAdminAction').onclick = async () => {
  try {
    if (!pendingAdminAction) return;
    const action = pendingAdminAction;
    closeAdminConfirm();
    await action();
  } catch (e) {
    setMessage(e.message, 'error');
  }
};

window.cancelBet = async function (betId) {
  try {
    await api(`/api/bets/${betId}`, { method: 'DELETE' });
    setMessage('Rút cược thành công', 'success');
    await refresh();
  } catch (e) {
    setMessage(e.message, 'error');
  }
};

document.getElementById('btnRegister').onclick = async () => {
  try {
    const username = document.getElementById('regUser').value;
    const password = document.getElementById('regPass').value;
    const fullName = document.getElementById('regFullName').value;
    await api('/api/register', { method: 'POST', body: JSON.stringify({ username, password, fullName }) });
    setMessage('Đăng ký thành công', 'success');
    await refresh();
  } catch (e) {
    setMessage(e.message, 'error');
  }
};

document.getElementById('btnLogin').onclick = async () => {
  try {
    const username = document.getElementById('loginUser').value;
    const password = document.getElementById('loginPass').value;
    await api('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    setMessage('Đăng nhập thành công', 'success');
    await refresh();
  } catch (e) {
    setMessage(e.message, 'error');
  }
};

document.getElementById('btnSetFullName').onclick = async () => {
  try {
    const fullName = document.getElementById('setFullNameInput').value.trim();
    await api('/api/profile/full-name', {
      method: 'POST',
      body: JSON.stringify({ fullName })
    });
    setMessage('Đã cập nhật họ và tên thành công', 'success');
    document.getElementById('setFullNameInput').value = '';
    await refresh();
  } catch (e) {
    setMessage(e.message, 'error');
  }
};

document.getElementById('btnLogout').onclick = async () => {
  await api('/api/logout', { method: 'POST' });
  setMessage('Đã đăng xuất');
  await refresh();
};

document.getElementById('btnShowChangePassword').onclick = async () => {
  els.changePasswordForm.classList.toggle('hidden');
};

document.getElementById('btnChangePassword').onclick = async () => {
  try {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    await api('/api/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    els.changePasswordForm.classList.add('hidden');
    setMessage('Đổi mật khẩu thành công', 'success');
  } catch (e) {
    setMessage(e.message, 'error');
  }
};

document.getElementById('showRegister').onclick = (e) => {
  e.preventDefault();
  showRegisterForm();
};

document.getElementById('showLogin').onclick = (e) => {
  e.preventDefault();
  showLoginForm();
};

document.getElementById('btnAdminLoad').onclick = async () => {
  await Promise.all([renderAdminMatches(), renderAdminSpecials()]);
};

document.getElementById('btnSaveDailyBonus').onclick = async () => {
  try {
    const enabled = document.getElementById('dailyBonusEnabled').checked;
    const startDate = document.getElementById('dailyBonusStartDate').value;
    const pointsPerDay = Number(document.getElementById('dailyBonusPoints').value);
    await adminApi('/api/admin/daily-bonus', {
      method: 'POST',
      body: JSON.stringify({ enabled, startDate, pointsPerDay })
    });
    setMessage('Lưu cấu hình cộng điểm mỗi ngày thành công', 'success');
    await Promise.all([refresh(), renderLeaderboard()]);
  } catch (e) {
    setMessage(e.message, 'error');
  }
};

document.getElementById('btnSaveMaintenance').onclick = async () => {
  try {
    const enabled = document.getElementById('maintenanceEnabled').checked;
    const message = document.getElementById('maintenanceMessageInput').value.trim();
    await adminApi('/api/admin/maintenance', {
      method: 'POST',
      body: JSON.stringify({ enabled, message })
    });
    setMessage(enabled ? 'Đã bật chế độ bảo trì' : 'Đã tắt chế độ bảo trì', 'success');
    await refresh();
  } catch (e) {
    setMessage(e.message, 'error');
  }
};

document.getElementById('btnBulkAddPoints').onclick = async () => {
  try {
    const raw = Number(document.getElementById('bulkPointsDelta').value);
    const delta = Math.trunc(raw);
    if (!Number.isInteger(delta) || delta <= 0) {
      setMessage('Vui lòng nhập số điểm cộng là số nguyên dương', 'error');
      return;
    }
    if (!window.confirm(`Cộng ${delta} điểm cho toàn bộ user?`)) return;
    await adminApi('/api/admin/users/bulk-points', {
      method: 'POST',
      body: JSON.stringify({ delta })
    });
    setMessage(`Đã cộng ${delta} điểm cho toàn bộ user`, 'success');
    await Promise.all([refresh(), renderAdminUsers(), renderLeaderboard()]);
  } catch (e) {
    setMessage(e.message, 'error');
  }
};

document.getElementById('btnBulkSubtractPoints').onclick = async () => {
  try {
    const raw = Number(document.getElementById('bulkPointsDelta').value);
    const delta = Math.trunc(raw);
    if (!Number.isInteger(delta) || delta <= 0) {
      setMessage('Vui lòng nhập số điểm trừ là số nguyên dương', 'error');
      return;
    }
    if (!window.confirm(`Trừ ${delta} điểm của toàn bộ user?`)) return;
    await adminApi('/api/admin/users/bulk-points', {
      method: 'POST',
      body: JSON.stringify({ delta: -delta })
    });
    setMessage(`Đã trừ ${delta} điểm của toàn bộ user`, 'success');
    await Promise.all([refresh(), renderAdminUsers(), renderLeaderboard()]);
  } catch (e) {
    setMessage(e.message, 'error');
  }
};

document.getElementById('btnResetAllPoints').onclick = async () => {
  try {
    if (!window.confirm('Reset điểm đang có của toàn bộ user về mức khởi tạo mặc định?')) return;
    const result = await adminApi('/api/admin/users/reset-points', {
      method: 'POST'
    });
    setMessage(`Đã reset điểm của ${result.affectedUsers} user về ${result.points}`, 'success');
    await Promise.all([refresh(), renderAdminUsers(), renderLeaderboard()]);
  } catch (e) {
    setMessage(e.message, 'error');
  }
};

document.getElementById('btnNormalizeTeams').onclick = async () => {
  try {
    if (!window.confirm('Chuẩn hóa toàn bộ tên đội hiện có về tên chuẩn?')) return;
    const result = await adminApi('/api/admin/matches/normalize-teams', {
      method: 'POST'
    });
    setMessage(`Đã chuẩn hóa ${result.changed} trường tên đội`, 'success');
    await Promise.all([refresh(), renderAdminMatches()]);
  } catch (e) {
    setMessage(e.message, 'error');
  }
};

document.getElementById('btnAdminLoadUsers').onclick = async () => {
  await renderAdminUsers();
};

document.getElementById('btnAddMatch').onclick = async () => {
  try {
    const teamA = document.getElementById('newTeamA').value.trim();
    const teamB = document.getElementById('newTeamB').value.trim();
    const kickoffLocal = document.getElementById('newKickoff').value;
    const betMode = document.getElementById('newBetMode').value;
    const oddsHome = Number(document.getElementById('newOddsHome').value);
    const oddsDraw = Number(document.getElementById('newOddsDraw').value);
    const oddsAway = Number(document.getElementById('newOddsAway').value);
    const handicapLineRaw = document.getElementById('newHandicapLine').value;
    const oddsHandicapHomeRaw = document.getElementById('newOddsHandicapHome').value;
    const oddsHandicapAwayRaw = document.getElementById('newOddsHandicapAway').value;
    const scoreOdds = document.getElementById('newScoreOdds').value.trim();
    const kickoffAt = new Date(kickoffLocal).toISOString();
    const handicapLine = handicapLineRaw === '' ? null : Number(handicapLineRaw);
    const oddsHandicapHome = oddsHandicapHomeRaw === '' ? null : Number(oddsHandicapHomeRaw);
    const oddsHandicapAway = oddsHandicapAwayRaw === '' ? null : Number(oddsHandicapAwayRaw);

    if (betMode === 'HANDICAP') {
      if (handicapLine === null || Number.isNaN(handicapLine) || handicapLine < 0) {
        setMessage('Kèo chấp không hợp lệ. Ví dụ: 0.5', 'error');
        return;
      }
      if (oddsHandicapHome === null || oddsHandicapAway === null || oddsHandicapHome <= 1 || oddsHandicapAway <= 1) {
        setMessage('Odds kèo chấp phải lớn hơn 1. Ví dụ: 1.95 và 1.95', 'error');
        return;
      }
    }
    if (betMode === 'SCORE' && !scoreOdds) {
      setMessage('Vui lòng nhập odds tỷ số. Ví dụ: 1-0=9.3, 2-0=8.9', 'error');
      return;
    }

    await adminApi('/api/admin/matches', {
      method: 'POST',
      body: JSON.stringify({
        teamA, teamB, kickoffAt, oddsHome, oddsDraw, oddsAway,
        betMode,
        handicapLine,
        oddsHandicapHome,
        oddsHandicapAway,
        scoreOdds
      })
    });
    setMessage('Thêm trận thành công', 'success');
    await Promise.all([refresh(), renderAdminMatches()]);
  } catch (e) {
    setMessage(e.message, 'error');
  }
};

document.getElementById('scoreOddsImage').onchange = (e) => {
  const file = e.target.files?.[0];
  renderScoreOddsParsedPreview([]);
  if (!file) {
    setScoreOddsPreview('');
    return;
  }
  fileToDataUrl(file)
    .then((src) => setScoreOddsPreview(src, false))
    .catch(() => setScoreOddsPreview(''));
};

document.getElementById('btnClearScoreImage').onclick = () => {
  const input = document.getElementById('scoreOddsImage');
  input.value = '';
  setScoreOddsPreview('');
  renderScoreOddsParsedPreview([]);
  setMessage('Đã xóa ảnh upload. Nội dung odds trong ô nhập vẫn được giữ nguyên để bạn tự kiểm tra.', 'success');
};

document.getElementById('btnPasteScoreImage').onclick = async () => {
  try {
    if (!navigator.clipboard || !navigator.clipboard.read) {
      setMessage('Trình duyệt này chưa hỗ trợ đọc ảnh trực tiếp từ clipboard. Bạn thử Ctrl+V hoặc chọn file nhé.', 'error');
      return;
    }
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const imageType = item.types.find((type) => type.startsWith('image/'));
      if (!imageType) continue;
      const blob = await item.getType(imageType);
      const file = new File([blob], `score-odds-${Date.now()}.png`, { type: blob.type || 'image/png' });
      assignFileToScoreInput(file);
      const src = await fileToDataUrl(file);
      setScoreOddsPreview(src, false);
      renderScoreOddsParsedPreview([]);
      setMessage('Đã dán ảnh từ clipboard. Giờ bạn có thể bấm "Đọc ảnh odds".', 'success');
      return;
    }
    setMessage('Clipboard hiện chưa có ảnh. Hãy copy ảnh trước rồi thử lại.', 'error');
  } catch (e) {
    setMessage(`Không đọc được ảnh từ clipboard: ${e.message}`, 'error');
  }
};

document.addEventListener('paste', async (event) => {
  const betMode = document.getElementById('newBetMode')?.value;
  if (betMode !== 'SCORE') return;
  const items = Array.from(event.clipboardData?.items || []);
  const imageItem = items.find((item) => item.type && item.type.startsWith('image/'));
  if (!imageItem) return;

  event.preventDefault();
  const file = imageItem.getAsFile();
  if (!file) return;
  assignFileToScoreInput(file);
  try {
    const src = await fileToDataUrl(file);
    setScoreOddsPreview(src, false);
    renderScoreOddsParsedPreview([]);
    setMessage('Đã nhận ảnh từ Ctrl+V. Giờ bạn có thể bấm "Đọc ảnh odds".', 'success');
  } catch (e) {
    setMessage(`Không đọc được ảnh vừa dán: ${e.message}`, 'error');
  }
});

document.getElementById('btnParseScoreImage').onclick = async () => {
  try {
    const betMode = document.getElementById('newBetMode').value;
    if (betMode !== 'SCORE') {
      setMessage('Vui lòng chọn thể thức tỷ số chính xác trước khi đọc ảnh.', 'error');
      return;
    }
    const file = document.getElementById('scoreOddsImage').files?.[0];
    if (!file) {
      setMessage('Vui lòng chọn ảnh odds trước.', 'error');
      return;
    }
    if (!window.Tesseract || typeof window.Tesseract.recognize !== 'function') {
      setMessage('Không tải được OCR engine. Thử F5 lại trang rồi làm lại.', 'error');
      return;
    }

    setMessage('Đang đọc ảnh odds, vui lòng chờ...', 'success');
    const processed = await preprocessScoreOddsImage(file);
    setScoreOddsPreview(processed.previewUrl, true);
    const result = await window.Tesseract.recognize(processed.blob, 'eng');
    const pairs = extractScoreOddsPairsFromOcr(result?.data?.text || '');
    const parsed = pairs.map(({ score, odds }) => `${score}=${odds}`).join(', ');
    if (!pairs.length || !parsed) {
      renderScoreOddsParsedPreview([]);
      setMessage('Không nhận diện được odds từ ảnh. Hãy thử ảnh rõ hơn hoặc nhập tay.', 'error');
      return;
    }
    document.getElementById('newScoreOdds').value = parsed;
    renderScoreOddsParsedPreview(pairs);
    setMessage('Đã đọc ảnh và điền odds tỷ số. Vui lòng kiểm tra lại trước khi lưu.', 'success');
  } catch (e) {
    setMessage(`Đọc ảnh thất bại: ${e.message}`, 'error');
  }
};

window.settleMatch = function (matchId, result) {
  const rowTeamA = document.querySelector(`#score-home-${matchId}`)?.placeholder || 'Đội A';
  const rowTeamB = document.querySelector(`#score-away-${matchId}`)?.placeholder || 'Đội B';
  const resultText = result === 'HOME' ? rowTeamA : (result === 'AWAY' ? rowTeamB : 'Hòa');
  openAdminConfirm(
    `<p>Bạn sắp chốt kết quả trận <strong>${rowTeamA} vs ${rowTeamB}</strong>.</p><p><strong>Kết quả chọn:</strong> ${resultText}</p><p>Hành động này sẽ tính trả thưởng cho toàn bộ cược của trận.</p>`,
    async () => {
      await adminApi('/api/admin/settle', {
        method: 'POST',
        body: JSON.stringify({ matchId, result })
      });
      setMessage('Chốt kết quả thành công', 'success');
      await Promise.all([refresh(), renderAdminMatches()]);
    }
  );
};

window.settleByScore = function (matchId) {
  const homeEl = document.getElementById(`score-home-${matchId}`);
  const awayEl = document.getElementById(`score-away-${matchId}`);
  const homeScore = Number(homeEl.value);
  const awayScore = Number(awayEl.value);
  const teamA = homeEl?.placeholder || 'Đội A';
  const teamB = awayEl?.placeholder || 'Đội B';
  if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeEl.value === '' || awayEl.value === '') {
    setMessage('Vui lòng nhập đầy đủ tỷ số trước khi chốt.', 'error');
    return;
  }
  openAdminConfirm(
    `<p>Bạn sắp chốt tỷ số trận <strong>${teamA} vs ${teamB}</strong>.</p><p><strong>Tỷ số:</strong> ${homeScore} - ${awayScore}</p><p>Hành động này sẽ tính trả thưởng cho toàn bộ cược của trận.</p>`,
    async () => {
      await adminApi('/api/admin/settle', {
        method: 'POST',
        body: JSON.stringify({ matchId, homeScore, awayScore })
      });
      setMessage('Chốt tỷ số thành công', 'success');
      await Promise.all([refresh(), renderAdminMatches()]);
    }
  );
};

window.updateOdds = async function (matchId) {
  try {
    const oddsHome = Number(document.getElementById(`odds-home-${matchId}`).value);
    const oddsDraw = Number(document.getElementById(`odds-draw-${matchId}`).value);
    const oddsAway = Number(document.getElementById(`odds-away-${matchId}`).value);
    const betMode = document.getElementById(`mode-${matchId}`).value;
    const handicapLineRaw = document.getElementById(`hcp-line-${matchId}`).value;
    const oddsHandicapHomeRaw = document.getElementById(`hcp-home-${matchId}`).value;
    const oddsHandicapAwayRaw = document.getElementById(`hcp-away-${matchId}`).value;
    const scoreOdds = document.getElementById(`score-odds-${matchId}`).value.trim();
    await adminApi(`/api/admin/matches/${matchId}/odds`, {
      method: 'PUT',
      body: JSON.stringify({
        oddsHome, oddsDraw, oddsAway,
        betMode,
        handicapLine: handicapLineRaw === '' ? null : Number(handicapLineRaw),
        oddsHandicapHome: oddsHandicapHomeRaw === '' ? null : Number(oddsHandicapHomeRaw),
        oddsHandicapAway: oddsHandicapAwayRaw === '' ? null : Number(oddsHandicapAwayRaw),
        scoreOdds
      })
    });
    setMessage('Cập nhật kèo thành công', 'success');
    await Promise.all([refresh(), renderAdminMatches()]);
  } catch (e) {
    setMessage(e.message, 'error');
  }
};

window.recalculateMatch = async function (matchId) {
  try {
    const rs = await adminApi(`/api/admin/recalculate-match/${matchId}`, { method: 'POST' });
    setMessage(`Đã tính lại ${rs.adjustedBets} cược. Tổng chênh lệch điểm: ${rs.totalDelta}`, 'success');
    await Promise.all([refresh(), renderAdminMatches(), renderAdminUsers()]);
  } catch (e) {
    setMessage(e.message, 'error');
  }
};

window.exportMatchSettlement = function (matchId) {
  window.open(`/api/admin/matches/${matchId}/export-settlement`, '_blank');
};

window.deleteMatch = async function (matchId) {
  try {
    if (!window.confirm('Xóa trận chỉ nên dùng khi chưa có ai đặt cược. Bạn chắc chắn muốn xóa trận này?')) {
      return;
    }
    const result = await adminApi(`/api/admin/matches/${matchId}`, { method: 'DELETE' });
    setMessage(`Xóa trận thành công. Hoàn ${result.refundedBets || 0} cược.`, 'success');
    await Promise.all([refresh(), renderAdminMatches()]);
  } catch (e) {
    setMessage(e.message, 'error');
  }
};

window.adjustPoints = async function (userId, sign) {
  try {
    const raw = Number(document.getElementById(`delta-${userId}`).value);
    const delta = Math.trunc(raw) * sign;
    if (!Number.isInteger(delta) || delta === 0) {
      setMessage('Vui lòng nhập số điểm nguyên khác 0', 'error');
      return;
    }
    await adminApi(`/api/admin/users/${userId}/points`, {
      method: 'POST',
      body: JSON.stringify({ delta })
    });
    setMessage('Cập nhật điểm thành công', 'success');
    await Promise.all([refresh(), renderAdminUsers()]);
  } catch (e) {
    setMessage(e.message, 'error');
  }
};

window.savePermissions = async function (userId) {
  try {
    const canManageOdds = document.getElementById(`perm-odds-${userId}`)?.checked;
    const canSetResult = document.getElementById(`perm-result-${userId}`)?.checked;
    const canExportUserHistory = document.getElementById(`perm-export-${userId}`)?.checked;
    const isDisabled = document.getElementById(`perm-disabled-${userId}`)?.checked;
    await adminApi(`/api/admin/users/${userId}/permissions`, {
      method: 'POST',
      body: JSON.stringify({ canManageOdds, canSetResult, canExportUserHistory, isDisabled })
    });
    setMessage('Cập nhật quyền thành công', 'success');
    await Promise.all([refresh(), renderAdminUsers(), renderLeaderboard()]);
  } catch (e) {
    setMessage(e.message, 'error');
  }
};

window.exportUserHistory = function (userId) {
  window.open(`/api/admin/users/${userId}/export`, '_blank');
};

window.resetUserPassword = async function (userId) {
  try {
    if (!window.confirm('Reset mật khẩu user này về 123456?')) return;
    const result = await adminApi(`/api/admin/users/${userId}/reset-password`, { method: 'POST' });
    setMessage(`Đã reset mật khẩu user về mặc định: ${result.defaultPassword}`, 'success');
  } catch (e) {
    setMessage(e.message, 'error');
  }
};

window.saveSpecialPick = async function (marketKey) {
  try {
    const prediction = document.getElementById(`special-${marketKey}`).value.trim();
    await api('/api/specials/picks', {
      method: 'POST',
      body: JSON.stringify({ marketKey, prediction })
    });
    setMessage('Lưu dự đoán thành công', 'success');
    await renderSpecials();
  } catch (e) {
    setMessage(e.message, 'error');
  }
};

window.settleSpecial = async function (marketKey) {
  try {
    const result = document.getElementById(`settle-${marketKey}`).value.trim();
    await adminApi(`/api/admin/specials/${marketKey}/settle`, {
      method: 'POST',
      body: JSON.stringify({ result })
    });
    setMessage('Chốt dự đoán vui thành công', 'success');
    await Promise.all([refresh(), renderAdminSpecials()]);
  } catch (e) {
    setMessage(e.message, 'error');
  }
};

window.saveSpecialLockMode = async function (marketKey) {
  try {
    const lockMode = document.getElementById(`special-lock-${marketKey}`).value;
    await adminApi(`/api/admin/specials/${marketKey}/lock-mode`, {
      method: 'POST',
      body: JSON.stringify({ lockMode })
    });
    setMessage('Đã cập nhật trạng thái mở/khóa của hạng mục', 'success');
    await Promise.all([renderAdminSpecials(), renderSpecials()]);
  } catch (e) {
    setMessage(e.message, 'error');
  }
};

refresh().catch((e) => setMessage(e.message, 'error'));
setInterval(() => {
  renderHealth().catch(() => {});
}, 30000);
for (const button of els.tabButtons) {
  button.onclick = () => switchTab(button.dataset.tab);
}
if (els.adminMatchesOpenTab) {
  els.adminMatchesOpenTab.onclick = () => switchAdminMatchesTab('open');
}
if (els.adminMatchesHistoryTab) {
  els.adminMatchesHistoryTab.onclick = () => switchAdminMatchesTab('history');
}
switchTab(activeTabId);
switchAdminMatchesTab(activeAdminMatchesTab);
document.getElementById('newBetMode').onchange = syncNewMatchModeUI;
syncNewMatchModeUI();
