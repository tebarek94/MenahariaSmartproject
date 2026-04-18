import { useState, useEffect } from "react";
import { useAsync } from "@/hooks/useAsync.js";
import { useAuth } from "@/hooks/useAuth.js";
import { profileService } from "@/services/profile.service.js";
import { ProfileForm } from "@/components/ProfileForm.jsx";
import { TwoFactorProfileSection } from "@/components/profile/TwoFactorProfileSection.jsx";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { AUTH_LOCAL_SYNC_EVENT, STORAGE_KEYS } from "@/utils/constants.js";
import { cn } from "@/utils/cn.js";
import { formatDate } from "@/utils/format.js";

function IconMail({ className }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  );
}

function IconPhone({ className }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function InfoTile({ label, children, className }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-primary-200/70 bg-gradient-to-br from-white/95 to-slate-50/90 p-4 shadow-sm backdrop-blur-sm transition-colors",
        "dark:border-white/10 dark:from-slate-900/80 dark:to-slate-950/60 dark:shadow-none",
        className
      )}
    >
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <div className="mt-2 min-w-0 text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">
        {children}
      </div>
    </div>
  );
}

function accountInitials(fullName) {
  const s = String(fullName ?? "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return s.slice(0, 2).toUpperCase();
}

export function AdminProfilePage() {
  const auth = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const profileData = useAsync(() => profileService.getProfile());

  useEffect(() => {
    profileData.run().catch((err) => {
      console.error("Failed to load profile:", err);
      setError("Failed to load profile data");
    });
  }, []);

  const user = profileData.data?.user || profileData.data || auth.user;

  const handleSave = async (data) => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await profileService.updateProfile(data);

      const fresh = await profileService.getProfile();
      const merged = {
        ...auth.user,
        ...fresh,
        role_name: auth.user?.role_name,
        role_id: fresh?.role_id ?? auth.user?.role_id,
      };
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(merged));
      window.dispatchEvent(new Event(AUTH_LOCAL_SYNC_EVENT));

      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Profile update error:", err);
      if (err.message === "User ID not found") {
        setError("Authentication error. Please login again.");
        setTimeout(() => {
          auth.logout();
          window.location.href = "/admin/login";
        }, 2000);
      } else if (err.status === 404) {
        setError("Profile update endpoint not found. Please contact support.");
      } else if (err.status === 403) {
        setError("You don't have permission to update this profile.");
      } else {
        setError(err.message || "Failed to update profile");
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshSessionUser = async () => {
    const fresh = await profileService.getProfile();
    const merged = {
      ...auth.user,
      ...fresh,
      role_name: auth.user?.role_name,
      role_id: fresh?.role_id ?? auth.user?.role_id,
    };
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(merged));
    window.dispatchEvent(new Event(AUTH_LOCAL_SYNC_EVENT));
    await profileData.run();
  };

  const handleDelete = async () => {
    setLoading(true);
    setError("");

    try {
      await profileService.deleteAccount();
      auth.logout();
      window.location.href = "/admin/login";
    } catch (err) {
      setError(err.message || "Failed to delete account");
      setLoading(false);
    }
  };

  if (profileData.loading && !profileData.data) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (profileData.error) {
    return (
      <Card title="Profile Error" subtitle="Could not load profile data">
        <div className="space-y-4">
          <p className="text-sm text-red-400">
            {profileData.error.message || "Failed to load profile"}
          </p>
          <Button onClick={() => profileData.run()} variant="primary">
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-p-heading text-xl font-bold tracking-tight sm:text-2xl">
          Admin profile
        </h1>
        <p className="text-p-muted text-sm sm:text-[0.95rem]">
          Review your account details, then update your profile and security settings below.
        </p>
      </div>

      {success ? (
        <p
          className="rounded-lg border border-emerald-200/90 bg-emerald-50/95 px-3 py-2 text-sm text-emerald-900 shadow-sm dark:border-primary-800/50 dark:bg-primary-950/40 dark:text-primary-200 dark:shadow-none"
          role="status"
        >
          {success}
        </p>
      ) : null}

      {/* Account snapshot — hero card */}
      <div className="relative">
        <div
          className="pointer-events-none absolute -inset-0.5 rounded-[1.125rem] bg-gradient-to-br from-primary-400/35 via-emerald-500/20 to-primary-600/35 opacity-90 blur-[2px] dark:from-primary-500/25 dark:via-emerald-600/15 dark:to-slate-600/30 dark:opacity-70"
          aria-hidden
        />
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border border-primary-200/90 bg-white shadow-2xl",
            "dark:border-primary-800/50 dark:bg-slate-950/95 dark:shadow-[0_28px_56px_-16px_rgba(0,0,0,0.55)]"
          )}
        >
          <div className="relative h-36 overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-slate-900 sm:h-40">
            <div
              className="absolute inset-0 opacity-[0.35]"
              style={{
                backgroundImage:
                  "radial-gradient(ellipse 80% 60% at 100% 0%, rgba(255,255,255,0.35), transparent), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(16,185,129,0.35), transparent)",
              }}
            />
            <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-emerald-400/25 blur-3xl" />
            <div className="absolute -bottom-8 left-1/4 h-32 w-32 rounded-full bg-primary-300/30 blur-2xl" />
            <div className="absolute right-8 top-6 hidden h-16 w-16 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm sm:block" />
            <div className="absolute right-24 top-14 hidden h-10 w-10 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm sm:block" />
          </div>

          <div className="relative px-5 pb-7 pt-0 sm:px-8">
            <div className="-mt-[4.25rem] flex flex-col gap-5 sm:-mt-[4.5rem] sm:flex-row sm:items-end sm:justify-between">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
                <div
                  className={cn(
                    "flex h-[4.75rem] w-[4.75rem] shrink-0 items-center justify-center rounded-2xl text-2xl font-bold tracking-tight text-white shadow-xl",
                    "bg-gradient-to-br from-primary-500 via-primary-600 to-primary-800",
                    "ring-[5px] ring-white dark:ring-slate-950",
                    "dark:from-primary-600 dark:via-primary-700 dark:to-slate-900"
                  )}
                  aria-hidden
                >
                  {accountInitials(user?.full_name)}
                </div>
                <div className="min-w-0 space-y-2 pb-0.5 sm:pb-1">
                  <div className="flex flex-wrap items-center gap-2 gap-y-1">
                    <h2 className="text-p-heading text-xl font-bold tracking-tight sm:text-2xl">
                      {user?.full_name?.trim() || "Administrator"}
                    </h2>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider",
                        user?.status === "active" || user?.status == null
                          ? "bg-emerald-500/20 text-emerald-800 ring-1 ring-emerald-500/30 dark:text-emerald-300"
                          : "bg-amber-500/20 text-amber-900 ring-1 ring-amber-500/35 dark:text-amber-200"
                      )}
                    >
                      {user?.status === "inactive" ? "Inactive" : "Active"}
                    </span>
                  </div>
                  <p className="text-p-muted max-w-xl text-sm leading-relaxed">
                    Administrator account · read-only snapshot of how you appear in the system.
                  </p>
                  <div className="flex flex-col gap-1.5 text-sm text-slate-600 dark:text-slate-300 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-1">
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-100/90 text-primary-700 dark:bg-primary-950/80 dark:text-primary-300">
                        <IconMail className="opacity-90" />
                      </span>
                      <span className="truncate font-medium text-slate-800 dark:text-slate-100">
                        {user?.email?.trim() || "No email on file"}
                      </span>
                    </span>
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-100/90 text-primary-700 dark:bg-primary-950/80 dark:text-primary-300">
                        <IconPhone className="opacity-90" />
                      </span>
                      <span className="font-medium text-slate-800 dark:text-slate-100">
                        {user?.phone || "—"}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="shrink-0 rounded-xl border border-primary-200/80 bg-slate-50/90 px-4 py-3 text-center shadow-sm dark:border-white/10 dark:bg-slate-900/60">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Role
                </p>
                <p className="mt-1 text-base font-bold text-primary-700 dark:text-primary-300">
                  {user?.role_name || "Admin"}
                </p>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <InfoTile label="User ID">
                <span className="font-mono text-base tabular-nums">{user?.id ?? "—"}</span>
              </InfoTile>
              <InfoTile label="Member since">
                {user?.created_at ? formatDate(user.created_at) : "—"}
              </InfoTile>
              <InfoTile label="Last updated">
                {user?.updated_at ? formatDate(user.updated_at) : "—"}
              </InfoTile>
            </div>
          </div>
        </div>
      </div>

      {/* Editable sections — ProfileForm includes its own cards */}
      <section className="space-y-3" aria-labelledby="admin-profile-edit-heading">
        <div>
          <h2
            id="admin-profile-edit-heading"
            className="text-p-heading text-lg font-bold sm:text-xl"
          >
            Edit profile & security
          </h2>
          <p className="text-p-muted mt-1 text-sm">
            Contact details, password, and account deletion are in separate cards below.
          </p>
        </div>

        <ProfileForm
          user={user}
          onSave={handleSave}
          onDelete={handleDelete}
          loading={loading}
          error={error}
        />
      </section>

      <section className="space-y-3" aria-labelledby="admin-profile-2fa-heading">
        <h2
          id="admin-profile-2fa-heading"
          className="text-p-heading text-lg font-bold sm:text-xl"
        >
          Two-step verification
        </h2>
        <TwoFactorProfileSection user={user} onChanged={refreshSessionUser} />
      </section>
    </div>
  );
}
