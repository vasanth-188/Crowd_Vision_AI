import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Detection } from '@/lib/crowdDetection';
import { autoDetectZones, DynamicZone } from '@/lib/zoneClustering';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface Zone {
  id: string;
  name: string;
  bounds: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
  };
  color: string;
}

interface ZoneDensityAnalysisProps {
  detections: Detection[];
  imageWidth: number;
  imageHeight: number;
  isLive?: boolean;
}

// Default zones for a typical venue (divided into 5 sections)
export const DEFAULT_ZONES: Zone[] = [
  {
    id: 'entrance',
    name: 'Entrance',
    bounds: { xmin: 0, ymin: 0.8, xmax: 1, ymax: 1 },
    color: 'hsl(0, 0%, 80%)',
  },
  {
    id: 'main_hall',
    name: 'Main Hall',
    bounds: { xmin: 0.2, ymin: 0.2, xmax: 0.8, ymax: 0.8 },
    color: 'hsl(220, 90%, 56%)',
  },
  {
    id: 'food_court',
    name: 'Food Court',
    bounds: { xmin: 0, ymin: 0.4, xmax: 0.2, ymax: 0.8 },
    color: 'hsl(220, 90%, 56%)',
  },
  {
    id: 'exit_a',
    name: 'Exit A',
    bounds: { xmin: 0.8, ymin: 0.3, xmax: 1, ymax: 0.7 },
    color: 'hsl(220, 90%, 56%)',
  },
  {
    id: 'exit_b',
    name: 'Exit B',
    bounds: { xmin: 0, ymin: 0, xmax: 0.2, ymax: 0.2 },
    color: 'hsl(220, 90%, 56%)',
  },
];

export function getDetectionsInZone(detections: Detection[], zone: Zone, imageWidth: number, imageHeight: number): number {
  return detections.filter((detection) => {
    const centerX = (detection.box.xmin + detection.box.xmax) / 2 / imageWidth;
    const centerY = (detection.box.ymin + detection.box.ymax) / 2 / imageHeight;

    return (
      centerX >= zone.bounds.xmin &&
      centerX <= zone.bounds.xmax &&
      centerY >= zone.bounds.ymin &&
      centerY <= zone.bounds.ymax
    );
  }).length;
}

export function ZoneDensityAnalysis({
  detections,
  imageWidth,
  imageHeight,
  isLive = false,
}: ZoneDensityAnalysisProps) {
  // Auto-detect zones from detections using clustering
  const dynamicZones = useMemo(() => {
    return autoDetectZones(detections, imageWidth, imageHeight, 5);
  }, [detections, imageWidth, imageHeight]);

  const zoneData = dynamicZones.map((zone) => {
    const percentage = detections.length > 0 ? (zone.detectionCount / detections.length) * 100 : 0;
    
    // Color based on density
    const colorMap = {
      low: 'hsl(142, 76%, 36%)', // green
      medium: 'hsl(220, 90%, 56%)', // blue
      high: 'hsl(38, 92%, 50%)', // orange
      critical: 'hsl(0, 84%, 60%)', // red
    };

    return {
      name: zone.name,
      count: zone.detectionCount,
      percentage: Math.round(percentage),
      color: colorMap[zone.density],
      density: zone.density,
    };
  });

  const totalDetections = detections.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <span>Zone Density Analysis</span>
          {isLive && (
            <span className="text-xs font-normal text-muted-foreground">
              • Live
            </span>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {totalDetections > 0 ? `Auto-detected ${dynamicZones.length} zones from ${totalDetections} people` : 'Waiting for detections...'}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {totalDetections === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No detections yet. Position people in the camera view to analyze zone density.
          </div>
        ) : (
          <>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={zoneData}
                  margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.2)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'percentage') return [`${value}%`, 'Percentage'];
                      return [value, 'Count'];
                    }}
                  />
                  <Bar dataKey="percentage" radius={[8, 8, 0, 0]}>
                    {zoneData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Zone Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {zoneData.map((zone) => (
                <div
                  key={zone.name}
                  className="p-3 rounded-lg bg-muted/50 border border-border text-center space-y-1.5"
                >
                  <p className="text-xs font-medium text-muted-foreground">{zone.name}</p>
                  <p className="text-2xl font-bold">{zone.count}</p>
                  <p className="text-xs text-muted-foreground">{zone.percentage}%</p>
                </div>
              ))}
            </div>

            {/* Crowdedness Status */}
            <div className="p-3 rounded-lg bg-card border border-border space-y-2">
              <p className="text-sm font-medium">Zone Status</p>
              <div className="space-y-1.5 text-sm">
                {zoneData.map((zone) => {
                  const statusMap = {
                    low: { label: 'Low', color: 'text-green-600 dark:text-green-400' },
                    medium: { label: 'Moderate', color: 'text-blue-600 dark:text-blue-400' },
                    high: { label: 'High', color: 'text-orange-600 dark:text-orange-400' },
                    critical: { label: 'Critical', color: 'text-red-600 dark:text-red-400' },
                  };
                  const status = statusMap[zone.density];
                  
                  return (
                    <div key={zone.name} className="flex justify-between items-center">
                      <span className="text-muted-foreground">{zone.name}</span>
                      <span className={cn('font-medium', status.color)}>{status.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
