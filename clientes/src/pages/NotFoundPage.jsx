import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth.js";
import { LandingLayout } from "@/components/layout/LandingLayout.jsx";
import { Button } from "@/ui/Button.jsx";
import { ROUTES } from "@/utils/constants.js";

function dashboardPath(auth) {
  if (auth.isAdmin) return ROUTES.DASHBOARD;
  if (auth.isDriver) return ROUTES.DRIVER_DASHBOARD;
  if (auth.isPassenger) return ROUTES.PASSENGER_DASHBOARD;
  return null;
}

export function NotFoundPage() {
  const auth = useAuth();
  const dash = dashboardPath(auth);

  useEffect(() => {
    document.title = "Page not found · Menahariya Smart";
  }, []);

  return (
    <LandingLayout>
      <div className="mx-auto max-w-lg px-4 py-20 text-center sm:py-28">
        <p
          className="bg-gradient-to-br from-emerald-400 to-teal-500 bg-clip-text text-7xl font-bold tracking-tight text-transparent sm:text-8xl"
          aria-hidden
        >
          404
        </p>
        <h1 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">
          Page not found
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400 sm:text-base">
          This URL does not match any page in the app. Check the address for typos, or use one of
          the links below.
        </p>

        <nav
          className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:justify-center"
          aria-label="Helpful links"
        >
          {dash ? (
            <Link to={dash} className="sm:flex-1 sm:max-w-[200px]">
              <Button variant="primary" className="w-full py-2.5">
                My dashboard
              </Button>
            </Link>
          ) : null}
          <Link to="/" className="sm:flex-1 sm:max-w-[200px]">
            <Button variant="secondary" className="w-full py-2.5">
              Public home
            </Button>
          </Link>
          {!auth.isAuthenticated ? (
            <>
              <Link to={ROUTES.LOGIN} className="sm:flex-1 sm:max-w-[200px]">
                <Button variant="ghost" className="w-full border border-white/15 py-2.5">
                  Passenger sign in
                </Button>
              </Link>
              <Link to={ROUTES.ADMIN_LOGIN} className="sm:flex-1 sm:max-w-[200px]">
                <Button variant="ghost" className="w-full border border-white/15 py-2.5">
                  Admin sign in
                </Button>
              </Link>
              <Link to={ROUTES.DRIVER_LOGIN} className="sm:flex-1 sm:max-w-[200px]">
                <Button variant="ghost" className="w-full border border-white/15 py-2.5">
                  Driver sign in
                </Button>
              </Link>
            </>
          ) : null}
        </nav>
      </div>
    </LandingLayout>
  );
}
