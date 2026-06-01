async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }
    if (res.status === 403) {
      throw new Error('Bạn không có quyền thao tác chức năng này.');
    }
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

const els = {
  auth: document.getElementById('auth'),
  loginForm: document.getElementById('loginForm'),
  registerForm: document.getElementById('registerForm'),
  main: document.getElementById('main'),
  me: document.getElementById('me'),
  msg: document.getElementById('msg'),
  matches: document.getElementById('matches'),
  leaderboard: document.getElementById('leaderboard'),
  myBets: document.getElementById('myBets'),
  specialMarkets: document.getElementById('specialMarkets'),
  mySpecialPicks: document.getElementById('mySpecialPicks'),
  health: document.getElementById('health'),
  adminMatches: document.getElementById('adminMatches'),
  adminPanel: document.getElementById('adminPanel'),
  adminOnlyDailyBonus: document.getElementById('adminOnlyDailyBonus'),
  adminOnlyExtra: document.getElementById('adminOnlyExtra'),
  matchCreateRow: document.getElementById('matchCreateRow'),
  adminUsers: document.getElementById('adminUsers'),
  adminSpecials: document.getElementById('adminSpecials'),
  dailyBonusInfo: document.getElementById('dailyBonusInfo'),
  currentUserLabel: document.getElementById('currentUserLabel'),
  changePasswordForm: document.getElementById('changePasswordForm'),
  fullNameLockCard: document.getElementById('fullNameLockCard')
};
let currentUser = null;

function setVisible(el, visible) {
  if (!el) return;
  el.classList.toggle('hidden', !visible);
}

function syncNewMatchModeUI() {
  const modeEl = document.getElementById('newBetMode');
  if (!modeEl) return;
  const mode = modeEl.value;
  const is1x2 = mode === '1X2';
  setVisible(document.getElementById('newOddsHome'), is1x2);
  setVisible(document.getElementById('newOddsDraw'), is1x2);
  setVisible(document.getElementById('newOddsAway'), is1x2);
  setVisible(document.getElementById('newHandicapLine'), !is1x2);
  setVisible(document.getElementById('newOddsHandicapHome'), !is1x2);
  setVisible(document.getElementById('newOddsHandicapAway'), !is1x2);
}

function syncRowModeUI(matchId) {
  const modeEl = document.getElementById(`mode-${matchId}`);
  if (!modeEl) return;
  const is1x2 = modeEl.value === '1X2';
  const ids1x2 = [`odds-home-${matchId}`, `odds-draw-${matchId}`, `odds-away-${matchId}`];
  const idsHcp = [`hcp-line-${matchId}`, `hcp-home-${matchId}`, `hcp-away-${matchId}`];
  for (const id of ids1x2) {
    const el = document.getElementById(id);
    if (el) el.disabled = !is1x2;
  }
  for (const id of idsHcp) {
    const el = document.getElementById(id);
    if (el) el.disabled = is1x2;
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

function fmtTime(iso) {
  return new Date(iso).toLocaleString('vi-VN');
}

function pickLabel(pick) {
  if (pick === 'HOME') return 'Đội A thắng';
  if (pick === 'DRAW') return 'Hòa';
  return 'Đội B thắng';
}

function marketLabel(market, line) {
  if (market === 'HANDICAP') return `Kèo chấp (${line ?? 0})`;
  return '1X2';
}

function betStatusText(status) {
  if (status === 'won') return 'Thắng';
  if (status === 'lost') return 'Thua';
  if (status === 'refund') return 'Hoàn tiền';
  if (status === 'half_won') return 'Thắng nửa';
  if (status === 'half_lost') return 'Thua nửa';
  return status || '-';
}

function betPickText(bet) {
  if (bet.market === 'HANDICAP') {
    if (bet.pick === 'HOME') return `${bet.team_a} -${bet.handicap_line ?? 0}`;
    if (bet.pick === 'AWAY') return `${bet.team_b} +${bet.handicap_line ?? 0}`;
  }
  if (bet.pick === 'HOME') return `${bet.team_a} thắng`;
  if (bet.pick === 'DRAW') return 'Hòa';
  return `${bet.team_b} thắng`;
}

async function renderHealth() {
  try {
    const data = await api('/api/health');
    const updated = new Date(data.timestamp).toLocaleTimeString('vi-VN');
    const storage = data.storage === 'supabase' ? 'Supabase Online' : 'Local file';
    els.health.className = 'small health-line health-ok';
    els.health.textContent = `Trạng thái hệ thống: OK | Lưu dữ liệu: ${storage} | Check lúc ${updated}`;
  } catch (e) {
    els.health.className = 'small health-line health-bad';
    els.health.textContent = `Trạng thái hệ thống: Lỗi kiểm tra health (${e.message})`;
  }
}

async function adminApi(url, options = {}) {
  return api(url, options);
}

async function refresh() {
  const meRes = await api('/api/me');
  const user = meRes.user;

  if (!user) {
    currentUser = null;
    els.auth.classList.remove('hidden');
    els.main.classList.add('hidden');
    els.adminPanel.classList.add('hidden');
    els.adminMatches.innerHTML = '';
    els.adminUsers.innerHTML = '';
    els.currentUserLabel.textContent = '';
    els.fullNameLockCard.classList.add('hidden');
    els.changePasswordForm.classList.add('hidden');
    els.me.innerHTML = '<span class="badge">Chưa đăng nhập</span>';
    await renderHealth();
    showLoginForm();
    return;
  }

  els.auth.classList.add('hidden');
  els.main.classList.remove('hidden');
  const canOperate = user.is_admin || user.can_manage_odds || user.can_set_result;
  currentUser = user;
  if (canOperate) {
    els.adminPanel.classList.remove('hidden');
    els.adminOnlyDailyBonus.classList.toggle('hidden', !user.is_admin);
    els.adminOnlyExtra.classList.toggle('hidden', !user.is_admin);
    els.matchCreateRow.classList.toggle('hidden', !(user.is_admin || user.can_manage_odds));
    document.getElementById('btnAdminLoadUsers').classList.toggle('hidden', !user.is_admin);
    if (user.is_admin) {
      await renderDailyBonusConfig();
    }
  } else {
    els.adminPanel.classList.add('hidden');
  }
  const displayName = user.full_name && user.full_name.trim() ? user.full_name : user.username;
  els.currentUserLabel.textContent = `Tài khoản: ${user.username} | Họ tên: ${displayName}`;
  els.me.innerHTML = `<span class="badge">${displayName}</span> <span class="badge">${user.points} points</span>`;
  if (!user.full_name || !user.full_name.trim()) {
    els.fullNameLockCard.classList.remove('hidden');
  } else {
    els.fullNameLockCard.classList.add('hidden');
  }

  await Promise.all([renderMatches(), renderLeaderboard(), renderMyBets(), renderSpecials(), renderHealth()]);
}

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

async function renderAdminMatches() {
  try {
    const canManageOdds = Boolean(currentUser && (currentUser.is_admin || currentUser.can_manage_odds));
    const canSetResult = Boolean(currentUser && (currentUser.is_admin || currentUser.can_set_result));
    const canDelete = Boolean(currentUser && currentUser.is_admin);
    const data = await adminApi('/api/admin/matches');
    const rows = data.matches.map((m) => `
      <tr>
        <td>${m.id}</td>
        <td>${m.team_a}</td>
        <td>${m.team_b}</td>
        <td>${fmtTime(m.kickoff_at)}</td>
        <td>
          <select id="mode-${m.id}" ${canManageOdds ? '' : 'disabled'}>
            <option value="1X2" ${m.bet_mode === '1X2' ? 'selected' : ''}>1X2</option>
            <option value="HANDICAP" ${m.bet_mode === 'HANDICAP' ? 'selected' : ''}>Kèo chấp</option>
          </select>
        </td>
        <td>
          <input id="odds-home-${m.id}" type="number" step="0.01" min="1.01" value="${m.odds_home}" style="width:88px" ${canManageOdds ? '' : 'disabled'} />
        </td>
        <td>
          <input id="odds-draw-${m.id}" type="number" step="0.01" min="1.01" value="${m.odds_draw}" style="width:88px" ${canManageOdds ? '' : 'disabled'} />
        </td>
        <td>
          <input id="odds-away-${m.id}" type="number" step="0.01" min="1.01" value="${m.odds_away}" style="width:88px" ${canManageOdds ? '' : 'disabled'} />
        </td>
        <td>
          <input id="hcp-line-${m.id}" type="number" step="0.25" min="0" value="${m.handicap_line ?? ''}" style="width:88px" ${canManageOdds ? '' : 'disabled'} />
          <input id="hcp-home-${m.id}" type="number" step="0.01" min="1.01" value="${m.odds_handicap_home ?? ''}" style="width:88px" ${canManageOdds ? '' : 'disabled'} />
          <input id="hcp-away-${m.id}" type="number" step="0.01" min="1.01" value="${m.odds_handicap_away ?? ''}" style="width:88px" ${canManageOdds ? '' : 'disabled'} />
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
          ${canDelete ? `<button onclick="deleteMatch(${m.id})">Xóa</button>` : ''}
        </td>
      </tr>
    `).join('');
    els.adminMatches.innerHTML = `<table><thead><tr><th>ID</th><th>A</th><th>B</th><th>Giờ đá</th><th>Thể thức</th><th>1</th><th>X</th><th>2</th><th>Kèo chấp</th><th>KQ</th><th>Hành động</th></tr></thead><tbody>${rows}</tbody></table>`;
    for (const m of data.matches) {
      syncRowModeUI(m.id);
      const modeEl = document.getElementById(`mode-${m.id}`);
      if (modeEl) {
        modeEl.onchange = () => syncRowModeUI(m.id);
      }
    }
  } catch (e) {
    els.adminMatches.innerHTML = `<p class="small error">${e.message}</p>`;
  }
}

async function renderAdminUsers() {
  try {
    const data = await adminApi('/api/admin/users');
    const rows = data.users.map((u) => `
      <tr>
        <td>${u.id}</td>
        <td>${u.username}${u.is_admin ? ' (admin)' : ''}<br><span class="small">${u.full_name || '-'}</span></td>
        <td>${u.points}</td>
        <td>
          ${u.is_admin ? '<span class="small">Full</span>' : `
            <label><input type="checkbox" id="perm-odds-${u.id}" ${u.can_manage_odds ? 'checked' : ''} /> Set kèo</label><br>
            <label><input type="checkbox" id="perm-result-${u.id}" ${u.can_set_result ? 'checked' : ''} /> Set tỷ số/KQ</label><br>
            <button onclick="savePermissions(${u.id})">Lưu quyền</button>
          `}
        </td>
        <td>
          <input id="delta-${u.id}" type="number" step="1" value="100" style="width:90px" />
          <button onclick="adjustPoints(${u.id}, 1)">Cộng</button>
          <button onclick="adjustPoints(${u.id}, -1)">Trừ</button>
          <button onclick="resetUserPassword(${u.id})">Reset password</button>
          <button onclick="exportUserHistory(${u.id})">Export lịch sử</button>
        </td>
      </tr>
    `).join('');
    els.adminUsers.innerHTML = `<table><thead><tr><th>ID</th><th>User</th><th>Điểm</th><th>Phân quyền</th><th>Điều chỉnh</th></tr></thead><tbody>${rows}</tbody></table>`;
  } catch (e) {
    els.adminUsers.innerHTML = `<p class="small error">${e.message}</p>`;
  }
}

async function renderSpecials() {
  const data = await api('/api/specials');
  const formRows = data.markets.map((m) => `
    <tr>
      <td>${m.title}</td>
      <td>${m.result || '-'}</td>
      <td><input id="special-${m.key}" placeholder="Nhập dự đoán..." style="min-width:240px" /></td>
      <td><button onclick="saveSpecialPick('${m.key}')">Lưu dự đoán</button></td>
    </tr>
  `).join('');
  els.specialMarkets.innerHTML = `<table><thead><tr><th>Hạng mục</th><th>Kết quả chính thức</th><th>Dự đoán</th><th>Thao tác</th></tr></thead><tbody>${formRows}</tbody></table>`;

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
    const rows = data.markets.map((m) => `
      <tr>
        <td>${m.title}</td>
        <td>${m.total_picks}</td>
        <td>${m.result || '-'}</td>
        <td>
          <input id="settle-${m.key}" placeholder="Kết quả chính thức..." style="min-width:220px" />
          <button onclick="settleSpecial('${m.key}')">Chốt hạng mục</button>
        </td>
      </tr>
    `).join('');
    els.adminSpecials.innerHTML = `<table><thead><tr><th>Hạng mục</th><th>Số dự đoán</th><th>Kết quả</th><th>Thao tác</th></tr></thead><tbody>${rows}</tbody></table>`;
  } catch (e) {
    els.adminSpecials.innerHTML = `<p class="small error">${e.message}</p>`;
  }
}

async function renderMatches() {
  const data = await api('/api/matches');
  const rows = data.matches.map((m) => {
    const result = m.result ? `KQ: ${pickLabel(m.result)}` : 'Chưa có kết quả';
    const closed = Date.now() >= new Date(m.kickoff_at).getTime() || m.result;
    const mode = String(m.bet_mode || '1X2');
    const odds1Cell = mode === '1X2'
      ? `Kèo 1: Đội ${m.team_a} thắng<br><span class="small">Tỷ lệ: ${m.odds_home}</span>`
      : '<span class="small">-</span>';
    const oddsXCell = mode === '1X2'
      ? `Kèo X: Hòa<br><span class="small">Tỷ lệ: ${m.odds_draw}</span>`
      : '<span class="small">-</span>';
    const odds2Cell = mode === '1X2'
      ? `Kèo 2: Đội ${m.team_b} thắng<br><span class="small">Tỷ lệ: ${m.odds_away}</span>`
      : '<span class="small">-</span>';

    return `
      <tr>
        <td>${m.team_a} vs ${m.team_b}<br><span class="small">${fmtTime(m.kickoff_at)}</span></td>
        <td>${odds1Cell}</td>
        <td>${oddsXCell}</td>
        <td>${odds2Cell}</td>
        <td>${result}</td>
        <td>
          ${closed ? '<span class="small">Đã đóng</span>' : `
            ${mode === 'HANDICAP' ? `
              <span class="small">Thể thức: Kèo chấp</span><br>
              <span class="small">${m.team_a} -${m.handicap_line} (${m.odds_handicap_home}) | ${m.team_b} +${m.handicap_line} (${m.odds_handicap_away})</span><br>
              <select id="hcp-pick-${m.id}">
                <option value="HOME">${m.team_a} -${m.handicap_line}</option>
                <option value="AWAY">${m.team_b} +${m.handicap_line}</option>
              </select>
              <input id="hcp-stake-${m.id}" type="number" min="1" value="100" style="width:90px" />
              <button onclick="placeBet(${m.id}, 'HANDICAP')">Đặt kèo chấp</button>
            ` : `
              <span class="small">Thể thức: 1X2</span><br>
              <select id="pick-${m.id}">
                <option value="HOME">${m.team_a}</option>
                <option value="DRAW">Hòa</option>
                <option value="AWAY">${m.team_b}</option>
              </select>
              <input id="stake-${m.id}" type="number" min="1" value="100" style="width:90px" />
              <button onclick="placeBet(${m.id}, '1X2')">Đặt 1X2</button>
            `}
          `}
        </td>
      </tr>
    `;
  }).join('');

  els.matches.innerHTML = `
    <table>
      <thead><tr><th>Trận</th><th>Kèo 1 (đội nhà)</th><th>Kèo X (hòa)</th><th>Kèo 2 (đội khách)</th><th>Trạng thái</th><th>Đặt cược</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

async function renderLeaderboard() {
  const data = await api('/api/leaderboard');
  const rows = data.leaderboard.map((u, i) => `
    <tr><td>#${i + 1}</td><td>${u.username}</td><td>${u.points}</td></tr>
  `).join('');

  els.leaderboard.innerHTML = `<table><thead><tr><th>Rank</th><th>User</th><th>Points</th></tr></thead><tbody>${rows}</tbody></table>`;
}

async function renderMyBets() {
  const data = await api('/api/my-bets');
  const rows = data.bets.map((b) => `
    <tr>
      <td>${b.team_a} vs ${b.team_b}</td>
      <td>${marketLabel(b.market, b.handicap_line)}</td>
      <td>${betPickText(b)}</td>
      <td>${b.stake}</td>
      <td>${b.odds}</td>
      <td>${betStatusText(b.status)}</td>
      <td>${b.payout ?? '-'}</td>
      <td>
        ${(!b.result && Date.now() < new Date(b.kickoff_at).getTime() && b.status === 'open')
          ? `<button onclick="cancelBet(${b.id})">Rút</button>`
          : '<span class="small">-</span>'}
      </td>
    </tr>
  `).join('');

  els.myBets.innerHTML = `<table><thead><tr><th>Trận</th><th>Thể thức</th><th>Chọn</th><th>Cược</th><th>Tỷ lệ</th><th>KQ</th><th>Thưởng</th><th>Hành động</th></tr></thead><tbody>${rows}</tbody></table>`;
}

window.placeBet = async function (matchId, market = '1X2') {
  try {
    const pick = market === 'HANDICAP'
      ? document.getElementById(`hcp-pick-${matchId}`).value
      : document.getElementById(`pick-${matchId}`).value;
    const stake = Number(market === 'HANDICAP'
      ? document.getElementById(`hcp-stake-${matchId}`).value
      : document.getElementById(`stake-${matchId}`).value);
    await api('/api/bets', {
      method: 'POST',
      body: JSON.stringify({ matchId, market, pick, stake })
    });
    setMessage('Đặt cược thành công', 'success');
    await refresh();
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

    await adminApi('/api/admin/matches', {
      method: 'POST',
      body: JSON.stringify({
        teamA, teamB, kickoffAt, oddsHome, oddsDraw, oddsAway,
        betMode,
        handicapLine,
        oddsHandicapHome,
        oddsHandicapAway
      })
    });
    setMessage('Thêm trận thành công', 'success');
    await Promise.all([refresh(), renderAdminMatches()]);
  } catch (e) {
    setMessage(e.message, 'error');
  }
};

window.settleMatch = async function (matchId, result) {
  try {
    await adminApi('/api/admin/settle', {
      method: 'POST',
      body: JSON.stringify({ matchId, result })
    });
    setMessage('Chốt kết quả thành công', 'success');
    await Promise.all([refresh(), renderAdminMatches()]);
  } catch (e) {
    setMessage(e.message, 'error');
  }
};

window.settleByScore = async function (matchId) {
  try {
    const homeScore = Number(document.getElementById(`score-home-${matchId}`).value);
    const awayScore = Number(document.getElementById(`score-away-${matchId}`).value);
    await adminApi('/api/admin/settle', {
      method: 'POST',
      body: JSON.stringify({ matchId, homeScore, awayScore })
    });
    setMessage('Chốt tỷ số thành công', 'success');
    await Promise.all([refresh(), renderAdminMatches()]);
  } catch (e) {
    setMessage(e.message, 'error');
  }
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
    await adminApi(`/api/admin/matches/${matchId}/odds`, {
      method: 'PUT',
      body: JSON.stringify({
        oddsHome, oddsDraw, oddsAway,
        betMode,
        handicapLine: handicapLineRaw === '' ? null : Number(handicapLineRaw),
        oddsHandicapHome: oddsHandicapHomeRaw === '' ? null : Number(oddsHandicapHomeRaw),
        oddsHandicapAway: oddsHandicapAwayRaw === '' ? null : Number(oddsHandicapAwayRaw)
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

window.deleteMatch = async function (matchId) {
  try {
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
    await adminApi(`/api/admin/users/${userId}/permissions`, {
      method: 'POST',
      body: JSON.stringify({ canManageOdds, canSetResult })
    });
    setMessage('Cập nhật quyền thành công', 'success');
    await renderAdminUsers();
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

refresh().catch((e) => setMessage(e.message, 'error'));
setInterval(() => {
  renderHealth().catch(() => {});
}, 30000);
document.getElementById('newBetMode').onchange = syncNewMatchModeUI;
syncNewMatchModeUI();
