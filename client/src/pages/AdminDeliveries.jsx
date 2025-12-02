// client/src/pages/AdminDeliveries.jsx
import React, { useEffect, useState } from 'react';
import api from '../lib/axios';

const STATUS_LABEL = {
  pending: 'Pending',
  accepted: 'Đã nhận',
  'in-transit': 'Đang giao',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

const money = (v, currency = 'USD') =>
  Number(v || 0).toLocaleString('en-US', {
    style: 'currency',
    currency,
  });

const getBaseAmount = (order) => {
  if (typeof order?.total === 'number') return order.total;
  if (typeof order?.totalCents === 'number') return order.totalCents / 100;
  return 0;
};

const getDeliveryShare = (order) => {
  const base = getBaseAmount(order);
  const amounts = order?.split?.amounts || {};
  const rates = order?.split?.rates || {};
  // ưu tiên số tuyệt đối, nếu không thì lấy theo % rate
  if (typeof amounts.delivery === 'number') return amounts.delivery;
  if (typeof rates.delivery === 'number') {
    return (rates.delivery / 100) * base;
  }
  return 0;
};

const AdminDeliveries = () => {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  // bộ lọc
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [driverId, setDriverId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchDeliveries = async (pageToLoad = 1) => {
    setLoading(true);
    setErr('');

    try {
      const params = {
        page: pageToLoad,
        limit,
      };

      if (q.trim()) params.q = q.trim();
      if (status) params.status = status;
      if (driverId.trim()) params.driverId = driverId.trim();
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;

      const res = await api.get('/delivery/admin/deliveries', { params });

      // Chuẩn hóa payload theo BE của bạn
      const payload = res.data || {};
      let dataArray = [];

      if (Array.isArray(payload)) {
        dataArray = payload;
        setTotal(payload.length);
        setTotalPages(1);
      } else {
        dataArray = payload.data || payload.items || payload.orders || [];
        const pg = payload.pagination || {};
        setTotal(pg.total ?? dataArray.length);
        setTotalPages(pg.totalPages ?? 1);
        setPage(pg.page ?? pageToLoad);
      }

      setItems(dataArray);
    } catch (e) {
      console.error('Failed to fetch admin deliveries', e.response?.data || e.message);
      setErr(e.response?.data?.message || e.message || 'Không lấy được danh sách giao hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmitFilter = (e) => {
    e.preventDefault();
    fetchDeliveries(1);
  };

  const handleResetFilter = () => {
    setQ('');
    setStatus('');
    setDriverId('');
    setFromDate('');
    setToDate('');
    fetchDeliveries(1);
  };

  const handleDelete = async (orderId) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa (soft delete) đơn giao hàng này?')) {
      return;
    }

    try {
      setLoading(true);
      setErr('');
      await api.delete(`/delivery/admin/deliveries/${orderId}`);

      // Xóa khỏi list hiện tại hoặc refetch
      setItems((prev) => prev.filter((x) => x._id !== orderId));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error('Failed to delete delivery', e.response?.data || e.message);
      setErr(e.response?.data?.message || e.message || 'Không thể xóa đơn giao hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    fetchDeliveries(nextPage);
  };

  const renderStatusChip = (value) => {
    const label = STATUS_LABEL[value] || value || 'N/A';
    let bg = '#e5e7eb';
    let color = '#111827';

    if (value === 'completed') {
      bg = '#bbf7d0';
      color = '#166534';
    } else if (value === 'in-transit') {
      bg = '#dbeafe';
      color = '#1d4ed8';
    } else if (value === 'cancelled') {
      bg = '#fee2e2';
      color = '#b91c1c';
    } else if (value === 'accepted') {
      bg = '#fef9c3';
      color = '#854d0e';
    }

    return (
      <span style={{ ...chip, background: bg, color }}>
        {label}
      </span>
    );
  };

  return (
    <div style={pageContainer}>
      <header style={headerRow}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>Quản lý giao hàng</h1>
          <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: 14 }}>
            Xem, lọc và quản lý các đơn giao hàng. Hỗ trợ xóa mềm để không phá vỡ đối soát & báo cáo.
          </p>
        </div>
        <div style={{ textAlign: 'right', fontSize: 13, color: '#6b7280' }}>
          <div>Tổng đơn hiện tại: <strong>{total}</strong></div>
          <div>Trang: {page} / {totalPages}</div>
        </div>
      </header>

      {/* Bộ lọc / tìm kiếm */}
      <section style={card}>
        <form onSubmit={handleSubmitFilter}>
          <div style={filtersRow}>
            <div style={{ flex: 2, minWidth: 220 }}>
              <label style={label}>Từ khóa (mã đơn / email / tên khách)</label>
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Nhập từ khóa..."
                style={input}
              />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={label}>Trạng thái</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={select}
              >
                <option value="">Tất cả</option>
                <option value="pending">Pending</option>
                <option value="accepted">Đã nhận</option>
                <option value="in-transit">Đang giao</option>
                <option value="completed">Hoàn thành</option>
                <option value="cancelled">Đã hủy</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={label}>Tài xế (ID hoặc mã)</label>
              <input
                type="text"
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                placeholder="Nhập driverId..."
                style={input}
              />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={label}>Từ ngày</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                style={input}
              />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={label}>Đến ngày</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                style={input}
              />
            </div>
          </div>

          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" onClick={handleResetFilter} style={btnGhost}>
              Xóa bộ lọc
            </button>
            <button type="submit" style={btnPrimary}>
              Tìm kiếm
            </button>
          </div>
        </form>
      </section>

      {/* Thông báo lỗi */}
      {err && (
        <div style={{ ...card, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c' }}>
          {err}
        </div>
      )}

      {/* Bảng danh sách */}
      <section style={card}>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
            Đang tải dữ liệu...
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
            Không có đơn giao hàng nào khớp điều kiện.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Mã đơn</th>
                  <th style={th}>Khách hàng</th>
                  <th style={th}>Nhà hàng</th>
                  <th style={th}>Tài xế</th>
                  <th style={thRight}>Tổng tiền</th>
                  <th style={thRight}>Phần delivery</th>
                  <th style={thCenter}>Trạng thái</th>
                  <th style={th}>Thời gian tạo</th>
                  <th style={thRight}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {items.map((o) => {
                  const baseAmount = getBaseAmount(o);
                  const deliveryAmount = getDeliveryShare(o);
                  const created = o.createdAt
                    ? new Date(o.createdAt).toLocaleString()
                    : '';

                  return (
                    <tr key={o._id}>
                      <td style={tdMono}>{o._id}</td>
                      <td style={td}>
                        <div style={{ fontWeight: 500 }}>
                          {o.customerName || 'N/A'}
                        </div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>
                          {o.customerEmail}
                        </div>
                      </td>
                      <td style={td}>
                        <div style={{ fontWeight: 500 }}>
                          {o.restaurantName || o.restaurantId || 'N/A'}
                        </div>
                      </td>
                      <td style={td}>
                        <div style={{ fontSize: 13 }}>
                          {o.assignedTo?.name ||
                            o.assignedTo?.email ||
                            o.assignedTo ||
                            'Chưa gán'}
                        </div>
                      </td>
                      <td style={tdRight}>
                        {money(baseAmount, o.split?.currency || 'USD')}
                      </td>
                      <td style={tdRight}>
                        {money(deliveryAmount, o.split?.currency || 'USD')}
                      </td>
                      <td style={tdCenter}>
                        {renderStatusChip(o.status)}
                      </td>
                      <td style={td}>
                        <span style={{ fontSize: 12, color: '#4b5563' }}>
                          {created}
                        </span>
                      </td>
                      <td style={tdRight}>
                        <button
                          style={btnDanger}
                          onClick={() => handleDelete(o._id)}
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Phân trang */}
        {items.length > 0 && (
          <div style={paginationRow}>
            <div>
              Hiển thị {items.length} / {total} đơn
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => handleChangePage(page - 1)}
                disabled={page <= 1}
                style={btnGhost}
              >
                « Trước
              </button>
              <button
                type="button"
                onClick={() => handleChangePage(page + 1)}
                disabled={page >= totalPages}
                style={btnGhost}
              >
                Sau »
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

// ====== Styles đơn giản (tương tự AdminUsers / AdminRestaurants) ======

const pageContainer = {
  maxWidth: 1200,
  margin: '24px auto',
  padding: '0 16px 32px',
};

const headerRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
  marginBottom: 16,
};

const card = {
  background: 'white',
  borderRadius: 16,
  padding: 16,
  marginBottom: 16,
  boxShadow: '0 10px 30px rgba(15,23,42,0.06)',
};

const filtersRow = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 12,
};

const label = {
  display: 'block',
  fontSize: 12,
  color: '#6b7280',
  marginBottom: 4,
};

const input = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  fontSize: 14,
  outline: 'none',
};

const select = {
  ...input,
};

const table = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 13,
};

const th = {
  textAlign: 'left',
  padding: '8px 10px',
  borderBottom: '1px solid #e5e7eb',
  fontWeight: 600,
  color: '#374151',
  whiteSpace: 'nowrap',
};

const thRight = {
  ...th,
  textAlign: 'right',
};

const thCenter = {
  ...th,
  textAlign: 'center',
};

const td = {
  padding: '8px 10px',
  borderBottom: '1px solid #f3f4f6',
  verticalAlign: 'top',
};

const tdRight = {
  ...td,
  textAlign: 'right',
  whiteSpace: 'nowrap',
};

const tdCenter = {
  ...td,
  textAlign: 'center',
};

const tdMono = {
  ...td,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  fontSize: 12,
  whiteSpace: 'nowrap',
};

const chip = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 8px',
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 500,
};

const btnPrimary = {
  padding: '8px 14px',
  borderRadius: 999,
  border: 'none',
  background: '#2563eb',
  color: 'white',
  fontSize: 14,
  cursor: 'pointer',
};

const btnGhost = {
  padding: '6px 12px',
  borderRadius: 999,
  border: '1px solid #e5e7eb',
  background: 'white',
  fontSize: 13,
  cursor: 'pointer',
};

const btnDanger = {
  padding: '6px 12px',
  borderRadius: 999,
  border: 'none',
  background: '#dc2626',
  color: 'white',
  fontSize: 13,
  cursor: 'pointer',
};

const paginationRow = {
  marginTop: 12,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: 13,
};

export default AdminDeliveries;
