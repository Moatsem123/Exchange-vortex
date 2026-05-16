import api, { unwrap } from "./api";

export const permissionsService = {
  list: () => api.get("/permissions").then(unwrap),
};

export default permissionsService;