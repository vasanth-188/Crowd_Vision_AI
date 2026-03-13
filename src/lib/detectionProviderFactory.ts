import {
  BackendDetectionProvider,
  BrowserDetectionProvider,
  HybridDetectionProvider,
  type DetectionProvider,
  type DetectionProviderType,
} from '@/lib/detectionProvider';

let detectionProvider: DetectionProvider | null = null;

function getConfiguredProviderType(): DetectionProviderType {
  const configured = (import.meta.env.VITE_DETECTION_PROVIDER || 'browser').toLowerCase();
  if (configured === 'backend' || configured === 'hybrid' || configured === 'browser') {
    return configured;
  }
  return 'browser';
}

function createProvider(): DetectionProvider {
  const type = getConfiguredProviderType();
  const endpoint = import.meta.env.VITE_DETECTION_BACKEND_URL || '';
  const backendModel = import.meta.env.VITE_DETECTION_BACKEND_MODEL || undefined;

  const browserProvider = new BrowserDetectionProvider();

  if (type === 'browser') {
    return browserProvider;
  }

  if (!endpoint) {
    console.warn('VITE_DETECTION_BACKEND_URL not configured, using browser detection provider.');
    return browserProvider;
  }

  const backendProvider = new BackendDetectionProvider(endpoint, backendModel);

  if (type === 'backend') {
    return backendProvider;
  }

  return new HybridDetectionProvider(backendProvider, browserProvider);
}

export function getDetectionProvider(): DetectionProvider {
  if (!detectionProvider) {
    detectionProvider = createProvider();
  }
  return detectionProvider;
}

export function resetDetectionProviderForTests(): void {
  detectionProvider = null;
}
