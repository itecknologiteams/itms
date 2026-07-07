import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:brightness-110',
  secondary: 'glass-overlay hover:brightness-105',
  ghost: 'bg-transparent hover:bg-black/5 dark:hover:bg-white/10',
  danger: 'bg-danger text-white hover:brightness-110',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', className, ...rest }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-btn px-4 py-2 text-sm font-medium',
        'transition-[transform,filter] duration-press active:scale-[0.97]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT_CLASSES[variant],
        className,
      )}
      {...rest}
    />
  ),
);
Button.displayName = 'Button';
