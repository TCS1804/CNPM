const adminService = require('../services/adminService');

exports.listUsers = async (_req, res) => {
  try {
    const users = await adminService.getUsers();
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.listRestaurants = async (_req, res) => {
  try {
    const rs = await adminService.getRestaurants();
    res.json(rs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.verifyRestaurant = async (req, res) => {
  try {
    await adminService.verifyRestaurant(req.params.id);
    res.json({ message: 'Restaurant verified' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};
