import { useState } from "react";
import { profileService } from "@/services/profile.service.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { PasswordFieldWithToggle } from "@/components/auth/PasswordFieldWithToggle.jsx";

/**
 * Email-based two-step verification: enable (password → code by email) or disable (same).
 */
export function TwoFactorProfileSection({ user, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [phase, setPhase] = useState("idle");
  const [enablePassword, setEnablePassword] = useState("");
  const [enableCode, setEnableCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");

  const enabled = Boolean(user?.two_factor_enabled);

  function resetMessages() {
    setErr("");
    setOk("");
  }

  async function submitEnablePassword(e) {
    e.preventDefault();
    resetMessages();
    if (!enablePassword) {
      setErr("Enter your password.");
      return;
    }
    setBusy(true);
    try {
      const data = await profileService.twoFactorRequestEnable(enablePassword);
      setOk(data?.message || "Check your email for the code.");
      setPhase("enable-code");
      setEnableCode("");
    } catch (e) {
      setErr(e?.message || "Could not send the email.");
    } finally {
      setBusy(false);
    }
  }

  async function submitEnableCode(e) {
    e.preventDefault();
    resetMessages();
    const digits = enableCode.replace(/\D/g, "");
    if (digits.length !== 6) {
      setErr("Enter the 6-digit code from your email.");
      return;
    }
    setBusy(true);
    try {
      await profileService.twoFactorEnable(digits);
      setOk("Two-step verification is on.");
      setPhase("idle");
      setEnablePassword("");
      setEnableCode("");
      await onChanged?.();
    } catch (e) {
      setErr(e?.message || "Could not enable two-step verification.");
    } finally {
      setBusy(false);
    }
  }

  async function submitDisablePassword(e) {
    e.preventDefault();
    resetMessages();
    if (!disablePassword) {
      setErr("Enter your password.");
      return;
    }
    setBusy(true);
    try {
      const data = await profileService.twoFactorRequestDisable(disablePassword);
      setOk(data?.message || "Check your email for the code.");
      setPhase("disable-code");
      setDisableCode("");
    } catch (e) {
      setErr(e?.message || "Could not send the email.");
    } finally {
      setBusy(false);
    }
  }

  async function submitDisableCode(e) {
    e.preventDefault();
    resetMessages();
    const digits = disableCode.replace(/\D/g, "");
    if (digits.length !== 6) {
      setErr("Enter the 6-digit code from your email.");
      return;
    }
    setBusy(true);
    try {
      await profileService.twoFactorDisable(digits);
      setOk("Two-step verification is off.");
      setPhase("idle");
      setDisablePassword("");
      setDisableCode("");
      await onChanged?.();
    } catch (e) {
      setErr(e?.message || "Could not turn off two-step verification.");
    } finally {
      setBusy(false);
    }
  }

  function cancelEnable() {
    setPhase("idle");
    setEnablePassword("");
    setEnableCode("");
    setOk("");
    resetMessages();
  }

  function cancelDisable() {
    setPhase("idle");
    setDisablePassword("");
    setDisableCode("");
    setOk("");
    resetMessages();
  }

  return (
    <Card
      title="Two-step verification"
      subtitle="We email a one-time code to your registered address when you sign in (and to turn this on or off)."
    >
      <div className="space-y-4">
        {ok ? (
          <p className="text-sm text-emerald-400" role="status">
            {ok}
          </p>
        ) : null}
        {err ? (
          <p className="text-sm text-red-400" role="alert">
            {err}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-primary-400/90">
            Status:{" "}
            <strong className={enabled ? "text-emerald-400" : "text-slate-300"}>
              {enabled ? "On" : "Off"}
            </strong>
          </span>
        </div>

        {!enabled && phase === "idle" ? (
          <div className="space-y-2">
            <p className="text-sm text-primary-400/80">
              You need a valid email on this profile. Enter your password and we will send a
              code to that email to confirm.
            </p>
            <Button
              type="button"
              variant="primary"
              disabled={busy}
              onClick={() => {
                resetMessages();
                setOk("");
                setPhase("enable-password");
                setEnablePassword("");
              }}
            >
              Turn on two-step verification
            </Button>
          </div>
        ) : null}

        {!enabled && phase === "enable-password" ? (
          <form onSubmit={submitEnablePassword} className="space-y-4">
            <PasswordFieldWithToggle
              label="Password"
              name="twofa-enable-password"
              value={enablePassword}
              onChange={(e) => setEnablePassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="primary" disabled={busy}>
                {busy ? "Sending…" : "Send code to email"}
              </Button>
              <Button type="button" variant="ghost" disabled={busy} onClick={cancelEnable}>
                Cancel
              </Button>
            </div>
          </form>
        ) : null}

        {!enabled && phase === "enable-code" ? (
          <form onSubmit={submitEnableCode} className="space-y-4">
            <Input
              label="6-digit code from email"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={enableCode}
              onChange={(e) => setEnableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              required
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="primary" disabled={busy}>
                {busy ? "Confirming…" : "Confirm and enable"}
              </Button>
              <Button type="button" variant="ghost" disabled={busy} onClick={cancelEnable}>
                Cancel
              </Button>
            </div>
          </form>
        ) : null}

        {enabled && phase === "idle" ? (
          <div className="space-y-2">
            <p className="text-sm text-primary-400/80">
              Each sign-in sends a code to your email after your password.
            </p>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                resetMessages();
                setOk("");
                setPhase("disable-password");
                setDisablePassword("");
              }}
            >
              Turn off two-step verification
            </Button>
          </div>
        ) : null}

        {enabled && phase === "disable-password" ? (
          <form onSubmit={submitDisablePassword} className="space-y-4">
            <p className="text-sm text-primary-400/80">
              Enter your password. We will email a code to confirm turning this off.
            </p>
            <PasswordFieldWithToggle
              label="Password"
              name="twofa-disable-password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="primary" disabled={busy}>
                {busy ? "Sending…" : "Send code to email"}
              </Button>
              <Button type="button" variant="ghost" disabled={busy} onClick={cancelDisable}>
                Cancel
              </Button>
            </div>
          </form>
        ) : null}

        {enabled && phase === "disable-code" ? (
          <form onSubmit={submitDisableCode} className="space-y-4">
            <Input
              label="6-digit code from email"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              required
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="primary" disabled={busy}>
                {busy ? "Turning off…" : "Turn off"}
              </Button>
              <Button type="button" variant="ghost" disabled={busy} onClick={cancelDisable}>
                Cancel
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    </Card>
  );
}
