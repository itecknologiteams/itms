import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface BaseFieldProps {
  label: string;
  error?: string;
}

function FieldWrapper({ label, error, children }: BaseFieldProps & { children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium opacity-80">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

const controlClass =
  'w-full rounded-btn border border-black/10 bg-white/70 px-3 py-2 text-sm outline-none ' +
  'focus:border-primary focus:ring-1 focus:ring-primary dark:border-white/10 dark:bg-black/20';

export function TextField({
  label,
  error,
  className,
  ...rest
}: BaseFieldProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldWrapper label={label} error={error}>
      <input className={cn(controlClass, className)} {...rest} />
    </FieldWrapper>
  );
}

export function SelectField({
  label,
  error,
  className,
  children,
  ...rest
}: BaseFieldProps & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <FieldWrapper label={label} error={error}>
      <select className={cn(controlClass, className)} {...rest}>
        {children}
      </select>
    </FieldWrapper>
  );
}

export function TextAreaField({
  label,
  error,
  className,
  ...rest
}: BaseFieldProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldWrapper label={label} error={error}>
      <textarea className={cn(controlClass, className)} {...rest} />
    </FieldWrapper>
  );
}
