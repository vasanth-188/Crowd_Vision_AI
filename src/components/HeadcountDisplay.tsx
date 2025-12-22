import { Users, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface HeadcountDisplayProps {
  count: number;
  previousCount?: number;
  label?: string;
  showTrend?: boolean;
  size?: 'default' | 'large';
}

export function HeadcountDisplay({ 
  count, 
  previousCount, 
  label = 'Current Headcount',
  showTrend = true,
  size = 'default',
}: HeadcountDisplayProps) {
  const trend = previousCount !== undefined ? count - previousCount : 0;
  const trendPercent = previousCount && previousCount > 0 
    ? ((count - previousCount) / previousCount) * 100 
    : 0;

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? 'text-warning' : trend < 0 ? 'text-accent' : 'text-muted-foreground';

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
      <CardContent className={cn('flex items-center gap-4', size === 'large' ? 'p-6' : 'p-4')}>
        <div className="p-3 rounded-xl bg-primary/20">
          <Users className={cn('text-primary', size === 'large' ? 'w-8 h-8' : 'w-6 h-6')} />
        </div>
        
        <div className="flex-1">
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <div className="flex items-baseline gap-3">
            <span className={cn('font-bold tracking-tight', size === 'large' ? 'text-5xl' : 'text-4xl')}>
              {count}
            </span>
            <span className="text-muted-foreground text-lg">
              {count === 1 ? 'person' : 'people'}
            </span>
          </div>
        </div>

        {showTrend && previousCount !== undefined && (
          <div className={cn('text-right', trendColor)}>
            <div className="flex items-center gap-1 justify-end">
              <TrendIcon className="w-4 h-4" />
              <span className="font-semibold">
                {trend > 0 ? '+' : ''}{trend}
              </span>
            </div>
            <span className="text-xs">
              {Math.abs(trendPercent).toFixed(1)}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
