import { useState, useMemo, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { GlassCard, Badge, Button, Input, Select } from '../components/ui/Shared';
import { DatePicker } from '../components/ui/DatePicker';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import { useWorkRecords } from '../hooks/useWorkRecords';
import { usePLItems } from '../hooks/usePLItems';
import { useAuth } from '../lib/auth';
import { WorkLedgerService, getTargetDays, checkDuplicates, getKPIStatus } from '../services/WorkLedgerService';
import { ExportImportService } from '../services/ExportImportService';
import { WORK_TYPE_DEFINITIONS, SECTION_TYPES, CONCERNED_OFFICERS } from '../lib/constants';
import type { PLNumber, WorkRecord, WorkCategory } from '../lib/types';
import {
  Plus, FileSearch, Briefcase, ChevronRight, X,
  FileText, AlertTriangle, CheckCircle,
  Clock, Lock, Shield, BarChart3, Layers,
  Unlock, Hash, ZapOff, TrendingUp,
  AlertCircle, ChevronDown, CheckSquare, Search, ExternalLink,
  Download, Upload, Copy, Check, FileSpreadsheet,
  ChevronLeft, ChevronRight as ChevronRightIcon, User as UserIcon,
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
  SUBMITTED: 'Pending Verification',
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
  remarks: string;
  plNumber: string;
  tenderNumber: string;
  eOfficeNumber: string;
  sectionType: string;
  concernedOfficer: string;
  consentGiven: string;
  date: string;
  closingDate: string;
}

const EMPTY_FORM: CreateFormData = {
  workCategory: 'GENERAL',
  workType: '',
  description: '',
  remarks: '',
  plNumber: '',
  tenderNumber: '',
  eOfficeNumber: '',
  sectionType: 'General',
  concernedOfficer: '',
  consentGiven: 'N/A',
  date: new Date().toISOString().split('T')[0],
  closingDate: '',
};

function calcDaysBetween(start: string, end: string): number | undefined {
  if (!start || !end) return undefined;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (isNaN(s) || isNaN(e) || e < s) return undefined;
  return Math.round((e - s) / (1000 * 60 * 60 * 24));
}

function PlLookupField({
  plItems,
  loading,
  value,
  onSelect,
}: {
  plItems: PLNumber[];
  loading: boolean;
  value: string;
  onSelect: (plNumber: string) => void;
}) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);

  const selectedPl = useMemo(
    () => plItems.find(pl => pl.plNumber === value) ?? null,
    [plItems, value]
  );

  useEffect(() => {
    if (!value) {
      setQuery('');
      return;
    }

    if (selectedPl && query !== selectedPl.plNumber) {
      setQuery(selectedPl.plNumber);
    }
  }, [query, selectedPl, value]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current?.contains(event.target as Node)) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...plItems].sort((a, b) => a.plNumber.localeCompare(b.plNumber));

    const matches = !q
      ? sorted
      : sorted.filter(pl =>
          pl.plNumber.toLowerCase().includes(q) ||
          pl.name.toLowerCase().includes(q) ||
          pl.description.toLowerCase().includes(q) ||
          pl.category.toLowerCase().includes(q) ||
          pl.controllingAgency.toLowerCase().includes(q)
        );

    return matches.slice(0, 10);
  }, [plItems, query]);

  const handleChange = (next: string) => {
    setQuery(next);
    setOpen(true);

    const exact = plItems.find(pl =>
      pl.plNumber.toLowerCase() === next.trim().toLowerCase()
    );

    onSelect(exact?.plNumber ?? '');
  };

  const handleSelect = (pl: PLNumber) => {
    onSelect(pl.plNumber);
    setQuery(pl.plNumber);
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label className="text-xs font-medium text-slate-400">Linked PL Number</label>
        {selectedPl && (
          <button
            type="button"
            onClick={() => navigate(`/pl/${selectedPl.plNumber}`)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-300 hover:text-cyan-200 transition-colors"
          >
            View PL Details
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>

      <div ref={containerRef} className="relative" data-no-context-palette="true">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-200/55" />
        <Input
          value={query}
          onChange={event => handleChange(event.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search PL number or component name..."
          className="w-full pl-10 pr-10 font-mono"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              onSelect('');
              setOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {open && (
          <div className="absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-cyan-400/15 bg-slate-950/96 shadow-2xl backdrop-blur-xl">
            {loading ? (
              <div className="px-4 py-3 text-xs text-slate-500">Loading PL records...</div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-500">No PL records match this search.</div>
            ) : (
              filtered.map(pl => (
                <button
                  key={pl.id}
                  type="button"
                  onMouseDown={event => {
                    event.preventDefault();
                    handleSelect(pl);
                  }}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                    selectedPl?.id === pl.id ? 'bg-cyan-400/10' : 'hover:bg-cyan-400/6'
                  }`}
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/6 text-cyan-300">
                    <Hash className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-cyan-300">{pl.plNumber}</span>
                      <Badge size="sm" variant={pl.status === 'ACTIVE' ? 'success' : pl.status === 'UNDER_REVIEW' ? 'warning' : 'danger'}>
                        {pl.status}
                      </Badge>
                    </div>
                    <p className="truncate text-sm text-slate-200">{pl.name}</p>
                    <p className="truncate text-[11px] text-slate-500">
                      {pl.category} · {pl.controllingAgency} · {pl.description}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {selectedPl && (
        <div className="rounded-2xl border border-cyan-400/14 bg-cyan-400/[0.04] px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-cyan-300">{selectedPl.plNumber}</span>
                <Badge size="sm" variant={selectedPl.status === 'ACTIVE' ? 'success' : selectedPl.status === 'UNDER_REVIEW' ? 'warning' : 'danger'}>
                  {selectedPl.status}
                </Badge>
              </div>
              <p className="mt-1 text-sm font-medium text-slate-100">{selectedPl.name}</p>
            </div>
            <div className="grid gap-1 text-right text-[11px] text-slate-400 sm:text-left">
              <span>Category: <span className="text-slate-200">{selectedPl.category}</span></span>
              <span>Agency: <span className="text-slate-200">{selectedPl.controllingAgency}</span></span>
              {selectedPl.vendorType && (
                <span>Vendor Type: <span className="text-slate-200">{selectedPl.vendorType}</span></span>
              )}
            </div>
          </div>
          {selectedPl.description && (
            <p className="mt-3 text-xs leading-5 text-slate-400">{selectedPl.description}</p>
          )}
        </div>
      )}
    </div>
  );
}

function CreateWorkModal({
  onClose,
  onSave,
  existing,
  plItems,
  plItemsLoading,
}: {
  onClose: () => void;
  onSave: (data: Omit<WorkRecord, 'id' | 'createdAt'>) => Promise<WorkRecord>;
  existing: WorkRecord[];
  plItems: PLNumber[];
  plItemsLoading: boolean;
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
    if (!form.eOfficeNumber.trim()) errs.eOfficeNumber = 'e-Office Case No. is required';
    if (!form.date) errs.date = 'Start date is required';
    if (!form.closingDate) errs.closingDate = 'Closing date is required';
    if (form.date && form.closingDate && form.closingDate < form.date) {
      errs.closingDate = 'Closing date cannot be before the start date';
    }
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    const autodays = calcDaysBetween(form.date, form.closingDate);
    try {
      const saved = await onSave({
        userId: 'USR-001',
        userName: 'A. Kowalski',
        date: form.date,
        completionDate: form.closingDate,
        workCategory: form.workCategory,
        workType: form.workType,
        description: form.description,
        remarks: form.remarks || undefined,
        plNumber: form.plNumber || undefined,
        tenderNumber: form.tenderNumber || undefined,
        eOfficeNumber: form.eOfficeNumber || undefined,
        sectionType: form.sectionType,
        concernedOfficer: form.concernedOfficer || undefined,
        consentGiven: form.consentGiven,
        targetDays,
        status: 'SUBMITTED',
        isLocked: false,
        closingDate: form.closingDate,
        daysTaken: autodays,
      } as Omit<WorkRecord, 'id' | 'createdAt'>);
      toast.success('Work record logged', { description: `${saved.id} — ${form.workType}` });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const consentApplicable = selectedTypeDef?.consentApplicable ?? false;

  return (
    <GlassCard className="w-full p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2"><Plus className="w-4 h-4 text-teal-400" /> Log Work Activity</h2>
            <p className="text-xs text-slate-500 mt-0.5">Record a new work item in the Work Ledger with full audit trail</p>
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
              <Select value={form.workCategory} onChange={e => setForm(f => ({ ...f, workCategory: e.target.value as WorkCategory, workType: '' }))} className="w-full work-ledger-select">
                {WORK_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Work Type *</label>
              <Select value={form.workType} onChange={e => setForm(f => ({ ...f, workType: e.target.value }))} className={`w-full work-ledger-select ${errors.workType ? 'border-rose-500/50' : ''}`}>
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

          <PlLookupField
            plItems={plItems}
            loading={plItemsLoading}
            value={form.plNumber}
            onSelect={plNumber => setForm(f => ({ ...f, plNumber }))}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Tender Number</label>
              <Input value={form.tenderNumber} onChange={e => setForm(f => ({ ...f, tenderNumber: e.target.value }))} placeholder="e.g. CLW/TENDER/2026/001" className="w-full font-mono text-xs" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">e-Office Case No. <span className="text-rose-400">*</span></label>
              <Input value={form.eOfficeNumber} onChange={e => setForm(f => ({ ...f, eOfficeNumber: e.target.value }))} placeholder="e.g. CLW/DESIGN/2026/0001" className={`w-full font-mono text-xs ${errors.eOfficeNumber ? 'border-rose-500/50' : ''}`} />
              {errors.eOfficeNumber && <p className="text-[10px] text-rose-400 mt-1">{errors.eOfficeNumber}</p>}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Remarks / Additional Notes</label>
            <textarea
              value={form.remarks}
              onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
              placeholder="Any additional remarks, observations, or context for this work record..."
              rows={2}
              className="w-full bg-slate-950/60 border border-slate-700/50 text-slate-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 transition-all placeholder:text-slate-600 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Section</label>
              <Select value={form.sectionType} onChange={e => setForm(f => ({ ...f, sectionType: e.target.value }))} className="w-full work-ledger-select">
                {SECTION_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Concerned Officer</label>
              <Select value={form.concernedOfficer} onChange={e => setForm(f => ({ ...f, concernedOfficer: e.target.value }))} className="w-full work-ledger-select">
                <option value="">— Select —</option>
                {CONCERNED_OFFICERS.map(o => <option key={o} value={o}>{o}</option>)}
              </Select>
            </div>
          </div>

          <div className={`grid gap-3 ${consentApplicable ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <DatePicker
              label="Date Received / Started"
              value={form.date}
              onChange={v => setForm(f => ({ ...f, date: v }))}
              required
            />
            <DatePicker
              label="Closing / Completion Date"
              value={form.closingDate}
              onChange={v => setForm(f => ({ ...f, closingDate: v }))}
              minDate={form.date}
              required
            />
            {consentApplicable && (
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Consent Given</label>
                <Select value={form.consentGiven} onChange={e => setForm(f => ({ ...f, consentGiven: e.target.value }))} className="w-full work-ledger-select">
                  <option value="N/A">N/A</option>
                  <option value="Y">Yes</option>
                  <option value="N">No</option>
                </Select>
              </div>
            )}
          </div>

          {(errors.date || errors.closingDate) && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/8 px-3 py-2 text-[11px] text-rose-300">
              {errors.date || errors.closingDate}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6 pt-5 border-t border-slate-700/50">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving} className="flex-1">
            {saving ? 'Saving...' : <><Plus className="w-4 h-4" /> Log Activity</>}
          </Button>
        </div>
    </GlassCard>
  );
}

function RecordDetail({ record, onVerify, onClose, canVerify }: { record: WorkRecord; onVerify: () => void; onClose: () => void; canVerify: boolean }) {
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
        {((): { label: string; value: string; icon?: React.ReactNode }[] => [
          { label: 'Category', value: CATEGORY_LABEL[record.workCategory] ?? record.workCategory },
          { label: 'Type', value: record.workType },
          { label: 'Assignee', value: record.userName },
          { label: 'Section', value: record.userSection ?? record.sectionType ?? '—' },
          { label: 'Date Started', value: record.date },
          { label: 'Closing Date', value: record.closingDate ?? record.completionDate ?? 'Pending', icon: <CheckSquare className="w-3 h-3 text-emerald-400" /> },
          { label: 'Target Days', value: record.targetDays ? `${record.targetDays}d` : '—' },
          { label: 'Days Taken', value: record.daysTaken != null ? `${record.daysTaken}d` : record.closingDate ? `${calcDaysBetween(record.date, record.closingDate) ?? '—'}d` : '—' },
        ])().map(f => (
          <div key={f.label}>
            <p className="text-[10px] text-slate-500 mb-0.5 flex items-center gap-1">
              {f.icon}{f.label}
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
        {record.plNumber && (
          <button
            onClick={() => navigate(`/pl/${record.plNumber}`)}
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
      {!record.isLocked && (record.status === 'OPEN' || record.status === 'SUBMITTED') && canVerify && (
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
  const { data: records, loading, error, refetch, add, verify } = useWorkRecords();
  const { data: plItems, loading: plItemsLoading } = usePLItems();
  const { user, hasPermission } = useAuth();
  const canCreate = hasPermission(['admin', 'supervisor', 'engineer']);
  const canVerify = hasPermission(['admin', 'supervisor']);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkRecord['status'] | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<WorkCategory | 'ALL'>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showMine, setShowMine] = useState(false);
  const [showOverdue, setShowOverdue] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const copyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  const filtered = useMemo(() => {
    return records.filter(w => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        w.id.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q) ||
        (w.userName ?? '').toLowerCase().includes(q) ||
        (w.plNumber ?? '').toLowerCase().includes(q) ||
        (w.workType ?? '').toLowerCase().includes(q) ||
        (w.eOfficeNumber ?? '').toLowerCase().includes(q) ||
        (w.tenderNumber ?? '').toLowerCase().includes(q) ||
        (w.concernedOfficer ?? '').toLowerCase().includes(q);
      const matchStatus = statusFilter === 'ALL' || w.status === statusFilter;
      const matchCategory = categoryFilter === 'ALL' || w.workCategory === categoryFilter;
      const matchDateFrom = !dateFrom || w.date >= dateFrom;
      const matchDateTo = !dateTo || w.date <= dateTo;
      const matchMine = !showMine || w.userId === user?.id || w.userName === user?.name;
      const matchOverdue = !showOverdue || (() => {
        if (w.status === 'VERIFIED' || w.status === 'CLOSED') return false;
        const kpi = getKPIStatus(w);
        return !kpi.isOnTime;
      })();
      return matchSearch && matchStatus && matchCategory && matchDateFrom && matchDateTo && matchMine && matchOverdue;
    });
  }, [records, search, statusFilter, categoryFilter, dateFrom, dateTo, showMine, showOverdue, user]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [search, statusFilter, categoryFilter, dateFrom, dateTo, showMine, showOverdue]);

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
    await verify(id, user?.name ?? 'Admin');
    toast.success('Record verified and locked');
  };

  const handleCreate = async (data: Omit<WorkRecord, 'id' | 'createdAt'>) => {
    return await add(data);
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
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" size="sm" onClick={() => setShowAnalytics(v => !v)}>
            <BarChart3 className="w-4 h-4" /> {showAnalytics ? 'Hide' : 'Analytics'}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => ExportImportService.downloadWorkRecordsCSV(filtered)} title="Export CSV">
            <Download className="w-4 h-4" /> CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => ExportImportService.exportWorkRecordsExcel(filtered)} title="Export Excel">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </Button>
          {canCreate && (
            <Button variant="secondary" size="sm" onClick={() => setShowImportModal(true)}>
              <Upload className="w-4 h-4" /> Import
            </Button>
          )}
          {canCreate && (
            <Button size="sm" onClick={() => setShowForm(v => !v)}>
              <Plus className="w-4 h-4" /> {showForm ? 'Cancel' : 'Log Work Activity'}
            </Button>
          )}
        </div>
      </div>

      {/* Inline Log Form */}
      {showForm && canCreate && (
        <CreateWorkModal
          onClose={() => setShowForm(false)}
          onSave={handleCreate}
          existing={records}
          plItems={plItems}
          plItemsLoading={plItemsLoading}
        />
      )}

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
              placeholder="Search ID, description, type, PL, eOffice, tender, officer..."
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
        {/* Date range filter */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">Date:</span>
          <div className="flex items-center gap-1.5">
            <DatePicker
              value={dateFrom}
              onChange={setDateFrom}
              placeholder="From date"
            />
            <span className="text-slate-600 text-xs">—</span>
            <DatePicker
              value={dateTo}
              onChange={setDateTo}
              placeholder="To date"
            />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-[10px] text-slate-500 hover:text-teal-400 transition-colors px-1.5">✕ Clear</button>
            )}
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

        {/* Quick Filters */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-[11px] text-slate-600 font-medium uppercase tracking-wide">Quick:</span>
          <button
            onClick={() => setShowMine(v => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${showMine ? 'bg-teal-500/20 border-teal-500/40 text-teal-300' : 'bg-slate-800/40 border-slate-700/40 text-slate-500 hover:text-slate-300'}`}
          >
            <UserIcon className="w-3 h-3" /> My Records
          </button>
          <button
            onClick={() => setShowOverdue(v => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${showOverdue ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' : 'bg-slate-800/40 border-slate-700/40 text-slate-500 hover:text-slate-300'}`}
          >
            <AlertCircle className="w-3 h-3" /> Overdue
          </button>
          {(showMine || showOverdue) && (
            <button onClick={() => { setShowMine(false); setShowOverdue(false); }} className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors">✕ Clear</button>
          )}
          <span className="ml-auto text-xs text-slate-500">
            Showing <span className="text-teal-400 font-semibold">{filtered.length}</span> of {records.length} records
            {totalPages > 1 && <> · Page <span className="text-teal-400 font-semibold tabular-nums">{page}/{totalPages}</span></>}
          </span>
        </div>

        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-white/5 text-slate-500">
                <th className="pb-3 pl-3 font-semibold text-[11px] uppercase tracking-wide">Work ID</th>
                <th className="pb-3 font-semibold text-[11px] uppercase tracking-wide">Description</th>
                <th className="pb-3 font-semibold text-[11px] uppercase tracking-wide">Category / Type</th>
                <th className="pb-3 font-semibold text-[11px] uppercase tracking-wide">PL / eOffice</th>
                <th className="pb-3 font-semibold text-[11px] uppercase tracking-wide">Status</th>
                <th className="pb-3 font-semibold text-[11px] uppercase tracking-wide">KPI</th>
                <th className="pb-3 font-semibold text-[11px] uppercase tracking-wide">Days / Target</th>
                <th className="pb-3 font-semibold text-[11px] uppercase tracking-wide">Officer</th>
                <th className="pb-3 font-semibold text-[11px] uppercase tracking-wide">Date</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {paginated.map(w => (
                <tr
                  key={w.id}
                  className={`cursor-pointer transition-colors group ${selectedId === w.id ? 'bg-teal-500/5 border-l-2 border-teal-500/30' : 'hover:bg-slate-800/30'}`}
                  onClick={() => setSelectedId(selectedId === w.id ? null : w.id)}
                >
                  <td className="py-3 pl-3">
                    <div className="flex items-center gap-1.5">
                      {w.isLocked ? <Lock className="w-3 h-3 text-slate-600" /> : <Unlock className="w-3 h-3 text-slate-700" />}
                      <span className="font-mono text-teal-400 text-xs">{w.id}</span>
                      <button
                        onClick={e => copyId(w.id, e)}
                        title="Copy ID"
                        className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 text-slate-600 hover:text-teal-400"
                      >
                        {copiedId === w.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </td>
                  <td className="py-3 max-w-[240px]">
                    <p className="text-slate-200 font-medium text-sm truncate">{w.description}</p>
                  </td>
                  <td className="py-3">
                    <p className="text-xs text-slate-400">{CATEGORY_LABEL[w.workCategory]}</p>
                    <p className="text-[10px] text-slate-600">{w.workType}</p>
                  </td>
                  <td className="py-3">
                    {w.plNumber && <p className="font-mono text-[11px] text-teal-500/80 leading-tight">{w.plNumber}</p>}
                    {w.eOfficeNumber && <p className="font-mono text-[10px] text-slate-500 leading-tight">{w.eOfficeNumber}</p>}
                    {!w.plNumber && !w.eOfficeNumber && <span className="text-slate-700 text-xs">—</span>}
                  </td>
                  <td className="py-3">
                    <Badge variant={STATUS_VARIANT[w.status]}>{STATUS_LABEL[w.status]}</Badge>
                  </td>
                  <td className="py-3">
                    <KPIChip record={w} />
                  </td>
                  <td className="py-3 text-xs font-mono">
                    {w.daysTaken != null ? (
                      <span className={w.targetDays && w.daysTaken > w.targetDays ? 'text-rose-400' : 'text-emerald-400'}>
                        {w.daysTaken}d
                      </span>
                    ) : <span className="text-slate-700">—</span>}
                    {w.targetDays != null && (
                      <span className="text-slate-600"> / {w.targetDays}d</span>
                    )}
                  </td>
                  <td className="py-3 text-slate-400 text-xs truncate max-w-[100px]">
                    {w.concernedOfficer || w.userName || '—'}
                  </td>
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
              {canCreate && (
                <Button size="sm" onClick={() => setShowForm(true)}>
                  <Plus className="w-3.5 h-3.5" /> Create First Record
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-2">
            <span className="text-xs text-slate-500 tabular-nums">
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-7 h-7 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                const p = totalPages <= 7 ? i + 1 : i + Math.max(1, Math.min(page - 3, totalPages - 6));
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${p === page ? 'bg-teal-500/20 border border-teal-500/40 text-teal-300' : 'bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white'}`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-7 h-7 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <GlassCard className="w-full max-w-2xl p-6 relative">
            <button onClick={() => { setShowImportModal(false); setImportFile(null); setImportPreview([]); }} className="absolute top-4 right-4">
              <X className="w-4 h-4 text-slate-500 hover:text-white" />
            </button>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 flex items-center justify-center"><Upload className="w-4 h-4 text-teal-400" /></div>
              <div>
                <h3 className="text-sm font-semibold text-white">Import Work Records</h3>
                <p className="text-xs text-slate-500">Upload a CSV or Excel file with work records</p>
              </div>
            </div>
            <input ref={importInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={async e => {
              const file = e.target.files?.[0];
              if (!file) return;
              setImportFile(file);
              try {
                const rows = await ExportImportService.parseCSVFile(file);
                setImportPreview(rows.slice(0, 5));
              } catch { toast.error('Could not parse file'); }
            }} />
            {!importFile ? (
              <div
                onClick={() => importInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 rounded-xl p-10 text-center cursor-pointer hover:border-teal-500/40 transition-colors"
              >
                <Upload className="w-8 h-8 mx-auto mb-3 text-slate-600" />
                <p className="text-sm text-slate-400 mb-1">Click to upload CSV or Excel file</p>
                <p className="text-xs text-slate-600">Supported: .csv, .xlsx, .xls</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-slate-300">{importFile.name}</span>
                  <button onClick={() => { setImportFile(null); setImportPreview([]); }} className="text-xs text-slate-500 hover:text-rose-400">Remove</button>
                </div>
                {importPreview.length > 0 && (
                  <div className="overflow-x-auto mb-4">
                    <p className="text-xs text-slate-500 mb-2">Preview (first {importPreview.length} rows):</p>
                    <table className="w-full text-xs text-left">
                      <thead><tr>{Object.keys(importPreview[0]).slice(0, 6).map(h => <th key={h} className="py-1 pr-4 text-slate-500 font-medium uppercase text-[10px]">{h}</th>)}</tr></thead>
                      <tbody>{importPreview.map((row, i) => <tr key={i} className="border-t border-white/5">{Object.values(row).slice(0, 6).map((v, j) => <td key={j} className="py-1.5 pr-4 text-slate-400 truncate max-w-[120px]">{String(v)}</td>)}</tr>)}</tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center gap-3 mt-5">
              <Button
                size="sm"
                disabled={!importFile || importing}
                onClick={async () => {
                  if (!importFile) return;
                  setImporting(true);
                  try {
                    const rows = await ExportImportService.parseCSVFile(importFile);
                    let count = 0;
                    for (const row of rows) {
                      const data = ExportImportService.mapRowToWorkRecord(row, user?.id ?? '', user?.name ?? '');
                      if (data.description) { await add(data as Omit<WorkRecord, 'id' | 'createdAt'>); count++; }
                    }
                    toast.success(`Imported ${count} work records`);
                    setShowImportModal(false);
                    setImportFile(null);
                    setImportPreview([]);
                  } catch { toast.error('Import failed'); } finally { setImporting(false); }
                }}
              >
                {importing ? 'Importing...' : `Import${importPreview.length ? ` (~${importPreview.length}+ rows)` : ''}`}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { ExportImportService.downloadBlob(ExportImportService.getImportTemplate(), 'work-records-template.xlsx'); }}>
                <Download className="w-3.5 h-3.5" /> Download Template
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setShowImportModal(false); setImportFile(null); setImportPreview([]); }}>Cancel</Button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Record Detail */}
      {selectedRecord && (
        <RecordDetail
          record={selectedRecord}
          onVerify={() => handleVerify(selectedRecord.id)}
          onClose={() => setSelectedId(null)}
          canVerify={canVerify}
        />
      )}
    </div>
  );
}
