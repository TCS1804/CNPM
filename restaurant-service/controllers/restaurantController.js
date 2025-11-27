const restaurantService = require('../services/restaurantService');

exports.list = async (_req, res) => {
  try {
    const data = await restaurantService.list();
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.listIds = async (req, res) => {
  try {
    const filter = {};

    // Nếu là restaurant ⇒ chỉ trả về nhà hàng thuộc owner đó
    if (req.user?.role === 'restaurant') {
      const ownerId = req.user.id || req.user._id;
      filter.owner = ownerId;
    }

    // Nếu là admin có thể để filter trống để lấy tất cả
    const data = await restaurantService.listIds(filter);
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.create = async (req, res) => {
  try {
    // đảm bảo có owner lấy từ token
    const payload = {
      name: (req.body.name || '').trim(),
      owner: req.user?.id,
      address: (req.body.address || '').trim(),
      location: req.body.location || {}
    };

    if (!payload.name) throw new Error('name is required');
    if (!payload.owner) throw new Error('owner is required');
    const doc = await restaurantService.create(payload);
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};
