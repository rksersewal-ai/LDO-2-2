import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../lib/auth';
import { PreferencesService } from '../services/PreferencesService';
import { Shield, Loader2, AlertCircle, Eye, EyeOff, Lock, Clock } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading, error, sessionExpired, clearError } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const ok = await login(username, password);
    if (ok) {
      const lastPath = PreferencesService.get().lastVisitedPath;
      navigate(lastPath && lastPath !== '/login' ? lastPath : '/');
    }
  };

  return (
    <div className="app-shell-bg min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-teal-500/30">
            <span className="text-white font-bold text-2xl">L2</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">LDO-2 EDMS</h1>
          <p className="text-muted-foreground text-sm">Enterprise Document Management System</p>
        </div>

        <div className="bg-card backdrop-blur-xl border border-teal-500/20 rounded-2xl p-8 shadow-2xl shadow-teal-950/50">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Secure Sign In</h2>
          </div>

          {sessionExpired && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-300">Your session has expired. Please sign in again to continue.</p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
              <p className="text-sm text-rose-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-slate-950/50 border border-teal-500/20 text-foreground text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/50 transition-all placeholder:text-muted-foreground"
                placeholder="e.g. a.kowalski"
                required
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-950/50 border border-teal-500/20 text-foreground text-sm rounded-xl px-4 py-3 pr-11 focus:outline-none focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/50 transition-all placeholder:text-muted-foreground"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground/90 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-semibold text-sm transition-all shadow-lg shadow-teal-900/30 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Authenticating…</>
              ) : (
                <><Lock className="w-4 h-4" /> Sign In</>
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 p-4 bg-card/30 border border-border/50 rounded-xl">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">Demo Credentials</p>
          <div className="space-y-1">
            {[
              { u: 'admin', p: 'admin123', r: 'Admin' },
              { u: 'a.kowalski', p: 'ldo2pass', r: 'Engineer' },
              { u: 'm.chen', p: 'ldo2pass', r: 'Reviewer' },
              { u: 's.patel', p: 'ldo2pass', r: 'Supervisor' },
            ].map(c => (
              <button
                key={c.u}
                onClick={() => { setUsername(c.u); setPassword(c.p); clearError(); }}
                className="w-full text-left text-xs text-muted-foreground hover:text-primary/90 transition-colors px-2 py-1 rounded-lg hover:bg-secondary/50"
              >
                <span className="font-mono text-primary">{c.u}</span> / <span className="font-mono text-muted-foreground">{c.p}</span>
                <span className="ml-2 text-slate-600">({c.r})</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
