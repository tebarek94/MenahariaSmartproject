import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAsync } from "@/hooks/useAsync.js";
import { useAuth } from "@/hooks/useAuth.js";
import { profileService } from "@/services/profile.service.js";
import { ProfileForm } from "@/components/ProfileForm.jsx";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { AUTH_LOCAL_SYNC_EVENT, ROUTES, STORAGE_KEYS } from "@/utils/constants.js";

function profileRecord(asyncData, authUser) {
  if (!asyncData) return authUser;
  return asyncData.user ?? asyncData;
}

export function PassengerProfilePage() {
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

  const handleSave = async (data) => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await profileService.updateProfile(data);

      const fresh = await profileService.getProfile();
      const body = fresh?.user ?? fresh;
      const merged = {
        ...auth.user,
        ...body,
        role_name: auth.user?.role_name,
        role_id: body?.role_id ?? auth.user?.role_id,
      };
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(merged));
      window.dispatchEvent(new Event(AUTH_LOCAL_SYNC_EVENT));

      setSuccess("Profile updated successfully.");
      setTimeout(() => setSuccess(""), 4000);
      await profileData.run();
    } catch (err) {
      console.error("Profile update error:", err);
      if (err.message === "User ID not found") {
        setError("Session expired. Please sign in again.");
        setTimeout(() => {
          auth.logout();
          window.location.href = "/login";
        }, 2000);
      } else if (err.status === 403) {
        setError("You cannot update this profile.");
      } else {
        setError(err?.data?.message || err.message || "Failed to update profile");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError("");

    try {
      await profileService.deleteAccount();
      auth.logout();
      window.location.href = "/";
    } catch (err) {
      setError(err?.data?.message || err.message || "Failed to delete account");
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

  if (profileData.error && !profileData.data) {
    return (
      <Card title="Profile" subtitle="Could not load your account">
        <div className="space-y-4">
          <p className="text-sm text-red-400">
            {profileData.error?.message || "Failed to load profile"}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => profileData.run()} variant="primary">
              Retry
            </Button>
            <Link to={ROUTES.PASSENGER_DASHBOARD}>
              <Button variant="ghost" type="button">
                Back to dashboard
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  const user = profileRecord(profileData.data, auth.user);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-p-heading text-lg font-bold sm:text-xl lg:text-2xl">
            My profile
          </h2>
          <p className="text-p-muted">
            View and update your name, contact details, password, or delete your account.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={ROUTES.PASSENGER_DASHBOARD}>
            <Button variant="ghost" className="!text-xs" type="button">
              ← Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {success ? (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-3 py-2">
          <p className="text-sm text-emerald-300">{success}</p>
        </div>
      ) : null}

      <ProfileForm
        user={user}
        onSave={handleSave}
        onDelete={handleDelete}
        loading={loading}
        error={error}
      />

      <Card title="Account" subtitle="Read-only summary">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-2 border-b border-white/5 py-2 sm:border-0">
            <span className="text-slate-500">User ID</span>
            <span className="font-medium text-slate-200">{user?.id ?? "—"}</span>
          </div>
          <div className="flex justify-between gap-2 border-b border-white/5 py-2 sm:border-0">
            <span className="text-slate-500">Role</span>
            <span className="font-medium capitalize text-slate-200">
              {auth.user?.role_name ?? "passenger"}
            </span>
          </div>
          <div className="flex justify-between gap-2 border-b border-white/5 py-2 sm:border-0">
            <span className="text-slate-500">Status</span>
            <span className="font-medium capitalize text-slate-200">
              {user?.status ?? "—"}
            </span>
          </div>
          <div className="flex justify-between gap-2 py-2">
            <span className="text-slate-500">Member since</span>
            <span className="font-medium text-slate-200">
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString()
                : "—"}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
