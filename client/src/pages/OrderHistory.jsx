import React, { useState, useEffect } from 'react';
import api from "../lib/axios";
import DroneSimulationMap from "../component/DroneSimulationMap";

const formatCurrency = (value) =>
  (Number(value) || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [droneOrder, setDroneOrder] = useState(null);
  const [role, setRole] = useState('customer');

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const res = await api.get("/restaurant/api/restaurants");
        const arr = Array.isArray(res.data) ? res.data : [];
        setRestaurants(arr);
      } catch (e) {
        console.error("Failed to fetch restaurants for drone map:", e.response?.data || e.message);
      }
    };
    fetchRestaurants();
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem('token');
        const rawUser = localStorage.getItem('user');
        const user = rawUser ? JSON.parse(rawUser) : null;
        const userRole = user?.role || 'customer';
        setRole(userRole);

        let endpoint = '/orders/customer/orders';
        if (userRole === 'restaurant') endpoint = '/orders/restaurant';
        if (userRole === 'delivery')   endpoint = '/orders/available';

        // dùng api client, không hard-code http://localhost:5020/api
        const response = await api.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setOrders(response.data);
      } catch (err) {
        if (err.response) {
          console.error('Response error:', err.response.data);
        } else if (err.request) {
          console.error('Request made but no response:', err.request);
        } else {
          console.error('Error:', err.message);
        }
        setError('Failed to fetch orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Bạn chắc chắn muốn huỷ đơn này?')) return;

    try {
      const token = localStorage.getItem('token');
      await api.post(
        `/orders/${orderId}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // update UI
      setOrders((prev) =>
        prev.map((o) =>
          o._id === orderId ? { ...o, status: 'cancelled' } : o
        )
      );
    } catch (err) {
      console.error('Cancel order error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to cancel order');
    }
  };

  const handleConfirmReceived = async (orderId) => {
    if (!window.confirm('Xác nhận bạn đã nhận đơn hàng này?')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await api.post(
        `/orders/${orderId}/confirm-received`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // update UI
      setOrders((prev) => prev.map((o) => (o._id === orderId ? res.data : o)));
    } catch (err) {
      console.error('Confirm received error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to confirm received');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-blue-600 text-white';
      case 'accepted':
        return 'bg-yellow-500 text-black';
      case 'in-transit':
        return 'bg-purple-600 text-white';
      case 'delivered':
        return 'bg-green-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  };

  return (
    <div className="py-8">
      <h1 className="text-3xl font-bold mb-8">Your Orders</h1>

      {error && (
        <div className="bg-red-500 text-white p-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-full border-4 border-yellow-500 border-t-transparent animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-gray-900 rounded-lg p-8 text-center">
          <p className="text-xl">You don't have any orders yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map(order => (
            <div key={order._id} className="bg-gray-900 rounded-lg shadow-lg overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg">Order #{order._id.substring(order._id.length - 6)}</h3>
                    <p className="text-gray-400 text-sm">
                      {order.createdAt ? formatDate(order.createdAt) : 'Date not available'}
                    </p>
                    {order.deliveryPersonId && (
                      <p className="text-gray-400 text-sm">Assigned to Delivery ID: {order.deliveryPersonId}</p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(order.status)}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between">
                      <span>{item.quantity}x {item.name}</span>
                      <span>{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Items total</span>
                    <span>{formatCurrency(order.itemsTotal ?? (order.total - (order.shippingFee || 0)))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping fee</span>
                    <span>{formatCurrency(order.shippingFee || 0)}</span>
                  </div>
                </div>

                <div className="border-t border-gray-800 pt-4 flex justify-between items-center">
                  <div className="font-bold">
                    <span>Total: </span>
                    <span className="text-yellow-500">
                      {formatCurrency(order.total || 0)}
                    </span>
                  </div>

                  {order.transportMode === 'drone' &&
                    ['accepted', 'in-transit', 'delivered'].includes(
                      (order.status || '').toLowerCase()
                    ) &&
                    order.location?.coordinates &&
                    (() => {
                      const restaurant = restaurants.find(r => r._id === order.restaurantId);
                      const restaurantCoords = restaurant?.location?.coordinates;
                      const customerCoords = order.location?.coordinates;
                      if (!restaurantCoords || !customerCoords) return null;

                      return (
                        <button
                          onClick={() =>
                            setDroneOrder({
                              order,
                              restaurantCoords,
                              customerCoords,
                            })
                          }
                          className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
                        >
                          Xem drone
                        </button>
                      );
                    })()}
                </div>

                <div className="mt-4 border-t border-gray-800 pt-3 text-sm space-y-1">
                  {order.customerContact && (
                    <div>
                      <span className="font-semibold">Thông tin của bạn: </span>
                      {order.customerContact.fullName || 'Không có tên'}{" "}
                      {order.customerContact.phone && `– ${order.customerContact.phone}`}
                      {order.customerContact.address && (
                        <div className="text-xs text-gray-400">
                          Địa chỉ giao: {order.customerContact.address}
                        </div>
                      )}
                    </div>
                  )}

                  {order.deliveryContact && (
                    <div>
                      <span className="font-semibold">Người giao: </span>
                      {order.deliveryContact.fullName || 'Shipper'}{" "}
                      {order.deliveryContact.phone && `– ${order.deliveryContact.phone}`}
                    </div>
                  )}

                  {role === 'customer' &&
                    (
                      <div className="pt-2 space-x-2">
                        {['pending', 'accepted'].includes(order.status) && (
                          <button
                            onClick={() => handleCancelOrder(order._id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                          >
                            Huỷ đơn
                          </button>
                        )}

                        {order.status === 'delivered' && !order.customerConfirmed && (
                          <button
                            onClick={() => handleConfirmReceived(order._id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                          >
                            Xác nhận đã nhận
                          </button>
                        )}

                        {order.status === 'delivered' && order.customerConfirmed && (
                          <span className="text-sm text-green-300">Bạn đã xác nhận đã nhận</span>
                        )}
                      </div>
                    )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {droneOrder && (
          <DroneSimulationMap
            isOpen={!!droneOrder}
            onClose={() => setDroneOrder(null)}
            orderId={droneOrder.order._id}
            restaurantCoords={droneOrder.restaurantCoords}
            customerCoords={droneOrder.customerCoords}
          />
      )}
    </div>
  );
};

export default OrderHistory;
