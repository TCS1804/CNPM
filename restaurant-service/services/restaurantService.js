const Restaurant = require('../models/Restaurant');

exports.list = () => Restaurant.find();
exports.listIds = () => Restaurant.find().select('_id name');
exports.create = (payload) => new Restaurant(payload).save();
