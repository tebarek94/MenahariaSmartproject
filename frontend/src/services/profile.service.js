import { api } from "./api.client.js";
import { STORAGE_KEYS } from "@/utils/constants.js";

export const profileService = {
  getProfile: async () => {
    try {
      return await api.get("/api/profile");
    } catch (error) {
      if (error.status === 404) {
        const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || "{}");
        if (!user.id) {
          throw new Error("User ID not found");
        }
        return await api.get(`/api/users/${user.id}`);
      }
      throw error;
    }
  },

  updateProfile: async (data) => {
    const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || "{}");
    if (!user.id) {
      throw new Error("User ID not found");
    }

    if (user.role_name === "admin" || user.role_name === "passenger") {
      const updateData = {
        ...data,
        role_id: user.role_id,
        status: user.status || "active",
      };
      return api.put(`/api/users/${user.id}`, updateData);
    }

    return api.put(`/api/users/${user.id}`, data);
  },

  deleteAccount: () => {
    const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || "{}");
    if (!user.id) {
      throw new Error("User ID not found");
    }
    return api.delete(`/api/users/${user.id}`);
  },

  changePassword: (data) => api.post("/api/change-password", data),

  twoFactorRequestEnable: (password) =>
    api.post("/api/profile/two-factor/request-enable", { password }),

  twoFactorEnable: (code) => api.post("/api/profile/two-factor/enable", { code }),

  twoFactorRequestDisable: (password) =>
    api.post("/api/profile/two-factor/request-disable", { password }),

  twoFactorDisable: (code) => api.post("/api/profile/two-factor/disable", { code }),

  uploadProfilePicture: (file) => {
    const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || "{}");
    if (!user.id) {
      throw new Error("User ID not found");
    }
    const formData = new FormData();
    formData.append("profile_picture", file);
    return api.post(`/api/users/${user.id}/upload-picture`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  getUserById: (userId) => api.get(`/api/users/${userId}`),

  updateUserById: (userId, data) => api.put(`/api/users/${userId}`, data),

  deleteUserById: (userId) => api.delete(`/api/users/${userId}`),

  createUser: (data) => api.post("/api/users", data),
};
