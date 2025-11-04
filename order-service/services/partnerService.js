// order-service/services/partnerService.js
const axios = require('axios');

// Base tới restaurant-service, ví dụ: http://restaurant-service:5002/restaurant
const rawBase =
  process.env.RESTAURANT_SERVICE_URL ||
  process.env.RESTAURANT_BASE_URL ||
  'http://restaurant-service:5002';
// đảm bảo luôn có hậu tố /restaurant
const base = `${rawBase.replace(/\/+$/, '')}/restaurant`;

const notify = process.env.NOTIFY_SERVICE_URL || 'http://notification-service:5006/notify';

exports.fetchRestaurants = async () => {
  const { data } = await axios.get(`${base}/api/restaurants`);
  return data;
};

exports.fetchMenu = async (restaurantId) => {
  try {
    const { data } = await axios.get(`${base}/api/restaurants/${restaurantId}/menu`);
    return data;
  } catch (err) {
    const msg = `fetchRestaurants failed -> GET ${base}/api/restaurants : ` +
                (err.response?.status ? `${err.response.status} ${err.response.statusText}` : err.message);
    throw new Error(msg);
  }
};

exports.sendOrderEmail = (payload) => axios.post(`${notify}/email`, payload);
