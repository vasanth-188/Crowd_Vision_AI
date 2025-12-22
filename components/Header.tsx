
import React from 'react';
import { Shield, Activity, Users, AlertCircle } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md h-16 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2">
        <div className="bg-emerald-500/20 p-2 rounded-lg">
          <Shield className="text-emerald-400" size={24} />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">CrowdGuard <span className="text-emerald-400">AI</span></h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold -mt-1">Proactive Safety Management</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-slate-300">SYSTEM LIVE</span>
        </div>
        <div className="flex gap-4">
          <StatusItem icon={<Activity size={14} />} label="ANALYTICS" value="ACTIVE" color="text-emerald-400" />
          <StatusItem icon={<Users size={14} />} label="TRACKING" value="ON" color="text-blue-400" />
          <StatusItem icon={<AlertCircle size={14} />} label="THREAT" value="LOW" color="text-slate-400" />
        </div>
      </div>
    </header>
  );
};

const StatusItem = ({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color: string }) => (
  <div className="flex flex-col items-start leading-none">
    <div className="flex items-center gap-1 text-[9px] text-slate-500 font-bold mb-0.5">
      {icon} {label}
    </div>
    <div className={`text-[11px] font-bold ${color}`}>{value}</div>
  </div>
);
