import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAsync } from "@/hooks/useAsync.js";
import { useAuth } from "@/hooks/useAuth.js";
import { AuthShell, AuthFooterLinks } from "@/components/auth/AuthShell.jsx";
import { PasswordFieldWithToggle } from "@/components/auth/PasswordFieldWithToggle.jsx";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { ROUTES } from "@/utils/constants.js";
import {
  isAdminRole,
  isDriverRole,
  isPassengerRole,
} from "@/utils/roles.js";

function postLoginPath(roleName) {
  if (isAdminRole(roleName)) return ROUTES.DASHBOARD;
  if (isDriverRole(roleName)) return ROUTES.DRIVER_DASHBOARD;
  if (isPassengerRole(roleName)) return ROUTES.PASSENGER_DASHBOARD;
  return ROUTES.PASSENGER_DASHBOARD;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const justRegistered = location.state?.registered === true;
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const login = useAsync(async () => {
    const data = await auth.login(phone, password);
    const dest = postLoginPath(data?.role_name);
    navigate(dest, { replace: true });
    return data;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login.run();
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
      panelSubtitle="Sign in with the phone number registered on your account."
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
    </AuthShell>
  );
}
