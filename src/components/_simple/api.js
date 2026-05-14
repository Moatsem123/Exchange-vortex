// =====================================================
// api.js — أبسط ربط axios مع Laravel
// المكان المفروض: src/services/api.js
// =====================================================
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // http://cleargate-fx.test/api
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// لو في توكن محفوظ من جلسة سابقة → ضيفو لكل الطلبات تلقائيًا
const savedToken = localStorage.getItem("token");
if (savedToken) {
  api.defaults.headers.common["Authorization"] = `Bearer ${savedToken}`;
}

export default api;
