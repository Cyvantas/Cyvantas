import { useId, type SelectHTMLAttributes } from "react";
import { cn } from "../../lib/cn";
import { FieldFrame, controlClass, type FieldOwnProps } from "./field";

export interface SelectOption {
  label: string;
  value: string;
}

type SelectProps = FieldOwnProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "required"> & {
    options: SelectOption[];
    placeholder?: string;
  };

export function Select({
  label,
  hideLabel,
  helperText,
  error,
  required,
  id,
  className,
  options,
  placeholder,
  ...props
}: SelectProps) {
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
        <select
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          aria-required={required || undefined}
          className={cn(controlClass, "cursor-pointer appearance-none pr-9")}
          {...props}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}
    </FieldFrame>
  );
}
