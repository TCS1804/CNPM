const axios = require('axios');

const AUTH_BASE =
  process.env.AUTH_SERVICE_URL || 'http://auth-service:5001';

const ensurePath = (b, s) =>
  `${(b || '').replace(/\/$/, '')}/${(s || '').replace(/^\//, '')}`;

// Lấy profile shipper hiện tại từ auth-service, dùng header Authorization truyền sang
async function fetchDeliveryProfile(authHeader) {
  if (!authHeader) return null;

  try {
    const { data } = await axios.get(
      ensurePath(AUTH_BASE, 'auth/profile/delivery/me'),
      { headers: { Authorization: authHeader } }
    );
    return data;
  } catch (e) {
    console.error('[order-service] fetchDeliveryProfile error:', e.response?.data || e.message);
    return null;
  }
}

module.exports = {
  fetchDeliveryProfile,
};
