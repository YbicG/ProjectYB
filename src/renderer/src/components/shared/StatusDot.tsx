import React from 'react';
import { cn } from '@renderer/lib/utils';

export type StatusType = 'running' | 'stopped' | 'starting' | 'error' | 'idle';

export interface StatusDotProps {
  status: StatusType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusDot: React.FC<StatusDotProps> = ({ status, size = 'md', className }) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const statusClasses = {
    running: 'bg-green-500 status-dot-pulse',
    stopped: 'bg-red-500',
    error: 'bg-red-500',
    starting: 'bg-yellow-500',
    idle: 'bg-zinc-500',
  };

  return (
    <div
      className={cn(
        'rounded-full',
        sizeClasses[size],
        statusClasses[status],
        className
      )}
      title={status}
    />
  );
};
