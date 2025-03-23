import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outline' | 'destructive';
  children: React.ReactNode;
}

const variantStyles = {
  default: 'bg-primary text-primary-foreground',
  outline: 'border border-input bg-background text-foreground',
  destructive: 'bg-red-500 text-white'
};

export function Badge({
  className = '',
  variant = 'default',
  children,
  ...props
}: BadgeProps) {
  const variantStyle = variantStyles[variant] || variantStyles.default;
  
  return (
    <div
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${variantStyle} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
} 