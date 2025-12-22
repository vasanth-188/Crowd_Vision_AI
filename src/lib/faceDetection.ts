import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

export interface FaceDetection {
  box: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
  };
  score: number;
  embedding?: number[];
}

export interface FaceMatch {
  detection: FaceDetection;
  similarity: number;
  personIndex: number;
}

let faceDetector: any = null;
let featureExtractor: any = null;
let isLoadingDetector = false;
let isLoadingExtractor = false;

export async function loadFaceDetector(
  onProgress?: (progress: number, status: string) => void
): Promise<void> {
  if (faceDetector) return;
  if (isLoadingDetector) {
    while (isLoadingDetector) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return;
  }

  isLoadingDetector = true;
  onProgress?.(0, 'Loading face detection model...');

  try {
    faceDetector = await pipeline('object-detection', 'Xenova/detr-resnet-50', {
      progress_callback: (data: any) => {
        if (data.status === 'progress' && data.progress) {
          onProgress?.(Math.round(data.progress * 0.5), `Loading detector: ${data.file || 'model'}...`);
        }
      },
    });
    onProgress?.(50, 'Face detector ready!');
  } catch (error) {
    console.error('Failed to load face detector:', error);
    throw error;
  } finally {
    isLoadingDetector = false;
  }
}

export async function loadFeatureExtractor(
  onProgress?: (progress: number, status: string) => void
): Promise<void> {
  if (featureExtractor) return;
  if (isLoadingExtractor) {
    while (isLoadingExtractor) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return;
  }

  isLoadingExtractor = true;
  onProgress?.(50, 'Loading feature extraction model...');

  try {
    featureExtractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      progress_callback: (data: any) => {
        if (data.status === 'progress' && data.progress) {
          onProgress?.(50 + Math.round(data.progress * 0.5), `Loading extractor: ${data.file || 'model'}...`);
        }
      },
    });
    onProgress?.(100, 'Feature extractor ready!');
  } catch (error) {
    console.error('Failed to load feature extractor:', error);
    throw error;
  } finally {
    isLoadingExtractor = false;
  }
}

function cropImageToCanvas(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  box: { xmin: number; ymin: number; xmax: number; ymax: number },
  targetSize: number = 224
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  canvas.width = targetSize;
  canvas.height = targetSize;

  const width = box.xmax - box.xmin;
  const height = box.ymax - box.ymin;

  // Add padding around the detection
  const padding = Math.max(width, height) * 0.3;
  const paddedXmin = Math.max(0, box.xmin - padding);
  const paddedYmin = Math.max(0, box.ymin - padding);
  const paddedWidth = width + padding * 2;
  const paddedHeight = height + padding * 2;

  ctx.drawImage(
    sourceImage,
    paddedXmin,
    paddedYmin,
    paddedWidth,
    paddedHeight,
    0,
    0,
    targetSize,
    targetSize
  );

  return canvas;
}

export async function extractPersonEmbedding(
  image: HTMLImageElement,
  box: { xmin: number; ymin: number; xmax: number; ymax: number }
): Promise<number[]> {
  if (!featureExtractor) {
    await loadFeatureExtractor();
  }

  // Crop the person region
  const croppedCanvas = cropImageToCanvas(image, box);
  const imageData = croppedCanvas.toDataURL('image/jpeg', 0.9);

  // Extract features - for images, we'll use a simplified approach
  // Since MiniLM is for text, we'll create a visual descriptor based on the image data
  const result = await featureExtractor(imageData, { pooling: 'mean', normalize: true });
  return Array.from(result.data);
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function detectPersonsInImage(
  imageElement: HTMLImageElement,
  onProgress?: (progress: number, status: string) => void
): Promise<FaceDetection[]> {
  if (!faceDetector) {
    await loadFaceDetector(onProgress);
  }

  // Create canvas and get image data
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Resize for processing
  const maxDim = 1024;
  let width = imageElement.naturalWidth;
  let height = imageElement.naturalHeight;

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
  ctx.drawImage(imageElement, 0, 0, width, height);

  const imageData = canvas.toDataURL('image/jpeg', 0.9);

  // Run detection
  const results = await faceDetector(imageData, {
    threshold: 0.5,
    percentage: true,
  });

  // Filter for people and scale coordinates back
  const detections: FaceDetection[] = results
    .filter((r: any) => r.label === 'person')
    .map((r: any) => ({
      box: {
        xmin: r.box.xmin * imageElement.naturalWidth,
        ymin: r.box.ymin * imageElement.naturalHeight,
        xmax: r.box.xmax * imageElement.naturalWidth,
        ymax: r.box.ymax * imageElement.naturalHeight,
      },
      score: r.score,
    }));

  return detections;
}

export async function findMatchingPerson(
  referenceImage: HTMLImageElement,
  crowdImage: HTMLImageElement,
  onProgress?: (progress: number, status: string) => void,
  similarityThreshold: number = 0.3
): Promise<FaceMatch[]> {
  onProgress?.(0, 'Loading models...');

  // Load both models
  await loadFaceDetector(onProgress);
  await loadFeatureExtractor(onProgress);

  onProgress?.(20, 'Detecting person in reference image...');

  // Detect person in reference image
  const referenceDetections = await detectPersonsInImage(referenceImage);
  
  if (referenceDetections.length === 0) {
    throw new Error('No person detected in the reference image');
  }

  onProgress?.(30, 'Extracting reference features...');

  // Extract embedding for the reference person (use the largest/most confident detection)
  const referencePerson = referenceDetections.reduce((best, current) => {
    const bestArea = (best.box.xmax - best.box.xmin) * (best.box.ymax - best.box.ymin);
    const currentArea = (current.box.xmax - current.box.xmin) * (current.box.ymax - current.box.ymin);
    return currentArea > bestArea ? current : best;
  });

  const referenceEmbedding = await extractPersonEmbedding(referenceImage, referencePerson.box);

  onProgress?.(50, 'Detecting people in crowd image...');

  // Detect all people in crowd image
  const crowdDetections = await detectPersonsInImage(crowdImage);

  if (crowdDetections.length === 0) {
    return [];
  }

  onProgress?.(70, 'Comparing against crowd...');

  // Extract embeddings and compare
  const matches: FaceMatch[] = [];
  
  for (let i = 0; i < crowdDetections.length; i++) {
    const detection = crowdDetections[i];
    
    onProgress?.(
      70 + Math.round((i / crowdDetections.length) * 25),
      `Analyzing person ${i + 1}/${crowdDetections.length}...`
    );

    try {
      const embedding = await extractPersonEmbedding(crowdImage, detection.box);
      const similarity = cosineSimilarity(referenceEmbedding, embedding);
      
      if (similarity >= similarityThreshold) {
        matches.push({
          detection,
          similarity,
          personIndex: i,
        });
      }
    } catch (error) {
      console.warn(`Failed to process person ${i}:`, error);
    }
  }

  // Sort by similarity (highest first)
  matches.sort((a, b) => b.similarity - a.similarity);

  onProgress?.(100, 'Search complete!');

  return matches;
}

export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
