// client/src/pages/AdminSplit.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import api from "../lib/axios";

const AdminSplit = () => {
  const [method, setMethod] = useState('percent');
  const [percent, setPercent] = useState({ admin: 10, restaurant: 85, delivery: 5 });
  const [fixed, setFixed] = useState({ deliveryFee: 0 });
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const token = localStorage.getItem('token');

  const BASE = import.meta.env.VITE_PAYMENT_BASE_URL || '/payments';  // vd: http://localhost:5020/api/payments
  const fetchConfig = async () => {
    const res = await api.get(`${BASE}/split-config`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  useEffect(() => { fetchConfig(); /* eslint-disable react-hooks/exhaustive-deps */ }, []);

  const handleSave = async () => {
    setLoading(true);
    setMsg('');
    try {
      if (method === 'percent') {
        const sum = Number(percent.admin || 0) + Number(percent.restaurant || 0) + Number(percent.delivery || 0);
        if (sum !== 100) {
          setMsg('Tổng phần trăm phải = 100');
          setLoading(false);
          return;
        }
      }
      await api.post(`${BASE}/split-config`, {
        method, percent, fixed, currency
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMsg('Đã lưu cấu hình!');
    } catch (e) {
      setMsg(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: '24px auto' }}>
      <h2>Admin — Cấu hình chia tiền</h2>

      <div style={{ margin: '12px 0' }}>
        <label>Phương thức:&nbsp;</label>
        <select value={method} onChange={e => setMethod(e.target.value)}>
          <option value="percent">Theo phần trăm</option>
          <option value="fixed">Phí ship cố định</option>
        </select>
      </div>

      {method === 'percent' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div>
            <label>Admin %</label>
            <input type="number" value={percent.admin}
              onChange={e => setPercent(p => ({ ...p, admin: Number(e.target.value) }))} />
          </div>
          <div>
            <label>Restaurant %</label>
            <input type="number" value={percent.restaurant}
              onChange={e => setPercent(p => ({ ...p, restaurant: Number(e.target.value) }))} />
          </div>
          <div>
            <label>Delivery %</label>
            <input type="number" value={percent.delivery}
              onChange={e => setPercent(p => ({ ...p, delivery: Number(e.target.value) }))} />
          </div>
        </div>
      ) : (
        <div>
          <label>Delivery fee (đồng/cents)</label>
          <input type="number" value={fixed.deliveryFee}
            onChange={e => setFixed({ deliveryFee: Number(e.target.value) })} />
        </div>
      )}

      <div style={{ margin: '12px 0' }}>
        <label>Tiền tệ</label>
        <input value={currency} onChange={e => setCurrency(e.target.value.toUpperCase())} />
      </div>

      <button onClick={handleSave} disabled={loading}>
        {loading ? 'Đang lưu...' : 'Lưu cấu hình'}
      </button>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </div>
  );
};

export default AdminSplit;
