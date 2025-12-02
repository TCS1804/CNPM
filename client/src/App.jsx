import { BrowserRouter, Routes, Route } from "react-router-dom";
import React from 'react';
import Home from './pages/Home';
import Login from './pages/login';
import Register from './pages/registar';
import RestaurantProfile from './pages/RestaurantProfile';
import AdminDashboard from './pages/AdminDashboard';
import AdminSplit from './pages/AdminSplit';
import AdminRevenue from './pages/AdminRevenue';
import AdminOrders from './pages/AdminOrders';
import AdminDrones from './pages/AdminDrones';
import AdminDroneMissions from './pages/AdminDroneMissions';
import MenuManagement from './pages/MenuManagement';
import MenuItemsList from './pages/MenuItemsList';
import CreateOrder from './pages/CreateOrder';
import OrderHistory from './pages/OrderHistory';
import DeliveryAdminPanel from './pages/DeliveryAdminPanel';
import AllOrders from './pages/AllOrders';
import RestaurantOrders from './pages/RestaurantOrders';
import HomeAll from './pages/HomeAll';
import ProtectedLayout from './component/protectedLayout';
import { CartProvider } from './CartContext';
import CustomerProfile from "./pages/CustomerProfile";
import DeliveryProfile from "./pages/DeliveryProfile";
import AdminRestaurants from './pages/AdminRestaurants';
import AdminUsers from './pages/AdminUsers';

const App = () => {
  return (
    <CartProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          {/* <Route path="/home" element={<HomeAll />} /> */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/split" element={<AdminSplit />} />
          <Route path="/admin/revenue" element={<AdminRevenue />} />
          {/* Nếu bạn có các trang dưới đây, thêm vào luôn */}
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/restaurants" element={<AdminRestaurants />} />
          {/* <Route path="/admin/deliveries" element={<AdminDeliveries />} /> */}
          {/* <Route path="/admin/settings" element={<AdminSettings />} /> */}
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/drones" element={<AdminDrones />} />
          <Route path="/admin/drone-missions" element={<AdminDroneMissions />} />
          <Route element={<ProtectedLayout />}>
            {/* <Route path="/orders" element={<OrderHistory />} /> */}
          </Route>
          <Route element={<ProtectedLayout allowedRoles={['restaurant']} />}>
            <Route path="/restaurant/profile" element={<RestaurantProfile />} />
            <Route path="/restaurant/menu/add" element={<MenuManagement />} />
            <Route path="/restaurant/menu" element={<MenuItemsList />} />
            <Route path="/restaurant/orders" element={<RestaurantOrders />} />
          </Route>
          <Route element={<ProtectedLayout allowedRoles={['customer']} />}>
            <Route path="/home" element={<HomeAll />} />
            <Route path="/create-order" element={<CreateOrder />} />
            <Route path="/orders" element={<OrderHistory />} />
            <Route path="/customer/profile" element={<CustomerProfile />} />
          </Route>
          <Route element={<ProtectedLayout allowedRoles={['delivery']} />}>
            <Route path="/delivery-admin" element={<DeliveryAdminPanel />} />
            <Route path="/delivery/orders/all" element={<AllOrders />} />
            <Route path="/delivery/profile" element={<DeliveryProfile />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </CartProvider>
  );
};

export default App;