import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAsync } from "@/hooks/useAsync.js";
import { useAuth } from "@/hooks/useAuth.js";
import {
  AuthShell,
  AuthFooterLinks,
} from "@/components/auth/AuthShell.jsx";
import { authService } from "@/services/auth.service.js";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { ROUTES } from "@/utils/constants.js";
import {
  ETHIOPIAN_PHONE_ERROR,
  isValidEthiopianPhone,
  normalizeEthiopianPhone,
} from "@/utils/ethiopianPhone.js";
import { isAdminRole } from "@/utils/roles.js";

// Eye icons for password visibility
function EyeIcon({ className }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function resolveAdminDestination(fromState) {
  if (typeof fromState !== "string") return ROUTES.DASHBOARD;
  const path = fromState.trim();
  if (!path) return ROUTES.DASHBOARD;
  if (path === ROUTES.DASHBOARD || path.startsWith("/admin/")) return path;
  return ROUTES.DASHBOARD;
}

export function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [notice] = useState(() => location.state?.message || "");
  const [error, setError] = useState("");
  const [loginPhase, setLoginPhase] = useState("password");
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [totpCode, setTotpCode] = useState("");

  const login = useAsync(async (phoneValue, pwd) => {
    const data = await authService.loginAsAdmin(phoneValue, pwd);
    if (data?.two_factor_required) {
      setTwoFactorToken(data.two_factor_token);
      setLoginPhase("totp");
      setTotpCode("");
      return;
    }
    const dest = resolveAdminDestination(location.state?.from);
    navigate(dest, { replace: true });
  });

  const complete2fa = useAsync(async () => {
    const digits = totpCode.replace(/\D/g, "");
    const data = await authService.completeTwoFactorLogin(twoFactorToken, digits);
    if (!isAdminRole(data?.role_name)) {
      authService.logout();
      throw new Error(
        "This account is not an administrator. Use the correct admin credentials."
      );
    }
    const dest = resolveAdminDestination(location.state?.from);
    navigate(dest, { replace: true });
  });

  useEffect(() => {
    if (!auth.isAuthenticated) return;
    if (auth.isAdmin) return;
    if (auth.isDriver) {
      navigate(ROUTES.DRIVER_DASHBOARD, { replace: true });
      return;
    }
    if (auth.isPassenger) {
      navigate(ROUTES.PASSENGER_DASHBOARD, { replace: true });
      return;
    }
    navigate(ROUTES.LOGIN, { replace: true });
  }, [
    auth.isAuthenticated,
    auth.isAdmin,
    auth.isDriver,
    auth.isPassenger,
    navigate,
  ]);

  const validatePhone = (value) => {
    const numbersOnly = value.replace(/\D/g, "");
    setPhone(numbersOnly);

    if (numbersOnly && !numbersOnly.startsWith("09")) {
      setPhoneError("Phone number must start with 09");
    } else if (numbersOnly && numbersOnly.length !== 10) {
      setPhoneError("Phone number must be 10 digits");
    } else {
      setPhoneError("");
    }
  };

  const checkPasswordStrength = (pwd) => {
    let strength = 0;

    if (pwd.length >= 8) strength += 25;
    if (pwd.length >= 12) strength += 25;

    if (/[a-z]/.test(pwd)) strength += 12.5;
    if (/[A-Z]/.test(pwd)) strength += 12.5;
    if (/[0-9]/.test(pwd)) strength += 12.5;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength += 12.5;

    setPasswordStrength(Math.min(strength, 100));
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 25) return "bg-red-500";
    if (passwordStrength <= 50) return "bg-orange-500";
    if (passwordStrength <= 75) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength === 0) return "";
    if (passwordStrength <= 25) return "Weak";
    if (passwordStrength <= 50) return "Fair";
    if (passwordStrength <= 75) return "Good";
    return "Strong";
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    checkPasswordStrength(newPassword);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    login.reset();

    if (!phone) {
      setPhoneError("Phone number is required");
      return;
    }
    if (!phone.startsWith("09")) {
      setPhoneError("Phone number must start with 09");
      return;
    }
    if (phone.length !== 10) {
      setPhoneError("Phone number must be 10 digits");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    const phoneValue = normalizeEthiopianPhone(phone);
    if (!isValidEthiopianPhone(phoneValue)) {
      setError(ETHIOPIAN_PHONE_ERROR);
      return;
    }

    try {
      await login.run(phoneValue, password);
    } catch {
      // login.error
    }
  }

  async function handleTotpSubmit(e) {
    e.preventDefault();
    setError("");
    complete2fa.reset();
    const digits = totpCode.replace(/\D/g, "");
    if (digits.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    try {
      await complete2fa.run();
    } catch {
      // complete2fa.error
    }
  }

  return (
    <AuthShell
      backTo="/"
      backLabel="← Menahariya Smart"
      eyebrow="Admin console"
      heroTitle="Fleet, finance, and passengers in one place"
      heroDescription="Book seats. Track status. Travel with confidence. Sign in to manage routes, vehicles, trips, tickets, Chapa payments, cargo, refunds, and support — secure access for operations staff only."
      panelTitle="Sign in"
      panelSubtitle={
        loginPhase === "totp"
          ? "Enter the 6-digit code we sent to your email."
          : "Admin phone and password."
      }
      footer={
        <AuthFooterLinks
          items={[{ to: ROUTES.ADMIN_REGISTER, label: "Create admin account" }]}
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
      {loginPhase === "password" ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Input
              label="Phone number"
              name="phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => validatePhone(e.target.value)}
              placeholder="0912345678"
              maxLength={10}
              className={phoneError ? "border-red-500/50" : ""}
              required
            />
            {phoneError && (
              <p className="mt-1 text-xs text-red-400">{phoneError}</p>
            )}
          </div>
          <div className="relative">
            <Input
              label="Password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={handlePasswordChange}
              className="pr-10"
              required
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-3 top-8 text-primary-400/60 hover:text-primary-300 focus:outline-none focus:text-primary-300 transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOffIcon className="w-5 h-5" />
              ) : (
                <EyeIcon className="w-5 h-5" />
              )}
            </button>
          </div>

          {password && (
            <div className="mt-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-primary-400/80">Password Strength</span>
                <span
                  className={`text-xs font-medium ${
                    passwordStrength <= 25
                      ? "text-red-400"
                      : passwordStrength <= 50
                        ? "text-orange-400"
                        : passwordStrength <= 75
                          ? "text-yellow-400"
                          : "text-green-400"
                  }`}
                >
                  {getPasswordStrengthText()}
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                  style={{ width: `${passwordStrength}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-primary-400/60">
                Use 8+ characters with mix of letters, numbers & symbols
              </div>
            </div>
          )}
          {(error || login.error) ? (
            <div
              className="rounded-lg border border-red-900/50 bg-red-950/35 px-3 py-2.5 text-sm text-red-200"
              role="alert"
            >
              {error || login.error?.message || "Login failed."}
            </div>
          ) : null}
          <Button type="submit" className="mt-1 w-full py-2.5" disabled={login.loading}>
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
            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            required
          />
          {(error || complete2fa.error) ? (
            <div
              className="rounded-lg border border-red-900/50 bg-red-950/35 px-3 py-2.5 text-sm text-red-200"
              role="alert"
            >
              {error || complete2fa.error?.message || "Verification failed."}
            </div>
          ) : null}
          <Button type="submit" className="w-full py-2.5" disabled={complete2fa.loading}>
            {complete2fa.loading ? "Verifying…" : "Verify and sign in"}
          </Button>
          <button
            type="button"
            className="w-full text-center text-sm text-primary-400/90 underline decoration-primary-600/50 underline-offset-2 hover:text-primary-300"
            onClick={() => {
              setLoginPhase("password");
              setTwoFactorToken("");
              setTotpCode("");
              setError("");
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
