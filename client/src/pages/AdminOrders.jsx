import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import api from "../lib/axios";
import DroneSimulationMap from "../component/DroneSimulationMap";

const ORDER_API = import.meta.env.VITE_ORDER_API || 'http://localhost:5020/api/orders';
const LIST_ENDPOINT_PREFERRED = '/admin/list'; // bạn có thể đổi thành '/all' hay '/list' tuỳ BE
const LIST_ENDPOINT_FALLBACK = '/';            // fallback: GET /order

const pageSizeDefault = 10;

const money = (v, currency = 'USD') =>
  Number(v || 0).toLocaleString('en-US', {
    style: 'currency',
    currency,
  });

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState(''); // '', 'pending', 'accepted', 'in-transit', 'delivered'
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizeDefault);
  const [restaurants, setRestaurants] = useState([]);
  const [droneOrder, setDroneOrder] = useState(null);

  // Lấy danh sách nhà hàng từ restaurant-service (route không cần role đặc biệt)
  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const res = await api.get("/restaurant/api/restaurants");
        const arr = Array.isArray(res.data) ? res.data : [];
        setRestaurants(arr);
      } catch (e) {
        console.error("Failed to fetch restaurants for drone map:", e.response?.data || e.message);
      }
    };
    fetchRestaurants();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    setErr('');
    try {
      // Thử endpoint ưu tiên
      const res = await api.get(`${ORDER_API}${LIST_ENDPOINT_PREFERRED}`);
      const arr = Array.isArray(res.data) ? res.data : (res.data?.orders || []);
      setOrders(arr);

      // Đoán currency từ 1 order có split
      const c = arr.find(o => o?.split?.currency)?.split?.currency || 'USD';
      setCurrency(c);
    } catch (e) {
      // Nếu 404 hoặc network error, thử fallback
      const statusCode = e?.response?.status;
      if (statusCode === 404 || statusCode === 400 || !statusCode) {
        try {
          const res2 = await api.get(`${ORDER_API}${LIST_ENDPOINT_FALLBACK}`);
          const arr2 = Array.isArray(res2.data) ? res2.data : (res2.data?.orders || []);
          setOrders(arr2);
          const c2 = arr2.find(o => o?.split?.currency)?.split?.currency || 'USD';
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
  // đặt trong component AdminOrders, ngay trên `return ( ... )` cũng được
  const getBaseAmount = (o) => {
    if (!o) return 0;
    if (typeof o.total === 'number') return o.total;               // total dạng đô
    if (typeof o.totalCents === 'number') return o.totalCents / 100; // total dạng cent
    return 0;
  };
  // Đã có getBaseAmount(o) như mục 1
  const getShare = (o, key) => {
    const amounts = o?.split?.amounts || {};
    const rates = o?.split?.rates || {};
    const base = getBaseAmount(o);

    const cents = amounts[key];
    if (typeof cents === 'number') {
      // DB đang lưu cent
      return cents / 100;
    }

    // fallback: tính theo % nếu chưa có amounts
    const rate = rates[key] || 0;
    return base * rate / 100;
  };

  return (
    <>
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
                <th style={th}>Drone</th> 
              </tr>
            </thead>
            <tbody>
              {pageData.map((o) => {
                const cur = o?.split?.currency || currency || 'USD';

                const base = getBaseAmount(o);
                const restaurantShare = getShare(o, 'restaurant');
                const adminShare = getShare(o, 'admin');
                const deliveryShare = getShare(o, 'delivery');

                return (
                  <tr key={o._id} style={{ borderTop: '1px solid #eee' }}>
                    <td style={tdMono}>{o._id}</td>
                    <td style={td}>{dayjs(o.createdAt || o.updatedAt).format('YYYY-MM-DD HH:mm')}</td>
                    <td style={tdMono}>{o.customerId || '-'}</td>
                    <td style={tdMono}>{o.restaurantId || '-'}</td>
                    <td style={tdRight}>{money(base, cur)}</td>
                    <td style={tdRight}>{money(restaurantShare, cur)}</td>
                    <td style={tdRight}>{money(adminShare, cur)}</td>
                    <td style={tdRight}>{money(deliveryShare, cur)}</td>
                    <td style={td}>{o.status || '-'}</td>
                    {/* ✅ cột Drone */}
                    <td style={td}>
                      {o.transportMode === 'drone' &&
                        ['accepted', 'in-transit', 'delivered'].includes(
                          (o.status || '').toLowerCase()
                        ) &&
                        o.location?.coordinates &&
                        (() => {
                          const restaurant = restaurants.find(r => r._id === o.restaurantId);
                          const restaurantCoords = restaurant?.location?.coordinates;
                          const customerCoords = o.location?.coordinates;

                          if (!restaurantCoords || !customerCoords) return null;

                          return (
                            <button
                              onClick={() =>
                                setDroneOrder({
                                  order: o,
                                  restaurantCoords,
                                  customerCoords,
                                })
                              }
                              className="px-2 py-1 text-xs rounded bg-purple-600 hover:bg-purple-700 text-white"
                            >
                              Xem drone
                            </button>
                          );
                        })()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {droneOrder && (
        <DroneSimulationMap
          isOpen={!!droneOrder}
          onClose={() => setDroneOrder(null)}
          orderId={droneOrder.order._id}
          restaurantCoords={droneOrder.restaurantCoords}
          customerCoords={droneOrder.customerCoords}
        />
      )}
    </>
  );
};

const th = { textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #eee', fontWeight: 600, whiteSpace: 'nowrap' };
const thRight = { ...th, textAlign: 'right' };
const td = { padding: '10px 8px', verticalAlign: 'top' };
const tdRight = { ...td, textAlign: 'right', whiteSpace: 'nowrap' };
const tdMono = { ...td, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' };

export default AdminOrders;
