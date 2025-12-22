import { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, X, Clock, Bell, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CrowdAlert, AlertSeverity } from '@/lib/crowdAlerts';

interface AlertPanelProps {
  alerts: CrowdAlert[];
  onDismiss: (alertId: string) => void;
  onDismissAll: () => void;
}

const severityConfig: Record<AlertSeverity, { 
  icon: typeof AlertTriangle; 
  bgColor: string; 
  borderColor: string;
  textColor: string;
  badgeColor: string;
}> = {
  critical: {
    icon: AlertTriangle,
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/50',
    textColor: 'text-destructive',
    badgeColor: 'bg-destructive text-destructive-foreground',
  },
  warning: {
    icon: AlertCircle,
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/50',
    textColor: 'text-warning',
    badgeColor: 'bg-warning text-warning-foreground',
  },
  info: {
    icon: Info,
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/50',
    textColor: 'text-primary',
    badgeColor: 'bg-primary text-primary-foreground',
  },
};

function AlertItem({ 
  alert, 
  onDismiss 
}: { 
  alert: CrowdAlert; 
  onDismiss: () => void;
}) {
  const config = severityConfig[alert.severity];
  const Icon = config.icon;
  const [isExpanded, setIsExpanded] = useState(alert.severity === 'critical');
  
  return (
    <div 
      className={cn(
        'relative rounded-lg border p-4 transition-all',
        config.bgColor,
        config.borderColor,
        alert.severity === 'critical' && 'animate-pulse'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-full', config.bgColor)}>
          <Icon className={cn('w-5 h-5', config.textColor)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-sm">{alert.title}</h4>
            <Badge className={cn('text-xs', config.badgeColor)}>
              {alert.severity.toUpperCase()}
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground">{alert.message}</p>
          
          {isExpanded && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className={cn('font-medium', config.textColor)}>
                  ~{alert.timeToImpact} min until impact
                </span>
              </div>
              <div className="p-2 rounded bg-background/50 text-sm">
                <span className="font-medium">Prediction: </span>
                {alert.prediction}
              </div>
            </div>
          )}
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-2 transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3" />
                Less details
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                More details
              </>
            )}
          </button>
        </div>
        
        <button
          onClick={onDismiss}
          className="p-1 rounded-full hover:bg-background/50 transition-colors"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

export function AlertPanel({ alerts, onDismiss, onDismissAll }: AlertPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const activeAlerts = alerts.filter(a => !a.dismissed);
  const criticalCount = activeAlerts.filter(a => a.severity === 'critical').length;
  const warningCount = activeAlerts.filter(a => a.severity === 'warning').length;
  
  // Auto-expand when critical alerts appear
  useEffect(() => {
    if (criticalCount > 0) {
      setIsCollapsed(false);
    }
  }, [criticalCount]);
  
  if (activeAlerts.length === 0) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="py-6">
          <div className="flex items-center gap-3 text-green-500">
            <div className="p-2 rounded-full bg-green-500/10">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium">All Clear</p>
              <p className="text-sm text-muted-foreground">No crowd safety alerts</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={cn(
      'border-2 transition-all',
      criticalCount > 0 
        ? 'border-destructive/50 bg-destructive/5' 
        : 'border-warning/50 bg-warning/5'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className={cn(
              'w-5 h-5',
              criticalCount > 0 ? 'text-destructive' : 'text-warning'
            )} />
            Predictive Alerts
            <Badge variant="secondary" className="ml-2">
              {activeAlerts.length}
            </Badge>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {activeAlerts.length > 1 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onDismissAll}
                className="text-xs"
              >
                Dismiss All
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
        
        {/* Alert Summary */}
        <div className="flex items-center gap-3 text-sm">
          {criticalCount > 0 && (
            <span className="flex items-center gap-1 text-destructive">
              <AlertTriangle className="w-4 h-4" />
              {criticalCount} critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="flex items-center gap-1 text-warning">
              <AlertCircle className="w-4 h-4" />
              {warningCount} warning
            </span>
          )}
          <span className="text-muted-foreground">
            • 5-7 min advance notice
          </span>
        </div>
      </CardHeader>
      
      {!isCollapsed && (
        <CardContent className="space-y-3 pt-0">
          {activeAlerts
            .sort((a, b) => {
              // Sort by severity (critical first) then by timestamp (newest first)
              const severityOrder = { critical: 0, warning: 1, info: 2 };
              if (severityOrder[a.severity] !== severityOrder[b.severity]) {
                return severityOrder[a.severity] - severityOrder[b.severity];
              }
              return b.timestamp.getTime() - a.timestamp.getTime();
            })
            .map(alert => (
              <AlertItem
                key={alert.id}
                alert={alert}
                onDismiss={() => onDismiss(alert.id)}
              />
            ))}
        </CardContent>
      )}
    </Card>
  );
}
