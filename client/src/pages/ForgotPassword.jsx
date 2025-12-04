import { useState } from "react";
import api from "../lib/axios";

const ForgotPassword = () => {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    setErr("");

    if (!identifier.trim()) {
      setErr("Vui lòng nhập email hoặc username.");
      setLoading(false);
      return;
    }

    try {
      // Backend chấp nhận username hoặc email
      await api.post("/auth/forgot-password", { username: identifier });
      setMsg(
        "Nếu tài khoản tồn tại, hệ thống đã gửi email chứa link đặt lại mật khẩu. Hãy kiểm tra hộp thư (hoặc kiểm tra console nếu chạy dev mode)."
      );
      setIdentifier("");
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || "Lỗi gửi yêu cầu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-md bg-white border rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4 text-black">
          Quên mật khẩu
        </h1>
        <p className="text-sm text-gray-600 mb-4">
          Nhập email hoặc username mà bạn đã đăng ký. Nếu tài khoản tồn tại,
          chúng tôi sẽ gửi email với link để đặt lại mật khẩu.
        </p>

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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-black">
              Email hoặc Username
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
              placeholder="Nhập email hoặc username"
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
            {loading ? "Đang gửi..." : "Gửi link đặt lại mật khẩu"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <a
            href="/login"
            className="text-sm text-blue-600 hover:underline"
          >
            Quay lại đăng nhập
          </a>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
