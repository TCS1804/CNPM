const Restaurant = require('../models/Restaurant');

exports.list = () => {
  // Public list cho khách / màn khác: chỉ trả về nhà hàng chưa bị xóa
  return Restaurant.find({ isDeleted: { $ne: true } });
};

exports.listIds = (filter = {}) => {
  // Dùng cho restaurant owner hoặc admin, nhưng vẫn nên loại deleted
  const baseFilter = { isDeleted: { $ne: true }, ...filter };
  return Restaurant.find(baseFilter).select('_id name isActive isDeleted');
};

exports.create = (payload) => new Restaurant(payload).save();

// ========== PHẦN DÀNH CHO ADMIN ==========

/**
 * Tìm kiếm / phân trang cho admin
 * @param {Object} options
 *  - page, limit
 *  - search (tên)
 *  - owner (ownerId)
 *  - status: 'active' | 'inactive' | 'deleted' | undefined
 */
exports.adminSearch = async (options = {}) => {
  const {
    page = 1,
    limit = 10,
    search,
    owner,
    status,
  } = options;

  const filter = {};

  // Trạng thái
  if (status === 'active') {
    filter.isDeleted = { $ne: true };
    filter.isActive = true;
  } else if (status === 'inactive') {
    filter.isDeleted = { $ne: true };
    filter.isActive = false;
  } else if (status === 'deleted') {
    filter.isDeleted = true;
  } else {
    // mặc định: tất cả trừ deleted
    filter.isDeleted = { $ne: true };
  }

  if (owner) {
    filter.owner = owner;
  }

  if (search) {
    filter.name = { $regex: search, $options: 'i' };
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    Restaurant.find(filter)
      .populate('owner', 'username role verified')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Restaurant.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page: pageNum,
    limit: limitNum,
  };
};

exports.getById = (id) =>
  Restaurant.findById(id).populate('owner', 'username role verified');

exports.update = (id, payload) =>
  Restaurant.findByIdAndUpdate(id, payload, { new: true });

exports.softDelete = (id) =>
  Restaurant.findByIdAndUpdate(
    id,
    { isDeleted: true, isActive: false },
    { new: true }
  );

exports.setActive = (id, isActive) =>
  Restaurant.findByIdAndUpdate(
    id,
    { isActive },
    { new: true }
  );
