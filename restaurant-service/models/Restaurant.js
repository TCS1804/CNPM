const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    // Chủ nhà hàng (User bên auth-service)
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // mỗi owner chỉ có 1 restaurant
    },

    address: { type: String, trim: true },

    location: {
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },

    // Trạng thái hoạt động
    isActive: { type: Boolean, default: true },

    // Soft delete – khi admin "xóa" thì chỉ đặt cờ này = true
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Restaurant', restaurantSchema);
