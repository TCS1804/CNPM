import React, { useEffect, useMemo, useState } from 'react';
import api from '../lib/axios';

const STATUS_LABEL = {
  active: 'Đang hoạt động',
  inactive: 'Tạm dừng',
  deleted: 'Đã xóa',
};

const AdminRestaurants = () => {
  // ❌ Bỏ check role / Navigate, admin không cần đăng nhập

  const [data, setData] = useState({
    items: [],
    total: 0,
    page: 1,
    limit: 10,
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('active'); // active | inactive | deleted | all

  const [owners, setOwners] = useState([]);
  const [formMode, setFormMode] = useState(null); // 'create' | 'edit' | null
  const [form, setForm] = useState({
    id: null,
    name: '',
    address: '',
    lat: '',
    lng: '',
    owner: '',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  const fetchOwners = async () => {
    try {
      const res = await api.get('/auth/admin/restaurants');
      const arr = Array.isArray(res.data) ? res.data : [];
      setOwners(arr);
    } catch (e) {
      console.error('Failed to fetch restaurant users', e);
    }
  };

  const fetchRestaurants = async () => {
    setLoading(true);
    setErr('');
    try {
      const params = { page, limit };
      if (search.trim()) params.search = search.trim();
      if (status && status !== 'all') params.status = status;

      const res = await api.get('/restaurant/admin/restaurants', { params });
      const payload = res.data || {};
      setData({
        items: payload.items || [],
        total: payload.total || 0,
        page: payload.page || page,
        limit: payload.limit || limit,
      });
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  const resetForm = () => {
    setForm({
      id: null,
      name: '',
      address: '',
      lat: '',
      lng: '',
      owner: '',
      isActive: true,
    });
  };

  const openCreate = async () => {
    setFormMode('create');
    resetForm();
    await fetchOwners();
  };

  const openEdit = async (item) => {
    setFormMode('edit');
    await fetchOwners();

    setForm({
      id: item._id,
      name: item.name || '',
      address: item.address || '',
      lat: item?.location?.coordinates?.lat ?? '',
      lng: item?.location?.coordinates?.lng ?? '',
      owner: item?.owner?._id || item.owner || '',
      isActive: item.isActive ?? true,
    });
  };

  const closeForm = () => {
    setFormMode(null);
    resetForm();
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        address: form.address,
        owner: form.owner,
        isActive: !!form.isActive,
        location: {
          coordinates: {},
        },
      };

      if (form.lat !== '') {
        payload.location.coordinates.lat = Number(form.lat);
      }
      if (form.lng !== '') {
        payload.location.coordinates.lng = Number(form.lng);
      }

      if (
        payload.location.coordinates.lat === undefined &&
        payload.location.coordinates.lng === undefined
      ) {
        delete payload.location;
      }

      if (formMode === 'create') {
        await api.post('/restaurant/admin/restaurants', payload);
      } else if (formMode === 'edit' && form.id) {
        await api.put(`/restaurant/admin/restaurants/${form.id}`, payload);
      }

      await fetchRestaurants();
      closeForm();
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Bạn có chắc muốn xóa (soft delete) nhà hàng "${item.name}"?`)) {
      return;
    }
    try {
      await api.delete(`/restaurant/admin/restaurants/${item._id}`);
      await fetchRestaurants();
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  const handleToggleActive = async (item) => {
    try {
      await api.patch(`/restaurant/admin/restaurants/${item._id}/status`, {
        isActive: !item.isActive,
      });
      await fetchRestaurants();
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  const totalPages = useMemo(() => {
    if (!data.total || !data.limit) return 1;
    return Math.max(1, Math.ceil(data.total / data.limit));
  }, [data.total, data.limit]);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
      <header
        style={{
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Quản lý nhà hàng (Admin)</h2>
          <p style={{ margin: '4px 0 0', color: '#666' }}>
            Thêm / sửa / khóa / xóa-soft các nhà hàng. Đảm bảo mỗi chủ chỉ có một nhà hàng.
          </p>
        </div>
        <button
          onClick={openCreate}
          style={{
            padding: '8px 14px',
            borderRadius: 999,
            border: 'none',
            background: 'black',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          + Thêm nhà hàng
        </button>
      </header>

      {/* Thanh filter */}
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          placeholder="Tìm theo tên nhà hàng..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchRestaurants()}
          style={{
            flex: '1 1 220px',
            padding: '8px 10px',
            borderRadius: 999,
            border: '1px solid #ddd',
          }}
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          style={{
            padding: '8px 10px',
            borderRadius: 999,
            border: '1px solid #ddd',
          }}
        >
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Tạm dừng</option>
          <option value="deleted">Đã xóa</option>
          <option value="all">Tất cả (kể cả đã xóa)</option>
        </select>
        <button
          onClick={() => {
            setPage(1);
            fetchRestaurants();
          }}
          style={{
            padding: '8px 14px',
            borderRadius: 999,
            border: '1px solid #ddd',
            background: 'white',
            cursor: 'pointer',
          }}
        >
          Tải lại
        </button>
      </div>

      {/* Bảng dữ liệu */}
      <div
        style={{
          background: 'white',
          borderRadius: 16,
          border: '1px solid #eee',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: 20 }}>Đang tải danh sách nhà hàng...</div>
        ) : err ? (
          <div style={{ padding: 20, color: 'red' }}>{err}</div>
        ) : (
          <table
            style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}
          >
            <thead>
              <tr>
                <th style={th}>Tên nhà hàng</th>
                <th style={th}>Chủ nhà hàng</th>
                <th style={th}>Địa chỉ</th>
                <th style={th}>Trạng thái</th>
                <th style={th}>Ngày tạo</th>
                <th style={thRight}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {(data.items || []).length === 0 && (
                <tr>
                  <td style={td} colSpan={6}>
                    Không có nhà hàng nào.
                  </td>
                </tr>
              )}
              {(data.items || []).map((item) => {
                const ownerName = item?.owner?.username || '—';
                const verified = item?.owner?.verified;
                let statusKey = 'active';
                if (item.isDeleted) statusKey = 'deleted';
                else if (!item.isActive) statusKey = 'inactive';

                return (
                  <tr key={item._id}>
                    <td style={td}>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                    </td>
                    <td style={td}>
                      <div>{ownerName}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {verified ? '✅ Đã xác thực' : '⚠️ Chưa xác thực'}
                      </div>
                    </td>
                    <td style={td}>{item.address || '—'}</td>
                    <td style={td}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 999,
                          fontSize: 12,
                          background:
                            statusKey === 'deleted'
                              ? '#fee2e2'
                              : statusKey === 'inactive'
                              ? '#fef3c7'
                              : '#dcfce7',
                          color:
                            statusKey === 'deleted'
                              ? '#b91c1c'
                              : statusKey === 'inactive'
                              ? '#92400e'
                              : '#166534',
                        }}
                      >
                        {STATUS_LABEL[statusKey]}
                      </span>
                    </td>
                    <td style={td}>
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleString()
                        : '—'}
                    </td>
                    <td style={tdRight}>
                      {!item.isDeleted && (
                        <>
                          <button
                            onClick={() => openEdit(item)}
                            style={btnGhost}
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => handleToggleActive(item)}
                            style={btnGhost}
                          >
                            {item.isActive ? 'Tạm dừng' : 'Kích hoạt'}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(item)}
                        style={btnDanger}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Phân trang */}
      <div
        style={{
          marginTop: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 13,
        }}
      >
        <div>
          Tổng: <b>{data.total}</b> nhà hàng
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={btnPager}
          >
            ← Trước
          </button>
          <span>
            Trang {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={btnPager}
          >
            Sau →
          </button>
        </div>
      </div>

      {/* Form tạo / sửa */}
      {formMode && (
        <div style={modalOverlay}>
          <div style={modalBody}>
            <h3 style={{ marginTop: 0 }}>
              {formMode === 'create'
                ? 'Thêm nhà hàng mới'
                : 'Sửa thông tin nhà hàng'}
            </h3>
            <form
              onSubmit={handleSave}
              style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              <label style={label}>
                Tên nhà hàng *
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  required
                  style={input}
                />
              </label>
              <label style={label}>
                Địa chỉ
                <input
                  type="text"
                  name="address"
                  value={form.address}
                  onChange={handleFormChange}
                  style={input}
                />
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                <label style={{ ...label, flex: 1 }}>
                  Lat
                  <input
                    type="number"
                    name="lat"
                    value={form.lat}
                    onChange={handleFormChange}
                    step="0.000001"
                    style={input}
                  />
                </label>
                <label style={{ ...label, flex: 1 }}>
                  Lng
                  <input
                    type="number"
                    name="lng"
                    value={form.lng}
                    onChange={handleFormChange}
                    step="0.000001"
                    style={input}
                  />
                </label>
              </div>
              <label style={label}>
                Chủ nhà hàng (User role=restaurant) *
                <select
                  name="owner"
                  value={form.owner}
                  onChange={handleFormChange}
                  required
                  style={input}
                >
                  <option value="">-- Chọn chủ nhà hàng --</option>
                  {owners.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.username}{' '}
                      {u.verified ? '(đã xác thực)' : '(chưa xác thực)'}
                    </option>
                  ))}
                </select>
              </label>
              <label
                style={{
                  ...label,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <input
                  type="checkbox"
                  name="isActive"
                  checked={form.isActive}
                  onChange={handleFormChange}
                />
                Đang hoạt động
              </label>
              <div
                style={{
                  marginTop: 12,
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 8,
                }}
              >
                <button type="button" onClick={closeForm} style={btnGhost}>
                  Hủy
                </button>
                <button type="submit" style={btnPrimary} disabled={saving}>
                  {saving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const th = {
  textAlign: 'left',
  padding: '10px 8px',
  borderBottom: '1px solid #eee',
  fontWeight: 600,
  whiteSpace: 'nowrap',
};
const thRight = { ...th, textAlign: 'right' };

const td = {
  padding: '10px 8px',
  borderBottom: '1px solid #f5f5f5',
  fontSize: 13,
  verticalAlign: 'top',
};
const tdRight = { ...td, textAlign: 'right', whiteSpace: 'nowrap' };

const btnGhost = {
  padding: '4px 8px',
  fontSize: 12,
  borderRadius: 999,
  border: '1px solid #ddd',
  background: 'white',
  cursor: 'pointer',
  marginRight: 4,
};

const btnDanger = {
  ...btnGhost,
  borderColor: '#fecaca',
  color: '#b91c1c',
};

const btnPrimary = {
  padding: '6px 12px',
  borderRadius: 999,
  border: 'none',
  background: 'black',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 600,
};

const btnPager = {
  padding: '4px 10px',
  borderRadius: 999,
  border: '1px solid #ddd',
  background: 'white',
  cursor: 'pointer',
};

const label = {
  display: 'flex',
  flexDirection: 'column',
  fontSize: 13,
  gap: 4,
};

const input = {
  padding: '8px 10px',
  borderRadius: 999,
  border: '1px solid #ddd',
  fontSize: 13,
};

const modalOverlay = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.35)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 999,
};

const modalBody = {
  width: '100%',
  maxWidth: 480,
  background: 'white',
  borderRadius: 16,
  padding: 20,
  boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
};

export default AdminRestaurants;
