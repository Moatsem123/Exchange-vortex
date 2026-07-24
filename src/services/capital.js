import api from "./api";

const capitalService = {
  dashboard: () =>
    api.get("/capital").then((r) => r.data),

  deposit: (data) =>
    api.post("/capital/deposit", data).then((r) => r.data),

  withdraw: (data) =>
    api.post("/capital/withdraw", data).then((r) => r.data),

  transferToBox: (data) =>
    api.post("/capital/transfer-to-box", data).then((r) => r.data),

  transactions: (params = {}) =>
    api.get("/capital/transactions", { params }).then((r) => r.data),

  accounts: (params = {}) =>
    api.get("/capital/accounts", { params }).then((r) => r.data),

  createAccount: (data) =>
    api.post("/capital/accounts", data).then((r) => r.data),

  showAccount: (id, params = {}) =>
    api.get(`/capital/accounts/${id}`, { params }).then((r) => r.data),

  createMovement: (accountId, data) =>
    api.post(`/capital/accounts/${accountId}/movements`, data).then((r) => r.data),

  updateMovement: (movementId, data) =>
    api.patch(`/capital/movements/${movementId}`, data).then((r) => r.data),

  deleteMovement: (movementId) =>
    api.delete(`/capital/movements/${movementId}`).then((r) => r.data),
};

export default capitalService;
