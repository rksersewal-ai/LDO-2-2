import { useState, useRef, useEffect } from 'react';
import { Search, Bell, User, Type, LogOut, Minus, Plus, RotateCcw, Sun, Moon, AlertCircle, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../lib/auth';
import { NotificationPanel } from './NotificationPanel';
import { CommandPalette } from '../ui/CommandPalette';
import { useTheme } from '../../contexts/ThemeContext';
import { PreferencesService, type UserPreferences } from '../../services/PreferencesService';
import { useDocumentChangeAlerts } from '../../hooks/useDocumentChangeAlerts';
import { useAppInbox } from '../../hooks/useAppInbox';
import { InboxService } from '../../services/InboxService';
import type { AppInboxItem } from '../../lib/types';
import type { InboxAction } from '../../lib/inboxActions';

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasPermission } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { alerts: documentChangeAlerts, approveAlert, bypassAlert } = useDocumentChangeAlerts();
  const { items: inboxItems, source: inboxSource, refresh: refreshInbox } = useAppInbox();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showTextControls, setShowTextControls] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>(() => PreferencesService.get());
  const [commandOpen, setCommandOpen] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const [busyInboxActionId, setBusyInboxActionId] = useState<string | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const paths = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = ['Home', ...paths.map(p => p.charAt(0).toUpperCase() + p.slice(1))];
  const standardInboxItems = inboxItems.filter((item) => item.type !== 'supervisor_review');
  const unreadCount = standardInboxItems.length + documentChangeAlerts.length;

  // Breadcrumb navigation helper
  const getBreadcrumbPath = (index: number): string => {
    if (index === 0) return '/';
    const pathSegments = paths.slice(0, index);
    return '/' + pathSegments.join('/');
  };

  const fontSize = preferences.fontSize;

  const applyPreferences = (prefs: UserPreferences) => {
    setPreferences(prefs);
    document.documentElement.style.setProperty('--app-font-size', `${prefs.fontSize}px`);
    document.documentElement.classList.toggle('reduce-motion', prefs.reduceMotion);
  };

  const adjustFontSize = (delta: number) => {
    const next = Math.max(12, Math.min(18, fontSize + delta));
    applyPreferences(PreferencesService.set({ fontSize: next }));
  };

  const resetFontSize = () => {
    applyPreferences(PreferencesService.set({ fontSize: 14 }));
  };

  const closeFloatingPanels = () => {
    setShowNotifications(false);
    setShowTextControls(false);
    setShowProfile(false);
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const handleInboxWorkflowAction = async (notification: AppInboxItem, action: InboxAction) => {
    setBusyInboxActionId(`${notification.id}:${action.key}`);
    try {
      await InboxService.actOnItem(notification.id, action.payload);
      await refreshInbox();
    } catch (error) {
      console.error('[Header] Failed inbox workflow action', error);
    } finally {
      setBusyInboxActionId(null);
    }
  };

  const floatingToggleClass = (active: boolean, tone: 'teal' | 'rose' = 'teal') => {
    if (active) {
      return tone === 'rose'
        ? 'bg-rose-500/12 border-rose-400/30 text-rose-200 shadow-[0_10px_28px_rgba(244,63,94,0.18)]'
        : 'bg-teal-500/12 border-teal-400/35 text-teal-100 shadow-[0_10px_28px_rgba(20,184,166,0.16)]';
    }

    return 'bg-secondary/50 border-border text-muted-foreground hover:text-primary/90 hover:border-teal-500/30 hover:bg-secondary/70';
  };

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

  useEffect(() => {
    if (!showTextControls && !showNotifications && !showProfile) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (headerRef.current?.contains(event.target as Node)) {
        return;
      }
      closeFloatingPanels();
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [showNotifications, showProfile, showTextControls]);

  useEffect(() => {
    applyPreferences(PreferencesService.get());
    return PreferencesService.subscribe((prefs) => applyPreferences(prefs));
  }, []);

  useEffect(() => {
    if (!preferences.showLiveClock) {
      return;
    }
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [preferences.showLiveClock]);

  const clockLabel = now.toLocaleString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: preferences.timeFormat === '24h' ? '2-digit' : undefined,
    hour12: preferences.timeFormat === '12h',
  });

  return (
    <>
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />

      <div ref={headerRef}>
        {/* Dismissible Announcement Banner */}
        {showBanner && (
          <div className="bg-gradient-to-r from-teal-900 to-emerald-900 border-b border-teal-500/30 text-teal-100 text-xs px-4 py-2.5 flex items-center justify-between gap-3 z-20 relative shrink-0">
            <div className="flex items-center gap-2 flex-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="font-semibold">System Maintenance:</span>
              <span>OCR Engine Restart scheduled for 03:00 AM UTC. Expect minor delays in processing.</span>
            </div>
            <button onClick={() => setShowBanner(false)} aria-label="Dismiss banner" className="shrink-0 p-1 hover:bg-teal-800/40 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <header className="h-14 px-6 flex items-center justify-between z-30 relative border-b border-white/[0.04] shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center text-xs text-muted-foreground font-medium">
              {breadcrumbs.map((crumb, i) => (
                <div key={i} className="flex items-center">
                  {i > 0 && <span className="mx-1.5 text-slate-700">/</span>}
                  {i === breadcrumbs.length - 1 ? (
                    <span className="text-foreground/90 font-semibold">{crumb}</span>
                  ) : (
                    <button
                      onClick={() => navigate(getBreadcrumbPath(i))}
                      className="hover:text-foreground transition-colors cursor-pointer"
                    >
                      {crumb}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {preferences.showLiveClock && (
              <div className="hidden md:flex items-center rounded-lg border border-teal-500/18 bg-slate-950/55 px-3 py-1.5 text-xs font-medium text-foreground/90 shadow-[0_10px_26px_rgba(15,23,42,0.22)]">
                {clockLabel}
              </div>
            )}

            {/* Search → Command Palette trigger */}
            <button
              onClick={() => setCommandOpen(true)}
              className="flex items-center gap-2 w-56 md:w-64 xl:w-72 px-3 py-1.5 border border-teal-500/20 rounded-lg bg-secondary/50 text-muted-foreground hover:border-teal-400/40 hover:text-muted-foreground text-sm transition-all text-left"
            >
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1">Search, navigate, act...</span>
              <span className="text-xs border border-border rounded px-1.5 py-0.5 font-semibold">⌘K</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              aria-pressed={theme === 'light'}
              className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-all ${
                theme === 'dark'
                  ? 'bg-card border-border text-foreground hover:bg-secondary'
                  : 'bg-card border-border text-foreground hover:bg-secondary'
              }`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Text Size Controls */}
            <div className="relative">
              <button
                onClick={() => { setShowTextControls(!showTextControls); setShowNotifications(false); setShowProfile(false); }}
                aria-label="Text size controls"
                aria-pressed={showTextControls}
                className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-all ${floatingToggleClass(showTextControls)}`}
              >
                <Type className="w-4 h-4" />
              </button>
              {showTextControls && (
                <div className="absolute right-0 top-full mt-2 bg-card/95 backdrop-blur-xl border border-teal-500/20 rounded-xl shadow-xl p-3 flex items-center gap-2 z-50">
                  <button onClick={() => adjustFontSize(-1)} aria-label="Decrease text size" className="w-7 h-7 rounded-lg bg-secondary text-muted-foreground hover:text-white flex items-center justify-center transition-colors"><Minus className="w-3 h-3" /></button>
                  <span className="text-foreground/90 text-sm font-mono w-8 text-center">{fontSize}</span>
                  <button onClick={() => adjustFontSize(1)} aria-label="Increase text size" className="w-7 h-7 rounded-lg bg-secondary text-muted-foreground hover:text-white flex items-center justify-center transition-colors"><Plus className="w-3 h-3" /></button>
                  <button onClick={resetFontSize} aria-label="Reset text size" className="w-7 h-7 rounded-lg bg-secondary text-muted-foreground hover:text-white flex items-center justify-center transition-colors"><RotateCcw className="w-3 h-3" /></button>
                </div>
              )}
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => { setShowNotifications(!showNotifications); setShowTextControls(false); setShowProfile(false); }}
                aria-label="Notifications"
                aria-pressed={showNotifications}
                className={`relative flex h-10 w-10 items-center justify-center rounded-lg border transition-all ${floatingToggleClass(showNotifications)}`}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unreadCount}</span>
                )}
              </button>
              {showNotifications && (
                <div>
                <NotificationPanel
                  onClose={() => setShowNotifications(false)}
                  inboxItems={standardInboxItems}
                  documentChangeAlerts={documentChangeAlerts}
                  onApproveAlert={approveAlert}
                  onBypassAlert={bypassAlert}
                  onWorkflowAction={handleInboxWorkflowAction}
                  actionable={inboxSource === 'backend'}
                  busyItemId={busyInboxActionId}
                />
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="relative">
              <button
                onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); setShowTextControls(false); }}
                aria-label="Profile menu"
                aria-pressed={showProfile}
                className={`flex items-center gap-2 rounded-xl border pl-2 pr-3 py-1.5 transition-all ${floatingToggleClass(showProfile)}`}
              >
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground text-xs font-bold">{user?.name.charAt(0) ?? 'U'}</span>
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-xs font-medium text-foreground">{user?.name ?? 'User'}</div>
                  <div className="text-[10px] text-muted-foreground">{user?.role ?? 'viewer'}</div>
                </div>
              </button>
              {showProfile && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-card/95 backdrop-blur-xl border border-teal-500/20 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center">
                        <span className="text-white font-bold">{user?.name.charAt(0)}</span>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground">{user?.name}</div>
                        <div className="text-xs text-muted-foreground">{user?.designation}</div>
                        <div className="text-xs text-muted-foreground">{user?.email}</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => { navigate('/profile'); closeFloatingPanels(); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground/90 hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
                    >
                      <User className="w-4 h-4" /> Profile Settings
                    </button>
                    {hasPermission(['admin']) && (
                      <>
                        <button
                          onClick={() => { navigate('/admin/users'); closeFloatingPanels(); }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground/90 hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
                        >
                          <User className="w-4 h-4" /> User Administration
                        </button>
                        <button
                          onClick={() => { navigate('/settings'); closeFloatingPanels(); }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground/90 hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
                        >
                          <Moon className="w-4 h-4" /> System Settings
                        </button>
                      </>
                    )}
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/5 rounded-lg transition-colors">
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
      </div>
    </>
  );
}
