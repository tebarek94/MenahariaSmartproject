import { useTheme } from "@/contexts/ThemeContext.jsx";
import { cn } from "@/utils/cn.js";

function SunIcon({ className }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon({ className }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3c0 0-1.21 5.79 2.42 9.42S21 12.79 21 12.79z" />
    </svg>
  );
}

export function ThemeToggle({ className = "", size = "md" }) {
  const { theme, isLight, isSystem, toggleTheme } = useTheme();

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={toggleTheme}
        className={cn(
          sizeClasses[size],
          "flex items-center justify-center rounded-lg border transition-all duration-200",
          isLight
            ? "border-primary-200 bg-white text-apptext hover:bg-primary-50"
            : "border-primary-700/50 bg-slate-900/50 text-slate-200 backdrop-blur-sm hover:bg-slate-800/80",
        )}
        title={`${isSystem ? "System · " : ""}${theme} — click to toggle`}
        aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      >
        {isLight ? (
          <MoonIcon className="h-[1.1rem] w-[1.1rem]" />
        ) : (
          <SunIcon className="h-[1.1rem] w-[1.1rem]" />
        )}
      </button>
      {isSystem ? (
        <span
          className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-primary-500 dark:border-slate-900"
          title="Following system theme"
          aria-hidden
        />
      ) : null}
    </div>
  );
}
