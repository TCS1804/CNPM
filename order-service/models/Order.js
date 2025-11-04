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
  paymentIntentId: String
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
