import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth.js";
import {
  AuthShell,
  AuthFooterLinks,
} from "@/components/auth/AuthShell.jsx";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { ROUTES } from "@/utils/constants.js";
import {
  ETHIOPIAN_PHONE_ERROR,
  isValidEthiopianPhone,
  normalizeEthiopianPhone,
} from "@/utils/ethiopianPhone.js";

function resolveAdminDestination(fromState) {
  if (typeof fromState !== "string") return ROUTES.DASHBOARD;
  const path = fromState.trim();
  if (!path) return ROUTES.DASHBOARD;
  if (path === ROUTES.DASHBOARD || path.startsWith("/admin/")) return path;
  return ROUTES.DASHBOARD;
}

export function AdminLoginPage({ onLogin }) {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [notice] = useState(() => location.state?.message || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (auth.isAuthenticated && !auth.isAdmin) {
      auth.logout();
    }
  }, [auth.isAuthenticated, auth.isAdmin, auth.logout]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const phoneValue = normalizeEthiopianPhone(phone);
    if (!isValidEthiopianPhone(phoneValue)) {
      setError(ETHIOPIAN_PHONE_ERROR);
      return;
    }
    setLoading(true);
    try {
      await onLogin(phoneValue, password);
      const dest = resolveAdminDestination(location.state?.from);
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Admin console"
      title="Sign in"
      footer={
        <AuthFooterLinks
          items={[
            { to: ROUTES.ADMIN_REGISTER, label: "Create account" },
          ]}
        />
      }
    >
      {notice ? (
        <div
          className="mb-5 rounded-lg border border-primary-700/40 bg-primary-950/50 px-3 py-2.5 text-sm text-primary-100/95"
          role="status"
        >
          {notice}
        </div>
      ) : null}
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Phone number"
          name="phone"
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0912345678"
          required
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error ? (
          <div
            className="rounded-lg border border-red-900/50 bg-red-950/35 px-3 py-2.5 text-sm text-red-200"
            role="alert"
          >
            {error}
          </div>
        ) : null}
        <Button type="submit" className="mt-1 w-full py-2.5" disabled={loading}>
          {loading ? "Signing in…" : "Continue"}
        </Button>
      </form>
    </AuthShell>
  );
}
