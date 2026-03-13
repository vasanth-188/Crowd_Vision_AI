import {
  detectPeople,
  loadDetector,
  type DetectionConfig,
  type DetectionResult,
} from '@/lib/crowdDetection';

export type DetectionProviderType = 'browser' | 'backend' | 'hybrid';

type ImageSource = HTMLImageElement | HTMLCanvasElement | ImageBitmap;

export interface DetectionProviderStatus {
  ready: boolean;
  loading: boolean;
  lastError?: string;
}

export interface DetectionProviderInfo {
  type: DetectionProviderType;
  model: string;
  fallbackEnabled: boolean;
}

export interface DetectionProvider {
  initialize(
    onProgress?: (progress: number, status: string) => void,
    config?: DetectionConfig
  ): Promise<void>;
  detect(
    imageSource: ImageSource,
    onProgress?: (progress: number, status: string) => void,
    options?: DetectionConfig
  ): Promise<DetectionResult>;
  getStatus(): DetectionProviderStatus;
  getInfo(): DetectionProviderInfo;
}

export class BrowserDetectionProvider implements DetectionProvider {
  private loading = false;
  private ready = false;
  private lastError?: string;

  async initialize(
    onProgress?: (progress: number, status: string) => void,
    config?: DetectionConfig
  ): Promise<void> {
    this.loading = true;
    this.lastError = undefined;

    try {
      await loadDetector(onProgress, config);
      this.ready = true;
    } catch (error) {
      this.ready = false;
      this.lastError = error instanceof Error ? error.message : 'Failed to initialize browser detector';
      throw error;
    } finally {
      this.loading = false;
    }
  }

  detect(
    imageSource: ImageSource,
    onProgress?: (progress: number, status: string) => void,
    options?: DetectionConfig
  ): Promise<DetectionResult> {
    return detectPeople(imageSource, onProgress, options);
  }

  getStatus(): DetectionProviderStatus {
    return {
      ready: this.ready,
      loading: this.loading,
      lastError: this.lastError,
    };
  }

  getInfo(): DetectionProviderInfo {
    return {
      type: 'browser',
      model: 'xenova-browser-transformers',
      fallbackEnabled: false,
    };
  }
}

interface BackendApiDetection {
  label: string;
  score: number;
  box: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
  };
  trackingId?: string;
}

interface BackendApiResponse {
  detections: BackendApiDetection[];
  peopleCount?: number;
  modelUsed?: string;
  processingTimeMs?: number;
}

export class BackendDetectionProvider implements DetectionProvider {
  private readonly endpoint: string;
  private readonly model?: string;
  private readonly timeoutMs: number;
  private loading = false;
  private ready = false;
  private lastError?: string;

  constructor(endpoint: string, model?: string, timeoutMs = 15000) {
    this.endpoint = endpoint;
    this.model = model;
    this.timeoutMs = timeoutMs;
  }

  async initialize(onProgress?: (progress: number, status: string) => void): Promise<void> {
    this.loading = true;
    this.lastError = undefined;

    try {
      onProgress?.(10, 'Checking backend detector...');
      const healthUrl = new URL('/health', this.endpoint).toString();
      const response = await fetch(healthUrl, { method: 'GET' });
      if (!response.ok) {
        throw new Error(`Backend detector health check failed (${response.status})`);
      }
      this.ready = true;
      onProgress?.(100, 'Backend detector ready');
    } catch (error) {
      this.ready = false;
      this.lastError = error instanceof Error ? error.message : 'Backend detector unavailable';
      throw error;
    } finally {
      this.loading = false;
    }
  }

  async detect(
    imageSource: ImageSource,
    onProgress?: (progress: number, status: string) => void,
    options?: DetectionConfig
  ): Promise<DetectionResult> {
    const startedAt = performance.now();

    onProgress?.(20, 'Preparing image for backend detection...');
    const normalized = normalizeImageSource(imageSource, 1600);
    const imageBase64 = normalized.canvas.toDataURL('image/jpeg', 0.95);

    onProgress?.(50, 'Running crowd detection...');
    const response = await this.runRequest({
      imageBase64,
      threshold: options?.threshold ?? 0.12,
      maxDetections: options?.denseCrowd ? 3000 : 1500,
      preferRecall: true,
      ...(this.model ? { model: this.model } : {}),
      cameraId: options?.isLive ? 'live-feed' : 'upload-analysis',
      enableTracking: options?.enableTracking ?? true,
    });

    onProgress?.(90, 'Processing backend results...');

    const detections = normalizeBackendDetections(response.detections);
    const processingTime =
      response.processingTimeMs !== undefined
        ? response.processingTimeMs
        : performance.now() - startedAt;

    onProgress?.(100, 'Complete!');

    return {
      detections,
      allDetections: detections,
      peopleCount: response.peopleCount ?? detections.length,
      processingTime,
      imageWidth: normalized.sourceWidth,
      imageHeight: normalized.sourceHeight,
      metadata: {
        modelUsed: response.modelUsed ?? this.model ?? 'backend-default',
      },
    };
  }

  getStatus(): DetectionProviderStatus {
    return {
      ready: this.ready,
      loading: this.loading,
      lastError: this.lastError,
    };
  }

  getInfo(): DetectionProviderInfo {
    return {
      type: 'backend',
      model: this.model ?? 'backend-default',
      fallbackEnabled: false,
    };
  }

  private async runRequest(payload: Record<string, unknown>): Promise<BackendApiResponse> {
    const controller = new AbortController();
    const timeoutHandle = window.setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const raw = await response.text();
        let detail = raw;
        try {
          const parsed = JSON.parse(raw) as { detail?: string };
          if (parsed?.detail) {
            detail = parsed.detail;
          }
        } catch {
          // Keep raw body when it is not JSON.
        }

        throw new Error(`Backend detection failed (${response.status}): ${detail}`);
      }

      const data = (await response.json()) as BackendApiResponse;
      if (!Array.isArray(data.detections)) {
        throw new Error('Invalid backend response: detections missing');
      }

      return data;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Backend detection failed';
      throw error;
    } finally {
      window.clearTimeout(timeoutHandle);
    }
  }
}

export class HybridDetectionProvider implements DetectionProvider {
  constructor(
    private readonly primary: DetectionProvider,
    private readonly fallback: DetectionProvider
  ) {}

  async initialize(
    onProgress?: (progress: number, status: string) => void,
    config?: DetectionConfig
  ): Promise<void> {
    try {
      await this.primary.initialize(onProgress, config);
    } catch {
      await this.fallback.initialize(onProgress, config);
    }
  }

  async detect(
    imageSource: ImageSource,
    onProgress?: (progress: number, status: string) => void,
    options?: DetectionConfig
  ): Promise<DetectionResult> {
    try {
      return await this.primary.detect(imageSource, onProgress, options);
    } catch (error) {
      console.warn('Primary provider failed, falling back to browser detection:', error);
      return this.fallback.detect(imageSource, onProgress, options);
    }
  }

  getStatus(): DetectionProviderStatus {
    const primaryStatus = this.primary.getStatus();
    const fallbackStatus = this.fallback.getStatus();
    return {
      ready: primaryStatus.ready || fallbackStatus.ready,
      loading: primaryStatus.loading || fallbackStatus.loading,
      lastError: primaryStatus.lastError || fallbackStatus.lastError,
    };
  }

  getInfo(): DetectionProviderInfo {
    const primaryInfo = this.primary.getInfo();
    return {
      type: 'hybrid',
      model: primaryInfo.model,
      fallbackEnabled: true,
    };
  }
}

function normalizeBackendDetections(detections: BackendApiDetection[]): DetectionResult['detections'] {
  return detections
    .filter((d) => d.label === 'person')
    .map((d) => ({
      label: d.label,
      score: d.score,
      confidence: d.score,
      box: d.box,
      trackingId: d.trackingId,
    }));
}

function normalizeImageSource(imageSource: ImageSource, maxDim: number): {
  canvas: HTMLCanvasElement;
  sourceWidth: number;
  sourceHeight: number;
} {
  const sourceWidth =
    imageSource instanceof HTMLImageElement ? imageSource.naturalWidth : imageSource.width;
  const sourceHeight =
    imageSource instanceof HTMLImageElement ? imageSource.naturalHeight : imageSource.height;

  let width = sourceWidth;
  let height = sourceHeight;

  if (width > maxDim || height > maxDim) {
    if (width > height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to prepare image for backend detection');
  }
  ctx.drawImage(imageSource as CanvasImageSource, 0, 0, width, height);

  return { canvas, sourceWidth, sourceHeight };
}
