'use client';

import SearchBar from '@/components/SearchBar';

interface InputSysProps {
  initialQuery?: string;
  size?: 'md' | 'lg';
}

export default function InputSys({ initialQuery, size = 'lg' }: InputSysProps) {
  return (
    <section className="relative z-10 w-full my-6">
      <SearchBar
        initialQuery={initialQuery}
        size={size}
        placeholder="ابحث عن منتج (مثل جالكسي اس 24)"
        className="w-full"
      />
    </section>
  );
}
