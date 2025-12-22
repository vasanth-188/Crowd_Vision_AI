import { Check, AlertTriangle, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FaceMatch } from '@/lib/faceDetection';

interface MatchResultsProps {
  matches: FaceMatch[];
  onMatchClick?: (match: FaceMatch) => void;
  selectedIndex?: number;
}

export function MatchResults({ matches, onMatchClick, selectedIndex }: MatchResultsProps) {
  if (matches.length === 0) {
    return (
      <Card className="border-muted">
        <CardContent className="py-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="p-3 rounded-full bg-muted">
              <AlertTriangle className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No Matches Found</p>
              <p className="text-sm text-muted-foreground">
                The person was not found in the crowd image. Try adjusting the sensitivity.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getConfidenceColor = (similarity: number) => {
    if (similarity >= 0.5) return 'bg-green-500/10 text-green-500 border-green-500/30';
    if (similarity >= 0.35) return 'bg-warning/10 text-warning border-warning/30';
    return 'bg-muted text-muted-foreground border-border';
  };

  const getConfidenceLabel = (similarity: number) => {
    if (similarity >= 0.5) return 'High';
    if (similarity >= 0.35) return 'Medium';
    return 'Low';
  };

  return (
    <Card className="border-green-500/30 bg-green-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Check className="w-5 h-5 text-green-500" />
          Potential Matches Found
          <Badge variant="secondary" className="ml-auto">
            {matches.length} {matches.length === 1 ? 'match' : 'matches'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {matches.map((match, index) => (
            <button
              key={index}
              onClick={() => onMatchClick?.(match)}
              className={`w-full flex items-center gap-4 p-3 rounded-lg border transition-all text-left ${
                selectedIndex === index
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">
                  Person #{match.personIndex + 1}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  Position: ({Math.round(match.detection.box.xmin)}, {Math.round(match.detection.box.ymin)})
                </p>
              </div>
              <Badge className={getConfidenceColor(match.similarity)}>
                {getConfidenceLabel(match.similarity)} ({Math.round(match.similarity * 100)}%)
              </Badge>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Click on a match to highlight it in the image
        </p>
      </CardContent>
    </Card>
  );
}
