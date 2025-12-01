const restaurantService = require('../services/restaurantService');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');

// ================== PUBLIC / RESTAURANT OWNER ==================

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

exports.getByIdPublic = async (req, res) => {
  try {
    const doc = await Restaurant.findById(req.params.id);

    // Không trả về restaurant đã bị xóa mềm
    if (!doc || doc.isDeleted) {
      return res
        .status(404)
        .json({ message: 'Restaurant not found or deleted' });
    }

    // Trả về thông tin cần thiết cho order-service
    res.json({
      _id: doc._id,
      name: doc.name,
      isActive: doc.isActive,
      isDeleted: doc.isDeleted,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.create = async (req, res) => {
  try {
    // đảm bảo có owner lấy từ token (restaurant tự tạo)
    const payload = {
      name: (req.body.name || '').trim(),
      owner: req.user?.id,
      address: (req.body.address || '').trim(),
      location: req.body.location || {},
    };

    if (!payload.name) throw new Error('name is required');
    if (!payload.owner) throw new Error('owner is required');
    const doc = await restaurantService.create(payload);
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

// ================== ADMIN – QUẢN LÝ RESTAURANT ==================

/**
 * GET /restaurant/admin/restaurants
 * Query: page, limit, search, owner, status
 */
exports.adminList = async (req, res) => {
  try {
    const { page, limit, search, owner, status } = req.query;
    const data = await restaurantService.adminSearch({
      page,
      limit,
      search,
      owner,
      status,
    });
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/**
 * GET /restaurant/admin/restaurants/:id
 */
exports.adminGetById = async (req, res) => {
  try {
    const doc = await restaurantService.getById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Restaurant not found' });
    res.json(doc);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/**
 * POST /restaurant/admin/restaurants
 * Body: { name, address, owner, location: { coordinates: { lat, lng } }, isActive? }
 */
exports.adminCreate = async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    const address = (req.body.address || '').trim();
    const ownerId = req.body.owner;
    const location = req.body.location || {};
    const isActive =
      typeof req.body.isActive === 'boolean' ? req.body.isActive : true;

    if (!name) throw new Error('name is required');
    if (!ownerId) throw new Error('owner is required');

    // RÀNG BUỘC: owner phải tồn tại & role = 'restaurant'
    const owner = await User.findById(ownerId);
    if (!owner) throw new Error('Owner user not found');
    if (owner.role !== 'restaurant') {
      throw new Error('Owner must have role "restaurant"');
    }

    // RÀNG BUỘC: mỗi owner chỉ 1 restaurant
    const existed = await Restaurant.findOne({ owner: ownerId });
    if (existed) {
      throw new Error('This owner already has a restaurant');
    }

    const payload = {
      name,
      owner: ownerId,
      address,
      location,
      isActive,
      isDeleted: false,
    };

    const doc = await restaurantService.create(payload);
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

/**
 * PUT /restaurant/admin/restaurants/:id
 * Body: { name?, address?, owner?, location?, isActive? }
 */
exports.adminUpdate = async (req, res) => {
  try {
    const id = req.params.id;

    const update = {};
    if (typeof req.body.name === 'string') {
      update.name = req.body.name.trim();
    }
    if (typeof req.body.address === 'string') {
      update.address = req.body.address.trim();
    }
    if (req.body.location) {
      update.location = req.body.location;
    }
    if (typeof req.body.isActive === 'boolean') {
      update.isActive = req.body.isActive;
    }

    // Nếu có truyền owner mới ⇒ check ràng buộc
    if (req.body.owner) {
      const ownerId = req.body.owner;

      const owner = await User.findById(ownerId);
      if (!owner) throw new Error('Owner user not found');
      if (owner.role !== 'restaurant') {
        throw new Error('Owner must have role "restaurant"');
      }

      // Không cho 1 owner sở hữu 2 nhà hàng
      const existed = await Restaurant.findOne({
        owner: ownerId,
        _id: { $ne: id },
      });
      if (existed) {
        throw new Error('This owner already has another restaurant');
      }

      update.owner = ownerId;
    }

    const doc = await restaurantService.update(id, update);
    if (!doc) return res.status(404).json({ message: 'Restaurant not found' });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

/**
 * DELETE /restaurant/admin/restaurants/:id
 * Thực chất là soft delete: isDeleted = true, isActive = false
 */
exports.adminDelete = async (req, res) => {
  try {
    const id = req.params.id;

    // Ở đây ta soft delete ⇒ không xóa hẳn để không làm lỗi Order / MenuItem
    const doc = await restaurantService.softDelete(id);
    if (!doc) return res.status(404).json({ message: 'Restaurant not found' });

    res.json({ message: 'Restaurant soft-deleted', restaurant: doc });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

/**
 * PATCH /restaurant/admin/restaurants/:id/status
 * Body: { isActive: boolean }
 */
exports.adminToggleActive = async (req, res) => {
  try {
    const id = req.params.id;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: 'isActive must be boolean' });
    }

    const doc = await restaurantService.setActive(id, isActive);
    if (!doc) return res.status(404).json({ message: 'Restaurant not found' });

    res.json(doc);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};
