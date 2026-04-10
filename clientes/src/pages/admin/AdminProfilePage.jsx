import { useState, useEffect } from "react";
import { useAsync } from "@/hooks/useAsync.js";
import { useAuth } from "@/hooks/useAuth.js";
import { profileService } from "@/services/profile.service.js";
import { ProfileForm } from "@/components/ProfileForm.jsx";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { AUTH_LOCAL_SYNC_EVENT, STORAGE_KEYS } from "@/utils/constants.js";

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
      if (err.message === 'User ID not found') {
        setError("Authentication error. Please login again.");
        // Redirect to login after a delay
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

  const handleDelete = async () => {
    setLoading(true);
    setError("");

    try {
      await profileService.deleteAccount();
      auth.logout();
      // Redirect to login after successful deletion
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
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">
          Admin Profile
        </h2>
        <p className="text-sm text-primary-400/80">
          Manage your administrator account settings
        </p>
      </div>

      {success && (
        <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-3">
          <p className="text-sm text-green-400">{success}</p>
        </div>
      )}

      <ProfileForm
        user={profileData.data?.user || auth.user}
        onSave={handleSave}
        onDelete={handleDelete}
        loading={loading}
        error={error}
      />

      {/* Admin-specific settings */}
      <Card title="Admin Settings" subtitle="Administrator-specific configurations">
        <div className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-primary-400/80">Admin ID</span>
                <span className="text-sm font-medium text-white">
                  {auth.user?.id || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-primary-400/80">Role</span>
                <span className="text-sm font-medium text-primary-300">
                  {auth.user?.role_name || 'Admin'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-primary-400/80">Account Status</span>
                <span className={`text-sm font-medium ${
                  auth.user?.status === 'active' ? 'text-green-400' : 'text-yellow-400'
                }`}>
                  {auth.user?.status || 'Active'}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-primary-400/80">Member Since</span>
                <span className="text-sm font-medium text-white">
                  {auth.user?.created_at ? 
                    new Date(auth.user.created_at).toLocaleDateString() : 
                    'Unknown'
                  }
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-primary-400/80">Last Updated</span>
                <span className="text-sm font-medium text-white">
                  {auth.user?.updated_at ? 
                    new Date(auth.user.updated_at).toLocaleDateString() : 
                    'Never'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
