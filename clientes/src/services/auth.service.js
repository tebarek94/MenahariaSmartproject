import { api } from "./api.client.js";
import { ADMIN_ROLE_ID, STORAGE_KEYS } from "@/utils/constants.js";
import { clearClientSession } from "@/services/authSession.js";
import { isAdminRole, isDriverRole } from "@/utils/roles.js";

export const authService = {
  async login(phone, password) {
    const data = await api.post("/api/login", { phone, password });
    if (data?.token) {
      localStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
      if (data.user) {
        const user = { ...data.user, role_name: data.role_name };
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      }
    }
    return data;
  },

  /** Same as login, then rejects (and clears session) if JWT role is not admin. */
  async loginAsAdmin(phone, password) {
    const data = await this.login(phone, password);
    const role = data?.role_name;
    if (!isAdminRole(role)) {
      this.logout();
      const err = new Error(
        "This account is not an administrator. Use the correct admin credentials."
      );
      err.code = "NOT_ADMIN";
      throw err;
    }
    return data;
  },

  /** Same as login, then rejects (and clears session) if JWT role is not driver. */
  async loginAsDriver(phone, password) {
    const data = await this.login(phone, password);
    const role = data?.role_name;
    if (!isDriverRole(role)) {
      this.logout();
      const err = new Error(
        "This account is not a driver. Use the correct driver credentials."
      );
      err.code = "NOT_DRIVER";
      throw err;
    }
    return data;
  },

  async registerAdmin({ full_name, phone, email, password }) {
    return api.post("/api/register", {
      full_name,
      phone,
      email: email?.trim() || null,
      password,
      role_id: ADMIN_ROLE_ID,
    });
  },

  async register(payload) {
    return api.post("/api/register", payload);
  },

  async profile() {
    return api.get("/api/profile");
  },

  logout() {
    clearClientSession();
  },

  getToken() {
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  },

  getStoredUser() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
};
