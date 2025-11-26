const express = require('express');
const router = express.Router();
const { verifyToken, allowRoles } = require('../utils/jwt');
const CustomerProfile = require('../models/CustomerProfile');
const DeliveryProfile = require('../models/DeliveryProfile');

// Lấy profile customer của chính mình
router.get(
  '/customer/me',
  verifyToken,
  allowRoles('customer'),
  async (req, res) => {
    try {
      const userId = req.user.id || req.user._id;
      const profile = await CustomerProfile.findOne({ userId });
      res.json(profile || null);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  }
);

// Tạo / cập nhật profile customer
router.put(
  '/customer/me',
  verifyToken,
  allowRoles('customer'),
  async (req, res) => {
    try {
      const userId = req.user.id || req.user._id;
      const { fullName, phone, email, address, location } = req.body || {};

      const doc = await CustomerProfile.findOneAndUpdate(
        { userId },
        {
          fullName,
          phone,
          email,
          address,
          location: location || {},
          userId,
        },
        { new: true, upsert: true }
      );

      res.json(doc);
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  }
);

// Lấy profile shipper của chính mình
router.get(
  '/delivery/me',
  verifyToken,
  allowRoles('driver', 'delivery'),
  async (req, res) => {
    try {
      const userId = req.user.id || req.user._id;
      const profile = await DeliveryProfile.findOne({ userId });
      res.json(profile || null);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  }
);

// Tạo / cập nhật profile shipper
router.put(
  '/delivery/me',
  verifyToken,
  allowRoles('driver', 'delivery'),
  async (req, res) => {
    try {
      const userId = req.user.id || req.user._id;
      const { fullName, phone, vehicleType, note } = req.body || {};

      const doc = await DeliveryProfile.findOneAndUpdate(
        { userId },
        {
          fullName,
          phone,
          vehicleType,
          note,
          userId,
        },
        { new: true, upsert: true }
      );

      res.json(doc);
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  }
);

module.exports = router;
