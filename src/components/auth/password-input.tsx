"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  name?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  showLabel?: string;
  hideLabel?: string;
};

export function PasswordInput({
  id,
  name = "password",
  label,
  value,
  onChange,
  placeholder,
  autoComplete = "current-password",
  disabled,
  error,
  className,
  showLabel = "Show password",
  hideLabel = "Hide password",
}: Props) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={inputId} className="text-charcoal">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={inputId}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className="h-11 rounded-xl border-charcoal/15 bg-white pr-11 text-base md:text-sm"
        />
        <button
          type="button"
          tabIndex={0}
          disabled={disabled}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? hideLabel : showLabel}
          className="absolute top-1/2 right-2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-charcoal/55 transition hover:bg-soft hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          {visible ? (
            <EyeOff className="size-4" aria-hidden />
          ) : (
            <Eye className="size-4" aria-hidden />
          )}
        </button>
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
