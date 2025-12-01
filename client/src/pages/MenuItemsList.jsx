import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from "../lib/axios";
import RestaurantStatusBanner from '../component/RestaurantStatusBanner';

const formatCurrency = (value) =>
  (Number(value) || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

const MenuItemsList = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const restaurantId = localStorage.getItem('restaurantId');
      // fallback: nếu chưa có thì gọi danh sách id từ BE rồi lấy id đầu tiên
      let id = restaurantId;
      if (!id) {
        const idsRes = await api.get(
          "/restaurant/api/restaurants-id",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        id = idsRes.data?.[0]?._id;
        if (id) localStorage.setItem('restaurantId', id);
      }
      if (!id) {
        setError('No restaurant found. Please create your restaurant profile first.');
        setLoading(false);
        return;
      }
      const response = await api.get(
        `/restaurant/api/restaurants/${id}/menu`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      
      console.log('Fetched menu items:', response.data); // Debug: Log full response
      response.data.forEach(item => {
        if (item.imageUrl) {
          console.log('Image URL for', item.name, ':', item.imageUrl);
        }
      });
      setMenuItems(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch menu items');
      console.error('Fetch error:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleteLoading(id);
    
    try {
      const token = localStorage.getItem('token');
      await api.delete(`/restaurant/api/menu/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMenuItems(menuItems.filter(item => item._id !== id));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete menu item');
      console.error('Delete error:', err);
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleEdit = (item) => {
    // Điều hướng sang trang MenuManagement, kèm dữ liệu món
    navigate('/restaurant/menu/add', { state: { item } });
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="bg-yellow-500 text-black p-4 shadow-md">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
          <h1 className="text-2xl font-bold mb-4 md:mb-0">FoodDelivery</h1>
          
          <RestaurantStatusBanner />
          
          <nav className="flex flex-wrap gap-2">
            <button 
              onClick={() => navigate('/restaurant/menu/add')} 
              className="px-4 py-2 bg-black text-white font-medium rounded hover:bg-gray-800 transition duration-200"
            >
              Add Menu Item
            </button>
            <button 
              onClick={() => navigate('/home')} 
              className="px-4 py-2 text-black font-medium hover:underline"
            >
              Home
            </button>
          </nav>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto px-4 py-8 md:py-16">
        <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">Your Menu Items</h2>
        
        {error && (
          <div className="bg-red-500 text-white p-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full border-4 border-yellow-500 border-t-transparent animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading menu items...</p>
          </div>
        ) : menuItems.length === 0 ? (
          <div className="text-center py-8 bg-gray-900 rounded-lg max-w-xl mx-auto">
            <p className="text-xl mb-4">You haven't added any menu items yet.</p>
            <button 
              onClick={() => navigate('/restaurant/menu/add')} 
              className="px-6 py-3 bg-yellow-500 text-black font-medium rounded hover:bg-yellow-600 transition duration-200"
            >
              Add Your First Item
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems.map(item => (
              <div 
                key={item._id} 
                className="bg-gray-900 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition duration-200"
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      console.error(`Failed to load image: ${item.imageUrl}`);
                      e.target.src = 'https://placehold.co/150x150?text=No+Image';
                    }}
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-800 flex items-center justify-center">
                    <span className="text-gray-400">No Image</span>
                  </div>
                )}
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2">{item.name}</h3>
                  <p className="text-gray-400 mb-4">{item.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-yellow-500 font-bold text-xl">
                      {formatCurrency(item?.price)}
                    </span>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDelete(item._id)}
                        disabled={deleteLoading === item._id}
                        className={`px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm ${
                          deleteLoading === item._id ? 'opacity-70 cursor-not-allowed' : ''
                        }`}
                      >
                        {deleteLoading === item._id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      
      <footer className="bg-gray-900 text-white text-center py-4 mt-8">
        <p>© {new Date().getFullYear()} FoodDelivery. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default MenuItemsList;