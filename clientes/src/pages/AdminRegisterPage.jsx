import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "@/services/auth.service.js";
import {
  AuthShell,
  AuthFooterLinks,
} from "@/components/auth/AuthShell.jsx";
import { PasswordFieldWithToggle } from "@/components/auth/PasswordFieldWithToggle.jsx";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { ROUTES } from "@/utils/constants.js";
import {
  ETHIOPIAN_PHONE_ERROR,
  isValidEthiopianPhone,
  normalizeEthiopianPhone,
} from "@/utils/ethiopianPhone.js";
import {
  ADMIN_PASSWORD_MIN_LENGTH,
  evaluateAdminPassword,
  getAdminPasswordRequirementError,
} from "@/utils/passwordPolicy.js";
import { cn } from "@/utils/cn.js";

function RequirementRow({ met, children }) {
  return (
    <li
      className={cn(
        "flex items-start gap-2 text-xs",
        met ? "text-emerald-400/90" : "text-slate-500"
      )}
    >
      <span className="mt-0.5 shrink-0" aria-hidden>
        {met ? "✓" : "○"}
      </span>
      <span>{children}</span>
    </li>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AdminRegisterPage() {
  const navigate = useNavigate();
  const [full_name, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const pwdEval = useMemo(() => evaluateAdminPassword(password), [password]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const nameTrim = full_name.trim();
    if (nameTrim.length < 2) {
      setError("Enter your full name (at least 2 characters).");
      return;
    }
    const phoneValue = normalizeEthiopianPhone(phone);
    if (!isValidEthiopianPhone(phoneValue)) {
      setError(ETHIOPIAN_PHONE_ERROR);
      return;
    }
    const emailTrim = email.trim();
    if (!emailTrim) {
      setError("Email is required for admin accounts (recovery and security notices).");
      return;
    }
    if (!EMAIL_RE.test(emailTrim)) {
      setError("Enter a valid email address.");
      return;
    }
    const reqErr = getAdminPasswordRequirementError(password);
    if (reqErr) {
      setError(reqErr);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await authService.registerAdmin({
        full_name: nameTrim,
        phone: phoneValue,
        email: emailTrim,
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
      backTo="/"
      backLabel="← Menahariya Smart"
      eyebrow="Admin console"
      heroTitle="Create an operations account"
      heroDescription="Book seats. Track status. Travel with confidence. Register to configure the network: users, roles, routes, vehicles, seats, trips, and reports. After approval, sign in from this portal anytime."
      panelTitle="Create account"
      panelSubtitle="Use a valid Ethiopian phone number; you’ll sign in with it after registration. Use a strong password — required for admin access."
      footer={
        <AuthFooterLinks
          items={[{ to: ROUTES.ADMIN_LOGIN, label: "Sign in instead" }]}
        />
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Full name"
          name="full_name"
          autoComplete="name"
          value={full_name}
          onChange={(e) => setFullName(e.target.value)}
          required
          minLength={2}
          placeholder="Your legal or display name"
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
          placeholder="you@organization.com"
          required
        />
        <div className="space-y-2">
          <PasswordFieldWithToggle
            id="admin-reg-password"
            label="Password"
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={ADMIN_PASSWORD_MIN_LENGTH}
          />
          <ul
            className="rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2.5"
            aria-label="Password requirements"
          >
            <RequirementRow met={pwdEval.checks.length}>
              At least {ADMIN_PASSWORD_MIN_LENGTH} characters
            </RequirementRow>
            <RequirementRow met={pwdEval.checks.upper}>
              One uppercase letter
            </RequirementRow>
            <RequirementRow met={pwdEval.checks.lower}>
              One lowercase letter
            </RequirementRow>
            <RequirementRow met={pwdEval.checks.digit}>One number</RequirementRow>
            <RequirementRow met={pwdEval.checks.special}>
              One symbol (not a letter or digit)
            </RequirementRow>
          </ul>
        </div>
        <PasswordFieldWithToggle
          id="admin-reg-confirm"
          label="Confirm password"
          name="confirm"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={ADMIN_PASSWORD_MIN_LENGTH}
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
