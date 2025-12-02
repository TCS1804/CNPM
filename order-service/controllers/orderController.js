const orderService = require('../services/orderService');
const partnerService = require('../services/partnerService');
const Order = require('../models/Order');
const { sendEmail } = require('../services/notificationClient');
const { fetchDeliveryProfile } = require('../services/profileClient');
const { fetchRestaurants } = require('../services/partnerService');
const axios = require('axios');

// Base URL tới restaurant-service.
// Bạn có thể set env RESTAURANT_SERVICE_URL = 'http://restaurant-service:5002'
// hoặc 'http://localhost:4002' tùy môi trường.
const RAW_RESTAURANT_URL =
  process.env.RESTAURANT_SERVICE_URL || 'http://localhost:4002';

// Đảm bảo base đã có hậu tố /restaurant để match với app.use('/restaurant', ...)
let RESTAURANT_BASE = RAW_RESTAURANT_URL.replace(/\/+$/, '');
if (!/\/restaurant$/.test(RESTAURANT_BASE)) {
  RESTAURANT_BASE += '/restaurant';
}

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
    let { restaurantId } = req.query;

    // Nếu là restaurant ⇒ tự tìm restaurant theo owner
    if (req.user?.role === 'restaurant') {
      const ownerId = req.user.id || req.user._id;

      // gọi sang restaurant-service để lấy danh sách nhà hàng
      const allRestaurants = await fetchRestaurants();
      const mine = allRestaurants.find(
        (r) => String(r.owner) === String(ownerId)
      );

      restaurantId = mine?._id;
    }

    if (!restaurantId) {
      return res.status(400).json({ message: 'restaurantId is required' });
    }

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
    const { restaurantId, items } = req.body;

    if (!restaurantId) {
      return res.status(400).json({ message: 'restaurantId is required' });
    }

    let restaurant;
    try {
      const resp = await axios.get(
        `${RESTAURANT_BASE}/api/restaurants/${restaurantId}`
      );
      restaurant = resp.data;
    } catch (err) {
      return res.status(400).json({ 
        message: 'Nhà hàng không tồn tại hoặc đã bị Xóa/Khóa' 
      });
    }

    // Nếu isDeleted hoặc không active ⇒ không cho tạo đơn
    if (restaurant.isDeleted || !restaurant.isActive) {
      return res.status(400).json({ 
        message: 'Nhà hàng đang tạm dừng hoặc bị khóa bởi admin, không thể tạo đơn mới.' 
      });
    }
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

// List đơn giao hàng cho admin (có filter cơ bản + nâng cao)
exports.adminListDeliveries = async (req, res) => {
  try {
    const {
      q,              // search chung: mã đơn, tên KH, email...
      status,
      driverId,
      restaurantId,
      fromDate,
      toDate,
      page = 1,
      limit = 20,
      includeDeleted,
    } = req.query;

    const query = {};

    // Không lấy đơn đã xóa trừ khi includeDeleted = true
    if (!includeDeleted) {
      query.isDeleted = false;
    }

    if (status) {
      query.status = status;
    }

    if (driverId) {
      query.assignedTo = driverId;
    }

    if (restaurantId) {
      query.restaurantId = restaurantId;
    }

    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) query.createdAt.$lte = new Date(toDate);
    }

    // Search text đơn giản (ví dụ theo _id hoặc email khách)
    if (q) {
      // Tùy schema thực tế có customerEmail, customerName...  
      // Ở đây demo tìm theo _id dạng string
      query.$or = [
        { _id: q },
        { customerEmail: new RegExp(q, 'i') },
        { customerName: new RegExp(q, 'i') },
      ].filter(Boolean);
    }

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(query),
    ]);

    res.json({
      data: items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (e) {
    console.error('adminListDeliveries error', e);
    res.status(500).json({ message: e.message || 'Failed to fetch deliveries' });
  }
};

// Xóa (soft delete) một đơn giao hàng cho admin
exports.adminDeleteOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const adminId = req.user?.id || req.user?._id || 'admin';

    const order = await Order.findById(orderId);
    if (!order || order.isDeleted) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // 1. Không cho xóa nếu đơn đang xử lý
    const activeStatuses = ['pending', 'accepted', 'in-transit'];
    if (activeStatuses.includes(order.status)) {
      return res.status(400).json({
        message: 'Không thể xóa đơn đang xử lý (pending/accepted/in-transit)',
      });
    }

    // 2. Nếu đã settle tiền (split.settledAt) thì chỉ cho xóa mềm
    const isSettled = !!order.split?.settledAt;

    // -> Dù settle hay chưa, ta vẫn dùng soft delete để an toàn
    order.isDeleted = true;
    order.deletedAt = new Date();
    order.deletedBy = adminId;

    await order.save();

    res.json({
      message: 'Order deleted (soft delete)',
      isSettled,
    });
  } catch (e) {
    console.error('adminDeleteOrder error', e);
    res.status(500).json({ message: e.message || 'Failed to delete order' });
  }
};