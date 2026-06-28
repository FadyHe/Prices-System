import { cn } from '@/lib/utils';

const SOURCE_MAP: Record<string, { label: string; className: string }> = {
  'Amazon.eg': { label: 'Amazon', className: 'badge-amazon' },
  'amazon.eg': { label: 'Amazon', className: 'badge-amazon' },
  'amazon': { label: 'Amazon', className: 'badge-amazon' },
  'Jumia.eg': { label: 'Jumia', className: 'badge-jumia' },
  'jumia.eg': { label: 'Jumia', className: 'badge-jumia' },
  'Jumia': { label: 'Jumia', className: 'badge-jumia' },
  'noon.com': { label: 'Noon', className: 'badge-noon' },
  'noon': { label: 'Noon', className: 'badge-noon' },
  'Google Shopping': { label: 'Google', className: 'badge-google' },
};

interface SourceBadgeProps {
  source: string;
  className?: string;
}

export default function SourceBadge({ source, className }: SourceBadgeProps) {
  const entry = SOURCE_MAP[source] ?? { label: source, className: 'badge' };
  return (
    <span className={cn('badge', entry.className, className)}>{entry.label}</span>
  );
}

export function getSourceClass(source: string): string {
  return SOURCE_MAP[source]?.className ?? 'badge';
}

export function getSourceLabel(source: string): string {
  return SOURCE_MAP[source]?.label ?? source;
}
