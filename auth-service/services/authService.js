const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const PasswordResetToken = require('../models/PasswordResetToken');
const { generateToken } = require('../utils/jwt');
const { sendMail } = require('../utils/mailer');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const isEmail = (s) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

exports.register = async (payload = {}) => {
  const { username, email, password, role } = payload;
  if (!username || !password || !role || !email) {
    const err = new Error('Missing fields (username, email, password, role required)');
    err.statusCode = 400;
    throw err;
  }

  if (!isEmail(email)) {
    const err = new Error('Invalid email');
    err.statusCode = 400;
    throw err;
  }

  if (password.length < 6) {
    const err = new Error('Password must be at least 6 characters');
    err.statusCode = 400;
    throw err;
  }

  if (role === 'admin') {
    const err = new Error('Cannot register admin via API');
    err.statusCode = 403;
    throw err;
  }

  // ensure username or email not already used
  const exists = await User.findOne({ $or: [{ username }, { email }] });
  if (exists) {
    const err = new Error('Username or email already exists');
    err.statusCode = 409;
    throw err;
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ username, email, password: hashed, role });
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
    const err = new Error('Account does not exist');
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

exports.forgotPassword = async (payload = {}) => {
  const { username, email } = payload;

  if (!username && !email) {
    const err = new Error('username or email is required');
    err.statusCode = 400;
    throw err;
  }

  const query = username ? { username } : { email };
  const user = await User.findOne(query);

  // Để tránh lộ thông tin user tồn tại hay không → luôn trả OK
  if (!user) {
    return;
  }

  if (user.isDeleted || user.isLocked) {
    // Không cho reset với tài khoản bị xoá/khoá
    return;
  }

  // chỉ gửi nếu user có email hợp lệ
  if (!user.email || !isEmail(user.email)) {
    return;
  }

  // tạo token ngẫu nhiên
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

  // xoá token cũ của user (nếu có)
  await PasswordResetToken.deleteMany({ userId: user._id });

  await PasswordResetToken.create({
    userId: user._id,
    token,
    expiresAt,
  });

  const resetLink = `${FRONTEND_URL}/reset-password?token=${token}`;

  // gửi email (hoặc log ra console nếu chưa config SMTP)
  const targetEmail = user.email; // only send to stored user email
  await sendMail({
    to: targetEmail,
    subject: 'Reset password – FoodDelivery',
    text: `Bạn đã yêu cầu đặt lại mật khẩu.\nNhấn vào link sau để đặt mật khẩu mới (có hiệu lực 1 giờ): ${resetLink}`,
    html: `
      <p>Xin chào,</p>
      <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản FoodDelivery.</p>
      <p>Nhấn vào link sau để đặt mật khẩu mới (hiệu lực 1 giờ):</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email.</p>
    `,
  });
};

exports.resetPassword = async (payload = {}) => {
  const { token, password } = payload;

  if (!token || !password) {
    const err = new Error('token and password are required');
    err.statusCode = 400;
    throw err;
  }

  if (password.length < 6) {
    const err = new Error('Password must be at least 6 characters');
    err.statusCode = 400;
    throw err;
  }

  const tokenDoc = await PasswordResetToken.findOne({ token });

  if (
    !tokenDoc ||
    tokenDoc.used ||
    !tokenDoc.expiresAt ||
    tokenDoc.expiresAt < new Date()
  ) {
    const err = new Error('Invalid or expired reset token');
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findById(tokenDoc.userId);
  if (!user || user.isDeleted || user.isLocked) {
    const err = new Error('Account is not available');
    err.statusCode = 400;
    throw err;
  }

  const hashed = await bcrypt.hash(password, 10);
  user.password = hashed;
  await user.save();

  tokenDoc.used = true;
  await tokenDoc.save();

  // (tuỳ chọn) xoá các token reset khác của user
  await PasswordResetToken.deleteMany({
    userId: user._id,
    _id: { $ne: tokenDoc._id },
  });
};

exports.changePassword = async (userId, payload = {}) => {
  const { currentPassword, newPassword } = payload;

  if (!currentPassword || !newPassword) {
    const err = new Error('currentPassword and newPassword are required');
    err.statusCode = 400;
    throw err;
  }

  if (newPassword.length < 6) {
    const err = new Error('New password must be at least 6 characters');
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  if (user.isDeleted || user.isLocked) {
    const err = new Error('Account is not available');
    err.statusCode = 403;
    throw err;
  }

  const ok = await bcrypt.compare(currentPassword, user.password);
  if (!ok) {
    const err = new Error('Current password is incorrect');
    err.statusCode = 401;
    throw err;
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  user.password = hashed;
  await user.save();
};
