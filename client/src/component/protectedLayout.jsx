import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Sidebar from './sidebar';

const ProtectedLayout = ({ allowedRoles = [] }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // Check for authentication
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      console.log('Token:', token);
      console.log('Stored User:', storedUser);
      
      if (!token || !storedUser) {
        setLoading(false);
        return;
      }
      
      try {
        // Parse the user from localStorage
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        //If there's an error parsing the user, clear localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="w-12 h-12 rounded-full border-4 border-yellow-500 border-t-transparent animate-spin"></div>
        <p className="ml-4">Loading...</p>
      </div>
    );
  }
  
  // If not authenticated, redirect to login
  if (!user || !localStorage.getItem('token')) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // If roles are specified and user doesn't have the required role
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  
  return (
    <div className="flex min-h-screen bg-black text-white">
      <Sidebar user={user} />
      
      <div className="flex-1 md:ml-20 lg:ml-64 transition-all duration-300">
        <div className="container mx-auto p-4">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default ProtectedLayout;