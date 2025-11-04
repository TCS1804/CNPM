const mongoose = require('mongoose');

// const restaurantSchema = new mongoose.Schema({
//   name: String,
//   ownerId: String, // from Auth user ID
//   isOpen: Boolean,
// });

const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
}, { timestamps: true });

module.exports = mongoose.model('Restaurant', restaurantSchema);
