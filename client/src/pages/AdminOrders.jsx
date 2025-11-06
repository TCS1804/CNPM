// src/pages/AdminOrders.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';

const ORDER_API = import.meta.env.VITE_ORDER_API || 'http://localhost:5030/order';
const LIST_ENDPOINT_PREFERRED = '/admin/list'; // bạn có thể đổi thành '/all' hay '/list' tuỳ BE
const LIST_ENDPOINT_FALLBACK = '/';            // fallback: GET /order

const pageSizeDefault = 10;

const money = (v, currency = 'USD') => {
  // Nếu BE lưu cents => chia 100. Nếu bạn dùng VND thuần, hãy đổi thành: return `${Number(v||0).toLocaleString()} ${currency}`
  const n = Number(v || 0) / 100;
  return `${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
};

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [currency, setCurrency] = useState('VND');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState(''); // '', 'pending', 'accepted', 'in-transit', 'delivered'
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizeDefault);

  const token = localStorage.getItem('token');

  const fetchOrders = async () => {
    setLoading(true);
    setErr('');
    try {
      // Thử endpoint ưu tiên
      const res = await axios.get(`${ORDER_API}${LIST_ENDPOINT_PREFERRED}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const arr = Array.isArray(res.data) ? res.data : (res.data?.orders || []);
      setOrders(arr);
      // Đoán currency từ 1 order có split
      const c = arr.find(o => o?.split?.currency)?.split?.currency || 'VND';
      setCurrency(c);
    } catch (e) {
      // Nếu 404 hoặc network error, thử fallback
      const statusCode = e?.response?.status;
      if (statusCode === 404 || statusCode === 400 || !statusCode) {
        try {
          const res2 = await axios.get(`${ORDER_API}${LIST_ENDPOINT_FALLBACK}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const arr2 = Array.isArray(res2.data) ? res2.data : (res2.data?.orders || []);
          setOrders(arr2);
          const c2 = arr2.find(o => o?.split?.currency)?.split?.currency || 'VND';
          setCurrency(c2);
        } catch (e2) {
          setErr(e2?.response?.data?.message || e2.message || 'Không lấy được danh sách đơn');
        }
      } else {
        setErr(e?.response?.data?.message || e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lọc/tìm kiếm trên client cho nhanh
  const filtered = useMemo(() => {
    let data = Array.isArray(orders) ? orders : [];
    if (q.trim()) {
      const qq = q.trim().toLowerCase();
      data = data.filter(o =>
        (o?._id || '').toLowerCase().includes(qq) ||
        (o?.restaurantId || '').toLowerCase().includes(qq) ||
        (o?.customerId || '').toLowerCase().includes(qq)
      );
    }
    if (status) {
      data = data.filter(o => (o?.status || '').toLowerCase() === status);
    }
    return data;
  }, [orders, q, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageClamped = Math.min(page, totalPages);
  const sliceStart = (pageClamped - 1) * pageSize;
  const pageData = filtered.slice(sliceStart, sliceStart + pageSize);

  return (
    <div style={{ maxWidth: 1200, margin: '24px auto', padding: '0 16px' }}>
      <h2>Admin — Danh sách đơn hàng</h2>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', margin: '12px 0' }}>
        <input
          placeholder="Tìm theo ID/restaurantId/customerId…"
          value={q}
          onChange={e => { setQ(e.target.value); setPage(1); }}
          style={{ padding: 8, borderRadius: 8, border: '1px solid #ddd', minWidth: 280 }}
        />
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          style={{ padding: 8, borderRadius: 8, border: '1px solid #ddd' }}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="pending">pending</option>
          <option value="accepted">accepted</option>
          <option value="in-transit">in-transit</option>
          <option value="delivered">delivered</option>
        </select>
        <button onClick={fetchOrders} disabled={loading} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd' }}>
          {loading ? 'Đang tải…' : 'Tải lại'}
        </button>
        <div style={{ marginLeft: 'auto' }}>
          <label style={{ marginRight: 8 }}>Trang:</label>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pageClamped <= 1} style={{ marginRight: 6 }}>‹</button>
          <b>{pageClamped}</b> / {totalPages}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={pageClamped >= totalPages} style={{ marginLeft: 6 }}>›</button>
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            style={{ marginLeft: 10, padding: '4px 8px' }}
          >
            {[10, 20, 50].map(n => <option key={n} value={n}>{n}/trang</option>)}
          </select>
        </div>
      </div>

      {err && (
        <div style={{ color: 'red', marginBottom: 8 }}>
          {err}
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              <th style={th}>Mã đơn</th>
              <th style={th}>Thời gian</th>
              <th style={th}>Khách</th>
              <th style={th}>Nhà hàng</th>
              <th style={thRight}>Tổng</th>
              <th style={thRight}>Restaurant</th>
              <th style={thRight}>Admin</th>
              <th style={thRight}>Delivery</th>
              <th style={th}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((o) => {
              const cur = o?.split?.currency || currency || 'VND';
              const a = o?.split?.amounts || {};
              return (
                <tr key={o._id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={tdMono}>{o._id}</td>
                  <td style={td}>{dayjs(o.createdAt || o.updatedAt).format('YYYY-MM-DD HH:mm')}</td>
                  <td style={tdMono}>{o.customerId || '-'}</td>
                  <td style={tdMono}>{o.restaurantId || '-'}</td>
                  <td style={tdRight}>{money((o.totalCents ?? (Number(o.total || 0) * 100)), cur)}</td>
                  <td style={tdRight}>{money(a.restaurant, cur)}</td>
                  <td style={tdRight}>{money(a.admin, cur)}</td>
                  <td style={tdRight}>{money(a.delivery, cur)}</td>
                  <td style={td}>{o.status || '-'}</td>
                </tr>
              );
            })}
            {!loading && pageData.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: 16, textAlign: 'center', color: '#666' }}>
                  Không có dữ liệu.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};

const th = { textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #eee', fontWeight: 600, whiteSpace: 'nowrap' };
const thRight = { ...th, textAlign: 'right' };
const td = { padding: '10px 8px', verticalAlign: 'top' };
const tdRight = { ...td, textAlign: 'right', whiteSpace: 'nowrap' };
const tdMono = { ...td, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' };

export default AdminOrders;
