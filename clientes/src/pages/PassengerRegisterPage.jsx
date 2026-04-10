import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth.js";
import { authService } from "@/services/auth.service.js";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { Card } from "@/ui/Card.jsx";
import { ROUTES } from "@/utils/constants.js";

/** Must match `roles.id` for passenger (`menahariya_smart_full_schema`: 1=admin, 2=driver, 3=passenger). */
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
    <div className="mx-auto flex max-w-lg flex-1 flex-col justify-center px-4 py-12">
      <Card
        title="Create passenger account"
        subtitle={`New accounts are passengers only (role id ${PASSENGER_ROLE_ID}). After sign-up you are signed in and taken to your dashboard. Set VITE_PASSENGER_ROLE_ID if your DB differs.`}
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
          <Input
            label="Password"
            type="password"
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
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account…" : "Register"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link to={ROUTES.LOGIN} className="text-emerald-400 hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
