import { api } from "./api.client.js";
import { STORAGE_KEYS } from "@/utils/constants.js";

export const profileService = {
  // Get current user profile (using existing auth service endpoint with fallback)
  getProfile: async () => {
    try {
      // Try the profile endpoint first
      return await api.get("/api/profile");
    } catch (error) {
      // If profile endpoint doesn't exist, use users endpoint with current user ID
      if (error.status === 404) {
        const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || '{}');
        if (!user.id) {
          throw new Error('User ID not found');
        }
        return await api.get(`/api/users/${user.id}`);
      }
      throw error;
    }
  },
  
  // Update current user profile (using users endpoint with current user ID)
  updateProfile: async (data) => {
    // Get current user from localStorage to get user ID
    const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || '{}');
    if (!user.id) {
      throw new Error('User ID not found');
    }
    
    // Keep role_id and status so self-service updates never strip them server-side
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
  
  // Delete current user account
  deleteAccount: () => {
    const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || '{}');
    if (!user.id) {
      throw new Error('User ID not found');
    }
    return api.delete(`/api/users/${user.id}`);
  },
  
  // Change password (using auth endpoint pattern)
  changePassword: (data) => api.post("/api/change-password", data),
  
  // Upload profile picture (using users endpoint)
  uploadProfilePicture: (file) => {
    const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || '{}');
    if (!user.id) {
      throw new Error('User ID not found');
    }
    const formData = new FormData();
    formData.append("profile_picture", file);
    return api.post(`/api/users/${user.id}/upload-picture`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
  
  // Get user by ID (for admin)
  getUserById: (userId) => api.get(`/api/users/${userId}`),
  
  // Update user by ID (for admin)
  updateUserById: (userId, data) => api.put(`/api/users/${userId}`, data),
  
  // Delete user by ID (for admin)
  deleteUserById: (userId) => api.delete(`/api/users/${userId}`),
  
  // Create new user (for admin)
  createUser: (data) => api.post("/api/users", data),
};
