import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const RestaurantProfile = () => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        'http://localhost:5020/restaurant/api/restaurants', 
        { name },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const created = response.data; // BE trả về document nhà hàng
      if (created && created._id) {
        localStorage.setItem('restaurantId', created._id);
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
            
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded font-medium bg-yellow-500 text-black hover:bg-yellow-600 transition duration-200 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Creating...' : 'Create Restaurant'}
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