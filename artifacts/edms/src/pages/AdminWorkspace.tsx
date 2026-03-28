import { GlassCard, Badge, Button } from '../components/ui/Shared';
import { MOCK_AUDIT_LOG } from '../lib/mock';
import { Server, Activity, ShieldCheck, Database, FileSearch, ClipboardList, Settings, Megaphone, ArrowRight, AlertTriangle, CopyCheck, Users } from 'lucide-react';
import { useNavigate } from 'react-router';

const quickLinks = [
  { icon: FileSearch, label: 'OCR Monitor', path: '/ocr', description: 'Pipeline status and job tracking', color: 'text-teal-400 bg-teal-500/10' },
  { icon: Users, label: 'User Administration', path: '/admin/users', description: 'Create, edit, and retire workspace accounts', color: 'text-sky-400 bg-sky-500/10' },
  { icon: CopyCheck, label: 'Deduplication', path: '/admin/deduplication', description: 'Duplicate groups, hash scans, and storage cleanup decisions', color: 'text-emerald-400 bg-emerald-500/10' },
  { icon: ClipboardList, label: 'Audit Log', path: '/audit', description: 'System event traceability', color: 'text-blue-400 bg-blue-500/10' },
  { icon: Megaphone, label: 'Banner Management', path: '/banners', description: 'Announcements and notices', color: 'text-amber-400 bg-amber-500/10' },
  { icon: Settings, label: 'Settings', path: '/settings', description: 'System configuration', color: 'text-slate-400 bg-slate-500/10' },
];

export default function AdminWorkspace() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Admin & System Health</h1>
        <p className="text-slate-400 text-sm">OCR Pipeline Monitor, Audit Visibility, and System Diagnostics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { icon: Server, label: 'OCR Engine Status', value: 'Operational', color: 'text-teal-400 bg-teal-500/10', dot: 'bg-teal-500' },
          { icon: Database, label: 'Database', value: 'Healthy', color: 'text-blue-400 bg-blue-500/10', dot: 'bg-blue-500' },
          { icon: ShieldCheck, label: 'Security', value: 'Nominal', color: 'text-emerald-400 bg-emerald-500/10', dot: 'bg-emerald-500' },
          { icon: AlertTriangle, label: 'Active Alerts', value: '1 Warning', color: 'text-amber-400 bg-amber-500/10', dot: 'bg-amber-500' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <GlassCard key={s.label} className="p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full ${s.color} flex items-center justify-center shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm text-slate-400 font-medium">{s.label}</div>
                <div className="text-lg font-bold text-white flex items-center gap-2">
                  {s.value} <span className={`w-2 h-2 rounded-full ${s.dot} animate-pulse`} />
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-400" /> Recent System Events
          </h2>
          <div className="space-y-3">
            {MOCK_AUDIT_LOG.map(e => (
              <div key={e.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => navigate('/audit')}>
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-200">{e.action}</p>
                  <p className="text-[11px] text-slate-500 font-mono">{e.entity} · {e.user} · {e.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/audit')} className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 mt-3 transition-colors">
            View Full Audit Log <ArrowRight className="w-3 h-3" />
          </button>
        </GlassCard>

        <div className="space-y-4">
          <GlassCard className="p-6">
            <h2 className="text-base font-bold text-white mb-4">Quick Links</h2>
            <div className="space-y-2">
              {quickLinks.map(link => {
                const Icon = link.icon;
                return (
                  <button
                    key={link.label}
                    onClick={() => navigate(link.path)}
                    className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-slate-800/40 transition-colors text-left group"
                  >
                    <div className={`w-9 h-9 rounded-lg ${link.color} flex items-center justify-center shrink-0`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-200">{link.label}</p>
                      <p className="text-xs text-slate-500">{link.description}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-teal-400 transition-colors" />
                  </button>
                );
              })}
            </div>
          </GlassCard>

          <GlassCard className="p-5 border-amber-500/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-amber-300 mb-1">OCR Engine Maintenance</h3>
                <p className="text-xs text-slate-400">Scheduled restart at 03:00 AM UTC. 45 minutes of reduced throughput expected.</p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
