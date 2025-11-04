const axios = require('axios');

const ensurePath = (base, suffix) => {
  if (!base) return '';
  const b = base.replace(/\/$/, '');
  const s = suffix.replace(/^\//, '');
  return b.endsWith(`/${s}`) ? b : `${b}/${s}`;
};

const ORDER_RAW = process.env.ORDER_SERVICE_URL || process.env.ORDER_BASE_URL || 'http://order-service:5003';
const ORDER_URL  = ensurePath(ORDER_RAW, '/order');

exports.listAvailable = async () => {
  const { data } = await axios.get(`${ORDER_URL}/available`);
  return data; // <<=== thiếu return
};

exports.accept = async (driverId, orderId) => {
  if (!driverId || !orderId) throw new Error('Missing driverId or orderId');
  const { data } = await axios.post(`${ORDER_URL}/${orderId}/assign`, { driverId });
  return data;
};

exports.complete = async (driverId, orderId) => {
  if (!driverId || !orderId) throw new Error('Missing driverId or orderId');
  const { data } = await axios.post(`${ORDER_URL}/${orderId}/complete`, { driverId });
  return data;
};
