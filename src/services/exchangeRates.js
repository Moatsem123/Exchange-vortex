import api from "./api";

const exchangeRatesService = {
  list: (params) => api.get("/exchange-rates", { params }).then((r) => r.data),
  bulkUpdate: (data) => api.post("/exchange-rates/bulk-update", data).then((r) => r.data),
};

export default exchangeRatesService;