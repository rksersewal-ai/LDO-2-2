import { useEffect, useState } from 'react';
import { GlassCard, Badge, Button } from '../components/ui/Shared';
import { MOCK_APPROVALS } from '../lib/mockExtended';
import { CheckSquare, X, FileText, Clock, AlertCircle, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import { DocumentPreviewButton, getDocumentContextAttributes } from '../components/documents/DocumentPreviewActions';

const statusVariant = (s: string) => {
  if (s === 'Approved') return 'success' as const;
  if (s === 'Pending') return 'warning' as const;
  if (s === 'Rejected') return 'danger' as const;
  return 'default' as const;
};

export default function Approvals() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<string>('Pending');
  const [selectedApproval, setSelectedApproval] = useState<typeof MOCK_APPROVALS[0] | null>(null);
  const [approvals, setApprovals] = useState(MOCK_APPROVALS);

  const filtered = filter === 'All' ? approvals : approvals.filter(a => a.status === filter);
  const pendingCount = approvals.filter(a => a.status === 'Pending').length;

  const focusApproval = (approval: typeof MOCK_APPROVALS[0] | null) => {
    setSelectedApproval(approval);
    const next = new URLSearchParams(searchParams);
    if (approval) {
      next.set('id', approval.id);
      if (approval.status !== 'Pending' && filter === 'Pending') {
        setFilter('All');
      }
    } else {
      next.delete('id');
    }
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    const requestedId = searchParams.get('id');
    if (!requestedId) {
      return;
    }
    const match = approvals.find((approval) => approval.id === requestedId) ?? null;
    if (match) {
      setSelectedApproval(match);
      if (match.status !== 'Pending') {
        setFilter('All');
      }
    }
  }, [approvals, searchParams]);

  const handleAction = (id: string, action: 'Approved' | 'Rejected') => {
    setApprovals(prev => prev.map(a => a.id === id ? { ...a, status: action } : a));
    focusApproval(null);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Approvals</h1>
        <p className="text-muted-foreground text-sm">
          Review and action pending approval requests.{' '}
          {pendingCount > 0 && <span className="text-amber-400 font-semibold">{pendingCount} items awaiting your decision.</span>}
        </p>
      </div>

      <div className="flex gap-2">
        {['Pending', 'Approved', 'Rejected', 'All'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm transition-colors border font-medium ${
              filter === s ? 'bg-teal-500/20 border-teal-500/40 text-primary/90' : 'bg-secondary/50 border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {s} {s === 'Pending' && `(${pendingCount})`}
          </button>
        ))}
      </div>

      <div className={`grid gap-6 ${selectedApproval ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        <div className="space-y-3">
          {filtered.length === 0 && (
            <GlassCard className="p-12 text-center">
              <CheckCircle className="w-10 h-10 text-primary mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No {filter.toLowerCase()} approvals</p>
            </GlassCard>
          )}
          {filtered.map(apr => (
            <GlassCard
              key={apr.id}
              className={`p-4 hover:border-teal-500/40 cursor-pointer transition-all ${selectedApproval?.id === apr.id ? 'border-teal-500/50' : ''}`}
              onClick={() => focusApproval(apr)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm font-semibold text-foreground">{apr.title}</span>
                    <Badge variant={statusVariant(apr.status)}>{apr.status}</Badge>
                    {apr.urgency === 'High' && <Badge variant="danger">High Priority</Badge>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="font-mono text-primary">{apr.id}</span>
                    <span>{apr.type}</span>
                    <span>By {apr.requester}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Due {apr.dueDate}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {apr.status === 'Pending' && (
                    <>
                      <button
                        onClick={e => { e.stopPropagation(); handleAction(apr.id, 'Approved'); }}
                        className="p-1.5 rounded-lg bg-teal-500/10 text-primary hover:bg-teal-500/20 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleAction(apr.id, 'Rejected'); }}
                        className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <ArrowRight className="w-4 h-4 text-slate-600 self-center" />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        {selectedApproval && (
          <GlassCard className="p-6 self-start">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white mb-1">{selectedApproval.title}</h2>
                <span className="font-mono text-xs text-primary">{selectedApproval.id}</span>
              </div>
              <button onClick={() => focusApproval(null)} className="text-muted-foreground hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 mb-6">
              {[
                { label: 'Type', value: selectedApproval.type },
                { label: 'Requester', value: selectedApproval.requester },
                { label: 'Submitted', value: selectedApproval.submitted },
                { label: 'Due Date', value: selectedApproval.dueDate },
                { label: 'Status', value: selectedApproval.status },
                { label: 'Priority', value: selectedApproval.urgency },
              ].map(f => (
                <div key={f.label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{f.label}</span>
                  <span className="text-foreground font-medium">{f.value}</span>
                </div>
              ))}
            </div>
            {selectedApproval.linkedDoc && (
              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-2">Linked Document</p>
                <div
                  {...getDocumentContextAttributes(selectedApproval.linkedDoc, selectedApproval.title)}
                  className="flex items-center gap-2 p-2 rounded-lg bg-secondary/40 hover:bg-secondary/60 w-full transition-colors"
                >
                  <button
                    onClick={() => navigate(`/documents/${selectedApproval.linkedDoc}`)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="text-sm font-mono text-primary">{selectedApproval.linkedDoc}</span>
                    <ArrowRight className="w-3 h-3 text-slate-600 ml-auto" />
                  </button>
                  <DocumentPreviewButton
                    documentId={selectedApproval.linkedDoc}
                    title={selectedApproval.title}
                    iconOnly
                    className="h-8 min-h-0 px-2 text-foreground/90 hover:text-teal-200"
                  />
                </div>
              </div>
            )}
            {selectedApproval.status === 'Pending' && (
              <div className="flex gap-3">
                <Button className="flex-1" onClick={() => handleAction(selectedApproval.id, 'Approved')}>
                  <CheckCircle className="w-4 h-4" /> Approve
                </Button>
                <Button variant="danger" className="flex-1" onClick={() => handleAction(selectedApproval.id, 'Rejected')}>
                  <XCircle className="w-4 h-4" /> Reject
                </Button>
              </div>
            )}
          </GlassCard>
        )}
      </div>
    </div>
  );
}
