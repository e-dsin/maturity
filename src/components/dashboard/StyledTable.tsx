import React from 'react';

// Interface générique pour les données du tableau
interface TableProps<T> {
  data: T[];
  columns: {
    key: keyof T | string;
    title: string;
    render?: (item: T) => React.ReactNode;
    width?: string;
    className?: string;
  }[];
  onRowClick?: (item: T) => void;
  className?: string;
  striped?: boolean;
  hoverable?: boolean;
  bordered?: boolean;
  compact?: boolean;
  headerClassName?: string;
  rowClassName?: (item: T, index: number) => string | undefined;
}

// Composant réutilisable pour les tableaux stylisés
const StyledTable = <T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  className = '',
  striped = true,
  hoverable = true,
  bordered = true,
  compact = false,
  headerClassName = '',
  rowClassName,
}: TableProps<T>) => {
  // Classes de base pour le tableau
  const tableClasses = [
    'w-full',
    'divide-y',
    'divide-gray-200',
    bordered ? 'border border-gray-200 rounded-lg overflow-hidden' : '',
    className
  ].filter(Boolean).join(' ');

  // Classes pour l'en-tête
  const headerClasses = [
    'bg-primary-500',
    'text-primary-900',
    'font-medium',
    'text-left',
    'uppercase',
    'text-xs',
    'tracking-wider',
    compact ? 'px-3 py-2' : 'px-4 py-3',
    headerClassName
  ].filter(Boolean).join(' ');

  // Classes pour les cellules
  const cellClasses = compact ? 'px-3 py-2' : 'px-4 py-3';

  return (
    <div className="overflow-x-auto shadow-card">
      <table className={tableClasses}>
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th 
                key={`header-${index}`}
                className={headerClasses}
                style={{ width: column.width }}
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.length === 0 ? (
            <tr>
              <td 
                colSpan={columns.length} 
                className="text-center py-4 text-gray-500 bg-gray-50"
              >
                Aucune donnée disponible
              </td>
            </tr>
          ) : (
            data.map((item, rowIndex) => (
              <tr 
                key={`row-${rowIndex}`}
                onClick={() => onRowClick && onRowClick(item)}
                className={[
                  onRowClick ? 'cursor-pointer' : '',
                  hoverable ? 'hover:bg-gray-50' : '',
                  striped && rowIndex % 2 === 1 ? 'bg-gray-50' : '',
                  rowClassName ? rowClassName(item, rowIndex) : ''
                ].filter(Boolean).join(' ')}
              >
                {columns.map((column, colIndex) => {
                  const key = column.key as keyof T | string;
                  const value = typeof key === 'string' ? item[key as keyof T] : null;
                  
                  return (
                    <td 
                      key={`cell-${rowIndex}-${colIndex}`}
                      className={`${cellClasses} ${column.className || ''}`}
                    >
                      {column.render 
                        ? column.render(item)
                        : value !== null && value !== undefined
                          ? String(value)
                          : ''}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default StyledTable;