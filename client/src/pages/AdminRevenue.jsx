import React, { useEffect, useState } from 'react';
import api from "../lib/axios";

const AdminRevenue = () => {
  const [error, setError] = useState('');
  const [data, setData] = useState({
    count: 0,
    total: { admin: 0, restaurant: 0, delivery: 0 },
    currency: 'USD',
  });

  useEffect(() => {
    const run = async () => {
      try {
        const ORDER_BASE = import.meta.env.VITE_ORDER_BASE_URL || '/orders';
        // ❌ Không gửi Authorization nữa
        const res = await api.get(`${ORDER_BASE}/admin/summary`);
        setData(res.data || {});
      } catch (e) {
        setError(e?.response?.data?.message || e.message);
      }
    };
    run();
  }, []);

  const fmt = (cents, currency = 'USD') =>
    (Number(cents || 0) / 100).toLocaleString('en-US', {
      style: 'currency',
      currency,
    });

  const cur = data.currency || 'USD';

  return (
    <div style={{ maxWidth: 680, margin: '24px auto' }}>
      <h2>Admin — Tổng hợp chia tiền</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div style={{ border: '1px solid #eee', padding: 16, borderRadius: 8 }}>
        <p>
          Số đơn đã chốt: <b>{data.count || 0}</b>
        </p>
        <ul>
          <li>
            Admin: <b>{fmt(data.total?.admin, cur)}</b>
          </li>
          <li>
            Restaurant: <b>{fmt(data.total?.restaurant, cur)}</b>
          </li>
          <li>
            Delivery: <b>{fmt(data.total?.delivery, cur)}</b>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default AdminRevenue;
