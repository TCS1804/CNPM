const mongoose = require('mongoose');

const customerProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
    fullName: String,
    phone: String,
    email: String,
    address: String,
    location: {
      lat: Number,
      lng: Number,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CustomerProfile', customerProfileSchema);
