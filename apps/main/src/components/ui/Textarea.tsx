import { useId, type TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/cn";
import { FieldFrame, controlClass, type FieldOwnProps } from "./field";

type TextareaProps = FieldOwnProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id" | "required">;

export function Textarea({
  label,
  hideLabel,
  helperText,
  error,
  required,
  id,
  className,
  rows = 4,
  ...props
}: TextareaProps) {
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
        <textarea
          id={id}
          rows={rows}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          aria-required={required || undefined}
          className={cn(controlClass, "resize-y")}
          {...props}
        />
      )}
    </FieldFrame>
  );
}
