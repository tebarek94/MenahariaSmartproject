import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth.js";
import { authService } from "@/services/auth.service.js";
import { AuthShell, AuthFooterLinks } from "@/components/auth/AuthShell.jsx";
import { PasswordFieldWithToggle } from "@/components/auth/PasswordFieldWithToggle.jsx";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { ROUTES } from "@/utils/constants.js";
import {
  formatEthiopianPhoneForInput,
  normalizeEthiopianPhone,
} from "@/utils/ethiopianPhone.js";

/** Must match `roles.id` for passenger (schema default: 3 = passenger). */
const PASSENGER_ROLE_ID = Number(import.meta.env.VITE_PASSENGER_ROLE_ID) || 3;
const PASSENGER_PHONE_MAX_DIGITS = 12;
const PASSENGER_PHONE_STANDARD_ERROR =
  "Use a valid Ethiopian phone number: 09XXXXXXXX or 2519XXXXXXXX.";

function isPassengerPhoneStandard(value) {
  const phone = String(value ?? "").replace(/\D/g, "");
  return /^09\d{8}$/.test(phone) || /^2519\d{8}$/.test(phone);
}

export function PassengerRegisterPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [full_name, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("form");
  const [hint, setHint] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const confirmPasswordError =
    confirmPassword && password !== confirmPassword
      ? "Passwords do not match."
      : "";

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

  async function sendOtp(e) {
    e.preventDefault();
    setError("");
    setHint("");
    if (password !== confirmPassword) {
      setError("Password and confirmation must match.");
      return;
    }
    setLoading(true);
    try {
      const phoneValue = normalizeEthiopianPhone(phone);
      if (!isPassengerPhoneStandard(phoneValue)) {
        throw new Error(PASSENGER_PHONE_STANDARD_ERROR);
      }
      const data = await authService.registerPassengerStart({
        full_name: full_name.trim(),
        phone: phoneValue,
        email: email.trim(),
        password,
        role_id: PASSENGER_ROLE_ID,
      });
      setStep("otp");
      setOtp("");
      if (data?.hint) setHint(data.hint);
    } catch (err) {
      setError(
        err?.data?.message ||
          err?.message ||
          "Could not send the verification code. Check your details and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authService.registerPassengerVerify(email.trim(), otp);
      navigate(ROUTES.LOGIN, {
        replace: true,
        state: { registered: true },
      });
    } catch (err) {
      setError(
        err?.data?.message ||
          err?.message ||
          "Verification failed. Check the code or request a new one.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    setError("");
    setHint("");
    setLoading(true);
    try {
      const phoneValue = normalizeEthiopianPhone(phone);
      if (!isPassengerPhoneStandard(phoneValue)) {
        throw new Error(PASSENGER_PHONE_STANDARD_ERROR);
      }
      const data = await authService.registerPassengerStart({
        full_name: full_name.trim(),
        phone: phoneValue,
        email: email.trim(),
        password,
        role_id: PASSENGER_ROLE_ID,
      });
      setOtp("");
      if (data?.hint) setHint(data.hint);
    } catch (err) {
      setError(
        err?.data?.message ||
          err?.message ||
          "Could not resend the code. Try again shortly.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="font-poppins">
      <AuthShell
        backTo="/"
        backLabel="← Menahariya Smart"
        eyebrow="New passenger"
        heroTitle="Join Menahariya Smart in minutes"
        heroDescription="Create a free passenger profile to browse trips, reserve seats, pay with Chapa, download tickets, track cargo, request refunds, and message support when you need help."
        panelTitle={step === "otp" ? "Verify your email" : "Create your account"}
        panelSubtitle={
          step === "otp" ? (
            <p>
              Enter the 6-digit code we sent to{" "}
              <span className="font-medium text-emerald-200/95">
                {email.trim()}
              </span>
              .
            </p>
          ) : (
            <p>
              Public sign-up is for passengers only. We email you a code to
              confirm your address. If your database uses another role id for
              passengers, set (currently {PASSENGER_ROLE_ID}).
            </p>
          )
        }
        footer={
          <AuthFooterLinks
            items={[{ to: ROUTES.LOGIN, label: "Already registered? Sign in" }]}
          />
        }
      >
        {step === "form" ? (
          <form onSubmit={sendOtp} className="space-y-4">
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
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={PASSENGER_PHONE_MAX_DIGITS}
              value={phone}
              onChange={(e) => {
                const digitsOnly = String(e.target.value ?? "")
                  .replace(/\D/g, "")
                  .slice(0, PASSENGER_PHONE_MAX_DIGITS);
                setPhone(formatEthiopianPhoneForInput(digitsOnly));
              }}
              required
              autoComplete="tel"
              placeholder="Enter phone number"
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
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
            {/* confirm password */}
            <PasswordFieldWithToggle
              label="Confirm password"
              name="confirm_password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
            {/* confirm password error */}
            {confirmPasswordError ? (
              <p className="text-sm text-red-400" role="alert">
                {confirmPasswordError}
              </p>
            ) : null}
            {error ? (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              className="
    !w-full !py-2.5 !rounded-xl
    !bg-white/10
    !text-white
    !border !border-white/10
    backdrop-blur-xl

    hover:!bg-white/20
    hover:!border-white/20

    active:scale-[0.98]
    transition-all duration-200

    shadow-[0_6px_30px_rgba(0,0,0,0.35)]
  "
              disabled={loading || Boolean(confirmPasswordError)}
            >
              {loading ? "Sending code…" : "Continue — send code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="space-y-4">
            <Input
              label="Verification code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              required
              placeholder="000000"
            />
            {hint ? (
              <p className="text-sm text-amber-200/90" role="status">
                {hint}
              </p>
            ) : null}
            {error ? (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              className="
    !w-full !py-2.5 !rounded-xl
    !bg-white/10
    !text-white
    !border !border-white/10
    backdrop-blur-xl

    hover:!bg-white/20
    hover:!border-white/20

    active:scale-[0.98]
    transition-all duration-200

    shadow-[0_6px_30px_rgba(0,0,0,0.35)]
  "
              disabled={loading}
            >
              {loading ? "Verifying…" : "Verify and create account"}
            </Button>
            <div className="flex flex-wrap gap-3 text-sm">
              <button
                type="button"
                className="text-emerald-300/95 underline decoration-emerald-500/50 underline-offset-2 hover:text-emerald-200"
                disabled={loading}
                onClick={() => {
                  setStep("form");
                  setOtp("");
                  setError("");
                  setHint("");
                }}
              >
                Edit details
              </button>
              <button
                type="button"
                className="text-emerald-300/95 underline decoration-emerald-500/50 underline-offset-2 hover:text-emerald-200"
                disabled={loading}
                onClick={resendOtp}
              >
                Resend code
              </button>
            </div>
          </form>
        )}
      </AuthShell>
    </div>
  );
}
