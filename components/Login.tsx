
import React, { useState } from 'react';
import { Shield, Lock, User, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate auth delay
    setTimeout(() => {
      setLoading(false);
      onLogin();
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* High-tech Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] animate-pulse delay-700" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150" />
      </div>

      <div className="w-full max-w-md z-10">
        <div className="bg-slate-900/60 backdrop-blur-2xl rounded-[2.5rem] border border-slate-800 shadow-2xl p-10 relative">
          {/* Logo Section */}
          <div className="flex flex-col items-center mb-10">
            <div className="bg-emerald-500/20 p-4 rounded-3xl border border-emerald-500/30 shadow-2xl shadow-emerald-500/20 mb-6 group transition-all hover:scale-110">
              <Shield className="text-emerald-400 group-hover:animate-bounce" size={40} />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight text-center">
              CrowdGuard <span className="text-emerald-400">AI</span>
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-black mt-2">
              Advanced Security Protocol
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Identity UID</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User size={18} className="text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="operator_772"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl text-slate-200 placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-sm font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Secure Passkey</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={18} className="text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-12 pr-12 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl text-slate-200 placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-sm font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-600 hover:text-slate-400 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-4 h-4 bg-slate-950 border border-slate-800 rounded peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-all" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 peer-checked:opacity-100">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-500 group-hover:text-slate-400 transition-colors">REMEMBER SESSION</span>
              </label>
              <button type="button" className="text-[10px] font-bold text-emerald-500/70 hover:text-emerald-400 transition-colors">LOST ACCESS?</button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-3 mt-4 overflow-hidden relative group"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  INITIALIZE SYSTEM
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform" />
            </button>
          </form>

          {/* Footer Decoration */}
          <div className="mt-12 pt-8 border-t border-slate-800 flex justify-center gap-6">
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-black text-slate-700 mb-1 uppercase tracking-tighter">Latency</span>
              <span className="text-[10px] font-mono text-emerald-500/50">14ms</span>
            </div>
            <div className="w-px h-6 bg-slate-800 self-center" />
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-black text-slate-700 mb-1 uppercase tracking-tighter">Region</span>
              <span className="text-[10px] font-mono text-emerald-500/50">US-EAST-1</span>
            </div>
            <div className="w-px h-6 bg-slate-800 self-center" />
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-black text-slate-700 mb-1 uppercase tracking-tighter">Status</span>
              <span className="text-[10px] font-mono text-emerald-500/50 flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                SECURE
              </span>
            </div>
          </div>
        </div>

        {/* Outer Accents */}
        <div className="mt-8 flex justify-center">
          <p className="text-[10px] text-slate-700 font-black uppercase tracking-[0.2em]">
            Authorized Personnel Only
          </p>
        </div>
      </div>
    </div>
  );
};
