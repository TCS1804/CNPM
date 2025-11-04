import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CartContext } from '../CartContext';

const HomeAll = () => {
  const { cart, addToCart } = useContext(CartContext);
  const [menuItems, setMenuItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const navigate = useNavigate();

  // Check if user is logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  // Fetch all menu items
  useEffect(() => {
    const fetchMenuItems = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5020/restaurant/menu/all', {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Fetched menu items:', response.data);
        setMenuItems(response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch menu items');
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMenuItems();
  }, []);

  // Update search results when searchQuery changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }
    
    const filteredItems = menuItems.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.restaurantName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    setSearchResults(filteredItems);
  }, [searchQuery, menuItems]);

  // Handle adding item to cart
  const handleAddToCart = (item) => {
    addToCart({
      ...item,
      quantity: 1
    });
    
    // Show feedback
    const notification = document.getElementById('notification');
    if (notification) {
      notification.classList.remove('hidden');
      notification.classList.add('flex');
      setTimeout(() => {
        notification.classList.add('hidden');
        notification.classList.remove('flex');
      }, 2000);
    }
  };

  // Calculate total items in cart for badge
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  // Handle sign out
  const handleSignOut = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // Toggle search bar
  const toggleSearchBar = () => {
    setShowSearchBar(!showSearchBar);
    if (showSearchBar) {
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  // Filter menu items for display
  const getDisplayItems = () => {
    return searchQuery.trim() !== '' ? searchResults : menuItems;
  };

  // Filter for popular items (we'll consider items with lower prices as popular for demonstration)
  const getPopularItems = () => {
    return [...menuItems]
      .sort((a, b) => a.price - b.price)
      .slice(0, 3);
  };

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      {/* Notification */}
      <div 
        id="notification" 
        className="hidden fixed top-5 right-5 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg items-center"
        style={{ zIndex: 9999 }}
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
        </svg>
        Item added to cart!
      </div>

      {/* Header - Similar to Uber Eats */}
      <header className="bg-white py-4 px-6 shadow-sm border-b sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <h1 
              className="text-2xl font-bold cursor-pointer" 
              onClick={() => navigate('/')}
            >
              <span className="text-black">Eat</span>
              <span className="text-green-500">zaa</span>
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {/* <button
              className="flex items-center text-black px-3 py-2"
              onClick={() => navigate('/delivery-timing')}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Deliver now
            </button> */}
            
            <div className="relative">
              <button
                onClick={toggleSearchBar}
                className="flex items-center text-black px-3 py-2"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search
              </button>
            </div>
            
            <div className="relative">
              <button
                onClick={() => navigate('/create-order')}
                className="flex items-center text-black px-3 py-2"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Cart
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </button>
            </div>
            
            <button
              onClick={handleSignOut}
              className="bg-white text-black font-medium border border-gray-300 rounded-full px-4 py-2 hover:bg-gray-100"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Search Bar Dropdown */}
        {showSearchBar && (
          <div className="container mx-auto mt-4 animate-slideDown">
            <div className="flex items-center bg-gray-100 rounded-full px-4 py-2">
              <svg className="w-5 h-5 text-gray-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for restaurants, cuisines, dishes..."
                className="flex-1 bg-transparent focus:outline-none"
                autoFocus
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="text-gray-500"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-500 text-white p-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full border-4 border-green-500 border-t-transparent animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading menu items...</p>
          </div>
        ) : searchQuery && searchResults.length === 0 ? (
          <div className="text-center py-8 bg-gray-100 rounded-lg max-w-xl mx-auto">
            <p className="text-xl mb-4">No menu items found for "{searchQuery}"</p>
            <button 
              onClick={() => setSearchQuery('')}
              className="text-green-500 underline"
            >
              Clear search
            </button>
          </div>
        ) : (
          <>
            {/* Search Results */}
            {searchQuery && (
              <div className="mb-16">
                <h2 className="text-2xl font-bold mb-4">Search Results for "{searchQuery}"</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {searchResults.map(item => (
                    <div
                      key={`search-${item._id}`}
                      className="rounded-lg overflow-hidden shadow hover:shadow-md transition duration-200 cursor-pointer"
                      onClick={() => navigate(`/menu-item/${item._id}`)}
                    >
                      <div className="relative">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-48 object-cover"
                            onError={(e) => {
                              e.target.src = 'https://placehold.co/150x150?text=No+Image';
                            }}
                          />
                        ) : (
                          <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-400">No Image</span>
                          </div>
                        )}
                        <button 
                          className="absolute top-3 right-3 bg-white rounded-full p-1 shadow"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Favorite functionality would go here
                          }}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </button>
                      </div>
                      <div className="p-4">
                        <h3 className="text-lg font-semibold">{item.name}</h3>
                        <p className="text-gray-600 text-sm mb-1">
                          $$ • {item.restaurantName} • {item.category || 'Various'}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-sm">
                            <span className="flex items-center mr-2">
                              <svg className="w-4 h-4 text-yellow-500 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              4.6
                            </span>
                            <span className="mr-2">20–35 min</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToCart(item);
                            }}
                            className="bg-green-500 text-white text-sm px-3 py-1 rounded hover:bg-green-600 transition"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Only show these sections if not searching */}
            {!searchQuery && (
              <>
                {/* Special Offers Section */}
                <div className="mb-16">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-2xl font-bold">Special Offers</h2>
                      <p className="text-gray-600 text-sm">Provided by local restaurants</p>
                    </div>
                    <div className="flex space-x-2">
                      <button className="bg-gray-100 rounded-full p-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button className="bg-gray-100 rounded-full p-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {getDisplayItems().slice(0, 6).map((item, index) => (
                      <div
                        key={`special-${item._id}`}
                        className="rounded-lg overflow-hidden shadow hover:shadow-md transition duration-200 relative cursor-pointer"
                        onClick={() => navigate(`/menu-item/${item._id}`)}
                      >
                        <div className="relative">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-48 object-cover"
                              onError={(e) => {
                                e.target.src = 'https://placehold.co/150x150?text=No+Image';
                              }}
                            />
                          ) : (
                            <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-400">No Image</span>
                            </div>
                          )}
                          <div className="absolute top-3 left-3 bg-purple-600 text-white text-xs px-2 py-1 rounded">
                            {index % 2 === 0 ? 'Spend A$15, Save A$3' : 'Spend A$20, Save A$5'}
                          </div>
                          <button 
                            className="absolute top-3 right-3 bg-white rounded-full p-1 shadow"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Favorite functionality would go here
                            }}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                          </button>
                        </div>
                        <div className="p-4">
                          <h3 className="text-lg font-semibold">{item.name}</h3>
                          <p className="text-gray-600 text-sm mb-1">
                            $$ • {item.restaurantName} • {item.category || 'Various'}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center text-sm">
                              <span className="flex items-center mr-2">
                                <svg className="w-4 h-4 text-yellow-500 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                {4.5 + (index % 5) / 10}
                              </span>
                              <span className="mr-2">{20 + (index % 3) * 5}–{35 + (index % 3) * 5} min</span>
                              <span>${item.price.toFixed(2)} fee</span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToCart(item);
                              }}
                              className="bg-green-500 text-white text-sm px-3 py-1 rounded hover:bg-green-600 transition"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Popular Near You Section */}
                <div className="mb-16">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Popular Near You</h2>
                    <div className="flex items-center">
                      <a href="#" className="text-green-500 mr-4">View all</a>
                      <div className="flex space-x-2">
                        <button className="bg-gray-100 rounded-full p-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button className="bg-gray-100 rounded-full p-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {getPopularItems().map((item, index) => (
                      <div
                        key={`popular-${item._id}`}
                        className="rounded-lg overflow-hidden shadow hover:shadow-md transition duration-200 cursor-pointer"
                        onClick={() => navigate(`/menu-item/${item._id}`)}
                      >
                        <div className="relative">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-48 object-cover"
                              onError={(e) => {
                                e.target.src = 'https://placehold.co/150x150?text=No+Image';
                              }}
                            />
                          ) : (
                            <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-400">No Image</span>
                            </div>
                          )}
                          <button 
                            className="absolute top-3 right-3 bg-white rounded-full p-1 shadow"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Favorite functionality would go here
                            }}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                          </button>
                        </div>
                        <div className="p-4">
                          <h3 className="text-lg font-semibold">{item.name}</h3>
                          <p className="text-gray-600 text-sm mb-1">
                            $$ • {item.restaurantName} • {item.category || 'Various'}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center text-sm">
                              <span className="flex items-center mr-2">
                                <svg className="w-4 h-4 text-yellow-500 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                {4.6 + (index % 3) / 10}
                              </span>
                              <span className="mr-2">{15 + (index % 4) * 5}–{30 + (index % 4) * 5} min</span>
                              <span>${item.price.toFixed(2)} fee</span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToCart(item);
                              }}
                              className="bg-green-500 text-white text-sm px-3 py-1 rounded hover:bg-green-600 transition"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>

      <footer className="bg-gray-50 text-gray-600 text-center py-6 text-sm">
        <p>© {new Date().getFullYear()} Eatzaa. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default HomeAll;