
import React, { useState, useMemo } from 'react';
import { Shield, Activity, Users, AlertCircle, Bell, X, Info, AlertTriangle, LogOut, Settings, Filter, Calendar } from 'lucide-react';
import { CrowdAnalysis, Alert } from '../types';

interface HeaderProps {
  analysis: CrowdAnalysis | null;
  alerts: Alert[];
  clearAlerts: () => void;
  onLogout: () => void;
}

type TimeFilter = 'all' | 'hour' | 'today';
type TypeFilter = 'all' | 'info' | 'warning' | 'danger';

export const Header: React.FC<HeaderProps> = ({ analysis, alerts, clearAlerts, onLogout }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Filter States
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const unreadCount = alerts.length;

  const getRiskColor = (level?: string) => {
    switch (level) {
      case 'Critical': return 'text-rose-500';
      case 'High': return 'text-amber-500';
      case 'Moderate': return 'text-blue-400';
      default: return 'text-emerald-400';
    }
  };

  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      // Type Filter
      if (typeFilter !== 'all' && alert.type !== typeFilter) return false;

      // Time Filter
      if (timeFilter !== 'all') {
        const now = new Date();
        const alertTime = new Date(alert.timestamp);
        
        if (timeFilter === 'hour') {
          if (now.getTime() - alertTime.getTime() > 3600000) return false;
        } else if (timeFilter === 'today') {
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          if (alertTime < startOfToday) return false;
        }
      }

      return true;
    });
  }, [alerts, timeFilter, typeFilter]);

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl h-16 flex items-center justify-between px-6 shrink-0 z-50 relative">
      <div className="flex items-center gap-3">
        <div className="bg-emerald-500/20 p-2 rounded-xl shadow-lg shadow-emerald-500/10 border border-emerald-500/20">
          <Shield className="text-emerald-400" size={24} />
        </div>
        <div>
          <h1 className="text-lg font-black tracking-tight text-white">CrowdGuard <span className="text-emerald-400">AI</span></h1>
          <p className="text-[9px] text-slate-500 uppercase tracking-[0.2em] font-black -mt-0.5">Automated Oversight</p>
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-8">
        <StatusItem 
          icon={<Activity size={14} />} 
          label="ANALYTICS" 
          value={analysis ? "RUNNING" : "STANDBY"} 
          color={analysis ? "text-emerald-400" : "text-slate-500"} 
        />
        <StatusItem 
          icon={<Users size={14} />} 
          label="HEADCOUNT" 
          value={analysis?.headcount.toString() || "--"} 
          color="text-white" 
        />
        <StatusItem 
          icon={<AlertCircle size={14} />} 
          label="RISK LEVEL" 
          value={analysis?.riskLevel.toUpperCase() || "STABLE"} 
          color={getRiskColor(analysis?.riskLevel)} 
          pulse={analysis?.riskLevel === 'Critical' || analysis?.riskLevel === 'High'}
        />
      </div>

      <div className="flex items-center gap-4">
        {/* System Health */}
        <div className="hidden sm:flex items-center gap-2 bg-slate-800/40 px-3 py-1.5 rounded-full border border-slate-700/50">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
          <span className="text-[10px] font-bold text-slate-400 tracking-wider">CORE_SYNC</span>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className={`p-2.5 rounded-xl transition-all relative ${showNotifications ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
          >
            <Bell size={20} className={unreadCount > 0 ? 'animate-bounce' : ''} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-slate-900 shadow-lg">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute top-full right-0 mt-3 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                <h3 className="text-xs font-black text-white uppercase tracking-widest">Security Feed</h3>
                <button onClick={clearAlerts} className="text-[10px] font-bold text-slate-500 hover:text-rose-400 transition-colors">CLEAR ALL</button>
              </div>

              {/* Filtering Interface */}
              <div className="px-4 py-3 bg-slate-950/40 border-b border-slate-800/50 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Filter size={10} className="text-slate-500" />
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Type Filter</span>
                  </div>
                  <div className="flex gap-1">
                    {(['all', 'info', 'warning', 'danger'] as TypeFilter[]).map((type) => (
                      <button 
                        key={type}
                        onClick={() => setTypeFilter(type)}
                        className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase transition-all ${
                          typeFilter === type 
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                          : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-1.5">
                    <Calendar size={10} className="text-slate-500" />
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Time Scope</span>
                  </div>
                  <div className="flex gap-1">
                    {(['all', 'hour', 'today'] as TimeFilter[]).map((scope) => (
                      <button 
                        key={scope}
                        onClick={() => setTimeFilter(scope)}
                        className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase transition-all ${
                          timeFilter === scope 
                          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
                          : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {scope === 'all' ? 'Infinity' : scope === 'hour' ? '1 Hour' : 'Today'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                {filteredAlerts.length > 0 ? (
                  filteredAlerts.map((alert) => (
                    <div key={alert.id} className="p-4 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors group">
                      <div className="flex gap-3">
                        <div className={`p-2 rounded-lg shrink-0 ${
                          alert.type === 'danger' ? 'bg-rose-500/10 text-rose-500' : 
                          alert.type === 'warning' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                        }`}>
                          {alert.type === 'danger' ? <AlertCircle size={14} /> : alert.type === 'warning' ? <AlertTriangle size={14} /> : <Info size={14} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-200 leading-snug">{alert.message}</p>
                          <p className="text-[9px] text-slate-500 font-mono mt-1">{new Date(alert.timestamp).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center">
                    <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-700">
                      <Bell size={20} className="text-slate-600" />
                    </div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      {alerts.length > 0 ? "No matches for filters" : "No Active Threats"}
                    </p>
                    {alerts.length > 0 && (
                      <button 
                        onClick={() => { setTimeFilter('all'); setTypeFilter('all'); }}
                        className="text-[10px] text-emerald-500 font-bold mt-2 uppercase underline"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
          <button 
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-3 p-1.5 pl-3 bg-slate-800/40 border border-slate-700/50 rounded-2xl hover:bg-slate-800 transition-colors group"
          >
            <div className="hidden sm:block text-right">
              <p className="text-[10px] font-black text-white leading-none">OPERATOR_772</p>
              <p className="text-[8px] text-emerald-500/70 font-bold tracking-tighter mt-1">LVL 4 CLEARANCE</p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-xs shadow-lg shadow-emerald-500/10 group-hover:bg-emerald-500 group-hover:text-white transition-all">
              72
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute top-full right-0 mt-3 w-48 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 p-2">
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-all">
                <Settings size={16} /> System Settings
              </button>
              <div className="h-px bg-slate-800 my-1 mx-2" />
              <button 
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-all"
              >
                <LogOut size={16} /> Terminate Session
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

const StatusItem = ({ icon, label, value, color, pulse }: { icon: React.ReactNode, label: string, value: string, color: string, pulse?: boolean }) => (
  <div className={`flex items-center gap-3 bg-slate-800/20 px-4 py-2 rounded-xl border border-slate-700/30 transition-all ${pulse ? 'animate-pulse ring-1 ring-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.1)]' : ''}`}>
    <div className={`${color} opacity-80`}>{icon}</div>
    <div className="flex flex-col leading-none">
      <div className="text-[8px] text-slate-500 font-black mb-1 uppercase tracking-widest">
        {label}
      </div>
      <div className={`text-[11px] font-black tracking-tight ${color}`}>{value}</div>
    </div>
  </div>
);
