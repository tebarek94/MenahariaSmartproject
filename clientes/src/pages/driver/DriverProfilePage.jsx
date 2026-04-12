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

function mergeStoredUser(prev, apiUser) {
  if (!apiUser || typeof apiUser !== "object") return prev;
  return {
    ...prev,
    ...apiUser,
    role_name: prev?.role_name,
    role_id: apiUser.role_id ?? prev?.role_id,
  };
}

export function DriverProfilePage() {
  const auth = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const profileData = useAsync(() => profileService.getProfile());

  useEffect(() => {
    profileData.run().catch(() => {
      setError("Failed to load profile data");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const profileUser =
    profileData.data && typeof profileData.data === "object"
      ? { ...profileData.data, role_name: auth.user?.role_name }
      : auth.user;

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
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-white sm:text-xl lg:text-2xl">
          Driver profile
        </h2>
        <p className="text-sm text-primary-400/80">
          Update your name, phone, and email. Role and status are managed by an
          administrator.
        </p>
      </div>

      {success ? (
        <div className="rounded-lg border border-green-500/50 bg-green-900/20 p-3">
          <p className="text-sm text-green-400">{success}</p>
        </div>
      ) : null}

      <ProfileForm
        user={profileUser}
        onSave={handleSave}
        loading={loading}
        error={error}
        hideAccountDeletion
      />

      <TwoFactorProfileSection user={profileUser} onChanged={refreshSessionUser} />

      <Card title="Account" subtitle="Driver portal">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-2">
            <span className="text-primary-400/80">Driver ID</span>
            <span className="font-medium text-white">{auth.user?.id ?? "—"}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-primary-400/80">Role</span>
            <span className="font-medium text-primary-300">
              {auth.user?.role_name ?? "driver"}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-primary-400/80">Status</span>
            <span
              className={
                auth.user?.status === "active"
                  ? "font-medium text-green-400"
                  : "font-medium text-amber-400"
              }
            >
              {auth.user?.status ?? "active"}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
