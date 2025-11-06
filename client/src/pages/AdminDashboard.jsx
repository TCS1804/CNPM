// src/pages/AdminDashboard.jsx
import React, { useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';

/**
 * AdminDashboard
 * - Trang tổng quan khu vực Admin
 * - Hiển thị các "cards" điều hướng: Dashboard, Split, Revenue, Users, Orders, Restaurants, Deliveries, Settings
 * - Có kiểm tra quyền admin cơ bản từ localStorage (role = 'admin' hoặc user.role = 'admin')
 */
const AdminDashboard = () => {
  // Lấy thông tin role (tùy dự án của bạn có thể lưu khác)
  const role = useMemo(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      return storedUser?.role || localStorage.getItem('role');
    } catch {
      return localStorage.getItem('role');
    }
  }, []);

  // Không phải admin => về trang login (hoặc trang chủ)
  if (role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  // Danh sách module admin
  const cards = [
    {
      title: 'Tổng quan',
      desc: 'Số liệu nhanh và liên kết tính năng quản trị.',
      to: '/admin/dashboard', // chính trang này (có thể đổi sang /admin/overview nếu tách riêng)
      emoji: '📊'
    },
    {
      title: 'Cấu hình chia tiền',
      desc: 'Thiết lập tỉ lệ / phí chia tiền cho admin, restaurant, delivery.',
      to: '/admin/split',
      emoji: '⚙️'
    },
    {
      title: 'Báo cáo doanh thu',
      desc: 'Xem tổng hợp phần tiền theo vai trò trong khoảng thời gian.',
      to: '/admin/revenue',
      emoji: '💰'
    },
    {
      title: 'Quản lý người dùng',
      desc: 'Tài khoản admin/restaurant/delivery/customer.',
      to: '/admin/users',
      emoji: '👥'
    },
    {
      title: 'Quản lý đơn hàng',
      desc: 'Theo dõi, lọc và kiểm tra chi tiết đơn.',
      to: '/admin/orders',
      emoji: '🧾'
    },
    {
      title: 'Quản lý nhà hàng',
      desc: 'Thêm/sửa thông tin nhà hàng, cấu hình riêng.',
      to: '/admin/restaurants',
      emoji: '🍽️'
    },
    {
      title: 'Quản lý giao hàng',
      desc: 'Đội ngũ shipper, hiệu suất và trạng thái.',
      to: '/admin/deliveries',
      emoji: '🚚'
    },
    {
      title: 'Cài đặt hệ thống',
      desc: 'Cấu hình chung: thanh toán, bảo mật, branding…',
      to: '/admin/settings',
      emoji: '🛠️'
    }
  ];

  // Style tối giản, không phụ thuộc thư viện CSS
  const container = { maxWidth: 1100, margin: '24px auto', padding: '0 16px' };
  const grid = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: 16,
    marginTop: 16
  };
  const card = {
    display: 'block',
    border: '1px solid #eaeaea',
    borderRadius: 12,
    padding: 16,
    textDecoration: 'none',
    color: 'inherit',
    background: '#fff',
    transition: 'box-shadow 0.15s ease, transform 0.05s ease'
  };
  const cardHover = {
    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
    transform: 'translateY(-1px)'
  };

  return (
    <div style={container}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Admin Dashboard</h2>
          <p style={{ margin: '4px 0 0', color: '#666' }}>
            Khu vực quản trị — truy cập nhanh các trang cấu hình và báo cáo.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/admin/split"
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', textDecoration: 'none' }}>
            ⚙️ Cấu hình chia tiền
          </Link>
          <Link to="/admin/revenue"
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', textDecoration: 'none' }}>
            💰 Doanh thu
          </Link>
        </div>
      </header>

      <section style={grid}>
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            style={card}
            onMouseEnter={(e) => Object.assign(e.currentTarget.style, cardHover)}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '';
              e.currentTarget.style.transform = '';
            }}
          >
            <div style={{ fontSize: 28, lineHeight: 1 }}>{c.emoji}</div>
            <div style={{ marginTop: 8, fontWeight: 600 }}>{c.title}</div>
            <div style={{ marginTop: 6, color: '#666', fontSize: 14 }}>{c.desc}</div>
          </Link>
        ))}
      </section>

      {/* Khu vực có thể nhúng thêm quick-stats trong tương lai */}
      {/* <section style={{ marginTop: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <div style={{ border: '1px solid #eee', borderRadius: 10, padding: 14 }}>
            <div style={{ color: '#666', fontSize: 13 }}>Đơn hôm nay</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>128</div>
          </div>
          <div style={{ border: '1px solid #eee', borderRadius: 10, padding: 14 }}>
            <div style={{ color: '#666', fontSize: 13 }}>Doanh thu hôm nay</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>12,450,000 đ</div>
          </div>
          <div style={{ border: '1px solid #eee', borderRadius: 10, padding: 14 }}>
            <div style={{ color: '#666', fontSize: 13 }}>Shipper hoạt động</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>42</div>
          </div>
        </div>
      </section> */}
    </div>
  );
};

export default AdminDashboard;
