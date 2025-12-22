import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  className?: string;
  count?: number;
  type?: 'card' | 'chart' | 'text' | 'avatar' | 'list';
}

export function LoadingSkeleton({ className, count = 1, type = 'card' }: LoadingSkeletonProps) {
  const skeletons = Array.from({ length: count });

  if (type === 'text') {
    return (
      <div className="space-y-2">
        {skeletons.map((_, i) => (
          <div
            key={i}
            className="h-4 bg-muted rounded-md skeleton-pulse"
            style={{
              width: i === skeletons.length - 1 ? '70%' : '100%',
              animationDelay: `${i * 100}ms`,
            }}
          />
        ))}
      </div>
    );
  }

  if (type === 'avatar') {
    return (
      <div className="flex items-center space-x-4">
        {skeletons.map((_, i) => (
          <div key={i} className="space-y-2 flex-1">
            <div
              className="h-12 w-12 bg-muted rounded-full skeleton-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="space-y-3">
        {skeletons.map((_, i) => (
          <div
            key={i}
            className="flex items-center space-x-4 p-4 rounded-lg bg-muted/50 skeleton-pulse"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="h-10 w-10 bg-muted rounded-md flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'chart') {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded skeleton-pulse" style={{ width: '40%' }} />
          <div
            className="h-64 bg-muted rounded-lg skeleton-pulse"
            style={{
              animationDelay: '100ms',
            }}
          />
        </div>
      </div>
    );
  }

  // Default card type
  return (
    <div className={cn('space-y-4', className)}>
      {skeletons.map((_, i) => (
        <div
          key={i}
          className="p-6 rounded-lg border border-border bg-card space-y-4 skeleton-pulse"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="space-y-2">
            <div className="h-6 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-5/6" />
          </div>
        </div>
      ))}
    </div>
  );
}
