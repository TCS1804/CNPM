const mongoose = require('mongoose');

const deliveryProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
    fullName: String,
    phone: String,
    vehicleType: String,
    note: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('DeliveryProfile', deliveryProfileSchema);
