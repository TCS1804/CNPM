// client/src/pages/AdminRevenue.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const AdminRevenue = () => {
  const [data, setData] = useState({ count: 0, total: { admin: 0, restaurant: 0, delivery: 0 }, currency: 'VND' });
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const token = localStorage.getItem('token');
        const ORDER_BASE = import.meta.env.VITE_ORDER_BASE_URL || 'http://localhost:5030';
        const res = await axios.get(`${ORDER_BASE}/order/admin/summary`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setData(res.data || {});
      } catch (e) {
        setError(e?.response?.data?.message || e.message);
      }
    };
    run();
  }, []);

  const fmt = (v) => (Number(v || 0) / 100).toFixed(2);

  return (
    <div style={{ maxWidth: 680, margin: '24px auto' }}>
      <h2>Admin — Tổng hợp chia tiền</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div style={{ border: '1px solid #eee', padding: 16, borderRadius: 8 }}>
        <p>Số đơn đã chốt: <b>{data.count || 0}</b></p>
        <ul>
          <li>Admin: <b>{fmt(data.total?.admin)} {data.currency}</b></li>
          <li>Restaurant: <b>{fmt(data.total?.restaurant)} {data.currency}</b></li>
          <li>Delivery: <b>{fmt(data.total?.delivery)} {data.currency}</b></li>
        </ul>
      </div>
    </div>
  );
};

export default AdminRevenue;
