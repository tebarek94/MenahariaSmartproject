import { api } from "./api.client.js";

/** Backend: /api/support-chat */
export const supportChatService = {
  myMessages: () => api.get("/api/support-chat/my-messages"),
  adminThreads: () => api.get("/api/support-chat/threads"),
  adminThreadMessages: (passengerUserId) =>
    api.get(`/api/support-chat/threads/${passengerUserId}`),
};
