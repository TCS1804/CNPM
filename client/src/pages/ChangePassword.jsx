import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/axios";

const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setErr("");

    // Validation
    if (!currentPassword || !newPassword || !confirm) {
      setErr("Vui lòng nhập đầy đủ thông tin.");
      return;
    }
    if (newPassword !== confirm) {
      setErr("Mật khẩu nhập lại không khớp.");
      return;
    }
    if (newPassword.length < 6) {
      setErr("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }
    if (currentPassword === newPassword) {
      setErr("Mật khẩu mới phải khác với mật khẩu hiện tại.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      setMsg("Đổi mật khẩu thành công.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      // Quay lại sau 2 giây
      setTimeout(() => navigate(-1), 2000);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || "Đổi mật khẩu thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <main className="flex-1 container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-md mx-auto bg-gray-900 rounded-lg shadow-lg p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-6">
            Đổi mật khẩu
          </h2>

          {msg && (
            <div className="bg-green-600 text-white p-3 rounded mb-4 text-sm">
              {msg}
            </div>
          )}
          {err && (
            <div className="bg-red-600 text-white p-3 rounded mb-4 text-sm">
              {err}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            <div>
              <label className="block mb-1 font-medium">Mật khẩu hiện tại</label>
              <input
                type="password"
                className="w-full px-4 py-2 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Nhập mật khẩu hiện tại"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">Mật khẩu mới</label>
              <input
                type="password"
                className="w-full px-4 py-2 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">Nhập lại mật khẩu mới</label>
              <input
                type="password"
                className="w-full px-4 py-2 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded font-medium bg-yellow-500 text-black hover:bg-yellow-600 transition duration-200 ${
                loading ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {loading ? "Đang đổi..." : "Đổi mật khẩu"}
            </button>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-full mt-3 py-2 px-4 rounded font-medium bg-gray-700 text-white hover:bg-gray-600 transition"
            >
              Quay lại
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ChangePassword;
