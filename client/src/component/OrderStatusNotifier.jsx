// client/src/component/OrderStatusNotifier.jsx
import React, { useEffect, useRef } from 'react';
import api from '../lib/axios';

// Lightweight JWT decode helper (only decodes payload, avoids adding dependency)
const decodeJwt = (token) => {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(payload)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
};

const ORDER_BASE = import.meta.env.VITE_ORDER_BASE_URL || '/orders';

/**
 * Component chạy nền:
 * - Phát hiện role của user từ token (customer, restaurant, delivery, admin)
 * - Định kỳ fetch danh sách đơn phù hợp với role:
 *   - customer: /orders/customer/orders
 *   - restaurant: /orders/restaurant/orders (hoặc list with restaurantId filter)
 *   - delivery: /orders/driver/orders
 *   - admin: /orders/admin/list (tất cả đơn)
 * - So sánh trạng thái mới và cũ
 * - Nếu khác -> hiện Notification (hoặc window.alert)
 */
const OrderStatusNotifier = () => {
  const lastStatusesRef = useRef({});
  const initializedRef = useRef(false);
  const timerRef = useRef(null);
  const userRoleRef = useRef(null);

  // Map status -> tiếng Việt dễ hiểu
  const humanStatus = (status) => {
    switch (status) {
      case 'pending':
        return 'đang chờ xác nhận';
      case 'accepted':
        return 'đã được nhà hàng chấp nhận';
      case 'in-transit':
        return 'đang được giao';
      case 'delivered':
        return 'đã giao thành công';
      case 'cancelled':
        return 'đã bị huỷ';
      default:
        return status;
    }
  };

  // Xác định role từ JWT token
  const getUserRole = () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      const decoded = decodeJwt(token);
      return decoded?.role || null;
    } catch (e) {
      console.warn('Failed to decode token:', e);
      return null;
    }
  };

  // Xác định endpoint dựa trên role
  const getOrdersEndpoint = (role) => {
    switch (role) {
      case 'customer':
        return `${ORDER_BASE}/customer/orders`;
      case 'restaurant':
        return `${ORDER_BASE}/restaurant`;
      case 'delivery':
        return `${ORDER_BASE}/driver/orders`;
      case 'admin':
        return `${ORDER_BASE}/admin/list`;
      default:
        return null;
    }
  };

  const showNotification = (order, oldStatus, newStatus) => {
    if (typeof window === 'undefined') return;

    const shortId = order._id ? order._id.slice(-6) : '';
    const title = `Cập nhật đơn #${shortId}`;
    let body = `Trạng thái đơn đổi từ "${humanStatus(oldStatus)}" sang "${humanStatus(newStatus)}".`;

    // Một số message “dễ thương” hơn
    if (!oldStatus) {
      body = `Đơn hàng #${shortId} đã được tạo với trạng thái: ${humanStatus(newStatus)}.`;
    } else if (newStatus === 'accepted') {
      body = `Nhà hàng đã chấp nhận đơn #${shortId}.`;
    } else if (newStatus === 'in-transit') {
      body = `Đơn #${shortId} đang được giao tới bạn.`;
    } else if (newStatus === 'delivered') {
      body = `Đơn #${shortId} đã được giao thành công. Chúc bạn ngon miệng!`;
    } else if (newStatus === 'cancelled') {
      body = `Đơn #${shortId} đã bị huỷ.`;
    }

    // Ưu tiên dùng Notification API nếu được cấp quyền
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    } else {
      // Fallback đơn giản
      window.alert(`${title}\n${body}`);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Load trạng thái đã lưu (nếu có) từ sessionStorage
    try {
      const raw = window.sessionStorage.getItem('orderStatusMap');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          lastStatusesRef.current = parsed;
          initializedRef.current = true;
        }
      }
    } catch (e) {
      console.warn('Failed to parse orderStatusMap from sessionStorage:', e);
    }

    // Xin quyền Notification nếu browser hỗ trợ
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    const fetchAndCompare = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return; // Chưa login thì thôi

        // Xác định role nếu chưa biết
        if (!userRoleRef.current) {
          userRoleRef.current = getUserRole();
          if (!userRoleRef.current) return;
        }

        // Lấy endpoint theo role
        const endpoint = getOrdersEndpoint(userRoleRef.current);
        if (!endpoint) return;

        const res = await api.get(endpoint);
        
        // Xử lý response tuỳ endpoint (admin trả về { data: [...], pagination: {...} })
        let orders = Array.isArray(res.data) ? res.data : res.data?.data || [];
        orders = Array.isArray(orders) ? orders : [];

        // Nếu đây là lần đầu (không có status cũ) thì chỉ khởi tạo, không bắn notification
        if (!initializedRef.current || Object.keys(lastStatusesRef.current).length === 0) {
          const initMap = {};
          orders.forEach((o) => {
            if (o && o._id) {
              initMap[o._id] = o.status;
            }
          });
          lastStatusesRef.current = initMap;
          window.sessionStorage.setItem('orderStatusMap', JSON.stringify(initMap));
          initializedRef.current = true;
          return;
        }

        const nextMap = { ...lastStatusesRef.current };

        orders.forEach((order) => {
          if (!order || !order._id) return;
          const id = order._id;
          const newStatus = order.status;
          const oldStatus = lastStatusesRef.current[id];

          // Nếu có status cũ và status mới khác -> bắn thông báo
          if (oldStatus && oldStatus !== newStatus) {
            showNotification(order, oldStatus, newStatus);
          }

          // Cập nhật map
          nextMap[id] = newStatus;
        });

        lastStatusesRef.current = nextMap;
        window.sessionStorage.setItem('orderStatusMap', JSON.stringify(nextMap));
      } catch (err) {
        console.error(
          'OrderStatusNotifier: fetch error',
          err?.response?.data || err.message
        );
      }
    };

    // Poll web notifications endpoint and show any returned notifications
    const pollWebNotifications = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const role = getUserRole();
        // Poll role notifications
        if (role) {
          const res = await api.get(`/notify/web?role=${role}`);
          const items = Array.isArray(res.data) ? res.data : [];
          items.forEach((n) => {
            if (typeof window !== 'undefined') {
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(n.title || 'Thông báo', { body: n.body || '' });
              } else {
                // Fallback small alert
                try { window.alert(`${n.title}\n${n.body}`); } catch(e) {}
              }
            }
          });
        }

        // Poll user-specific notifications
        const decoded = decodeJwt(localStorage.getItem('token'));
        const userId = decoded?.id || decoded?._id;
        if (userId) {
          const res2 = await api.get(`/notify/web?userId=${userId}`);
          const items2 = Array.isArray(res2.data) ? res2.data : [];
          items2.forEach((n) => {
            if (typeof window !== 'undefined') {
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(n.title || 'Thông báo', { body: n.body || '' });
              } else {
                try { window.alert(`${n.title}\n${n.body}`); } catch(e) {}
              }
            }
          });
        }
      } catch (e) {
        // ignore polling errors
      }
    };

    // Gọi lần đầu
    fetchAndCompare();
    pollWebNotifications();

    // Polling mỗi 8 giây cho orders + web notifications
    timerRef.current = setInterval(() => {
      fetchAndCompare();
      pollWebNotifications();
    }, 8000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Không render gì (chỉ chạy logic nền)
  return null;
};

export default OrderStatusNotifier;
