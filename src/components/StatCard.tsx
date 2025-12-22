import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  variant?: 'default' | 'primary' | 'accent' | 'warning';
}

export function StatCard({ title, value, icon: Icon, description, variant = 'default' }: StatCardProps) {
  const variantStyles = {
    default: 'bg-card border-border',
    primary: 'bg-primary/10 border-primary/20',
    accent: 'bg-accent/10 border-accent/20',
    warning: 'bg-warning/10 border-warning/20',
  };

  const iconStyles = {
    default: 'bg-muted text-foreground',
    primary: 'bg-primary/20 text-primary',
    accent: 'bg-accent/20 text-accent',
    warning: 'bg-warning/20 text-warning',
  };

  return (
    <div className={cn(
      'rounded-xl border p-5 transition-all hover:shadow-lg',
      variantStyles[variant]
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-3xl font-bold mt-1 tracking-tight">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <div className={cn('p-2.5 rounded-lg', iconStyles[variant])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}