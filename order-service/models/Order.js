const mongoose = require('mongoose');

const PLATFORM_CURRENCY = (process.env.PLATFORM_CURRENCY || 'USD').toUpperCase();

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
  itemsTotal: { type: Number, default: 0 },
  shippingFee: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'in-transit', 'delivered', 'cancelled'], // 👈 thêm 'cancelled'
    default: 'pending'
  },
  deliveryPersonId: String,
  transportMode: {
    type: String,
    enum: ['human', 'drone'],
    default: 'human'
  },
  location: {
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },

  customerContact: {
    fullName: String,
    phone: String,
    email: String,
    address: String,
  },
  deliveryContact: {
    fullName: String,
    phone: String,
  },

  totalCents: { type: Number, default: 0 },
  currency: { type: String, default: PLATFORM_CURRENCY },
  paymentIntentId: String,

  delivery: {
    mode: {
      type: String,
      enum: ['human', 'drone'],
      default: 'human',
    },
    missionId: { type: String },
  },

  split: {
    method: { type: String, enum: ['percent', 'fixed'], default: 'percent' },
    rates: {
      admin: { type: Number, default: 0 },
      restaurant: { type: Number, default: 0 },
      delivery: { type: Number, default: 0 }
    },
    amounts: {
      admin: { type: Number, default: 0 },
      restaurant: { type: Number, default: 0 },
      delivery: { type: Number, default: 0 }
    },
    currency: { type: String, default: PLATFORM_CURRENCY },
    settledAt: Date
  },

  // Customer confirmation when they receive the order
  customerConfirmed: { type: Boolean, default: false },
  receivedAt: Date,

  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
  deletedBy: String,
    
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
