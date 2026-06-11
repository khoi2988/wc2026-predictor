(function () {
  const LANG_STORAGE_KEY = 'wc2026_lang';

  const dict = {
    vi: {
      pageTitle: 'World Cup 2026 Predictor LAN',
      heroTitle: 'World Cup 2026 Predictor',
      heroSubtitle: 'Game vui nội bộ: mỗi người có điểm ban đầu, đặt cược theo tỷ lệ và leo bảng xếp hạng.',
      loginTitle: 'Đăng nhập',
      loginButton: 'Vào chơi',
      loginHint: 'Chưa có tài khoản?',
      registerLink: 'Đăng ký',
      registerTitle: 'Đăng ký',
      registerButton: 'Tạo tài khoản',
      registerRule: 'Yêu cầu: username 3-24 ký tự, password tối thiểu 6 ký tự.',
      registerHint: 'Đã có tài khoản?',
      loginLink: 'Đăng nhập',
      tabOpenMatches: 'Các trận đang cho cược',
      tabClosedMatches: 'Các trận đã đóng cược',
      tabLeaderboard: 'Bảng xếp hạng',
      tabMyBets: 'Lịch sử cược',
      tabSpecials: 'Dự đoán vui',
      openMatchesTitle: 'Các trận đang cho cược',
      closedMatchesTitle: 'Các trận đã đóng cược',
      leaderboardTitle: 'Bảng xếp hạng',
      myBetsTitle: 'Cược của tôi',
      specialsTitle: 'Dự đoán vui World Cup',
      mySpecialPicksTitle: 'Dự đoán của tôi',
      adminPanelTitle: 'Bảng vận hành (Admin/Operator)',
      dailyBonusTitle: 'Điểm cộng mỗi ngày',
      dailyBonusEnabledLabel: 'Bật cộng điểm tự động',
      btnSaveDailyBonus: 'Lưu cấu hình',
      btnAdminLoad: 'Tải danh sách trận',
      btnAdminLoadUsers: 'Tải danh sách user',
      btnAddMatch: 'Thêm trận',
      adminSpecialsTitle: 'Chốt dự đoán vui',
      adminSpecialManualLockLabel: 'Khóa thủ công',
      btnSaveSpecialConfig: 'Lưu hạn dự đoán vui',
      adminUsersTitle: 'Quản lý điểm người chơi',
      btnBulkAddPoints: 'Cộng điểm cho toàn bộ user',
      btnBulkSubtractPoints: 'Trừ điểm toàn bộ user',
      btnResetAllPoints: 'Reset điểm toàn bộ user',
      btnShowChangePassword: 'Đổi mật khẩu',
      btnLogout: 'Đăng xuất',
      btnChangePassword: 'Cập nhật mật khẩu',
      fullNameLockTitle: 'Cập nhật họ và tên (chỉ 1 lần)',
      btnSetFullName: 'Lưu và khóa',
      fullNameLockHint: 'Sau khi lưu, bạn sẽ không thể chỉnh sửa lại.',
      betConfirmTitle: 'Xác nhận đặt cược',
      btnCancelBetConfirm: 'Xem lại',
      btnConfirmBet: 'Xác nhận đặt',
      placeholderFullName: 'Họ và tên',
      placeholderCurrentPassword: 'Mật khẩu hiện tại',
      placeholderNewPassword: 'Mật khẩu mới (>= 6 ký tự)',
      placeholderSetFullName: 'Nhập họ và tên của bạn',
      placeholderDailyBonusPoints: 'Điểm mỗi ngày',
      placeholderBulkPointsDelta: 'Điểm cộng/trừ',
      notLoggedIn: 'Chưa đăng nhập',
      accountLabel: 'Tài khoản',
      fullNameLabel: 'Họ tên',
      pointsLabel: 'điểm',
      placeholderNewBetMode1: 'Thể thức 1X2',
      placeholderNewBetMode2: 'Thể thức kèo chấp',
      pickHomeWin: 'Đội nhà thắng',
      pickAwayWin: 'Đội khách thắng',
      pickDraw: 'Hòa',
      market1x2: '1X2',
      marketHandicap: 'Kèo chấp ({line})',
      betStatusWon: 'Thắng',
      betStatusLost: 'Thua',
      betStatusRefund: 'Hoàn tiền',
      betStatusHalfWon: 'Thắng nửa',
      betStatusHalfLost: 'Thua nửa',
      betPickWin: '{team} thắng',
      confirmMatch: 'Trận',
      confirmMarket: 'Thể thức',
      confirmPick: 'Lựa chọn',
      confirmOdds: 'Tỷ lệ',
      confirmStake: 'Số điểm đặt',
      storageSupabase: 'Supabase Online',
      storageLocal: 'Local file',
      healthOk: 'Trạng thái hệ thống: OK | Lưu dữ liệu: {storage} | Check lúc {time}',
      healthError: 'Trạng thái hệ thống: Lỗi kiểm tra health ({message})',
      resultLabel: 'KQ: {result}',
      resultPending: 'Chưa có kết quả',
      odds1Text: 'Kèo 1: {team} thắng',
      oddsXText: 'Kèo X: Hòa',
      odds2Text: 'Kèo 2: {team} thắng',
      oddsRate: 'Tỷ lệ: {value}',
      statusClosedBetting: 'Đã đóng cược',
      betModeLabel1x2: 'Thể thức: 1X2',
      betModeLabelHandicap: 'Thể thức: Kèo chấp',
      betAction: 'Đặt',
      tableMatch: 'Trận',
      tableOdds1: 'Kèo 1 (đội nhà)',
      tableOddsX: 'Kèo X (hòa)',
      tableOdds2: 'Kèo 2 (đội khách)',
      tableStatus: 'Trạng thái',
      tableBet: 'Đặt cược',
      openMatchesEmpty: 'Hiện chưa có trận nào mở cược.',
      closedMatchesEmpty: 'Chưa có trận nào đóng cược.',
      leaderboardRank: 'Rank',
      leaderboardUser: 'User',
      leaderboardAvailable: 'Điểm đang có',
      leaderboardOnBet: 'Điểm đang đặt cược',
      leaderboardTotal: 'Điểm tổng',
      tableMode: 'Thể thức',
      myBetsChoice: 'Chọn',
      myBetsStake: 'Cược',
      myBetsOdds: 'Tỷ lệ',
      myBetsResult: 'KQ',
      myBetsPayout: 'Thưởng',
      myBetsAction: 'Hành động',
      cancelBet: 'Hủy'
    },
    en: {
      pageTitle: 'World Cup 2026 Predictor LAN',
      heroTitle: 'World Cup 2026 Predictor',
      heroSubtitle: 'Friendly internal game: everyone starts with points, bets on odds, and climbs the leaderboard.',
      loginTitle: 'Login',
      loginButton: 'Enter',
      loginHint: "Don't have an account?",
      registerLink: 'Register',
      registerTitle: 'Register',
      registerButton: 'Create account',
      registerRule: 'Requirement: username 3-24 characters, password at least 6 characters.',
      registerHint: 'Already have an account?',
      loginLink: 'Login',
      tabOpenMatches: 'Open for betting',
      tabClosedMatches: 'Closed matches',
      tabLeaderboard: 'Leaderboard',
      tabMyBets: 'Bet history',
      tabSpecials: 'Fun predictions',
      openMatchesTitle: 'Open for betting',
      closedMatchesTitle: 'Closed matches',
      leaderboardTitle: 'Leaderboard',
      myBetsTitle: 'My bets',
      specialsTitle: 'World Cup fun predictions',
      mySpecialPicksTitle: 'My predictions',
      adminPanelTitle: 'Operations panel (Admin/Operator)',
      dailyBonusTitle: 'Daily bonus points',
      dailyBonusEnabledLabel: 'Enable automatic daily bonus',
      btnSaveDailyBonus: 'Save config',
      btnAdminLoad: 'Load matches',
      btnAdminLoadUsers: 'Load users',
      btnAddMatch: 'Add match',
      adminSpecialsTitle: 'Settle fun predictions',
      adminSpecialManualLockLabel: 'Manual lock',
      btnSaveSpecialConfig: 'Save prediction deadline',
      adminUsersTitle: 'Player points management',
      btnBulkAddPoints: 'Add points to all users',
      btnBulkSubtractPoints: 'Subtract points from all users',
      btnResetAllPoints: 'Reset all users points',
      btnShowChangePassword: 'Change password',
      btnLogout: 'Logout',
      btnChangePassword: 'Update password',
      fullNameLockTitle: 'Set full name (one time only)',
      btnSetFullName: 'Save and lock',
      fullNameLockHint: 'After saving, you will not be able to edit it again.',
      betConfirmTitle: 'Confirm bet',
      btnCancelBetConfirm: 'Review',
      btnConfirmBet: 'Confirm',
      placeholderFullName: 'Full name',
      placeholderCurrentPassword: 'Current password',
      placeholderNewPassword: 'New password (>= 6 characters)',
      placeholderSetFullName: 'Enter your full name',
      placeholderDailyBonusPoints: 'Points per day',
      placeholderBulkPointsDelta: 'Points to add/subtract',
      notLoggedIn: 'Not logged in',
      accountLabel: 'Account',
      fullNameLabel: 'Full name',
      pointsLabel: 'points',
      placeholderNewBetMode1: '1X2 mode',
      placeholderNewBetMode2: 'Handicap mode',
      pickHomeWin: 'Home team wins',
      pickAwayWin: 'Away team wins',
      pickDraw: 'Draw',
      market1x2: '1X2',
      marketHandicap: 'Handicap ({line})',
      betStatusWon: 'Won',
      betStatusLost: 'Lost',
      betStatusRefund: 'Refund',
      betStatusHalfWon: 'Half won',
      betStatusHalfLost: 'Half lost',
      betPickWin: '{team} wins',
      confirmMatch: 'Match',
      confirmMarket: 'Market',
      confirmPick: 'Pick',
      confirmOdds: 'Odds',
      confirmStake: 'Stake',
      storageSupabase: 'Supabase Online',
      storageLocal: 'Local file',
      healthOk: 'System status: OK | Storage: {storage} | Checked at {time}',
      healthError: 'System status: Health check failed ({message})',
      resultLabel: 'Result: {result}',
      resultPending: 'No result yet',
      odds1Text: '1: {team} wins',
      oddsXText: 'X: Draw',
      odds2Text: '2: {team} wins',
      oddsRate: 'Odds: {value}',
      statusClosedBetting: 'Betting closed',
      betModeLabel1x2: 'Mode: 1X2',
      betModeLabelHandicap: 'Mode: Handicap',
      betAction: 'Bet',
      tableMatch: 'Match',
      tableOdds1: '1 (home)',
      tableOddsX: 'X (draw)',
      tableOdds2: '2 (away)',
      tableStatus: 'Status',
      tableBet: 'Bet',
      openMatchesEmpty: 'There are no matches currently open for betting.',
      closedMatchesEmpty: 'There are no closed matches yet.',
      leaderboardRank: 'Rank',
      leaderboardUser: 'User',
      leaderboardAvailable: 'Available points',
      leaderboardOnBet: 'Points on bet',
      leaderboardTotal: 'Total points',
      tableMode: 'Mode',
      myBetsChoice: 'Pick',
      myBetsStake: 'Stake',
      myBetsOdds: 'Odds',
      myBetsResult: 'Result',
      myBetsPayout: 'Payout',
      myBetsAction: 'Action',
      cancelBet: 'Cancel'
    }
  };

  function getLang() {
    return localStorage.getItem(LANG_STORAGE_KEY) === 'en' ? 'en' : 'vi';
  }

  function t(key, params = {}, fallback = key) {
    let value = dict[getLang()][key] || dict.vi[key] || fallback;
    for (const [name, v] of Object.entries(params)) {
      value = value.replaceAll(`{${name}}`, String(v));
    }
    return value;
  }

  function locale() {
    return getLang() === 'en' ? 'en-US' : 'vi-VN';
  }

  function setText(id, key) {
    const el = document.getElementById(id);
    if (el) el.textContent = t(key);
  }

  function setPlaceholder(id, key) {
    const el = document.getElementById(id);
    if (el) el.placeholder = t(key);
  }

  function applyStatic() {
    document.documentElement.lang = getLang();
    document.title = t('pageTitle');
    setText('heroTitle', 'heroTitle');
    setText('heroSubtitle', 'heroSubtitle');
    setText('loginTitle', 'loginTitle');
    setText('btnLogin', 'loginButton');
    setText('loginHint', 'loginHint');
    setText('showRegister', 'registerLink');
    setText('registerTitle', 'registerTitle');
    setText('btnRegister', 'registerButton');
    setText('registerRule', 'registerRule');
    setText('registerHint', 'registerHint');
    setText('showLogin', 'loginLink');
    setText('tabOpenMatches', 'tabOpenMatches');
    setText('tabClosedMatches', 'tabClosedMatches');
    setText('tabLeaderboard', 'tabLeaderboard');
    setText('tabMyBets', 'tabMyBets');
    setText('tabSpecials', 'tabSpecials');
    setText('openMatchesTitle', 'openMatchesTitle');
    setText('closedMatchesTitle', 'closedMatchesTitle');
    setText('leaderboardTitle', 'leaderboardTitle');
    setText('myBetsTitle', 'myBetsTitle');
    setText('specialsTitle', 'specialsTitle');
    setText('mySpecialPicksTitle', 'mySpecialPicksTitle');
    setText('adminPanelTitle', 'adminPanelTitle');
    setText('dailyBonusTitle', 'dailyBonusTitle');
    setText('dailyBonusEnabledLabel', 'dailyBonusEnabledLabel');
    setText('btnSaveDailyBonus', 'btnSaveDailyBonus');
    setText('btnAdminLoad', 'btnAdminLoad');
    setText('btnAdminLoadUsers', 'btnAdminLoadUsers');
    setText('btnAddMatch', 'btnAddMatch');
    setText('adminSpecialsTitle', 'adminSpecialsTitle');
    setText('adminSpecialManualLockLabel', 'adminSpecialManualLockLabel');
    setText('btnSaveSpecialConfig', 'btnSaveSpecialConfig');
    setText('adminUsersTitle', 'adminUsersTitle');
    setText('btnBulkAddPoints', 'btnBulkAddPoints');
    setText('btnBulkSubtractPoints', 'btnBulkSubtractPoints');
    setText('btnResetAllPoints', 'btnResetAllPoints');
    setText('btnShowChangePassword', 'btnShowChangePassword');
    setText('btnLogout', 'btnLogout');
    setText('btnChangePassword', 'btnChangePassword');
    setText('fullNameLockTitle', 'fullNameLockTitle');
    setText('btnSetFullName', 'btnSetFullName');
    setText('fullNameLockHint', 'fullNameLockHint');
    setText('betConfirmTitle', 'betConfirmTitle');
    setText('btnCancelBetConfirm', 'btnCancelBetConfirm');
    setText('btnConfirmBet', 'btnConfirmBet');

    setPlaceholder('regFullName', 'placeholderFullName');
    setPlaceholder('currentPassword', 'placeholderCurrentPassword');
    setPlaceholder('newPassword', 'placeholderNewPassword');
    setPlaceholder('setFullNameInput', 'placeholderSetFullName');
    setPlaceholder('dailyBonusPoints', 'placeholderDailyBonusPoints');
    setPlaceholder('bulkPointsDelta', 'placeholderBulkPointsDelta');

    const betMode = document.getElementById('newBetMode');
    if (betMode?.options?.[0]) betMode.options[0].text = t('placeholderNewBetMode1');
    if (betMode?.options?.[1]) betMode.options[1].text = t('placeholderNewBetMode2');

    document.querySelectorAll('.lang-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.lang === getLang());
    });
  }

  window.__i18n = { getLang, t, locale };

  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      localStorage.setItem(LANG_STORAGE_KEY, btn.dataset.lang === 'en' ? 'en' : 'vi');
      applyStatic();
      if (typeof window.refresh === 'function') {
        try { await window.refresh(); } catch (_) {}
      }
    });
  });

  applyStatic();
  if (typeof window.refresh === 'function') {
    window.refresh().catch(() => {});
  }
})();
