import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Home, User, Coffee, ShoppingBag, LogOut, FileText, ShoppingCart, Truck } from 'lucide-react';

const Sidebar = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Close sidebar when route changes (mobile)
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);
  
  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };
  
  // Get user role
  const role = user?.role || localStorage.getItem('role');
  
  // Check roles
  const isRestaurant = role === 'restaurant';
  const isCustomer = role === 'customer';
  const isDelivery = role === 'delivery';
  
  // Check if a route is active
  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-4 left-4 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 bg-gray-900 rounded-md text-white hover:bg-gray-800 transition duration-200"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      
      {/* Sidebar */}
      <div 
        className={`fixed top-0 left-0 h-full bg-gray-900 text-white z-30 transition-all duration-300 ease-in-out shadow-lg
                    ${isOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:translate-x-0 md:w-20 lg:w-64'}`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-center md:justify-start">
            <div className="bg-yellow-500 rounded-md p-2">
              <Coffee className="text-black" size={isOpen || window.innerWidth >= 1024 ? 24 : 20} />
            </div>
            <h1 className={`ml-2 font-bold text-xl ${!isOpen && window.innerWidth < 1024 ? 'hidden' : 'block'}`}>
            <span className="text-white">Eat</span>
            <span className="text-green-500">zaa</span>
            </h1>
          </div>
        </div>
        
        {/* Navigation Links */}
        <nav className="p-4">
          <ul className="space-y-2">
            <li>
              <Link 
                to="/home"
                className={`flex items-center p-3 rounded-md transition-colors duration-200
                           ${isActive('/home') ? 'bg-yellow-500 text-black' : 'hover:bg-gray-800'}`}
              >
                <Home size={20} />
                <span className={`ml-3 ${!isOpen && window.innerWidth < 1024 ? 'hidden' : 'block'}`}>Home</span>
              </Link>
            </li>
            
            {/* Restaurant Links */}
            {isRestaurant && (
              <>
                <li>
                  <Link 
                    to="/restaurant/profile"
                    className={`flex items-center p-3 rounded-md transition-colors duration-200
                               ${isActive('/restaurant/profile') ? ' Bg-yellow-500 text-black' : 'hover:bg-gray-800'}`}
                  >
                    <User size={20} />
                    <span className={`ml-3 ${!isOpen && window.innerWidth < 1024 ? 'hidden' : 'block'}`}>Restaurant Profile</span>
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/restaurant/menu"
                    className={`flex items-center p-3 rounded-md transition-colors duration-200
                               ${isActive('/restaurant/menu') ? 'bg-yellow-500 text-black' : 'hover:bg-gray-800'}`}
                  >
                    <Coffee size={20} />
                    <span className={`ml-3 ${!isOpen && window.innerWidth < 1024 ? 'hidden' : 'block'}`}>Menu Items</span>
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/restaurant/menu/add"
                    className={`flex items-center p-3 rounded-md transition-colors duration-200
                               ${isActive('/restaurant/menu/add') ? 'bg-yellow-500 text-black' : 'hover:bg-gray-800'}`}
                  >
                    <ShoppingBag size={20} />
                    <span className={`ml-3 ${!isOpen && window.innerWidth < 1024 ? 'hidden' : 'block'}`}>Add Menu Item</span>
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/restaurant/orders"
                    className={`flex items-center p-3 rounded-md transition-colors duration-200
                               ${isActive('/restaurant/orders') ? 'bg-yellow-500 text-black' : 'hover:bg-gray-800'}`}
                  >
                    <FileText size={20} />
                    <span className={`ml-3 ${!isOpen && window.innerWidth < 1024 ? 'hidden' : 'block'}`}>Incoming Orders</span>
                  </Link>
                </li>
              </>
            )}
            
            {/* Customer Links */}
            {isCustomer && (
              <>
                <li>
                  <Link 
                    to="/create-order"
                    className={`flex items-center p-3 rounded-md transition-colors duration-200
                               ${isActive('/create-order') ? 'bg-yellow-500 text-black' : 'hover:bg-gray-800'}`}
                  >
                    <ShoppingCart size={20} />
                    <span className={`ml-3 ${!isOpen && window.innerWidth < 1024 ? 'hidden' : 'block'}`}>Place Order</span>
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/orders"
                    className={`flex items-center p-3 rounded-md transition-colors duration-200
                               ${isActive('/orders') ? 'bg-yellow-500 text-black' : 'hover:bg-gray-800'}`}
                  >
                    <FileText size={20} />
                    <span className={`ml-3 ${!isOpen && window.innerWidth < 1024 ? 'hidden' : 'block'}`}>My Orders</span>
                  </Link>
                </li>
              </>
            )}
            
            {/* Delivery Person Links */}
            {isDelivery && (
              <>
                <li>
                  <Link 
                    to="/delivery-admin"
                    className={`flex items-center p-3 rounded-md transition-colors duration-200
                               ${isActive('/delivery-admin') ? 'bg-yellow-500 text-black' : 'hover:bg-gray-800'}`}
                  >
                    <Truck size={20} />
                    <span className={`ml-3 ${!isOpen && window.innerWidth < 1024 ? 'hidden' : 'block'}`}>My Orders</span>
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/delivery/orders/all"
                    className={`flex items-center p-3 rounded-md transition-colors duration-200
                               ${isActive('/delivery/orders/all') ? 'bg-yellow-500 text-black' : 'hover:bg-gray-800'}`}
                  >
                    <FileText size={20} />
                    <span className={`ml-3 ${!isOpen && window.innerWidth < 1024 ? 'hidden' : 'block'}`}>Available Orders</span>
                  </Link>
                </li>
              </>
            )}
            
            <li className="mt-8">
              <button 
                onClick={handleLogout}
                className="flex items-center w-full p-3 rounded-md transition-colors duration-200 hover:bg-gray-800"
              >
                <LogOut size={20} />
                <span className={`ml-3 ${!isOpen && window.innerWidth < 1024 ? 'hidden' : 'block'}`}>Logout</span>
              </button>
            </li>
          </ul>
        </nav>
      </div>
      
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;