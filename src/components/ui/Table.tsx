// src/components/ui/Table.tsx
import React, { ReactNode } from 'react';

// Interface pour les colonnes du tableau
interface TableColumn<T> {
  key: string;
  title: string | ReactNode;
  render?: (item: T, index: number) => ReactNode;
  width?: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

// Interface pour les propriétés du tableau
interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  keyExtractor?: (item: T, index: number) => string | number;
  onRowClick?: (item: T, index: number) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
  compact?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  bordered?: boolean;
  rounded?: boolean;
  scrollable?: boolean;
  maxHeight?: string;
  headerClassName?: string;
  rowClassName?: (item: T, index: number) => string;
  selectedRowKey?: string | number;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
}

const Table = <T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  isLoading = false,
  emptyMessage = 'Aucune donnée disponible',
  className = '',
  compact = false,
  striped = true,
  hoverable = true,
  bordered = true,
  rounded = true,
  scrollable = false,
  maxHeight,
  headerClassName = '',
  rowClassName,
  selectedRowKey,
  sortColumn,
  sortDirection = 'asc',
  onSort,
}: TableProps<T>) => {
  // Calculer les classes pour le conteneur principal
  const containerClasses = [
    'overflow-hidden',
    bordered && 'border border-gray-200',
    rounded && 'rounded-lg',
    'shadow-card',
    className
  ].filter(Boolean).join(' ');

  // Calculer les classes pour le wrapper de tableau avec scroll
  const tableWrapperClasses = [
    'overflow-x-auto w-full',
    scrollable && maxHeight ? 'overflow-y-auto' : '',
  ].filter(Boolean).join(' ');

  // Styles pour la hauteur maximum si scrollable
  const tableWrapperStyle = scrollable && maxHeight ? { maxHeight } : {};

  // Calculer les classes du tableau
  const tableClasses = [
    'min-w-full divide-y divide-gray-200',
  ].join(' ');

  // Calculer les classes d'en-tête
  const thClasses = (column: TableColumn<T>) => [
    'text-left',
    'font-medium',
    'text-xs',
    'text-gray-500',
    'uppercase',
    'tracking-wider',
    compact ? 'px-3 py-2' : 'px-6 py-3',
    column.align === 'center' && 'text-center',
    column.align === 'right' && 'text-right',
    column.sortable && 'cursor-pointer hover:bg-gray-50',
    headerClassName,
    column.className
  ].filter(Boolean).join(' ');

  // Calculer les classes de cellule
  const tdClasses = (column: TableColumn<T>) => [
    compact ? 'px-3 py-2' : 'px-6 py-4',
    column.align === 'center' && 'text-center',
    column.align === 'right' && 'text-right',
    column.className
  ].filter(Boolean).join(' ');

  // Calculer les classes de ligne
  const trClasses = (item: T, index: number) => [
    striped && index % 2 === 1 ? 'bg-gray-50' : '',
    hoverable ? 'hover:bg-gray-100' : '',
    onRowClick ? 'cursor-pointer' : '',
    keyExtractor && selectedRowKey !== undefined && keyExtractor(item, index) === selectedRowKey ? 'bg-primary-400' : '',
    rowClassName ? rowClassName(item, index) : ''
  ].filter(Boolean).join(' ');

  // Gérer le clic sur l'en-tête pour le tri
  const handleHeaderClick = (column: TableColumn<T>) => {
    if (column.sortable && onSort) {
      const newDirection = 
        sortColumn === column.key && sortDirection === 'asc' ? 'desc' : 'asc';
      onSort(column.key, newDirection);
    }
  };

  // Rendu du tableau
  return (
    <div className={containerClasses}>
      <div className={tableWrapperClasses} style={tableWrapperStyle}>
        <table className={tableClasses}>
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column, index) => (
                <th 
                  key={`header-${column.key}-${index}`}
                  className={thClasses(column)}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleHeaderClick(column)}
                  scope="col"
                >
                  <div className="flex items-center">
                    {column.title}
                    {column.sortable && sortColumn === column.key && (
                      <span className="ml-1">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-4 text-center text-gray-500">
                  Chargement...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-4 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, rowIndex) => (
                <tr 
                  key={keyExtractor ? keyExtractor(item, rowIndex) : `row-${rowIndex}`}
                  className={trClasses(item, rowIndex)}
                  onClick={() => onRowClick && onRowClick(item, rowIndex)}
                >
                  {columns.map((column, colIndex) => (
                    <td 
                      key={`cell-${rowIndex}-${colIndex}`}
                      className={tdClasses(column)}
                    >
                      {column.render 
                        ? column.render(item, rowIndex)
                        : item[column.key] !== undefined
                          ? String(item[column.key])
                          : ''}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Table;