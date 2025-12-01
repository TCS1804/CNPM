import React, { useState, useEffect } from 'react';
import api from "../lib/axios";
import DroneSimulationMap from "../component/DroneSimulationMap";
import axios from "axios";
import RestaurantStatusBanner from '../component/RestaurantStatusBanner';

const DRONE_API =
  import.meta.env.VITE_DRONE_API_BASE_URL || "http://localhost:5055/api/drone";

const fmt = (v) =>
  (Number(v || 0)).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
const getBaseAmount = (order) => {
  if (typeof order?.total === 'number') return order.total;
  if (typeof order?.totalCents === 'number') return order.totalCents / 100;
  return 0;
};

const getShare = (order, key) => {
  const amounts = order?.split?.amounts || {};
  const rates = order?.split?.rates || {};
  const base = getBaseAmount(order);

  const cents = amounts[key];
  if (typeof cents === 'number') return cents / 100;

  const rate = rates[key] || 0;
  return base * rate / 100;
};

const RestaurantOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [droneOrder, setDroneOrder] = useState(null);

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
        setLoading(true);
        setError('');

        const token = localStorage.getItem('token');
        let restaurantId = localStorage.getItem('restaurantId');

        // 🔁 Fallback: nếu chưa có restaurantId thì gọi API lấy danh sách
        if (!restaurantId) {
          const idsRes = await api.get(
            "/restaurant/api/restaurants-id",
            { headers: { Authorization: `Bearer ${token}` } }
          );

          const arr = Array.isArray(idsRes.data) ? idsRes.data : [];
          const first = arr[0];

          if (first && first._id) {
            restaurantId = first._id;
            localStorage.setItem('restaurantId', restaurantId);
          }
        }

        // Nếu vẫn không có thì chịu → yêu cầu tạo profile
        if (!restaurantId) {
          setError('Missing restaurantId. Please create your restaurant profile first.');
          setLoading(false);
          return;
        }

        // ✅ Lúc này chắc chắn đã có restaurantId
        const response = await api.get(
          `/orders/restaurant?restaurantId=${restaurantId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('Fetched orders:', response.data);
        setOrders(response.data);
      } catch (err) {
        console.error('Fetch orders error:', err.response?.data || err.message);
        setError(
          err.response?.data?.message ||
          'Failed to fetch orders'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.patch(
        `/orders/id/${orderId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Status update response:', response.data);

      // Cập nhật state đơn hàng
      setOrders(prev =>
        prev.map(order =>
          order._id === orderId ? { ...order, status: newStatus } : order
        )
      );

      // 🔥 Nếu vừa "accepted" và là đơn giao bằng drone → gọi drone-service /assign
      if (newStatus === 'accepted') {
        // tìm lại order mới nhất
        const updatedOrder =
          response.data?.order ||
          (orders.find(o => o._id === orderId) || {});

        if (updatedOrder.transportMode === 'drone') {
          const restaurant = restaurants.find(
            (r) => r._id === updatedOrder.restaurantId
          );
          const restaurantCoords = restaurant?.location?.coordinates;
          const customerCoords = updatedOrder.location?.coordinates;

          if (restaurantCoords?.lat && restaurantCoords?.lng &&
              customerCoords?.lat && customerCoords?.lng) {
            try {
              await axios.post(`${DRONE_API}/assign`, {
                orderId: updatedOrder._id,
                restaurant: restaurantCoords,
                customer: customerCoords,
              });
              console.log("[drone] assigned mission for order", updatedOrder._id);
            } catch (e) {
              console.error("[drone] assign failed", e.response?.data || e.message);
            }
          } else {
            console.warn("[drone] Missing coordinates for order", updatedOrder._id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
      setError('An error occurred while updating the order status.');
    }
  };

  const getStatusBadgeClass = (status) => {
    const statusLower = (status || '').toString().toLowerCase();
    switch (statusLower) {
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
      <h1 className="text-3xl font-bold mb-8">Incoming Orders</h1>

      <RestaurantStatusBanner />  

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
          <p className="text-xl">No incoming orders.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map(order => {
            const stat = (order.status || '').toLowerCase();

            return (
              <div key={order._id} className="bg-gray-900 rounded-lg shadow-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg">Order #{order._id.substring(order._id.length - 6)}</h3>
                      <p className="text-gray-400 text-sm">
                        {order.createdAt ? formatDate(order.createdAt) : 'Date not available'}
                      </p>
                      <p className="text-gray-400 text-sm">
                        Status: {order.status || 'Unknown'}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(order.status)}`}>
                      {order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Unknown'}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item, index) => (
                        <div key={index} className="flex justify-between">
                          <span>{item.quantity}x {item.name}</span>
                          <span>{fmt(item.price * item.quantity)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-400">No items available</p>
                    )}

                    {order.split?.amounts && (
                      <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.6 }}>
                        <div><b>Chia tiền</b> ({order.split?.method})</div>
                        <div>• Nhà hàng nhận: {fmt(getShare(order, 'restaurant'), order.split?.currency)}</div>
                        <div>• Admin: {fmt(getShare(order, 'admin'), order.split?.currency)}</div>
                        <div>• Shipper: {fmt(getShare(order, 'delivery'), order.split?.currency)}</div>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-800 pt-4 flex justify-between items-center">
                    <div className="space-x-2">
                      {stat === 'pending' ? (
                        <button
                          onClick={() => handleStatusUpdate(order._id, 'accepted')}
                          className="bg-yellow-500 text-black px-4 py-2 rounded hover:bg-yellow-600"
                        >
                          Accept Order
                        </button>
                      ) : (
                        <p className="text-gray-400 text-sm">No actions available</p>
                      )}

                      {order.transportMode === 'drone' && order.location?.coordinates && (() => {
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
                            Xem drone giao hàng
                          </button>
                        );
                      })()}
                    </div>

                    <div className="font-bold">
                      <span>Total: </span>
                      <span className="text-yellow-500">{fmt(getBaseAmount(order))}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

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
      )}
    </div>
  );  
};

export default RestaurantOrders;