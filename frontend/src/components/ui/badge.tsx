import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive/20 text-red-400 border-red-800',
        outline: 'text-foreground',
        success: 'border-transparent bg-green-500/20 text-green-400 border-green-800',
        warning: 'border-transparent bg-amber-500/20 text-amber-400 border-amber-800',
        blue: 'border-transparent bg-blue-500/20 text-blue-400 border-blue-800',
        gray: 'border-transparent bg-slate-500/20 text-slate-400 border-slate-700',
        orange: 'border-transparent bg-orange-500/20 text-orange-400 border-orange-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
