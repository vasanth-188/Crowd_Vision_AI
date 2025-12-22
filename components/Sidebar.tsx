
import React, { useState } from 'react';
import { Search, Map, HelpCircle, Upload, AlertTriangle, Info } from 'lucide-react';
import { CrowdAnalysis, MissingPersonResult } from '../types';

interface SidebarProps {
  analysis: CrowdAnalysis | null;
  onSearchMissing: (file: File) => void;
  searchingMissing: boolean;
  missingResult: MissingPersonResult | null;
  venueArea: number;
  setVenueArea: (val: number) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  analysis, 
  onSearchMissing, 
  searchingMissing, 
  missingResult,
  venueArea,
  setVenueArea
}) => {
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSearch = () => {
    if (file) onSearchMissing(file);
  };

  return (
    <div className="w-80 border-l border-slate-800 bg-slate-900/40 p-6 flex flex-col gap-8 overflow-y-auto">
      {/* Venue Configuration */}
      <section>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Map size={14} /> Venue Parameters
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Total Monitored Area (m²)</label>
            <input 
              type="number" 
              value={venueArea}
              onChange={(e) => setVenueArea(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
          </div>
        </div>
      </section>

      {/* Safety Stats */}
      {analysis && (
        <section className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Safety Metrics</h3>
          <div className="grid grid-cols-2 gap-4">
            <StatBox label="Density" value={`${analysis.density.toFixed(2)} p/m²`} sub="Current" />
            <StatBox label="Capacity" value={analysis.maxCapacity.toString()} sub="Max Limit" />
            <StatBox 
              label="Risk" 
              value={analysis.riskLevel} 
              color={analysis.riskLevel === 'Critical' ? 'text-rose-400' : analysis.riskLevel === 'High' ? 'text-amber-400' : 'text-emerald-400'} 
            />
            <StatBox label="Status" value={analysis.headcount > analysis.maxCapacity ? 'Overload' : 'Safe'} color={analysis.headcount > analysis.maxCapacity ? 'text-rose-400' : 'text-emerald-400'} />
          </div>
        </section>
      )}

      {/* Missing Person Tool */}
      <section>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Search size={14} /> Missing Person Search
        </h3>
        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
          <p className="text-[11px] text-slate-400 mb-3">Upload a clear portrait to scan current footage.</p>
          <div className="relative group cursor-pointer">
            <input 
              type="file" 
              onChange={handleFileChange}
              accept="image/*"
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="border-2 border-dashed border-slate-700 rounded-lg p-4 flex flex-col items-center justify-center gap-2 group-hover:border-slate-500 transition-colors">
              <Upload size={20} className="text-slate-500" />
              <span className="text-[10px] text-slate-500 font-medium">
                {file ? file.name : 'Select Image'}
              </span>
            </div>
          </div>
          <button 
            onClick={handleSearch}
            disabled={!file || searchingMissing}
            className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold py-2.5 rounded-lg transition-all"
          >
            {searchingMissing ? 'Scanning Crowd...' : 'Start Recognition'}
          </button>
        </div>

        {missingResult && (
          <div className={`mt-4 p-3 rounded-lg border flex gap-3 ${missingResult.found ? 'bg-emerald-950/40 border-emerald-800' : 'bg-rose-950/40 border-rose-800'}`}>
            <div className="mt-0.5">
              {missingResult.found ? <Info size={16} className="text-emerald-400" /> : <AlertTriangle size={16} className="text-rose-400" />}
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-tight mb-1">{missingResult.found ? 'Match Found' : 'No Match'}</p>
              <p className="text-[10px] text-slate-300 leading-relaxed">{missingResult.message}</p>
            </div>
          </div>
        )}
      </section>

      {/* Help / Docs */}
      <section className="mt-auto">
        <button className="flex items-center gap-2 text-[11px] text-slate-500 hover:text-slate-300 font-medium transition-colors">
          <HelpCircle size={14} /> System Documentation
        </button>
      </section>
    </div>
  );
};

const StatBox = ({ label, value, sub, color = "text-slate-100" }: { label: string, value: string, sub?: string, color?: string }) => (
  <div>
    <p className="text-[10px] font-bold text-slate-500 mb-0.5">{label}</p>
    <p className={`text-sm font-bold tracking-tight ${color}`}>{value}</p>
    {sub && <p className="text-[9px] text-slate-600">{sub}</p>}
  </div>
);
