import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { GlassCard, Badge, Button, Input, Select } from '../components/ui/Shared';
import { DatePicker } from '../components/ui/DatePicker';
import { PLNumberSelect } from '../components/ui/PLNumberSelect';
import { PLNumberMultiSelect } from '../components/ui/PLNumberMultiSelect';
import { Switch } from '../components/ui/switch';
import { MOCK_PL_RECORDS } from '../lib/mock';
import { getPLRecord } from '../lib/bomData';
import { usePLItem, usePLItems } from '../hooks/usePLItems';
import { usePlLinkableDocuments, type PlLinkableDocument } from '../hooks/usePlLinkableDocuments';
import { useDocumentChangeAlerts } from '../hooks/useDocumentChangeAlerts';
import { PLService } from '../services/PLService';
import type { DocumentChangeAlert } from '../services/DocumentChangeAlertService';
import type { PLNumber, EngineeringChange, SafetyClassification, InspectionCategory } from '../lib/types';
import { INSPECTION_CATEGORY_LABELS, AGENCIES } from '../lib/constants';
import { LoadingState } from '../components/ui/LoadingState';
import {
  ArrowLeft, FileText, AlertCircle, FileSearch, DatabaseBackup,
  Box, Layers, Cpu, Shield, Package, Hash, Weight, Building2,
  User, Calendar, Activity,
  ChevronRight, Download, Printer, ArrowRight,
  AlertTriangle, ExternalLink, X, Plus,
  Edit3, GitBranch, Briefcase, Save,
} from 'lucide-react';

function NodeIcon({ type, className = "w-5 h-5" }: { type: string; className?: string }) {
  if (type === 'assembly') return <Box className={`${className} text-blue-400`} />;
  if (type === 'sub-assembly') return <Layers className={`${className} text-indigo-400`} />;
  return <Cpu className={`${className} text-slate-400`} />;
}

function tagColor(tag: string) {
  const t = tag.toLowerCase();
  if (t.includes('safety')) return 'bg-rose-900/50 text-rose-300 border-rose-500/30';
  if (t.includes('high voltage')) return 'bg-amber-900/50 text-amber-300 border-amber-500/30';
  if (t.includes('electrical') || t.includes('electronics')) return 'bg-blue-900/50 text-blue-300 border-blue-500/30';
  if (t.includes('rotating') || t.includes('precision')) return 'bg-purple-900/50 text-purple-300 border-purple-500/30';
  return 'bg-slate-800 text-slate-400 border-slate-700';
}

function statusBadgeVariant(status: string): "default" | "success" | "warning" | "danger" | "processing" {
  if (['Approved', 'Released', 'Active', 'Production', 'Implemented', 'ACTIVE', 'RELEASED'].includes(status)) return 'success';
  if (['In Review', 'Preliminary', 'In Development', 'Prototyping', 'Pending', 'UNDER_REVIEW', 'IN_REVIEW', 'OPEN'].includes(status)) return 'warning';
  if (['Obsolete', 'Superseded', 'End of Life', 'Cancelled', 'OBSOLETE'].includes(status)) return 'danger';
  return 'default';
}

const CATEGORY_COLORS: Record<string, string> = {
  'CAT-A': 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  'CAT-B': 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  'CAT-C': 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  'CAT-D': 'bg-slate-700/50 text-slate-400 border-slate-600/40',
};

const EC_STATUS_VARIANT: Record<string, string> = {
  OPEN: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  IN_REVIEW: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  IMPLEMENTED: 'bg-teal-500/10 text-teal-300 border-teal-500/30',
  RELEASED: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
};

const EC_STATUS_DOT: Record<string, string> = {
  OPEN: 'bg-blue-400',
  IN_REVIEW: 'bg-amber-400',
  IMPLEMENTED: 'bg-teal-400',
  RELEASED: 'bg-emerald-400',
};

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-[10px] text-rose-400 mt-1">{error}</p>}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-500">{label}</span>
      <span className={`text-sm text-slate-200 ${mono ? 'font-mono text-teal-300' : ''}`}>{value}</span>
    </div>
  );
}

// ─── Document Linking Section (Two-Column Layout) ──────────────────────────────

interface DocumentLinkingSectionProps {
  pl: PLNumber;
  documents: PlLinkableDocument[];
  documentsLoading: boolean;
  documentAlerts?: Record<string, DocumentChangeAlert>;
  onLinkChange: (nextLinkedIds: string[]) => Promise<void> | void;
  onApproveAlert?: (alertId: string, notes?: string) => Promise<void> | void;
  onBypassAlert?: (alertId: string, payload?: { notes?: string; bypassReason?: string }) => Promise<void> | void;
  focusedDocumentId?: string | null;
}

function DocumentLinkingSection({
  pl,
  documents,
  documentsLoading,
  documentAlerts = {},
  onLinkChange,
  onApproveAlert,
  onBypassAlert,
  focusedDocumentId,
}: DocumentLinkingSectionProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const linkedDocs = useMemo(() =>
    documents.filter(d => (pl.linkedDocumentIds ?? []).includes(d.id)),
    [documents, pl.linkedDocumentIds]
  );
  
  const availableDocs = useMemo(() =>
    documents
      .filter(d => !(pl.linkedDocumentIds ?? []).includes(d.id))
      .filter(d => 
        !searchQuery || 
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name)),
    [documents, pl.linkedDocumentIds, searchQuery]
  );

  const handleLink = async (docId: string) => {
    await onLinkChange([...(pl.linkedDocumentIds ?? []), docId]);
  };

  const handleUnlink = async (docId: string) => {
    await onLinkChange((pl.linkedDocumentIds ?? []).filter(id => id !== docId));
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Left Column: Search & Available Documents */}
      <GlassCard className="p-6 flex flex-col">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <FileSearch className="w-4 h-4 text-teal-400" />
          Search & Link Documents
        </h3>
        
        <div className="mb-4">
          <Input
            placeholder="Search by name or ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
          {documentsLoading && (
            <div className="text-center py-8 text-slate-500">
              <p className="text-xs">Loading documents...</p>
            </div>
          )}
          {availableDocs.length > 0 ? (
            availableDocs.map(doc => (
              <div
                key={doc.id}
                className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/50 hover:border-teal-500/30 transition-all group"
              >
                <div className="flex items-start gap-2 mb-2">
                  <FileText className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-200 group-hover:text-teal-200 truncate">{doc.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{doc.id}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="teal-outline"
                  className="w-full text-xs"
                  onClick={() => handleLink(doc.id)}
                >
                  <Plus className="w-3 h-3" /> Link
                </Button>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-500">
              <FileSearch className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">
                {searchQuery ? 'No matching documents' : 'All documents linked'}
              </p>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Right Column: Linked Documents */}
      <GlassCard className="p-6 flex flex-col">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-teal-400" />
          Linked Documents
          <span className="ml-auto text-xs text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-full">
            {linkedDocs.length}
          </span>
        </h3>

        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
          {linkedDocs.length > 0 ? (
            linkedDocs.map(doc => (
              (() => {
                const alert = documentAlerts[doc.id];
                const isFocused = focusedDocumentId === doc.id;
                return (
              <div
                key={doc.id}
                className={`p-3 rounded-lg bg-slate-800/40 border transition-all ${alert ? 'border-amber-500/30 hover:border-amber-400/50' : 'border-teal-500/20 hover:border-teal-500/40'} ${isFocused ? 'ring-2 ring-amber-400/60 shadow-[0_0_0_1px_rgba(251,191,36,0.18)]' : ''}`}
              >
                {alert && (
                  <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-1.5">
                    <div className="flex min-w-0 items-center gap-1.5 text-[10px] text-amber-200">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">Latest linked change pending supervisor review</span>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void onApproveAlert?.(alert.id, 'Approved from PL linked documents');
                      }}
                      className="shrink-0 rounded-md border border-amber-400/30 px-2 py-0.5 text-[9px] font-semibold text-amber-100 hover:bg-amber-500/12 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void onBypassAlert?.(alert.id, { bypassReason: 'Bypassed from PL linked documents' });
                      }}
                      className="shrink-0 rounded-md border border-rose-400/30 px-2 py-0.5 text-[9px] font-semibold text-rose-200 hover:bg-rose-500/12 transition-colors"
                    >
                      Bypass
                    </button>
                  </div>
                )}
                <div className="flex items-start gap-2 mb-2">
                  <FileText className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">{doc.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{doc.id}</p>
                  </div>
                </div>
                <div className="flex gap-2 text-[10px]">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1 text-xs h-auto py-1"
                    onClick={() => navigate(`/documents/${doc.id}`)}
                  >
                    <ExternalLink className="w-3 h-3" /> Preview
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    className="flex-1 text-xs h-auto py-1"
                    onClick={() => handleUnlink(doc.id)}
                  >
                    <X className="w-3 h-3" /> Unlink
                  </Button>
                </div>
              </div>
                );
              })()
            ))
          ) : (
            <div className="text-center py-8 text-slate-500">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">No documents linked yet</p>
              <p className="text-[10px] text-slate-600 mt-1">Search and link documents from the left panel</p>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

// ─── Edit PL Slide-Over ────────────────────────────────────────────────────────

interface EditPLSlideOverProps {
  pl: PLNumber;
  onClose: () => void;
  onSave: (patch: Partial<PLNumber>) => Promise<void>;
}

function EditPLSlideOver({ pl, onClose, onSave }: EditPLSlideOverProps) {
  const { data: plItems, loading: plItemsLoading } = usePLItems();
  const [form, setForm] = useState({
    name: pl.name,
    description: pl.description,
    category: pl.category,
    controllingAgency: pl.controllingAgency,
    status: pl.status,
    safetyCritical: pl.safetyCritical,
    safetyClassification: pl.safetyClassification ?? '',
    severityOfFailure: pl.severityOfFailure ?? '',
    consequences: pl.consequences ?? '',
    functionality: pl.functionality ?? '',
    applicationArea: pl.applicationArea ?? '',
    usedIn: (pl.usedIn ?? []).join(', '),
    drawingNumbers: (pl.drawingNumbers ?? []).join(', '),
    specNumbers: (pl.specNumbers ?? []).join(', '),
    motherPart: pl.motherPart ?? '',
    uvamId: pl.uvamId ?? '',
    strNumber: pl.strNumber ?? '',
    eligibilityCriteria: pl.eligibilityCriteria ?? '',
    procurementConditions: pl.procurementConditions ?? '',
    designSupervisor: pl.designSupervisor ?? '',
    concernedSupervisor: pl.concernedSupervisor ?? '',
    eOfficeFile: pl.eOfficeFile ?? '',
    vendorType: pl.vendorType ?? '',
  });
  const [saving, setSaving] = useState(false);

  const splitList = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        name: form.name,
        description: form.description,
        category: form.category as InspectionCategory,
        controllingAgency: form.controllingAgency,
        status: form.status as PLNumber['status'],
        safetyCritical: form.safetyCritical,
        safetyClassification: form.safetyClassification as SafetyClassification || undefined,
        severityOfFailure: form.severityOfFailure || undefined,
        consequences: form.consequences || undefined,
        functionality: form.functionality || undefined,
        applicationArea: form.applicationArea || undefined,
        usedIn: splitList(form.usedIn),
        drawingNumbers: splitList(form.drawingNumbers),
        specNumbers: splitList(form.specNumbers),
        motherPart: form.motherPart || undefined,
        uvamId: form.uvamId || undefined,
        strNumber: form.strNumber || undefined,
        eligibilityCriteria: form.eligibilityCriteria || undefined,
        procurementConditions: form.procurementConditions || undefined,
        designSupervisor: form.designSupervisor || undefined,
        concernedSupervisor: form.concernedSupervisor || undefined,
        eOfficeFile: form.eOfficeFile || undefined,
        vendorType: form.vendorType as 'VD' | 'NVD' | undefined || undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-[10px] uppercase tracking-widest font-semibold text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  );

  const TextInput = ({ field, placeholder }: { field: keyof typeof form; placeholder?: string }) => (
    <Input
      value={form[field] as string}
      onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
      placeholder={placeholder}
      className="w-full"
    />
  );

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 shrink-0">
          <div>
            <h2 className="text-base font-bold text-white">Edit PL Record</h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{pl.plNumber} — {pl.name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 space-y-5">
          {/* Identity */}
          <section>
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-teal-500 mb-3">Identity</h3>
            <div className="space-y-3">
              <F label="PL Number (read-only)">
                <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-400">{pl.plNumber}</div>
              </F>
              <F label="Name *">
                <TextInput field="name" placeholder="Component name" />
              </F>
              <F label="Technical Description *">
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full bg-slate-950/60 border border-slate-700/50 text-slate-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 transition-all placeholder:text-slate-600 resize-none"
                />
              </F>
            </div>
          </section>

          {/* Classification */}
          <section>
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-teal-500 mb-3">Classification</h3>
            <div className="grid grid-cols-2 gap-3">
              <F label="Inspection Category">
                <Select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as InspectionCategory }))} className="w-full">
                  {(['CAT-A', 'CAT-B', 'CAT-C', 'CAT-D'] as InspectionCategory[]).map(c => (
                    <option key={c} value={c}>{c} — {INSPECTION_CATEGORY_LABELS[c]}</option>
                  ))}
                </Select>
              </F>
              <F label="Status">
                <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as PLNumber['status'] }))} className="w-full">
                  <option value="ACTIVE">Active</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="OBSOLETE">Obsolete</option>
                </Select>
              </F>
              <F label="Vendor Type *">
                <Select value={form.vendorType} onChange={e => setForm(f => ({ ...f, vendorType: e.target.value }))} className="w-full">
                  <option value="">— Select Type —</option>
                  <option value="VD">VD (Vendor Drawing)</option>
                  <option value="NVD">NVD (Non-Vendor Drawing)</option>
                </Select>
              </F>
            </div>
          </section>

          {/* Conditional Fields Based on Vendor Type */}
          {form.vendorType && (
            <section>
              <h3 className="text-[10px] uppercase tracking-widest font-bold text-indigo-500 mb-3">
                {form.vendorType === 'VD' ? 'Vendor Directory Requirements' : 'Non-Vendor Directory Details'}
              </h3>
              {form.vendorType === 'VD' ? (
                // VD (Vendor Directory) - Show UVAM ID and Controlling Agency
                <div className="space-y-3">
                  <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-4 mb-3">
                    <p className="text-xs text-indigo-300">Vendor Directory items require UVAM item identification and controlling agency assignment.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <F label="UVAM Item ID *">
                      <TextInput field="uvamId" placeholder="Enter UVAM reference" />
                    </F>
                    <F label="Controlling Agency *">
                      <Select value={form.controllingAgency} onChange={e => setForm(f => ({ ...f, controllingAgency: e.target.value }))} className="w-full">
                        <option value="">— Select Agency —</option>
                        {AGENCIES.map(a => <option key={a} value={a}>{a}</option>)}
                      </Select>
                    </F>
                  </div>
                </div>
              ) : (
                // NVD (Non-Vendor Directory) - Show optional eligibility and procurement notes
                <div className="space-y-3">
                  <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4 mb-3">
                    <p className="text-xs text-purple-300">Non-Vendor Directory items may include optional eligibility criteria and procurement notes.</p>
                  </div>
                  <F label="Eligibility Criteria (Optional)">
                    <textarea
                      value={form.eligibilityCriteria}
                      onChange={e => setForm(f => ({ ...f, eligibilityCriteria: e.target.value }))}
                      rows={3}
                      placeholder="Document the eligibility criteria for this NVD item (e.g., design standards, performance requirements, compliance measures)..."
                      className="w-full bg-slate-950/60 border border-slate-700/50 text-slate-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all placeholder:text-slate-600 resize-none"
                    />
                  </F>
                  <F label="Procurement Conditions">
                    <textarea
                      value={form.procurementConditions}
                      onChange={e => setForm(f => ({ ...f, procurementConditions: e.target.value }))}
                      rows={3}
                      placeholder="Optional procurement conditions, restrictions, or sourcing notes..."
                      className="w-full bg-slate-950/60 border border-slate-700/50 text-slate-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all placeholder:text-slate-600 resize-none"
                    />
                  </F>
                </div>
              )}
            </section>
          )}

          {/* Safety */}
          <section>
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-rose-400 mb-3">Safety</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/30">
                <div>
                  <p className="text-sm font-medium text-slate-200">Safety Vital Component</p>
                  <p className="text-xs text-slate-500">Triggers additional oversight requirements</p>
                </div>
                <Switch
                  checked={form.safetyCritical}
                  onCheckedChange={(safetyCritical) => setForm(f => ({ ...f, safetyCritical }))}
                  aria-label="Toggle safety vital component"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <F label="Safety Classification">
                  <Select value={form.safetyClassification} onChange={e => setForm(f => ({ ...f, safetyClassification: e.target.value }))} className="w-full">
                    <option value="">— None —</option>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </Select>
                </F>
                <F label="Severity of Failure">
                  <TextInput field="severityOfFailure" placeholder="e.g. Catastrophic" />
                </F>
              </div>
              <F label="Consequences of Failure">
                <textarea
                  value={form.consequences}
                  onChange={e => setForm(f => ({ ...f, consequences: e.target.value }))}
                  rows={2}
                  placeholder="Describe consequences..."
                  className="w-full bg-slate-950/60 border border-slate-700/50 text-slate-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 transition-all placeholder:text-slate-600 resize-none"
                />
              </F>
              <F label="Functionality">
                <TextInput field="functionality" placeholder="Primary function description" />
              </F>
            </div>
          </section>

          {/* Engineering References */}
          <section>
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-teal-500 mb-3">Engineering References</h3>
            <div className="space-y-3">
              <F label="Drawing Numbers (comma-separated)">
                <TextInput field="drawingNumbers" placeholder="e.g. DWG-001, DWG-002" />
              </F>
              <F label="Spec Numbers (comma-separated)">
                <TextInput field="specNumbers" placeholder="e.g. SPEC-101, SPEC-102" />
              </F>
              <F label="Mother Part">
                <PLNumberSelect
                  value={form.motherPart}
                  onChange={(motherPart) => setForm(f => ({ ...f, motherPart }))}
                  plItems={plItems.filter(item => item.plNumber !== pl.plNumber)}
                  loading={plItemsLoading}
                  placeholder="Search parent assembly PL number..."
                  helperText="Choose the parent assembly PL or leave blank if this is a top-level controlled item."
                />
              </F>
              <div className="grid grid-cols-2 gap-3">
                <F label="UVAM ID">
                  <TextInput field="uvamId" placeholder="UVAM reference" />
                </F>
                <F label="STR Number">
                  <TextInput field="strNumber" placeholder="STR reference" />
                </F>
              </div>
            </div>
          </section>

          {/* Application */}
          <section>
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-teal-500 mb-3">Application</h3>
            <div className="space-y-3">
              <F label="Application Area">
                <TextInput field="applicationArea" placeholder="e.g. WAP7, WAG9HC" />
              </F>
              <F label="Used In (comma-separated PL numbers)">
                <PLNumberMultiSelect
                  values={form.usedIn.split(',').map(value => value.trim()).filter(Boolean)}
                  onChange={(values) => setForm(f => ({ ...f, usedIn: values.join(', ') }))}
                  plItems={plItems.filter(item => item.plNumber !== pl.plNumber)}
                  loading={plItemsLoading}
                  helperText="Select the parent assemblies or consuming PL records where this item is used."
                />
              </F>
              <F label="Eligibility Criteria">
                <textarea
                  value={form.eligibilityCriteria}
                  onChange={e => setForm(f => ({ ...f, eligibilityCriteria: e.target.value }))}
                  rows={2}
                  placeholder="Eligibility requirements..."
                  className="w-full bg-slate-950/60 border border-slate-700/50 text-slate-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 transition-all placeholder:text-slate-600 resize-none"
                />
              </F>
            </div>
          </section>

          {/* Personnel */}
          <section>
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-teal-500 mb-3">Personnel & Admin</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <F label="Design Supervisor">
                  <TextInput field="designSupervisor" placeholder="e.g. SSE/Design" />
                </F>
                <F label="Concerned Supervisor">
                  <TextInput field="concernedSupervisor" placeholder="e.g. JE/QA" />
                </F>
              </div>
              <F label="E-Office File Reference">
                <TextInput field="eOfficeFile" placeholder="e.g. F.No. 100/D-1/2026" />
              </F>
            </div>
          </section>
        </div>

        <div className="px-6 py-4 border-t border-slate-700/50 flex gap-3 shrink-0">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving
              ? <><span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
              : <><Save className="w-4 h-4" /> Save Changes</>
            }
          </Button>
        </div>
        </div>
      </div>
    </>
  );
}

// ─── Add Engineering Change Form ───────────────────────────────────────────────

interface AddECFormProps {
  onAdd: (ec: Omit<EngineeringChange, 'id'>) => void;
  onCancel: () => void;
}

function AddECForm({ onAdd, onCancel }: AddECFormProps) {
  const [form, setForm] = useState({
    ecNumber: '',
    description: '',
    status: 'OPEN' as EngineeringChange['status'],
    date: new Date().toISOString().slice(0, 10),
    author: '',
  });

  const handleAdd = () => {
    if (!form.ecNumber.trim() || !form.description.trim()) return;
    onAdd({
      ecNumber: form.ecNumber.trim(),
      description: form.description.trim(),
      status: form.status,
      date: form.date,
      author: form.author.trim() || undefined,
    });
  };

  return (
    <div className="p-4 rounded-xl bg-teal-500/5 border border-teal-500/20 space-y-3 mb-4">
      <p className="text-xs font-semibold text-teal-400 uppercase tracking-widest">New Engineering Change</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-medium text-slate-500 mb-1">EC Number *</label>
          <Input value={form.ecNumber} onChange={e => setForm(f => ({ ...f, ecNumber: e.target.value }))} placeholder="EC-2026-XXXX" className="w-full font-mono" />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-slate-500 mb-1">Status</label>
          <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as EngineeringChange['status'] }))} className="w-full">
            <option value="OPEN">Open</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="IMPLEMENTED">Implemented</option>
            <option value="RELEASED">Released</option>
          </Select>
        </div>
        <div>
          <label className="block text-[10px] font-medium text-slate-500 mb-1">Date</label>
          <DatePicker value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-slate-500 mb-1">Author</label>
          <Input value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} placeholder="e.g. A. Sharma" className="w-full" />
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-medium text-slate-500 mb-1">Description *</label>
        <textarea
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          rows={2}
          placeholder="Describe the engineering change..."
          className="w-full bg-slate-950/60 border border-slate-700/50 text-slate-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 transition-all placeholder:text-slate-600 resize-none"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={handleAdd} disabled={!form.ecNumber.trim() || !form.description.trim()}>
          <Plus className="w-3.5 h-3.5" /> Add EC
        </Button>
      </div>
    </div>
  );
}

// ─── PLNumber Detail View ──────────────────────────────────────────────────────

type PLNumberTab = 'overview' | 'documents' | 'changes' | 'crossrefs';

function isPLNumberTab(value: string | null): value is PLNumberTab {
  return value === 'overview' || value === 'documents' || value === 'changes' || value === 'crossrefs';
}

function PLNumberDetailView({
  pl,
  onUpdate,
}: {
  pl: PLNumber;
  onUpdate: (patch: Partial<PLNumber>) => Promise<void>;
}) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<PLNumberTab>(() => (
    isPLNumberTab(searchParams.get('tab')) ? searchParams.get('tab') as PLNumberTab : 'overview'
  ));
  const [editOpen, setEditOpen] = useState(false);
  const [showAddEC, setShowAddEC] = useState(false);
  const { documents, loading: documentsLoading } = usePlLinkableDocuments();
  const { alerts: documentAlerts, approveAlert, bypassAlert } = useDocumentChangeAlerts({ plItem: pl.id });
  const focusedDocumentId = searchParams.get('doc');

  const linkedDocs = useMemo(() =>
    documents.filter(d => (pl.linkedDocumentIds ?? []).includes(d.id)),
    [documents, pl.linkedDocumentIds]
  );
  const documentAlertMap = useMemo(
    () => Object.fromEntries(documentAlerts.map((alert) => [alert.documentId, alert])),
    [documentAlerts],
  );

  const engineeringChanges = pl.engineeringChanges ?? [];

  useEffect(() => {
    const nextTab = searchParams.get('tab');
    if (isPLNumberTab(nextTab)) {
      setActiveTab(nextTab);
    }
  }, [searchParams]);

  const handleAddEC = async (ec: Omit<EngineeringChange, 'id'>) => {
    const newEC: EngineeringChange = {
      ...ec,
      id: `EC-${Date.now()}`,
    };
    await onUpdate({ engineeringChanges: [...engineeringChanges, newEC] });
    setShowAddEC(false);
  };

  const handleTabChange = (tab: PLNumberTab) => {
    setActiveTab(tab);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('tab', tab);
      if (tab !== 'documents' && tab !== 'crossrefs') {
        next.delete('doc');
      }
      return next;
    }, { replace: true });
  };

  const tabs: { id: PLNumberTab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'documents', label: 'Documents', count: linkedDocs.length },
    { id: 'changes', label: 'Engineering Changes', count: engineeringChanges.length },
    { id: 'crossrefs', label: 'Cross-References' },
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div>
        <button onClick={() => navigate('/pl')} className="flex items-center gap-2 text-slate-500 hover:text-teal-300 text-sm mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to PL Knowledge Hub
        </button>
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              {pl.safetyCritical ? (
                <Shield className="w-6 h-6 text-rose-400" />
              ) : (
                <DatabaseBackup className="w-6 h-6 text-slate-400" />
              )}
              <h1 className="text-2xl font-bold text-white">{pl.name}</h1>
              <Badge variant={statusBadgeVariant(pl.status)}>
                {pl.status === 'ACTIVE' ? 'Active' : pl.status === 'UNDER_REVIEW' ? 'Under Review' : 'Obsolete'}
              </Badge>
              {pl.safetyCritical && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-rose-900/50 border border-rose-500/30 rounded-full text-xs text-rose-300">
                  <Shield className="w-3 h-3" /> Safety Vital
                </span>
              )}
              <span className={`px-2 py-0.5 rounded border text-xs font-semibold ${CATEGORY_COLORS[pl.category] ?? 'bg-slate-700/50 text-slate-400'}`}>
                {pl.category}
              </span>
            </div>
            <p className="text-slate-400 text-sm font-mono pl-9 flex items-center gap-2">
              <Hash className="w-3.5 h-3.5" />{pl.plNumber}
              {pl.controllingAgency && <><span className="text-slate-600">·</span><Building2 className="w-3.5 h-3.5 text-slate-500" />{pl.controllingAgency}</>}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
              <Edit3 className="w-4 h-4" /> Edit PL
            </Button>
            <Button variant="secondary" size="sm"><Download className="w-4 h-4" /> Export</Button>
            <Button size="sm"><AlertCircle className="w-4 h-4" /> Create Case</Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-700/50 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex-shrink-0 px-4 py-2.5 text-xs font-medium border-b-2 transition-all -mb-px flex items-center gap-1.5 ${
              activeTab === tab.id ? 'border-teal-500 text-teal-300' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${activeTab === tab.id ? 'bg-teal-500/20 text-teal-300' : 'bg-slate-800 text-slate-500'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <GlassCard className="p-6">
              <h2 className="text-sm font-bold text-white mb-3">Technical Description</h2>
              <p className="text-sm text-slate-300 leading-relaxed">{pl.description || '—'}</p>
            </GlassCard>

            <GlassCard className="p-6">
              <h2 className="text-sm font-bold text-white mb-4">Properties</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <InfoRow label="PL Number" value={pl.plNumber} mono />
                <InfoRow label="Category" value={pl.category} />
                <InfoRow label="Agency" value={pl.controllingAgency} />
                <InfoRow label="Application Area" value={pl.applicationArea} />
                <InfoRow label="Mother Part" value={pl.motherPart} />
                <InfoRow label="Vendor Type" value={pl.vendorType} />
                <InfoRow label="UVAM ID" value={pl.uvamId} />
                <InfoRow label="STR Number" value={pl.strNumber} />
                <InfoRow label="Design Supervisor" value={pl.designSupervisor} />
                <InfoRow label="Concerned Supervisor" value={pl.concernedSupervisor} />
                <InfoRow label="E-Office File" value={pl.eOfficeFile} />
                <InfoRow label="Last Updated" value={pl.updatedAt?.slice(0, 10)} />
              </div>
            </GlassCard>

            {(pl.drawingNumbers?.length > 0 || pl.specNumbers?.length > 0) && (
              <GlassCard className="p-6">
                <h2 className="text-sm font-bold text-white mb-4">Engineering References</h2>
                {pl.drawingNumbers?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 mb-2">Drawing Numbers</p>
                    <div className="flex flex-wrap gap-1.5">
                      {pl.drawingNumbers.map(d => (
                        <span key={d} className="px-2.5 py-1 bg-slate-800/60 border border-slate-700/40 rounded-lg text-xs font-mono text-slate-300">{d}</span>
                      ))}
                    </div>
                  </div>
                )}
                {pl.specNumbers?.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 mb-2">Spec Numbers</p>
                    <div className="flex flex-wrap gap-1.5">
                      {pl.specNumbers.map(s => (
                        <span key={s} className="px-2.5 py-1 bg-slate-800/60 border border-slate-700/40 rounded-lg text-xs font-mono text-slate-300">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </GlassCard>
            )}

            {(pl.consequences || pl.severityOfFailure || pl.eligibilityCriteria || pl.procurementConditions) && (
              <GlassCard className="p-6">
                <h2 className="text-sm font-bold text-white mb-4">Safety & Eligibility Details</h2>
                <div className="space-y-3">
                  <InfoRow label="Safety Classification" value={pl.safetyClassification} />
                  <InfoRow label="Severity of Failure" value={pl.severityOfFailure} />
                  {pl.consequences && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 mb-1">Consequences of Failure</p>
                      <p className="text-sm text-slate-300">{pl.consequences}</p>
                    </div>
                  )}
                  {pl.functionality && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 mb-1">Functionality</p>
                      <p className="text-sm text-slate-300">{pl.functionality}</p>
                    </div>
                  )}
                  {pl.eligibilityCriteria && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 mb-1">Eligibility Criteria</p>
                      <p className="text-sm text-slate-300">{pl.eligibilityCriteria}</p>
                    </div>
                  )}
                  {pl.procurementConditions && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 mb-1">Procurement Conditions</p>
                      <p className="text-sm text-slate-300">{pl.procurementConditions}</p>
                    </div>
                  )}
                </div>
              </GlassCard>
            )}
          </div>

          <div className="space-y-4">
            <GlassCard className="p-5">
              <h3 className="text-sm font-bold text-white mb-3">Quick Stats</h3>
              <div className="space-y-2">
                {[
                  { label: 'Linked Documents', value: (pl.linkedDocumentIds ?? []).length },
                  { label: 'Drawing Numbers', value: (pl.drawingNumbers ?? []).length },
                  { label: 'Spec Numbers', value: (pl.specNumbers ?? []).length },
                  { label: 'Engineering Changes', value: (pl.engineeringChanges ?? []).length },
                  { label: 'Used In (Assemblies)', value: (pl.usedIn ?? []).length },
                  { label: 'Linked Work Records', value: (pl.linkedWorkIds ?? []).length },
                  { label: 'Linked Cases', value: (pl.linkedCaseIds ?? []).length },
                ].map(s => (
                  <div key={s.label} className="flex justify-between text-sm">
                    <span className="text-slate-500">{s.label}</span>
                    <span className="text-teal-400 font-semibold">{s.value}</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            {(pl.usedIn ?? []).length > 0 && (
              <GlassCard className="p-5">
                <h3 className="text-sm font-bold text-white mb-3">Used In</h3>
                <div className="space-y-1.5">
                  {(pl.usedIn ?? []).map(p => (
                    <div key={p} className="flex items-center gap-2 text-sm">
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                      <span className="font-mono text-teal-400 text-xs cursor-pointer hover:underline" onClick={() => navigate(`/pl/${p}`)}>{p}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            {/* Recent Activity Feed */}
            {(pl.engineeringChanges ?? []).length > 0 && (
              <GlassCard className="p-5">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-teal-400" />
                  Recent Activity
                </h3>
                <div className="space-y-3">
                  {[...(pl.engineeringChanges ?? [])]
                    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
                    .slice(0, 5)
                    .map(ec => (
                      <div key={ec.id} className="flex gap-2.5">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${EC_STATUS_DOT[ec.status] ?? 'bg-slate-500'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[10px] text-teal-300">{ec.ecNumber}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-semibold ${EC_STATUS_VARIANT[ec.status] ?? 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                              {ec.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">{ec.description}</p>
                          <p className="text-[10px] text-slate-600 mt-0.5">{ec.date} · {ec.author}</p>
                        </div>
                      </div>
                    ))}
                </div>
                {(pl.engineeringChanges ?? []).length > 5 && (
                  <button
                    onClick={() => setActiveTab('changes')}
                    className="mt-3 text-xs text-teal-400 hover:text-teal-300 transition-colors"
                  >
                    +{(pl.engineeringChanges ?? []).length - 5} more changes →
                  </button>
                )}
              </GlassCard>
            )}
          </div>
        </div>
      )}

      {/* Documents Tab — Two-Column Document Linking */}
      {activeTab === 'documents' && (
        <DocumentLinkingSection
          pl={pl}
          documents={documents}
          documentsLoading={documentsLoading}
          documentAlerts={documentAlertMap}
          onLinkChange={(nextLinkedIds) => onUpdate({ linkedDocumentIds: nextLinkedIds })}
          onApproveAlert={approveAlert}
          onBypassAlert={bypassAlert}
          focusedDocumentId={focusedDocumentId}
        />
      )}

      {/* Engineering Changes Tab */}
      {activeTab === 'changes' && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white">Engineering Changes</h2>
            <Button size="sm" onClick={() => setShowAddEC(v => !v)}>
              {showAddEC ? <><X className="w-3.5 h-3.5" /> Cancel</> : <><Plus className="w-3.5 h-3.5" /> Add EC</>}
            </Button>
          </div>

          {showAddEC && (
            <AddECForm
              onAdd={handleAddEC}
              onCancel={() => setShowAddEC(false)}
            />
          )}

          {engineeringChanges.length > 0 ? (
            <div className="space-y-0">
              {[...engineeringChanges].reverse().map((ec, i) => (
                <div key={ec.id} className="flex gap-4">
                  <div className="flex flex-col items-center pt-1">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${EC_STATUS_DOT[ec.status] ?? 'bg-slate-500'}`} />
                    {i < engineeringChanges.length - 1 && (
                      <div className="w-px flex-1 bg-slate-700/50 mt-1 mb-0" style={{ minHeight: '28px' }} />
                    )}
                  </div>
                  <div className="flex-1 pb-5">
                    <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-teal-400 font-semibold">{ec.ecNumber}</span>
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-medium ${EC_STATUS_VARIANT[ec.status] ?? 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                          {ec.status.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-600 shrink-0">{ec.date}</span>
                    </div>
                    <p className="text-sm text-slate-200 leading-snug">{ec.description}</p>
                    {ec.author && (
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <User className="w-3 h-3" />{ec.author}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !showAddEC && (
              <div className="text-center py-10">
                <GitBranch className="w-10 h-10 mx-auto mb-3 text-slate-600 opacity-50" />
                <p className="text-slate-400 text-sm">No engineering changes recorded.</p>
                <p className="text-slate-600 text-xs mt-1">Add the first engineering change using the button above.</p>
              </div>
            )
          )}
        </GlassCard>
      )}

      {/* Cross-References Tab */}
      {activeTab === 'crossrefs' && (
        <div className="space-y-4">
          {/* Linked Documents summary */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-teal-400" />
              <h2 className="text-sm font-bold text-white">Documents</h2>
              <span className="px-1.5 py-0.5 bg-teal-500/10 text-teal-300 border border-teal-500/20 rounded-full text-[10px] font-semibold">{linkedDocs.length}</span>
              {documentAlerts.length > 0 && (
                <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-200 border border-amber-500/25 rounded-full text-[10px] font-semibold">
                  {documentAlerts.length} alert{documentAlerts.length === 1 ? '' : 's'}
                </span>
              )}
            </div>
            {linkedDocs.length > 0 ? (
              <div className="space-y-1.5">
                {linkedDocs.map(doc => {
                  const alert = documentAlertMap[doc.id];
                  const isFocused = focusedDocumentId === doc.id;

                  return (
                    <div
                      key={doc.id}
                      className={`flex items-center gap-3 p-2.5 rounded-lg bg-slate-800/30 border cursor-pointer transition-all ${alert ? 'border-amber-500/25 hover:border-amber-400/45' : 'border-slate-700/40 hover:border-teal-500/30'} ${isFocused ? 'ring-2 ring-amber-400/50' : ''}`}
                      onClick={() => navigate(`/documents/${doc.id}`)}
                    >
                      <FileText className="w-4 h-4 text-teal-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-slate-200 truncate">{doc.name}</span>
                        <span className="font-mono text-[10px] text-slate-500 ml-2">{doc.id}</span>
                        {alert && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-200">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Change alert
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {(doc.ocrStatus === 'Completed' || doc.ocrStatus === 'COMPLETED') && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-[9px] text-indigo-300">
                            <FileSearch className="w-2.5 h-2.5" /> OCR
                          </span>
                        )}
                        {alert && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void approveAlert(alert.id, 'Approved from PL cross-reference list');
                            }}
                            className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[9px] font-semibold text-amber-100 hover:bg-amber-500/14 transition-colors"
                          >
                            Approve
                          </button>
                        )}
                        {alert && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void bypassAlert(alert.id, { bypassReason: 'Bypassed from PL cross-reference list' });
                            }}
                            className="rounded-full border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-[9px] font-semibold text-rose-100 hover:bg-rose-500/14 transition-colors"
                          >
                            Bypass
                          </button>
                        )}
                        <Badge variant={statusBadgeVariant(doc.status)} className="text-[9px]">{doc.status}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No documents linked.</p>
            )}
          </GlassCard>

          {/* Linked Work Records */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-bold text-white">Work Records</h2>
              <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-full text-[10px] font-semibold">{(pl.linkedWorkIds ?? []).length}</span>
            </div>
            {(pl.linkedWorkIds ?? []).length > 0 ? (
              <div className="space-y-1.5">
                {(pl.linkedWorkIds ?? []).map(id => {
                  const isOpen = id.startsWith('WR-OPEN') || id.includes('-OPEN-');
                  const isClosed = id.startsWith('WR-CLOSED') || id.includes('-CLOSED-');
                  const statusVariant = isClosed ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : isOpen ? 'bg-slate-700/50 text-slate-400 border-slate-600/40' : 'bg-amber-500/10 text-amber-300 border-amber-500/30';
                  const statusLabel = isClosed ? 'Closed' : isOpen ? 'Open' : 'In Progress';
                  return (
                    <div key={id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-800/30 border border-slate-700/40 cursor-pointer hover:border-blue-500/30 transition-all" onClick={() => navigate(`/ledger?id=${id}`)}>
                      <Briefcase className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="font-mono text-xs text-blue-300 flex-1">{id}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-semibold shrink-0 ${statusVariant}`}>{statusLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No work records linked to this PL.</p>
            )}
          </GlassCard>

          {/* Linked Cases */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white">Cases</h2>
              <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-full text-[10px] font-semibold">{(pl.linkedCaseIds ?? []).length}</span>
            </div>
            {(pl.linkedCaseIds ?? []).length > 0 ? (
              <div className="space-y-1.5">
                {(pl.linkedCaseIds ?? []).map(id => {
                  const isClosed = id.includes('-CLOSED') || id.includes('RESOLVED');
                  const isOpen = id.includes('-OPEN') || id.includes('ACTIVE');
                  const caseStatus = isClosed ? 'Resolved' : isOpen ? 'Active' : 'Open';
                  const caseVariant = isClosed ? 'bg-slate-700/50 text-slate-400 border-slate-600/40' : 'bg-amber-500/10 text-amber-300 border-amber-500/30';
                  return (
                    <div key={id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-800/30 border border-slate-700/40 cursor-pointer hover:border-amber-500/30 transition-all" onClick={() => navigate(`/cases?id=${id}`)}>
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="font-mono text-xs text-amber-300 flex-1">{id}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-semibold shrink-0 ${caseVariant}`}>{caseStatus}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No cases linked to this PL.</p>
            )}
          </GlassCard>
        </div>
      )}

      {/* Edit Slide-Over */}
      {editOpen && (
        <EditPLSlideOver
          pl={pl}
          onClose={() => setEditOpen(false)}
          onSave={onUpdate}
        />
      )}
    </div>
  );
}

// ─── Main Export ───────────────────────────────────────────────────────────────

export default function PLDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: plItem, loading: plItemLoading, refetch } = usePLItem(id);

  const plRecord = id ? getPLRecord(id) : undefined;
  const legacyPL = !plRecord ? MOCK_PL_RECORDS.find(r => r.id === `PL-${id}` || r.id === id) : undefined;

  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'drawings' | 'whereUsed' | 'changes' | 'effectivity'>('overview');

  const handleUpdatePL = async (patch: Partial<PLNumber>) => {
    if (!plItem) return;
    await PLService.update(plItem.id, patch);
    refetch();
  };

  if (plItemLoading && !plRecord && !legacyPL) {
    return <LoadingState message="Loading PL record..." />;
  }

  if (plItem) {
    return (
      <PLNumberDetailView
        pl={plItem}
        onUpdate={handleUpdatePL}
      />
    );
  }

  if (plRecord) {
    const tabs = [
      { id: 'overview', label: 'Overview' },
      { id: 'documents', label: `Linked Documents (${plRecord.linkedDocuments.length})` },
      { id: 'drawings', label: `Drawings (${plRecord.linkedDrawings.length})` },
      { id: 'whereUsed', label: 'Where Used' },
      { id: 'changes', label: 'Change History' },
      { id: 'effectivity', label: 'Effectivity' },
    ] as const;

    return (
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div>
          <button onClick={() => navigate('/pl')} className="flex items-center gap-2 text-slate-500 hover:text-teal-300 text-sm mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to PL Knowledge Hub
          </button>
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <NodeIcon type={plRecord.type} className="w-6 h-6" />
                <h1 className="text-2xl font-bold text-white">{plRecord.name}</h1>
                <Badge variant={statusBadgeVariant(plRecord.lifecycleState)}>{plRecord.lifecycleState}</Badge>
                {plRecord.safetyVital && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-rose-900/50 border border-rose-500/30 rounded-full text-xs text-rose-300">
                    <Shield className="w-3 h-3" /> Safety Vital
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-sm font-mono pl-9 flex items-center gap-2">
                <Hash className="w-3.5 h-3.5" />PL {plRecord.plNumber} · Rev {plRecord.revision} · {plRecord.type}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary"><Download className="w-4 h-4" /> Export</Button>
              <Button variant="secondary"><Printer className="w-4 h-4" /> Print</Button>
              <Button><AlertCircle className="w-4 h-4" /> Create Case</Button>
            </div>
          </div>
        </div>

        <div className="flex gap-1 border-b border-slate-700/50 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-shrink-0 px-4 py-2.5 text-xs font-medium border-b-2 transition-all -mb-px ${
                activeTab === tab.id ? 'border-teal-500 text-teal-300' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <GlassCard className="p-6">
                <h2 className="text-base font-bold text-white mb-3">Description</h2>
                <p className="text-sm text-slate-300 leading-relaxed">{plRecord.description}</p>
              </GlassCard>
              <GlassCard className="p-6">
                <h2 className="text-base font-bold text-white mb-4">Properties</h2>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: Hash, label: 'PL Number', value: plRecord.plNumber, mono: true },
                    { icon: Activity, label: 'Type', value: plRecord.type },
                    { icon: User, label: 'Owner', value: plRecord.owner },
                    { icon: Building2, label: 'Department', value: plRecord.department },
                    { icon: Package, label: 'Source', value: plRecord.source },
                    { icon: Weight, label: 'Weight', value: plRecord.weight ?? '—' },
                    { icon: Calendar, label: 'Created', value: plRecord.createdDate },
                    { icon: Calendar, label: 'Last Modified', value: plRecord.lastModified },
                  ].map(f => (
                    <div key={f.label} className="flex items-start gap-3">
                      <f.icon className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500">{f.label}</p>
                        <p className={`text-sm font-medium text-slate-200 ${f.mono ? 'font-mono' : ''}`}>{f.value}</p>
                      </div>
                    </div>
                  ))}
                  {plRecord.supplier && (
                    <div className="flex items-start gap-3">
                      <Building2 className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500">Supplier</p>
                        <p className="text-sm font-medium text-slate-200">{plRecord.supplier}</p>
                        {plRecord.supplierPartNo && <p className="text-xs text-slate-500 font-mono">{plRecord.supplierPartNo}</p>}
                      </div>
                    </div>
                  )}
                </div>
              </GlassCard>
            </div>

            <div className="space-y-4">
              <GlassCard className="p-5">
                <h3 className="text-sm font-bold text-white mb-3">Tags & Classification</h3>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {plRecord.tags.map(tag => (
                    <span key={tag} className={`px-2 py-0.5 border text-xs rounded-full ${tagColor(tag)}`}>{tag}</span>
                  ))}
                </div>
                <div className="text-xs text-slate-500 mb-1">Classification</div>
                <p className="text-xs text-slate-300">{plRecord.classification}</p>
              </GlassCard>
              <GlassCard className="p-5">
                <h3 className="text-sm font-bold text-white mb-3">Quick Stats</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Documents', value: plRecord.linkedDocuments.length },
                    { label: 'Drawings', value: plRecord.linkedDrawings.length },
                    { label: 'Where Used', value: plRecord.whereUsed.length },
                    { label: 'Changes', value: plRecord.changeHistory.length },
                    { label: 'Alternates', value: plRecord.alternates.length },
                  ].map(s => (
                    <div key={s.label} className="flex justify-between text-sm">
                      <span className="text-slate-500">{s.label}</span>
                      <span className="text-teal-400 font-semibold">{s.value}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <GlassCard className="p-6">
            <h2 className="text-base font-bold text-white mb-4">Linked Documents</h2>
            <div className="space-y-3">
              {plRecord.linkedDocuments.map(doc => (
                <div key={doc.docId} className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/30 border border-slate-700/50 hover:border-teal-500/30 cursor-pointer transition-all" onClick={() => navigate(`/documents/${doc.docId}`)}>
                  <FileText className="w-9 h-9 p-2 rounded-lg bg-teal-500/10 text-teal-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200">{doc.title}</p>
                    <div className="flex gap-3 text-xs text-slate-500 mt-0.5">
                      <span className="font-mono text-teal-400">{doc.docId}</span>
                      <span>{doc.type}</span>
                      <span>Rev {doc.revision}</span>
                      <span>{doc.size}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={statusBadgeVariant(doc.status)}>{doc.status}</Badge>
                    <ExternalLink className="w-4 h-4 text-slate-600 hover:text-teal-400 transition-colors" />
                  </div>
                </div>
              ))}
              {plRecord.linkedDocuments.length === 0 && <p className="text-slate-500 text-sm">No documents linked to this PL record.</p>}
            </div>
          </GlassCard>
        )}

        {activeTab === 'drawings' && (
          <GlassCard className="p-6">
            <h2 className="text-base font-bold text-white mb-4">Linked Drawings</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50 text-slate-400">
                    <th className="pb-3 text-left font-semibold pl-4">Drawing ID</th>
                    <th className="pb-3 text-left font-semibold">Title</th>
                    <th className="pb-3 text-left font-semibold">Sheet</th>
                    <th className="pb-3 text-left font-semibold">Rev</th>
                    <th className="pb-3 text-left font-semibold">Format</th>
                    <th className="pb-3 text-left font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  {plRecord.linkedDrawings.map(d => (
                    <tr key={d.drawingId} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 pl-4 font-mono text-xs text-teal-400">{d.drawingId}</td>
                      <td className="py-3 text-slate-200 text-sm">{d.title}</td>
                      <td className="py-3 text-slate-400 text-xs">{d.sheetNo}</td>
                      <td className="py-3 font-mono text-xs text-slate-300">{d.revision}</td>
                      <td className="py-3 text-slate-400 text-xs">{d.format}</td>
                      <td className="py-3"><Badge variant={statusBadgeVariant(d.status)}>{d.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {plRecord.linkedDrawings.length === 0 && <p className="text-slate-500 text-sm mt-4">No drawings linked to this PL record.</p>}
            </div>
          </GlassCard>
        )}

        {activeTab === 'whereUsed' && (
          <GlassCard className="p-6">
            <h2 className="text-base font-bold text-white mb-4">Where Used</h2>
            {plRecord.whereUsed.length > 0 ? (
              <div className="space-y-3">
                {plRecord.whereUsed.map((u, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/30 border border-slate-700/50 cursor-pointer hover:border-teal-500/30 transition-all" onClick={() => navigate(`/pl/${u.parentPL}`)}>
                    <Box className="w-8 h-8 p-1.5 rounded-lg bg-blue-500/10 text-blue-400 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-200">{u.parentName}</p>
                      <p className="text-xs text-slate-500 font-mono">{u.parentPL} · Find No. {u.findNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Quantity</p>
                      <p className="text-lg font-bold text-teal-400">{u.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">This is a top-level assembly and is not used in any parent assemblies.</p>
            )}
          </GlassCard>
        )}

        {activeTab === 'changes' && (
          <GlassCard className="p-6">
            <h2 className="text-base font-bold text-white mb-4">Change History</h2>
            {plRecord.changeHistory.length > 0 ? (
              <div className="space-y-4">
                {plRecord.changeHistory.map((c, i) => (
                  <div key={c.changeId} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${c.status === 'Implemented' ? 'bg-teal-500/10 border-teal-500/30 text-teal-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'}`}>{c.type.slice(0, 1)}</div>
                      {i < plRecord.changeHistory.length - 1 && <div className="w-px flex-1 bg-slate-700/50 mt-2" />}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-teal-400">{c.changeId}</span>
                        <span className="text-xs px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">{c.type}</span>
                        <Badge variant={statusBadgeVariant(c.status)}>{c.status}</Badge>
                      </div>
                      <p className="text-sm font-medium text-slate-200">{c.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{c.author} · {c.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No change history recorded for this PL record.</p>
            )}
          </GlassCard>
        )}

        {activeTab === 'effectivity' && (
          <GlassCard className="p-6">
            <h2 className="text-base font-bold text-white mb-4">Effectivity</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(plRecord.effectivity).filter(([, v]) => v).map(([key, value]) => (
                <div key={key} className="bg-slate-800/30 rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                  <p className="text-sm font-medium text-slate-200">{String(value)}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>
    );
  }

  if (legacyPL) {
    return (
      <div className="space-y-6 max-w-[1200px] mx-auto">
        <button onClick={() => navigate('/pl')} className="flex items-center gap-2 text-slate-500 hover:text-teal-300 text-sm mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to PL Knowledge Hub
        </button>
        <div className="flex items-center gap-3 mb-2">
          <DatabaseBackup className="w-6 h-6 text-slate-400" />
          <h1 className="text-2xl font-bold text-white">{legacyPL.title}</h1>
          <Badge variant={legacyPL.status === 'Active' ? 'success' : legacyPL.status === 'Obsolete' ? 'danger' : 'warning'}>{legacyPL.status}</Badge>
        </div>
        <p className="text-slate-400 text-sm font-mono">{legacyPL.id} · {legacyPL.lifecycle}</p>
        <GlassCard className="p-6">
          <p className="text-slate-300">{legacyPL.description}</p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div><p className="text-xs text-slate-500">Owner</p><p className="text-sm text-slate-200">{legacyPL.owner}</p></div>
            <div><p className="text-xs text-slate-500">Last Updated</p><p className="text-sm text-slate-200">{legacyPL.lastUpdated}</p></div>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-[60vh]">
      <GlassCard className="p-12 text-center max-w-md">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">PL Record Not Found</h2>
        <p className="text-slate-400 text-sm mb-4">No PL record with ID <span className="font-mono text-teal-400">{id}</span> exists.</p>
        <Button onClick={() => navigate('/pl')}>
          <ArrowLeft className="w-4 h-4" /> Back to PL Knowledge Hub
        </Button>
      </GlassCard>
    </div>
  );
}
