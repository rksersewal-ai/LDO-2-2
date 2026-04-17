import { useState, useRef, useEffect } from "react";
import {
  Search,
  Bell,
  User,
  Type,
  LogOut,
  Minus,
  Plus,
  RotateCcw,
  Sun,
  Moon,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../../lib/auth";
import { NotificationPanel } from "./NotificationPanel";

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showTextControls, setShowTextControls] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [isLightMode, setIsLightMode] = useState(() => {
    const stored = localStorage.getItem("ldo2-theme");
    if (stored === "light") {
      document.documentElement.classList.add("light-theme");
      return true;
    }
    if (stored === "dark") {
      document.documentElement.classList.remove("light-theme");
      return false;
    }
    return document.documentElement.classList.contains("light-theme");
  });

  const paths = location.pathname.split("/").filter(Boolean);
  const breadcrumbs = [
    "Home",
    ...paths.map((p) => p.charAt(0).toUpperCase() + p.slice(1)),
  ];

  const adjustFontSize = (delta: number) => {
    const next = Math.max(12, Math.min(18, fontSize + delta));
    setFontSize(next);
    document.documentElement.style.setProperty("--font-size", `${next}px`);
  };
  const resetFontSize = () => {
    setFontSize(14);
    document.documentElement.style.setProperty("--font-size", "14px");
  };

  const toggleTheme = () => {
    const isLight = document.documentElement.classList.toggle("light-theme");
    setIsLightMode(isLight);
    localStorage.setItem("ldo2-theme", isLight ? "light" : "dark");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="h-20 px-8 flex items-center justify-between z-30 relative">
      <div className="flex items-center gap-4">
        <div
          className="flex items-center text-sm text-muted-foreground"
          style={{ fontWeight: 500 }}
        >
          {breadcrumbs.map((crumb, i) => (
            <div key={i} className="flex items-center">
              {i > 0 && (
                <span className="mx-2 text-muted-foreground/50">/</span>
              )}
              <span
                className={i === breadcrumbs.length - 1 ? "text-primary" : ""}
              >
                {crumb}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Global Omnisearch */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          </div>
          <input
            type="text"
            className="block w-64 md:w-96 pl-10 pr-3 py-2 border border-border/50 rounded-xl leading-5 bg-card/50 backdrop-blur-md text-foreground placeholder-muted-foreground focus:outline-none focus:bg-card focus:border-primary/50 focus:ring-1 focus:ring-primary/50 sm:text-sm transition-all"
            placeholder="Search documents, PLs, OCR text..."
            aria-label="Search"
            onFocus={() => navigate("/documents")}
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span
              className="text-muted-foreground text-xs border border-border rounded px-1.5 py-0.5"
              style={{ fontWeight: 600 }}
            >
              ⌘K
            </span>
          </div>
        </div>

        {/* Theme Toggle */}
        <button
          className="text-muted-foreground hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded-lg outline-none"
          title="Toggle Theme"
          aria-label="Toggle Theme"
          onClick={toggleTheme}
        >
          {isLightMode ? (
            <Moon className="w-5 h-5" />
          ) : (
            <Sun className="w-5 h-5" />
          )}
        </button>

        {/* Text Size Controls */}
        <div className="relative">
          <button
            className="text-muted-foreground hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded-lg outline-none"
            title="Adjust Text Size"
            aria-label="Adjust Text Size"
            aria-expanded={showTextControls}
            onClick={() => setShowTextControls(!showTextControls)}
          >
            <Type className="w-5 h-5" />
          </button>
          {showTextControls && (
            <div className="absolute top-full right-0 mt-2 bg-popover/95 backdrop-blur-xl border border-border rounded-xl shadow-xl p-3 z-50 flex items-center gap-2">
              <button
                onClick={() => adjustFontSize(-1)}
                className="w-7 h-7 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground flex items-center justify-center focus-visible:ring-2 focus-visible:ring-ring outline-none"
                aria-label="Decrease Text Size"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span
                className="text-xs text-muted-foreground w-8 text-center"
                aria-live="polite"
              >
                {fontSize}
              </span>
              <button
                onClick={() => adjustFontSize(1)}
                className="w-7 h-7 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground flex items-center justify-center focus-visible:ring-2 focus-visible:ring-ring outline-none"
                aria-label="Increase Text Size"
              >
                <Plus className="w-3 h-3" />
              </button>
              <button
                onClick={resetFontSize}
                className="w-7 h-7 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground flex items-center justify-center focus-visible:ring-2 focus-visible:ring-ring outline-none"
                title="Reset Text Size"
                aria-label="Reset Text Size"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            className="relative text-muted-foreground hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded-lg outline-none"
            aria-label="Toggle notifications"
            aria-expanded={showNotifications}
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary border-2 border-background"></span>
            </span>
          </button>
          {showNotifications && (
            <NotificationPanel onClose={() => setShowNotifications(false)} />
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            className="flex items-center gap-3 pl-6 border-l border-border cursor-pointer focus-visible:ring-2 focus-visible:ring-ring rounded-lg outline-none group"
            aria-label="Toggle user menu"
            aria-expanded={showProfile}
            onClick={() => setShowProfile(!showProfile)}
          >
            <div className="text-right hidden md:block">
              <div
                className="text-sm text-foreground"
                style={{ fontWeight: 600 }}
              >
                {user?.name || "User"}
              </div>
              <div className="text-[10px] text-primary/80 uppercase tracking-wider">
                {user?.designation || "Role"}
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center text-primary overflow-hidden group-hover:border-primary/50 transition-colors">
              <User className="w-5 h-5" />
            </div>
          </button>
          {showProfile && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="p-4 border-b border-border">
                <div
                  className="text-sm text-foreground"
                  style={{ fontWeight: 600 }}
                >
                  {user?.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {user?.email}
                </div>
                <div className="text-[10px] text-primary/80 uppercase mt-1">
                  {user?.role} • {user?.department}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors"
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
