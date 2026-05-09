import { api } from "./api.client.js";
import { unwrapApiArray } from "@/utils/apiArray.js";

export const driverAssignmentsService = {
  listMine: async () =>
    unwrapApiArray(await api.get("/api/users/driver-assignments")),
};
