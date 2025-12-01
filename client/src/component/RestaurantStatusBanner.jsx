import React, { useEffect, useState } from 'react';
import api from '../lib/axios';

const RestaurantStatusBanner = () => {
  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMyRestaurant = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/restaurant/api/restaurants-id');
        const items = Array.isArray(res.data) ? res.data : [];
        // Theo ràng buộc: mỗi owner chỉ có 1 restaurant
        setRestaurant(items[0] || null);
      } catch (e) {
        console.error(e);
        setError(e?.response?.data?.message || e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMyRestaurant();
  }, []);

  if (loading) {
    return null; // hoặc hiển thị skeleton nhỏ cũng được
  }

  if (error) {
    return (
      <div
        style={{
          marginBottom: 16,
          padding: '10px 14px',
          borderRadius: 12,
          background: '#fee2e2',
          color: '#b91c1c',
          fontSize: 13,
        }}
      >
        Lỗi khi tải trạng thái nhà hàng: {error}
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div
        style={{
          marginBottom: 16,
          padding: '10px 14px',
          borderRadius: 12,
          background: '#fef3c7',
          color: '#92400e',
          fontSize: 13,
        }}
      >
        Bạn hiện chưa có nhà hàng nào được tạo. Vui lòng liên hệ admin để được
        hỗ trợ.
      </div>
    );
  }

  const { name, isActive, isDeleted } = restaurant;

  let bg = '#dcfce7';
  let color = '#166534';
  let title = 'Nhà hàng đang hoạt động bình thường';
  let desc =
    'Bạn có thể nhận đơn và chỉnh sửa menu. Đừng quên kiểm tra đơn hàng mới thường xuyên nhé.';

  if (isDeleted) {
    bg = '#fee2e2';
    color = '#b91c1c';
    title = 'Nhà hàng đã bị admin khóa / xóa khỏi hệ thống';
    desc =
      'Bạn không thể nhận đơn mới hoặc chỉnh sửa menu. Vui lòng liên hệ admin / bộ phận hỗ trợ để biết thêm chi tiết.';
  } else if (!isActive) {
    bg = '#fef3c7';
    color = '#92400e';
    title = 'Nhà hàng đang bị admin tạm dừng hoạt động';
    desc =
      'Khách hàng sẽ không thể tạo đơn mới cho nhà hàng của bạn. Vui lòng liên hệ admin nếu bạn cần mở lại.';
  }

  return (
    <div
      style={{
        marginBottom: 16,
        padding: '12px 16px',
        borderRadius: 12,
        background: bg,
        color,
        fontSize: 13,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 14 }}>
        {name ? `Nhà hàng: ${name}` : 'Nhà hàng của bạn'}
      </div>
      <div style={{ fontWeight: 600 }}>{title}</div>
      <div>{desc}</div>
    </div>
  );
};

export default RestaurantStatusBanner;
