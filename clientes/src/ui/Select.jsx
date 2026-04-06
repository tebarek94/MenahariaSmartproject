import { cn } from "@/utils/cn.js";

export function Select({ label, id, className, children, ...props }) {
  const sid = id || props.name;
  return (
    <div className="w-full space-y-1.5">
      {label ? (
        <label
          htmlFor={sid}
          className="ui-label block"
        >
          {label}
        </label>
      ) : null}
      <select
        id={sid}
        className={cn(
          "ui-field",
          className
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
