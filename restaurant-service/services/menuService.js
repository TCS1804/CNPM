const MenuItem = require('../models/MenuItem');

exports.getByRestaurant = (restaurantId) => MenuItem.find({ restaurantId });
exports.getAll = () => MenuItem.find({});
exports.addItem = (restaurantId, payload) => new MenuItem({ ...payload, restaurantId }).save();
exports.updateItem = (itemId, patch) => MenuItem.findByIdAndUpdate(itemId, patch, { new: true });
exports.deleteItem = (itemId) => MenuItem.findByIdAndDelete(itemId);
