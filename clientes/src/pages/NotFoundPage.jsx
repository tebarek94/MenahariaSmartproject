import { Link } from "react-router-dom";
import { Button } from "@/ui/Button.jsx";
import { ROUTES } from "@/utils/constants.js";

export function NotFoundPage() {
  return (
    <div className="py-20 text-center">
      <p className="bg-gradient-to-br from-primary-500 to-secondary-500 bg-clip-text text-6xl font-bold text-transparent">
        404
      </p>
      <h1 className="mt-2 text-xl text-slate-300">Page not found</h1>
      <Link to={ROUTES.HOME} className="mt-6 inline-block">
        <Button variant="primary">Home</Button>
      </Link>
    </div>
  );
}
