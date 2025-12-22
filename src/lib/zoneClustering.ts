import { Detection } from './crowdDetection';

export interface DynamicZone {
  id: string;
  name: string;
  centroid: { x: number; y: number };
  bounds: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
  };
  detectionCount: number;
  density: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Calculate distance between two points
 */
function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * K-means clustering algorithm to group detections into zones
 */
function kMeansClustering(
  points: Array<{ x: number; y: number }>,
  k: number,
  maxIterations: number = 20
): Array<{ centroid: { x: number; y: number }; points: Array<{ x: number; y: number }> }> {
  if (points.length === 0) return [];
  if (points.length <= k) {
    // If we have fewer points than clusters, return each point as its own cluster
    return points.map((point) => ({
      centroid: point,
      points: [point],
    }));
  }

  // Initialize centroids randomly from existing points
  const centroids = points
    .slice()
    .sort(() => Math.random() - 0.5)
    .slice(0, k);

  let assignments: number[] = new Array(points.length).fill(0);

  for (let iter = 0; iter < maxIterations; iter++) {
    // Assign each point to nearest centroid
    let changed = false;
    points.forEach((point, i) => {
      let minDist = Infinity;
      let closestCentroid = 0;

      centroids.forEach((centroid, j) => {
        const dist = distance(point.x, point.y, centroid.x, centroid.y);
        if (dist < minDist) {
          minDist = dist;
          closestCentroid = j;
        }
      });

      if (assignments[i] !== closestCentroid) {
        assignments[i] = closestCentroid;
        changed = true;
      }
    });

    if (!changed) break;

    // Recalculate centroids
    centroids.forEach((_, j) => {
      const clusterPoints = points.filter((_, i) => assignments[i] === j);
      if (clusterPoints.length > 0) {
        centroids[j] = {
          x: clusterPoints.reduce((sum, p) => sum + p.x, 0) / clusterPoints.length,
          y: clusterPoints.reduce((sum, p) => sum + p.y, 0) / clusterPoints.length,
        };
      }
    });
  }

  // Build result
  const clusters = centroids.map((centroid) => ({
    centroid,
    points: [] as Array<{ x: number; y: number }>,
  }));

  points.forEach((point, i) => {
    clusters[assignments[i]].points.push(point);
  });

  return clusters.filter((cluster) => cluster.points.length > 0);
}

/**
 * Auto-detect zones from detections using clustering
 */
export function autoDetectZones(
  detections: Detection[],
  imageWidth: number,
  imageHeight: number,
  numZones: number = 5
): DynamicZone[] {
  if (detections.length === 0) {
    return [];
  }

  // Convert detections to normalized points (0-1 range)
  const points = detections.map((det) => ({
    x: (det.box.xmin + det.box.xmax) / 2 / imageWidth,
    y: (det.box.ymin + det.box.ymax) / 2 / imageHeight,
  }));

  // Adjust number of zones based on detection count
  const adjustedNumZones = Math.min(numZones, Math.max(1, Math.ceil(detections.length / 3)));

  // Perform clustering
  const clusters = kMeansClustering(points, adjustedNumZones);

  // Convert clusters to zones
  const zones: DynamicZone[] = clusters
    .sort((a, b) => b.points.length - a.points.length) // Sort by density
    .map((cluster, index) => {
      const pointsInCluster = cluster.points;
      const count = pointsInCluster.length;

      // Calculate bounds with padding
      const padding = 0.08; // 8% padding
      const xCoords = pointsInCluster.map((p) => p.x);
      const yCoords = pointsInCluster.map((p) => p.y);

      const xmin = Math.max(0, Math.min(...xCoords) - padding);
      const xmax = Math.min(1, Math.max(...xCoords) + padding);
      const ymin = Math.max(0, Math.min(...yCoords) - padding);
      const ymax = Math.min(1, Math.max(...yCoords) + padding);

      // Determine density level
      const totalDetections = detections.length;
      const percentage = (count / totalDetections) * 100;
      let density: 'low' | 'medium' | 'high' | 'critical';
      if (percentage < 15) density = 'low';
      else if (percentage < 30) density = 'medium';
      else if (percentage < 50) density = 'high';
      else density = 'critical';

      // Generate descriptive name
      const densityLabels = {
        low: 'Sparse',
        medium: 'Moderate',
        high: 'Dense',
        critical: 'Critical',
      };

      const name = `${densityLabels[density]} Zone ${index + 1}`;

      return {
        id: `zone_${index}`,
        name,
        centroid: cluster.centroid,
        bounds: { xmin, ymin, xmax, ymax },
        detectionCount: count,
        density,
      };
    });

  return zones;
}

/**
 * Get detections within a dynamic zone
 */
export function getDetectionsInDynamicZone(
  detections: Detection[],
  zone: DynamicZone,
  imageWidth: number,
  imageHeight: number
): Detection[] {
  return detections.filter((detection) => {
    const centerX = (detection.box.xmin + detection.box.xmax) / 2 / imageWidth;
    const centerY = (detection.box.ymin + detection.box.ymax) / 2 / imageHeight;

    return (
      centerX >= zone.bounds.xmin &&
      centerX <= zone.bounds.xmax &&
      centerY >= zone.bounds.ymin &&
      centerY <= zone.bounds.ymax
    );
  });
}
