// order-service/models/Order.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customerId: String,
  restaurantId: String,
  items: [
    {
      name: String,
      quantity: Number,
      price: Number
    }
  ],
  total: Number,
  status: {
    type: String,
    enum: ['pending', 'accepted', 'in-transit', 'delivered'],
    default: 'pending'
  },
  deliveryPersonId: String,
  location: {
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  totalCents: { type: Number, default: 0 },
  currency: { type: String, default: 'usd' },
  paymentIntentId: String,
  // NEW: Kết quả chia tiền được chốt tại thời điểm thanh toán thành công
  split: {
    method: { type: String, enum: ['percent', 'fixed'], default: 'percent' },
    rates: {
      admin: { type: Number, default: 0 },       // %
      restaurant: { type: Number, default: 0 },  // %
      delivery: { type: Number, default: 0 }     // %
    },
    amounts: {
      admin: { type: Number, default: 0 },       // số tiền đã tính ra (cents hoặc VND)
      restaurant: { type: Number, default: 0 },
      delivery: { type: Number, default: 0 }
    },
    currency: { type: String, default: 'USD' },
    settledAt: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
