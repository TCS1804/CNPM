const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentIntentId: { type: String, required: true, unique: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  userId: { type: String, required: true }, // Renamed from customerId to avoid confusion
  stripeCustomerId: { type: String, required: true },
  amount: { type: Number, required: true }, 
  currency: { type: String, required: true },
  status: {
    type: String,
    required: true,
    enum: [
      'requires_payment_method',
      'requires_confirmation',
      'requires_action',
      'processing',
      'requires_capture',
      'canceled',
      'succeeded'
    ]
  },
  billingName: { type: String },
  billingEmail: { type: String },
  billingAddress: {
    line1: { type: String },
    city: { type: String },
    state: { type: String },
    postal_code: { type: String },
    country: { type: String }
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema);