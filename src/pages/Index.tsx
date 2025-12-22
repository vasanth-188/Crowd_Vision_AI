import { useState, useCallback, useEffect } from 'react';
import { Users, Clock, Target, TrendingUp, Download, RefreshCw, Eye, MapPin, Grid3X3, Upload, Video, Search, Bell, Ruler } from 'lucide-react';
import { UploadZone } from '@/components/UploadZone';
import { StatCard } from '@/components/StatCard';
import { ProcessingProgress } from '@/components/ProcessingProgress';
import { AnnotatedImage } from '@/components/AnnotatedImage';
import { DensityHeatmap } from '@/components/DensityHeatmap';
import { DetectionTable } from '@/components/DetectionTable';
import { LiveFeed } from '@/components/LiveFeed';
import { MissingPersonSearch } from '@/components/MissingPersonSearch';
import { MatchResults } from '@/components/MatchResults';
import { AlertPanel } from '@/components/AlertPanel';
import { SpaceInsights } from '@/components/SpaceInsights';
import { ZoneDensityAnalysis } from '@/components/ZoneDensityAnalysis';
import { autoDetectZones } from '@/lib/zoneClustering';
import { HeadcountDisplay } from '@/components/HeadcountDisplay';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { detectPeople, loadImage, generateHeatmapData, DetectionResult, Detection } from '@/lib/crowdDetection';
import { findMatchingPerson, loadImage as loadFaceImage, FaceMatch } from '@/lib/faceDetection';
import { CrowdAlert, analyzeAndGenerateAlerts, generateSnapshotFromDetections, clearHistory } from '@/lib/crowdAlerts';
import { extractVideoFrame, getVideoDuration } from '@/lib/videoProcessing';
import { useAnalytics } from '@/hooks/useAnalytics';
import { toast } from 'sonner';

const Index = () => {
  const { recordDetection } = useAnalytics();
  const [mode, setMode] = useState<'upload' | 'live'>('upload');
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crowdImageElement, setCrowdImageElement] = useState<HTMLImageElement | null>(null);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [heatmapData, setHeatmapData] = useState<number[][] | null>(null);
  const [liveDetections, setLiveDetections] = useState<Detection[]>([]);
  
  // Missing person search state
  const [matches, setMatches] = useState<FaceMatch[]>([]);
  const [selectedMatchIndex, setSelectedMatchIndex] = useState<number | undefined>();
  const [highlightedDetection, setHighlightedDetection] = useState<Detection | null>(null);
  
  // Alert system state
  const [alerts, setAlerts] = useState<CrowdAlert[]>([]);
  const [estimatedCapacity, setEstimatedCapacity] = useState(100);

  const handleFileSelect = useCallback(async (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      toast.error('Please upload an image or video file.');
      return;
    }

    try {
      setIsProcessing(true);
      setProgress(0);
      setStatus(isVideo ? 'Loading video...' : 'Loading image...');
      setMatches([]);
      setSelectedMatchIndex(undefined);
      setHighlightedDetection(null);

      let img: HTMLImageElement;
      
      if (isVideo) {
        // Extract frame from video
        setStatus('Extracting frame from video...');
        setProgress(10);
        const duration = await getVideoDuration(file);
        const midPoint = duration / 2; // Extract frame from middle of video
        img = await extractVideoFrame(file, midPoint);
        toast.info(`Analyzing frame at ${midPoint.toFixed(1)}s from video`);
      } else {
        // Load image directly
        img = await loadImage(file);
      }

      setCrowdImageElement(img);
      setImageSrc(URL.createObjectURL(isVideo ? await createImageBlob(img) : file));

      // Run detection
      const detectionResult = await detectPeople(img, (p, s) => {
        setProgress(p);
        setStatus(s);
      });

      setResult(detectionResult);

      // Generate heatmap
      const heatmap = generateHeatmapData(
        detectionResult.detections,
        detectionResult.imageWidth,
        detectionResult.imageHeight
      );
      setHeatmapData(heatmap);

      // Generate alerts for static image analysis
      const snapshot = generateSnapshotFromDetections(
        detectionResult.peopleCount,
        heatmap,
        detectionResult.imageWidth,
        detectionResult.imageHeight
      );
      const newAlerts = analyzeAndGenerateAlerts(snapshot, estimatedCapacity);
      setAlerts(newAlerts);
      
      // Notify about critical alerts
      newAlerts.forEach(alert => {
        if (alert.severity === 'critical') {
          toast.error(alert.title, { description: alert.message });
        }
      });

      // Calculate zone data using auto-detection
      const dynamicZones = autoDetectZones(
        detectionResult.detections,
        detectionResult.imageWidth,
        detectionResult.imageHeight,
        5
      );
      
      const zoneData: Record<string, number> = {};
      dynamicZones.forEach(zone => {
        zoneData[zone.name] = zone.detectionCount;
      });

      // Record detection analytics
      recordDetection(
        detectionResult.peopleCount,
        detectionResult.processingTime / 1000,
        newAlerts.some(a => a.severity === 'critical'),
        zoneData
      );

      toast.success(`Detected ${detectionResult.peopleCount} ${detectionResult.peopleCount === 1 ? 'person' : 'people'}!`);
    } catch (error) {
      console.error('Detection error:', error);
      toast.error('Failed to process file. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [estimatedCapacity, recordDetection]);

  // Helper function to convert HTMLImageElement to Blob
  const createImageBlob = async (img: HTMLImageElement): Promise<File> => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    ctx.drawImage(img, 0, 0);
    
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to create image blob'));
          return;
        }
        resolve(new File([blob], 'frame.jpg', { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.9);
    });
  };

  const handleMissingPersonSearch = useCallback(async (referenceFile: File, threshold: number) => {
    if (!crowdImageElement) {
      toast.error('Please upload a crowd image first');
      return;
    }

    try {
      setIsSearching(true);
      setProgress(0);
      setMatches([]);
      setSelectedMatchIndex(undefined);
      setHighlightedDetection(null);

      // Load reference image
      const referenceImg = await loadFaceImage(referenceFile);

      // Find matches
      const foundMatches = await findMatchingPerson(
        referenceImg,
        crowdImageElement,
        (p, s) => {
          setProgress(p);
          setStatus(s);
        },
        threshold
      );

      setMatches(foundMatches);

      if (foundMatches.length > 0) {
        toast.success(`Found ${foundMatches.length} potential ${foundMatches.length === 1 ? 'match' : 'matches'}!`);
      } else {
        toast.info('No matches found. Try adjusting the sensitivity.');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to search. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [crowdImageElement]);

  const handleMatchClick = useCallback((match: FaceMatch) => {
    setSelectedMatchIndex(match.personIndex);
    setHighlightedDetection({
      label: 'match',
      score: match.similarity,
      box: match.detection.box,
    });
  }, []);

  const handleReset = useCallback(() => {
    setImageSrc(null);
    setCrowdImageElement(null);
    setResult(null);
    setHeatmapData(null);
    setLiveDetections([]);
    setIsLiveActive(false);
    setMatches([]);
    setSelectedMatchIndex(undefined);
    setHighlightedDetection(null);
    setAlerts([]);
    clearHistory();
  }, []);

  const handleLiveDetectionUpdate = useCallback((detections: Detection[], imageWidth: number, imageHeight: number) => {
    setLiveDetections(detections);
    
    // Generate alerts from live detections
    const snapshot = generateSnapshotFromDetections(
      detections.length,
      null, // No heatmap for live
      imageWidth,
      imageHeight
    );
    const newAlerts = analyzeAndGenerateAlerts(snapshot, estimatedCapacity);
    
    if (newAlerts.length > 0) {
      setAlerts(prev => {
        // Merge with existing, avoid duplicates by type within last 30 seconds
        const recentTime = Date.now() - 30000;
        const recentTypes = new Set(
          prev.filter(a => a.timestamp.getTime() > recentTime && !a.dismissed).map(a => a.type)
        );
        const uniqueNew = newAlerts.filter(a => !recentTypes.has(a.type));
        
        // Show toast for critical alerts
        uniqueNew.forEach(alert => {
          if (alert.severity === 'critical') {
            toast.error(alert.title, { description: alert.message });
          } else if (alert.severity === 'warning') {
            toast.warning(alert.title, { description: alert.message });
          }
        });
        
        return [...prev, ...uniqueNew];
      });
    }
  }, [estimatedCapacity]);

  const handleDismissAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, dismissed: true } : a
    ));
  }, []);

  const handleDismissAllAlerts = useCallback(() => {
    setAlerts(prev => prev.map(a => ({ ...a, dismissed: true })));
  }, []);

  const handleDownload = useCallback(() => {
    if (!result) return;

    const data = {
      timestamp: new Date().toISOString(),
      peopleCount: result.peopleCount,
      processingTime: `${(result.processingTime / 1000).toFixed(2)}s`,
      imageSize: `${result.imageWidth}x${result.imageHeight}`,
      detections: result.detections.map((d, i) => ({
        id: i + 1,
        confidence: `${Math.round(d.score * 100)}%`,
        position: { x: Math.round(d.box.xmin), y: Math.round(d.box.ymin) },
        size: {
          width: Math.round(d.box.xmax - d.box.xmin),
          height: Math.round(d.box.ymax - d.box.ymin),
        },
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'crowd-detection-results.json';
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Results downloaded!');
  }, [result]);

  const avgConfidence = result
    ? Math.round(
        (result.detections.reduce((sum, d) => sum + d.score, 0) / result.detections.length) * 100
      ) || 0
    : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Page actions (shown when results exist) */}
      {result && (
        <div className="container mx-auto px-4 pt-4">
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RefreshCw className="w-4 h-4 mr-2" />
              New Analysis
            </Button>
          </div>
        </div>
      )}

      <ProcessingProgress progress={progress} status={status} isVisible={isProcessing || isSearching} />

      <main className="container mx-auto px-4 py-8">
        {!result && !isLiveActive ? (
          /* Input Selection State */
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-3">Analyze Crowd Density</h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Upload an image or use your camera for real-time detection. All processing happens locally in your browser.
              </p>
            </div>

            {/* Mode Toggle */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex rounded-lg bg-muted p-1">
                <button
                  onClick={() => setMode('upload')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                    mode === 'upload' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Upload Image
                </button>
                <button
                  onClick={() => setMode('live')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                    mode === 'live' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Video className="w-4 h-4" />
                  Live Feed
                </button>
              </div>
            </div>

            {mode === 'upload' ? (
              <UploadZone onFileSelect={handleFileSelect} accept="image/*,video/*" disabled={isProcessing} />
            ) : (
              <LiveFeed
                onDetectionUpdate={handleLiveDetectionUpdate}
                isActive={isLiveActive}
                onToggle={() => setIsLiveActive(!isLiveActive)}
              />
            )}

            <div className="mt-6 flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent" />
                <span>100% Private</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span>Works Offline</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-warning" />
                <span>AI Powered</span>
              </div>
            </div>
          </div>
        ) : isLiveActive ? (
          /* Live Feed Active State */
          <div className="space-y-6 animate-fade-in">
            {/* Prominent Headcount Display for Live Feed */}
            <HeadcountDisplay 
              count={liveDetections.length} 
              size="large"
              label="Current Headcount (Live)"
            />

            {/* Alert Panel for Live Feed */}
            <AlertPanel
              alerts={alerts}
              onDismiss={handleDismissAlert}
              onDismissAll={handleDismissAllAlerts}
            />

            {/* Space Insights for Live Feed */}
            <SpaceInsights
              currentHeadcount={liveDetections.length}
            />

            {/* Live Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                title="Detection Mode"
                value="Live"
                icon={Video}
                variant="accent"
                description="Camera active"
              />
              <StatCard
                title="Avg Confidence"
                value={`${liveDetections.length > 0 ? Math.round((liveDetections.reduce((sum, d) => sum + d.score, 0) / liveDetections.length) * 100) : 0}%`}
                icon={Target}
                variant="warning"
                description="Detection accuracy"
              />
              <StatCard
                title="Active Alerts"
                value={alerts.filter(a => !a.dismissed).length}
                icon={Bell}
                variant={alerts.some(a => a.severity === 'critical' && !a.dismissed) ? 'primary' : undefined}
                description="5-7 min advance"
              />
            </div>

            {/* Live Feed */}
            <LiveFeed
              onDetectionUpdate={handleLiveDetectionUpdate}
              isActive={isLiveActive}
              onToggle={() => setIsLiveActive(!isLiveActive)}
            />

            {/* Zone Density Analysis for Live Feed */}
            {liveDetections.length > 0 && (
              <ZoneDensityAnalysis
                detections={liveDetections}
                imageWidth={1280}
                imageHeight={720}
                isLive={true}
              />
            )}

            {/* Detection Table for live feed */}
            {liveDetections.length > 0 && (
              <DetectionTable detections={liveDetections} />
            )}
          </div>
        ) : (
          /* Results Dashboard */
          <div className="space-y-6 animate-fade-in">
            {/* Prominent Headcount Display */}
            <HeadcountDisplay 
              count={result.peopleCount} 
              size="large"
              label="Current Headcount (Monitored Area)"
            />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                title="Processing Time"
                value={`${(result.processingTime / 1000).toFixed(2)}s`}
                icon={Clock}
                variant="accent"
                description="Analysis duration"
              />
              <StatCard
                title="Avg Confidence"
                value={`${avgConfidence}%`}
                icon={Target}
                variant="warning"
                description="Detection accuracy"
              />
              <StatCard
                title="Matches Found"
                value={matches.length}
                icon={Search}
                variant={matches.length > 0 ? 'primary' : undefined}
                description="Missing person search"
              />
            </div>

            {/* Space Insights - Prescriptive Guidance */}
            <SpaceInsights
              currentHeadcount={result.peopleCount}
              imageWidth={result.imageWidth}
              imageHeight={result.imageHeight}
            />

            {/* Alert Panel */}
            <AlertPanel
              alerts={alerts}
              onDismiss={handleDismissAlert}
              onDismissAll={handleDismissAllAlerts}
            />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Missing Person Search */}
              <div className="lg:col-span-1 space-y-4">
                <MissingPersonSearch
                  onSearch={handleMissingPersonSearch}
                  isSearching={isSearching}
                  disabled={!result}
                />
                
                {matches.length > 0 && (
                  <MatchResults
                    matches={matches}
                    onMatchClick={handleMatchClick}
                    selectedIndex={selectedMatchIndex}
                  />
                )}
              </div>

              {/* Right: Visualization Tabs */}
              <div className="lg:col-span-2">
                <Tabs defaultValue="boxes" className="w-full">
                  <TabsList className="grid w-full max-w-md grid-cols-3">
                    <TabsTrigger value="boxes" className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      <span className="hidden sm:inline">Bounding Boxes</span>
                      <span className="sm:hidden">Boxes</span>
                    </TabsTrigger>
                    <TabsTrigger value="heatmap" className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span className="hidden sm:inline">Density Heatmap</span>
                      <span className="sm:hidden">Heatmap</span>
                    </TabsTrigger>
                    <TabsTrigger value="table" className="flex items-center gap-2">
                      <Grid3X3 className="w-4 h-4" />
                      <span className="hidden sm:inline">Detection List</span>
                      <span className="sm:hidden">List</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="boxes" className="mt-4">
                    <div className="bg-card rounded-xl border border-border p-4">
                      <div className="aspect-video">
                        <AnnotatedImage
                          imageSrc={imageSrc!}
                          detections={result.detections}
                          highlightedDetection={highlightedDetection}
                          showBoxes
                          showLabels
                        />
                      </div>
                      {highlightedDetection && (
                        <div className="mt-3 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                          <p className="text-sm text-green-500 font-medium flex items-center gap-2">
                            <Search className="w-4 h-4" />
                            Potential match highlighted with {Math.round(highlightedDetection.score * 100)}% similarity
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="heatmap" className="mt-4">
                    <div className="bg-card rounded-xl border border-border p-4">
                      <div className="aspect-video">
                        {heatmapData && (
                          <DensityHeatmap
                            imageSrc={imageSrc!}
                            heatmapData={heatmapData}
                            opacity={0.7}
                          />
                        )}
                      </div>
                      <div className="mt-4 flex items-center justify-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-[hsl(220,90%,56%)]" />
                          <span className="text-muted-foreground">Low Density</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-[hsl(38,92%,50%)]" />
                          <span className="text-muted-foreground">Medium</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-[hsl(0,84%,60%)]" />
                          <span className="text-muted-foreground">High Density</span>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="table" className="mt-4">
                    <DetectionTable detections={result.detections} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Powered by AI object detection • All processing happens in your browser</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;