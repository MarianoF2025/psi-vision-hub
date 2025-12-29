'use client';

import { Card, Badge } from '@tremor/react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  change?: number;
  changeLabel?: string;
  loading?: boolean;
}

export default function KPICard({ 
  title, 
  value, 
  icon: Icon,
  change,
  changeLabel = 'vs. periodo anterior',
  loading = false
}: KPICardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  if (loading) {
    return (
      <Card className="p-2 lg:p-3 animate-pulse">
        <div className="h-3 bg-gray-200 rounded w-20 mb-2" />
        <div className="h-6 bg-gray-200 rounded w-16 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-24" />
      </Card>
    );
  }

  return (
    <Card className="p-2 lg:p-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] lg:text-xs text-gray-500 truncate pr-1">{title}</p>
        <div className="p-1 lg:p-1.5 bg-red-50 rounded-lg flex-shrink-0">
          <Icon className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-[#e63946]" />
        </div>
      </div>
      
      <p className="text-lg lg:text-xl font-bold text-gray-900 mb-1 lg:mb-2">{value}</p>
      
      {change !== undefined && (
        <div className="flex items-center space-x-1 flex-wrap">
          <Badge 
            size="xs"
            color={isPositive ? 'emerald' : isNegative ? 'red' : 'gray'}
            icon={isPositive ? TrendingUp : isNegative ? TrendingDown : undefined}
          >
            {isPositive ? '+' : ''}{change}%
          </Badge>
          <span className="text-[9px] lg:text-[10px] text-gray-500">{changeLabel}</span>
        </div>
      )}
    </Card>
  );
}
