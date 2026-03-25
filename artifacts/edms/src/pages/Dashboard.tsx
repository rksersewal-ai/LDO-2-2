import { useNavigate } from 'react-router';
import { GlassCard, Badge, Button } from '../components/ui/Shared';
import { MOCK_DOCUMENTS, MOCK_AUDIT_LOG } from '../lib/mock';
import { MOCK_APPROVALS, MOCK_OCR_JOBS, MOCK_NOTIFICATIONS } from '../lib/mockExtended';
import { useAuth } from '../lib/auth';
import type { UserRole } from '../lib/auth';
import {
  FileText, CheckSquare, ServerCog, AlertCircle, ArrowRight,
  Activity, FolderOpen, Component, Briefcase, ShieldAlert, Bell, ChevronRight
} from 'lucide-react';

interface QuickAction {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
  path: string;
  color: string;
  roles?: UserRole[];
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const pendingApprovals = MOCK_APPROVALS.filter(a => a.status === 'Pending').length;
  const ocrFailed = MOCK_OCR_JOBS.filter(j => j.status === 'Failed').length;
  const ocrProcessing = MOCK_OCR_JOBS.filter(j => j.status === 'Processing').length;
  const unread = MOCK_NOTIFICATIONS.filter(n => !n.read).length;

  const allKpiCards = [
    { icon: FileText, label: 'Total Documents', value: MOCK_DOCUMENTS.length, sub: '3 active PL records', color: 'text-teal-400', bg: 'bg-teal-500/10', path: '/documents', roles: undefined },
    { icon: CheckSquare, label: 'Pending Approvals', value: pendingApprovals, sub: `${MOCK_APPROVALS.length} total requests`, color: 'text-amber-400', bg: 'bg-amber-500/10', path: '/approvals', roles: ['admin', 'supervisor', 'engineer', 'reviewer'] as UserRole[] },
    { icon: ServerCog, label: 'OCR Jobs', value: MOCK_OCR_JOBS.length, sub: `${ocrFailed} failed, ${ocrProcessing} running`, color: 'text-blue-400', bg: 'bg-blue-500/10', path: '/ocr', roles: ['admin'] as UserRole[] },
    { icon: Bell, label: 'Unread Alerts', value: unread, sub: 'Notifications & system alerts', color: 'text-rose-400', bg: 'bg-rose-500/10', path: '/approvals', roles: undefined },
  ];

  const kpiCards = allKpiCards.filter(card => !card.roles || hasPermission(card.roles));

  const allQuickActions: QuickAction[] = [
    { icon: FolderOpen, label: 'Document Hub', desc: 'Browse & manage documents', path: '/documents', color: 'text-teal-400 bg-teal-500/10', roles: undefined },
    { icon: Component, label: 'BOM Explorer', desc: 'Locomotive hierarchy tree', path: '/bom', color: 'text-blue-400 bg-blue-500/10', roles: ['admin', 'supervisor', 'engineer'] },
    { icon: Briefcase, label: 'Work Ledger', desc: 'Track work records', path: '/ledger', color: 'text-indigo-400 bg-indigo-500/10', roles: ['admin', 'supervisor', 'engineer'] },
    { icon: ShieldAlert, label: 'Cases', desc: 'Open discrepancy cases', path: '/cases', color: 'text-rose-400 bg-rose-500/10', roles: ['admin', 'supervisor', 'engineer', 'reviewer'] },
    { icon: CheckSquare, label: 'Approvals', desc: 'Review pending decisions', path: '/approvals', color: 'text-amber-400 bg-amber-500/10', roles: ['admin', 'supervisor', 'engineer', 'reviewer'] },
    { icon: ServerCog, label: 'OCR Monitor', desc: 'Extraction pipeline status', path: '/ocr', color: 'text-purple-400 bg-purple-500/10', roles: ['admin'] },
  ];

  const quickActions = allQuickActions.filter(action => !action.roles || hasPermission(action.roles as UserRole[]));

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white mb-0.5 tracking-tight">Dashboard</h1>
          <p className="text-slate-400 text-sm">
            Good morning, <span className="text-teal-300 font-medium">{user?.name}</span>. System operational.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
          <span className="text-teal-400 text-sm font-medium">All systems nominal</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(card => {
          const Icon = card.icon;
          return (
            <GlassCard
              key={card.label}
              className="p-5 hover:border-teal-500/40 cursor-pointer group transition-all"
              onClick={() => navigate(card.path)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-teal-400 transition-colors" />
              </div>
              <div className="text-2xl font-bold text-white mb-0.5 tabular-nums">{card.value}</div>
              <div className="text-sm font-medium text-slate-300">{card.label}</div>
              <div className="text-xs text-slate-500 mt-1">{card.sub}</div>
            </GlassCard>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Recent Documents</h2>
            <Button variant="ghost" className="text-xs text-teal-400 px-2 py-1" onClick={() => navigate('/documents')}>
              View all <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
          <div className="space-y-2">
            {MOCK_DOCUMENTS.slice(0, 5).map(doc => (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800/40 cursor-pointer transition-colors group"
                onClick={() => navigate(`/documents/${doc.id}`)}
              >
                <div className="w-9 h-9 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-teal-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-200 truncate">{doc.name}</span>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">{doc.id}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={
                    doc.status === 'Approved' ? 'success' :
                    doc.status === 'In Review' ? 'warning' :
                    doc.status === 'Obsolete' ? 'danger' : 'default'
                  }>{doc.status}</Badge>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-teal-400 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <div className="space-y-4">
          {pendingApprovals > 0 && hasPermission(['admin', 'supervisor', 'engineer', 'reviewer']) && (
            <GlassCard className="p-4 border-amber-500/30 bg-amber-950/10">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-300">{pendingApprovals} Pending Approvals</p>
                  <p className="text-xs text-slate-400 mt-0.5">Items awaiting your decision</p>
                  <Button className="mt-2 text-xs px-3 py-1" onClick={() => navigate('/approvals')}>
                    Review Now <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </GlassCard>
          )}

          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-teal-400" />
              <h2 className="text-sm font-bold text-white">Recent Activity</h2>
            </div>
            <div className="space-y-3">
              {MOCK_AUDIT_LOG.slice(0, 4).map(e => (
                <div key={e.id} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-slate-300">{e.action}</p>
                    <p className="text-[11px] text-slate-500 font-mono">{e.entity} • {e.user}</p>
                  </div>
                </div>
              ))}
            </div>
            {hasPermission(['admin']) && (
              <button onClick={() => navigate('/audit')} className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 mt-3 transition-colors">
                Full audit log <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </GlassCard>
        </div>
      </div>

      {quickActions.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-white mb-4">Quick Navigation</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickActions.map(action => {
              const Icon = action.icon;
              return (
                <GlassCard
                  key={action.label}
                  className="p-4 text-center hover:border-teal-500/40 cursor-pointer group transition-all"
                  onClick={() => navigate(action.path)}
                >
                  <div className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center mx-auto mb-2 transition-transform group-hover:scale-110`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-200">{action.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{action.desc}</p>
                </GlassCard>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
