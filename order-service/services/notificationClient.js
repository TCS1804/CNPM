const axios = require('axios');

const NOTI_BASE =
  process.env.NOTIFICATION_SERVICE_URL ||
  process.env.NOTIFICATION_BASE_URL ||
  'http://notification-service:5006';

async function sendEmail({ to, subject, text }) {
  if (!to) return;
  try {
    await axios.post(`${NOTI_BASE}/notify/email`, { to, subject, text });
  } catch (e) {
    console.error('[order-service] sendEmail failed:', e.response?.data || e.message);
  }
}

async function sendWeb(payload = {}) {
  // payload: { target: { role? userId? restaurantId? }, title, body, data }
  try {
    await axios.post(`${NOTI_BASE}/notify/web`, payload);
  } catch (e) {
    console.error('[order-service] sendWeb failed:', e.response?.data || e.message);
  }
}

module.exports = {
  sendEmail,
  sendWeb,
};
