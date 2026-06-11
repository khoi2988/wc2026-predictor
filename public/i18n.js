(function () {
  const LANG_STORAGE_KEY = 'wc2026_lang';
  const current = localStorage.getItem(LANG_STORAGE_KEY) === 'en' ? 'en' : 'vi';

  const text = {
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
      regFullName: 'Họ và tên',
      currentPassword: 'Mật khẩu hiện tại',
      newPassword: 'Mật khẩu mới (>= 6 ký tự)',
      setFullNameInput: 'Nhập họ và tên của bạn',
      dailyBonusPoints: 'Điểm mỗi ngày',
      bulkPointsDelta: 'Điểm cộng/trừ'
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
      regFullName: 'Full name',
      currentPassword: 'Current password',
      newPassword: 'New password (>= 6 characters)',
      setFullNameInput: 'Enter your full name',
      dailyBonusPoints: 'Points per day',
      bulkPointsDelta: 'Points to add/subtract'
    }
  };

  function lang() {
    return localStorage.getItem(LANG_STORAGE_KEY) === 'en' ? 'en' : 'vi';
  }

  function tr(key) {
    return text[lang()][key] || text.vi[key] || key;
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function setPlaceholder(id, value) {
    const el = document.getElementById(id);
    if (el) el.placeholder = value;
  }

  function replaceCommonText(root) {
    if (!root) return;
    const html = root.innerHTML
      .replaceAll('Các trận đang cho cược', tr('tabOpenMatches'))
      .replaceAll('Các trận đã đóng cược', tr('tabClosedMatches'))
      .replaceAll('Bảng xếp hạng', tr('tabLeaderboard'))
      .replaceAll('Lịch sử cược', tr('tabMyBets'))
      .replaceAll('Dự đoán vui', tr('tabSpecials'))
      .replaceAll('Đặt cược', lang() === 'en' ? 'Bet' : 'Đặt cược')
      .replaceAll('Trạng thái', lang() === 'en' ? 'Status' : 'Trạng thái')
      .replaceAll('Thể thức', lang() === 'en' ? 'Mode' : 'Thể thức')
      .replaceAll('Hành động', lang() === 'en' ? 'Action' : 'Hành động')
      .replaceAll('Thưởng', lang() === 'en' ? 'Payout' : 'Thưởng')
      .replaceAll('Tỷ lệ', lang() === 'en' ? 'Odds' : 'Tỷ lệ')
      .replaceAll('Cược của tôi', tr('myBetsTitle'))
      .replaceAll('Dự đoán của tôi', tr('mySpecialPicksTitle'))
      .replaceAll('Đã đóng cược', lang() === 'en' ? 'Betting closed' : 'Đã đóng cược')
      .replaceAll('Chưa có kết quả', lang() === 'en' ? 'No result yet' : 'Chưa có kết quả')
      .replaceAll('Hủy', lang() === 'en' ? 'Cancel' : 'Hủy')
      .replaceAll('Đặt', lang() === 'en' ? 'Bet' : 'Đặt')
      .replaceAll('Thắng nửa', lang() === 'en' ? 'Half won' : 'Thắng nửa')
      .replaceAll('Thắng', lang() === 'en' ? 'Won' : 'Thắng')
      .replaceAll('Thua nửa', lang() === 'en' ? 'Half lost' : 'Thua nửa')
      .replaceAll('Thua', lang() === 'en' ? 'Lost' : 'Thua')
      .replaceAll('Hoàn tiền', lang() === 'en' ? 'Refund' : 'Hoàn tiền')
      .replaceAll('Hòa', lang() === 'en' ? 'Draw' : 'Hòa')
      .replaceAll('Điểm đang có', lang() === 'en' ? 'Available points' : 'Điểm đang có')
      .replaceAll('Điểm đang đặt cược', lang() === 'en' ? 'Points on bet' : 'Điểm đang đặt cược')
      .replaceAll('Điểm tổng', lang() === 'en' ? 'Total points' : 'Điểm tổng');
    if (html !== root.innerHTML) root.innerHTML = html;
  }

  function applyLanguage() {
    document.documentElement.lang = lang();
    document.title = tr('pageTitle');

    setText('heroTitle', tr('heroTitle'));
    setText('heroSubtitle', tr('heroSubtitle'));
    setText('loginTitle', tr('loginTitle'));
    setText('btnLogin', tr('loginButton'));
    setText('loginHint', tr('loginHint'));
    setText('showRegister', tr('registerLink'));
    setText('registerTitle', tr('registerTitle'));
    setText('btnRegister', tr('registerButton'));
    setText('registerRule', tr('registerRule'));
    setText('registerHint', tr('registerHint'));
    setText('showLogin', tr('loginLink'));
    setText('tabOpenMatches', tr('tabOpenMatches'));
    setText('tabClosedMatches', tr('tabClosedMatches'));
    setText('tabLeaderboard', tr('tabLeaderboard'));
    setText('tabMyBets', tr('tabMyBets'));
    setText('tabSpecials', tr('tabSpecials'));
    setText('openMatchesTitle', tr('openMatchesTitle'));
    setText('closedMatchesTitle', tr('closedMatchesTitle'));
    setText('leaderboardTitle', tr('leaderboardTitle'));
    setText('myBetsTitle', tr('myBetsTitle'));
    setText('specialsTitle', tr('specialsTitle'));
    setText('mySpecialPicksTitle', tr('mySpecialPicksTitle'));
    setText('adminPanelTitle', tr('adminPanelTitle'));
    setText('dailyBonusTitle', tr('dailyBonusTitle'));
    setText('dailyBonusEnabledLabel', tr('dailyBonusEnabledLabel'));
    setText('btnSaveDailyBonus', tr('btnSaveDailyBonus'));
    setText('btnAdminLoad', tr('btnAdminLoad'));
    setText('btnAdminLoadUsers', tr('btnAdminLoadUsers'));
    setText('btnAddMatch', tr('btnAddMatch'));
    setText('adminSpecialsTitle', tr('adminSpecialsTitle'));
    setText('adminSpecialManualLockLabel', tr('adminSpecialManualLockLabel'));
    setText('btnSaveSpecialConfig', tr('btnSaveSpecialConfig'));
    setText('adminUsersTitle', tr('adminUsersTitle'));
    setText('btnBulkAddPoints', tr('btnBulkAddPoints'));
    setText('btnBulkSubtractPoints', tr('btnBulkSubtractPoints'));
    setText('btnResetAllPoints', tr('btnResetAllPoints'));
    setText('btnShowChangePassword', tr('btnShowChangePassword'));
    setText('btnLogout', tr('btnLogout'));
    setText('btnChangePassword', tr('btnChangePassword'));
    setText('fullNameLockTitle', tr('fullNameLockTitle'));
    setText('btnSetFullName', tr('btnSetFullName'));
    setText('fullNameLockHint', tr('fullNameLockHint'));
    setText('betConfirmTitle', tr('betConfirmTitle'));
    setText('btnCancelBetConfirm', tr('btnCancelBetConfirm'));
    setText('btnConfirmBet', tr('btnConfirmBet'));

    setPlaceholder('regFullName', tr('regFullName'));
    setPlaceholder('currentPassword', tr('currentPassword'));
    setPlaceholder('newPassword', tr('newPassword'));
    setPlaceholder('setFullNameInput', tr('setFullNameInput'));
    setPlaceholder('dailyBonusPoints', tr('dailyBonusPoints'));
    setPlaceholder('bulkPointsDelta', tr('bulkPointsDelta'));

    const betMode = document.getElementById('newBetMode');
    if (betMode?.options?.[0]) betMode.options[0].text = lang() === 'en' ? '1X2 mode' : 'Thể thức 1X2';
    if (betMode?.options?.[1]) betMode.options[1].text = lang() === 'en' ? 'Handicap mode' : 'Thể thức kèo chấp';

    document.querySelectorAll('.lang-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.lang === lang());
    });

    replaceCommonText(document.body);
  }

  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      localStorage.setItem(LANG_STORAGE_KEY, btn.dataset.lang === 'en' ? 'en' : 'vi');
      applyLanguage();
    });
  });

  const observer = new MutationObserver(() => {
    clearTimeout(window.__wc2026I18nTimer);
    window.__wc2026I18nTimer = setTimeout(applyLanguage, 40);
  });

  observer.observe(document.body, { childList: true, subtree: true });
  applyLanguage();
})();
