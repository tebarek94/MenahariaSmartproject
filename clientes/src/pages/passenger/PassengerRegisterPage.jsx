import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth.js";
import { authService } from "@/services/auth.service.js";
import { AuthShell, AuthFooterLinks } from "@/components/auth/AuthShell.jsx";
import { PasswordFieldWithToggle } from "@/components/auth/PasswordFieldWithToggle.jsx";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { ROUTES } from "@/utils/constants.js";

/** Must match `roles.id` for passenger (schema default: 3 = passenger). */
const PASSENGER_ROLE_ID =
  Number(import.meta.env.VITE_PASSENGER_ROLE_ID) || 3;

export function PassengerRegisterPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [full_name, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!auth.isAuthenticated) return;
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
  }, [
    auth.isAuthenticated,
    auth.isAdmin,
    auth.isDriver,
    auth.isPassenger,
    navigate,
  ]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authService.register({
        full_name: full_name.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        password,
        role_id: PASSENGER_ROLE_ID,
      });
      try {
        await auth.login(phone.trim(), password);
        navigate(ROUTES.PASSENGER_DASHBOARD, { replace: true });
      } catch {
        navigate(ROUTES.LOGIN, {
          replace: true,
          state: { registered: true },
        });
      }
    } catch (err) {
      setError(
        err?.data?.message ||
          err?.message ||
          "Registration failed. Try another phone or contact support."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      backTo="/"
      backLabel="← Menahariya Smart"
      eyebrow="New passenger"
      heroTitle="Join Menahariya Smart in minutes"
      heroDescription="Create a free passenger profile to browse trips, reserve seats, pay with Chapa, download tickets, track cargo, request refunds, and message support when you need help."
      panelTitle="Create your account"
      panelSubtitle={
        <p>
          Public sign-up is for passengers only. If your database uses another role
          id for passengers, set{" "}
          <code className="rounded bg-slate-800/90 px-1.5 py-0.5 font-mono text-[0.8125rem] text-emerald-200/95">
            VITE_PASSENGER_ROLE_ID
          </code>{" "}
          (currently {PASSENGER_ROLE_ID}).
        </p>
      }
      footer={
        <AuthFooterLinks
          items={[{ to: ROUTES.LOGIN, label: "Already registered? Sign in" }]}
        />
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full name"
          value={full_name}
          onChange={(e) => setFullName(e.target.value)}
          required
          autoComplete="name"
        />
        <Input
          label="Phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          autoComplete="tel"
          placeholder="09xxxxxxxx"
        />
        <Input
          label="Email (optional)"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <PasswordFieldWithToggle
          label="Password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
        />
        {error ? (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full py-2.5" disabled={loading}>
          {loading ? "Creating account…" : "Register"}
        </Button>
      </form>
    </AuthShell>
  );
}
