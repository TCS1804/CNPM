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
