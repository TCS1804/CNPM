const User = require('../models/User');

exports.getUsers = () => User.find({}, '-password'); // exclude passwords
exports.getRestaurants = () => User.find({ role: 'restaurant' }, '-password');
exports.verifyRestaurant = (id) => {
  if (!id) throw new Error('Missing id');
  return User.findByIdAndUpdate(id, { verified: true });
};
