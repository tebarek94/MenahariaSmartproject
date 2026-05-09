import { cn } from "@/utils/cn.js";

export function Spinner({ className }) {
  return (
    <div
      className={cn(
        "h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-primary-500",
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}
