import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

export interface Detection {
  label: string;
  score: number;
  box: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
  };
  trackingId?: string;
  confidence?: number;
}

export interface DetectionResult {
  detections: Detection[];
  peopleCount: number;
  processingTime: number;
  imageWidth: number;
  imageHeight: number;
  metadata?: {
    modelUsed: string;
    fps?: number;
    crowdDensity?: 'low' | 'medium' | 'high' | 'very-high';
  };
}

export type DetectionModel = 'detr-resnet-50' | 'yolov8' | 'auto';

export interface DetectionConfig {
  model?: DetectionModel;
  threshold?: number;
  isLive?: boolean;
  enableTracking?: boolean;
  optimizeForSpeed?: boolean;
}

let detector: any = null;
let isLoading = false;
let currentModel: DetectionModel = 'detr-resnet-50';
let trackingMap = new Map<string, Detection>();

export async function loadDetector(
  onProgress?: (progress: number, status: string) => void,
  config?: DetectionConfig
): Promise<void> {
  const modelToLoad = config?.model || 'detr-resnet-50';
  
  if (detector && currentModel === modelToLoad) {
    onProgress?.(100, 'Model ready');
    return;
  }
  
  if (isLoading) {
    while (isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    onProgress?.(100, 'Model ready');
    return;
  }

  isLoading = true;
  onProgress?.(0, 'Initializing model...');

  try {
    let modelName: string;
    
    switch (modelToLoad) {
      case 'yolov8':
        modelName = 'Xenova/yolov8n';
        break;
      case 'detr-resnet-50':
      default:
        modelName = 'Xenova/detr-resnet-50';
        break;
    }

    onProgress?.(10, `Loading ${modelToLoad} model...`);

    detector = await pipeline('object-detection', modelName, {
      dtype: config?.optimizeForSpeed ? 'q4' : 'q8',
      progress_callback: (data: any) => {
        if (data.status === 'progress' && data.progress) {
          const progress = Math.round(data.progress);
          onProgress?.(10 + (progress * 0.8), `Loading ${data.file || 'model'}...`);
        } else if (data.status === 'done') {
          onProgress?.(95, 'Model loaded!');
        }
      },
    });
    
    currentModel = modelToLoad;
    onProgress?.(100, `${modelToLoad} ready!`);
  } catch (error) {
    console.error('Failed to load detector:', error);
    detector = null;
    throw error;
  } finally {
    isLoading = false;
  }
}

type ImageSource = HTMLImageElement | HTMLCanvasElement | ImageBitmap;

function calculateIoU(box1: Detection['box'], box2: Detection['box']): number {
  const x1 = Math.max(box1.xmin, box2.xmin);
  const y1 = Math.max(box1.ymin, box2.ymin);
  const x2 = Math.min(box1.xmax, box2.xmax);
  const y2 = Math.min(box1.ymax, box2.ymax);

  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const area1 = (box1.xmax - box1.xmin) * (box1.ymax - box1.ymin);
  const area2 = (box2.xmax - box2.xmin) * (box2.ymax - box2.ymin);
  const union = area1 + area2 - intersection;

  return union > 0 ? intersection / union : 0;
}

function assignTrackingIds(detections: Detection[], enableTracking: boolean): Detection[] {
  if (!enableTracking) return detections;

  const trackedDetections: Detection[] = [];
  const usedIds = new Set<string>();

  for (const detection of detections) {
    let bestMatch: { id: string; iou: number } | null = null;

    for (const [id, prevDetection] of trackingMap.entries()) {
      const iou = calculateIoU(detection.box, prevDetection.box);
      if (iou > 0.3 && (!bestMatch || iou > bestMatch.iou)) {
        bestMatch = { id, iou };
      }
    }

    if (bestMatch && !usedIds.has(bestMatch.id)) {
      detection.trackingId = bestMatch.id;
      usedIds.add(bestMatch.id);
    } else {
      detection.trackingId = `person_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    trackedDetections.push(detection);
  }

  trackingMap.clear();
  for (const detection of trackedDetections) {
    if (detection.trackingId) {
      trackingMap.set(detection.trackingId, detection);
    }
  }

  return trackedDetections;
}

function calculateCrowdDensity(peopleCount: number, imageArea: number): 'low' | 'medium' | 'high' | 'very-high' {
  const density = peopleCount / (imageArea / 1000000);
  
  if (density < 5) return 'low';
  if (density < 15) return 'medium';
  if (density < 30) return 'high';
  return 'very-high';
}

export async function detectPeople(
  imageSource: ImageSource,
  onProgress?: (progress: number, status: string) => void,
  options?: DetectionConfig
): Promise<DetectionResult> {
  const startTime = performance.now();

  if (!detector || (options?.model && currentModel !== options.model)) {
    await loadDetector(onProgress, options);
  }

  onProgress?.(50, 'Analyzing image...');

  // Determine source dimensions
  const srcWidth = imageSource instanceof HTMLImageElement
    ? imageSource.naturalWidth
    : (imageSource as HTMLCanvasElement | ImageBitmap).width;
  const srcHeight = imageSource instanceof HTMLImageElement
    ? imageSource.naturalHeight
    : (imageSource as HTMLCanvasElement | ImageBitmap).height;

  // Create canvas and get image data
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Dynamic resolution based on mode and optimization
  let maxDim: number;
  if (options?.optimizeForSpeed) {
    maxDim = 320;
  } else if (options?.isLive) {
    maxDim = 480;
  } else {
    maxDim = 1024;
  }
  
  let width = srcWidth;
  let height = srcHeight;

  if (width > maxDim || height > maxDim) {
    if (width > height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(imageSource as CanvasImageSource, 0, 0, width, height);

  const imageData = canvas.toDataURL('image/jpeg', options?.optimizeForSpeed ? 0.7 : 0.9);

  onProgress?.(70, 'Running detection...');

  const threshold = options?.threshold ?? (options?.isLive ? 0.4 : 0.5);
  
  const results = await detector(imageData, {
    threshold,
    percentage: true,
  });

  onProgress?.(90, 'Processing results...');

  let peopleDetections: Detection[] = results
    .filter((r: any) => r.label === 'person')
    .map((r: any) => ({
      label: r.label,
      score: r.score,
      confidence: r.score,
      box: {
        xmin: r.box.xmin * srcWidth,
        ymin: r.box.ymin * srcHeight,
        xmax: r.box.xmax * srcWidth,
        ymax: r.box.ymax * srcHeight,
      },
    }));

  if (options?.enableTracking) {
    peopleDetections = assignTrackingIds(peopleDetections, true);
  }

  const processingTime = performance.now() - startTime;
  const imageArea = srcWidth * srcHeight;
  const crowdDensity = calculateCrowdDensity(peopleDetections.length, imageArea);

  onProgress?.(100, 'Complete!');

  return {
    detections: peopleDetections,
    peopleCount: peopleDetections.length,
    processingTime,
    imageWidth: srcWidth,
    imageHeight: srcHeight,
    metadata: {
      modelUsed: currentModel,
      fps: options?.isLive ? Math.round(1000 / processingTime) : undefined,
      crowdDensity,
    },
  };
}

export function generateHeatmapData(
  detections: Detection[],
  imageWidth: number,
  imageHeight: number,
  gridSize: number = 20
): number[][] {
  const cols = Math.ceil(imageWidth / gridSize);
  const rows = Math.ceil(imageHeight / gridSize);
  const grid: number[][] = Array(rows).fill(null).map(() => Array(cols).fill(0));

  for (const detection of detections) {
    const centerX = (detection.box.xmin + detection.box.xmax) / 2;
    const centerY = (detection.box.ymin + detection.box.ymax) / 2;

    const col = Math.floor(centerX / gridSize);
    const row = Math.floor(centerY / gridSize);

    const radius = 3;
    
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const r = row + dy;
        const c = col + dx;
        if (r >= 0 && r < rows && c >= 0 && c < cols) {
          const distance = Math.sqrt(dx * dx + dy * dy);
          const sigma = radius / 2;
          const weight = Math.exp(-(distance * distance) / (2 * sigma * sigma));
          grid[r][c] += weight * (detection.confidence || detection.score);
        }
      }
    }
  }

  return grid;
}

export function detectHotspots(
  heatmapData: number[][],
  threshold: number = 2
): Array<{ row: number; col: number; density: number }> {
  const hotspots: Array<{ row: number; col: number; density: number }> = [];
  
  for (let r = 0; r < heatmapData.length; r++) {
    for (let c = 0; c < heatmapData[r].length; c++) {
      if (heatmapData[r][c] >= threshold) {
        hotspots.push({ row: r, col: c, density: heatmapData[r][c] });
      }
    }
  }
  
  return hotspots.sort((a, b) => b.density - a.density);
}

export function resetTracking(): void {
  trackingMap.clear();
}

export function getDetectorInfo(): {
  isLoaded: boolean;
  currentModel: DetectionModel;
  trackedObjects: number;
} {
  return {
    isLoaded: detector !== null,
    currentModel,
    trackedObjects: trackingMap.size,
  };
}

export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}