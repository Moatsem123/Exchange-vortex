import api from "./api";

const currenciesService = {
  list: (params) => api.get("/currencies", { params }).then((r) => r.data),
  show: (code) => api.get(`/currencies/${code}`).then((r) => r.data),
  create: (data) => api.post("/currencies", data).then((r) => r.data),
  update: (code, data) => api.patch(`/currencies/${code}`, data).then((r) => r.data),
  disable: (code) => api.delete(`/currencies/${code}`).then((r) => r.data),
  updateRate: (code, data) => api.put(`/currencies/${code}/rate`, data).then((r) => r.data),
};

export default currenciesService;