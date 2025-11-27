const menuService = require('../services/menuService');
const path = require('path');
const cloudinary = require("../config/cloudinary");

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

      // Upload lên Cloudinary
      const result = await cloudinary.uploader.upload(file.tempFilePath || file.tempFilePathLocal || file.path, {
        folder: "fastfood_menu",
      });

      imageUrl = result.secure_url;  // <-- LƯU URL TRỰC TIẾP CỦA CLOUDINARY
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

    // Chỉ cho update một số field cho an toàn
    const { name, description, price } = req.body;
    const patch = {};

    if (typeof name === 'string') patch.name = name.trim();
    if (typeof description === 'string') patch.description = description.trim();
    if (price !== undefined && price !== null && !Number.isNaN(Number(price))) {
      patch.price = Number(price);
    }

    // Nếu gửi kèm ảnh mới -> upload lên Cloudinary
    if (req.files?.image) {
      const file = req.files.image;

      const result = await cloudinary.uploader.upload(
        file.tempFilePath || file.tempFilePathLocal || file.path,
        {
          folder: 'fastfood_menu',
        }
      );

      patch.imageUrl = result.secure_url;
    }

    const doc = await menuService.updateItem(itemId, patch);
    if (!doc) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    res.json(doc);
  } catch (e) {
    console.error('updateItem error:', e);
    res.status(400).json({ message: e.message || 'Failed to update menu item' });
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
