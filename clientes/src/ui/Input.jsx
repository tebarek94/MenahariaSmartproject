import { cn } from "@/utils/cn.js";

export function Input({ label, id, className, error, ...props }) {
  const inputId = id || props.name;
  return (
    <div className="w-full space-y-1.5">
      {label ? (
        <label
          htmlFor={inputId}
          className="ui-label block"
        >
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={cn(
          "ui-field",
          error && "ui-field-error",
          className
        )}
        {...props}
      />
      {error ? (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
