import React, { useEffect, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import DroneSimulationMap from "../component/DroneSimulationMap";

const DRONE_API =
  import.meta.env.VITE_DRONE_API_BASE_URL || "http://localhost:5055/api/drone";

const AdminDroneMissions = () => {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [droneOrder, setDroneOrder] = useState(null);

  const fetchMissions = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await axios.get(`${DRONE_API}/missions`);
      setMissions(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || "Failed to load missions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMissions();
  }, []);

  const statusColor = (s) => {
    switch ((s || "").toLowerCase()) {
      case "enroute":
        return "bg-purple-600 text-white";
      case "delivered":
        return "bg-green-600 text-white";
      case "canceled":
      case "failed":
        return "bg-red-600 text-white";
      case "queued":
      case "assigned":
      default:
        return "bg-gray-600 text-white";
    }
  };

  return (
    <>
      <div style={{ maxWidth: 1100, margin: "24px auto", padding: "0 16px" }}>
        <h2 className="text-2xl font-bold mb-4">Admin – Drone Missions</h2>

        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={fetchMissions}
            disabled={loading}
            className="px-3 py-1 rounded bg-gray-800 text-white border border-gray-600 text-sm"
          >
            {loading ? "Đang tải..." : "Tải lại"}
          </button>
          {err && <span className="text-red-400 text-sm">{err}</span>}
        </div>

        <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-gray-200">
              <tr>
                <th className="px-3 py-2 text-left">Mission ID</th>
                <th className="px-3 py-2 text-left">Order</th>
                <th className="px-3 py-2 text-left">Drone</th>
                <th className="px-3 py-2 text-left">Thời gian</th>
                <th className="px-3 py-2 text-right">Khoảng cách</th>
                <th className="px-3 py-2 text-right">Progress</th>
                <th className="px-3 py-2 text-left">Trạng thái</th>
                <th className="px-3 py-2">Map</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-center text-gray-300">
                    Loading...
                  </td>
                </tr>
              ) : missions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-center text-gray-300">
                    Chưa có mission nào.
                  </td>
                </tr>
              ) : (
                missions.map((m) => (
                  <tr key={m._id} className="border-t border-gray-800">
                    <td className="px-3 py-2 font-mono text-xs">{m._id}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {m.orderId || "-"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {m.droneId || "-"}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-300">
                      {m.startedAt && (
                        <div>
                          Bắt đầu:{" "}
                          {dayjs(m.startedAt).format("YYYY-MM-DD HH:mm:ss")}
                        </div>
                      )}
                      {m.completedAt && (
                        <div>
                          Kết thúc:{" "}
                          {dayjs(m.completedAt).format("YYYY-MM-DD HH:mm:ss")}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {(m.distanceKm || 0).toFixed(2)} km
                    </td>
                    <td className="px-3 py-2 text-right">
                      {Math.round((m.progress || 0) * 100)}%
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          "px-2 py-1 rounded-full text-xs font-medium " +
                          statusColor(m.status)
                        }
                      >
                        {m.status || "-"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {m.restaurant?.lat != null &&
                        m.customer?.lat != null &&
                        m.orderId && (
                          <button
                            className="px-2 py-1 text-xs rounded bg-purple-600 hover:bg-purple-700 text-white"
                            onClick={() =>
                              setDroneOrder({
                                order: { _id: m.orderId },
                                restaurantCoords: m.restaurant,
                                customerCoords: m.customer,
                              })
                            }
                          >
                            Xem drone
                          </button>
                        )}
                    </td>
                  </tr>
                ))
              )}
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

export default AdminDroneMissions;
