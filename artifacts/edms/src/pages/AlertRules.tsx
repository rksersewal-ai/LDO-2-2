import { useState } from 'react';
import { GlassCard, Badge, Button, Input, Select, PageHeader } from '../components/ui/Shared';
import { Bell, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, AlertTriangle, Clock, CheckCircle, X } from 'lucide-react';
import { toast } from 'sonner';

type TriggerType = 'OVERDUE' | 'STATUS_CHANGE' | 'THRESHOLD' | 'SCHEDULED';
type NotifyChannel = 'IN_APP' | 'EMAIL' | 'BOTH';

interface AlertRule {
  id: string;
  name: string;
  trigger: TriggerType;
  condition: string;
  channel: NotifyChannel;
  notifyRoles: string[];
  enabled: boolean;
  createdAt: string;
  lastFired?: string;
}

const INITIAL_RULES: AlertRule[] = [
  { id: 'AR-001', name: 'Work Record Overdue', trigger: 'OVERDUE', condition: 'daysTaken > targetDays', channel: 'BOTH', notifyRoles: ['supervisor', 'admin'], enabled: true, createdAt: '2026-01-10', lastFired: '2026-03-20' },
  { id: 'AR-002', name: 'Case Not Resolved in 7 Days', trigger: 'OVERDUE', condition: 'case.openDays > 7', channel: 'IN_APP', notifyRoles: ['admin', 'supervisor'], enabled: true, createdAt: '2026-01-15', lastFired: '2026-03-18' },
  { id: 'AR-003', name: 'Document Status Changed to Obsolete', trigger: 'STATUS_CHANGE', condition: 'document.status == OBSOLETE', channel: 'EMAIL', notifyRoles: ['engineer', 'supervisor'], enabled: false, createdAt: '2026-02-01' },
  { id: 'AR-004', name: 'OCR Failure Rate High', trigger: 'THRESHOLD', condition: 'ocr.failRate > 20%', channel: 'BOTH', notifyRoles: ['admin'], enabled: true, createdAt: '2026-02-14', lastFired: '2026-03-22' },
  { id: 'AR-005', name: 'Weekly Pending Approvals Digest', trigger: 'SCHEDULED', condition: 'approvals.pending > 0 — Weekly', channel: 'EMAIL', notifyRoles: ['admin', 'supervisor'], enabled: true, createdAt: '2026-03-01', lastFired: '2026-03-22' },
];

const TRIGGER_LABELS: Record<TriggerType, string> = { OVERDUE: 'Overdue', STATUS_CHANGE: 'Status Change', THRESHOLD: 'Threshold', SCHEDULED: 'Scheduled' };
const TRIGGER_COLORS: Record<TriggerType, 'danger' | 'warning' | 'processing' | 'default'> = { OVERDUE: 'danger', STATUS_CHANGE: 'warning', THRESHOLD: 'processing', SCHEDULED: 'default' };
const CHANNEL_LABELS: Record<NotifyChannel, string> = { IN_APP: 'In-App', EMAIL: 'Email', BOTH: 'Both' };

const EMPTY_RULE: Omit<AlertRule, 'id' | 'createdAt'> = {
  name: '',
  trigger: 'OVERDUE',
  condition: '',
  channel: 'IN_APP',
  notifyRoles: ['admin'],
  enabled: true,
};

export default function AlertRules() {
  const [rules, setRules] = useState(INITIAL_RULES);
  const [editRule, setEditRule] = useState<AlertRule | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_RULE);

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
    const rule = rules.find(r => r.id === id);
    toast.success(`Rule "${rule?.name}" ${rule?.enabled ? 'disabled' : 'enabled'}`);
  };

  const deleteRule = (id: string) => {
    const rule = rules.find(r => r.id === id);
    setRules(prev => prev.filter(r => r.id !== id));
    toast.success(`Rule "${rule?.name}" deleted`);
  };

  const openEdit = (rule: AlertRule) => { setEditRule(rule); setForm({ ...rule }); setCreating(false); };
  const openCreate = () => { setEditRule(null); setForm(EMPTY_RULE); setCreating(true); };

  const saveRule = () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (editRule) {
      setRules(prev => prev.map(r => r.id === editRule.id ? { ...editRule, ...form } : r));
      toast.success('Rule updated');
    } else {
      const newRule: AlertRule = { ...form, id: `AR-${String(rules.length + 1).padStart(3, '0')}`, createdAt: new Date().toISOString().split('T')[0] };
      setRules(prev => [...prev, newRule]);
      toast.success('Alert rule created');
    }
    setCreating(false);
    setEditRule(null);
  };

  const showForm = creating || editRule !== null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader title="Alert Rules" subtitle="Define conditions that trigger notifications to team members.">
        <Button onClick={openCreate} size="sm" className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Rule
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Rules', value: rules.length, icon: Bell, color: 'text-primary bg-teal-500/10' },
          { label: 'Active', value: rules.filter(r => r.enabled).length, icon: CheckCircle, color: 'text-emerald-400 bg-emerald-500/10' },
          { label: 'Overdue Triggers', value: rules.filter(r => r.trigger === 'OVERDUE').length, icon: Clock, color: 'text-amber-400 bg-amber-500/10' },
          { label: 'Disabled', value: rules.filter(r => !r.enabled).length, icon: AlertTriangle, color: 'text-muted-foreground bg-slate-500/10' },
        ].map(s => (
          <GlassCard key={s.label} className="p-4">
            <div className={`w-8 h-8 rounded-lg ${s.color} flex items-center justify-center mb-2`}>
              <s.icon className="w-4 h-4" />
            </div>
            <div className="text-xl font-bold text-white tabular-nums">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </GlassCard>
        ))}
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <GlassCard className="p-5 border-teal-500/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">{editRule ? 'Edit Rule' : 'New Alert Rule'}</h3>
            <button onClick={() => { setCreating(false); setEditRule(null); }}><X className="w-4 h-4 text-muted-foreground hover:text-white" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Rule Name *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Work Record Overdue" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Trigger Type</label>
              <Select value={form.trigger} onChange={e => setForm(f => ({ ...f, trigger: e.target.value as TriggerType }))}>
                <option value="OVERDUE">Overdue</option>
                <option value="STATUS_CHANGE">Status Change</option>
                <option value="THRESHOLD">Threshold</option>
                <option value="SCHEDULED">Scheduled</option>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Notification Channel</label>
              <Select value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value as NotifyChannel }))}>
                <option value="IN_APP">In-App Only</option>
                <option value="EMAIL">Email Only</option>
                <option value="BOTH">Both</option>
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Condition</label>
              <Input value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))} placeholder="e.g. daysTaken > targetDays" className="font-mono text-xs" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Notify Roles (comma-separated)</label>
              <Input value={form.notifyRoles.join(', ')} onChange={e => setForm(f => ({ ...f, notifyRoles: e.target.value.split(',').map(s => s.trim()) }))} placeholder="admin, supervisor" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button onClick={saveRule} size="sm">{editRule ? 'Save Changes' : 'Create Rule'}</Button>
            <Button variant="ghost" size="sm" onClick={() => { setCreating(false); setEditRule(null); }}>Cancel</Button>
          </div>
        </GlassCard>
      )}

      {/* Rules List */}
      <GlassCard className="overflow-hidden">
        <div className="px-5 py-4 border-b border-white/6">
          <h3 className="text-sm font-semibold text-white">{rules.length} Alert Rules</h3>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {rules.map(rule => (
            <div key={rule.id} className={`flex items-center gap-4 px-5 py-4 ${!rule.enabled ? 'opacity-50' : ''}`}>
              <button onClick={() => toggleRule(rule.id)} className="shrink-0 text-muted-foreground hover:text-primary transition-colors">
                {rule.enabled ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-white">{rule.name}</span>
                  <Badge variant={TRIGGER_COLORS[rule.trigger]} size="sm">{TRIGGER_LABELS[rule.trigger]}</Badge>
                  <Badge variant="default" size="sm">{CHANNEL_LABELS[rule.channel]}</Badge>
                </div>
                <div className="text-xs text-muted-foreground font-mono">{rule.condition}</div>
                <div className="text-xs text-slate-600 mt-0.5">
                  Notifies: {rule.notifyRoles.join(', ')} ·{' '}
                  {rule.lastFired ? `Last fired: ${rule.lastFired}` : 'Never fired'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openEdit(rule)} className="w-7 h-7 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground/90 flex items-center justify-center transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => deleteRule(rule.id)} className="w-7 h-7 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 flex items-center justify-center transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
