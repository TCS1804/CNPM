// client/src/lib/axios.js
import axios from "axios";
import { API } from "./http";

const api = axios.create({
  baseURL: API,
});

// Gắn Authorization: Bearer <token> cho mọi request nếu có
api.interceptors.request.use((config) => {
  try {
    let token = localStorage.getItem("token");

    // fallback: nếu sau này bạn lưu token trong "user"
    if (!token) {
      const raw = localStorage.getItem("user");
      if (raw) {
        const parsed = JSON.parse(raw);
        token =
          parsed?.accessToken ||
          parsed?.token ||
          parsed?.data?.accessToken ||
          parsed?.jwt; // phòng xa
      }
    }

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (err) {
    console.error("Error attaching token", err);
  }

  return config;
});

export default api;
