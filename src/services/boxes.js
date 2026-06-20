import api from "./api";

const boxesService = {
  list: (params = {}) =>
    api.get("/boxes", { params }).then((r) => r.data),

  listTurkish: (params = {}) =>
    api.get("/boxes", {
      params: {
        ...params,
        type: "turkish",
      },
    }).then((r) => r.data),

  listLocalBankWallets: (params = {}) =>
    api.get("/boxes", {
      params: {
        ...params,
        type: "local_bank_wallet",
      },
    }).then((r) => r.data),

  listUsdtWallets: (params = {}) =>
    api.get("/boxes", {
      params: {
        ...params,
        type: "usdt_wallet",
      },
    }).then((r) => r.data),

  show: (id) =>
    api.get(`/boxes/${id}`).then((r) => r.data),

  create: (data) =>
    api.post("/boxes", data).then((r) => r.data),

  update: (id, data) =>
    api.put(`/boxes/${id}`, data).then((r) => r.data),

  remove: (id) =>
    api.delete(`/boxes/${id}`).then((r) => r.data),

  balance: (id, data) =>
    api.patch(`/boxes/${id}/balance`, data).then((r) => r.data),

  logs: (id, params = {}) =>
    api.get(`/boxes/${id}/logs`, { params }).then((r) => r.data),

  adjust: (id, data) =>
    api.post(`/boxes/${id}/adjust`, data).then((r) => r.data),

  adjustments: (id, params = {}) =>
    api.get(`/boxes/${id}/adjustments`, { params }).then((r) => r.data),

  listAdjustments: (params = {}) =>
    api.get("/adjustments", { params }).then((r) => r.data),
};

export default boxesService;