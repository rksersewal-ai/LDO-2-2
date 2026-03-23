import React from 'react';

export function GlassCard({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`bg-slate-900/40 backdrop-blur-xl border border-teal-500/20 shadow-lg shadow-teal-950/50 rounded-2xl ${className}`}>
      {children}
    </div>
  );
}

export function Badge({ children, variant = "default", className = "" }: { children: React.ReactNode, variant?: "default" | "success" | "warning" | "danger" | "processing", className?: string }) {
  const variants = {
    default: "bg-slate-800 text-slate-300 border border-slate-700",
    success: "bg-teal-900/50 text-teal-300 border border-teal-500/30",
    warning: "bg-amber-900/50 text-amber-300 border border-amber-500/30",
    danger: "bg-rose-900/50 text-rose-300 border border-rose-500/30",
    processing: "bg-blue-900/50 text-blue-300 border border-blue-500/30 animate-pulse",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

export function Button({ children, variant = "primary", className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  const variants = {
    primary: "bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-md shadow-teal-900/20 border border-teal-400/20",
    secondary: "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600",
    ghost: "bg-transparent hover:bg-white/5 text-slate-300",
    danger: "bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30",
  };
  return (
    <button className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input 
      className={`bg-slate-950/50 border border-teal-500/20 text-slate-200 text-sm rounded-xl px-4 py-2 focus:outline-none focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/50 transition-all ${className}`} 
      {...props} 
    />
  );
}