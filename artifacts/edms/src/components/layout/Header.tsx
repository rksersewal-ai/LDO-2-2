import { useState, useRef, useEffect } from 'react';
import { Search, Bell, User, Type, LogOut, Minus, Plus, RotateCcw, Sun, Moon, AlertCircle, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../lib/auth';
import { NotificationPanel } from './NotificationPanel';
import { MOCK_NOTIFICATIONS } from '../../lib/mockExtended';
import { CommandPalette } from '../ui/CommandPalette';
import { useTheme } from '../../contexts/ThemeContext';

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showTextControls, setShowTextControls] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [commandOpen, setCommandOpen] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const headerInputRef = useRef<HTMLInputElement>(null);

  const paths = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = ['Home', ...paths.map(p => p.charAt(0).toUpperCase() + p.slice(1))];
  const unreadCount = MOCK_NOTIFICATIONS.filter(n => !n.read).length;

  // Breadcrumb navigation helper
  const getBreadcrumbPath = (index: number): string => {
    if (index === 0) return '/';
    const pathSegments = paths.slice(0, index);
    return '/' + pathSegments.join('/');
  };

  const adjustFontSize = (delta: number) => {
    const next = Math.max(12, Math.min(18, fontSize + delta));
    setFontSize(next);
    document.documentElement.style.setProperty('--font-size', `${next}px`);
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  // Cmd+K / Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
      
      {/* Dismissible Announcement Banner */}
      {showBanner && (
        <div className="bg-gradient-to-r from-teal-900 to-emerald-900 border-b border-teal-500/30 text-teal-100 text-xs px-4 py-2.5 flex items-center justify-between gap-3 z-20 relative shrink-0">
          <div className="flex items-center gap-2 flex-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="font-semibold">System Maintenance:</span>
            <span>OCR Engine Restart scheduled for 03:00 AM UTC. Expect minor delays in processing.</span>
          </div>
          <button onClick={() => setShowBanner(false)} className="shrink-0 p-1 hover:bg-teal-800/40 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      <header className="h-14 px-6 flex items-center justify-between z-30 relative border-b border-white/[0.04] shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center text-xs text-slate-500 font-medium">
            {breadcrumbs.map((crumb, i) => (
              <div key={i} className="flex items-center">
                {i > 0 && <span className="mx-1.5 text-slate-700">/</span>}
                {i === breadcrumbs.length - 1 ? (
                  <span className="text-slate-300 font-semibold">{crumb}</span>
                ) : (
                  <button
                    onClick={() => navigate(getBreadcrumbPath(i))}
                    className="hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    {crumb}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search → Command Palette trigger */}
          <button
            onClick={() => setCommandOpen(true)}
            className="flex items-center gap-2 w-64 md:w-72 px-3 py-1.5 border border-teal-500/20 rounded-lg bg-slate-900/50 text-slate-500 hover:border-teal-400/40 hover:text-slate-400 text-sm transition-all text-left"
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1">Search, navigate, act...</span>
            <span className="text-xs border border-slate-700 rounded px-1.5 py-0.5 font-semibold">⌘K</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="w-10 h-10 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-amber-400 hover:border-amber-500/30 flex items-center justify-center transition-all"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Text Size Controls */}
          <div className="relative">
            <button
              onClick={() => { setShowTextControls(!showTextControls); setShowNotifications(false); setShowProfile(false); }}
              className="w-10 h-10 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-teal-400 hover:border-teal-500/30 flex items-center justify-center transition-all"
            >
              <Type className="w-4 h-4" />
            </button>
            {showTextControls && (
              <div className="absolute right-0 top-full mt-2 bg-slate-900/95 backdrop-blur-xl border border-teal-500/20 rounded-xl shadow-xl p-3 flex items-center gap-2 z-50">
                <button onClick={() => adjustFontSize(-1)} className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"><Minus className="w-3 h-3" /></button>
                <span className="text-slate-300 text-sm font-mono w-8 text-center">{fontSize}</span>
                <button onClick={() => adjustFontSize(1)} className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"><Plus className="w-3 h-3" /></button>
                <button onClick={() => { setFontSize(14); document.documentElement.style.setProperty('--font-size', '14px'); }} className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"><RotateCcw className="w-3 h-3" /></button>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => { setShowNotifications(!showNotifications); setShowTextControls(false); setShowProfile(false); }}
              className="relative w-10 h-10 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-teal-400 hover:border-teal-500/30 flex items-center justify-center transition-all"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unreadCount}</span>
              )}
            </button>
            {showNotifications && <NotificationPanel onClose={() => setShowNotifications(false)} />}
          </div>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); setShowTextControls(false); }}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-teal-500/30 transition-all"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">{user?.name.charAt(0) ?? 'U'}</span>
              </div>
              <div className="text-left hidden md:block">
                <div className="text-xs font-medium text-slate-200">{user?.name ?? 'User'}</div>
                <div className="text-[10px] text-slate-500">{user?.role ?? 'viewer'}</div>
              </div>
            </button>
            {showProfile && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900/95 backdrop-blur-xl border border-teal-500/20 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="p-4 border-b border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center">
                      <span className="text-white font-bold">{user?.name.charAt(0)}</span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-100">{user?.name}</div>
                      <div className="text-xs text-slate-400">{user?.designation}</div>
                      <div className="text-xs text-slate-500">{user?.email}</div>
                    </div>
                  </div>
                </div>
                <div className="p-2">
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-slate-100 hover:bg-slate-800/50 rounded-lg transition-colors">
                    <User className="w-4 h-4" /> Profile Settings
                  </button>
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/5 rounded-lg transition-colors">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
