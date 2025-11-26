import React, { useState, useEffect } from 'react';
import api from "../lib/axios";

const formatCurrency = (value) =>
  (Number(value) || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

const AllOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await api.get('/delivery/all', {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Fetched orders:', response.data); // Debug: Log orders to check statuses
        setOrders(response.data);
      } catch (err) {
        console.error('Error fetching orders:', err.message);
        setError('Failed to fetch delivery orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const handleClaimOrder = async (orderId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.patch(
        `/delivery/order/${orderId}`,
        { status: 'in-transit' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Claim order response:', response.data); // Debug: Log response

      setOrders(orders.map(order =>
        order._id === orderId ? { ...order, status: 'in-transit', deliveryPersonId: response.data.order?.deliveryPersonId || 'assigned', deliveryPersonName: response.data.order?.deliveryPersonName } : order
      ));
      setError('');
    } catch (err) {
      console.error('Error claiming order:', err.message);
      setError('Failed to claim order');
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (newStatus === 'delivered') {
        // Mark as delivered -> gọi API complete
        await api.post(`/delivery/orders/${orderId}/complete`, {}, { headers });
      } else if (newStatus === 'in-transit' || newStatus === 'accepted') {
        // Nhận/nhấc đơn -> gọi API assign (BE sẽ đẩy trạng thái sang 'in-transit')
        await api.post(`/delivery/orders/${orderId}/accept`, {}, { headers });
      } else {
        // Các trạng thái khác hiện không có API riêng
        throw new Error('Unsupported status update flow');
      }

      // Cập nhật UI lạc quan
      setOrders(orders.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
      setError('');
    } catch (err) {
      console.error('Error updating status:', err?.response?.data || err.message);
      setError('Failed to update order status');
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
      <h1 className="text-3xl font-bold mb-8">Delivery Admin Panel</h1>

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
          <p className="text-xl">No available or assigned orders.</p>
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
                    <p className="text-gray-400 text-sm">
                      Status: {order.status || 'Unknown'}
                    </p>
                    {order.deliveryPersonName ? (
                      <p className="text-gray-400 text-sm">Assigned to: {order.deliveryPersonName}</p>
                    ) : order.deliveryPersonId ? (
                      <p className="text-gray-400 text-sm">Assigned to: Unnamed Delivery Person</p>
                    ) : null}
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
                        <span>{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400">No items available</p>
                  )}
                </div>
                
                {order.customerContact && (
                  <div className="bg-gray-800 p-4 rounded-lg mb-4">
                    <h4 className="font-medium text-yellow-500 mb-2">Khách hàng</h4>
                    <p className="text-gray-200">
                      {order.customerContact.fullName || 'Khách hàng'}{" "}
                      {order.customerContact.phone && `– ${order.customerContact.phone}`}
                    </p>
                    {order.customerContact.address && (
                      <p className="text-gray-400 text-sm mt-1">
                        Địa chỉ: {order.customerContact.address}
                      </p>
                    )}
                  </div>
                )}

                <div className="border-t border-gray-800 pt-4 flex justify-between items-center">
                  <div className="space-x-2">
                    {order.status === 'accepted' && !order.deliveryPersonId ? (
                      <button
                        onClick={() => handleClaimOrder(order._id)}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                      >
                        Claim Order
                      </button>
                    ) : order.status === 'accepted' ? (
                      <p className="text-gray-400 text-sm">Order already assigned</p>
                    ) : null}

                    {order.status === 'in-transit' ? (
                      <button
                        onClick={() => handleStatusUpdate(order._id, 'delivered')}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                      >
                        Mark as Delivered
                      </button>
                    ) : order.status !== 'accepted' && order.status !== 'in-transit' ? (
                      <p className="text-gray-400 text-sm">No actions available</p>
                    ) : null}
                  </div>
                  <div className="font-bold">
                    <span>Total: </span>
                    <span className="text-yellow-500">{formatCurrency(order.total || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AllOrders;