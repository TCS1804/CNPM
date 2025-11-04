import React, { useState, useEffect } from 'react';
import axios from 'axios';

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');

        let endpoint = '/order/customer/orders';
        if (user === 'restaurant') {
          endpoint = '/order/restaurant';
        } else if (user === 'delivery') {
          endpoint = '/order/delivery';
        }

        const response = await axios.get(`http://localhost:5030${endpoint}`, {
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
                      <span>${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-800 pt-4 flex justify-between items-center font-bold">
                  <span>Total</span>
                  <span className="text-yellow-500">${order.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
