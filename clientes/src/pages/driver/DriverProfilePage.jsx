import { useState, useEffect } from "react";
import { useAsync } from "@/hooks/useAsync.js";
import { useAuth } from "@/hooks/useAuth.js";
import { profileService } from "@/services/profile.service.js";
import { viewsService } from "@/services/views.service.js";
import { ProfileForm } from "@/components/ProfileForm.jsx";
import { TwoFactorProfileSection } from "@/components/profile/TwoFactorProfileSection.jsx";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { AUTH_LOCAL_SYNC_EVENT, STORAGE_KEYS } from "@/utils/constants.js";
import { cn } from "@/utils/cn.js";
import { formatDate } from "@/utils/format.js";

function profileRecord(data, authUser) {
  if (!data) return authUser;
  return data.user ?? data;
}

function mergeStoredUser(prev, apiUser) {
  if (!apiUser || typeof apiUser !== "object") return prev;
  return {
    ...prev,
    ...apiUser,
    role_name: prev?.role_name,
    role_id: apiUser.role_id ?? prev?.role_id,
  };
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

function pickFeaturedVehicle(dashboard) {
  if (!dashboard || typeof dashboard !== "object") return null;
  const trips = dashboard.trips_linked;
  if (Array.isArray(trips) && trips[0]) {
    const t = trips[0];
    return {
      plate: t.plate_number,
      model: t.vehicle_model,
      capacity: t.vehicle_capacity,
      caption: "From your latest trip",
    };
  }
  const vehicles = dashboard.vehicles_with_seat_counts;
  if (Array.isArray(vehicles) && vehicles[0]) {
    const v = vehicles[0];
    return {
      plate: v.plate_number,
      model: v.model,
      capacity: v.capacity,
      seats: v.seats_configured,
      caption: "Vehicles you have driven",
    };
  }
  return null;
}

function IconMail({ className }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  );
}

function IconPhone({ className }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function IconPencil({ className }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

/** Decorative coach / bus silhouette for the profile header */
function IconCoachHero({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect
        x="8"
        y="18"
        width="96"
        height="38"
        rx="6"
        className="fill-white/10 stroke-white/25"
        strokeWidth="1.5"
      />
      <rect x="16" y="26" width="22" height="14" rx="2" className="fill-white/15" />
      <rect x="42" y="26" width="22" height="14" rx="2" className="fill-white/15" />
      <rect x="68" y="26" width="22" height="14" rx="2" className="fill-white/15" />
      <circle cx="28" cy="62" r="7" className="fill-white/20 stroke-white/30" strokeWidth="1.5" />
      <circle cx="92" cy="62" r="7" className="fill-white/20 stroke-white/30" strokeWidth="1.5" />
      <path
        d="M8 36H4a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3h4"
        className="stroke-white/35"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function InfoTile({ label, children, className }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-primary-200/40 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-4 backdrop-blur-sm",
        "dark:border-white/10",
        className
      )}
    >
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-primary-400/80">
        {label}
      </p>
      <div className="mt-2 min-w-0 text-sm font-semibold leading-snug text-white">{children}</div>
    </div>
  );
}

function scrollToDriverEdit() {
  document.getElementById("driver-profile-edit")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

export function DriverProfilePage() {
  const auth = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const profileData = useAsync(() => profileService.getProfile());
  const driverView = useAsync(() => viewsService.driverDashboard());

  useEffect(() => {
    profileData.run().catch(() => {
      setError("Failed to load profile data");
    });
    driverView.run().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const profileUserRaw = profileRecord(profileData.data, auth.user);
  const profileUser =
    profileUserRaw && typeof profileUserRaw === "object"
      ? { ...profileUserRaw, role_name: auth.user?.role_name }
      : auth.user;

  const featuredVehicle = pickFeaturedVehicle(driverView.data);
  const vehicleCount = driverView.data?.summary?.counts?.vehicles ?? 0;

  const handleSave = async (data) => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await profileService.updateProfile(data);
      const fresh = await profileService.getProfile();
      const merged = mergeStoredUser(auth.user, fresh);
      try {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(merged));
        window.dispatchEvent(new Event(AUTH_LOCAL_SYNC_EVENT));
      } catch {
        // no-op
      }
      await profileData.run();
      setSuccess("Profile updated successfully.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const refreshSessionUser = async () => {
    const fresh = await profileService.getProfile();
    const merged = mergeStoredUser(auth.user, fresh);
    try {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(merged));
      window.dispatchEvent(new Event(AUTH_LOCAL_SYNC_EVENT));
    } catch {
      // no-op
    }
    await profileData.run();
  };

  if (profileData.loading && !profileData.data) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (profileData.error && !profileData.data) {
    return (
      <Card title="Profile" subtitle="Could not load profile">
        <p className="text-sm text-red-400">
          {profileData.error.message || "Request failed"}
        </p>
        <Button className="mt-4" variant="ghost" onClick={() => profileData.run()}>
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-lg font-bold text-white sm:text-xl lg:text-2xl">Driver profile</h1>
        <p className="text-sm text-primary-400/80">
          Your operator snapshot, vehicles you have driven, and editable contact details below.
        </p>
      </div>

      {success ? (
        <div className="rounded-lg border border-green-500/50 bg-green-900/20 p-3">
          <p className="text-sm text-green-400">{success}</p>
        </div>
      ) : null}

      {/* Hero — coach visual + edit */}
      <div className="relative">
        <div
          className="pointer-events-none absolute -inset-0.5 rounded-[1.125rem] bg-gradient-to-br from-amber-500/25 via-primary-500/20 to-emerald-600/20 opacity-90 blur-[2px]"
          aria-hidden
        />
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/90 shadow-2xl">
          <div className="relative h-40 overflow-hidden bg-gradient-to-br from-amber-600/90 via-primary-700 to-slate-950 sm:h-44">
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  "radial-gradient(ellipse 80% 60% at 100% 0%, rgba(255,255,255,0.25), transparent), radial-gradient(ellipse 55% 50% at 0% 100%, rgba(16,185,129,0.35), transparent)",
              }}
            />
            <div className="absolute -right-4 bottom-0 opacity-90 sm:right-6 sm:top-4">
              <IconCoachHero className="h-28 w-auto sm:h-32" />
            </div>
            <div className="absolute left-5 top-5 z-10 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                className="gap-2 border-white/20 bg-white/15 text-white shadow-md backdrop-blur hover:bg-white/25"
                onClick={scrollToDriverEdit}
                aria-label="Edit profile and security"
              >
                <IconPencil className="opacity-95" />
                Edit profile
              </Button>
            </div>
          </div>

          <div className="relative px-5 pb-7 pt-0 sm:px-8">
            <div className="-mt-[4.25rem] flex flex-col gap-5 sm:-mt-[4.5rem] sm:flex-row sm:items-end sm:justify-between">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
                <div
                  className={cn(
                    "flex h-[4.75rem] w-[4.75rem] shrink-0 items-center justify-center rounded-2xl text-2xl font-bold tracking-tight text-white shadow-xl",
                    "bg-gradient-to-br from-amber-500 via-primary-600 to-slate-900",
                    "ring-[5px] ring-slate-950"
                  )}
                  aria-hidden
                >
                  {accountInitials(profileUser?.full_name)}
                </div>
                <div className="min-w-0 space-y-2 pb-0.5 sm:pb-1">
                  <div className="flex flex-wrap items-center gap-2 gap-y-1">
                    <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                      {profileUser?.full_name?.trim() || "Driver"}
                    </h2>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider",
                        profileUser?.status === "active" || profileUser?.status == null
                          ? "bg-emerald-500/25 text-emerald-300 ring-1 ring-emerald-500/35"
                          : "bg-amber-500/25 text-amber-200 ring-1 ring-amber-500/35"
                      )}
                    >
                      {profileUser?.status === "inactive" ? "Inactive" : "Active"}
                    </span>
                  </div>
                  <p className="max-w-xl text-sm leading-relaxed text-primary-400/90">
                    {featuredVehicle?.caption ?? "Menahariya Smart driver portal"}
                  </p>
                  <div className="flex flex-col gap-1.5 text-sm text-primary-200/90 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-1">
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-primary-200">
                        <IconMail className="opacity-90" />
                      </span>
                      <span className="truncate font-medium text-white/95">
                        {profileUser?.email?.trim() || "No email on file"}
                      </span>
                    </span>
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-primary-200">
                        <IconPhone className="opacity-90" />
                      </span>
                      <span className="font-medium text-white/95">{profileUser?.phone || "—"}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-center shadow-inner">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-primary-400/80">
                  Role
                </p>
                <p className="mt-1 text-base font-bold text-primary-200">
                  {auth.user?.role_name ?? "driver"}
                </p>
              </div>
            </div>

            {/* Vehicle highlight */}
            <div className="mt-8 rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-950/40 to-slate-900/60 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-amber-200/80">
                    Vehicle
                  </p>
                  {featuredVehicle ? (
                    <p className="mt-1 text-lg font-semibold text-white">
                      <span className="font-mono text-amber-100">{featuredVehicle.plate || "—"}</span>
                      {featuredVehicle.model ? (
                        <span className="text-primary-200/90"> · {featuredVehicle.model}</span>
                      ) : null}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-primary-400/90">
                      No trips yet — your assigned coaches will show here after you run routes.
                    </p>
                  )}
                  {featuredVehicle?.capacity != null ? (
                    <p className="mt-1 text-xs text-primary-400/80">
                      Capacity {featuredVehicle.capacity} seats
                      {featuredVehicle.seats != null
                        ? ` · ${featuredVehicle.seats} seats configured`
                        : ""}
                    </p>
                  ) : null}
                </div>
                {vehicleCount > 0 ? (
                  <p className="text-sm text-primary-400/90">
                    <span className="font-semibold text-primary-200">{vehicleCount}</span> distinct
                    vehicle{vehicleCount === 1 ? "" : "s"} in your history
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <InfoTile label="Driver ID">
                <span className="font-mono text-base tabular-nums">{auth.user?.id ?? "—"}</span>
              </InfoTile>
              <InfoTile label="Member since">
                {profileUser?.created_at ? formatDate(profileUser.created_at) : "—"}
              </InfoTile>
              <InfoTile label="Last updated">
                {profileUser?.updated_at ? formatDate(profileUser.updated_at) : "—"}
              </InfoTile>
            </div>
          </div>
        </div>
      </div>

      <section className="space-y-3" id="driver-profile-edit" aria-labelledby="driver-profile-edit-heading">
        <div>
          <h2
            id="driver-profile-edit-heading"
            className="text-lg font-bold text-white sm:text-xl"
          >
            Edit profile & security
          </h2>
          <p className="mt-1 text-sm text-primary-400/80">
            Name, phone, email, and password. Role and account status are set by an administrator.
          </p>
        </div>

        <ProfileForm
          user={profileUser}
          onSave={handleSave}
          loading={loading}
          error={error}
          hideAccountDeletion
        />
      </section>

      <TwoFactorProfileSection user={profileUser} onChanged={refreshSessionUser} />
    </div>
  );
}
