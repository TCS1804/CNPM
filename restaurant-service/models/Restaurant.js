const mongoose = require('mongoose');

// const restaurantSchema = new mongoose.Schema({
//   name: String,
//   ownerId: String, // from Auth user ID
//   isOpen: Boolean,
// });

const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  address: { type: String, trim: true },
  location: {
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('Restaurant', restaurantSchema);
