// src/components/ui/Badge.tsx
import React, { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'accent1' | 'accent2' | 'accent3' | 'accent4';
  size?: 'sm' | 'md' | 'lg';
  rounded?: 'full' | 'md';
  outline?: boolean;
  icon?: ReactNode;
  className?: string;
  onClick?: () => void;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  rounded = 'full',
  outline = false,
  icon,
  className = '',
  onClick,
}) => {
  // Définir les classes de variante
  const getVariantClasses = (variant: string, outline: boolean) => {
    if (outline) {
      switch (variant) {
        case 'primary':
          return 'bg-primary-400 bg-opacity-10 text-primary-900 border border-primary-600';
        case 'secondary':
          return 'bg-secondary-400 bg-opacity-10 text-secondary-900 border border-secondary-600';
        case 'success':
          return 'bg-success-400 bg-opacity-10 text-success-900 border border-success-600';
        case 'danger':
          return 'bg-danger-400 bg-opacity-10 text-danger-900 border border-danger-600';
        case 'warning':
          return 'bg-warning-400 bg-opacity-10 text-warning-900 border border-warning-600';
        case 'info':
          return 'bg-primary-400 bg-opacity-10 text-primary-900 border border-primary-600';
        case 'accent1':
          return 'bg-accent1-light bg-opacity-10 text-accent1-DEFAULT border border-accent1-DEFAULT';
        case 'accent2':
          return 'bg-accent2-light bg-opacity-10 text-accent2-DEFAULT border border-accent2-DEFAULT';
        case 'accent3':
          return 'bg-accent3-light bg-opacity-10 text-accent3-DEFAULT border border-accent3-DEFAULT';
        case 'accent4':
          return 'bg-accent4-light bg-opacity-10 text-accent4-DEFAULT border border-accent4-DEFAULT';
        default:
          return 'bg-gray-100 text-gray-800 border border-gray-300';
      }
    } else {
      switch (variant) {
        case 'primary':
          return 'bg-primary-100 text-primary-800';
        case 'secondary':
          return 'bg-secondary-100 text-secondary-800';
        case 'success':
          return 'bg-success-100 text-success-800';
        case 'danger':
          return 'bg-danger-100 text-danger-800';
        case 'warning':
          return 'bg-warning-100 text-warning-800';
        case 'info':
          return 'bg-blue-100 text-blue-800';
        case 'accent1':
          return 'bg-accent1-light text-accent1-DEFAULT';
        case 'accent2':
          return 'bg-accent2-light text-accent2-DEFAULT';
        case 'accent3':
          return 'bg-accent3-light text-accent3-DEFAULT';
        case 'accent4':
          return 'bg-accent4-light text-accent4-DEFAULT';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    }
  };

  // Définir les classes de taille
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-base',
  };

  // Définir les classes de bordure arrondie
  const roundedClasses = {
    full: 'rounded-full',
    md: 'rounded-md',
  };

  // Assembler toutes les classes
  const badgeClasses = [
    'inline-flex items-center font-medium',
    getVariantClasses(variant, outline),
    sizeClasses[size],
    roundedClasses[rounded],
    onClick ? 'cursor-pointer hover:opacity-80' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <span
      className={badgeClasses}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      {icon && <span className="mr-1">{icon}</span>}
      {children}
    </span>
  );
};

export default Badge;