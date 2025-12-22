import { useRef, useState, useEffect, useCallback } from 'react';
import { Video, VideoOff, Play, Pause, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Detection, detectPeople, loadDetector } from '@/lib/crowdDetection';
import { autoDetectZones } from '@/lib/zoneClustering';
import { useAnalytics } from '@/hooks/useAnalytics';
import { cn } from '@/lib/utils';

interface LiveFeedProps {
  onDetectionUpdate: (detections: Detection[], imageWidth: number, imageHeight: number) => void;
  isActive: boolean;
  onToggle: () => void;
}

export function LiveFeed({ onDetectionUpdate, isActive, onToggle }: LiveFeedProps) {
  const { recordDetection } = useAnalytics();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const processingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentDetections, setCurrentDetections] = useState<Detection[]>([]);
  const [lastProcessTime, setLastProcessTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const rafRef = useRef<number | null>(null);
  const canvasDimsRef = useRef<{ width: number; height: number } | null>(null);

  // Load model on mount
  useEffect(() => {
    loadDetector((progress, status) => {
      setLoadingProgress(progress);
      if (progress === 100) setModelLoaded(true);
    }).catch((err) => {
      console.error('Failed to load model:', err);
      setError('Failed to load AI model');
    });
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Could not access camera. Please check permissions.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      // Pause and clear the video element to fully release the stream
      (videoRef.current as HTMLVideoElement).pause();
      (videoRef.current as HTMLVideoElement).srcObject = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
    setCurrentDetections([]);
    setIsPaused(false);
  }, [stream]);

  useEffect(() => {
    if (isActive && !stream) {
      startCamera();
    } else if (!isActive && stream) {
      stopCamera();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive]);

  const processFrame = useCallback(async () => {
    if (!videoRef.current || isProcessing || isPaused || !modelLoaded) return;

    const video = videoRef.current;
    if (video.readyState !== 4) return;

    // Throttle: skip if detection still processing or too soon after last one
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      // Create or reuse processing canvas (hidden)
      if (!processingCanvasRef.current) {
        processingCanvasRef.current = document.createElement('canvas');
      }
      const procCanvas = processingCanvasRef.current;
      const ctx = procCanvas.getContext('2d');
      if (!ctx) return;

      procCanvas.width = video.videoWidth;
      procCanvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, procCanvas.width, procCanvas.height);

      // Pass canvas with live mode flag for optimized resolution
      const startTime = Date.now();
      const result = await detectPeople(procCanvas, undefined, { threshold: 0.25, isLive: true });
      const processingTime = (Date.now() - startTime) / 1000;
      
      setCurrentDetections(result.detections);
      setLastProcessTime(Date.now());
      onDetectionUpdate(result.detections, result.imageWidth, result.imageHeight);

      // Calculate zone data using auto-detection
      const dynamicZones = autoDetectZones(
        result.detections,
        result.imageWidth,
        result.imageHeight,
        5
      );
      
      const zoneData: Record<string, number> = {};
      dynamicZones.forEach(zone => {
        zoneData[zone.name] = zone.detectionCount;
      });
      
      recordDetection(
        result.peopleCount,
        processingTime,
        false, // No critical alerts in live mode
        zoneData
      );
    } catch (err) {
      console.error('Detection error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, isPaused, modelLoaded, onDetectionUpdate, recordDetection]);

  // Start detection loop when camera is active
  useEffect(() => {
    if (isActive && stream && modelLoaded && !isPaused) {
      // Adaptive interval: slower if processing is taking time (min 3 seconds for live inference)
      const baseInterval = 3000; // 3 seconds for live detection (reduced resolution = fast)
      const interval = Math.max(baseInterval, lastProcessTime);
      intervalRef.current = setInterval(processFrame, interval);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, stream, modelLoaded, isPaused, processFrame, lastProcessTime]);

  // Draw bounding boxes on video overlay (canvas resize only when needed)
  const drawOverlay = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Only resize if dimensions changed
    const newWidth = video.offsetWidth;
    const newHeight = video.offsetHeight;
    if (canvas.width !== newWidth || canvas.height !== newHeight) {
      canvas.width = newWidth;
      canvas.height = newHeight;
      canvasDimsRef.current = { width: newWidth, height: newHeight };
    }

    const scaleX = canvas.width / video.videoWidth;
    const scaleY = canvas.height / video.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    currentDetections.forEach((detection, index) => {
      const x = detection.box.xmin * scaleX;
      const y = detection.box.ymin * scaleY;
      const w = (detection.box.xmax - detection.box.xmin) * scaleX;
      const h = (detection.box.ymax - detection.box.ymin) * scaleY;

      // Draw box
      ctx.strokeStyle = 'hsl(220, 90%, 56%)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      // Draw label background
      ctx.fillStyle = 'hsl(220, 90%, 56%)';
      const label = `#${index + 1}`;
      const labelWidth = ctx.measureText(label).width + 8;
      ctx.fillRect(x, y - 20, labelWidth, 20);

      // Draw label text
      ctx.fillStyle = 'white';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText(label, x + 4, y - 6);
    });
  }, [currentDetections]);

  useEffect(() => {
    if (isActive && stream && !isPaused) {
      const loop = () => {
        drawOverlay();
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } else if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isActive, stream, isPaused, drawOverlay]);

  if (!isActive) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-border rounded-xl min-h-[300px]">
        <div className="p-4 rounded-full bg-primary/10 mb-4">
          <Camera className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Live Camera Feed</h3>
        <p className="text-muted-foreground mb-4 max-w-sm">
          Use your device camera for real-time crowd detection
        </p>
        <Button onClick={onToggle} disabled={!modelLoaded}>
          <Video className="w-4 h-4 mr-2" />
          {modelLoaded ? 'Start Camera' : `Loading AI (${loadingProgress}%)...`}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative rounded-xl overflow-hidden bg-muted/30">
        {error ? (
          <div className="flex items-center justify-center min-h-[400px] text-destructive">
            <p>{error}</p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full aspect-video object-cover"
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
            {/* Live indicator */}
            <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm">
              <div className={cn(
                'w-2 h-2 rounded-full',
                isPaused ? 'bg-warning' : 'bg-destructive animate-pulse'
              )} />
              <span className="text-sm font-medium">
                {isPaused ? 'Paused' : 'LIVE'}
              </span>
            </div>
            {/* People count overlay */}
            <div className="absolute top-4 right-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold">
              {currentDetections.length} {currentDetections.length === 1 ? 'Person' : 'People'}
            </div>
            {/* Processing indicator */}
            {isProcessing && (
              <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm text-sm">
                Analyzing...
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex items-center justify-center gap-3">
        <Button variant="outline" onClick={() => setIsPaused(!isPaused)} disabled={!stream}>
          {isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
          {isPaused ? 'Resume' : 'Pause'}
        </Button>
        <Button variant="destructive" onClick={() => { stopCamera(); onToggle(); }}>
          <VideoOff className="w-4 h-4 mr-2" />
          Stop Camera
        </Button>
      </div>
    </div>
  );
}