import { useState, useMemo, type ReactNode } from 'react';
import { toast } from 'sonner';
import {
  Search, DatabaseBackup, Shield, Hash,
  Plus, X, AlertTriangle, CheckCircle, Clock,
  Building2, Link as LinkIcon, ExternalLink, FileText, FilePlus,
  ChevronUp, ChevronDown, ChevronsUpDown, ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { GlassCard, Badge, Button, Input, Select } from '../components/ui/Shared';
import { usePLItems } from '../hooks/usePLItems';
import { usePlLinkableDocuments, type PlLinkableDocument } from '../hooks/usePlLinkableDocuments';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import type { PLNumber, InspectionCategory, SafetyClassification } from '../lib/types';
import { INSPECTION_CATEGORY_LABELS, AGENCIES } from '../lib/constants';

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active',
  UNDER_REVIEW: 'Under Review',
  OBSOLETE: 'Obsolete',
};

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  ACTIVE: 'success',
  UNDER_REVIEW: 'warning',
  OBSOLETE: 'danger',
};

const CATEGORY_COLORS: Record<string, string> = {
  'CAT-A': 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  'CAT-B': 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  'CAT-C': 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  'CAT-D': 'bg-slate-700/50 text-slate-400 border-slate-600/40',
};

type SortKey = 'plNumber' | 'name' | 'category' | 'controllingAgency' | 'status' | 'docs' | 'ecs' | 'works';

interface CreatePLFormData {
  plNumber: string;
  name: string;
  description: string;
  category: InspectionCategory;
  controllingAgency: string;
  status: string;
  safetyCritical: boolean;
  safetyClassification: SafetyClassification | '';
  severityOfFailure: string;
  consequences: string;
  functionality: string;
  designSupervisor: string;
  concernedSupervisor: string;
  applicationArea: string;
  eligibilityCriteria: string;
  procurementConditions: string;
  drawingNumbers: string;
  specNumbers: string;
  motherPart: string;
  uvamId: string;
  strNumber: string;
  eOfficeFile: string;
  vendorType: '' | 'VD' | 'NVD';
  usedIn: string;
}

const EMPTY_FORM: CreatePLFormData = {
  plNumber: '',
  name: '',
  description: '',
  category: 'CAT-C',
  controllingAgency: 'CLW',
  status: 'ACTIVE',
  safetyCritical: false,
  safetyClassification: '',
  severityOfFailure: '',
  consequences: '',
  functionality: '',
  designSupervisor: '',
  concernedSupervisor: '',
  applicationArea: '',
  eligibilityCriteria: '',
  procurementConditions: '',
  drawingNumbers: '',
  specNumbers: '',
  motherPart: '',
  uvamId: '',
  strNumber: '',
  eOfficeFile: '',
  vendorType: '',
  usedIn: '',
};

const DOC_STATUS_VARIANT: Record<string, 'success' | 'warning' | 'default' | 'danger'> = {
  Approved: 'success',
  'In Review': 'warning',
  Draft: 'default',
  Obsolete: 'danger',
};

function PlModalField({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-[10px] text-rose-400 mt-1">{error}</p>}
    </div>
  );
}

function PlModalSectionHeading({ title }: { title: string }) {
  return (
    <p className="text-[10px] uppercase tracking-widest font-semibold text-teal-500 mb-3 pt-1 border-t border-slate-700/40">
      {title}
    </p>
  );
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey | null; sortDir: 'asc' | 'desc' }) {
  if (sortKey !== col) return <ChevronsUpDown className="w-3 h-3 text-slate-600 ml-0.5 shrink-0" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-teal-400 ml-0.5 shrink-0" />
    : <ChevronDown className="w-3 h-3 text-teal-400 ml-0.5 shrink-0" />;
}

function LinkDocumentsModal({
  pl,
  onClose,
  onUpdate,
  documents,
  documentsLoading,
}: {
  pl: PLNumber;
  onClose: () => void;
  onUpdate: (linkedIds: string[]) => void;
  documents: PlLinkableDocument[];
  documentsLoading: boolean;
}) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [linked, setLinked] = useState<string[]>(pl.linkedDocumentIds ?? []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return documents.filter(d =>
      !q || d.id.toLowerCase().includes(q) || d.name.toLowerCase().includes(q) || d.category.toLowerCase().includes(q)
    );
  }, [documents, search]);

  const toggle = (id: string) => {
    setLinked(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSave = () => {
    onUpdate(linked);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <GlassCard className="w-full max-w-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Link Documents</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              <span className="font-mono text-teal-400">{pl.plNumber}</span> — {pl.name}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {linked.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {linked.map(id => {
              const doc = documents.find(d => d.id === id);
              return doc ? (
                <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-500/10 border border-teal-500/30 rounded-full text-xs text-teal-300">
                  <FileText className="w-3 h-3" />
                  {doc.id}
                  <button onClick={() => toggle(id)} className="ml-0.5 text-slate-500 hover:text-rose-400 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ) : null;
            })}
          </div>
        )}

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search documents by ID, name or category..."
            className="pl-10 w-full"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0 pr-0.5 custom-scrollbar">
          {documentsLoading && (
            <div className="text-center py-6 text-slate-500 text-sm">Loading documents...</div>
          )}
          {filtered.map(doc => {
            const isLinked = linked.includes(doc.id);
            return (
              <div
                key={doc.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${isLinked ? 'bg-teal-900/20 border-teal-500/30' : 'bg-slate-800/30 border-slate-700/40 hover:border-slate-600/60'}`}
                onClick={() => toggle(doc.id)}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isLinked ? 'bg-teal-500/20' : 'bg-slate-700/40'}`}>
                  <FileText className={`w-4 h-4 ${isLinked ? 'text-teal-400' : 'text-slate-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-slate-400">{doc.id}</span>
                    <Badge variant={DOC_STATUS_VARIANT[doc.status] ?? 'default'} className="text-[9px]">{doc.status}</Badge>
                  </div>
                  <p className="text-sm text-slate-200 truncate">{doc.name}</p>
                  <p className="text-[10px] text-slate-500">{doc.category} · Rev {doc.revision} · {doc.size}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isLinked ? (
                    <span className="flex items-center gap-1 text-[10px] text-teal-400 font-medium">
                      <LinkIcon className="w-3 h-3" /> Linked
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-slate-500">
                      <FilePlus className="w-3 h-3" /> Link
                    </span>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); navigate(`/documents/${doc.id}`); }}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 hover:text-teal-400 hover:bg-slate-700/50 transition-colors"
                    title="Open preview"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-10 text-slate-500 text-sm">No documents match your search</div>
          )}
        </div>

        <div className="flex gap-3 mt-4 pt-4 border-t border-slate-700/50 shrink-0">
          <div className="flex-1 text-xs text-slate-500 self-center">
            {linked.length} document{linked.length !== 1 ? 's' : ''} linked
          </div>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>
            <LinkIcon className="w-4 h-4" /> Save Links
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}

function CreatePLModal({ onClose, onSave }: { onClose: () => void; onSave: (data: CreatePLFormData) => Promise<void> }) {
  const [form, setForm] = useState<CreatePLFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.plNumber.trim()) errs.plNumber = 'PL Number is required';
    else if (!/^\d{8}$/.test(form.plNumber.trim())) errs.plNumber = 'Must be exactly 8 digits';
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.description.trim()) errs.description = 'Description is required';
    if (form.vendorType === 'VD' && !form.uvamId.trim()) errs.uvamId = 'UVAM Item ID is required for vendor directory items';
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    try { await onSave(form); onClose(); }
    finally { setSaving(false); }
  };

  const ta = `w-full bg-slate-950/60 border border-slate-700/50 text-slate-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 transition-all placeholder:text-slate-600 resize-none`;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-slate-900/98 backdrop-blur-xl border-l border-white/8 shadow-2xl flex flex-col slide-in-right">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
          <div>
            <h2 className="text-base font-bold text-white">Create New PL Record</h2>
            <p className="text-slate-500 text-xs mt-0.5">Register a new 8-digit PL Number in the knowledge base</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 space-y-4">
          {/* Identity */}
          <PlModalSectionHeading title="Identity" />
          <div className="grid grid-cols-2 gap-3">
            <PlModalField label="PL Number (8 digits) *" error={errors.plNumber}>
              <Input
                value={form.plNumber}
                onChange={e => setForm(f => ({ ...f, plNumber: e.target.value }))}
                placeholder="e.g. 38110000"
                className={`w-full font-mono ${errors.plNumber ? 'border-rose-500/50' : ''}`}
                maxLength={8}
                inputMode="numeric"
              />
            </PlModalField>
            <PlModalField label="Status">
              <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full">
                <option value="ACTIVE">Active</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="OBSOLETE">Obsolete</option>
              </Select>
            </PlModalField>
          </div>
          <PlModalField label="Name / Component Description *" error={errors.name}>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Bogie Frame Assembly" className={`w-full ${errors.name ? 'border-rose-500/50' : ''}`} />
          </PlModalField>
          <PlModalField label="Technical Description *" error={errors.description}>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Detailed technical description..." rows={3} className={`${ta} ${errors.description ? 'border-rose-500/50' : ''}`} />
          </PlModalField>

          {/* Classification */}
          <PlModalSectionHeading title="Classification" />
          <div className="grid grid-cols-2 gap-3">
            <PlModalField label="Inspection Category">
              <Select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as InspectionCategory }))} className="w-full">
                {(['CAT-A', 'CAT-B', 'CAT-C', 'CAT-D'] as InspectionCategory[]).map(c => (
                  <option key={c} value={c}>{INSPECTION_CATEGORY_LABELS[c]}</option>
                ))}
              </Select>
            </PlModalField>
            <PlModalField label="Controlling Agency">
              <Select value={form.controllingAgency} onChange={e => setForm(f => ({ ...f, controllingAgency: e.target.value }))} className="w-full">
                {AGENCIES.map(a => <option key={a} value={a}>{a}</option>)}
              </Select>
            </PlModalField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <PlModalField label="Vendor Type">
              <Select value={form.vendorType} onChange={e => setForm(f => ({ ...f, vendorType: e.target.value as CreatePLFormData['vendorType'] }))} className="w-full">
                <option value="">— Select —</option>
                <option value="VD">VD (Vendor-Designed)</option>
                <option value="NVD">NVD (Non-Vendor)</option>
              </Select>
            </PlModalField>
            <PlModalField label="Mother Part No.">
              <Input value={form.motherPart} onChange={e => setForm(f => ({ ...f, motherPart: e.target.value }))} placeholder="e.g. 38000000" className="w-full font-mono" />
            </PlModalField>
          </div>

          {/* Safety */}
          <PlModalSectionHeading title="Safety" />
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/30">
            <div>
              <p className="text-sm font-medium text-slate-200">Safety Vital Component</p>
              <p className="text-xs text-slate-500">Triggers additional oversight requirements</p>
            </div>
            <button onClick={() => setForm(f => ({ ...f, safetyCritical: !f.safetyCritical }))} className={`relative w-11 h-6 rounded-full transition-all ${form.safetyCritical ? 'bg-rose-500' : 'bg-slate-700'}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.safetyCritical ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
          {form.safetyCritical && <>
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
              <p className="text-xs text-rose-300">Flagged as <strong>Safety Vital</strong> — requires additional supervisor review on all linked records.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <PlModalField label="Safety Classification">
                <Select value={form.safetyClassification} onChange={e => setForm(f => ({ ...f, safetyClassification: e.target.value as SafetyClassification | '' }))} className="w-full">
                  <option value="">— Select —</option>
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </Select>
              </PlModalField>
              <PlModalField label="Severity of Failure">
                <Select value={form.severityOfFailure} onChange={e => setForm(f => ({ ...f, severityOfFailure: e.target.value }))} className="w-full">
                  <option value="">— Select —</option>
                  <option value="Catastrophic">Catastrophic</option>
                  <option value="Critical">Critical</option>
                  <option value="Marginal">Marginal</option>
                  <option value="Negligible">Negligible</option>
                </Select>
              </PlModalField>
            </div>
            <PlModalField label="Consequences of Failure">
              <textarea value={form.consequences} onChange={e => setForm(f => ({ ...f, consequences: e.target.value }))} rows={2} placeholder="Describe failure consequences..." className={ta} />
            </PlModalField>
            <PlModalField label="Functionality">
              <textarea value={form.functionality} onChange={e => setForm(f => ({ ...f, functionality: e.target.value }))} rows={2} placeholder="Describe component functionality..." className={ta} />
            </PlModalField>
          </>}

          {/* Engineering References */}
          <PlModalSectionHeading title="Engineering References" />
          <PlModalField label="Drawing Numbers (comma-separated)">
            <Input value={form.drawingNumbers} onChange={e => setForm(f => ({ ...f, drawingNumbers: e.target.value }))} placeholder="e.g. DWG-BOG-001, DWG-BOG-002" className="w-full font-mono text-xs" />
          </PlModalField>
          <PlModalField label="Spec Numbers (comma-separated)">
            <Input value={form.specNumbers} onChange={e => setForm(f => ({ ...f, specNumbers: e.target.value }))} placeholder="e.g. SPC-ELE-001, SPC-MEC-005" className="w-full font-mono text-xs" />
          </PlModalField>
          <div className="grid grid-cols-2 gap-3">
            <PlModalField label="UVAM ID" error={errors.uvamId}>
              <Input value={form.uvamId} onChange={e => setForm(f => ({ ...f, uvamId: e.target.value }))} placeholder="e.g. UVAM-2026-001" className="w-full font-mono text-xs" />
            </PlModalField>
            <PlModalField label="STR Number">
              <Input value={form.strNumber} onChange={e => setForm(f => ({ ...f, strNumber: e.target.value }))} placeholder="e.g. STR-2026-0045" className="w-full font-mono text-xs" />
            </PlModalField>
          </div>

          {/* Application */}
          <PlModalSectionHeading title="Application" />
          <PlModalField label="Application Area (platforms)">
            <Input value={form.applicationArea} onChange={e => setForm(f => ({ ...f, applicationArea: e.target.value }))} placeholder="e.g. WAP7, WAG9HC, LHB Coach" className="w-full" />
          </PlModalField>
          <PlModalField label="Used In (products, comma-separated)">
            <Input value={form.usedIn} onChange={e => setForm(f => ({ ...f, usedIn: e.target.value }))} placeholder="e.g. WAP7 Brake System, LHB Coach Control Panel" className="w-full" />
          </PlModalField>
          <PlModalField label="Eligibility Criteria">
            <textarea value={form.eligibilityCriteria} onChange={e => setForm(f => ({ ...f, eligibilityCriteria: e.target.value }))} rows={2} placeholder="Conditions under which this component is eligible for use..." className={ta} />
          </PlModalField>
          <PlModalField label="Procurement Conditions">
            <textarea value={form.procurementConditions} onChange={e => setForm(f => ({ ...f, procurementConditions: e.target.value }))} rows={2} placeholder="Optional procurement conditions, restrictions, or sourcing notes..." className={ta} />
          </PlModalField>

          {/* Personnel & Admin */}
          <PlModalSectionHeading title="Personnel & Admin" />
          <div className="grid grid-cols-2 gap-3">
            <PlModalField label="Design Supervisor">
              <Input value={form.designSupervisor} onChange={e => setForm(f => ({ ...f, designSupervisor: e.target.value }))} placeholder="e.g. SSE/Design" className="w-full" />
            </PlModalField>
            <PlModalField label="Concerned Supervisor">
              <Input value={form.concernedSupervisor} onChange={e => setForm(f => ({ ...f, concernedSupervisor: e.target.value }))} placeholder="e.g. SSE/Mech" className="w-full" />
            </PlModalField>
          </div>
          <PlModalField label="e-Office File No.">
            <Input value={form.eOfficeFile} onChange={e => setForm(f => ({ ...f, eOfficeFile: e.target.value }))} placeholder="e.g. CLW-DWG-2026-001" className="w-full font-mono text-xs" />
          </PlModalField>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-white/8 shrink-0">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving} className="flex-1">
            {saving ? <><span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : <><Plus className="w-4 h-4" /> Create PL Record</>}
          </Button>
        </div>
      </div>
    </>
  );
}

export default function PLKnowledgeHub() {
  const navigate = useNavigate();
  const { data: plItems, loading, error, refetch, add, update } = usePLItems();
  const { documents, loading: documentsLoading } = usePlLinkableDocuments();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [safetyFilter, setSafetyFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [linkingPL, setLinkingPL] = useState<PLNumber | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filtered = useMemo(() => {
    let items = plItems.filter(p => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        p.plNumber.includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.drawingNumbers.some(d => d.toLowerCase().includes(q));
      const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
      const matchCat = categoryFilter === 'ALL' || p.category === categoryFilter;
      const matchSafety = safetyFilter === 'ALL' ||
        (safetyFilter === 'SAFETY' && p.safetyCritical) ||
        (safetyFilter === 'NON_SAFETY' && !p.safetyCritical);
      return matchSearch && matchStatus && matchCat && matchSafety;
    });

    if (sortKey) {
      items = [...items].sort((a, b) => {
        let av: string | number = '';
        let bv: string | number = '';
        if (sortKey === 'plNumber') { av = a.plNumber; bv = b.plNumber; }
        else if (sortKey === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
        else if (sortKey === 'category') { av = a.category; bv = b.category; }
        else if (sortKey === 'controllingAgency') { av = a.controllingAgency; bv = b.controllingAgency; }
        else if (sortKey === 'status') { av = a.status; bv = b.status; }
        else if (sortKey === 'docs') { av = a.linkedDocumentIds.length; bv = b.linkedDocumentIds.length; }
        else if (sortKey === 'ecs') { av = (a.engineeringChanges ?? []).length; bv = (b.engineeringChanges ?? []).length; }
        else if (sortKey === 'works') { av = (a.linkedWorkIds ?? []).length; bv = (b.linkedWorkIds ?? []).length; }
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return items;
  }, [plItems, search, statusFilter, categoryFilter, safetyFilter, sortKey, sortDir]);

  const stats = useMemo(() => ({
    total: plItems.length,
    active: plItems.filter(p => p.status === 'ACTIVE').length,
    safetyVital: plItems.filter(p => p.safetyCritical).length,
    underReview: plItems.filter(p => p.status === 'UNDER_REVIEW').length,
  }), [plItems]);

  const activeFilters = [statusFilter, categoryFilter, safetyFilter].filter(f => f !== 'ALL').length;

  const handleLinkUpdate = (plId: string, linkedIds: string[]) => {
    update(plId, { linkedDocumentIds: linkedIds });
  };

  const handleCreate = async (data: CreatePLFormData) => {
    const toArr = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean);
    await add({
      plNumber: data.plNumber,
      name: data.name,
      description: data.description,
      category: data.category,
      controllingAgency: data.controllingAgency,
      status: data.status as 'ACTIVE' | 'UNDER_REVIEW' | 'OBSOLETE',
      safetyCritical: data.safetyCritical,
      safetyClassification: data.safetyClassification || undefined,
      severityOfFailure: data.severityOfFailure || undefined,
      consequences: data.consequences || undefined,
      functionality: data.functionality || undefined,
      designSupervisor: data.designSupervisor || undefined,
      concernedSupervisor: data.concernedSupervisor || undefined,
      applicationArea: data.applicationArea || undefined,
      eligibilityCriteria: data.eligibilityCriteria || undefined,
      procurementConditions: data.procurementConditions || undefined,
      drawingNumbers: toArr(data.drawingNumbers),
      specNumbers: toArr(data.specNumbers),
      motherPart: data.motherPart || undefined,
      uvamId: data.uvamId || undefined,
      strNumber: data.strNumber || undefined,
      eOfficeFile: data.eOfficeFile || undefined,
      vendorType: (data.vendorType as 'VD' | 'NVD') || undefined,
      usedIn: toArr(data.usedIn),
      engineeringChanges: [],
      linkedDocumentIds: [],
      linkedWorkIds: [],
      linkedCaseIds: [],
    });
    toast.success(`PL record "${data.name}" created`, { description: `PL-${data.plNumber}` });
  };

  if (loading) return <LoadingState message="Loading PL Knowledge Hub..." />;
  if (error) return <ErrorState variant="server" message="Failed to load PL records" onRetry={refetch} />;

  const ThCol = ({ col, label, className = '' }: { col: SortKey; label: string; className?: string }) => (
    <th
      className={`pb-3 text-left font-semibold text-slate-400 text-xs cursor-pointer select-none group ${className}`}
      onClick={() => handleSort(col)}
    >
      <span className="inline-flex items-center gap-0.5 hover:text-slate-200 transition-colors">
        {label}
        <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
      </span>
    </th>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">PL Knowledge Hub</h1>
          <p className="text-slate-400 text-sm">Central repository for all parts and components — identified by 8-digit PL numbers.</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4" /> Create PL Record
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total PL Items', value: stats.total, icon: <DatabaseBackup className="w-4 h-4 text-teal-400" /> },
          { label: 'Active', value: stats.active, icon: <CheckCircle className="w-4 h-4 text-emerald-400" /> },
          { label: 'Safety Vital', value: stats.safetyVital, icon: <Shield className="w-4 h-4 text-rose-400" /> },
          { label: 'Under Review', value: stats.underReview, icon: <Clock className="w-4 h-4 text-amber-400" /> },
        ].map(s => (
          <GlassCard key={s.label} className="px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center shrink-0">{s.icon}</div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{s.label}</p>
              <p className="text-xl font-bold text-slate-100">{s.value}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-6">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search PL records by number, name, or drawing..."
            className="pl-11 w-full"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Filter pills — always visible */}
        <div className="space-y-2 mb-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 w-16 shrink-0">Status</span>
            {['ALL', 'ACTIVE', 'UNDER_REVIEW', 'OBSOLETE'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`pill-filter ${statusFilter === s ? 'pill-filter-active' : 'pill-filter-inactive'}`}
              >
                {s === 'ALL' ? 'All' : STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 w-16 shrink-0">Category</span>
            {['ALL', 'CAT-A', 'CAT-B', 'CAT-C', 'CAT-D'].map(c => (
              <button
                key={c}
                onClick={() => setCategoryFilter(c)}
                className={`pill-filter ${categoryFilter === c ? 'pill-filter-active' : 'pill-filter-inactive'}`}
              >
                {c === 'ALL' ? 'All' : c}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 w-16 shrink-0">Safety</span>
            {[['ALL', 'All'], ['SAFETY', 'Safety Vital'], ['NON_SAFETY', 'Standard']].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setSafetyFilter(v)}
                className={`pill-filter ${safetyFilter === v ? 'pill-filter-active' : 'pill-filter-inactive'}`}
              >
                {l}
              </button>
            ))}
            {activeFilters > 0 && (
              <button
                onClick={() => { setStatusFilter('ALL'); setCategoryFilter('ALL'); setSafetyFilter('ALL'); }}
                className="text-xs text-slate-500 hover:text-teal-400 underline transition-colors ml-1"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        <div className="text-xs text-slate-500 mb-4 font-medium">
          Showing <span className="text-teal-400 font-semibold">{filtered.length}</span> of {plItems.length} PL records
          {search && <span className="text-slate-500"> matching "<span className="text-slate-300">{search}</span>"</span>}
        </div>

        {/* Sortable Table */}
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full min-w-[720px] border-separate border-spacing-y-1">
            <thead>
              <tr>
                <ThCol col="plNumber" label="PL Number" className="pl-3 w-36" />
                <ThCol col="name" label="Name" />
                <ThCol col="category" label="CAT" className="w-20" />
                <th className="pb-3 text-left font-semibold text-slate-400 text-xs w-10">
                  <Shield className="w-3.5 h-3.5" />
                </th>
                <ThCol col="controllingAgency" label="Agency" className="w-24" />
                <ThCol col="status" label="Status" className="w-28" />
                <ThCol col="docs" label="Docs" className="w-14 text-center" />
                <ThCol col="works" label="Works" className="w-14 text-center" />
                <ThCol col="ecs" label="ECs" className="w-14 text-center" />
                <th className="pb-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(pl => (
                <tr
                  key={pl.id}
                  className="group cursor-pointer"
                  onClick={() => navigate(`/pl/${pl.plNumber}`)}
                >
                  <td className="py-2.5 pl-3 pr-2 rounded-l-xl bg-slate-800/30 group-hover:bg-slate-800/50 border-y border-l border-slate-700/30 group-hover:border-teal-500/20 transition-all">
                    <span className="font-mono text-xs text-teal-400 flex items-center gap-1">
                      <Hash className="w-3 h-3 shrink-0" />{pl.plNumber}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 bg-slate-800/30 group-hover:bg-slate-800/50 border-y border-slate-700/30 group-hover:border-teal-500/20 transition-all max-w-[220px]">
                    <p className="text-sm font-medium text-slate-200 group-hover:text-teal-200 transition-colors truncate">{pl.name}</p>
                    {pl.description && <p className="text-[10px] text-slate-600 truncate">{pl.description}</p>}
                  </td>
                  <td className="py-2.5 px-2 bg-slate-800/30 group-hover:bg-slate-800/50 border-y border-slate-700/30 group-hover:border-teal-500/20 transition-all">
                    <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${CATEGORY_COLORS[pl.category] ?? 'bg-slate-700/50 text-slate-400 border-slate-600'}`}>
                      {pl.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 bg-slate-800/30 group-hover:bg-slate-800/50 border-y border-slate-700/30 group-hover:border-teal-500/20 transition-all">
                    {pl.safetyCritical && (
                      <span title="Safety Vital">
                        <Shield className="w-3.5 h-3.5 text-rose-400" />
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 bg-slate-800/30 group-hover:bg-slate-800/50 border-y border-slate-700/30 group-hover:border-teal-500/20 transition-all">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-600 shrink-0" />{pl.controllingAgency || '—'}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 bg-slate-800/30 group-hover:bg-slate-800/50 border-y border-slate-700/30 group-hover:border-teal-500/20 transition-all">
                    <Badge variant={STATUS_VARIANT[pl.status] ?? 'default'}>
                      {STATUS_LABEL[pl.status] ?? pl.status}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-2 bg-slate-800/30 group-hover:bg-slate-800/50 border-y border-slate-700/30 group-hover:border-teal-500/20 transition-all text-center">
                    <span className={`text-xs font-semibold ${pl.linkedDocumentIds.length > 0 ? 'text-teal-400' : 'text-slate-600'}`}>
                      {pl.linkedDocumentIds.length}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 bg-slate-800/30 group-hover:bg-slate-800/50 border-y border-slate-700/30 group-hover:border-teal-500/20 transition-all text-center">
                    <span className={`text-xs font-semibold ${(pl.linkedWorkIds?.length ?? 0) > 0 ? 'text-blue-400' : 'text-slate-600'}`}>
                      {pl.linkedWorkIds?.length ?? 0}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 bg-slate-800/30 group-hover:bg-slate-800/50 border-y border-slate-700/30 group-hover:border-teal-500/20 transition-all text-center">
                    <span className={`text-xs font-semibold ${(pl.engineeringChanges?.length ?? 0) > 0 ? 'text-amber-400' : 'text-slate-600'}`}>
                      {pl.engineeringChanges?.length ?? 0}
                    </span>
                  </td>
                  <td className="py-2.5 pl-2 pr-3 rounded-r-xl bg-slate-800/30 group-hover:bg-slate-800/50 border-y border-r border-slate-700/30 group-hover:border-teal-500/20 transition-all">
                    <div className="flex items-center gap-1.5 justify-end">
                      <button
                        onClick={e => { e.stopPropagation(); setLinkingPL(pl); }}
                        title="Link / Unlink Documents"
                        className={`w-6 h-6 flex items-center justify-center rounded-lg border transition-all ${
                          pl.linkedDocumentIds.length > 0
                            ? 'bg-teal-500/10 border-teal-500/30 text-teal-400 hover:bg-teal-500/20'
                            : 'bg-slate-800/50 border-slate-700/40 text-slate-600 hover:text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <LinkIcon className="w-3 h-3" />
                      </button>
                      <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-teal-400 transition-colors" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-14">
              <DatabaseBackup className="w-10 h-10 mx-auto mb-3 text-slate-600 opacity-50" />
              <p className="text-slate-400 font-medium mb-1">No PL records match</p>
              <p className="text-slate-600 text-sm mb-4">Try adjusting your search or filters</p>
              <div className="flex gap-2 justify-center">
                {activeFilters > 0 && (
                  <Button variant="secondary" size="sm" onClick={() => { setStatusFilter('ALL'); setCategoryFilter('ALL'); setSafetyFilter('ALL'); }}>
                    Clear Filters
                  </Button>
                )}
                <Button size="sm" onClick={() => setShowCreateModal(true)}>
                  <Plus className="w-3.5 h-3.5" /> Create PL Record
                </Button>
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      {showCreateModal && (
        <CreatePLModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreate}
        />
      )}

      {linkingPL && (
        <LinkDocumentsModal
          pl={linkingPL}
          onClose={() => setLinkingPL(null)}
          onUpdate={(linkedIds) => {
            handleLinkUpdate(linkingPL.id, linkedIds);
          }}
          documents={documents}
          documentsLoading={documentsLoading}
        />
      )}
    </div>
  );
}
