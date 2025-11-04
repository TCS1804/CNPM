import React, { useState, useEffect } from 'react';
import axios from 'axios';

const RestaurantOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem('token');
        const restaurantId = localStorage.getItem('restaurantId');
        if (!restaurantId) {
          setError('Missing restaurantId. Please create your restaurant profile first.');
          setLoading(false);
          return;
        }
        const response = await axios.get(
          `http://localhost:5030/order/restaurant?restaurantId=${restaurantId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('Fetched orders:', response.data); // Debug: Log orders
        setOrders(response.data);
      } catch (err) {
        console.error('Error fetching orders:', err.message);
        setError('Failed to fetch restaurant orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `http://localhost:5030/order/id/${orderId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Status update response:', response.data); // Debug: Log response

      setOrders(orders.map(order =>
        order._id === orderId ? { ...order, status: newStatus } : order
      ));
      setError('');
    } catch (err) {
      console.error('Error updating status:', err.message);
      setError('Failed to update order status');
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
                          <span>${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-400">No items available</p>
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
                    </div>
                    <div className="font-bold">
                      <span>Total: </span>
                      <span className="text-yellow-500">${order.total ? order.total.toFixed(2) : '0.00'}</span>
                    </div>
                  </div>
                </div>
              </div>
          )})}
        </div>
      )}
    </div>
  );
};

export default RestaurantOrders;