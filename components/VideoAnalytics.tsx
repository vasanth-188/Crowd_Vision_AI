
import React, { useRef, useEffect, useState } from 'react';
import { Camera, RefreshCw, Maximize2, Activity, Users, Upload, Play, Pause, Square, Image as ImageIcon } from 'lucide-react';
import { CrowdAnalysis, AnalysisStatus, AnalysisMode, MediaState } from '../types';

interface VideoAnalyticsProps {
  onFrame: (base64: string) => void;
  status: AnalysisStatus;
  analysis: CrowdAnalysis | null;
  mode: AnalysisMode;
  setMode: (mode: AnalysisMode) => void;
}

export const VideoAnalytics: React.FC<VideoAnalyticsProps> = ({ onFrame, status, analysis, mode, setMode }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const manualVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [media, setMedia] = useState<MediaState>({ url: null, type: null, file: null });
  const [isPlaying, setIsPlaying] = useState(false);

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

  const captureFrame = (ref: React.RefObject<HTMLVideoElement | HTMLImageElement | null>) => {
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
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const type = file.type.startsWith('video/') ? 'video' : 'image';
    setMedia({ url, type, file });
    
    // Auto analyze images
    if (type === 'image') {
      setTimeout(() => {
        const img = document.getElementById('manual-image') as HTMLImageElement;
        if (img) captureFrame({ current: img } as any);
      }, 500);
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
            <div className="flex items-center gap-2 text-xs text-blue-400 font-medium animate-pulse">
              <RefreshCw size={14} className="animate-spin" />
              AI Analyzing {mode === 'live' ? 'Feed' : 'Media'}...
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {mode === 'manual' && (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-300 border border-slate-700 flex items-center gap-2"
            >
              <Upload size={14} /> {media.url ? 'Change File' : 'Choose File'}
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
        {mode === 'live' ? (
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline 
            className="w-full h-full object-cover grayscale brightness-75 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-700"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-950 relative">
            {media.url ? (
              media.type === 'video' ? (
                <div className="w-full h-full relative group/player">
                  <video 
                    ref={manualVideoRef} 
                    src={media.url} 
                    className="w-full h-full object-contain"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                  {/* Video Controls Overlay */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/10 opacity-0 group-hover/player:opacity-100 transition-opacity">
                    <button onClick={togglePlay} className="text-white hover:text-blue-400 transition-colors">
                      {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                    </button>
                    <div className="h-6 w-px bg-white/20" />
                    <button 
                      onClick={() => captureFrame(manualVideoRef)}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-[10px] font-bold text-white flex items-center gap-2"
                    >
                      <Activity size={14} /> ANALYZE THIS FRAME
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-full flex items-center justify-center group/image">
                  <img id="manual-image" src={media.url} className="w-full h-full object-contain" alt="Manual Upload" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity bg-black/20">
                     <button 
                      onClick={() => {
                        const img = document.getElementById('manual-image') as HTMLImageElement;
                        captureFrame({ current: img } as any);
                      }}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-2xl scale-110"
                    >
                      <RefreshCw size={18} /> RE-ANALYZE IMAGE
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-4 cursor-pointer hover:scale-105 transition-transform"
              >
                <div className="w-20 h-20 rounded-3xl bg-slate-800 flex items-center justify-center border-2 border-dashed border-slate-700">
                  <Upload size={32} className="text-slate-500" />
                </div>
                <div className="text-center">
                  <h3 className="text-sm font-bold text-slate-300">No media selected</h3>
                  <p className="text-[11px] text-slate-500 mt-1 uppercase tracking-widest font-semibold">Upload Image or Video for analysis</p>
                </div>
              </div>
            )}
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />

        {/* HUD Overlay (Always Visible) */}
        <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/50">
                <Users size={14} className="text-emerald-400" />
                <span className="text-xs font-bold tracking-tight uppercase">Headcount: <span className="text-white ml-1 mono">{analysis?.headcount || '--'}</span></span>
              </div>
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/50">
                <Activity size={14} className="text-blue-400" />
                <span className="text-xs font-bold tracking-tight uppercase">Density: <span className="text-white ml-1 mono">{analysis?.density?.toFixed(2) || '--'} p/m²</span></span>
              </div>
            </div>
            
            <div className="mono text-[10px] text-slate-400/80 bg-black/40 px-2 py-1 rounded flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${mode === 'live' ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`} />
              {mode === 'live' ? 'REALTIME_FEED' : 'MANUAL_INSPECTION'}
            </div>
          </div>

          <div className="flex justify-between items-end">
            <div className="grid grid-cols-4 gap-1 w-24 opacity-40">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full ${mode === 'live' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
              ))}
            </div>

            {analysis?.predictiveAlert && (
               <div className="max-w-md bg-rose-600/20 border border-rose-500/50 backdrop-blur-xl p-4 rounded-xl flex gap-3 animate-bounce shadow-2xl">
                  <div className="p-2 bg-rose-500 rounded-lg flex items-center justify-center shrink-0">
                    <Activity size={20} className="text-white" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-rose-300 uppercase tracking-wider mb-0.5">Predictive Risk (T-Minus)</h4>
                    <p className="text-sm font-semibold text-white leading-tight">{analysis.predictiveAlert}</p>
                  </div>
               </div>
            )}
          </div>
        </div>

        {/* Framing Accents */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-slate-500/40 m-4" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-slate-500/40 m-4" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-slate-500/40 m-4" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-slate-500/40 m-4" />
      </div>

      {/* Analytics Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-48 shrink-0">
        <div className="bg-slate-900/60 rounded-2xl p-5 border border-slate-800 flex flex-col shadow-inner">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Activity size={14} /> Prescriptive Safety Analysis
          </h3>
          <ul className="space-y-2 overflow-y-auto pr-2 custom-scrollbar">
            {analysis?.recommendations.map((rec, i) => (
              <li key={i} className="text-[11px] text-slate-300 bg-slate-800/30 p-2.5 rounded-lg border border-slate-700/50 flex items-start gap-3">
                <span className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-[10px] font-black shrink-0 border border-emerald-500/20">{i+1}</span>
                <span className="leading-relaxed">{rec}</span>
              </li>
            )) || (
              <li className="text-[11px] text-slate-500 italic py-8 text-center">Awaiting data input for safety assessment...</li>
            )}
          </ul>
        </div>
        <div className="bg-slate-900/60 rounded-2xl p-5 border border-slate-800 flex flex-col shadow-inner">
           <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Activity size={14} /> Volumetric Trend Analysis
          </h3>
          <div className="flex-1 flex items-end gap-1.5 px-2 pb-1 overflow-hidden">
             {Array.from({ length: 32 }).map((_, i) => (
               <div 
                 key={i} 
                 className={`flex-1 ${mode === 'live' ? 'bg-emerald-500/30' : 'bg-blue-500/30'} rounded-t-sm hover:brightness-150 transition-all cursor-pointer`} 
                 style={{ height: `${Math.random() * 80 + 10}%` }}
               />
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};
