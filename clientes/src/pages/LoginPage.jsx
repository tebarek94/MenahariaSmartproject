import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAsync } from "@/hooks/useAsync.js";
import { useAuth } from "@/hooks/useAuth.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { ROUTES } from "@/utils/constants.js";
import {
  isAdminRole,
  isDriverRole,
  isPassengerRole,
} from "@/utils/roles.js";

function postLoginPath(roleName) {
  if (isAdminRole(roleName)) return ROUTES.DASHBOARD;
  if (isDriverRole(roleName)) return ROUTES.DRIVER_DASHBOARD;
  if (isPassengerRole(roleName)) return ROUTES.PASSENGER_DASHBOARD;
  return ROUTES.PASSENGER_DASHBOARD;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const justRegistered = location.state?.registered === true;
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const login = useAsync(async () => {
    const data = await auth.login(phone, password);
    const dest = postLoginPath(data?.role_name);
    navigate(dest, { replace: true });
    return data;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login.run();
    } catch (error) {
      // Error will be displayed in UI
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <Card title="Welcome Back" subtitle="Login to access your account">
          {justRegistered ? (
            <p className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
              Account created. Sign in with your phone and password.
            </p>
          ) : null}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="phone"
                className="mb-1 block text-sm font-medium text-primary-400/80"
              >
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-primary-900/25 bg-slate-800/50 px-3 py-2 text-white placeholder-primary-400/50 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="09xxxxxxxx"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-primary-400/80"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-primary-900/25 bg-slate-800/50 px-3 py-2 text-white placeholder-primary-400/50 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter your password"
                required
              />
            </div>

            {login.error && (
              <div className="rounded-lg border border-red-500/50 bg-red-900/20 p-3">
                <p className="text-sm text-red-400">
                  {login.error.message ||
                    "Login failed. Please check your credentials."}
                </p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={login.loading}
              variant="primary"
            >
              {login.loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 space-y-2 text-center">
            <p className="text-sm text-primary-400/80">
              Menahariya Smart Transport System
            </p>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-primary-400/60">
              <button
                type="button"
                onClick={() => navigate(ROUTES.PASSENGER_REGISTER)}
                className="transition-colors hover:text-primary-400/80"
              >
                Register
              </button>
              <span className="hidden sm:inline">·</span>
              <button
                type="button"
                onClick={() => navigate("/admin/login")}
                className="transition-colors hover:text-primary-400/80"
              >
                Admin Login
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => navigate(ROUTES.DRIVER_LOGIN)}
                className="transition-colors hover:text-primary-400/80"
              >
                Driver Login
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="transition-colors hover:text-primary-400/80"
              >
                Home
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
