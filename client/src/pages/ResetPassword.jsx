import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../lib/axios";

const useQuery = () => {
  const { search } = useLocation();
  return new URLSearchParams(search);
};

const ResetPassword = () => {
  const query = useQuery();
  const navigate = useNavigate();
  const token = query.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!token) {
      setErr("Token không hợp lệ. Vui lòng kiểm tra lại link trong email.");
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setErr("Token không hợp lệ.");
      return;
    }

    setMsg("");
    setErr("");

    // Validation
    if (!password || !confirm) {
      setErr("Vui lòng nhập đầy đủ thông tin.");
      return;
    }
    if (password !== confirm) {
      setErr("Mật khẩu nhập lại không khớp.");
      return;
    }
    if (password.length < 6) {
      setErr("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/reset-password", { token, password });
      setMsg("Đặt lại mật khẩu thành công. Bạn có thể đăng nhập với mật khẩu mới.");
      setTimeout(() => navigate("/login"), 2000);
    } catch (e) {
      const errMsg = e?.response?.data?.error || e.message || "Lỗi đặt lại mật khẩu";
      setErr(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-md bg-white border rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4 text-black">
          Đặt lại mật khẩu
        </h1>

        {msg && (
          <div className="mb-3 px-3 py-2 rounded bg-green-100 text-green-700 text-sm">
            {msg}
          </div>
        )}
        {err && (
          <div className="mb-3 px-3 py-2 rounded bg-red-100 text-red-700 text-sm">
            {err}
          </div>
        )}

        {token ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-black">
                Mật khẩu mới
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                placeholder="Tối thiểu 6 ký tự"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-black">
                Nhập lại mật khẩu mới
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                placeholder="Nhập lại mật khẩu mới"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-black hover:bg-gray-800 text-white py-2 rounded-lg font-semibold transition ${
                loading ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {loading ? "Đang lưu..." : "Xác nhận"}
            </button>
          </form>
        ) : (
          <div className="text-center text-red-600 font-semibold">
            Link reset không hợp lệ hoặc đã hết hạn.
            <br />
            <a href="/forgot-password" className="text-blue-600 hover:underline">
              Yêu cầu link mới
            </a>
          </div>
        )}

        <div className="mt-4 text-center">
          <a href="/login" className="text-sm text-blue-600 hover:underline">
            Quay lại đăng nhập
          </a>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
