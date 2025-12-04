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
 * Hard delete restaurant if no orders exist. Audit all attempts.
 */
exports.adminDelete = async (req, res) => {
  const AdminAudit = require('../models/AdminAudit');
  try {
    const id = req.params.id;
    const adminId = req.user?.id || 'unknown';

    console.log(`[restaurant-service] Admin ${adminId} requested delete for restaurant ${id}`);

    // Check with order-service whether restaurant has orders
    const axios = require('axios');
    const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://order-service:5003';
    const INTERNAL_SECRET = process.env.INTERNAL_SECRET || 'dev-secret';

    let orderCount = 0;
    let blockReason = null;

    try {
      const resp = await axios.get(
        `${ORDER_SERVICE_URL}/order/internal/restaurant/${id}/orders-count`,
        { headers: { 'x-internal-secret': INTERNAL_SECRET }, timeout: 5000 }
      );
      orderCount = resp.data?.count || 0;
      console.log(`[restaurant-service] Restaurant ${id} has ${orderCount} orders`);

      if (orderCount > 0) {
        blockReason = `has ${orderCount} orders`;
        console.log(`[restaurant-service] Deletion blocked for restaurant ${id} due to ${orderCount} orders`);
        
        // Log audit
        try {
          await AdminAudit.create({
            adminId,
            action: 'delete_attempt',
            targetType: 'restaurant',
            targetId: id,
            status: 'blocked',
            reason: blockReason,
            responseMessage: 'Cannot delete restaurant: there are existing orders for this restaurant',
          });
        } catch (auditErr) {
          console.warn('[restaurant-service] failed to log audit for blocked delete', auditErr.message || auditErr);
        }

        return res.status(400).json({ message: 'Cannot delete restaurant: there are existing orders for this restaurant' });
      }
    } catch (e) {
      // If order-service unreachable, be conservative and block deletion
      blockReason = 'Failed to verify orders with order-service';
      console.error('[restaurant-service] failed to verify orders before delete:', e.message || e);
      console.error('[restaurant-service] attempted URL:', `${ORDER_SERVICE_URL}/order/internal/restaurant/${id}/orders-count`);
      
      // Log audit
      try {
        await AdminAudit.create({
          adminId,
          action: 'delete_attempt',
          targetType: 'restaurant',
          targetId: id,
          status: 'blocked',
          reason: blockReason,
          responseMessage: 'Failed to verify restaurant orders. Try again later.',
        });
      } catch (auditErr) {
        console.warn('[restaurant-service] failed to log audit for failed verification', auditErr.message || auditErr);
      }

      return res.status(500).json({ message: 'Failed to verify restaurant orders. Try again later.' });
    }

    // No orders -> perform hard delete of restaurant and related menu items
    const doc = await restaurantService.hardDelete(id);
    if (!doc) {
      // Log audit
      try {
        await AdminAudit.create({
          adminId,
          action: 'delete_attempt',
          targetType: 'restaurant',
          targetId: id,
          status: 'error',
          reason: 'Restaurant not found',
          responseMessage: 'Restaurant not found',
        });
      } catch (auditErr) {
        console.warn('[restaurant-service] failed to log audit for not found', auditErr.message || auditErr);
      }

      return res.status(404).json({ message: 'Restaurant not found' });
    }

    console.log(`[restaurant-service] Admin ${adminId} hard deleted restaurant ${id}`);
    
    // Log successful deletion to audit
    try {
      await AdminAudit.create({
        adminId,
        action: 'delete_attempt',
        targetType: 'restaurant',
        targetId: id,
        status: 'success',
        reason: null,
        responseMessage: 'Restaurant deleted successfully (hard delete)',
      });
    } catch (auditErr) {
      console.warn('[restaurant-service] failed to log audit for successful delete', auditErr.message || auditErr);
    }

    res.json({ message: 'Restaurant deleted (hard delete)', restaurant: doc });
  } catch (e) {
    console.error('[restaurant-service] adminDelete error', e.message || e);
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
