'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  initialQuery?: string;
  placeholder?: string;
  autoFocus?: boolean;
  size?: 'md' | 'lg';
  onSubmit?: (query: string) => void;
  className?: string;
}

export default function SearchBar({
  initialQuery = '',
  placeholder = 'ابحث عن منتج (مثل جالكسي اس 24)',
  autoFocus = false,
  size = 'md',
  onSubmit,
  className,
}: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = initialQuery || searchParams.get('q') || '';
  const [value, setValue] = useState(initial);
  const lastSyncedRef = useRef(initial);

  useEffect(() => {
    const q = searchParams.get('q') ?? '';
    if (q === lastSyncedRef.current) return;
    lastSyncedRef.current = q;
    setValue(q);
  }, [searchParams]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    if (onSubmit) {
      onSubmit(trimmed);
      return;
    }
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <form
      onSubmit={submit}
      className={cn(
        'relative flex w-full items-center gap-2',
        size === 'lg' ? 'flex-col sm:flex-row' : 'flex-row',
        className
      )}
      role="search"
    >
      <div className="relative flex-1 w-full">
        <Search
          size={size === 'lg' ? 22 : 18}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
        />
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          aria-label="بحث عن منتج"
          className={cn(
            'input w-full pr-12 pl-10 text-right',
            size === 'lg' ? 'input-lg py-5 text-lg' : 'py-3'
          )}
        />
        {value && (
          <button
            type="button"
            onClick={() => setValue('')}
            aria-label="مسح البحث"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>
      <button
        type="submit"
        disabled={!value.trim()}
        className={cn(
          'btn btn-primary shrink-0',
          size === 'lg' ? 'px-8 py-4 text-lg w-full sm:w-auto' : 'px-6 py-3'
        )}
      >
        بحث
      </button>
    </form>
  );
}
