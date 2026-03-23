import { useState } from 'react';
import { Navigate } from 'react-router';
import { Eye, EyeOff, Shield, AlertCircle, Loader2, Lock, Wifi } from 'lucide-react';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { login, isLoading, error, sessionExpired, loginAttempts, clearError, isAuthenticated } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validation, setValidation] = useState<{ username?: string; password?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v: typeof validation = {};
    if (!username.trim()) v.username = 'Username is required.';
    if (!password) v.password = 'Password is required.';
    if (Object.keys(v).length) { setValidation(v); return; }
    setValidation({});
    await login(username.trim(), password);
  };

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-900/20 via-slate-950 to-emerald-900/15 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glow effects */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        {/* LAN Context Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8 text-slate-500 text-xs">
          <Wifi className="w-3.5 h-3.5" />
          <span>Internal Network Access • LAN Zone 10.0.x.x</span>
        </div>

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-teal-500/20">
            <span className="text-white text-2xl" style={{ fontWeight: 700 }}>L2</span>
          </div>
          <h1 className="text-2xl text-white mb-1" style={{ fontWeight: 700 }}>LDO-2 EDMS</h1>
          <p className="text-slate-400 text-sm">Enterprise Document Management System</p>
        </div>

        {/* Session Expired Banner */}
        {sessionExpired && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm text-amber-300" style={{ fontWeight: 600 }}>Session Expired</div>
              <p className="text-xs text-amber-400/80 mt-0.5">Your session has timed out due to inactivity. Please sign in again.</p>
            </div>
          </div>
        )}

        {/* Login Card */}
        <div className="bg-slate-900/60 backdrop-blur-2xl border border-teal-500/20 shadow-2xl shadow-teal-950/50 rounded-2xl p-8">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-4 h-4 text-teal-400" />
            <h2 className="text-lg text-white" style={{ fontWeight: 600 }}>Sign In</h2>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-rose-300">{error}</p>
                {loginAttempts >= 3 && (
                  <p className="text-xs text-rose-400/70 mt-1">Multiple failed attempts detected. Contact IT if you need assistance.</p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-sm text-slate-300 mb-1.5" style={{ fontWeight: 500 }}>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); clearError(); setValidation(v => ({ ...v, username: undefined })); }}
                className={`w-full bg-slate-950/50 border ${validation.username ? 'border-rose-500/50' : 'border-teal-500/20'} text-slate-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/50 transition-all placeholder-slate-600`}
                placeholder="e.g. a.kowalski"
                autoComplete="username"
                autoFocus
              />
              {validation.username && <p className="text-xs text-rose-400 mt-1">{validation.username}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm text-slate-300 mb-1.5" style={{ fontWeight: 500 }}>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError(); setValidation(v => ({ ...v, password: undefined })); }}
                  className={`w-full bg-slate-950/50 border ${validation.password ? 'border-rose-500/50' : 'border-teal-500/20'} text-slate-200 text-sm rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/50 transition-all placeholder-slate-600`}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {validation.password && <p className="text-xs text-rose-400 mt-1">{validation.password}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl text-sm text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-teal-900/20 border border-teal-400/20 flex items-center justify-center gap-2"
              style={{ fontWeight: 600 }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-2 text-slate-600 text-[11px]">
            <Shield className="w-3.5 h-3.5" />
            <span>Authorized personnel only. All access is logged and monitored.</span>
          </div>
          <p className="text-slate-700 text-[10px] mt-2">LDO-2 EDMS v3.8.1 • Internal Systems Division</p>
        </div>

        {/* Demo credentials hint */}
        <div className="mt-6 p-3 rounded-xl bg-slate-900/40 border border-slate-700/30 text-xs text-slate-500">
          <p style={{ fontWeight: 600 }} className="text-slate-400 mb-1">Demo Credentials:</p>
          <p><span className="text-teal-400/80">a.kowalski</span> / ldo2pass (Engineer)</p>
          <p><span className="text-teal-400/80">admin</span> / admin123 (Administrator)</p>
          <p><span className="text-teal-400/80">m.chen</span> / ldo2pass (Reviewer)</p>
        </div>
      </div>
    </div>
  );
}