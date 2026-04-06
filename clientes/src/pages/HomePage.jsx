import { Link } from "react-router-dom";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { ROUTES } from "@/utils/constants.js";

export function HomePage({ isAuthenticated, isAdmin }) {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
          Transport & cargo,{" "}
          <span className="text-primary-400">one dashboard</span>
        </h1>
        <p className="max-w-2xl text-slate-400">
          Frontend scaffold: <code className="text-primary-400">utils</code>,{" "}
          <code className="text-secondary-300">hooks</code>,{" "}
          <code className="text-primary-400">services</code>,{" "}
          <code className="text-secondary-300">components</code>,{" "}
          <code className="text-primary-400">ui</code>,{" "}
          <code className="text-secondary-300">pages</code>.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Stack" subtitle="Configured for your Express API">
          <ul className="list-inside list-disc space-y-2 text-sm text-slate-300">
            <li>React 18 + React Router 6</li>
            <li>Tailwind CSS 3</li>
            <li>Vite dev proxy → <code className="text-slate-400">/api</code></li>
          </ul>
        </Card>
        <Card title="Next steps">
          <p className="text-sm text-slate-400">
            Run backend on port 5000, then{" "}
            <code className="text-secondary-400">npm run dev</code> here.
            Use services + hooks for tickets, trips, cargo screens.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {!isAuthenticated ? (
              <>
                <Link to={ROUTES.ADMIN_LOGIN}>
                  <Button>Admin sign in</Button>
                </Link>
                <Link to={ROUTES.ADMIN_REGISTER}>
                  <Button variant="secondary">Register admin</Button>
                </Link>
              </>
            ) : isAdmin ? (
              <Link to={ROUTES.DASHBOARD}>
                <Button>Open dashboard</Button>
              </Link>
            ) : (
              <p className="text-sm text-secondary-300/90">
                You are signed in without an admin role. Log out from the header,
                then use Admin sign in with an administrator account.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
