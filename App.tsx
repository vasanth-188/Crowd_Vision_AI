
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { VideoAnalytics } from './components/VideoAnalytics';
import { Login } from './components/Login';
import { CrowdAnalysis, MissingPersonResult, AnalysisStatus, AnalysisMode, Alert } from './types';
import { geminiService } from './services/geminiService';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('crowdguard_auth') === 'true';
  });
  
  const [analysis, setAnalysis] = useState<CrowdAnalysis | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [venueArea, setVenueArea] = useState<number>(500); // Default 500sqm
  const [mode, setMode] = useState<AnalysisMode>('live');
  
  const [searchingMissing, setSearchingMissing] = useState(false);
  const [missingResult, setMissingResult] = useState<MissingPersonResult | null>(null);
  const [lastFrame, setLastFrame] = useState<string | null>(null);

  // Alerts and Toasts
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [toasts, setToasts] = useState<(Alert & { visible: boolean })[]>([]);
  const prevRiskLevel = useRef<string | null>(null);

  const handleLogin = () => {
    localStorage.setItem('crowdguard_auth', 'true');
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('crowdguard_auth');
    setIsLoggedIn(false);
  };

  const addAlert = useCallback((type: 'info' | 'warning' | 'danger', message: string) => {
    const newAlert: Alert = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      message,
      timestamp: new Date(),
    };
    
    setAlerts(prev => [newAlert, ...prev].slice(0, 20)); // Keep last 20
    
    // Add to toasts
    const toast = { ...newAlert, visible: true };
    setToasts(prev => [...prev, toast]);

    // Auto-remove toast after 5s
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === toast.id ? { ...t, visible: false } : t));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id));
      }, 500); // Wait for fade out
    }, 5000);
  }, []);

  const handleFrameAnalysis = useCallback(async (base64: string) => {
    setLastFrame(base64);
    setStatus(AnalysisStatus.ANALYZING);
    try {
      const result = await geminiService.analyzeCrowd(base64, venueArea);
      setAnalysis(result);
      setStatus(AnalysisStatus.IDLE);

      // Risk change detection
      if (result.riskLevel !== prevRiskLevel.current) {
        if (result.riskLevel === 'Critical') {
          addAlert('danger', `CRITICAL RISK: ${result.predictiveAlert || 'Severe overcrowding detected. Immediate intervention required.'}`);
        } else if (result.riskLevel === 'High') {
          addAlert('warning', `HIGH RISK: Density reaching unsafe levels (${result.density.toFixed(2)} p/m²). Monitoring intensified.`);
        } else if (result.riskLevel === 'Moderate' && prevRiskLevel.current === 'Low') {
          addAlert('info', 'Crowd activity increasing. Parameters moved to MODERATE risk.');
        }
        prevRiskLevel.current = result.riskLevel;
      }
    } catch (err) {
      console.error("Analysis failed:", err);
      setStatus(AnalysisStatus.ERROR);
      addAlert('danger', 'AI Engine Error: Failed to process visual feed. Retrying...');
    }
  }, [venueArea, addAlert]);

  const handleSearchMissing = async (file: File) => {
    if (!lastFrame) {
      alert("No visual context available. Please activate camera or upload media first.");
      return;
    }

    setSearchingMissing(true);
    setMissingResult(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const personBase64 = (reader.result as string).split(',')[1];
        const result = await geminiService.findMissingPerson(lastFrame, personBase64);
        setMissingResult(result);
        setSearchingMissing(false);
        
        if (result.found) {
          addAlert('info', `PERSON LOCATED: Match detected with ${Math.round(result.confidence * 100)}% confidence.`);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Missing person search failed:", err);
      setSearchingMissing(false);
      addAlert('warning', 'Pattern recognition failed. Please ensure the reference photo is clear.');
    }
  };

  const clearAlerts = () => setAlerts([]);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex flex-col h-screen select-none bg-slate-950 font-sans text-slate-100">
      <Header 
        analysis={analysis} 
        alerts={alerts} 
        clearAlerts={clearAlerts} 
        onLogout={handleLogout}
      />
      
      <main className="flex flex-1 overflow-hidden relative">
        <VideoAnalytics 
          onFrame={handleFrameAnalysis} 
          status={status} 
          analysis={analysis}
          mode={mode}
          setMode={setMode}
        />
        <Sidebar 
          analysis={analysis} 
          onSearchMissing={handleSearchMissing}
          searchingMissing={searchingMissing}
          missingResult={missingResult}
          venueArea={venueArea}
          setVenueArea={setVenueArea}
        />

        {/* Toast Notification Container */}
        <div className="absolute top-6 right-[340px] z-[100] flex flex-col gap-3 items-end pointer-events-none">
          {toasts.map((toast) => (
            <div 
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-4 p-4 rounded-2xl border backdrop-blur-2xl shadow-2xl w-80 transition-all duration-500 transform ${
                toast.visible ? 'translate-x-0 opacity-100' : 'translate-x-12 opacity-0'
              } ${
                toast.type === 'danger' ? 'bg-rose-500/20 border-rose-500/30' : 
                toast.type === 'warning' ? 'bg-amber-500/20 border-amber-500/30' : 'bg-blue-500/20 border-blue-500/30'
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${
                toast.type === 'danger' ? 'bg-rose-500 text-white' : 
                toast.type === 'warning' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'
              }`}>
                {toast.type === 'danger' ? <AlertCircle size={20} /> : toast.type === 'warning' ? <AlertTriangle size={20} /> : <Info size={20} />}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] opacity-80">
                    {toast.type === 'danger' ? 'System Alert' : 'Notification'}
                  </span>
                  <button onClick={() => removeToast(toast.id)} className="text-slate-400 hover:text-white transition-colors">
                    <X size={14} />
                  </button>
                </div>
                <p className="text-xs font-bold leading-relaxed">{toast.message}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
      
      {/* Global Risk Progress Bar */}
      <div className="h-1 w-full bg-slate-900 relative overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 ease-in-out relative ${
            status === AnalysisStatus.ANALYZING 
              ? 'bg-blue-500 w-full animate-pulse' 
              : analysis?.riskLevel === 'Critical' 
                ? 'bg-rose-500 w-full' 
                : analysis?.riskLevel === 'High' 
                  ? 'bg-amber-500 w-3/4' 
                  : analysis?.riskLevel === 'Moderate'
                    ? 'bg-blue-500 w-1/2'
                    : 'bg-emerald-500 w-1/4'
          }`} 
        />
        {status === AnalysisStatus.ANALYZING && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer {
          animation: shimmer 1.5s infinite linear;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
      `}} />
    </div>
  );
};

export default App;
