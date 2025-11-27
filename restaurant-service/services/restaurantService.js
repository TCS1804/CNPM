const Restaurant = require('../models/Restaurant');

exports.list = () => Restaurant.find();

exports.listIds = (filter = {}) => Restaurant.find(filter).select('_id name');

exports.create = (payload) => new Restaurant(payload).save();
