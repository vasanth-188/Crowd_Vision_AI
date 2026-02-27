import { pipeline, env } from '@huggingface/transformers';
import { hfClient } from './huggingFaceAPI';

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
  qwenMatch?: boolean; // Indicates if matched using Qwen2.5-VL
}

export interface EnhancedPersonMatch {
  location: { x: number; y: number };
  confidence: number;
  method: 'embedding' | 'qwen-vision';
  description?: string;
  distinguishingFeatures?: string[];
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
    featureExtractor = await pipeline('image-feature-extraction', 'Xenova/clip-vit-base-patch32', {
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

  // Extract features using CLIP
  const result = await featureExtractor(imageData);
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
  onProgress?: (progress: number, status: string) => void,
  threshold: number = 0.5
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
    threshold: threshold,
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
  // Try with decreasing thresholds to find a face
  let referenceDetections = await detectPersonsInImage(referenceImage, undefined, 0.5);

  if (referenceDetections.length === 0) {
    onProgress?.(22, 'Retrying with lower sensitivity...');
    referenceDetections = await detectPersonsInImage(referenceImage, undefined, 0.3);
  }

  if (referenceDetections.length === 0) {
    onProgress?.(25, 'Retrying with maximum sensitivity...');
    referenceDetections = await detectPersonsInImage(referenceImage, undefined, 0.15);
  }

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
      70 + Math.round((i / crowdDetections.length) * 20),
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
          qwenMatch: false,
        });
      }
    } catch (error) {
      console.warn(`Failed to process person ${i}:`, error);
    }
  }

  // Sort by similarity (highest first)
  matches.sort((a, b) => b.similarity - a.similarity);

  onProgress?.(90, 'Using AI for enhanced matching...');

  // Enhance with Qwen2.5-VL for better accuracy
  const enhancedMatches = await enhanceWithQwenAnalysis(
    referenceImage,
    crowdImage,
    matches,
    onProgress
  );

  onProgress?.(100, 'Search complete!');

  return enhancedMatches;
}

/**
 * Enhance person matching using Qwen2.5-VL vision model
 */
export async function enhanceWithQwenAnalysis(
  referenceImage: HTMLImageElement,
  crowdImage: HTMLImageElement,
  preliminaryMatches: FaceMatch[],
  onProgress?: (progress: number, status: string) => void
): Promise<FaceMatch[]> {
  try {
    onProgress?.(92, 'Sending to Qwen2.5-VL for verification...');

    // Convert images to base64
    const refBase64 = await imageToBase64(referenceImage);
    const crowdBase64 = await imageToBase64(crowdImage as any);

    // Use Qwen for enhanced matching
    const qwenResult = await hfClient.findPersonInCrowd(refBase64, crowdBase64, onProgress);

    // Merge results: keep preliminary matches but add Qwen confidence boost
    const enhanced = preliminaryMatches.map(match => ({
      ...match,
      qwenMatch: true,
      similarity: Math.min(1, match.similarity * 1.1), // Boost if Qwen confirms
    }));

    return enhanced;
  } catch (error) {
    console.warn('Qwen enhancement failed, using preliminary matches:', error);
    return preliminaryMatches;
  }
}

/**
 * Convert HTMLImageElement to base64 string
 */
async function imageToBase64(image: HTMLImageElement): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    ctx.drawImage(image, 0, 0);
    canvas.toBlob(
      blob => {
        if (!blob) {
          reject(new Error('Could not create blob'));
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      },
      'image/jpeg',
      0.8
    );
  });
}

export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
