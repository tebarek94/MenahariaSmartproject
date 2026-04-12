import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAsync } from "@/hooks/useAsync.js";
import { AuthShell, AuthFooterLinks } from "@/components/auth/AuthShell.jsx";
import { PasswordFieldWithToggle } from "@/components/auth/PasswordFieldWithToggle.jsx";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { authService } from "@/services/auth.service.js";
import { ROUTES } from "@/utils/constants.js";
import { isPassengerRole } from "@/utils/roles.js";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const justRegistered = location.state?.registered === true;
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loginPhase, setLoginPhase] = useState("password");
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [totpLocalError, setTotpLocalError] = useState("");

  const login = useAsync(async () => {
    const data = await authService.loginAsPassenger(phone, password);
    if (data?.two_factor_required) {
      setTwoFactorToken(data.two_factor_token);
      setLoginPhase("totp");
      setTotpCode("");
      return;
    }
    navigate(ROUTES.PASSENGER_DASHBOARD, { replace: true });
  });

  const complete2fa = useAsync(async () => {
    const digits = totpCode.replace(/\D/g, "");
    const data = await authService.completeTwoFactorLogin(twoFactorToken, digits);
    if (!isPassengerRole(data?.role_name)) {
      authService.logout();
      throw new Error(
        "This account is not a passenger. Use the admin or driver sign-in page."
      );
    }
    navigate(ROUTES.PASSENGER_DASHBOARD, { replace: true });
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login.run();
    } catch {
      // Error shown in UI
    }
  };

  const handleTotpSubmit = async (e) => {
    e.preventDefault();
    complete2fa.reset();
    const digits = totpCode.replace(/\D/g, "");
    if (digits.length !== 6) {
      setTotpLocalError("Enter the 6-digit code from your email.");
      return;
    }
    setTotpLocalError("");
    try {
      await complete2fa.run();
    } catch {
      // Error shown in UI
    }
  };

  return (
    <AuthShell
      backTo="/"
      backLabel="← Menahariya Smart"
      eyebrow="Passenger access"
      heroTitle="Book seats, pay online, travel with confidence"
      heroDescription="Menahariya Smart connects you to scheduled trips, mobile payments via Chapa, digital tickets with QR check-in, cargo tracking, and refunds — all from your phone."
      panelTitle="Welcome back"
      panelSubtitle={
        loginPhase === "totp"
          ? "Enter the 6-digit code we sent to your email."
          : "Sign in with your phone and password."
      }
      footer={
        <AuthFooterLinks
          items={[{ to: ROUTES.PASSENGER_REGISTER, label: "Create account" }]}
        />
      }
    >
      {justRegistered ? (
        <div
          className="mb-5 rounded-lg border border-emerald-600/40 bg-emerald-950/35 px-3 py-2.5 text-sm text-emerald-100"
          role="status"
        >
          Account created. Sign in with your phone and password.
        </div>
      ) : null}
      {loginPhase === "password" ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Phone number"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="09xxxxxxxx"
            required
          />
          <PasswordFieldWithToggle
            label="Password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            required
          />
          {login.error ? (
            <div
              className="rounded-lg border border-red-900/50 bg-red-950/35 px-3 py-2.5 text-sm text-red-200"
              role="alert"
            >
              {login.error.message ||
                "Login failed. Please check your credentials."}
            </div>
          ) : null}
          <Button
            type="submit"
            className="w-full py-2.5"
            disabled={login.loading}
            variant="primary"
          >
            {login.loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleTotpSubmit} className="space-y-5">
          <Input
            label="Email verification code"
            name="totp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={totpCode}
            onChange={(e) => {
              setTotpLocalError("");
              setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6));
            }}
            placeholder="000000"
            required
          />
          {totpLocalError || complete2fa.error ? (
            <div
              className="rounded-lg border border-red-900/50 bg-red-950/35 px-3 py-2.5 text-sm text-red-200"
              role="alert"
            >
              {totpLocalError ||
                complete2fa.error?.message ||
                "Verification failed."}
            </div>
          ) : null}
          <Button
            type="submit"
            className="w-full py-2.5"
            disabled={complete2fa.loading}
            variant="primary"
          >
            {complete2fa.loading ? "Verifying…" : "Verify and sign in"}
          </Button>
          <button
            type="button"
            className="w-full text-center text-sm text-emerald-300/90 underline decoration-emerald-600/40 underline-offset-2 hover:text-emerald-200"
            onClick={() => {
              setLoginPhase("password");
              setTwoFactorToken("");
              setTotpCode("");
              setTotpLocalError("");
              login.reset();
              complete2fa.reset();
            }}
          >
            Back to phone and password
          </button>
        </form>
      )}
    </AuthShell>
  );
}
