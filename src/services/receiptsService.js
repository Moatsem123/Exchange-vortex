import api from "./api";

export const receiptsService = {
  download: (id) =>
    api.get(`/receipts/${id}`, {
      responseType: "blob",
      headers: {
        Accept: "application/pdf",
      },
    }),
};

export default receiptsService;