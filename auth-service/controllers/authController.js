const authService = require('../services/authService');

exports.register = async (req, res) => {
  try {
    await authService.register(req.body); // { username, password, role }
    res.status(201).json({ message: 'User registered' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

exports.login = async (req, res) => {
  try {
    const data = await authService.login(req.body); // -> { token, role }
    res.json(data);
  } catch (e) {
    const status = (e && e.statusCode) || 401;
    res.status(status).json({ error: e.message || 'Unauthorized' });
  }
};

// POST /auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    await authService.forgotPassword(req.body || {});
    // luôn trả OK, không lộ user có tồn tại hay không
    res.json({
      message:
        'If this account exists, a reset email has been sent.',
    });
  } catch (e) {
    console.error('[authController] forgotPassword error:', e);
    res
      .status(e.statusCode || 500)
      .json({ error: e.message || 'Internal error' });
  }
};

// POST /auth/reset-password
exports.resetPassword = async (req, res) => {
  try {
    await authService.resetPassword(req.body || {});
    res.json({
      message: 'Password has been reset. You can login with new password.',
    });
  } catch (e) {
    console.error('[authController] resetPassword error:', e);
    res
      .status(e.statusCode || 500)
      .json({ error: e.message || 'Internal error' });
  }
};

// POST /auth/change-password (cần verifyToken + allowRoles ở route)
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    await authService.changePassword(userId, req.body || {});
    res.json({ message: 'Password changed successfully.' });
  } catch (e) {
    console.error('[authController] changePassword error:', e);
    res
      .status(e.statusCode || 500)
      .json({ error: e.message || 'Internal error' });
  }
};


