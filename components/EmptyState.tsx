import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="glass flex flex-col items-center justify-center gap-4 py-20 px-6 text-center">
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-purple/10 border border-purple/20 flex items-center justify-center text-purple">
          {icon}
        </div>
      )}
      <h3 className="text-2xl font-bold text-primary">{title}</h3>
      {description && (
        <p className="text-secondary max-w-md leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
