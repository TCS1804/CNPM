import { createContext, useContext, useEffect, useRef, useState } from "react";
import api from "./lib/axios";

export const CartContext = createContext();

const ORDER_BASE = import.meta.env.VITE_ORDER_BASE_URL || "/orders";

// Chuẩn hoá item thành cart item thống nhất theo menuItemId
const toCartItem = (item) => {
  const menuItemId = item?.menuItemId || item?._id || item?.id;

  return {
    ...item,
    menuItemId,
  };
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [canSync, setCanSync] = useState(false); // chỉ sync khi user là customer + có token
  const syncTimerRef = useRef(null);

  // Kiểm tra role để bật sync cart
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedRole = localStorage.getItem("role");

    if (!storedUser || !storedRole || storedRole !== "customer") {
      setCanSync(false);
      return;
    }

    setCanSync(true);

    const fetchCart = async () => {
      try {
        const res = await api.get(`${ORDER_BASE}/cart`);
        const items = res.data?.items || [];

        // luôn chuẩn hoá item khi lấy từ BE
        setCart(items.map((item) => toCartItem(item)));
      } catch (err) {
        console.error("Failed to fetch cart", err);
      }
    };

    fetchCart();
  }, []);

  // Chuẩn hoá payload gửi lên backend
  const buildBackendItems = (cartItems) =>
    cartItems.map((item) => ({
      menuItemId: item.menuItemId,
      restaurantId: item.restaurantId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      restaurantName: item.restaurantName,
    }));

  // Sync cart lên backend khi cart thay đổi
  useEffect(() => {
    if (!canSync) return;

    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);

    syncTimerRef.current = setTimeout(async () => {
      try {
        await api.put(`${ORDER_BASE}/cart`, { items: buildBackendItems(cart) });
      } catch (err) {
        console.error("Failed to sync cart", err);
      }
    }, 400);

    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [cart, canSync]);

  // Add item to cart (dựa vào menuItemId)
  const addToCart = (item) => {
    const normalized = toCartItem(item);

    setCart((prevCart) => {
      const existingItem = prevCart.find(
        (cartItem) => cartItem.menuItemId === normalized.menuItemId
      );

      if (existingItem) {
        return prevCart.map((cartItem) =>
          cartItem.menuItemId === normalized.menuItemId
            ? { ...cartItem, quantity: (cartItem.quantity || 0) + 1 }
            : cartItem
        );
      }

      return [...prevCart, { ...normalized, quantity: 1 }];
    });
  };

  // Giảm quantity hoặc xoá item nếu quantity=1
  const removeFromCart = (menuItemId) =>
    setCart((prevCart) => {
      const existingItem = prevCart.find(
        (item) => item.menuItemId === menuItemId
      );
      if (!existingItem) return prevCart;

      if ((existingItem.quantity || 1) <= 1) {
        return prevCart.filter((item) => item.menuItemId !== menuItemId);
      }

      return prevCart.map((item) =>
        item.menuItemId === menuItemId
          ? { ...item, quantity: (item.quantity || 0) - 1 }
          : item
      );
    });

  // Xoá item khỏi cart
  const deleteFromCart = (menuItemId) => {
    setCart((prevCart) =>
      prevCart.filter((item) => item.menuItemId !== menuItemId)
    );
  };

  const clearCart = () => {
    setCart([]);
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        setCart,
        addToCart,
        removeFromCart,
        deleteFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
