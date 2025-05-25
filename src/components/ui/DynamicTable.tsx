// src/components/ui/DynamicTable.tsx
import React from 'react';
import { formatDate, getInitials } from '@/lib/utils';

interface DynamicTableProps {
  data: any[];
  isLoading?: boolean;
  onRowClick?: (item: any) => void;
  excludeColumns?: string[];
  customRenderers?: {
    [key: string]: (value: any, item: any) => React.ReactNode;
  };
}

export function DynamicTable({
  data,
  isLoading = false,
  onRowClick,
  excludeColumns = [],
  customRenderers = {}
}: DynamicTableProps) {

  // Автоматически определяем колонки из первого элемента данных
  const getColumns = () => {
    if (!data || data.length === 0) return [];

    const firstItem = data[0];
    return Object.keys(firstItem)
      .filter(key => !excludeColumns.includes(key))
      .map(key => ({
        key,
        label: formatColumnName(key),
        type: detectColumnType(key, firstItem[key])
      }));
  };

  // Форматирует имя колонки для отображения
  const formatColumnName = (key: string): string => {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Определяет тип колонки для правильного отображения
  const detectColumnType = (key: string, value: any): string => {
    if (key.includes('date') || key.includes('time') || key.includes('created_at') || key.includes('updated_at')) {
      return 'date';
    }
    if (key.includes('email')) return 'email';
    if (key.includes('phone')) return 'phone';
    if (key.includes('id') && key !== 'id') return 'id';
    if (key.includes('status')) return 'status';
    if (key.includes('price') || key.includes('cost') || key.includes('amount')) return 'currency';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    return 'text';
  };

  // Рендерит значение ячейки в зависимости от типа
  const renderCellValue = (column: any, value: any, item: any) => {
    // Если есть кастомный рендерер, используем его
    if (customRenderers[column.key]) {
      return customRenderers[column.key](value, item);
    }

    // Обработка null/undefined значений
    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-400 italic">—</span>;
    }

    switch (column.type) {
      case 'date':
        try {
          return <span className="text-sm">{formatDate(value)}</span>;
        } catch {
          return <span className="text-sm">{value}</span>;
        }

      case 'email':
        return (
          <a
            href={`mailto:${value}`}
            className="text-blue-600 hover:text-blue-800 text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {value}
          </a>
        );

      case 'phone':
        return (
          <a
            href={`tel:${value}`}
            className="text-blue-600 hover:text-blue-800 text-sm font-mono"
            onClick={(e) => e.stopPropagation()}
          >
            {value}
          </a>
        );

      case 'status':
        return (
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(value)}`}>
            {value}
          </span>
        );

      case 'currency':
        return (
          <span className="text-sm font-medium">
            ${typeof value === 'number' ? value.toFixed(2) : value}
          </span>
        );

      case 'number':
        return <span className="text-sm font-mono">{value.toLocaleString()}</span>;

      case 'boolean':
        return (
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
            value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {value ? 'Yes' : 'No'}
          </span>
        );

      case 'id':
        return <span className="text-xs font-mono text-gray-500">{value}</span>;

      default:
        // Для текстовых полей проверяем длину
        const stringValue = String(value);
        if (stringValue.length > 50) {
          return (
            <span className="text-sm" title={stringValue}>
              {stringValue.substring(0, 50)}...
            </span>
          );
        }
        return <span className="text-sm">{stringValue}</span>;
    }
  };

  // Определяет цвет для статуса
  const getStatusColor = (status: string): string => {
    const statusLower = status.toLowerCase();
    if (['active', 'confirmed', 'completed', 'success'].includes(statusLower)) {
      return 'bg-green-100 text-green-800';
    }
    if (['pending', 'waiting', 'processing'].includes(statusLower)) {
      return 'bg-yellow-100 text-yellow-800';
    }
    if (['inactive', 'cancelled', 'failed', 'error'].includes(statusLower)) {
      return 'bg-red-100 text-red-800';
    }
    if (['new', 'draft'].includes(statusLower)) {
      return 'bg-blue-100 text-blue-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  const columns = getColumns();

  if (isLoading) {
    return (
      <div className="overflow-x-auto rounded-lg shadow">
        <div className="min-w-full bg-white">
          <div className="animate-pulse p-8">
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="overflow-x-auto rounded-lg shadow">
        <div className="min-w-full bg-white p-8 text-center">
          <p className="text-gray-500">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg shadow">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {column.label}
              </th>
            ))}
            {onRowClick && (
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item, index) => (
            <tr
              key={item.id || item.customer_id || index}
              className={`${onRowClick ? 'hover:bg-gray-50 cursor-pointer' : ''}`}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((column) => (
                <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                  {renderCellValue(column, item[column.key], item)}
                </td>
              ))}
              {onRowClick && (
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button className="text-indigo-600 hover:text-indigo-900">
                    View
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}