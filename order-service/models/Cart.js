const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    // id món ăn bên restaurant-service
    menuItemId: { type: String }, // lưu string cho an toàn, tránh lệ thuộc ObjectId
    restaurantId: { type: String },
    name: { type: String },
    price: { type: Number },
    quantity: { type: Number, default: 1 },
    restaurantName: { type: String },

    // nếu sau này bạn muốn lưu thêm gì (ảnh, description...), cứ thêm field vào đây
  },
  { _id: false } // items không cần _id riêng
);

const cartSchema = new mongoose.Schema(
  {
    // khớp với Order.customerId (đang dùng String)
    userId: {
      type: String,
      required: true,
      unique: true, // 1 user = 1 cart
      index: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Cart', cartSchema);
