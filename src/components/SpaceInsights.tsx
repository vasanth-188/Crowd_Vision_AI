import { AlertTriangle, CheckCircle2, Info, Ruler, Users, Move, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SpaceInsightsProps {
  currentHeadcount: number;
  areaSize?: number; // in square meters, optional - will estimate if not provided
  imageWidth?: number;
  imageHeight?: number;
}

// Industry standards for crowd safety (people per square meter)
const DENSITY_STANDARDS = {
  comfortable: 0.5, // 2 sq.m per person - comfortable movement
  moderate: 1.0,    // 1 sq.m per person - moderate density
  high: 2.0,        // 0.5 sq.m per person - high density, limited movement
  critical: 4.0,    // 0.25 sq.m per person - dangerous crush risk
};

const SPACE_REQUIREMENTS = {
  standingEvent: { min: 0.5, recommended: 1.0, label: 'Standing Event' },
  seatedEvent: { min: 1.5, recommended: 2.0, label: 'Seated Event' },
  mixedUse: { min: 0.75, recommended: 1.25, label: 'Mixed Standing/Moving' },
  emergencyEvac: { min: 2.0, recommended: 3.0, label: 'Emergency Evacuation' },
};

function calculateDensity(headcount: number, areaSqm: number): number {
  if (areaSqm <= 0) return 0;
  return headcount / areaSqm;
}

function getDensityStatus(density: number): 'safe' | 'moderate' | 'warning' | 'critical' {
  if (density <= DENSITY_STANDARDS.comfortable) return 'safe';
  if (density <= DENSITY_STANDARDS.moderate) return 'moderate';
  if (density <= DENSITY_STANDARDS.high) return 'warning';
  return 'critical';
}

function getRecommendedCapacity(areaSqm: number, eventType: keyof typeof SPACE_REQUIREMENTS): number {
  return Math.floor(areaSqm / SPACE_REQUIREMENTS[eventType].recommended);
}

function getMaximumCapacity(areaSqm: number, eventType: keyof typeof SPACE_REQUIREMENTS): number {
  return Math.floor(areaSqm / SPACE_REQUIREMENTS[eventType].min);
}

export function SpaceInsights({ 
  currentHeadcount, 
  areaSize,
  imageWidth = 1920,
  imageHeight = 1080,
}: SpaceInsightsProps) {
  // Estimate area if not provided (assume 1 pixel ≈ 0.01 sq.m for a typical wide-angle view)
  const estimatedArea = areaSize || (imageWidth * imageHeight * 0.0001);
  const currentDensity = calculateDensity(currentHeadcount, estimatedArea);
  const densityStatus = getDensityStatus(currentDensity);
  
  const recommendedCapacity = getRecommendedCapacity(estimatedArea, 'mixedUse');
  const maxCapacity = getMaximumCapacity(estimatedArea, 'standingEvent');
  const utilizationPercent = Math.min(100, (currentHeadcount / recommendedCapacity) * 100);
  
  const statusConfig = {
    safe: { 
      color: 'text-accent', 
      bg: 'bg-accent/10', 
      border: 'border-accent/30',
      icon: CheckCircle2,
      label: 'Optimal',
      description: 'Safe crowd density with free movement'
    },
    moderate: { 
      color: 'text-primary', 
      bg: 'bg-primary/10', 
      border: 'border-primary/30',
      icon: Info,
      label: 'Moderate',
      description: 'Acceptable density, monitor for changes'
    },
    warning: { 
      color: 'text-warning', 
      bg: 'bg-warning/10', 
      border: 'border-warning/30',
      icon: AlertTriangle,
      label: 'High Density',
      description: 'Limited movement, consider crowd control'
    },
    critical: { 
      color: 'text-destructive', 
      bg: 'bg-destructive/10', 
      border: 'border-destructive/30',
      icon: AlertTriangle,
      label: 'Critical',
      description: 'Dangerous density - immediate action required'
    },
  };

  const config = statusConfig[densityStatus];
  const StatusIcon = config.icon;

  return (
    <Card className={cn('border-2 transition-all', config.border, config.bg)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Ruler className="w-5 h-5" />
            Space & Safety Insights
          </div>
          <Badge className={cn(config.bg, config.color, 'border', config.border)}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {config.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-5">
        {/* Current Status Summary */}
        <div className={cn('p-4 rounded-lg', config.bg)}>
          <div className="flex items-center gap-3">
            <StatusIcon className={cn('w-6 h-6', config.color)} />
            <div>
              <p className={cn('font-semibold', config.color)}>{config.description}</p>
              <p className="text-sm text-muted-foreground">
                Current density: {currentDensity.toFixed(2)} people/m² 
                ({(1 / currentDensity || 0).toFixed(1)} m² per person)
              </p>
            </div>
          </div>
        </div>

        {/* Headcount Display */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Users className="w-4 h-4" />
              Current Headcount
            </div>
            <p className="text-3xl font-bold">{currentHeadcount}</p>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Move className="w-4 h-4" />
              Capacity Usage
            </div>
            <p className="text-3xl font-bold">{Math.round(utilizationPercent)}%</p>
          </div>
        </div>

        {/* Capacity Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Space Utilization</span>
            <span className="font-medium">{currentHeadcount} / {recommendedCapacity} recommended</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                'h-full transition-all duration-500 rounded-full',
                densityStatus === 'safe' && 'bg-accent',
                densityStatus === 'moderate' && 'bg-primary',
                densityStatus === 'warning' && 'bg-warning',
                densityStatus === 'critical' && 'bg-destructive',
              )}
              style={{ width: `${Math.min(100, utilizationPercent)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span>Recommended: {recommendedCapacity}</span>
            <span>Max: {maxCapacity}</span>
          </div>
        </div>

        {/* Prescriptive Guidelines */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Info className="w-4 h-4" />
            Optimal Space Requirements
          </h4>
          <div className="grid gap-2 text-sm">
            {Object.entries(SPACE_REQUIREMENTS).map(([key, value]) => {
              const optimalCapacity = getRecommendedCapacity(estimatedArea, key as keyof typeof SPACE_REQUIREMENTS);
              const isCurrentType = key === 'mixedUse';
              return (
                <div 
                  key={key}
                  className={cn(
                    'flex items-center justify-between p-2 rounded-lg',
                    isCurrentType ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {isCurrentType && <ArrowRight className="w-3 h-3 text-primary" />}
                    <span className={isCurrentType ? 'font-medium text-primary' : 'text-muted-foreground'}>
                      {value.label}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">{optimalCapacity} people</span>
                    <span className="text-muted-foreground ml-1">({value.recommended}m²/person)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Safety Recommendations */}
        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <h4 className="font-semibold text-sm mb-2">Safety Recommendations</h4>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {currentDensity <= DENSITY_STANDARDS.comfortable && (
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                Current density allows safe crowd movement and emergency evacuation
              </li>
            )}
            {currentDensity > DENSITY_STANDARDS.comfortable && currentDensity <= DENSITY_STANDARDS.moderate && (
              <li className="flex items-start gap-2">
                <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                Monitor crowd flow and ensure clear exit paths
              </li>
            )}
            {currentDensity > DENSITY_STANDARDS.moderate && (
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                Consider opening additional exits or restricting new entries
              </li>
            )}
            {currentDensity > DENSITY_STANDARDS.high && (
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                Immediate crowd dispersal recommended - crush risk elevated
              </li>
            )}
            <li className="flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              Maintain minimum 2m² per person for safe evacuation routes
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
