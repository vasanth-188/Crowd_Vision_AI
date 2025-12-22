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
}

export interface DetectionResult {
  detections: Detection[];
  peopleCount: number;
  processingTime: number;
  imageWidth: number;
  imageHeight: number;
}

let detector: any = null;
let isLoading = false;

export async function loadDetector(
  onProgress?: (progress: number, status: string) => void
): Promise<void> {
  if (detector) {
    onProgress?.(100, 'Model ready');
    return;
  }
  if (isLoading) {
    // Wait for existing load
    while (isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    onProgress?.(100, 'Model ready');
    return;
  }

  isLoading = true;
  onProgress?.(0, 'Initializing model...');

  try {
    detector = await pipeline('object-detection', 'Xenova/detr-resnet-50', {
      // Explicit dtype to prevent default-warnings on wasm
      dtype: 'q8',
      progress_callback: (data: any) => {
        if (data.status === 'progress' && data.progress) {
          onProgress?.(Math.round(data.progress), `Loading ${data.file || 'model'}...`);
        } else if (data.status === 'done') {
          onProgress?.(100, 'Model loaded!');
        }
      },
    });
    onProgress?.(100, 'Ready!');
  } catch (error) {
    console.error('Failed to load detector:', error);
    throw error;
  } finally {
    isLoading = false;
  }
}

type ImageSource = HTMLImageElement | HTMLCanvasElement | ImageBitmap;

export async function detectPeople(
  imageSource: ImageSource,
  onProgress?: (progress: number, status: string) => void,
  options?: { threshold?: number; isLive?: boolean }
): Promise<DetectionResult> {
  const startTime = performance.now();

  // Ensure detector is loaded
  if (!detector) {
    await loadDetector(onProgress);
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

  // Resize for processing: live mode uses 480px (faster), static mode uses 1024px (more accurate)
  const maxDim = options?.isLive ? 480 : 1024;
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

  // Get image as base64
  const imageData = canvas.toDataURL('image/jpeg', 0.9);

  onProgress?.(70, 'Running detection...');

  // Run detection
  const results = await detector(imageData, {
    threshold: options?.threshold ?? 0.5,
    percentage: true,
  });

  onProgress?.(90, 'Processing results...');

  // Filter for people only
  const peopleDetections: Detection[] = results
    .filter((r: any) => r.label === 'person')
    .map((r: any) => ({
      label: r.label,
      score: r.score,
      box: {
        xmin: r.box.xmin * srcWidth,
        ymin: r.box.ymin * srcHeight,
        xmax: r.box.xmax * srcWidth,
        ymax: r.box.ymax * srcHeight,
      },
    }));

  const processingTime = performance.now() - startTime;

  onProgress?.(100, 'Complete!');

  return {
    detections: peopleDetections,
    peopleCount: peopleDetections.length,
    processingTime,
    imageWidth: srcWidth,
    imageHeight: srcHeight,
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

    // Add to center cell and nearby cells with falloff
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const r = row + dy;
        const c = col + dx;
        if (r >= 0 && r < rows && c >= 0 && c < cols) {
          const distance = Math.sqrt(dx * dx + dy * dy);
          const weight = Math.max(0, 1 - distance / 3);
          grid[r][c] += weight;
        }
      }
    }
  }

  return grid;
}

export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}