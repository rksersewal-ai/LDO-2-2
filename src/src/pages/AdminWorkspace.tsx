import { GlassCard, Badge, Button } from '../components/ui/Shared';
import { MOCK_AUDIT_LOG } from '../lib/mock';
import { Server, Activity, ShieldCheck, Database, FileSearch, ClipboardList, Settings, Megaphone, ArrowRight, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router';

const quickLinks = [
  { icon: FileSearch, label: 'OCR Monitor', path: '/ocr', description: 'Pipeline status and job tracking', color: 'text-teal-400 bg-teal-500/10' },
  { icon: ClipboardList, label: 'Audit Log', path: '/audit', description: 'System event traceability', color: 'text-blue-400 bg-blue-500/10' },
  { icon: Megaphone, label: 'Banner Management', path: '/banners', description: 'Announcements and notices', color: 'text-amber-400 bg-amber-500/10' },
  { icon: Settings, label: 'Settings', path: '/settings', description: 'System configuration', color: 'text-slate-400 bg-slate-500/10' },
];

export default function AdminWorkspace() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl text-white mb-2" style={{ fontWeight: 700 }}>Admin & System Health</h1>
        <p className="text-slate-400 text-sm">OCR Pipeline Monitor, Audit Visibility, and System Diagnostics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm text-slate-400" style={{ fontWeight: 500 }}>OCR Engine Status</div>
            <div className="text-lg text-white flex items-center gap-2" style={{ fontWeight: 700 }}>
              Operational <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
            </div>
          </div>
        </GlassCard>
        
        <GlassCard className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm text-slate-400" style={{ fontWeight: 500 }}>Queue Depth</div>
            <div className="text-lg text-white" style={{ fontWeight: 700 }}>12 Documents</div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm text-slate-400" style={{ fontWeight: 500 }}>Active Sessions</div>
            <div className="text-lg text-white" style={{ fontWeight: 700 }}>48 Users</div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm text-slate-400" style={{ fontWeight: 500 }}>DB Latency</div>
            <div className="text-lg text-white" style={{ fontWeight: 700 }}>14 ms</div>
          </div>
        </GlassCard>
      </div>

      {/* Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickLinks.map(link => (
          <GlassCard
            key={link.path}
            className="p-5 hover:border-teal-500/40 cursor-pointer transition-all group"
            onClick={() => navigate(link.path)}
          >
            <div className={`w-10 h-10 rounded-lg ${link.color} flex items-center justify-center mb-3`}>
              <link.icon className="w-5 h-5" />
            </div>
            <h3 className="text-sm text-slate-200 mb-1 group-hover:text-teal-300 transition-colors" style={{ fontWeight: 600 }}>{link.label}</h3>
            <p className="text-xs text-slate-500">{link.description}</p>
            <div className="mt-3 text-xs text-teal-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              Open <ArrowRight className="w-3 h-3" />
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Recent Alerts */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg text-white" style={{ fontWeight: 700 }}>System Alerts</h2>
          <Button variant="ghost" className="text-xs" onClick={() => navigate('/audit')}>View Full Audit Log <ArrowRight className="w-3 h-3 ml-1" /></Button>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-rose-500/5 border border-rose-500/20">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span className="text-sm text-rose-300">OCR extraction failed for DOC-2026-9023 — resolution below threshold</span>
            <span className="text-xs text-slate-500 ml-auto">3 hours ago</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-amber-300">Permission denied: s.vance attempted to access Admin Settings</span>
            <span className="text-xs text-slate-500 ml-auto">5 hours ago</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-rose-500/5 border border-rose-500/20">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span className="text-sm text-rose-300">Failed login attempt from 10.0.9.88</span>
            <span className="text-xs text-slate-500 ml-auto">6 hours ago</span>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg text-white" style={{ fontWeight: 700 }}>Recent Audit Events</h2>
          <Button variant="ghost" className="text-xs" onClick={() => navigate('/audit')}>View All <ArrowRight className="w-3 h-3 ml-1" /></Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-700/50 text-slate-400">
                <th className="pb-3 pl-4" style={{ fontWeight: 600 }}>Event ID</th>
                <th className="pb-3" style={{ fontWeight: 600 }}>Action</th>
                <th className="pb-3" style={{ fontWeight: 600 }}>User / System</th>
                <th className="pb-3" style={{ fontWeight: 600 }}>Target Document</th>
                <th className="pb-3" style={{ fontWeight: 600 }}>IP Address</th>
                <th className="pb-3" style={{ fontWeight: 600 }}>Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300">
              {MOCK_AUDIT_LOG.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 pl-4 font-mono text-xs text-slate-500">{log.id}</td>
                  <td className="py-3">
                    <Badge variant={log.action.includes('SUCCESS') ? 'success' : log.action === 'UPDATE' ? 'warning' : 'default'} className="text-[10px]">
                      {log.action}
                    </Badge>
                  </td>
                  <td className="py-3 text-teal-400" style={{ fontWeight: 500 }}>{log.user}</td>
                  <td className="py-3 text-slate-400">{log.document}</td>
                  <td className="py-3 font-mono text-xs text-slate-500">{log.ip}</td>
                  <td className="py-3 text-slate-400">{log.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
