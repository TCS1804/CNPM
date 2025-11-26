import React, { useEffect, useState } from "react";
import axios from "axios";

const DRONE_API =
  import.meta.env.VITE_DRONE_API_BASE_URL || "http://localhost:5055/api/drone";

const AdminDrones = () => {
  const [drones, setDrones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    name: "",
    code: "",
    battery: 100,
    speedKmh: 40,
    lat: 0,
    lng: 0,
  });

  const fetchDrones = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await axios.get(`${DRONE_API}/fleet`);
      setDrones(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || "Failed to load drones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrones();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${DRONE_API}/fleet`, {
        name: form.name,
        code: form.code || undefined,
        battery: Number(form.battery),
        speedKmh: Number(form.speedKmh),
        location: {
          lat: Number(form.lat),
          lng: Number(form.lng),
        },
      });
      setForm({
        name: "",
        code: "",
        battery: 100,
        speedKmh: 40,
        lat: 0,
        lng: 0,
      });
      fetchDrones();
    } catch (e) {
      alert(e?.response?.data?.error || e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xoá drone này?")) return;
    try {
      await axios.delete(`${DRONE_API}/fleet/${id}`);
      fetchDrones();
    } catch (e) {
      alert(e?.response?.data?.error || e.message);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await axios.patch(`${DRONE_API}/fleet/${id}`, { status });
      fetchDrones();
    } catch (e) {
      alert(e?.response?.data?.error || e.message);
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: "24px auto", padding: "0 16px" }}>
      <h2 className="text-2xl font-bold mb-4">Admin – Drone Fleet</h2>

      {err && <div style={{ color: "red", marginBottom: 8 }}>{err}</div>}

      <form
        onSubmit={handleCreate}
        className="mb-6 p-4 rounded-lg bg-gray-900 border border-gray-700"
      >
        <h3 className="font-semibold mb-3 text-white">Thêm drone mới</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div>
            <label className="block text-gray-300 mb-1">Tên</label>
            <input
              className="w-full px-2 py-1 rounded bg-gray-800 border border-gray-700 text-white"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-gray-300 mb-1">Mã (code)</label>
            <input
              className="w-full px-2 py-1 rounded bg-gray-800 border border-gray-700 text-white"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="Nếu bỏ trống sẽ tự sinh"
            />
          </div>
          <div>
            <label className="block text-gray-300 mb-1">Battery (%)</label>
            <input
              type="number"
              className="w-full px-2 py-1 rounded bg-gray-800 border border-gray-700 text-white"
              value={form.battery}
              onChange={(e) =>
                setForm((f) => ({ ...f, battery: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-gray-300 mb-1">Speed (km/h)</label>
            <input
              type="number"
              className="w-full px-2 py-1 rounded bg-gray-800 border border-gray-700 text-white"
              value={form.speedKmh}
              onChange={(e) =>
                setForm((f) => ({ ...f, speedKmh: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-gray-300 mb-1">Lat</label>
            <input
              type="number"
              className="w-full px-2 py-1 rounded bg-gray-800 border border-gray-700 text-white"
              value={form.lat}
              onChange={(e) =>
                setForm((f) => ({ ...f, lat: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-gray-300 mb-1">Lng</label>
            <input
              type="number"
              className="w-full px-2 py-1 rounded bg-gray-800 border border-gray-700 text-white"
              value={form.lng}
              onChange={(e) =>
                setForm((f) => ({ ...f, lng: e.target.value }))
              }
            />
          </div>
        </div>
        <button
          type="submit"
          className="mt-4 px-4 py-2 rounded bg-yellow-500 text-black hover:bg-yellow-600"
        >
          Thêm drone
        </button>
      </form>

      <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 text-gray-200">
            <tr>
              <th className="px-3 py-2 text-left">Code</th>
              <th className="px-3 py-2 text-left">Tên</th>
              <th className="px-3 py-2 text-left">Trạng thái</th>
              <th className="px-3 py-2 text-right">Battery</th>
              <th className="px-3 py-2 text-right">Speed</th>
              <th className="px-3 py-2 text-left">Vị trí</th>
              <th className="px-3 py-2">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-gray-300">
                  Loading...
                </td>
              </tr>
            ) : drones.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-gray-300">
                  Chưa có drone nào. Hãy thêm mới.
                </td>
              </tr>
            ) : (
              drones.map((d) => (
                <tr key={d._id} className="border-t border-gray-800">
                  <td className="px-3 py-2 font-mono text-xs">{d.code}</td>
                  <td className="px-3 py-2">{d.name || "-"}</td>
                  <td className="px-3 py-2">
                    <select
                      className="bg-gray-800 border border-gray-700 text-white text-xs px-2 py-1 rounded"
                      value={d.status}
                      onChange={(e) =>
                        handleStatusChange(d._id, e.target.value)
                      }
                    >
                      <option value="idle">idle</option>
                      <option value="delivering">delivering</option>
                      <option value="charging">charging</option>
                      <option value="maintenance">maintenance</option>
                      <option value="offline">offline</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {d.battery?.toFixed?.(0) ?? d.battery}% 
                  </td>
                  <td className="px-3 py-2 text-right">
                    {d.speedKmh || 0} km/h
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-300">
                    lat: {d.location?.lat ?? 0}, lng: {d.location?.lng ?? 0}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => handleDelete(d._id)}
                      className="px-2 py-1 rounded bg-red-600 text-white text-xs hover:bg-red-700"
                    >
                      Xoá
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDrones;
