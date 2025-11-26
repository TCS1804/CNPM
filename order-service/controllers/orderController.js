const orderService = require('../services/orderService');
const partnerService = require('../services/partnerService');
const Order = require('../models/Order');
const { sendEmail } = require('../services/notificationClient');
const { fetchDeliveryProfile } = require('../services/profileClient');

// Danh sách nhà hàng (proxy sang restaurant-service)
exports.listRestaurants = async (req, res) => {
  try {
    const data = await partnerService.fetchRestaurants();
    res.json(data);
  } catch (e) {
    console.error('listRestaurants error:', e);
    res.status(500).json({
      message: 'Failed to fetch restaurants',
      detail: e.message,
    });
  }
};

// Menu của 1 nhà hàng
exports.getMenu = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    if (!restaurantId)
      return res.status(400).json({ message: 'restaurantId is required' });
    const data = await partnerService.fetchMenu(restaurantId);
    res.json(data);
  } catch (e) {
    console.error('getMenu error:', e);
    res.status(500).json({ message: e.message || 'Failed to fetch menu' });
  }
};

// Đơn theo nhà hàng
exports.listByRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.query;
    if (!restaurantId)
      return res.status(400).json({ message: 'restaurantId is required' });
    const data = await orderService.listByRestaurant(restaurantId);
    res.json(data);
  } catch (e) {
    console.error('listByRestaurant error:', e);
    res.status(500).json({ message: e.message || 'Failed to fetch orders' });
  }
};

// Tạo đơn
exports.createOrder = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const doc = await orderService.create(userId, req.body);
    res.status(201).json(doc);
  } catch (e) {
    console.error('createOrder error:', e);
    res.status(400).json({ message: e.message });
  }
};

// Lấy chi tiết đơn
exports.getOrder = async (req, res) => {
  try {
    const doc = await orderService.getById(req.params.orderId);
    if (!doc) return res.status(404).json({ message: 'Order not found' });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

// Cập nhật trạng thái (nhà hàng / admin)
// Ví dụ: accept đơn ('accepted'), …
// Gửi email cho customer nếu có email
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body || {};
    const doc = await orderService.updateStatus(
      req.params.orderId,
      status
    );

    if (doc?.customerContact?.email) {
      let subject;
      let text;

      switch (doc.status) {
        case 'accepted':
          subject = `Đơn hàng ${doc._id} đã được nhà hàng xác nhận`;
          text = `Nhà hàng đã xác nhận đơn hàng của bạn. Tổng tiền: ${doc.total} ${doc.currency || 'USD'}.`;
          break;
        case 'cancelled':
          subject = `Đơn hàng ${doc._id} đã bị huỷ`;
          text = `Đơn hàng của bạn đã bị huỷ bởi nhà hàng hoặc hệ thống.`;
          break;
        default:
          break;
      }

      if (subject) {
        await sendEmail({
          to: doc.customerContact.email,
          subject,
          text,
        });
      }
    }

    res.json(doc);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

exports.listByCustomer = async (req, res) => {
  try {
    const docs = await orderService.listByCustomer(req.user.id);
    res.json(docs);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

// Liệt kê đơn available cho delivery
exports.listAvailableForDelivery = async (req, res) => {
  try {
    const docs = await Order.find({
      deliveryPersonId: { $in: [null, '', undefined] },
      status: { $in: ['pending', 'accepted'] },
    }).sort({ createdAt: -1 });
    res.json(docs);
  } catch (e) {
    res
      .status(500)
      .json({ message: e.message || 'Failed to fetch available orders' });
  }
};

// Danh sách đơn của tài xế hiện tại
exports.listOrdersForDriver = async (req, res) => {
  try {
    const driverId = req.user.id;

    const docs = await Order.find({
      deliveryPersonId: driverId,
    }).sort({ createdAt: -1 });

    res.json(docs);
  } catch (e) {
    console.error('listOrdersForDriver error:', e);
    res.status(500).json({
      message: e.message || 'Failed to fetch driver orders',
    });
  }
};

// Nhận đơn (assign cho tài xế đang đăng nhập)
// Set deliveryContact + gửi email cho khách
exports.assignToDriver = async (req, res) => {
  try {
    const { orderId } = req.params;
    const driverId = req.user.id;
    const authHeader = req.headers.authorization || '';

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.deliveryPersonId) {
      return res.status(400).json({ message: 'Order already assigned' });
    }

    const profile = await fetchDeliveryProfile(authHeader);

    order.deliveryPersonId = driverId;
    order.status = 'in-transit';
    order.deliveryContact = {
      fullName: profile?.fullName || '',
      phone: profile?.phone || '',
    };

    await order.save();

    // Gửi mail cho khách
    if (order.customerContact?.email) {
      await sendEmail({
        to: order.customerContact.email,
        subject: `Đơn hàng ${order._id} đang được giao`,
        text: `Đơn hàng của bạn đã có người giao: ${order.deliveryContact.fullName || 'Shipper'} – ${order.deliveryContact.phone || 'N/A'}.`,
      });
    }

    res.json(order);
  } catch (e) {
    res
      .status(400)
      .json({ message: e.message || 'Failed to assign order' });
  }
};

// Hoàn tất giao (shipper mark delivered)
// Gửi email cho khách
exports.markDelivered = async (req, res) => {
  try {
    const { orderId } = req.params;
    const driverId = req.user.id;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (String(order.deliveryPersonId) !== String(driverId)) {
      return res
        .status(403)
        .json({ message: 'You are not assigned to this order' });
    }

    order.status = 'delivered';
    await order.save();

    if (order.customerContact?.email) {
      await sendEmail({
        to: order.customerContact.email,
        subject: `Đơn hàng ${order._id} đã được giao thành công`,
        text: `Đơn hàng của bạn đã được giao thành công bởi shipper. Cảm ơn bạn đã sử dụng dịch vụ!`,
      });
    }

    res.json(order);
  } catch (e) {
    res
      .status(400)
      .json({ message: e.message || 'Failed to complete order' });
  }
};

// 👇 NEW: Customer huỷ đơn
exports.cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const customerId = req.user.id;

    const doc = await orderService.cancel(orderId, customerId);

    // gửi mail xác nhận huỷ nếu có email
    if (doc.customerContact?.email) {
      await sendEmail({
        to: doc.customerContact.email,
        subject: `Đơn hàng ${doc._id} đã được huỷ`,
        text: `Bạn vừa huỷ đơn hàng ${doc._id}. Nếu đây không phải là bạn thực hiện, vui lòng liên hệ hỗ trợ.`,
      });
    }

    res.json(doc);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};
