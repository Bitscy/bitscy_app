import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Button primitive.
 *
 * Variants:
 *   - primary: terracotta, for the main action on a screen
 *   - secondary: outlined, for less important actions
 *   - ghost: text only, for tertiary actions
 *
 * Sizes are mobile-first — `md` is the default and meets the 44x44 touch target.
 */

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-600 disabled:bg-primary/50',
  secondary:
    'border border-primary/30 bg-surface text-text hover:bg-primary/5 disabled:opacity-50',
  ghost: 'text-text hover:bg-primary/5 disabled:opacity-50',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'min-h-touch px-4 text-base',
  lg: 'min-h-12 px-6 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        'focus:outline-hidden focus:ring-2 focus:ring-primary focus:ring-offset-2',
        'disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading ? 'Loading…' : children}
    </button>
  );
});
