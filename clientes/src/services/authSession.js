import { AUTH_LOCAL_SYNC_EVENT, STORAGE_KEYS } from "@/utils/constants.js";

/** Clears stored credentials and notifies `AuthProvider` (same tab + cross-tab listeners). */
export function clearClientSession() {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_LOCAL_SYNC_EVENT));
  }
}
