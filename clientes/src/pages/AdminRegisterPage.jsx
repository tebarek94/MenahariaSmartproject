import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "@/services/auth.service.js";
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

export function AdminRegisterPage() {
  const navigate = useNavigate();
  const [full_name, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const phoneValue = normalizeEthiopianPhone(phone);
    if (!isValidEthiopianPhone(phoneValue)) {
      setError(ETHIOPIAN_PHONE_ERROR);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await authService.registerAdmin({
        full_name,
        phone: phoneValue,
        email,
        password,
      });
      navigate(ROUTES.ADMIN_LOGIN, {
        replace: true,
        state: { message: "Account ready — sign in with your phone and password." },
      });
    } catch (err) {
      const msg =
        err?.data?.sqlMessage ||
        err?.data?.message ||
        err?.message ||
        "Registration failed";
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Admin console"
      title="Create account"
      footer={
        <AuthFooterLinks
          items={[
            { to: ROUTES.ADMIN_LOGIN, label: "Sign in instead" },
          ]}
        />
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full name"
          name="full_name"
          autoComplete="name"
          value={full_name}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
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
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Optional"
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        <Input
          label="Confirm password"
          name="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={6}
        />
        {error ? (
          <div
            className="rounded-lg border border-red-900/50 bg-red-950/35 px-3 py-2.5 text-sm text-red-200"
            role="alert"
          >
            {error}
          </div>
        ) : null}
        <Button type="submit" className="mt-2 w-full py-2.5" disabled={loading}>
          {loading ? "Creating…" : "Create account"}
        </Button>
      </form>
    </AuthShell>
  );
}
