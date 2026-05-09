import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAsync } from "@/hooks/useAsync.js";
import { useAuth } from "@/hooks/useAuth.js";
import { AuthShell } from "@/components/auth/AuthShell.jsx";
import { PasswordFieldWithToggle } from "@/components/auth/PasswordFieldWithToggle.jsx";
import { Input } from "@/ui/Input.jsx";
import { Button } from "@/ui/Button.jsx";
import { authService } from "@/services/auth.service.js";
import { ROUTES } from "@/utils/constants.js";
import { isStaffRole } from "@/utils/roles.js";

function resolveDestination(from) {
  if (typeof from !== "string") return ROUTES.STAFF_DASHBOARD;
  if (from === ROUTES.STAFF_DASHBOARD || from.startsWith("/staff/")) return from;
  return ROUTES.STAFF_DASHBOARD;
}

export function StaffLoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [phase, setPhase] = useState("password");
  const [error, setError] = useState("");

  const login = useAsync(async () => {
    const data = await authService.loginAsStaff(phone, password);
    if (data?.two_factor_required) {
      setTwoFactorToken(data.two_factor_token);
      setPhase("totp");
      setTotpCode("");
      return;
    }
    navigate(resolveDestination(location.state?.from), { replace: true });
  });

  const complete2fa = useAsync(async () => {
    const data = await authService.completeTwoFactorLogin(twoFactorToken, totpCode);
    if (!isStaffRole(data?.role_name)) {
      authService.logout();
      throw new Error("This account is not staff.");
    }
    navigate(resolveDestination(location.state?.from), { replace: true });
  });

  useEffect(() => {
    if (!auth.isAuthenticated) return;
    if (auth.isStaff) {
      navigate(ROUTES.STAFF_DASHBOARD, { replace: true });
      return;
    }
    if (auth.isAdmin) {
      navigate(ROUTES.DASHBOARD, { replace: true });
      return;
    }
    if (auth.isDriver) {
      navigate(ROUTES.DRIVER_DASHBOARD, { replace: true });
      return;
    }
    if (auth.isPassenger) {
      navigate(ROUTES.PASSENGER_DASHBOARD, { replace: true });
    }
  }, [auth, navigate]);

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await login.run();
    } catch (err) {
      setError(err?.message || "Sign in failed");
    }
  }

  async function handleTotpSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await complete2fa.run();
    } catch (err) {
      setError(err?.message || "Verification failed");
    }
  }

  return (
    <AuthShell
      backTo="/"
      backLabel="Menahariya Smart"
      eyebrow="Staff portal"
      heroTitle="Station and cargo staff dashboard"
      heroDescription="Assist passengers with booking and boarding, validate tickets, and manage cargo operations."
      panelTitle="Staff sign in"
      panelSubtitle={
        phase === "totp"
          ? "Enter the 6-digit code from your email."
          : "Use your phone and password."
      }
    >
      {phase === "password" ? (
        <form className="space-y-4" onSubmit={handlePasswordSubmit}>
          <Input
            label="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <PasswordFieldWithToggle
            label="Password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {(error || login.error) ? (
            <p className="text-sm text-red-400">{error || login.error?.message}</p>
          ) : null}
          <Button type="submit" className="w-full" disabled={login.loading}>
            {login.loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={handleTotpSubmit}>
          <Input
            label="Email verification code"
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            required
          />
          {(error || complete2fa.error) ? (
            <p className="text-sm text-red-400">{error || complete2fa.error?.message}</p>
          ) : null}
          <Button type="submit" className="w-full" disabled={complete2fa.loading}>
            {complete2fa.loading ? "Verifying..." : "Verify and sign in"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setPhase("password");
              setTwoFactorToken("");
              setTotpCode("");
              setError("");
            }}
          >
            Back
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
