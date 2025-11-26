const mongoose = require('mongoose');

const connectAccountSchema = new mongoose.Schema({
  type: { type: String, enum: ['restaurant', 'delivery'], required: true },
  internalId: { type: String, required: true }, // restaurantId hoặc userId (driver)
  stripeAccountId: { type: String, required: true },
  payoutsEnabled: { type: Boolean, default: false },
  chargesEnabled: { type: Boolean, default: false }
}, { timestamps: true });

connectAccountSchema.index({ type: 1, internalId: 1 }, { unique: true });

module.exports = mongoose.model('ConnectAccount', connectAccountSchema);
