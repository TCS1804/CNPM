const adminService = require('../services/adminService');

// Danh sách user với search + filter + pagination
exports.listUsers = async (req, res) => {
  try {
    const data = await adminService.searchUsers(req.query);
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};

// Danh sách user role=restaurant (dùng cho AdminRestaurants)
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
    const updated = await adminService.verifyRestaurant(req.params.id);
    res.json({ message: 'Restaurant verified', user: updated });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

// Cập nhật user (role, verified, note, isLocked)
exports.updateUser = async (req, res) => {
  try {
    const updated = await adminService.updateUserSafe(req.params.id, req.body || {});
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};

// Soft delete user với ràng buộc (không xóa nếu còn profile)
exports.deleteUser = async (req, res) => {
  try {
    const deleted = await adminService.softDeleteUserSafe(req.params.id);
    res.json(deleted);
  } catch (e) {
    console.error(e);
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};

// Khóa / mở khóa user
exports.lockUser = async (req, res) => {
  try {
    const { isLocked } = req.body || {};
    const updated = await adminService.setUserLock(req.params.id, !!isLocked);
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};

// Reset mật khẩu user, trả về mật khẩu tạm để admin gửi cho user
exports.resetUserPassword = async (req, res) => {
  try {
    const data = await adminService.resetUserPassword(req.params.id);
    res.json({
      message: 'Đã reset mật khẩu thành công',
      username: data.username,
      tempPassword: data.tempPassword,
    });
  } catch (e) {
    console.error(e);
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};

// Delete user (hard delete) nếu không có transaction history
// Chỉ dùng cho users chưa có bất kì giao dịch nào
exports.deleteUserNoTransactions = async (req, res) => {
  try {
    const result = await adminService.deleteUserNoTransactions(req.params.id);
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};
