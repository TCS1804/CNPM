// client/src/pages/AdminUsers.jsx
import React, { useEffect, useMemo, useState } from 'react';
import api from '../lib/axios';

const ROLE_LABEL = {
  customer: 'Khách hàng',
  restaurant: 'Chủ nhà hàng',
  delivery: 'Giao hàng',
  admin: 'Quản trị',
};

const STATUS_LABEL = {
  active: 'Hoạt động',
  locked: 'Bị khóa',
  deleted: 'Đã xóa',
};

const AdminUsers = () => {
  // data từ BE: items, total, page, limit
  const [data, setData] = useState({
    items: [],
    total: 0,
    page: 1,
    limit: 10,
  });

  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [verified, setVerified] = useState('all');

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const [resetResult, setResetResult] = useState(null);

  // Modal form
  const [formMode, setFormMode] = useState(null); // 'edit' | null
  const [form, setForm] = useState({
    id: '',
    username: '',
    role: '',
    verified: false,
    isLocked: false,
    note: '',
  });

  const resetForm = () => {
    setForm({
      id: '',
      username: '',
      role: '',
      verified: false,
      isLocked: false,
      note: '',
    });
  };

  const fetchUsers = async () => {
    setLoading(true);
    setErr('');
    try {
      const params = {
        page,
        limit,
      };

      if (search.trim()) params.search = search.trim();
      if (role && role !== 'all') params.role = role;
      if (status && status !== 'all') params.status = status;
      if (verified && verified !== 'all') params.verified = verified;

      const res = await api.get('/auth/admin/users', { params });
      const payload = res.data || {};
      setData({
        items: payload.items || [],
        total: payload.total || 0,
        page: payload.page || page,
        limit: payload.limit || limit,
      });
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, role, verified]);

  const openEdit = (user) => {
    setFormMode('edit');
    setForm({
      id: user._id,
      username: user.username || '',
      role: user.role || '',
      verified: !!user.verified,
      isLocked: !!user.isLocked,
      note: user.note || '',
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

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!form.id) return;

    try {
      setLoading(true);
      setErr('');
      const payload = {
        role: form.role,
        verified: form.verified,
        isLocked: form.isLocked,
        note: form.note,
      };
      await api.patch(`/auth/admin/users/${form.id}`, payload);
      closeForm();
      await fetchUsers();
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLock = async (user) => {
    if (!user?._id) return;
    try {
      setLoading(true);
      setErr('');
      await api.patch(`/auth/admin/users/${user._id}/lock`, {
        isLocked: !user.isLocked,
      });
      await fetchUsers();
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (user) => {
    if (!user?._id) return;
    const ok = window.confirm(
      `Bạn có chắc chắn muốn XÓA user "${user.username}" nếu user này chưa có giao dịch?\n` +
        'Nếu user còn giao dịch, hành động sẽ bị từ chối.'
    );
    if (!ok) return;

    try {
      setLoading(true);
      setErr('');
      // call hard-delete endpoint which only succeeds if user has no transactions
      await api.delete(`/auth/admin/users/${user._id}/no-transactions`);
      await fetchUsers();
    } catch (e) {
      console.error(e);
      // show server-provided message; if backend rejects because of transactions,
      // display that so admin knows why it wasn't deleted.
      setErr(e?.response?.data?.error || e.message || 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (user) => {
    if (!user?._id) return;

    const ok = window.confirm(
      `Bạn có chắc chắn muốn reset mật khẩu cho user "${user.username}"?\n` +
      'Mật khẩu tạm mới sẽ được tạo và hiển thị cho bạn.'
    );
    if (!ok) return;

    try {
      setLoading(true);
      setErr('');
      const res = await api.post(`/auth/admin/users/${user._id}/reset-password`);
      const payload = res.data || {};
      if (payload.tempPassword) {
        setResetResult({
          username: payload.username,
          tempPassword: payload.tempPassword,
        });
      } else {
        window.alert('Đã reset mật khẩu, nhưng không nhận được mật khẩu tạm từ server.');
      }
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
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
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
            Quản lý user
          </h1>
          <p style={{ margin: '4px 0', color: '#555', fontSize: 14 }}>
            Quản lý tài khoản customer / restaurant / delivery 
          </p>
        </div>
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
          placeholder="Tìm theo username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
          style={{
            flex: '1 1 220px',
            padding: '8px 10px',
            borderRadius: 999,
            border: '1px solid #ddd',
          }}
        />

        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
          style={select}
        >
          <option value="all">Tất cả role</option>
          <option value="customer">Khách hàng</option>
          <option value="restaurant">Chủ nhà hàng</option>
          <option value="delivery">Giao hàng</option>
        </select>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          style={select}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Hoạt động</option>
          <option value="locked">Bị khóa</option>
          <option value="deleted">Đã xóa</option>
        </select>

        <select
          value={verified}
          onChange={(e) => {
            setVerified(e.target.value);
            setPage(1);
          }}
          style={select}
        >
          <option value="all">Verified?</option>
          <option value="true">Đã xác thực</option>
          <option value="false">Chưa xác thực</option>
        </select>

        <button
          onClick={() => {
            setPage(1);
            fetchUsers();
          }}
          style={btnPrimary}
        >
          Tìm kiếm
        </button>
      </div>

      {err && (
        <div
          style={{
            marginBottom: 12,
            padding: '8px 10px',
            borderRadius: 8,
            background: '#fef2f2',
            color: '#b91c1c',
            fontSize: 14,
          }}
        >
          {err}
        </div>
      )}

      {/* Bảng */}
      <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #eee' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr>
              <th style={th}>Username</th>
              <th style={th}>Role</th>
              <th style={th}>Verified</th>
              <th style={th}>Trạng thái</th>
              <th style={th}>Ghi chú</th>
              <th style={th}>Ngày tạo</th>
              <th style={th}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading && data.items.length === 0 && (
              <tr>
                <td colSpan={7} style={tdCenter}>
                  Đang tải...
                </td>
              </tr>
            )}

            {!loading && data.items.length === 0 && (
              <tr>
                <td colSpan={7} style={tdCenter}>
                  Không có user nào phù hợp.
                </td>
              </tr>
            )}

            {data.items.map((u) => {
              const isDeleted = !!u.isDeleted;
              const isLocked = !!u.isLocked;
              let statusKey = 'active';
              if (isDeleted) statusKey = 'deleted';
              else if (isLocked) statusKey = 'locked';

              return (
                <tr key={u._id}>
                  <td style={td}>{u.username}</td>
                  <td style={td}>{ROLE_LABEL[u.role] || u.role}</td>
                  <td style={td}>
                    {u.verified ? (
                      <span style={{ color: '#16a34a', fontWeight: 500 }}>
                        Đã xác thực
                      </span>
                    ) : (
                      <span style={{ color: '#b91c1c', fontWeight: 500 }}>
                        Chưa xác thực
                      </span>
                    )}
                  </td>
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
                            : statusKey === 'locked'
                            ? '#fef3c7'
                            : '#dcfce7',
                        color:
                          statusKey === 'deleted'
                            ? '#b91c1c'
                            : statusKey === 'locked'
                            ? '#92400e'
                            : '#166534',
                      }}
                    >
                      {STATUS_LABEL[statusKey]}
                    </span>
                  </td>
                  <td style={td}>{u.note || '—'}</td>
                  <td style={td}>
                    {u.createdAt
                      ? new Date(u.createdAt).toLocaleString()
                      : '—'}
                  </td>
                  <td style={tdRight}>
                    {!isDeleted && (
                      <>
                        <button
                          onClick={() => openEdit(u)}
                          style={btnGhost}
                        >
                          Sửa
                        </button>
                        <button onClick={() => handleResetPassword(u)} style={btnGhost}>
                          Reset MK
                        </button>
                        <button
                          onClick={() => handleToggleLock(u)}
                          style={btnGhost}
                        >
                          {u.isLocked ? 'Mở khóa' : 'Khóa'}
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          style={btnDanger}
                        >
                          Xóa
                        </button>
                      </>
                    )}
                    {isDeleted && (
                      <span style={{ fontSize: 12, color: '#6b7280' }}>
                        Đã xóa
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Phân trang */}
      <div
        style={{
          marginTop: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div style={{ fontSize: 13, color: '#6b7280' }}>
          Tổng: {data.total} user • Trang {page}/{totalPages}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={btnGhost}
          >
            Trước
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            style={btnGhost}
          >
            Sau
          </button>
        </div>
      </div>

      {/* Modal edit */}
      {formMode === 'edit' && (
        <div style={modalOverlay}>
          <div style={modalBody}>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Chỉnh sửa user</h2>
            <p style={{ marginTop: 0, marginBottom: 16, fontSize: 13, color: '#6b7280' }}>
              Username: <strong>{form.username}</strong>
            </p>

            <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={label}>
                Role
                <select
                  name="role"
                  value={form.role}
                  onChange={handleFormChange}
                  style={input}
                >
                  <option value="customer">Khách hàng</option>
                  <option value="restaurant">Chủ nhà hàng</option>
                  <option value="delivery">Giao hàng</option>
                </select>
              </label>

              <label style={labelRow}>
                <span>Xác thực (verified)</span>
                <input
                  type="checkbox"
                  name="verified"
                  checked={form.verified}
                  onChange={handleFormChange}
                />
              </label>

              <label style={labelRow}>
                <span>Khóa đăng nhập</span>
                <input
                  type="checkbox"
                  name="isLocked"
                  checked={form.isLocked}
                  onChange={handleFormChange}
                />
              </label>

              <label style={label}>
                Ghi chú
                <textarea
                  name="note"
                  value={form.note}
                  onChange={handleFormChange}
                  rows={3}
                  style={{ ...input, resize: 'vertical' }}
                  placeholder="Lý do khóa/xóa..."
                />
              </label>

              <div
                style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}
              >
                <button type="button" onClick={closeForm} style={btnGhost}>
                  Hủy
                </button>
                <button type="submit" style={btnPrimary}>
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resetResult && (
        <div style={modalOverlay}>
          <div style={modalBody}>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Mật khẩu tạm mới</h2>
            <p style={{ fontSize: 14, marginBottom: 12 }}>
              User: <strong>{resetResult.username}</strong>
            </p>
            <p
              style={{
                fontSize: 16,
                fontWeight: 700,
                padding: '8px 12px',
                borderRadius: 8,
                background: '#f9fafb',
                border: '1px dashed #9ca3af',
                wordBreak: 'break-all',
                marginBottom: 16,
              }}
            >
              {resetResult.tempPassword}
            </p>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
              Hãy copy mật khẩu này và gửi cho user.  
              User nên đổi sang mật khẩu mới ngay sau khi đăng nhập.
            </p>
            <div style={{ textAlign: 'right' }}>
              <button
                style={btnPrimary}
                onClick={() => setResetResult(null)}
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Styles đơn giản (tái sử dụng với AdminRestaurants)
const th = {
  textAlign: 'left',
  padding: '8px 10px',
  borderBottom: '1px solid #e5e7eb',
  fontWeight: 600,
  fontSize: 13,
  color: '#374151',
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

const select = {
  padding: '8px 10px',
  borderRadius: 999,
  border: '1px solid #ddd',
  fontSize: 14,
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
  padding: '4px 8px',
  borderRadius: 999,
  border: '1px solid #e5e7eb',
  background: 'white',
  cursor: 'pointer',
  fontSize: 13,
};

const btnDanger = {
  ...btnGhost,
  borderColor: '#fecaca',
  color: '#b91c1c',
};

const modalOverlay = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.4)',
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

const label = {
  display: 'flex',
  flexDirection: 'column',
  fontSize: 13,
  gap: 4,
};

const labelRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: 13,
};

const input = {
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  fontSize: 14,
};

export default AdminUsers;
