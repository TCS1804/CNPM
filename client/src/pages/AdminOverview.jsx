import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import api from "../lib/axios";

const AdminOverview = () => {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState({
    orders: {
      total: 0,
      pending: 0,
      accepted: 0,
      inTransit: 0,
      delivered: 0,
      today: 0,
    },
    revenue: {
      admin: 0,
      restaurant: 0,
      delivery: 0,
      currency: "USD",
    },
    recentOrders: [],
  });

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setErr("");
      try {
        const ORDER_BASE = import.meta.env.VITE_ORDER_BASE_URL || "/orders";
        const res = await api.get(`${ORDER_BASE}/admin/overview`);
        setData(res.data || {});
      } catch (e) {
        setErr(
          e?.response?.data?.message ||
            e?.response?.data?.error ||
            e.message ||
            "Failed to load overview"
        );
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const { orders = {}, revenue = {}, recentOrders = [] } = data || {};
  const fmtMoney = (v, c) =>
    Number(v || 0).toLocaleString("en-US", {
      style: "currency",
      currency: c || revenue.currency || "USD",
    });

  return (
    <div style={{ maxWidth: 1100, margin: "24px auto", padding: "0 16px" }}>
      <h2 className="text-2xl font-bold mb-2">Tổng quan hệ thống</h2>
      <p className="text-sm text-gray-600 mb-4">
        Số liệu nhanh về đơn hàng và doanh thu. Từ đây bạn có thể nhảy sang các
        màn quản trị chi tiết (đơn hàng, doanh thu...).
      </p>

      {err && (
        <div className="mb-3 px-3 py-2 rounded bg-red-100 text-red-700 text-sm">
          {err}
        </div>
      )}

      {loading ? (
        <div>Đang tải dữ liệu...</div>
      ) : (
        <>
          {/* Card thống kê đơn */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Tổng số đơn
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {orders.total ?? 0}
              </div>
              <div className="mt-1 text-xs text-gray-400">
                Tất cả đơn, trừ đơn đã xoá.
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Đơn hôm nay
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {orders.today ?? 0}
              </div>
              <div className="mt-1 text-xs text-gray-400">
                Tính từ 00:00 đến hiện tại.
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Đơn đang xử lý
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {(orders.pending || 0) +
                  (orders.accepted || 0) +
                  (orders.inTransit || 0)}
              </div>
              <div className="mt-1 text-xs text-gray-400">
                pending + accepted + in-transit
              </div>
            </div>
          </div>

          {/* Breakdown trạng thái */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 text-sm">
            <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <div className="text-gray-500 text-xs mb-1">Đang chờ</div>
              <div className="text-xl font-semibold">
                {orders.pending ?? 0}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <div className="text-gray-500 text-xs mb-1">Đã nhận</div>
              <div className="text-xl font-semibold">
                {orders.accepted ?? 0}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <div className="text-gray-500 text-xs mb-1">Đang giao</div>
              <div className="text-xl font-semibold">
                {orders.inTransit ?? 0}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <div className="text-gray-500 text-xs mb-1">Đã giao xong</div>
              <div className="text-xl font-semibold">
                {orders.delivered ?? 0}
              </div>
            </div>
          </div>

          {/* Doanh thu chia tiền */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Platform (Admin)
              </div>
              <div className="mt-2 text-xl font-semibold">
                {fmtMoney(revenue.admin, revenue.currency)}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Nhà hàng
              </div>
              <div className="mt-2 text-xl font-semibold">
                {fmtMoney(revenue.restaurant, revenue.currency)}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Giao hàng
              </div>
              <div className="mt-2 text-xl font-semibold">
                {fmtMoney(revenue.delivery, revenue.currency)}
              </div>
            </div>
          </div>

          {/* Đơn gần đây */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">
                Đơn hàng gần đây ({recentOrders.length})
              </h3>
              {/* sau này có thể thêm Link sang /admin/orders */}
            </div>
            {(!recentOrders || recentOrders.length === 0) && (
              <div className="text-sm text-gray-500">
                Chưa có đơn nào trong hệ thống.
              </div>
            )}
            {recentOrders && recentOrders.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs md:text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-2 py-2">Mã đơn</th>
                      <th className="text-left px-2 py-2">Thời gian</th>
                      <th className="text-left px-2 py-2">Trạng thái</th>
                      <th className="text-right px-2 py-2">Tổng tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((o) => (
                      <tr key={o.id} className="border-b last:border-b-0">
                        <td className="px-2 py-1 font-mono">
                          {String(o.id).slice(-8)}
                        </td>
                        <td className="px-2 py-1">
                          {o.createdAt
                            ? dayjs(o.createdAt).format("DD/MM/YYYY HH:mm")
                            : "-"}
                        </td>
                        <td className="px-2 py-1">
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] capitalize">
                            {o.status || "N/A"}
                          </span>
                        </td>
                        <td className="px-2 py-1 text-right">
                          {fmtMoney(o.total, o.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminOverview;
