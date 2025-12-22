import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ProcessingProgressProps {
  progress: number;
  status: string;
  isVisible: boolean;
}

export function ProcessingProgress({ progress, status, isVisible }: ProcessingProgressProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-card border-2 border-primary flex items-center justify-center text-xs font-bold text-primary">
              {progress}%
            </div>
          </div>
          
          <h3 className="text-xl font-semibold mb-2">Analyzing Image</h3>
          <p className="text-muted-foreground mb-6">{status}</p>
          
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                'bg-gradient-to-r from-primary to-accent'
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <p className="text-xs text-muted-foreground mt-4">
            Using AI to detect and count people in your image
          </p>
        </div>
      </div>
    </div>
  );
}