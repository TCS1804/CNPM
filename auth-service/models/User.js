const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: { type: String, unique: true, trim: true },
    password: String,
    role: {
      type: String,
      enum: ['customer', 'restaurant', 'delivery', 'admin'],
      required: true,
    },
    verified: { type: Boolean, default: false },

    // Trạng thái hệ thống
    isLocked: { type: Boolean, default: false },   // true = bị khóa, không được đăng nhập
    isDeleted: { type: Boolean, default: false },  // soft delete

    // Ghi chú của admin (lý do khóa/xóa…)
    note: { type: String, trim: true },

    lastLoginAt: { type: Date },
  },
  {
    timestamps: true, // tự sinh createdAt, updatedAt
  }
);

module.exports = mongoose.model('User', userSchema);
