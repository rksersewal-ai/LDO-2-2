import { useState, useMemo, useEffect } from 'react';
import { GlassCard, Badge, Button, Input, Select } from '../components/ui/Shared';
import { DatePicker } from '../components/ui/DatePicker';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import { useWorkRecords } from '../hooks/useWorkRecords';
import { WorkLedgerService, getTargetDays, checkDuplicates, getKPIStatus } from '../services/WorkLedgerService';
import { WORK_TYPE_DEFINITIONS, SECTION_TYPES, CONCERNED_OFFICERS } from '../lib/constants';
import type { WorkRecord, WorkCategory } from '../lib/types';
import {
  Plus, FileSearch, Briefcase, ChevronRight, X,
  FileText, Link as LinkIcon, AlertTriangle, CheckCircle,
  Clock, Lock, Shield, BarChart3, Layers,
  Unlock, Calendar, Hash, ZapOff, TrendingUp,
  AlertCircle, ChevronDown, Truck, CheckSquare,
} from 'lucide-react';
import { useNavigate } from 'react-router';

const STATUS_VARIANT: Record<WorkRecord['status'], 'success' | 'warning' | 'danger' | 'processing' | 'default'> = {
  OPEN: 'default',
  SUBMITTED: 'processing',
  VERIFIED: 'success',
  CLOSED: 'warning',
};

const STATUS_LABEL: Record<WorkRecord['status'], string> = {
  OPEN: 'Open',
  SUBMITTED: 'In Progress',
  VERIFIED: 'Verified',
  CLOSED: 'Closed',
};

const CATEGORY_LABEL: Record<WorkCategory, string> = {
  GENERAL: 'General',
  DRAWING: 'Drawing',
  SPECIFICATION: 'Specification',
  TENDER: 'Tender',
  SHOP: 'Shop',
  IC: 'IC',
  AMENDMENT: 'Amendment',
  VENDOR: 'Vendor',
  EXTERNAL: 'External',
  FAILURE: 'Failure',
  INSPECTION: 'Inspection',
};

const WORK_CATEGORIES: WorkCategory[] = [
  'GENERAL', 'DRAWING', 'SPECIFICATION', 'TENDER', 'SHOP',
  'IC', 'AMENDMENT', 'VENDOR', 'EXTERNAL', 'FAILURE', 'INSPECTION',
];

function KPIChip({ record }: { record: WorkRecord }) {
  const kpi = getKPIStatus(record);
  return <span className={`text-[10px] font-medium ${kpi.color}`}>{kpi.label}</span>;
}

function AnalyticsPanel({ records }: { records: WorkRecord[] }) {
  const [analytics, setAnalytics] = useState<Awaited<ReturnType<typeof WorkLedgerService.getAnalytics>> | null>(null);

  useEffect(() => {
    WorkLedgerService.getAnalytics().then(setAnalytics);
  }, [records.length]);

  if (!analytics) return null;

  const maxCategoryCount = Math.max(...analytics.byCategory.map(c => c.count), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">By Category</h3>
        <div className="space-y-2">
          {analytics.byCategory.sort((a, b) => b.count - a.count).map(c => (
            <div key={c.category} className="flex items-center gap-3">
              <span className="text-xs text-slate-400 w-28 text-right shrink-0">{CATEGORY_LABEL[c.category as WorkCategory] ?? c.category}</span>
              <div className="flex-1 h-2 bg-slate-800/60 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-400"
                  style={{ width: `${(c.count / maxCategoryCount) * 100}%` }}
                />
              </div>
              <span className="text-xs text-teal-300 font-mono w-4">{c.count}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Average Completion (days)</h3>
        <div className="space-y-2">
          {analytics.avgDaysByType.slice(0, 5).map(t => (
            <div key={t.workType} className="flex items-center gap-3">
              <span className="text-xs text-slate-400 w-36 truncate shrink-0" title={t.workType}>{t.workType}</span>
              <div className="flex-1 h-2 bg-slate-800/60 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${t.avgDays <= t.targetDays ? 'bg-emerald-500' : 'bg-rose-500'}`}
                  style={{ width: `${Math.min(100, (t.avgDays / (t.targetDays * 1.5)) * 100)}%` }}
                />
              </div>
              <span className={`text-xs font-mono w-12 ${t.avgDays <= t.targetDays ? 'text-emerald-400' : 'text-rose-400'}`}>
                {t.avgDays}d / {t.targetDays}d
              </span>
            </div>
          ))}
          {analytics.avgDaysByType.length === 0 && (
            <p className="text-xs text-slate-600">No completed records yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface CreateFormData {
  workCategory: WorkCategory;
  workType: string;
  description: string;
  plNumber: string;
  referenceNumber: string;
  eOfficeNumber: string;
  eOfficeFileNo: string;
  sectionType: string;
  concernedOfficer: string;
  consentGiven: string;
  date: string;
  dispatchDate: string;
  closingDate: string;
}

const EMPTY_FORM: CreateFormData = {
  workCategory: 'GENERAL',
  workType: '',
  description: '',
  plNumber: '',
  referenceNumber: '',
  eOfficeNumber: '',
  eOfficeFileNo: '',
  sectionType: 'General',
  concernedOfficer: '',
  consentGiven: 'N/A',
  date: new Date().toISOString().split('T')[0],
  dispatchDate: '',
  closingDate: '',
};

function calcDaysBetween(start: string, end: string): number | undefined {
  if (!start || !end) return undefined;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (isNaN(s) || isNaN(e) || e < s) return undefined;
  return Math.round((e - s) / (1000 * 60 * 60 * 24));
}

function CreateWorkModal({
  onClose,
  onSave,
  existing,
}: {
  onClose: () => void;
  onSave: (data: Omit<WorkRecord, 'id' | 'createdAt'>) => Promise<void>;
  existing: WorkRecord[];
}) {
  const [form, setForm] = useState<CreateFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicates, setDuplicates] = useState<WorkRecord[]>([]);
  const [showDuplicates, setShowDuplicates] = useState(false);

  const typesForCategory = WORK_TYPE_DEFINITIONS.filter(t => t.category === form.workCategory && t.isActive);
  const selectedTypeDef = WORK_TYPE_DEFINITIONS.find(t => t.label === form.workType);
  const targetDays = selectedTypeDef?.disposalDays ?? 7;

  useEffect(() => {
    if (form.workType && form.eOfficeNumber) {
      const dupes = checkDuplicates({ workType: form.workType, eOfficeNumber: form.eOfficeNumber }, existing);
      setDuplicates(dupes);
    } else {
      setDuplicates([]);
    }
  }, [form.workType, form.eOfficeNumber, existing]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.workType) errs.workType = 'Work Type is required';
    if (!form.description.trim()) errs.description = 'Description is required';
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    const autodays = calcDaysBetween(form.dispatchDate || form.date, form.closingDate);
    try {
      await onSave({
        userId: 'USR-001',
        userName: 'A. Kowalski',
        date: form.date,
        workCategory: form.workCategory,
        workType: form.workType,
        description: form.description,
        plNumber: form.plNumber || undefined,
        referenceNumber: form.referenceNumber || undefined,
        eOfficeNumber: form.eOfficeNumber || undefined,
        eOfficeFileNo: form.eOfficeFileNo || undefined,
        sectionType: form.sectionType,
        concernedOfficer: form.concernedOfficer || undefined,
        consentGiven: form.consentGiven,
        targetDays,
        status: 'OPEN',
        isLocked: false,
        dispatchDate: form.dispatchDate || undefined,
        closingDate: form.closingDate || undefined,
        daysTaken: autodays,
      } as Omit<WorkRecord, 'id' | 'createdAt'>);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const consentApplicable = selectedTypeDef?.consentApplicable ?? false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <GlassCard className="w-full max-w-2xl p-6 shadow-2xl max-h-[92vh] overflow-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-white">New Work Record</h2>
            <p className="text-xs text-slate-500 mt-0.5">Record a new work item in the Work Ledger</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {duplicates.length > 0 && (
          <button
            onClick={() => setShowDuplicates(v => !v)}
            className="w-full mb-4 flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs hover:bg-amber-500/15 transition-colors"
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left">Potential duplicate: {duplicates.length} similar record(s) found in last 30 days</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showDuplicates ? 'rotate-180' : ''}`} />
          </button>
        )}
        {showDuplicates && duplicates.map(d => (
          <div key={d.id} className="mb-2 p-2 rounded-lg bg-slate-800/40 border border-amber-500/20 text-xs">
            <span className="font-mono text-teal-400">{d.id}</span> — {d.description.substring(0, 80)}...
          </div>
        ))}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Work Category *</label>
              <Select value={form.workCategory} onChange={e => setForm(f => ({ ...f, workCategory: e.target.value as WorkCategory, workType: '' }))} className="w-full">
                {WORK_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Work Type *</label>
              <Select value={form.workType} onChange={e => setForm(f => ({ ...f, workType: e.target.value }))} className={`w-full ${errors.workType ? 'border-rose-500/50' : ''}`}>
                <option value="">— Select Type —</option>
                {typesForCategory.map(t => <option key={t.code} value={t.label}>{t.label}</option>)}
              </Select>
              {errors.workType && <p className="text-[10px] text-rose-400 mt-1">{errors.workType}</p>}
            </div>
          </div>

          {form.workType && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-500/8 border border-teal-500/20">
              <Clock className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-xs text-teal-300">Target disposal: <strong>{targetDays} days</strong></span>
              {selectedTypeDef?.priority && (
                <span className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                  selectedTypeDef.priority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300' :
                  selectedTypeDef.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-300' :
                  'bg-slate-700/50 text-slate-400'
                }`}>{selectedTypeDef.priority}</span>
              )}
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Description / Work Details *</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe the work, item, and any relevant technical context..."
              rows={3}
              className={`w-full bg-slate-950/60 border text-slate-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 transition-all placeholder:text-slate-600 resize-none ${errors.description ? 'border-rose-500/50' : 'border-slate-700/50'}`}
            />
            {errors.description && <p className="text-[10px] text-rose-400 mt-1">{errors.description}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Linked PL Number</label>
              <Input value={form.plNumber} onChange={e => setForm(f => ({ ...f, plNumber: e.target.value }))} placeholder="e.g. 38110000" className="w-full font-mono" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Reference / Drawing No.</label>
              <Input value={form.referenceNumber} onChange={e => setForm(f => ({ ...f, referenceNumber: e.target.value }))} placeholder="e.g. DWG-BOG-001" className="w-full font-mono" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">e-Office Case No.</label>
              <Input value={form.eOfficeNumber} onChange={e => setForm(f => ({ ...f, eOfficeNumber: e.target.value }))} placeholder="e.g. CLW/DESIGN/2026/0001" className="w-full font-mono text-xs" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">e-Office File No.</label>
              <Input value={form.eOfficeFileNo} onChange={e => setForm(f => ({ ...f, eOfficeFileNo: e.target.value }))} placeholder="e.g. CLW-DWG-2026-001" className="w-full font-mono text-xs" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Section</label>
              <Select value={form.sectionType} onChange={e => setForm(f => ({ ...f, sectionType: e.target.value }))} className="w-full">
                {SECTION_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Concerned Officer</label>
              <Select value={form.concernedOfficer} onChange={e => setForm(f => ({ ...f, concernedOfficer: e.target.value }))} className="w-full">
                <option value="">— Select —</option>
                {CONCERNED_OFFICERS.map(o => <option key={o} value={o}>{o}</option>)}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DatePicker
              label="Date Received / Started"
              value={form.date}
              onChange={v => setForm(f => ({ ...f, date: v }))}
            />
            {consentApplicable && (
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Consent Given</label>
                <Select value={form.consentGiven} onChange={e => setForm(f => ({ ...f, consentGiven: e.target.value }))} className="w-full">
                  <option value="N/A">N/A</option>
                  <option value="Y">Yes</option>
                  <option value="N">No</option>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DatePicker
              label="Date of Dispatch"
              value={form.dispatchDate}
              onChange={v => setForm(f => ({ ...f, dispatchDate: v }))}
              placeholder="Optional"
            />
            <DatePicker
              label="Closing / Completion Date"
              value={form.closingDate}
              onChange={v => setForm(f => ({ ...f, closingDate: v }))}
              placeholder="Optional"
              minDate={form.dispatchDate || form.date}
            />
          </div>

          {(form.dispatchDate || form.closingDate) && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <div className="flex items-center gap-4 text-xs">
                {form.dispatchDate && (
                  <span className="text-slate-400"><span className="text-slate-600">Dispatched:</span> <span className="text-teal-300 font-mono">{form.dispatchDate}</span></span>
                )}
                {form.closingDate && (
                  <span className="text-slate-400"><span className="text-slate-600">Closed:</span> <span className="text-teal-300 font-mono">{form.closingDate}</span></span>
                )}
                {(() => {
                  const d = calcDaysBetween(form.dispatchDate || form.date, form.closingDate);
                  return d !== undefined ? (
                    <span className={`font-semibold ${d <= targetDays ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {d}d taken {d <= targetDays ? '✓' : `(+${d - targetDays}d over)`}
                    </span>
                  ) : null;
                })()}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6 pt-5 border-t border-slate-700/50">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving} className="flex-1">
            {saving ? 'Saving...' : <><Plus className="w-4 h-4" /> Create Record</>}
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}

function RecordDetail({ record, onVerify, onClose }: { record: WorkRecord; onVerify: () => void; onClose: () => void }) {
  const navigate = useNavigate();
  const kpi = getKPIStatus(record);

  return (
    <GlassCard className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {record.isLocked ? <Lock className="w-4 h-4 text-slate-500" /> : <Briefcase className="w-4 h-4 text-teal-400" />}
            <h2 className="text-base font-bold text-white">{record.description}</h2>
            <Badge variant={STATUS_VARIANT[record.status]}>{STATUS_LABEL[record.status]}</Badge>
            {record.isLocked && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700/60 text-slate-500 border border-slate-600/40 flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> Locked</span>}
          </div>
          <p className="font-mono text-xs text-teal-400">{record.id}</p>
        </div>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Category', value: CATEGORY_LABEL[record.workCategory] ?? record.workCategory },
          { label: 'Type', value: record.workType },
          { label: 'Assignee', value: record.userName },
          { label: 'Section', value: record.userSection ?? record.sectionType ?? '—' },
          { label: 'Date Received', value: record.date },
          { label: 'Dispatch Date', value: (record as any).dispatchDate ?? '—', icon: <Truck className="w-3 h-3 text-amber-400" /> },
          { label: 'Closing Date', value: (record as any).closingDate ?? record.completionDate ?? 'Pending', icon: <CheckSquare className="w-3 h-3 text-emerald-400" /> },
          { label: 'Target Days', value: record.targetDays ? `${record.targetDays}d` : '—' },
          { label: 'Days Taken', value: record.daysTaken != null ? `${record.daysTaken}d` : (record as any).dispatchDate && (record as any).closingDate ? `${calcDaysBetween((record as any).dispatchDate, (record as any).closingDate) ?? '—'}d` : '—' },
        ].map(f => (
          <div key={f.label}>
            <p className="text-[10px] text-slate-500 mb-0.5 flex items-center gap-1">
              {(f as any).icon}{f.label}
            </p>
            <p className="text-sm text-slate-200 font-medium">{f.value}</p>
          </div>
        ))}
      </div>

      {/* KPI status */}
      <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl mb-4 ${kpi.isOnTime ? 'bg-emerald-500/8 border border-emerald-500/20' : 'bg-rose-500/8 border border-rose-500/20'}`}>
        {kpi.isOnTime ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <ZapOff className="w-4 h-4 text-rose-400" />}
        <span className={`text-xs font-medium ${kpi.color}`}>{kpi.label}</span>
      </div>

      {/* References */}
      <div className="flex flex-wrap gap-2 mb-4">
        {record.eOfficeNumber && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/50 border border-slate-700/40 rounded-lg text-xs text-slate-400">
            <Hash className="w-3 h-3 text-teal-400" /> {record.eOfficeNumber}
          </span>
        )}
        {record.referenceNumber && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/50 border border-slate-700/40 rounded-lg text-xs text-slate-400">
            <FileText className="w-3 h-3 text-blue-400" /> {record.referenceNumber}
          </span>
        )}
        {record.plNumber && (
          <button
            onClick={() => navigate(`/pl/${record.plNumber!.replace('PL-', '')}`)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-xs text-indigo-300 hover:bg-indigo-500/15 transition-colors"
          >
            <Layers className="w-3 h-3" /> {record.plNumber}
          </button>
        )}
        {record.documentRef && (
          <button
            onClick={() => navigate(`/documents/${record.documentRef}`)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-teal-500/10 border border-teal-500/30 rounded-lg text-xs text-teal-300 hover:bg-teal-500/15 transition-colors"
          >
            <FileText className="w-3 h-3" /> {record.documentRef}
          </button>
        )}
      </div>

      {/* Verification info */}
      {record.verifiedBy && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/8 border border-emerald-500/20 mb-4">
          <Shield className="w-4 h-4 text-emerald-400" />
          <p className="text-xs text-emerald-300">
            Verified by <strong>{record.verifiedBy}</strong> on {record.verificationDate}
          </p>
        </div>
      )}

      {/* Actions */}
      {!record.isLocked && record.status === 'SUBMITTED' && (
        <div className="flex gap-2">
          <Button size="sm" onClick={onVerify}>
            <CheckCircle className="w-3.5 h-3.5" /> Mark as Verified
          </Button>
        </div>
      )}
    </GlassCard>
  );
}

export default function WorkLedger() {
  const navigate = useNavigate();
  const { data: records, loading, error, refetch, add, verify, remove } = useWorkRecords();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkRecord['status'] | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<WorkCategory | 'ALL'>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const filtered = useMemo(() => {
    return records.filter(w => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        w.id.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q) ||
        (w.userName ?? '').toLowerCase().includes(q) ||
        (w.plNumber ?? '').toLowerCase().includes(q) ||
        (w.workType ?? '').toLowerCase().includes(q) ||
        (w.eOfficeNumber ?? '').toLowerCase().includes(q);
      const matchStatus = statusFilter === 'ALL' || w.status === statusFilter;
      const matchCategory = categoryFilter === 'ALL' || w.workCategory === categoryFilter;
      return matchSearch && matchStatus && matchCategory;
    });
  }, [records, search, statusFilter, categoryFilter]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const overdueCount = records.filter(w => {
      if (w.status === 'VERIFIED' || w.status === 'CLOSED') return false;
      const kpi = getKPIStatus(w);
      return !kpi.isOnTime;
    }).length;
    const completed = records.filter(w => w.status === 'VERIFIED' || w.status === 'CLOSED');
    const onTime = completed.filter(w => (w.daysTaken ?? 0) <= (w.targetDays ?? getTargetDays(w.workType)));
    const onTimeRate = completed.length > 0 ? Math.round((onTime.length / completed.length) * 100) : 0;
    return {
      total: records.length,
      open: records.filter(w => w.status === 'OPEN').length,
      overdue: overdueCount,
      onTimeRate,
    };
  }, [records]);

  const selectedRecord = records.find(r => r.id === selectedId) ?? null;

  const handleVerify = async (id: string) => {
    await verify(id, 'Admin');
  };

  const handleCreate = async (data: Omit<WorkRecord, 'id' | 'createdAt'>) => {
    await add(data);
  };

  if (loading) return <LoadingState message="Loading Work Ledger..." />;
  if (error) return <ErrorState variant="server" message="Failed to load work records" onRetry={refetch} />;

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Work Ledger</h1>
          <p className="text-slate-400 text-sm">Track and manage engineering work records with immutable audit history.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setShowAnalytics(v => !v)}>
            <BarChart3 className="w-4 h-4" /> {showAnalytics ? 'Hide' : 'Analytics'}
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> New Work Record
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Records', value: stats.total, icon: <Briefcase className="w-4 h-4 text-teal-400" />, color: '' },
          { label: 'Open Items', value: stats.open, icon: <Clock className="w-4 h-4 text-blue-400" />, color: '' },
          { label: 'Overdue', value: stats.overdue, icon: <AlertCircle className="w-4 h-4 text-rose-400" />, color: stats.overdue > 0 ? 'border-rose-500/20' : '' },
          { label: 'On-time Rate', value: `${stats.onTimeRate}%`, icon: <TrendingUp className="w-4 h-4 text-emerald-400" />, color: '' },
        ].map(s => (
          <GlassCard key={s.label} className={`px-4 py-3 flex items-center gap-3 ${s.color}`}>
            <div className="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center shrink-0">{s.icon}</div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{s.label}</p>
              <p className="text-xl font-bold text-slate-100">{s.value}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Analytics Panel */}
      {showAnalytics && (
        <GlassCard className="p-6">
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-teal-400" /> Work Ledger Analytics
          </h2>
          <AnalyticsPanel records={records} />
        </GlassCard>
      )}

      {/* Main Table Card */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <FileSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search by ID, description, type, PL number..."
              className="pl-9 w-full"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(['ALL', 'OPEN', 'SUBMITTED', 'VERIFIED', 'CLOSED'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${statusFilter === s ? 'bg-teal-500/20 border-teal-500/40 text-teal-300' : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-slate-200'}`}
              >
                {s === 'ALL' ? 'All' : STATUS_LABEL[s as WorkRecord['status']]}
              </button>
            ))}
          </div>
        </div>

        {/* Category filter row */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`px-2 py-1 rounded-md text-[10px] font-medium border transition-colors ${categoryFilter === 'ALL' ? 'bg-teal-500/20 border-teal-500/40 text-teal-300' : 'bg-slate-800/40 border-slate-700/40 text-slate-500 hover:text-slate-300'}`}
          >
            All Categories
          </button>
          {WORK_CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`px-2 py-1 rounded-md text-[10px] font-medium border transition-colors ${categoryFilter === c ? 'bg-teal-500/20 border-teal-500/40 text-teal-300' : 'bg-slate-800/40 border-slate-700/40 text-slate-500 hover:text-slate-300'}`}
            >
              {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500 mb-3 font-medium">
          Showing <span className="text-teal-400 font-semibold">{filtered.length}</span> of {records.length} records
        </div>

        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-white/5 text-slate-500">
                <th className="pb-3 pl-3 font-semibold text-[11px] uppercase tracking-wide">Work ID</th>
                <th className="pb-3 font-semibold text-[11px] uppercase tracking-wide">Description</th>
                <th className="pb-3 font-semibold text-[11px] uppercase tracking-wide">Category / Type</th>
                <th className="pb-3 font-semibold text-[11px] uppercase tracking-wide">Status</th>
                <th className="pb-3 font-semibold text-[11px] uppercase tracking-wide">KPI</th>
                <th className="pb-3 font-semibold text-[11px] uppercase tracking-wide">Assignee</th>
                <th className="pb-3 font-semibold text-[11px] uppercase tracking-wide">Date</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {filtered.map(w => (
                <tr
                  key={w.id}
                  className={`cursor-pointer transition-colors group ${selectedId === w.id ? 'bg-teal-500/5 border-l-2 border-teal-500/30' : 'hover:bg-slate-800/30'}`}
                  onClick={() => setSelectedId(selectedId === w.id ? null : w.id)}
                >
                  <td className="py-3 pl-3">
                    <div className="flex items-center gap-1.5">
                      {w.isLocked ? <Lock className="w-3 h-3 text-slate-600" /> : <Unlock className="w-3 h-3 text-slate-700" />}
                      <span className="font-mono text-teal-400 text-xs">{w.id}</span>
                    </div>
                  </td>
                  <td className="py-3 max-w-[260px]">
                    <p className="text-slate-200 font-medium text-sm truncate">{w.description}</p>
                    {w.eOfficeNumber && <p className="text-[10px] text-slate-600 font-mono">{w.eOfficeNumber}</p>}
                  </td>
                  <td className="py-3">
                    <p className="text-xs text-slate-400">{CATEGORY_LABEL[w.workCategory]}</p>
                    <p className="text-[10px] text-slate-600">{w.workType}</p>
                  </td>
                  <td className="py-3">
                    <Badge variant={STATUS_VARIANT[w.status]}>{STATUS_LABEL[w.status]}</Badge>
                  </td>
                  <td className="py-3">
                    <KPIChip record={w} />
                  </td>
                  <td className="py-3 text-slate-400 text-xs">{w.userName}</td>
                  <td className="py-3 text-slate-500 text-xs">{w.date}</td>
                  <td className="py-3 pr-3">
                    <ChevronRight className={`w-4 h-4 transition-all ${selectedId === w.id ? 'rotate-90 text-teal-400' : 'text-slate-600 group-hover:text-teal-400'}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-14 text-slate-500">
              <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium text-slate-400 mb-1">No work records found</p>
              <p className="text-sm mb-4">Try adjusting the search or category filter</p>
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="w-3.5 h-3.5" /> Create First Record
              </Button>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Record Detail */}
      {selectedRecord && (
        <RecordDetail
          record={selectedRecord}
          onVerify={() => handleVerify(selectedRecord.id)}
          onClose={() => setSelectedId(null)}
        />
      )}

      {/* Create Modal */}
      {showForm && (
        <CreateWorkModal
          onClose={() => setShowForm(false)}
          onSave={handleCreate}
          existing={records}
        />
      )}
    </div>
  );
}
