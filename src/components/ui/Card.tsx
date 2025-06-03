// src/components/ui/Card.tsx
import React, { ReactNode } from 'react';

interface CardProps {
  title?: string | ReactNode;
  subtitle?: string;
  icon?: ReactNode;
  footer?: ReactNode;
  headerAction?: ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'accent1' | 'accent2' | 'accent3' | 'accent4';
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
  bordered?: boolean;
  hoverable?: boolean;
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  children: ReactNode;
}

const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  icon,
  footer,
  headerAction,
  variant = 'default',
  className = '',
  bodyClassName = '',
  headerClassName = '',
  footerClassName = '',
  bordered = true,
  hoverable = false,
  shadow = 'md',
  children,
}) => {
  // Définir les classes de shadow
  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-card',
    lg: 'shadow-card-hover',
  };

  // Définir les classes de variante
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return {
          header: 'bg-primary-500 text-white',
          border: 'border-primary-100',
        };
      case 'secondary':
        return {
          header: 'bg-secondary-500 text-white',
          border: 'border-secondary-100',
        };
      case 'accent1':
        return {
          header: 'bg-accent1-DEFAULT text-white',
          border: 'border-accent1-light',
        };
      case 'accent2':
        return {
          header: 'bg-accent2-DEFAULT text-white',
          border: 'border-accent2-light',
        };
      case 'accent3':
        return {
          header: 'bg-accent3-DEFAULT text-white',
          border: 'border-accent3-light',
        };
      case 'accent4':
        return {
          header: 'bg-accent4-DEFAULT text-white',
          border: 'border-accent4-light',
        };
      default:
        return {
          header: 'bg-white text-gray-800 border-b',
          border: 'border-gray-200',
        };
    }
  };

  const variantClasses = getVariantClasses();

  // Construire les classes pour la carte
  const cardClasses = [
    'bg-white',
    'rounded-lg',
    'overflow-hidden',
    bordered ? `border ${variantClasses.border}` : '',
    shadowClasses[shadow],
    hoverable ? 'transition-transform hover:transform hover:scale-105 hover:shadow-card-hover' : '',
    className,
  ].filter(Boolean).join(' ');

  // Vérifier si un header est nécessaire
  const hasHeader = title || subtitle || icon || headerAction;

  return (
    <div className={cardClasses}>
      {hasHeader && (
        <div className={`px-4 py-3 flex items-center justify-between ${variantClasses.header} ${headerClassName}`}>
          <div className="flex items-center">
            {icon && <div className="mr-3">{icon}</div>}
            <div>
              {title && (
                typeof title === 'string' 
                  ? <h3 className="text-base font-medium">{title}</h3>
                  : title
              )}
              {subtitle && <p className="text-sm opacity-90">{subtitle}</p>}
            </div>
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}

      <div className={`p-4 ${bodyClassName}`}>
        {children}
      </div>

      {footer && (
        <div className={`px-4 py-3 bg-gray-50 border-t border-gray-100 ${footerClassName}`}>
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;