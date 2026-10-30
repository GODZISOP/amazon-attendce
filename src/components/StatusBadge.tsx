import React from 'react';
import { AttendanceStatus } from '@/types/attendance';

interface StatusBadgeProps {
  status: AttendanceStatus | string;
  size?: 'sm' | 'md' | 'lg';
}

export const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; solid: string }> = {
  Present: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-300',
    solid: 'bg-emerald-600 text-white',
  },
  Absent: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-300',
    solid: 'bg-rose-600 text-white',
  },
  Late: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-300',
    solid: 'bg-amber-600 text-white',
  },
  Leave: {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-300',
    solid: 'bg-sky-600 text-white',
  },
  'Half Day': {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-300',
    solid: 'bg-purple-600 text-white',
  },
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = STATUS_COLORS[status] || {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-200',
    solid: 'bg-gray-600 text-white',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs font-semibold rounded-md',
    md: 'px-3 py-1 text-sm font-semibold rounded-full',
    lg: 'px-4 py-1.5 text-base font-bold rounded-full',
  }[size];

  return (
    <span className={`inline-flex items-center justify-center border ${config.bg} ${config.text} ${config.border} ${sizeClasses}`}>
      {status}
    </span>
  );
}
