const axios = require('axios');

// Hàm tiện ích để nối đường dẫn gọn gàng
const ensurePath = (base, suffix) => {
  const b = (base || '').replace(/\/$/, '');
  const s = (suffix || '').replace(/^\//, '');
  return `${b}/${s}`;
};

// URL tới order-service (port 5003 nội bộ)
const ORDER_RAW = process.env.ORDER_BASE_URL || process.env.ORDER_SERVICE_URL || 'http://order-service:5003';
const ORDER_URL = ensurePath(ORDER_RAW, 'order');
const PAYMENT_RAW = process.env.PAYMENT_BASE_URL || process.env.PAYMENT_SERVICE_URL || 'http://payment-service:5008';
const PAYMENT_URL = ensurePath(PAYMENT_RAW, 'payment');

// Lấy danh sách đơn khả dụng
exports.listAvailable = async (auth) => {
  const { data } = await axios.get(`${ORDER_URL}/available`, {
    headers: { Authorization: auth },
  });
  return data;
};

// Lấy danh sách đơn của tài xế hiện tại
exports.listMine = async (auth) => {
  const { data } = await axios.get(`${ORDER_URL}/driver/orders`, {
    headers: { Authorization: auth },
  });
  return data;
};

// Nhận đơn
exports.accept = async (auth, orderId) => {
  const { data } = await axios.post(`${ORDER_URL}/${orderId}/assign`, {}, {
    headers: { Authorization: auth },
  });
  return data;
};

// Hoàn tất đơn
exports.complete = async (auth, orderId) => {
  // 1) Gọi order-service đánh dấu delivered
  const { data: order } = await axios.post(
    `${ORDER_URL}/${orderId}/complete`,
    {},
    {
      headers: { Authorization: auth },
    }
  );

  // 2) Gọi payment-service để chuyển tiền cho shipper
  try {
    await axios.post(
      `${PAYMENT_URL}/transfer/delivery/${orderId}`,
      {},
      {
        headers: { Authorization: auth },
      }
    );
  } catch (e) {
    console.error(
      'Failed to trigger delivery payout:',
      e.response?.data || e.message
    );
    // không throw để không làm vỡ UI; chỉ log lỗi
  }

  return order;
};
