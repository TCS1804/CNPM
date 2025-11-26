import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/axios";

const DeliveryProfile = () => {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/auth/profile/delivery/me");
        if (data) {
          setFullName(data.fullName || "");
          setPhone(data.phone || "");
          setVehicleType(data.vehicleType || "");
          setNote(data.note || "");
        }
      } catch (e) {
        console.error("Fetch delivery profile failed", e.response?.data || e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.put("/auth/profile/delivery/me", {
        fullName,
        phone,
        vehicleType,
        note,
      });
      alert("Lưu thông tin shipper thành công");
    } catch (e) {
      setError(e.response?.data?.message || "Lỗi lưu thông tin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="bg-yellow-500 text-black p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">FoodDelivery</h1>
          <button
            onClick={() => navigate("/home")}
            className="px-4 py-2 text-black font-medium hover:underline"
          >
            Home
          </button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-xl mx-auto bg-gray-900 rounded-lg shadow-lg p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-6">
            Thông tin shipper
          </h2>

          {error && (
            <div className="bg-red-500 text-white p-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Họ tên</label>
              <input
                className="w-full px-4 py-2 rounded bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Số điện thoại</label>
              <input
                className="w-full px-4 py-2 rounded bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Phương tiện</label>
              <input
                className="w-full px-4 py-2 rounded bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="Xe máy, xe đạp..."
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Ghi chú</label>
              <textarea
                className="w-full px-4 py-2 rounded bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded font-medium bg-yellow-500 text-black hover:bg-yellow-600 transition duration-200 ${
                loading ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {loading ? "Đang lưu..." : "Lưu thông tin"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default DeliveryProfile;
