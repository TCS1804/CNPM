// client/src/component/OrderStatusNotifier.jsx
import React, { useEffect, useRef } from 'react';
import api from '../lib/axios';

const ORDER_BASE = import.meta.env.VITE_ORDER_BASE_URL || '/orders';

/**
 * Component chạy nền:
 * - Định kỳ fetch danh sách đơn của customer
 * - So sánh trạng thái mới và cũ
 * - Nếu khác -> hiện Notification (hoặc window.alert)
 */
const OrderStatusNotifier = () => {
  const lastStatusesRef = useRef({});
  const initializedRef = useRef(false);
  const timerRef = useRef(null);

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

        const res = await api.get(`${ORDER_BASE}/customer/orders`);
        const orders = Array.isArray(res.data) ? res.data : [];

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

    // Gọi lần đầu
    fetchAndCompare();

    // Polling mỗi 10 giây (tuỳ bạn chỉnh 5–30s tuỳ nhu cầu)
    timerRef.current = setInterval(fetchAndCompare, 10000);

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
