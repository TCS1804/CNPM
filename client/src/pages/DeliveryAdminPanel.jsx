import React, { useState, useEffect } from 'react';
import api from "../lib/axios";

const fmt = (v) =>
  `${(Number(v || 0)).toLocaleString('en-US')} $`;

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

const DeliveryAdminPanel = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await api.get('/delivery/orders', {
          headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Fetched orders:', response.data);
        // Debug: Check if location data exists
        if (response.data.length > 0) {
          console.log('First order details:', response.data[0]);
          console.log('Location data available?', !!response.data[0].location);
        }
        
        // Option 1: Use the data as is (if backend is properly sending location)
        setOrders(response.data);
        
        // Option 2: Uncomment to add dummy location data for testing
        /*
        const ordersWithLocation = response.data.map(order => ({
          ...order,
          location: order.location || {
            address: "123 Test Street, City, Country",
            coordinates: {
              lat: 37.7749,
              lng: -122.4194
            }
          }
        }));
        setOrders(ordersWithLocation);
        */
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
        `delivery/order/${orderId}`,
        { status: 'in-transit' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Claim order response:', response.data);

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

  const openInGoogleMaps = (location) => {
    if (!location || !location.coordinates) {
      alert('Location coordinates not available');
      return;
    }
    
    const { lat, lng } = location.coordinates;
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, '_blank');
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
                {/* Debug information - uncomment if needed */}
                {/*
                <div className="bg-red-800 p-2 mb-4 text-xs">
                  <p>Order ID: {order._id}</p>
                  <p>Has location object: {order.location ? "Yes" : "No"}</p>
                  <p>Location data: {JSON.stringify(order.location)}</p>
                </div>
                */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg">Order #{order._id.substring(order._id.length - 6)}</h3>
                    {order.createdAt && (
                      <p className="text-gray-400 text-sm">
                        {formatDate(order.createdAt)}
                      </p>
                    )}
                    <p className="text-gray-400 text-sm">
                      Status: {order.status || 'Unknown'}
                    </p>
                    {order.deliveryPersonName ? (
                      <p className="text-gray-400 text-sm">Assigned to: {order.deliveryPersonName}</p>
                    ) : order.deliveryPersonId ? (
                      <p className="text-gray-400 text-sm">Assigned to: Unnamed Delivery Person</p>
                    ) : null}
                    {order.split?.amounts?.delivery != null && (
                      <div style={{ marginTop: 6, fontSize: 14 }}>
                        Thu cho chuyến này: <b>{fmt(getShare(order, 'delivery'))}</b>
                      </div>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(order.status)}`}>
                    {order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Unknown'}
                  </span>
                </div>

                {/* Flexible location information handling */}
                <div className="bg-gray-800 p-4 rounded-lg mb-4">
                  <h4 className="font-medium text-yellow-500 mb-2">Delivery Location</h4>
                  {order.location ? (
                    <>
                      <p className="text-gray-300 mb-2">
                        {order.location.address || 'Address not available'}
                      </p>
                      {order.location.coordinates && (
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                          <span className="text-gray-400 text-sm mb-2 sm:mb-0">
                            Coordinates: {order.location.coordinates.lat.toFixed(6)}, {order.location.coordinates.lng.toFixed(6)}
                          </span>
                          <button
                            onClick={() => openInGoogleMaps(order.location)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded flex items-center w-full sm:w-auto justify-center sm:justify-start"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Open in Google Maps
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                      <p className="text-red-400 mb-2 sm:mb-0">Location information not available for this order.</p>
                      <button
                        onClick={() => alert("No location data available for this order")}
                        className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded flex items-center opacity-50 cursor-not-allowed w-full sm:w-auto justify-center sm:justify-start"
                        disabled
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Map Unavailable
                      </button>
                    </div>
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

                <div className="space-y-2 mb-4">
                  <h4 className="font-medium text-yellow-500 mb-2">Order Items</h4>
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item, index) => (
                      <div key={index} className="flex justify-between py-1 border-b border-gray-800">
                        <span>{item.quantity}x {item.name}</span>
                        <span>{fmt(item.price * item.quantity)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400">No items available</p>
                  )}
                </div>

                <div className="border-t border-gray-800 pt-4 flex flex-col sm:flex-row justify-between items-center">
                  <div className="space-x-2 mb-4 sm:mb-0 w-full sm:w-auto">
                    {order.status === 'accepted' && !order.deliveryPersonId ? (
                      <button
                        onClick={() => handleClaimOrder(order._id)}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full sm:w-auto"
                      >
                        Claim Order
                      </button>
                    ) : order.status === 'accepted' ? (
                      <p className="text-gray-400 text-sm">Order already assigned</p>
                    ) : null}

                    {order.status === 'in-transit' ? (
                      <button
                        onClick={() => handleStatusUpdate(order._id, 'delivered')}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-full sm:w-auto"
                      >
                        Mark as Delivered
                      </button>
                    ) : order.status !== 'accepted' && order.status !== 'in-transit' ? (
                      <p className="text-gray-400 text-sm">No actions available</p>
                    ) : null}
                  </div>
                  <div className="font-bold">
                    <span>Total: </span>
                    <span className="text-yellow-500">{fmt(getBaseAmount(order))}</span>
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

export default DeliveryAdminPanel;