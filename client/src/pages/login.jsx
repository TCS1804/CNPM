// src/pages/Login.jsx
import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export default function Login() {
  const [form, setForm] = useState({ username: "" , password: "" }); // Changed from username/password to single identifier
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
    const res = await axios.post("http://localhost:5010/auth/login", form);
      const { token, role } = res.data;
      localStorage.setItem("token", token);
      const user = { role: role };
      localStorage.setItem("user", JSON.stringify(user));
       toast.success(`Welcome ${role}`);
      if (role === "admin") {
        window.location.href = "/admin/dashboard"; 
      } else if (role === "customer") {
        window.location.href = "/home"; 
      }else if (role === "restaurant") {
        window.location.href = "/restaurant/orders";
      }else if (role === "delivery") {
        window.location.href = "/delivery/orders/all"; 
      } 
      else {
        window.location.href = "/"; 
      }
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4 px-6">
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Logo */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black">Login</h1>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div>
            <label className="block text-xl font-semibold text-black mb-2">
              What's your user name or email?
            </label>
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="Enter phone number or email"
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 placeholder-gray-400"
              required
            />
          </div>

        <div>
            <label className="block text-xl font-semibold text-black mb-2">
                What's your password?
            </label>
            <input
                type="password"
                name="password"
                value={form.password || ""}
                onChange={handleChange}
                placeholder="Enter your password"
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 placeholder-gray-400"
                required
            />
        </div>

          <button
            type="submit"
            className="w-full bg-black hover:bg-gray-800 text-white py-3 rounded-lg font-semibold transition"
            disabled={loading}
          >
            {loading ? "Continuing..." : "Continue"}
          </button>
        </form>

        {/* Divider and Alternative Login Options */}
        <div className="w-full flex items-center my-4">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="mx-4 text-gray-500">or</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>

        {/* Continue with Google */}
        <button className="w-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 py-3 rounded-lg font-semibold transition mb-2">
          <img
            src="https://www.google.com/favicon.ico"
            alt="Google"
            className="w-5 h-5 mr-2"
          />
          Continue with Google
        </button>

        {/* Continue with Apple */}
        <button className="w-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 py-3 rounded-lg font-semibold transition mb-2">
          <svg
            className="w-5 h-5 mr-2"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.02-1.77-.79-3.29-.79s-2.02.77-3.29.81c-1.34.04-2.27-1.23-3.11-2.47C4.14 16.77 3 13.65 3 10.5c0-4.47 2.91-6.92 5.78-6.92 1.52 0 2.97.83 3.88.83.88 0 2.27-.83 3.97-.83 1.48 0 3.05.83 4.15 2.25-1.48.92-2.47 2.25-2.47 4.08 0 2.34 1.48 4.29 3.64 4.29.31 0 .61-.04.92-.12-.47 1.34-1.31 2.47-2.2 3.42zM12.03 7.5c0-1.48-.92-2.67-2.47-2.67-1.48 0-2.67 1.19-2.67 2.67s1.19 2.67 2.67 2.67c1.55 0 2.47-1.19 2.47-2.67z"/>
          </svg>
          Continue with Apple
        </button>

        {/* Divider */}
        <div className="w-full flex items-center my-4">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="mx-4 text-gray-500">or</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>

        {/* QR Code Login */}
        <button className="w-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 py-3 rounded-lg font-semibold transition">
          <svg
            className="w-5 h-5 mr-2"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z"/>
          </svg>
          Log in with QR code
        </button>

        {/* Terms Text */}
        <p className="text-xs text-gray-500 text-center mt-6">
          By proceeding, you consent to get calls, WhatsApp or SMS/RCS messages, including by automated means, from Uber and its affiliates to the number provided.
        </p>
      </div>
    </div>
  );
}