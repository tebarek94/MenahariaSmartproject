import { api } from "./api.client.js";
import {
  ADMIN_ROLE_ID,
  AUTH_LOCAL_SYNC_EVENT,
  STORAGE_KEYS,
} from "@/utils/constants.js";
import { clearClientSession } from "@/services/authSession.js";
import {
  isAdminRole,
  isDriverRole,
  isPassengerRole,
} from "@/utils/roles.js";

function persistLoginResponse(data) {
  if (data?.token) {
    localStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
    if (data.user) {
      const user = { ...data.user, role_name: data.role_name };
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(AUTH_LOCAL_SYNC_EVENT));
    }
  }
}

export const authService = {
  async login(phone, password) {
    const data = await api.post("/api/login", { phone, password });
    if (!data?.two_factor_required) {
      persistLoginResponse(data);
    }
    return data;
  },

  async completeTwoFactorLogin(twoFactorToken, code) {
    const data = await api.post("/api/login/2fa", {
      two_factor_token: twoFactorToken,
      code,
    });
    persistLoginResponse(data);
    return data;
  },

  async loginAsPassenger(phone, password) {
    const data = await this.login(phone, password);
    if (data?.two_factor_required) {
      return data;
    }
    if (!isPassengerRole(data?.role_name)) {
      this.logout();
      const err = new Error(
        "This account is not a passenger. Use the admin or driver sign-in page."
      );
      err.code = "NOT_PASSENGER";
      throw err;
    }
    return data;
  },

  async loginAsAdmin(phone, password) {
    const data = await this.login(phone, password);
    if (data?.two_factor_required) {
      return data;
    }
    if (!isAdminRole(data?.role_name)) {
      this.logout();
      const err = new Error(
        "This account is not an administrator. Use the correct admin credentials."
      );
      err.code = "NOT_ADMIN";
      throw err;
    }
    return data;
  },

  async loginAsDriver(phone, password) {
    const data = await this.login(phone, password);
    if (data?.two_factor_required) {
      return data;
    }
    if (!isDriverRole(data?.role_name)) {
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

  /** Passenger: step 1 — sends OTP to email (requires DB table + SMTP or dev console). */
  async registerPassengerStart(payload) {
    return api.post("/api/passenger/register/start", payload);
  },

  /** Passenger: step 2 — verify OTP and create account. */
  async registerPassengerVerify(email, otp) {
    return api.post("/api/passenger/register/verify", { email, otp });
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
