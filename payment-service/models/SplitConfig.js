const mongoose = require('mongoose');

const splitConfigSchema = new mongoose.Schema({
  // Cách chia
  method: { type: String, enum: ['percent', 'fixed'], default: 'percent' },

  // Nếu percent: tổng phải = 100
  percent: {
    admin: { type: Number, default: 10 },      // %
    restaurant: { type: Number, default: 85 }, // %
    delivery: { type: Number, default: 5 }     // %
  },

  // Nếu fixed: phí ship cố định (đồng/cents)
  fixed: {
    deliveryFee: { type: Number, default: 0 }
  },

  currency: { type: String, default: 'USD' },
  active: { type: Boolean, default: true },

  // (tuỳ chọn) per-restaurant: thêm restaurantId nếu cần cá nhân hoá
  restaurantId: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('SplitConfig', splitConfigSchema);
