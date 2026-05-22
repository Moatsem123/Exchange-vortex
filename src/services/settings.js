import api from "./api";

const settingsService = {
  public: () => api.get("/settings/public").then((r) => r.data),

  list: (params = {}) =>
    api.get("/settings", { params }).then((r) => r.data),

  group: (group) =>
    api.get(`/settings/${group}`).then((r) => r.data),

  update: (data) =>
    api.put("/settings", data).then((r) => r.data),

  resetGroup: (group) =>
    api.post(`/settings/${group}/reset`).then((r) => r.data),
};

export default settingsService;