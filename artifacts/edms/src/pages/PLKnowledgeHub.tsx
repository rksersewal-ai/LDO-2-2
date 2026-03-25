import { useState, useMemo } from 'react';
import {
  Search, Filter, DatabaseBackup, ArrowRight, Layers, Box, Cpu, Shield, Hash,
  Plus, X, ChevronDown, AlertTriangle, CheckCircle, Clock, SlidersHorizontal,
  Building2, Link as LinkIcon, Unlink, ExternalLink, FileText, FilePlus,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { GlassCard, Badge, Button, Input, Select } from '../components/ui/Shared';
import { usePLItems } from '../hooks/usePLItems';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import type { PLNumber, InspectionCategory } from '../lib/types';
import { INSPECTION_CATEGORY_LABELS, AGENCIES } from '../lib/constants';
import { MOCK_DOCUMENTS } from '../lib/mock';

function NodeIcon({ safetyCritical, className = "w-5 h-5" }: { safetyCritical: boolean; className?: string }) {
  if (safetyCritical) return <Shield className={`${className} text-rose-400`} />;
  return <DatabaseBackup className={`${className} text-slate-400`} />;
}

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

interface CreatePLFormData {
  plNumber: string;
  name: string;
  description: string;
  category: InspectionCategory;
  controllingAgency: string;
  status: string;
  safetyCritical: boolean;
  designSupervisor: string;
  applicationArea: string;
}

const EMPTY_FORM: CreatePLFormData = {
  plNumber: '',
  name: '',
  description: '',
  category: 'CAT-C',
  controllingAgency: 'CLW',
  status: 'ACTIVE',
  safetyCritical: false,
  designSupervisor: '',
  applicationArea: '',
};

const DOC_STATUS_VARIANT: Record<string, 'success' | 'warning' | 'default' | 'danger'> = {
  Approved: 'success',
  'In Review': 'warning',
  Draft: 'default',
  Obsolete: 'danger',
};

function LinkDocumentsModal({
  pl,
  onClose,
  onUpdate,
}: {
  pl: PLNumber;
  onClose: () => void;
  onUpdate: (linkedIds: string[]) => void;
}) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [linked, setLinked] = useState<string[]>(pl.linkedDocumentIds ?? []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return MOCK_DOCUMENTS.filter(d =>
      !q || d.id.toLowerCase().includes(q) || d.name.toLowerCase().includes(q) || d.category.toLowerCase().includes(q)
    );
  }, [search]);

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
              const doc = MOCK_DOCUMENTS.find(d => d.id === id);
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
    else if (!/^\d{8}$/.test(form.plNumber.trim())) errs.plNumber = 'PL Number must be exactly 8 digits';
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.description.trim()) errs.description = 'Description is required';
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    try { await onSave(form); onClose(); }
    finally { setSaving(false); }
  };

  const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-[10px] text-rose-400 mt-1">{error}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <GlassCard className="w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-white">Create New PL Record</h2>
            <p className="text-slate-500 text-xs mt-0.5">Register a new 8-digit PL Number in the knowledge base</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="PL Number (8 digits) *" error={errors.plNumber}>
              <Input
                value={form.plNumber}
                onChange={e => setForm(f => ({ ...f, plNumber: e.target.value }))}
                placeholder="e.g. 38110000"
                className={`w-full font-mono ${errors.plNumber ? 'border-rose-500/50' : ''}`}
                maxLength={8}
              />
            </Field>
            <Field label="Inspection Category *">
              <Select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as InspectionCategory }))} className="w-full">
                {(['CAT-A', 'CAT-B', 'CAT-C', 'CAT-D'] as InspectionCategory[]).map(c => (
                  <option key={c} value={c}>{INSPECTION_CATEGORY_LABELS[c]}</option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Name / Component Description *" error={errors.name}>
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Bogie Frame Assembly"
              className={`w-full ${errors.name ? 'border-rose-500/50' : ''}`}
            />
          </Field>

          <Field label="Technical Description *" error={errors.description}>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Detailed technical description of the component..."
              rows={3}
              className={`w-full bg-slate-950/60 border text-slate-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 transition-all placeholder:text-slate-600 resize-none ${errors.description ? 'border-rose-500/50' : 'border-slate-700/50'}`}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Controlling Agency">
              <Select value={form.controllingAgency} onChange={e => setForm(f => ({ ...f, controllingAgency: e.target.value }))} className="w-full">
                {AGENCIES.map(a => <option key={a} value={a}>{a}</option>)}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full">
                <option value="ACTIVE">Active</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="OBSOLETE">Obsolete</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Design Supervisor">
              <Input
                value={form.designSupervisor}
                onChange={e => setForm(f => ({ ...f, designSupervisor: e.target.value }))}
                placeholder="e.g. SSE/Design"
                className="w-full"
              />
            </Field>
            <Field label="Application Area">
              <Input
                value={form.applicationArea}
                onChange={e => setForm(f => ({ ...f, applicationArea: e.target.value }))}
                placeholder="e.g. WAP7, WAG9HC"
                className="w-full"
              />
            </Field>
          </div>

          {/* Safety Critical toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/30">
            <div>
              <p className="text-sm font-medium text-slate-200">Safety Vital Component</p>
              <p className="text-xs text-slate-500">Mark as safety critical — triggers additional oversight requirements</p>
            </div>
            <button
              onClick={() => setForm(f => ({ ...f, safetyCritical: !f.safetyCritical }))}
              className={`relative w-11 h-6 rounded-full transition-all ${form.safetyCritical ? 'bg-rose-500' : 'bg-slate-700'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.safetyCritical ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>

          {form.safetyCritical && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-rose-300">
                This component will be flagged as <strong>Safety Vital</strong>. All associated documents and work records will require additional supervisor review.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6 pt-5 border-t border-slate-700/50">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving} className="flex-1">
            {saving ? <><span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : <><Plus className="w-4 h-4" /> Create PL Record</>}
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}

export default function PLKnowledgeHub() {
  const navigate = useNavigate();
  const { data: plItems, loading, error, refetch, add, update } = usePLItems();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [safetyFilter, setSafetyFilter] = useState('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [linkingPL, setLinkingPL] = useState<PLNumber | null>(null);

  const filtered = useMemo(() => {
    return plItems.filter(p => {
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
  }, [plItems, search, statusFilter, categoryFilter, safetyFilter]);

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
    await add({
      plNumber: data.plNumber,
      name: data.name,
      description: data.description,
      category: data.category,
      controllingAgency: data.controllingAgency,
      status: data.status as 'ACTIVE' | 'UNDER_REVIEW' | 'OBSOLETE',
      safetyCritical: data.safetyCritical,
      designSupervisor: data.designSupervisor,
      applicationArea: data.applicationArea,
      usedIn: [],
      drawingNumbers: [],
      specNumbers: [],
      engineeringChanges: [],
      linkedDocumentIds: [],
      linkedWorkIds: [],
      linkedCaseIds: [],
    });
  };

  if (loading) return <LoadingState message="Loading PL Knowledge Hub..." />;
  if (error) return <ErrorState variant="server" message="Failed to load PL records" onRetry={refetch} />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">PL Knowledge Hub</h1>
          <p className="text-slate-400 text-sm">Central repository for all parts and components — identified by 8-digit PL numbers.</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4" /> Create PL Record
        </Button>
      </div>

      {/* Stats */}
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
        {/* Search + Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search PL records by number, name, or drawing..."
              className="pl-11 w-full"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium border transition-colors ${showFilters || activeFilters > 0 ? 'bg-teal-500/15 border-teal-500/40 text-teal-300' : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-slate-200'}`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
            {activeFilters > 0 && <span className="w-4 h-4 rounded-full bg-teal-500 text-white text-[9px] flex items-center justify-center">{activeFilters}</span>}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mb-4 p-4 rounded-xl bg-slate-800/30 border border-slate-700/40 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 mb-1.5">Status</p>
                <div className="flex flex-wrap gap-1">
                  {['ALL', 'ACTIVE', 'UNDER_REVIEW', 'OBSOLETE'].map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' : 'bg-slate-800/60 text-slate-500 hover:text-slate-300 border border-slate-700/30'}`}>
                      {s === 'ALL' ? 'All' : STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 mb-1.5">Inspection Category</p>
                <div className="flex flex-wrap gap-1">
                  {['ALL', 'CAT-A', 'CAT-B', 'CAT-C', 'CAT-D'].map(c => (
                    <button key={c} onClick={() => setCategoryFilter(c)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${categoryFilter === c ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' : 'bg-slate-800/60 text-slate-500 hover:text-slate-300 border border-slate-700/30'}`}>
                      {c === 'ALL' ? 'All' : c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 mb-1.5">Safety</p>
                <div className="flex flex-wrap gap-1">
                  {[['ALL', 'All'], ['SAFETY', 'Safety Vital'], ['NON_SAFETY', 'Standard']].map(([v, l]) => (
                    <button key={v} onClick={() => setSafetyFilter(v)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${safetyFilter === v ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' : 'bg-slate-800/60 text-slate-500 hover:text-slate-300 border border-slate-700/30'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {activeFilters > 0 && (
              <button onClick={() => { setStatusFilter('ALL'); setCategoryFilter('ALL'); setSafetyFilter('ALL'); }}
                className="text-xs text-slate-500 hover:text-teal-400 underline transition-colors">
                Clear all filters
              </button>
            )}
          </div>
        )}

        <div className="text-xs text-slate-500 mb-4 font-medium">
          Showing <span className="text-teal-400 font-semibold">{filtered.length}</span> of {plItems.length} PL records
          {search && <span className="text-slate-500"> matching "<span className="text-slate-300">{search}</span>"</span>}
        </div>

        {/* PL Records List */}
        <div className="space-y-2">
          {filtered.map(pl => (
            <div
              key={pl.id}
              className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/30 border border-slate-700/50 hover:border-teal-500/30 cursor-pointer transition-all group"
              onClick={() => navigate(`/pl/${pl.plNumber}`)}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${pl.safetyCritical ? 'bg-rose-500/10 border border-rose-500/20' : 'bg-slate-700/30 border border-slate-600/30'}`}>
                <NodeIcon safetyCritical={pl.safetyCritical} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-sm font-semibold text-slate-200 group-hover:text-teal-200 transition-colors">{pl.name}</span>
                  {pl.safetyCritical && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-rose-900/40 border border-rose-500/30 rounded-full text-[10px] text-rose-300">
                      <Shield className="w-2.5 h-2.5" /> Safety Vital
                    </span>
                  )}
                  <Badge variant={STATUS_VARIANT[pl.status] ?? 'default'}>
                    {STATUS_LABEL[pl.status] ?? pl.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                  <span className="font-mono text-teal-400 flex items-center gap-1"><Hash className="w-3 h-3" />{pl.plNumber}</span>
                  <span className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${CATEGORY_COLORS[pl.category] ?? 'bg-slate-700/50 text-slate-400 border-slate-600'}`}>
                    {pl.category}
                  </span>
                  {pl.controllingAgency && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{pl.controllingAgency}</span>}
                  {pl.drawingNumbers.length > 0 && <span>{pl.drawingNumbers.length} drawing{pl.drawingNumbers.length !== 1 ? 's' : ''}</span>}
                  {pl.linkedDocumentIds.length > 0 && <span>{pl.linkedDocumentIds.length} doc{pl.linkedDocumentIds.length !== 1 ? 's' : ''}</span>}
                </div>
                {pl.description && (
                  <p className="text-xs text-slate-600 mt-0.5 truncate max-w-lg">{pl.description}</p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {pl.engineeringChanges && pl.engineeringChanges.length > 0 && (
                  <span className="text-[10px] text-slate-600 font-mono">{pl.engineeringChanges.length} EC{pl.engineeringChanges.length !== 1 ? 's' : ''}</span>
                )}
                <button
                  onClick={e => { e.stopPropagation(); setLinkingPL(pl); }}
                  title="Link / Unlink Documents"
                  className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-all ${
                    pl.linkedDocumentIds.length > 0
                      ? 'bg-teal-500/10 border-teal-500/30 text-teal-400 hover:bg-teal-500/20'
                      : 'bg-slate-800/50 border-slate-700/40 text-slate-600 hover:text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                </button>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-teal-400 transition-colors" />
              </div>
            </div>
          ))}

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
        />
      )}
    </div>
  );
}
