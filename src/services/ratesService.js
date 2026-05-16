import api, { unwrap } from "./api";

export const ratesService = {
  list: (params) => api.get("/exchange-rates", { params }).then(unwrap),
  bulkUpdate: (data) => api.post("/exchange-rates/bulk-update", data).then(unwrap),
};

export default ratesService;