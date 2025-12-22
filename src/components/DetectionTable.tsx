import { Detection } from '@/lib/crowdDetection';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface DetectionTableProps {
  detections: Detection[];
}

export function DetectionTable({ detections }: DetectionTableProps) {
  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return 'text-accent';
    if (score >= 0.7) return 'text-primary';
    if (score >= 0.5) return 'text-warning';
    return 'text-destructive';
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 0.9) return 'High';
    if (score >= 0.7) return 'Good';
    if (score >= 0.5) return 'Medium';
    return 'Low';
  };

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-16">#</TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead className="text-right">Position (X, Y)</TableHead>
            <TableHead className="text-right">Size (W × H)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {detections.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                No people detected in the image
              </TableCell>
            </TableRow>
          ) : (
            detections.map((detection, index) => (
              <TableRow key={index} className="hover:bg-muted/30">
                <TableCell className="font-medium">{index + 1}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-2 h-2 rounded-full',
                      detection.score >= 0.9 ? 'bg-accent' :
                      detection.score >= 0.7 ? 'bg-primary' :
                      detection.score >= 0.5 ? 'bg-warning' : 'bg-destructive'
                    )} />
                    <span className={cn('font-medium', getConfidenceColor(detection.score))}>
                      {Math.round(detection.score * 100)}%
                    </span>
                    <span className="text-muted-foreground text-sm">
                      ({getConfidenceLabel(detection.score)})
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  ({Math.round(detection.box.xmin)}, {Math.round(detection.box.ymin)})
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {Math.round(detection.box.xmax - detection.box.xmin)} × {Math.round(detection.box.ymax - detection.box.ymin)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}