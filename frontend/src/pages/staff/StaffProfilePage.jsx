import { useEffect, useState } from "react";
import { useAsync } from "@/hooks/useAsync.js";
import { useAuth } from "@/hooks/useAuth.js";
import { profileService } from "@/services/profile.service.js";
import { ProfileForm } from "@/components/ProfileForm.jsx";
import { TwoFactorProfileSection } from "@/components/profile/TwoFactorProfileSection.jsx";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { AUTH_LOCAL_SYNC_EVENT, STORAGE_KEYS } from "@/utils/constants.js";

function profileRecord(asyncData, authUser) {
  if (!asyncData) return authUser;
  return asyncData.user ?? asyncData;
}

export function StaffProfilePage() {
  const auth = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const profileData = useAsync(() => profileService.getProfile());

  useEffect(() => {
    profileData.run().catch(() => setError("Failed to load profile data"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const body = fresh?.user ?? fresh;
    const merged = {
      ...auth.user,
      ...body,
      role_name: auth.user?.role_name,
      role_id: body?.role_id ?? auth.user?.role_id,
    };
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(merged));
    window.dispatchEvent(new Event(AUTH_LOCAL_SYNC_EVENT));
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

  const user = profileRecord(profileData.data, auth.user);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-p-heading text-xl font-bold tracking-tight sm:text-2xl">
          Staff profile
        </h1>
        <p className="text-p-muted text-sm sm:text-[0.95rem]">
          Update your contact information and account security settings.
        </p>
      </div>

      {success ? (
        <p className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-300">
          {success}
        </p>
      ) : null}

      <ProfileForm
        user={user}
        onSave={handleSave}
        loading={loading}
        error={error}
        hideAccountDeletion
      />

      <TwoFactorProfileSection user={user} onChanged={refreshSessionUser} />
    </div>
  );
}
