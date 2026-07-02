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
};

export default capitalService;