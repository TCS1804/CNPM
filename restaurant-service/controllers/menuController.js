const menuService = require('../services/menuService');
const path = require('path');

exports.getByRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await menuService.getByRestaurant(id);
    res.json(data);
  } catch (e) {
    console.error('getByRestaurant error:', e);
    res.status(500).json({ message: e.message });  }
};

exports.getAll = async (_req, res) => {
  try {
    const data = await menuService.getAll();
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.addItem = async (req, res) => {
  try {
    const { id } = req.params; // restaurantId
    const { name, description, price } = req.body;

    let imageUrl = '';
    if (req.files?.image) {
      const file = req.files.image;
      const filename = `${Date.now()}_${file.name}`;
      await file.mv(path.join(__dirname, '..', 'uploads', filename));

      const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
      imageUrl = `${base}/uploads/${filename}`; // <-- URL tuyệt đối
    }

    const item = await menuService.addItem(id, { name, description, price, imageUrl });
    res.json(item);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

exports.updateItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const doc = await menuService.updateItem(itemId, req.body);
    res.json(doc);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    await menuService.deleteItem(itemId);
    res.json({ message: 'Deleted' });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};
