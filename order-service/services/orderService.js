const Order = require('../models/Order');

const PLATFORM_CURRENCY = (process.env.PLATFORM_CURRENCY || 'USD').toUpperCase();

exports.create = async (
  userId,
  {
    restaurantId,
    items,
    deliveryLocation,
    itemsTotal,
    shippingFee,
    total,
    note,
    paymentIntentId,
    transportMode = 'human',
    customerContact, // 👈 nhận thêm
  }
) => {
  if (!restaurantId || !Array.isArray(items) || items.length === 0) {
    throw new Error('restaurantId and items are required');
  }

  const computedItemsTotal =
    itemsTotal != null
      ? Number(itemsTotal)
      : items.reduce(
          (s, it) => s + Number(it.price) * Number(it.quantity || 1),
          0
        );

  const computedShippingFee = shippingFee != null ? Number(shippingFee) : 0;

  const grandTotal =
    total != null
      ? Number(total)
      : Number((computedItemsTotal + computedShippingFee).toFixed(2));

  const totalCents = Math.round(grandTotal * 100);

  const order = new Order({
    customerId: userId,
    restaurantId,
    items,
    itemsTotal: computedItemsTotal,
    shippingFee: computedShippingFee,
    location: {
      address: deliveryLocation?.address,
      coordinates: {
        lat: deliveryLocation?.latitude,
        lng: deliveryLocation?.longitude,
      },
    },
    total: grandTotal,
    totalCents,
    currency: PLATFORM_CURRENCY,
    paymentIntentId,
    note,
    status: 'pending',
    transportMode,
    customerContact, // 👈 lưu snapshot khách
  });

  return order.save();
};

exports.getById = (id) => Order.findById(id);

exports.updateStatus = (id, status) => {
  if (!status) throw new Error('Missing status');
  return Order.findByIdAndUpdate(id, { status }, { new: true });
};

exports.listByRestaurant = (restaurantId) => {
  if (!restaurantId) throw new Error('restaurantId is required');
  return Order.find({ restaurantId }).sort({ createdAt: -1 });
};

exports.listByCustomer = (customerId) => {
  if (!customerId) throw new Error('customerId is required');
  return Order.find({ customerId }).sort({ createdAt: -1 });
};

// 👇 NEW: customer huỷ đơn
exports.cancel = async (orderId, customerId) => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error('Order not found');

  if (String(order.customerId) !== String(customerId)) {
    throw new Error('Forbidden');
  }

  if (!['pending', 'accepted'].includes(order.status)) {
    throw new Error('Order cannot be cancelled at this stage');
  }

  order.status = 'cancelled';
  await order.save();
  return order;
};
