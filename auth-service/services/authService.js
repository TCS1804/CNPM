const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateToken } = require('../utils/jwt');

exports.register = async (payload = {}) => {
  const { username, password, role } = payload;
  if (!username || !password || !role) {
    const err = new Error('Missing fields');
    err.statusCode = 400;
    throw err;
  }

  if (role === 'admin') {
    const err = new Error('Cannot register admin via API');
    err.statusCode = 403;
    throw err;
  }
  
  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hashed, role });
  await user.save();
};

exports.login = async (payload = {}) => {
  const { username, email, password } = payload;

  // check input
  if (!password || (!username && !email)) {
    const err = new Error('Missing username/email or password');
    err.statusCode = 400;
    throw err;
  }

  // tìm theo username (FE đang dùng username) hoặc email (sau này)
  const query = username ? { username } : { email };
  const user = await User.findOne(query);

  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  // ⚠️ chặn tài khoản đã bị xóa (soft delete)
  if (user.isDeleted) {
    const err = new Error('Account has been deleted or deactivated');
    err.statusCode = 403;
    throw err;
  }

  // ⚠️ chặn tài khoản đang bị khóa
  if (user.isLocked) {
    const err = new Error('Account is locked, please contact admin');
    err.statusCode = 403;
    throw err;
  }

  // kiểm tra mật khẩu
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    const err = new Error('Invalid password');
    err.statusCode = 401;
    throw err;
  }

  // lưu lại thời gian đăng nhập gần nhất
  user.lastLoginAt = new Date();
  await user.save();

  const token = generateToken(user);
  return { token, role: user.role };
};
