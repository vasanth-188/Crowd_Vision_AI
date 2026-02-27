/**
 * Deep Scene Analysis Module
 * Uses Qwen2.5-VL for human-like context understanding of crowd scenes
 */

import { hfClient, HFSceneAnalysisResult } from './huggingFaceAPI';
import type { Detection, DetectionResult } from './crowdDetection';

export interface SceneAnalysisInput {
  image: HTMLImageElement | HTMLCanvasElement;
  detectionResult: DetectionResult;
  enableDetailedAnalysis?: boolean;
}

export interface CrowdContext {
  mood: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  behaviors: string[];
  anomalies: string[];
  recommendations: string[];
  timestamp: number;
}

/**
 * Analyze crowd scene for contextual insights
 */
export async function analyzeSceneContext(
  input: SceneAnalysisInput,
  onProgress?: (progress: number, status: string) => void
): Promise<CrowdContext> {
  onProgress?.(10, 'Preparing image for analysis...');

  try {
    // Convert image to base64
    const imageBase64 = await imageToBase64(input.image);

    onProgress?.(20, 'Sending to Qwen2.5-VL...');

    // Call Qwen API for analysis
    const analysis = await hfClient.analyzeScene(
      imageBase64,
      input.detectionResult.peopleCount,
      onProgress
    );

    onProgress?.(85, 'Processing analysis results...');

    // Convert analysis to context
    const context = parseAnalysisToContext(analysis, input.detectionResult);

    onProgress?.(100, 'Analysis complete!');

    return context;
  } catch (error) {
    console.error('Scene analysis error:', error);
    return getDefaultContext();
  }
}

/**
 * Analyze specific individuals in crowd
 */
export async function analyzeIndividuals(
  detections: Detection[],
  imageData: string,
  onProgress?: (progress: number, status: string) => void
): Promise<Array<{ detection: Detection; behavior: string; riskLevel: string }>> {
  const results: Array<{ detection: Detection; behavior: string; riskLevel: string }> = [];

  // Limit to top detections for performance
  const topDetections = detections.slice(0, 5);

  for (let i = 0; i < topDetections.length; i++) {
    onProgress?.(Math.round((i / topDetections.length) * 80), `Analyzing individual ${i + 1}...`);

    // Simulate individual analysis (in production, crop and analyze)
    const behavior = analyzeDetectionBehavior(topDetections[i]);
    const riskLevel = assessRiskLevel(behavior, topDetections[i].score);

    results.push({
      detection: topDetections[i],
      behavior,
      riskLevel,
    });
  }

  onProgress?.(100, 'Individual analysis complete!');
  return results;
}

/**
 * Detect anomalies in crowd behavior
 */
export function detectAnomalies(
  detections: Detection[],
  heatmapData: number[][],
  previousFrame?: Detection[]
): Array<{
  type: string;
  severity: 'low' | 'medium' | 'high';
  location: { x: number; y: number };
  description: string;
}> {
  const anomalies: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    location: { x: number; y: number };
    description: string;
  }> = [];

  // Check for sudden density spikes
  const densitySpikes = findDensitySpikes(heatmapData);
  for (const spike of densitySpikes) {
    anomalies.push({
      type: 'density_spike',
      severity: 'high',
      location: spike.location,
      description: `Sudden crowd surge at grid position [${spike.row}, ${spike.col}]`,
    });
  }

  // Check for isolated individuals
  if (previousFrame && detections.length > 0) {
    const isolated = findIsolatedPersons(detections, previousFrame);
    for (const person of isolated) {
      anomalies.push({
        type: 'isolated_person',
        severity: 'medium',
        location: {
          x: (person.box.xmin + person.box.xmax) / 2,
          y: (person.box.ymin + person.box.ymax) / 2,
        },
        description: 'Individual moving counter to crowd flow',
      });
    }
  }

  return anomalies;
}

// ============ Helper Functions ============

/**
 * Convert image to base64 string
 */
async function imageToBase64(image: HTMLImageElement | HTMLCanvasElement): Promise<string> {
  let canvas: HTMLCanvasElement;

  if (image instanceof HTMLCanvasElement) {
    canvas = image;
  } else {
    canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    ctx.drawImage(image, 0, 0);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
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

/**
 * Parse HF analysis to CrowdContext
 */
function parseAnalysisToContext(analysis: HFSceneAnalysisResult, detectionResult: DetectionResult): CrowdContext {
  const riskLevel = calculateRiskLevel(
    analysis,
    detectionResult.metadata?.crowdDensity
  );

  return {
    mood: analysis.crowdMood || 'neutral',
    riskLevel,
    behaviors: analysis.behaviorPatterns || [],
    anomalies: analysis.anomalies || [],
    recommendations: analysis.recommendations || [],
    timestamp: Date.now(),
  };
}

/**
 * Get default context when analysis fails
 */
function getDefaultContext(): CrowdContext {
  return {
    mood: 'unknown',
    riskLevel: 'low',
    behaviors: [],
    anomalies: [],
    recommendations: [],
    timestamp: Date.now(),
  };
}

/**
 * Calculate risk level based on analysis
 */
function calculateRiskLevel(
  analysis: HFSceneAnalysisResult,
  density?: string
): 'low' | 'medium' | 'high' | 'critical' {
  let risk: 'low' | 'medium' | 'high' | 'critical' = 'low';

  if (analysis.riskFactors && analysis.riskFactors.length > 0) {
    risk = 'medium';
  }

  if (density === 'very-high') {
    risk = 'high';
  }

  if ((analysis.anomalies && analysis.anomalies.length > 2) || analysis.crowdMood === 'chaotic') {
    risk = 'critical';
  }

  return risk;
}

/**
 * Analyze individual detection behavior
 */
function analyzeDetectionBehavior(detection: Detection): string {
  // Based on confidence and size
  const confidence = detection.confidence || detection.score;

  if (confidence > 0.9) {
    return 'stable';
  } else if (confidence > 0.7) {
    return 'normal';
  } else {
    return 'uncertain';
  }
}

/**
 * Assess risk level for individual
 */
function assessRiskLevel(behavior: string, confidence: number): string {
  if (behavior === 'unstable' || confidence < 0.5) {
    return 'high';
  } else if (behavior === 'normal') {
    return 'low';
  }
  return 'medium';
}

/**
 * Find density spikes in heatmap
 */
function findDensitySpikes(
  heatmapData: number[][]
): Array<{ row: number; col: number; location: { x: number; y: number } }> {
  const spikes: Array<{ row: number; col: number; location: { x: number; y: number } }> = [];
  const threshold = 5; // Spike threshold

  for (let r = 0; r < heatmapData.length; r++) {
    for (let c = 0; c < heatmapData[r].length; c++) {
      if (heatmapData[r][c] > threshold) {
        // Check if it's a local maximum
        let isLocalMax = true;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < heatmapData.length && nc >= 0 && nc < heatmapData[nr].length) {
              if (heatmapData[nr][nc] > heatmapData[r][c]) {
                isLocalMax = false;
                break;
              }
            }
          }
          if (!isLocalMax) break;
        }

        if (isLocalMax) {
          spikes.push({
            row: r,
            col: c,
            location: { x: c * 20, y: r * 20 }, // Assuming 20px grid
          });
        }
      }
    }
  }

  return spikes;
}

/**
 * Find individuals isolated from main crowd
 */
function findIsolatedPersons(current: Detection[], previous: Detection[]): Detection[] {
  const isolated: Detection[] = [];

  for (const person of current) {
    // Find closest match in previous frame
    let closest: { detection: Detection; distance: number } | null = null;

    for (const prevPerson of previous) {
      const distance = Math.hypot(
        person.box.xmin - prevPerson.box.xmin,
        person.box.ymin - prevPerson.box.ymin
      );

      if (!closest || distance < closest.distance) {
        closest = { detection: prevPerson, distance };
      }
    }

    // If moved significantly or no match, likely isolated
    if (!closest || closest.distance > 100) {
      isolated.push(person);
    }
  }

  return isolated;
}
