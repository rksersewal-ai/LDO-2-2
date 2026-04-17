import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../lib/auth";
import { PreferencesService } from "../services/PreferencesService";
import {
  AlertCircle,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  Layers3,
  Loader2,
  Lock,
  Shield,
  ShieldCheck,
} from "lucide-react";

const DEMO_CREDENTIALS = [
  { u: "admin", p: "admin123", r: "Administrator" },
  { u: "a.kowalski", p: "ldo2pass", r: "Engineering" },
  { u: "m.chen", p: "ldo2pass", r: "Review" },
  { u: "s.patel", p: "ldo2pass", r: "Supervisor" },
];

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading, error, sessionExpired, clearError } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const ok = await login(username, password);
    if (ok) {
      const lastPath = PreferencesService.get().lastVisitedPath;
      navigate(lastPath && lastPath !== "/login" ? lastPath : "/");
    }
  };

  return (
    <div className="app-shell-bg min-h-screen px-4 py-6 md:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-stretch gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="industrial-panel relative overflow-hidden px-6 py-8 md:px-8 md:py-10">
          <div className="max-w-xl">
            <div className="section-kicker">LDO-2 Document Control</div>
            <h1 className="mt-3 max-w-lg text-4xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl">
              Production-grade document governance for high-density operations.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground md:text-[15px]">
              The workspace is tuned for engineering, records, workflow, and
              system-health teams working on the same operational spine.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              {
                label: "Role-aware lanes",
                value: "12",
                note: "navigation groups aligned to real work",
                icon: Layers3,
              },
              {
                label: "Audit-safe actions",
                value: "AA",
                note: "contrast and workflow states tuned for clarity",
                icon: ShieldCheck,
              },
              {
                label: "Fast restore",
                value: "<1m",
                note: "returns operators to the last workspace route",
                icon: Clock,
              },
            ].map(({ label, value, note, icon: Icon }) => (
              <div
                key={label}
                className="industrial-subpanel rounded-3xl border border-border/70 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {label}
                  </span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground">
                  {value}
                </div>
                <p className="mt-2 text-sm leading-5 text-muted-foreground">
                  {note}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-[28px] border border-border/70 bg-card/70 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">
                  Guided Access
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-foreground">
                  Demo credentials mapped to live workspace roles
                </h2>
              </div>
              <div className="hidden rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] font-medium text-muted-foreground md:inline-flex">
                Light theme enabled by default
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {DEMO_CREDENTIALS.map((credential) => (
                <button
                  key={credential.u}
                  type="button"
                  onClick={() => {
                    setUsername(credential.u);
                    setPassword(credential.p);
                    clearError();
                  }}
                  className="group rounded-2xl border border-border/70 bg-background/75 p-4 text-left transition-all hover:border-primary/25 hover:bg-card"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {credential.r}
                      </p>
                      <p className="mt-1 font-mono text-xs text-primary">
                        {credential.u}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Password:{" "}
                    <span className="font-mono text-foreground/80">
                      {credential.p}
                    </span>
                  </p>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="industrial-panel flex items-center justify-center p-6 md:p-8">
          <div className="w-full max-w-md space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-border/70 bg-card/80 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                <img
                  src="/login-logo.png"
                  alt="LDO-2 EDMS"
                  className="h-11 w-11 object-contain"
                />
              </div>
              <div>
                <p className="section-kicker">Secure Access</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-foreground">
                  Sign in to the EDMS workspace
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Continue to records, PLs, workflow queues, and reporting.
                </p>
              </div>
            </div>

            {sessionExpired && (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="text-sm">
                  Your session expired. Sign in again to resume your last route.
                </p>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-900">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="space-y-5 rounded-[28px] border border-border/70 bg-card/80 p-6 shadow-[0_20px_48px_rgba(15,23,42,0.08)] backdrop-blur-xl"
            >
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <h3 className="text-base font-semibold text-foreground">
                  Workspace authentication
                </h3>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-border/80 bg-background/80 px-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary/35 focus:bg-card focus:ring-4 focus:ring-primary/10"
                  placeholder="e.g. a.kowalski"
                  required
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-border/80 bg-background/80 px-4 pr-12 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary/35 focus:bg-card focus:ring-4 focus:ring-primary/10"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-[0_18px_36px_rgba(8,82,91,0.22)] transition-all hover:translate-y-[-1px] hover:bg-primary/92 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Authenticating
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Enter Workspace
                  </>
                )}
              </button>

              <p className="text-xs leading-5 text-muted-foreground">
                Authentication restores the last active route and applies your
                saved view, typography, and motion preferences automatically.
              </p>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
