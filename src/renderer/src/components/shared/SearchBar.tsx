import React from 'react'
import { Search } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

interface SearchBarProps {
  placeholder?: string
  value: string
  onChange: (value: string) => void
  className?: string
}

/**
 * Reusable dark-themed search bar.
 * Styled to match the app's zinc palette with a violet-500 focus ring.
 */
export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search…',
  value,
  onChange,
  className
}) => {
  return (
    <div className={cn('relative flex items-center', className)}>
      <Search className="pointer-events-none absolute left-3 h-4 w-4 text-zinc-500" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 pl-9 pr-3',
          'text-sm text-zinc-50 placeholder:text-zinc-500',
          'outline-none transition-colors',
          'focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30',
          'hover:border-zinc-700'
        )}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2 rounded p-0.5 text-zinc-500 hover:text-zinc-300 transition-colors"
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  )
}
