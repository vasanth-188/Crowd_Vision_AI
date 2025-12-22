export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface CrowdAlert {
  id: string;
  type: 'density_surge' | 'rapid_growth' | 'high_concentration' | 'capacity_warning' | 'bottleneck';
  severity: AlertSeverity;
  title: string;
  message: string;
  prediction: string;
  timeToImpact: number; // minutes
  timestamp: Date;
  zone?: { x: number; y: number; radius: number };
  dismissed?: boolean;
}

export interface CrowdSnapshot {
  timestamp: Date;
  peopleCount: number;
  density: number; // people per unit area
  hotspots: { x: number; y: number; intensity: number }[];
}

interface AlertThresholds {
  densitySurgeRate: number; // % increase per minute that triggers alert
  rapidGrowthRate: number; // people added per minute
  highDensityThreshold: number; // density level considered dangerous
  capacityWarningPercent: number; // % of estimated capacity
  predictionWindowMinutes: number; // how far ahead to predict
}

const DEFAULT_THRESHOLDS: AlertThresholds = {
  densitySurgeRate: 15, // 15% increase per minute
  rapidGrowthRate: 10, // 10+ people per minute
  highDensityThreshold: 0.7, // 70% density
  capacityWarningPercent: 80, // 80% of capacity
  predictionWindowMinutes: 6, // 5-7 minute prediction window
};

// Keep track of historical snapshots for trend analysis
const snapshotHistory: CrowdSnapshot[] = [];
const MAX_HISTORY_LENGTH = 60; // Keep 60 snapshots (e.g., 10 minutes at 6/min)

export function addSnapshot(snapshot: CrowdSnapshot): void {
  snapshotHistory.push(snapshot);
  
  // Trim old history
  if (snapshotHistory.length > MAX_HISTORY_LENGTH) {
    snapshotHistory.shift();
  }
}

export function clearHistory(): void {
  snapshotHistory.length = 0;
}

export function getHistory(): CrowdSnapshot[] {
  return [...snapshotHistory];
}

function calculateGrowthRate(snapshots: CrowdSnapshot[]): number {
  if (snapshots.length < 2) return 0;
  
  const recent = snapshots.slice(-5); // Last 5 snapshots
  if (recent.length < 2) return 0;
  
  const first = recent[0];
  const last = recent[recent.length - 1];
  const timeDiffMinutes = (last.timestamp.getTime() - first.timestamp.getTime()) / 60000;
  
  if (timeDiffMinutes === 0) return 0;
  
  return (last.peopleCount - first.peopleCount) / timeDiffMinutes;
}

function calculateDensityChangeRate(snapshots: CrowdSnapshot[]): number {
  if (snapshots.length < 2) return 0;
  
  const recent = snapshots.slice(-5);
  if (recent.length < 2) return 0;
  
  const first = recent[0];
  const last = recent[recent.length - 1];
  const timeDiffMinutes = (last.timestamp.getTime() - first.timestamp.getTime()) / 60000;
  
  if (timeDiffMinutes === 0 || first.density === 0) return 0;
  
  const percentChange = ((last.density - first.density) / first.density) * 100;
  return percentChange / timeDiffMinutes;
}

function predictFutureCount(
  snapshots: CrowdSnapshot[],
  minutesAhead: number
): number {
  const growthRate = calculateGrowthRate(snapshots);
  const currentCount = snapshots[snapshots.length - 1]?.peopleCount || 0;
  
  return Math.max(0, currentCount + growthRate * minutesAhead);
}

function findHotspotClusters(
  hotspots: { x: number; y: number; intensity: number }[]
): { x: number; y: number; intensity: number; count: number }[] {
  if (hotspots.length === 0) return [];
  
  const clusters: { x: number; y: number; intensity: number; count: number }[] = [];
  const visited = new Set<number>();
  
  for (let i = 0; i < hotspots.length; i++) {
    if (visited.has(i)) continue;
    
    const cluster = { 
      x: hotspots[i].x, 
      y: hotspots[i].y, 
      intensity: hotspots[i].intensity,
      count: 1 
    };
    visited.add(i);
    
    for (let j = i + 1; j < hotspots.length; j++) {
      if (visited.has(j)) continue;
      
      const dist = Math.sqrt(
        Math.pow(hotspots[j].x - cluster.x, 2) + 
        Math.pow(hotspots[j].y - cluster.y, 2)
      );
      
      if (dist < 100) { // Within 100 units
        cluster.x = (cluster.x * cluster.count + hotspots[j].x) / (cluster.count + 1);
        cluster.y = (cluster.y * cluster.count + hotspots[j].y) / (cluster.count + 1);
        cluster.intensity = Math.max(cluster.intensity, hotspots[j].intensity);
        cluster.count++;
        visited.add(j);
      }
    }
    
    clusters.push(cluster);
  }
  
  return clusters.sort((a, b) => b.intensity - a.intensity);
}

export function analyzeAndGenerateAlerts(
  currentSnapshot: CrowdSnapshot,
  estimatedCapacity: number = 100,
  thresholds: Partial<AlertThresholds> = {}
): CrowdAlert[] {
  const config = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const alerts: CrowdAlert[] = [];
  
  // Add current snapshot to history
  addSnapshot(currentSnapshot);
  
  const history = getHistory();
  
  // 1. Check for rapid crowd growth
  const growthRate = calculateGrowthRate(history);
  if (growthRate >= config.rapidGrowthRate) {
    const predictedCount = predictFutureCount(history, config.predictionWindowMinutes);
    alerts.push({
      id: `rapid-growth-${Date.now()}`,
      type: 'rapid_growth',
      severity: growthRate >= config.rapidGrowthRate * 2 ? 'critical' : 'warning',
      title: 'Rapid Crowd Growth Detected',
      message: `Crowd increasing at ${Math.round(growthRate)} people/minute`,
      prediction: `Expected ${Math.round(predictedCount)} people in ${config.predictionWindowMinutes} minutes`,
      timeToImpact: config.predictionWindowMinutes,
      timestamp: new Date(),
    });
  }
  
  // 2. Check for density surge
  const densityChangeRate = calculateDensityChangeRate(history);
  if (densityChangeRate >= config.densitySurgeRate) {
    alerts.push({
      id: `density-surge-${Date.now()}`,
      type: 'density_surge',
      severity: densityChangeRate >= config.densitySurgeRate * 2 ? 'critical' : 'warning',
      title: 'Density Surge Alert',
      message: `Density increasing ${Math.round(densityChangeRate)}% per minute`,
      prediction: `Dangerous density levels expected in ${Math.round(config.predictionWindowMinutes - densityChangeRate / config.densitySurgeRate)} minutes`,
      timeToImpact: Math.max(1, config.predictionWindowMinutes - Math.round(densityChangeRate / config.densitySurgeRate)),
      timestamp: new Date(),
    });
  }
  
  // 3. Check for high concentration zones (hotspots)
  const clusters = findHotspotClusters(currentSnapshot.hotspots);
  const dangerousClusters = clusters.filter(c => c.intensity >= config.highDensityThreshold);
  
  if (dangerousClusters.length > 0) {
    const mostDangerous = dangerousClusters[0];
    alerts.push({
      id: `high-concentration-${Date.now()}`,
      type: 'high_concentration',
      severity: mostDangerous.intensity >= 0.9 ? 'critical' : 'warning',
      title: 'High Crowd Concentration',
      message: `${dangerousClusters.length} high-density zone${dangerousClusters.length > 1 ? 's' : ''} detected`,
      prediction: `Risk of crowd crush if concentration continues`,
      timeToImpact: 5,
      timestamp: new Date(),
      zone: { x: mostDangerous.x, y: mostDangerous.y, radius: 50 },
    });
  }
  
  // 4. Check capacity warning
  const capacityPercent = (currentSnapshot.peopleCount / estimatedCapacity) * 100;
  if (capacityPercent >= config.capacityWarningPercent) {
    const predictedCount = predictFutureCount(history, config.predictionWindowMinutes);
    const predictedCapacityPercent = (predictedCount / estimatedCapacity) * 100;
    
    alerts.push({
      id: `capacity-warning-${Date.now()}`,
      type: 'capacity_warning',
      severity: capacityPercent >= 95 ? 'critical' : 'warning',
      title: 'Venue Capacity Warning',
      message: `Currently at ${Math.round(capacityPercent)}% capacity (${currentSnapshot.peopleCount}/${estimatedCapacity})`,
      prediction: predictedCapacityPercent > 100 
        ? `Will exceed capacity in approximately ${Math.round((estimatedCapacity - currentSnapshot.peopleCount) / growthRate)} minutes`
        : `Projected ${Math.round(predictedCapacityPercent)}% in ${config.predictionWindowMinutes} minutes`,
      timeToImpact: growthRate > 0 ? Math.round((estimatedCapacity - currentSnapshot.peopleCount) / growthRate) : config.predictionWindowMinutes,
      timestamp: new Date(),
    });
  }
  
  // 5. Check for bottleneck patterns (multiple high-density clusters in a line)
  if (clusters.length >= 3) {
    const sortedByX = [...clusters].sort((a, b) => a.x - b.x);
    const avgY = sortedByX.reduce((sum, c) => sum + c.y, 0) / sortedByX.length;
    const yVariance = sortedByX.reduce((sum, c) => sum + Math.pow(c.y - avgY, 2), 0) / sortedByX.length;
    
    // If clusters are roughly aligned (low y variance), it might be a bottleneck
    if (yVariance < 1000) {
      alerts.push({
        id: `bottleneck-${Date.now()}`,
        type: 'bottleneck',
        severity: 'warning',
        title: 'Potential Bottleneck Detected',
        message: `Linear crowd formation detected - possible exit/entry congestion`,
        prediction: `Flow restriction may cause backup in 5-7 minutes`,
        timeToImpact: 6,
        timestamp: new Date(),
      });
    }
  }
  
  return alerts;
}

export function generateSnapshotFromDetections(
  peopleCount: number,
  heatmapData: number[][] | null,
  imageWidth: number,
  imageHeight: number
): CrowdSnapshot {
  const hotspots: { x: number; y: number; intensity: number }[] = [];
  
  if (heatmapData) {
    const maxValue = Math.max(...heatmapData.flat());
    const cellWidth = imageWidth / heatmapData[0].length;
    const cellHeight = imageHeight / heatmapData.length;
    
    for (let row = 0; row < heatmapData.length; row++) {
      for (let col = 0; col < heatmapData[row].length; col++) {
        const intensity = maxValue > 0 ? heatmapData[row][col] / maxValue : 0;
        if (intensity > 0.3) {
          hotspots.push({
            x: col * cellWidth + cellWidth / 2,
            y: row * cellHeight + cellHeight / 2,
            intensity,
          });
        }
      }
    }
  }
  
  const area = imageWidth * imageHeight;
  const density = area > 0 ? peopleCount / (area / 10000) : 0; // per 100x100 unit
  
  return {
    timestamp: new Date(),
    peopleCount,
    density,
    hotspots,
  };
}
