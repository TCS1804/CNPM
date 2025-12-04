import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from "../lib/axios";
import AddressPicker from '../component/AddressPicker';
import RestaurantStatusBanner from '../component/RestaurantStatusBanner';

const RestaurantProfile = () => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      
      const payload = {
        name,
        address,
        location: {
          coordinates: {
            lat: lat ? Number(lat) : undefined,
            lng: lng ? Number(lng) : undefined,
          }
        }
      };

      const response = await api.post(
        "/restaurant/api/restaurants",
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const created = response.data; // BE trả về document nhà hàng
      if (created && created._id) {
        localStorage.setItem('restaurantId', created._id);
        // Notify user that restaurant info saved
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('Restaurant', { body: 'Đã lưu thông tin nhà hàng thành công' });
        }
        navigate('/restaurant/menu');
      } else {
        setError('Server did not return restaurant id');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create restaurant profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="bg-yellow-500 text-black p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">FoodDelivery</h1>
          <nav>
            <button 
              onClick={() => navigate('/')} 
              className="px-4 py-2 text-black font-medium hover:underline"
            >
              Home
            </button>
          </nav>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-md mx-auto bg-gray-900 rounded-lg shadow-lg p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">Create Restaurant Profile</h2>
          
          {/* NEW: hiển thị trạng thái nhà hàng */}
          <RestaurantStatusBanner />
          
          {error && (
            <div className="bg-red-500 text-white p-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Restaurant Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                required
                placeholder="Enter your restaurant name"
              />
            </div>

            <div className="mb-6">
              <AddressPicker
                value={address}
                onChangeAddress={(addr) => setAddress(addr)}
                onChangeCoords={({ lat, lng }) => {
                  // auto điền vào 2 ô Lat/Lng bên dưới
                  setLat(String(lat));
                  setLng(String(lng));
                }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label htmlFor="lat" className="block text-sm font-medium mb-2">
                  Latitude
                </label>
                <input
                  type="number"
                  id="lat"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="w-full px-4 py-3 rounded bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="e.g. 10.776889"
                />
              </div>
              <div>
                <label htmlFor="lng" className="block text-sm font-medium mb-2">
                  Longitude
                </label>
                <input
                  type="number"
                  id="lng"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  className="w-full px-4 py-3 rounded bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="e.g. 106.700806"
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded font-medium bg-yellow-500 text-black hover:bg-yellow-600 transition duration-200 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Creating...' : 'Create Restaurant'}
            </button>

            <button
              type="button"
              onClick={() => navigate("/account/change-password")}
              className="w-full mt-3 py-2 px-4 rounded font-medium bg-gray-700 text-white hover:bg-gray-600 transition"
            >
              Đổi mật khẩu
            </button>
          </form>
        </div>
      </main>
      
      <footer className="bg-gray-900 text-white text-center py-4">
        <p>&copy; {new Date().getFullYear()} FoodDelivery. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default RestaurantProfile;