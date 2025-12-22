
import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { VideoAnalytics } from './components/VideoAnalytics';
import { CrowdAnalysis, MissingPersonResult, AnalysisStatus, AnalysisMode } from './types';
import { geminiService } from './services/geminiService';

const App: React.FC = () => {
  const [analysis, setAnalysis] = useState<CrowdAnalysis | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [venueArea, setVenueArea] = useState<number>(500); // Default 500sqm
  const [mode, setMode] = useState<AnalysisMode>('live');
  
  const [searchingMissing, setSearchingMissing] = useState(false);
  const [missingResult, setMissingResult] = useState<MissingPersonResult | null>(null);
  const [lastFrame, setLastFrame] = useState<string | null>(null);

  const handleFrameAnalysis = useCallback(async (base64: string) => {
    setLastFrame(base64);
    setStatus(AnalysisStatus.ANALYZING);
    try {
      const result = await geminiService.analyzeCrowd(base64, venueArea);
      setAnalysis(result);
      setStatus(AnalysisStatus.IDLE);
    } catch (err) {
      console.error("Analysis failed:", err);
      setStatus(AnalysisStatus.ERROR);
    }
  }, [venueArea]);

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
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Missing person search failed:", err);
      setSearchingMissing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen select-none bg-slate-950">
      <Header />
      <main className="flex flex-1 overflow-hidden">
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
      </main>
      
      {/* Dynamic Status Indicator */}
      <div 
        className={`h-1 w-full transition-colors duration-1000 ${
          status === AnalysisStatus.ANALYZING 
            ? 'bg-blue-500 animate-pulse' 
            : analysis?.riskLevel === 'Critical' 
              ? 'bg-rose-500' 
              : analysis?.riskLevel === 'High' 
                ? 'bg-amber-500' 
                : 'bg-emerald-500'
        }`} 
      />
    </div>
  );
};

export default App;
