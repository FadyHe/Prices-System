'use client';

import Image from 'next/image';
import { ExternalLink, BookmarkPlus, Check } from 'lucide-react';
import SourceBadge from '@/components/SourceBadge';
import { cn } from '@/lib/utils';
import type { Product } from '@/components/useScraper';

interface ProductCardProps {
  product: Product;
  isBest?: boolean;
  onSave?: (product: Product) => void;
  saved?: boolean;
}

const PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><rect width='200' height='200' fill='%231e293b'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Cairo,sans-serif' font-size='14' fill='%2364748b'>لا توجد صورة</text></svg>";

export default function ProductCard({ product, isBest, onSave, saved }: ProductCardProps) {
  return (
    <article
      className={cn(
        'glass glass-hover group relative flex flex-col overflow-hidden rounded-2xl transition-all',
        isBest && 'gradient-border ring-1 ring-purple/40'
      )}
    >
      {isBest && (
        <div className="absolute top-3 right-3 z-10">
          <span className="badge badge-google bg-purple/20 text-purple border border-purple/40">
            <Check size={12} /> أفضل سعر
          </span>
        </div>
      )}

      <div className="relative aspect-square w-full bg-bg-secondary/60 overflow-hidden">
        <Image
          src={product.image || PLACEHOLDER}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-contain p-4 transition-transform duration-300 group-hover:scale-105"
          unoptimized
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            if (img.src !== PLACEHOLDER) img.src = PLACEHOLDER;
          }}
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <SourceBadge source={product.source} />
          {typeof product.relevance === 'number' && (
            <span className="text-xs text-muted">
              تطابق {Math.round(product.relevance * 100)}%
            </span>
          )}
        </div>

        <h3 className="line-clamp-2 text-base font-semibold text-primary leading-snug min-h-[3rem]">
          {product.name}
        </h3>

        <div className="flex items-baseline justify-end gap-2 mt-auto">
          <span className="price-currency">{product.currency}</span>
          <span className={cn('price', isBest && 'price-best')}>
            {product.price.toLocaleString('ar-EG')}
          </span>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary flex-1 justify-center text-sm"
          >
            <ExternalLink size={16} />
            زيارة المتجر
          </a>
          {onSave && (
            <button
              type="button"
              onClick={() => onSave(product)}
              disabled={saved}
              aria-label="حفظ في السجل"
              className={cn(
                'btn shrink-0 px-3',
                saved
                  ? 'bg-success/20 text-success cursor-default'
                  : 'bg-bg-secondary text-secondary hover:text-white hover:bg-bg-card-hover'
              )}
            >
              <BookmarkPlus size={16} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
