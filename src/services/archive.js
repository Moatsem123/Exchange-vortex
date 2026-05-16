import api from "./api";

const archiveService = {
  list: (params) => api.get("/archive", { params }).then((r) => r.data),
  show: (id) => api.get(`/archive/${id}`).then((r) => r.data),
  restore: (id) => api.post(`/archive/${id}/restore`).then((r) => r.data),
};

export default archiveService;