import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth.js";
import { AuthShell, AuthFooterLinks } from "@/components/auth/AuthShell.jsx";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { ROUTES } from "@/utils/constants.js";
import {
  ETHIOPIAN_PHONE_ERROR,
  isValidEthiopianPhone,
  normalizeEthiopianPhone,
} from "@/utils/ethiopianPhone.js";

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

function resolveDriverDestination(fromState) {
  if (typeof fromState !== "string") return ROUTES.DRIVER_DASHBOARD;
  const path = fromState.trim();
  if (!path) return ROUTES.DRIVER_DASHBOARD;
  if (path === ROUTES.DRIVER_DASHBOARD || path.startsWith("/driver/"))
    return path;
  return ROUTES.DRIVER_DASHBOARD;
}

export function DriverLoginPage() {
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!auth.isAuthenticated) return;
    if (auth.isDriver) return;
    if (auth.isAdmin) {
      navigate(ROUTES.DASHBOARD, { replace: true });
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
    // Only allow numbers and remove any non-numeric characters
    const numbersOnly = value.replace(/\D/g, "");
    setPhone(numbersOnly);

    // Validate Ethiopian phone format (09xxxxxxxx)
    if (numbersOnly && !numbersOnly.startsWith("09")) {
      setPhoneError("Phone number must start with 09");
    } else if (numbersOnly && numbersOnly.length !== 10) {
      setPhoneError("Phone number must be 10 digits");
    } else {
      setPhoneError("");
    }
  };

  const checkPasswordStrength = (password) => {
    let strength = 0;

    // Length check
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 25;

    // Character variety checks
    if (/[a-z]/.test(password)) strength += 12.5; // lowercase
    if (/[A-Z]/.test(password)) strength += 12.5; // uppercase
    if (/[0-9]/.test(password)) strength += 12.5; // numbers
    if (/[^a-zA-Z0-9]/.test(password)) strength += 12.5; // special characters

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

    // Validate phone before submission
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

    // Validate password strength
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    const phoneValue = normalizeEthiopianPhone(phone);
    if (!isValidEthiopianPhone(phoneValue)) {
      setError(ETHIOPIAN_PHONE_ERROR);
      return;
    }
    setLoading(true);
    try {
      await auth.loginAsDriver(phoneValue, password);
      const dest = resolveDriverDestination(location.state?.from);
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Driver portal"
      title="Sign in"
      footer={
        <AuthFooterLinks
          items={[{ to: "/login", label: "Back to main login" }]}
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

        {/* Password Strength Indicator */}
        {password && (
          <div className="mt-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-primary-400/80">
                Password Strength
              </span>
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
