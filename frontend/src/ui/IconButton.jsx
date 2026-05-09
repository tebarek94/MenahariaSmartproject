import { cn } from "@/utils/cn.js";

const variants = {
  ghost: "ui-iconbtn-ghost",
  primary: "ui-iconbtn-primary",
  secondary: "ui-iconbtn-primary",
  success: "ui-iconbtn-primary",
  danger: "ui-iconbtn-danger",
};

export function IconButton({
  label,
  className,
  variant = "ghost",
  type = "button",
  children,
  ...props
}) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant] || variants.ghost,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
