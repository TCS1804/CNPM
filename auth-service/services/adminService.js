const User = require('../models/User');
const CustomerProfile = require('../models/CustomerProfile');
const DeliveryProfile = require('../models/DeliveryProfile');
const bcrypt = require('bcryptjs');      // ✅ mới
const crypto = require('crypto');        // ✅ mới

/**
 * Lấy danh sách user với phân trang + filter + search
 * query: { page, limit, search, role, status, verified }
 *
 * status:
 *  - 'all'      : bỏ qua
 *  - 'active'   : !isDeleted && !isLocked
 *  - 'locked'   : isLocked = true (và !isDeleted)
 *  - 'deleted'  : isDeleted = true
 */
exports.searchUsers = async (query = {}) => {
  let {
    page = 1,
    limit = 10,
    search,
    role,
    status = 'all',
    verified,
  } = query;

  page = Number(page) || 1;
  limit = Number(limit) || 10;
  const skip = (page - 1) * limit;

  const filter = {};

  // Search theo username (có thể mở rộng thêm email/phone nếu sau này lưu)
  if (search && search.trim()) {
    filter.username = { $regex: search.trim(), $options: 'i' };
  }

  // Filter theo role
  if (role && role !== 'all') {
    filter.role = role;
  }

  // Filter theo verified
  if (verified === 'true') {
    filter.verified = true;
  } else if (verified === 'false') {
    filter.verified = false;
  }

  // Filter theo status
  if (status === 'active') {
    filter.isDeleted = { $ne: true };
    filter.isLocked = { $ne: true };
  } else if (status === 'locked') {
    filter.isDeleted = { $ne: true };
    filter.isLocked = true;
  } else if (status === 'deleted') {
    filter.isDeleted = true;
  }
  // 'all' => không thêm điều kiện

  const [items, total] = await Promise.all([
    User.find(filter, '-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page,
    limit,
  };
};

// Giữ lại tương thích với code cũ nếu đang dùng ở đâu đó
exports.getUsers = () => User.find({}, '-password');

// Lấy riêng user role nhà hàng (chủ quán)
exports.getRestaurants = () => User.find({ role: 'restaurant' }, '-password');

// Đánh dấu verified cho user role nhà hàng (dùng cho verifyRestaurant cũ)
exports.verifyRestaurant = (id) => {
  if (!id) throw new Error('Missing id');
  return User.findByIdAndUpdate(id, { verified: true }, { new: true });
};

/**
 * Cập nhật user với các ràng buộc an toàn
 * payload chỉ cho phép 1 số field: role, verified, note, isLocked
 */
exports.updateUserSafe = async (id, payload = {}) => {
  if (!id) throw new Error('Missing user id');

  const user = await User.findById(id);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  if (user.isDeleted) {
    const err = new Error('User đã bị xóa, không thể chỉnh sửa');
    err.statusCode = 400;
    throw err;
  }

  const { role, verified, note, isLocked } = payload;

  // RÀNG BUỘC ĐỔI ROLE:
  if (role && role !== user.role) {
    // Nếu user hiện đang là 'restaurant' => không cho đổi role
    // (có thể mở rộng: check thêm trong restaurant-service xem còn nhà hàng không)
    if (user.role === 'restaurant') {
      const err = new Error(
        'User đang là chủ nhà hàng, không được phép đổi role trực tiếp. Hãy xử lý nhà hàng trước.'
      );
      err.statusCode = 400;
      throw err;
    }
    user.role = role;
  }

  if (typeof verified === 'boolean') {
    user.verified = verified;
  }

  if (typeof isLocked === 'boolean') {
    user.isLocked = isLocked;
  }

  if (typeof note === 'string') {
    user.note = note;
  }

  await user.save();
  const plain = user.toObject();
  delete plain.password;
  return plain;
};

/**
 * Soft delete user với ràng buộc:
 *  - Nếu còn CustomerProfile hoặc DeliveryProfile → KHÔNG cho xóa, chỉ nên khóa
 */
exports.softDeleteUserSafe = async (id) => {
  if (!id) throw new Error('Missing user id');

  const user = await User.findById(id);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  if (user.isDeleted) {
    return user; // đã xóa rồi thì thôi
  }

  // Kiểm tra profile
  const [cusProfile, delProfile] = await Promise.all([
    CustomerProfile.findOne({ userId: id }),
    DeliveryProfile.findOne({ userId: id }),
  ]);

  if (cusProfile || delProfile) {
    const err = new Error(
      'User còn liên kết profile (customer/delivery). Chỉ được phép khóa, không được xóa.'
    );
    err.statusCode = 400;
    throw err;
  }

  user.isDeleted = true;
  user.isLocked = true;

  await user.save();
  const plain = user.toObject();
  delete plain.password;
  return plain;
};

/**
 * Khóa/Mở khóa user (isLocked)
 */
exports.setUserLock = async (id, isLocked) => {
  if (!id) throw new Error('Missing user id');
  const user = await User.findByIdAndUpdate(
    id,
    { isLocked: !!isLocked },
    { new: true, projection: '-password' }
  );
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  return user;
};

exports.resetUserPassword = async (id) => {
  if (!id) throw new Error('Missing user id');

  const user = await User.findById(id);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  if (user.isDeleted) {
    const err = new Error('User đã bị xóa, không thể reset mật khẩu');
    err.statusCode = 400;
    throw err;
  }

  // tạo mật khẩu tạm
  const tempPassword = crypto.randomBytes(4).toString('hex');

  const hashed = await bcrypt.hash(tempPassword, 10);
  user.password = hashed;
  await user.save();

  return {
    userId: user._id,
    username: user.username,
    tempPassword, // trả cho admin xem 1 lần
  };
};

/**
 * Kiểm tra user có transaction history không
 * - customer: có order nào không
 * - restaurant: có order/menu nào không
 * - delivery: có delivery nào không
 */
const axios = require('axios');
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://order-service:5003';
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || 'dev-secret';

async function checkUserTransactions(userId, role) {
  const details = {
    orders: 0,
    deliveries: 0,
  };

  try {
    // For customers: ask order-service internal endpoint
    if (role === 'customer') {
      try {
        const resp = await axios.get(
          `${ORDER_SERVICE_URL}/order/internal/customer/${userId}/orders-count`,
          { headers: { 'x-internal-secret': INTERNAL_SECRET }, timeout: 5000 }
        );
        details.orders = Number(resp.data?.count || 0);
      } catch (e) {
        console.warn('[adminService] checkUserTransactions customer:', e.message || e);
        // fail-safe: treat as having transactions to block deletion
        details.orders = -1;
      }
    }

    // For delivery role: ask order-service internal driver assignments endpoint
    if (role === 'delivery') {
      try {
        const resp = await axios.get(
          `${ORDER_SERVICE_URL}/order/internal/driver/${userId}/assignments-count`,
          { headers: { 'x-internal-secret': INTERNAL_SECRET }, timeout: 5000 }
        );
        details.deliveries = Number(resp.data?.count || 0);
      } catch (e) {
        console.warn('[adminService] checkUserTransactions delivery:', e.message || e);
        details.deliveries = -1;
      }
    }

    // For restaurant role (rare): reuse the customer-style internal endpoint for restaurantId check
    if (role === 'restaurant') {
      try {
        const resp = await axios.get(
          `${ORDER_SERVICE_URL}/order/internal/restaurant/${userId}/orders-count`,
          { headers: { 'x-internal-secret': INTERNAL_SECRET }, timeout: 5000 }
        );
        details.orders = Number(resp.data?.count || 0);
      } catch (e) {
        console.warn('[adminService] checkUserTransactions restaurant:', e.message || e);
        details.orders = -1;
      }
    }
  } catch (e) {
    console.error('[adminService] checkUserTransactions error:', e.message || e);
  }

  const hasTransactions = (details.orders > 0) || (details.deliveries > 0) || (details.orders < 0) || (details.deliveries < 0);
  return { hasTransactions, details };
}

/**
 * Hard delete user (không soft delete) nếu không có transaction history
 * - Kiểm tra có profile/transaction không
 * - Nếu sạch sẽ: xóa khỏi DB
 * - Nếu còn giao dịch: báo lỗi
 */
exports.deleteUserNoTransactions = async (userId) => {
  if (!userId) throw new Error('Missing userId');

  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  if (user.role === 'admin') {
    const err = new Error('Cannot delete admin users');
    err.statusCode = 403;
    throw err;
  }

  // Kiểm tra profile
  const [cusProfile, delProfile] = await Promise.all([
    CustomerProfile.findOne({ userId }),
    DeliveryProfile.findOne({ userId }),
  ]);

  // Kiểm tra giao dịch
  const { hasTransactions, details } = await checkUserTransactions(userId, user.role);
  if (hasTransactions) {
    const err = new Error(
      `User còn giao dịch: ${JSON.stringify(details)}. Không thể xóa.`
    );
    err.statusCode = 400;
    throw err;
  }

  // Nếu sạch sẽ: xóa profile nếu có, rồi xóa user (hard delete)
  try {
    if (cusProfile) {
      await CustomerProfile.deleteOne({ _id: cusProfile._id });
    }
    if (delProfile) {
      await DeliveryProfile.deleteOne({ _id: delProfile._id });
    }
  } catch (e) {
    console.warn('[adminService] failed to delete profiles before user hard delete', e.message || e);
  }

  const deleted = await User.findByIdAndDelete(userId);
  return {
    message: 'User deleted successfully (hard delete)',
    deletedUser: deleted ? {
      id: deleted._id,
      username: deleted.username,
      role: deleted.role,
    } : null,
  };
};

