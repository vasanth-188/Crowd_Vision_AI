
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, RefreshCw, Maximize2, Activity, Users, Upload, Play, Pause, Clock, FileVideo, ImageIcon, CheckCircle2 } from 'lucide-react';
import { CrowdAnalysis, AnalysisStatus, AnalysisMode, MediaState } from '../types';

interface VideoAnalyticsProps {
  onFrame: (base64: string) => void;
  status: AnalysisStatus;
  analysis: CrowdAnalysis | null;
  mode: AnalysisMode;
  setMode: (mode: AnalysisMode) => void;
}

interface MediaMetadata {
  duration?: string;
  thumbnail?: string;
  name: string;
  size: string;
}

export const VideoAnalytics: React.FC<VideoAnalyticsProps> = ({ onFrame, status, analysis, mode, setMode }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const manualVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [media, setMedia] = useState<MediaState>({ url: null, type: null, file: null });
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAnalyzed, setIsAnalyzed] = useState(false);

  // Live Camera Setup
  useEffect(() => {
    if (mode === 'live') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [mode]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  // Automated capture for live mode
  useEffect(() => {
    if (mode === 'live' && isCameraActive) {
      const interval = setInterval(() => captureFrame(videoRef), 10000);
      return () => clearInterval(interval);
    }
  }, [isCameraActive, mode]);

  const captureFrame = useCallback((ref: React.RefObject<HTMLVideoElement | HTMLImageElement | null>) => {
    if (!ref.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (ref.current instanceof HTMLVideoElement) {
      canvas.width = ref.current.videoWidth;
      canvas.height = ref.current.videoHeight;
      ctx.drawImage(ref.current, 0, 0);
    } else if (ref.current instanceof HTMLImageElement) {
      canvas.width = ref.current.naturalWidth;
      canvas.height = ref.current.naturalHeight;
      ctx.drawImage(ref.current, 0, 0);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const base64 = dataUrl.split(',')[1];
    onFrame(base64);
    setIsAnalyzed(true);
  }, [onFrame]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const generateThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = URL.createObjectURL(file);
      video.onloadedmetadata = () => {
        video.currentTime = 1; // Seek to 1s for thumbnail
      };
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg'));
      };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const type = file.type.startsWith('video/') ? 'video' : 'image';
    
    setIsAnalyzed(false);
    setMedia({ url, type, file });

    const sizeStr = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    
    if (type === 'video') {
      const vid = document.createElement('video');
      vid.src = url;
      vid.onloadedmetadata = async () => {
        const thumb = await generateThumbnail(file);
        setMetadata({
          name: file.name,
          size: sizeStr,
          duration: formatDuration(vid.duration),
          thumbnail: thumb
        });
      };
    } else {
      setMetadata({
        name: file.name,
        size: sizeStr
      });
    }
  };

  const togglePlay = () => {
    if (manualVideoRef.current) {
      if (isPlaying) manualVideoRef.current.pause();
      else manualVideoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="flex-1 p-6 flex flex-col gap-6 overflow-hidden">
      {/* Header Controls */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button 
              onClick={() => setMode('live')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${mode === 'live' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Camera size={14} /> LIVE FEED
            </button>
            <button 
              onClick={() => setMode('manual')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${mode === 'manual' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Upload size={14} /> MANUAL UPLOAD
            </button>
          </div>
          
          {status === AnalysisStatus.ANALYZING && (
            <div className="flex items-center gap-2 text-xs text-blue-400 font-medium animate-pulse bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
              <RefreshCw size={14} className="animate-spin" />
              AI Analyzing Media...
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {mode === 'manual' && media.url && (
             <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-300 border border-slate-700 flex items-center gap-2 transition-colors"
            >
              <RefreshCw size={14} /> Swap Media
            </button>
          )}
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,video/*" />
          <button className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      {/* Main Display Area */}
      <div className="relative flex-1 bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden group shadow-2xl flex items-center justify-center">
        {/* Enforce 16:9 container within the flexible space to maintain proper aspect ratios */}
        <div className="w-full h-full max-w-full max-h-full aspect-video flex items-center justify-center bg-black relative">
          {mode === 'live' ? (
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline 
              className="w-full h-full object-contain grayscale brightness-75 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-700"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-950 relative overflow-hidden">
              {media.url ? (
                media.type === 'video' ? (
                  <div className="w-full h-full relative group/player flex flex-col items-center justify-center">
                    {/* Video View */}
                    <video 
                      ref={manualVideoRef} 
                      src={media.url} 
                      className="w-full h-full object-contain"
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    />
                    
                    {/* Analysis HUD Overlay */}
                    <div className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center transition-opacity duration-500 ${isAnalyzed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                      <div className="bg-slate-900/90 border border-slate-700/50 p-6 rounded-3xl shadow-2xl max-w-sm w-full mx-4 flex flex-col items-center text-center">
                         {metadata?.thumbnail ? (
                           <div className="w-full aspect-video rounded-xl overflow-hidden mb-4 relative border border-slate-700">
                             <img src={metadata.thumbnail} className="w-full h-full object-cover opacity-60" alt="Thumb" />
                             <div className="absolute inset-0 flex items-center justify-center">
                                <Play size={32} className="text-white fill-white/20" />
                             </div>
                             <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/80 rounded text-[10px] font-bold mono text-white flex items-center gap-1">
                                <Clock size={10} /> {metadata.duration}
                             </div>
                           </div>
                         ) : (
                           <div className="w-20 h-20 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/20">
                              <FileVideo size={32} className="text-blue-400" />
                           </div>
                         )}
                         <h3 className="text-sm font-bold text-white mb-1 truncate w-full px-4">{metadata?.name}</h3>
                         <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-6">{metadata?.size}</p>
                         <button 
                          onClick={() => captureFrame(manualVideoRef)}
                          className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 transition-all hover:scale-[1.02]"
                        >
                          <Activity size={16} /> COMMENCE FRAME ANALYSIS
                        </button>
                      </div>
                    </div>

                    {/* Video Playback Overlay (Visible only when analyzed or playing) */}
                    {(isAnalyzed || isPlaying) && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/10 opacity-0 group-hover/player:opacity-100 transition-opacity">
                        <button onClick={togglePlay} className="text-white hover:text-blue-400 transition-colors">
                          {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                        </button>
                        <div className="h-6 w-px bg-white/20" />
                        <button 
                          onClick={() => captureFrame(manualVideoRef)}
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-[10px] font-bold text-white flex items-center gap-2"
                        >
                          <RefreshCw size={14} /> NEW FRAME
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative w-full h-full flex flex-col items-center justify-center group/image p-4">
                    <img 
                      id="manual-image" 
                      src={media.url} 
                      className={`max-w-full max-h-full object-contain rounded-xl shadow-2xl transition-all duration-700 ${isAnalyzed ? 'brightness-100' : 'brightness-50 scale-95 blur-sm'}`} 
                      alt="Manual Upload" 
                    />
                    
                    {/* Image Preview State Overlay */}
                    <div className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-500 ${isAnalyzed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                       <div className="bg-slate-900/90 border border-slate-700/50 p-8 rounded-[2rem] shadow-2xl flex flex-col items-center text-center backdrop-blur-md max-w-sm">
                         <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/20">
                            <ImageIcon size={32} className="text-blue-400" />
                         </div>
                         <h3 className="text-sm font-bold text-white mb-1 truncate w-full">{metadata?.name}</h3>
                         <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-8">{metadata?.size} • READY FOR ANALYSIS</p>
                         
                         <button 
                          onClick={() => {
                            const img = document.getElementById('manual-image') as HTMLImageElement;
                            captureFrame({ current: img } as any);
                          }}
                          className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 transition-all hover:scale-105"
                        >
                          <Activity size={18} /> RUN AI CROWD AUDIT
                        </button>
                       </div>
                    </div>

                    {isAnalyzed && (
                      <div className="absolute top-4 right-4 bg-emerald-500/90 backdrop-blur shadow-lg px-3 py-1.5 rounded-full flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-500">
                        <CheckCircle2 size={14} className="text-white" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-tighter">Analysis Complete</span>
                      </div>
                    )}

                    {isAnalyzed && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity bg-black/20 pointer-events-none">
                         <button 
                          onClick={() => {
                            const img = document.getElementById('manual-image') as HTMLImageElement;
                            captureFrame({ current: img } as any);
                          }}
                          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-2xl scale-110 pointer-events-auto transition-all hover:scale-125"
                        >
                          <RefreshCw size={18} /> RE-SCAN IMAGE
                        </button>
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-4 cursor-pointer hover:scale-105 transition-all group/upload"
                >
                  <div className="w-24 h-24 rounded-[2rem] bg-slate-900 flex items-center justify-center border-2 border-dashed border-slate-700 group-hover/upload:border-blue-500 transition-colors shadow-2xl">
                    <Upload size={40} className="text-slate-500 group-hover/upload:text-blue-400 transition-colors" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-sm font-bold text-slate-300 group-hover/upload:text-white transition-colors">Select Media Context</h3>
                    <p className="text-[11px] text-slate-500 mt-2 uppercase tracking-widest font-semibold leading-relaxed">
                      MP4 / JPG / PNG • Max 100MB<br/>
                      <span className="text-blue-500/50">Drag & drop anywhere</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HUD Overlay (Locked to the 16:9 media bounds) */}
          <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between z-10">
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700/50 shadow-xl pointer-events-auto">
                  <Users size={14} className="text-emerald-400" />
                  <span className="text-xs font-bold tracking-tight uppercase text-white">Headcount: <span className="text-white ml-1 mono">{analysis?.headcount || '--'}</span></span>
                </div>
                <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700/50 shadow-xl pointer-events-auto">
                  <Activity size={14} className="text-blue-400" />
                  <span className="text-xs font-bold tracking-tight uppercase text-white">Density: <span className="text-white ml-1 mono">{analysis?.density?.toFixed(2) || '--'} p/m²</span></span>
                </div>
              </div>
              
              <div className="mono text-[10px] text-slate-300 bg-black/60 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700/30 flex items-center gap-2 shadow-lg pointer-events-auto">
                <div className={`w-2 h-2 rounded-full ${mode === 'live' ? 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'}`} />
                {mode === 'live' ? 'LIVE_MODE' : 'INSPECTION_MODE'}
              </div>
            </div>

            <div className="flex justify-between items-end">
              <div className="grid grid-cols-4 gap-1 w-24 opacity-30">
                {Array.from({ length: 16 }).map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${mode === 'live' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                ))}
              </div>

              {analysis?.predictiveAlert && (
                 <div className="max-w-md bg-rose-600/30 border border-rose-500/50 backdrop-blur-2xl p-4 rounded-2xl flex gap-4 animate-bounce shadow-2xl pointer-events-auto">
                    <div className="p-2.5 bg-rose-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
                      <Activity size={24} className="text-white" />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-rose-300 uppercase tracking-widest mb-1">Predictive Risk Factor</h4>
                      <p className="text-sm font-bold text-white leading-tight">{analysis.predictiveAlert}</p>
                    </div>
                 </div>
              )}
            </div>
          </div>

          {/* Framing Accents (Internal to 16:9) */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-slate-500/40 m-4 rounded-tl-lg pointer-events-none" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-slate-500/40 m-4 rounded-tr-lg pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-slate-500/40 m-4 rounded-bl-lg pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-slate-500/40 m-4 rounded-br-lg pointer-events-none" />
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Analytics Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-48 shrink-0">
        <div className="bg-slate-900/60 rounded-2xl p-5 border border-slate-800 flex flex-col shadow-inner">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Activity size={14} /> Prescriptive Safety Analysis
          </h3>
          <ul className="space-y-2 overflow-y-auto pr-2 custom-scrollbar">
            {analysis?.recommendations.map((rec, i) => (
              <li key={i} className="text-[11px] text-slate-300 bg-slate-800/40 p-3 rounded-xl border border-slate-700/30 flex items-start gap-3 transition-all hover:bg-slate-800/60">
                <span className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-[10px] font-black shrink-0 border border-emerald-500/20">{i+1}</span>
                <span className="leading-relaxed">{rec}</span>
              </li>
            )) || (
              <li className="text-[11px] text-slate-500 italic py-8 text-center flex flex-col items-center gap-2">
                <ImageIcon size={24} className="opacity-20" />
                Awaiting media analysis results...
              </li>
            )}
          </ul>
        </div>
        <div className="bg-slate-900/60 rounded-2xl p-5 border border-slate-800 flex flex-col shadow-inner overflow-hidden">
           <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Activity size={14} /> Volumetric Trend Analysis
          </h3>
          <div className="flex-1 flex items-end gap-1.5 px-2 pb-1 overflow-hidden">
             {Array.from({ length: 32 }).map((_, i) => (
               <div 
                 key={i} 
                 className={`flex-1 ${mode === 'live' ? 'bg-emerald-500/30' : 'bg-blue-500/30'} rounded-t-sm hover:brightness-150 transition-all cursor-pointer group/bar relative`} 
                 style={{ height: `${Math.random() * 80 + 10}%` }}
               >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-800 text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    {Math.floor(Math.random() * 100)} unit
                  </div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};
