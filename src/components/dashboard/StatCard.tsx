// src/components/dashboard/StatCard.tsx
import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    direction: 'up' | 'down' | 'same';
    value: number;
  };
  className?: string;
}

export function StatCard({ title, value, icon, trend, className }: StatCardProps) {
  return (
    <div className={cn("p-6 bg-white rounded-lg shadow-sm", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h3 className="mt-1 text-2xl font-semibold text-gray-900">{value}</h3>
        </div>
        {icon && <div className="p-2 bg-gray-100 rounded-md">{icon}</div>}
      </div>

      {trend && (
        <div className="flex items-center mt-3">
          {trend.direction === 'up' ? (
            <ArrowUpIcon className="w-4 h-4 text-green-500" />
          ) : trend.direction === 'down' ? (
            <ArrowDownIcon className="w-4 h-4 text-red-500" />
          ) : (
            <MinusIcon className="w-4 h-4 text-gray-500" />
          )}

          <span
            className={cn("ml-1 text-sm font-medium", {
              "text-green-500": trend.direction === 'up',
              "text-red-500": trend.direction === 'down',
              "text-gray-500": trend.direction === 'same',
            })}
          >
            {trend.value}% {trend.direction === 'same' ? '' : trend.direction}
          </span>
          <span className="ml-1 text-sm text-gray-500">from last month</span>
        </div>
      )}
    </div>
  );
}