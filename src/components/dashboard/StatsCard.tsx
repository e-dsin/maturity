import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  variant?: 'primary' | 'secondary' | 'accent1' | 'accent2' | 'accent3' | 'accent4';
  size?: 'sm' | 'md' | 'lg';
  subtitle?: string;
  trend?: {
    value: number;
    label?: string;
    isPositive?: boolean;
  };
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  variant = 'primary',
  size = 'md',
  subtitle,
  trend
}) => {
  // Définir les classes basées sur la variante
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return {
          bg: 'bg-primary-50',
          text: 'text-primary-900',
          border: 'border-primary-200'
        };
      case 'secondary':
        return {
          bg: 'bg-secondary-50',
          text: 'text-secondary-900',
          border: 'border-secondary-200'
        };
      case 'accent1':
        return {
          bg: 'bg-accent1-light bg-opacity-30',
          text: 'text-accent1',
          border: 'border-accent1-light'
        };
      case 'accent2':
        return {
          bg: 'bg-accent2-light bg-opacity-30',
          text: 'text-accent2',
          border: 'border-accent2-light'
        };
      case 'accent3':
        return {
          bg: 'bg-accent3-light bg-opacity-30',
          text: 'text-accent3',
          border: 'border-accent3-light'
        };
      case 'accent4':
        return {
          bg: 'bg-accent4-light bg-opacity-30',
          text: 'text-accent4',
          border: 'border-accent4-light'
        };
      default:
        return {
          bg: 'bg-gray-50',
          text: 'text-gray-900',
          border: 'border-gray-200'
        };
    }
  };

  // Taille du composant
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'p-3';
      case 'lg':
        return 'p-5';
      default:
        return 'p-4';
    }
  };

  const variantClasses = getVariantClasses();
  const sizeClasses = getSizeClasses();

  return (
    <div className={`rounded-lg border ${variantClasses.bg} ${variantClasses.border} ${sizeClasses} shadow-card`}>
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <div className="flex items-baseline">
          <h3 className={`text-2xl font-bold ${variantClasses.text}`}>{value}</h3>
          {subtitle && <p className="ml-2 text-sm text-gray-500">{subtitle}</p>}
        </div>
        
        {trend && (
          <p className="mt-1 flex items-center text-sm">
            <span className={trend.isPositive ? 'text-success-500' : 'text-danger-500'}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </span>
            {trend.label && <span className="text-gray-500 ml-1">{trend.label}</span>}
          </p>
        )}
      </div>
    </div>
  );
};

// Composant pour afficher un ensemble de cartes statistiques
interface StatsGridProps {
  stats: StatCardProps[];
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
}

const StatsGrid: React.FC<StatsGridProps> = ({
  stats,
  columns = 4,
  className = ''
}) => {
  const gridClasses = `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-4 ${className}`;
  
  return (
    <div className={gridClasses}>
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
};

export { StatCard, StatsGrid };