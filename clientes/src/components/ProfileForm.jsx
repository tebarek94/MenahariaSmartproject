import { useState } from "react";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { DeleteModal } from "@/components/DeleteModal.jsx";
import {
  ETHIOPIAN_PHONE_ERROR,
  formatEthiopianPhoneForInput,
  isValidEthiopianPhone,
  normalizeEthiopianPhone,
} from "@/utils/ethiopianPhone.js";

export function ProfileForm({
  user,
  onSave,
  onDelete = () => {},
  loading,
  error,
  hideAccountDeletion = false,
}) {
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState({
    full_name: user?.full_name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError("");
    const dataToSubmit = {
      full_name: formData.full_name,
      email: formData.email,
      phone: normalizeEthiopianPhone(formData.phone),
    };

    // Only include password fields if they're filled
    if (formData.current_password && formData.new_password) {
      if (formData.new_password !== formData.confirm_password) {
        setFormError("New passwords do not match!");
        return;
      }
      dataToSubmit.password = formData.new_password;
    }

    // Validate required fields
    if (!dataToSubmit.full_name || !dataToSubmit.phone) {
      setFormError("Full name and phone number are required!");
      return;
    }
    if (!isValidEthiopianPhone(dataToSubmit.phone)) {
      setFormError(ETHIOPIAN_PHONE_ERROR);
      return;
    }

    onSave(dataToSubmit);
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    setShowDeleteModal(false);
    onDelete();
  };

  const handleCloseModal = () => {
    if (!loading) {
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Information */}
      <Card title="Profile Information" subtitle="Update your personal details">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-primary-400/80 mb-2">
                Full Name
              </label>
              <Input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-primary-400/80 mb-2">
                Phone Number
              </label>
              <Input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    phone: formatEthiopianPhoneForInput(e.target.value),
                  })
                }
                placeholder="0912345678"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-primary-400/80 mb-2">
                Email Address
              </label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
              />
            </div>
          </div>

          {(formError || error) && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3">
              <p className="text-sm text-red-400">{formError || error}</p>
            </div>
          )}

          <div className="flex gap-4">
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="px-6"
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Card>

      {/* Password Change */}
      <Card 
        title="Change Password" 
        subtitle="Update your password"
        className="!p-6"
      >
        <div className="space-y-4">
          {!showPasswordSection ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowPasswordSection(true)}
            >
              Change Password
            </Button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary-400/80 mb-2">
                  Current Password
                </label>
                <Input
                  type="password"
                  name="current_password"
                  value={formData.current_password}
                  onChange={handleChange}
                  placeholder="Enter current password"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-primary-400/80 mb-2">
                  New Password
                </label>
                <Input
                  type="password"
                  name="new_password"
                  value={formData.new_password}
                  onChange={handleChange}
                  placeholder="Enter new password"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-primary-400/80 mb-2">
                  Confirm New Password
                </label>
                <Input
                  type="password"
                  name="confirm_password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  placeholder="Confirm new password"
                />
              </div>
              
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? "Updating..." : "Update Password"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowPasswordSection(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {!hideAccountDeletion && (
        <>
          <Card
            title="Danger Zone"
            subtitle="Irreversible account actions"
            className="!p-6 border-red-500/30"
          >
            <div className="space-y-4">
              <p className="text-sm text-red-400">
                Once you delete your account, there is no going back. Please be
                certain.
              </p>
              <Button
                type="button"
                variant="danger"
                onClick={handleDelete}
                disabled={loading}
                className="px-6"
              >
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete Account
              </Button>
            </div>
          </Card>

          <DeleteModal
            isOpen={showDeleteModal}
            onClose={handleCloseModal}
            onConfirm={handleConfirmDelete}
            title="Delete Your Account"
            message="Are you absolutely sure you want to delete your account? This action cannot be undone and will permanently remove all your data."
            itemName="Account"
            loading={loading}
          />
        </>
      )}
    </div>
  );
}
