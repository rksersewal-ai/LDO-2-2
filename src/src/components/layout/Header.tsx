import { useState, useRef, useEffect } from 'react';
import { Search, Bell, User, Type, LogOut, Minus, Plus, RotateCcw } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../lib/auth';
import { NotificationPanel } from './NotificationPanel';

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showTextControls, setShowTextControls] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [fontSize, setFontSize] = useState(14);

  const paths = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = ['Home', ...paths.map(p => p.charAt(0).toUpperCase() + p.slice(1))];

  const adjustFontSize = (delta: number) => {
    const next = Math.max(12, Math.min(18, fontSize + delta));
    setFontSize(next);
    document.documentElement.style.setProperty('--font-size', `${next}px`);
  };
  const resetFontSize = () => {
    setFontSize(14);
    document.documentElement.style.setProperty('--font-size', '14px');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-20 px-8 flex items-center justify-between z-30 relative">
      <div className="flex items-center gap-4">
        <div className="flex items-center text-sm text-slate-400" style={{ fontWeight: 500 }}>
          {breadcrumbs.map((crumb, i) => (
            <div key={i} className="flex items-center">
              {i > 0 && <span className="mx-2 text-slate-600">/</span>}
              <span className={i === breadcrumbs.length - 1 ? "text-teal-300" : ""}>{crumb}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Global Omnisearch */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-500 group-focus-within:text-teal-400 transition-colors" />
          </div>
          <input
            type="text"
            className="block w-64 md:w-96 pl-10 pr-3 py-2 border border-teal-500/20 rounded-xl leading-5 bg-slate-900/50 backdrop-blur-md text-slate-300 placeholder-slate-500 focus:outline-none focus:bg-slate-900 focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/50 sm:text-sm transition-all"
            placeholder="Search documents, PLs, OCR text..."
            onFocus={() => navigate('/documents')}
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-slate-500 text-xs border border-slate-700 rounded px-1.5 py-0.5" style={{ fontWeight: 600 }}>⌘K</span>
          </div>
        </div>

        {/* Text Size Controls */}
        <div className="relative">
          <button
            className="text-slate-400 hover:text-teal-300 transition-colors"
            title="Adjust Text Size"
            onClick={() => setShowTextControls(!showTextControls)}
          >
            <Type className="w-5 h-5" />
          </button>
          {showTextControls && (
            <div className="absolute top-full right-0 mt-2 bg-slate-900/95 backdrop-blur-xl border border-teal-500/20 rounded-xl shadow-xl p-3 z-50 flex items-center gap-2">
              <button onClick={() => adjustFontSize(-1)} className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center"><Minus className="w-3 h-3" /></button>
              <span className="text-xs text-slate-400 w-8 text-center">{fontSize}</span>
              <button onClick={() => adjustFontSize(1)} className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center"><Plus className="w-3 h-3" /></button>
              <button onClick={resetFontSize} className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center" title="Reset"><RotateCcw className="w-3 h-3" /></button>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            className="relative text-slate-400 hover:text-teal-300 transition-colors"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500 border border-slate-900"></span>
            </span>
          </button>
          {showNotifications && <NotificationPanel onClose={() => setShowNotifications(false)} />}
        </div>

        {/* Profile */}
        <div className="relative">
          <div
            className="flex items-center gap-3 pl-6 border-l border-slate-700/50 cursor-pointer"
            onClick={() => setShowProfile(!showProfile)}
          >
            <div className="text-right hidden md:block">
              <div className="text-sm text-slate-200" style={{ fontWeight: 600 }}>{user?.name || 'User'}</div>
              <div className="text-[10px] text-teal-400/80 uppercase tracking-wider">{user?.designation || 'Role'}</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-teal-500/30 flex items-center justify-center text-teal-300 overflow-hidden">
              <User className="w-5 h-5" />
            </div>
          </div>
          {showProfile && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-slate-900/95 backdrop-blur-xl border border-teal-500/20 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="p-4 border-b border-slate-700/50">
                <div className="text-sm text-white" style={{ fontWeight: 600 }}>{user?.name}</div>
                <div className="text-xs text-slate-400">{user?.email}</div>
                <div className="text-[10px] text-teal-400/80 uppercase mt-1">{user?.role} • {user?.department}</div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
