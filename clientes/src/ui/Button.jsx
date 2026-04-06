import { cn } from "@/utils/cn.js";

const variants = {
  primary: "ui-btn-primary",
  secondary: "ui-btn-secondary",
  ghost: "ui-btn-ghost",
  danger: "ui-btn-danger",
};

export function Button({
  children,
  className,
  variant = "primary",
  type = "button",
  disabled,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium",
        "transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant] || variants.primary,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
