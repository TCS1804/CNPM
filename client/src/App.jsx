import { BrowserRouter, Routes, Route } from "react-router-dom";
import React from 'react';
import Home from './pages/Home';
import Login from './pages/login';
import Register from './pages/registar';
import RestaurantProfile from './pages/RestaurantProfile';
import MenuManagement from './pages/MenuManagement';
import MenuItemsList from './pages/MenuItemsList';
import CreateOrder from './pages/CreateOrder';
import OrderHistory from './pages/OrderHistory';
import DeliveryAdminPanel from './pages/DeliveryAdminPanel';
import AllOrders from './pages/AllOrders';
import RestaurantOrders from './pages/RestaurantOrders';
import HomeAll from './pages/HomeAll';
import ProtectedLayout from './component/ProtectedLayout';
import { CartProvider } from './CartContext';

const App = () => {
  return (
    <CartProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/home" element={<HomeAll />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/orders" element={<OrderHistory />} />
          </Route>
          <Route element={<ProtectedLayout allowedRoles={['restaurant']} />}>
            <Route path="/restaurant/profile" element={<RestaurantProfile />} />
            <Route path="/restaurant/menu/add" element={<MenuManagement />} />
            <Route path="/restaurant/menu" element={<MenuItemsList />} />
            <Route path="/restaurant/orders" element={<RestaurantOrders />} />
          </Route>
          <Route element={<ProtectedLayout allowedRoles={['customer']} />}>
            <Route path="/create-order" element={<CreateOrder />} />
          </Route>
          <Route element={<ProtectedLayout allowedRoles={['delivery']} />}>
            <Route path="/delivery-admin" element={<DeliveryAdminPanel />} />
            <Route path="/delivery/orders/all" element={<AllOrders />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </CartProvider>
  );
};

export default App;