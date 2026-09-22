import { useId, type InputHTMLAttributes } from "react";
import { cn } from "../../lib/cn";
import { FieldFrame, controlClass, type FieldOwnProps } from "./field";

type InputProps = FieldOwnProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "required">;

export function Input({
  label,
  hideLabel,
  helperText,
  error,
  required,
  id,
  className,
  ...props
}: InputProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <FieldFrame
      label={label}
      hideLabel={hideLabel}
      helperText={helperText}
      error={error}
      required={required}
      fieldId={fieldId}
      className={className}
    >
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          aria-required={required || undefined}
          className={cn(controlClass)}
          {...props}
        />
      )}
    </FieldFrame>
  );
}
