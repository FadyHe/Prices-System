import { AlertTriangle } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
}

export default function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <div className="glass border-error/40 bg-error/10 flex items-center gap-3 px-5 py-4 text-error">
      <AlertTriangle size={22} className="shrink-0" />
      <p className="text-sm md:text-base font-medium">{message}</p>
    </div>
  );
}
