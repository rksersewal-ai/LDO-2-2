import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { GlassCard, Badge, Button } from '../components/ui/Shared';
import { MOCK_DOCUMENTS } from '../lib/mock';
import { MOCK_OCR_JOBS } from '../lib/mockExtended';
import { DocumentService } from '../services/DocumentService';
import type { Document } from '../lib/types';
import {
  FileText, ArrowLeft, Download, Eye, Edit3, History,
  FileSearch, Link as LinkIcon, Tag, Calendar,
  AlertCircle, Clock, FileImage, Shield,
  ChevronRight, ExternalLink, Hash, Layers,
  ScanText, Copy, CheckCheck, RefreshCw,
  FileCode, ZoomIn, ZoomOut, Maximize2,
} from 'lucide-react';

const statusVariant = (s: string) => {
  if (['Approved', 'APPROVED', 'ACTIVE'].includes(s)) return 'success' as const;
  if (['In Review', 'UNDER_REVIEW', 'Draft', 'DRAFT'].includes(s)) return 'warning' as const;
  if (['Obsolete', 'OBSOLETE'].includes(s)) return 'danger' as const;
  return 'default' as const;
};

const ocrVariant = (s: string) => {
  if (s === 'Completed' || s === 'COMPLETED') return 'success' as const;
  if (s === 'Processing' || s === 'PROCESSING') return 'processing' as const;
  if (s === 'Failed' || s === 'FAILED') return 'danger' as const;
  return 'default' as const;
};

function OcrTextViewer({ text, query }: { text: string; query: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!text) return (
    <div className="text-center py-8 text-slate-500">
      <ScanText className="w-8 h-8 mx-auto mb-2 opacity-30" />
      <p className="text-sm">No OCR text available for this document.</p>
    </div>
  );

  const renderText = () => {
    if (!query.trim()) return <span>{text}</span>;
    const q = query.trim().toLowerCase();
    const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === q ? (
            <mark key={i} className="bg-teal-500/25 text-teal-200 rounded-sm px-0.5">{part}</mark>
          ) : part
        )}
      </>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{text.split(' ').length} words extracted</p>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 text-xs transition-colors border border-slate-700/40"
        >
          {copied ? <CheckCheck className="w-3 h-3 text-teal-400" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy Text'}
        </button>
      </div>
      <div className="relative">
        <pre className="text-xs text-slate-300 bg-slate-900/60 border border-slate-700/40 rounded-xl p-4 leading-relaxed overflow-auto max-h-64 whitespace-pre-wrap font-mono">
          {renderText()}
        </pre>
      </div>
    </div>
  );
}

interface RelatedDocProps {
  plNumber: string;
  currentDocId: string;
  onNavigate: (id: string) => void;
}

function RelatedDocsPanel({ plNumber, currentDocId, onNavigate }: RelatedDocProps) {
  const related = MOCK_DOCUMENTS.filter(d =>
    d.linkedPL === plNumber && d.id !== currentDocId
  );

  if (related.length === 0) return (
    <p className="text-xs text-slate-500">No other documents linked to this PL.</p>
  );

  return (
    <div className="space-y-2">
      {related.map(d => (
        <button
          key={d.id}
          onClick={() => onNavigate(d.id)}
          className="w-full flex items-center gap-2 p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800/60 text-left transition-colors group"
        >
          <FileText className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-300 truncate">{d.name}</p>
            <p className="text-[10px] text-slate-600 font-mono">{d.id} · Rev {d.revision}</p>
          </div>
          <ChevronRight className="w-3 h-3 text-slate-700 group-hover:text-teal-400 flex-shrink-0 transition-colors" />
        </button>
      ))}
    </div>
  );
}

export default function DocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const mockDoc = MOCK_DOCUMENTS.find(d => d.id === id);
  const ocrJob = MOCK_OCR_JOBS.find(j => j.document === id);
  const [richDoc, setRichDoc] = useState<Document | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'preview' | 'ocr' | 'history'>('overview');
  const [ocrSearch, setOcrSearch] = useState('');

  useEffect(() => {
    if (id) {
      DocumentService.getById(id).then(doc => setRichDoc(doc));
    }
  }, [id]);

  if (!mockDoc) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <GlassCard className="p-12 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Document Not Found</h2>
          <p className="text-slate-400 text-sm mb-4">No document with ID <span className="font-mono text-teal-400">{id}</span> exists.</p>
          <Button onClick={() => navigate('/documents')}>
            <ArrowLeft className="w-4 h-4" /> Back to Document Hub
          </Button>
        </GlassCard>
      </div>
    );
  }

  const doc = mockDoc;
  const ocrConfidence = (doc as Record<string, unknown>).ocrConfidence as number | null;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'preview', label: 'Preview', icon: Eye },
    { id: 'ocr', label: 'OCR Data', icon: FileSearch },
    { id: 'history', label: 'History', icon: History },
  ] as const;

  const linkedPL = (doc as Record<string, unknown>).linkedPL as string;
  const hasLinkedPL = linkedPL && linkedPL !== 'N/A';

  const extractedRefs = richDoc?.extractedReferences ?? [];
  const ocrText = richDoc?.ocrText;

  const MOCK_REFS_BY_DOC: Record<string, string[]> = {
    'DOC-2026-9021': [
      'PL 55092 — Turbine Housing Unit',
      'IEC 60364-5-52 — Electrical Installations',
      'SRBB-25 — Wiring Harness Spec',
      'D38999/26WE35PN — MIL-SPEC Connector',
      '38100000-MNT-004 — Maintenance Procedure',
    ],
    'DOC-2026-9022': [
      'PL 55092 — Turbine Housing Unit',
      'IS 12166 — Thermal Insulation Testing',
      'IEC 60076-2 — Temperature Rise',
      'DWG-TH-001 to DWG-TH-015',
    ],
    'DOC-2026-1101': [
      'PL 38110000 — Bogie Frame Assembly',
      'UIC 515-4 — Bogie Frame Loads',
      'IS 2062 Grade E350 — Structural Steel',
      'EN 13749 — Fatigue Analysis',
      'CLW-2025-STRUT-009 — Physical Test Data',
    ],
  };
  const resolvedRefs = MOCK_REFS_BY_DOC[doc.id] ?? extractedRefs;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/documents')}
          className="flex items-center gap-2 text-slate-500 hover:text-teal-300 text-sm mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Document Hub
        </button>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <FileText className="w-6 h-6 text-teal-400 flex-shrink-0" />
              <h1 className="text-2xl font-bold text-white">{doc.name}</h1>
              <Badge variant={statusVariant(doc.status)}>{doc.status}</Badge>
            </div>
            <p className="text-slate-400 text-sm font-mono pl-9">{doc.id} · Rev {doc.revision} · {(doc as Record<string, unknown>).type as string}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary"><Download className="w-4 h-4" /> Download</Button>
            <Button variant="secondary"><Edit3 className="w-4 h-4" /> Edit</Button>
            <Button><Eye className="w-4 h-4" /> Full View</Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-700/50 overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px flex-shrink-0 ${
                activeTab === tab.id
                  ? 'border-teal-500 text-teal-300'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.id === 'ocr' && ocrText && (
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
              )}
            </button>
          );
        })}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <GlassCard className="p-6">
              <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <FileCode className="w-4 h-4 text-teal-400" /> Document Properties
              </h2>
              <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                {[
                  { label: 'Document ID', value: doc.id, mono: true },
                  { label: 'Revision', value: doc.revision, mono: true },
                  { label: 'File Type', value: (doc as Record<string, unknown>).type as string },
                  { label: 'File Size', value: (doc as Record<string, unknown>).size as string },
                  { label: 'Author', value: (doc as Record<string, unknown>).author as string },
                  { label: 'Owner', value: (doc as Record<string, unknown>).owner as string },
                  { label: 'Category', value: (doc as Record<string, unknown>).category as string },
                  { label: 'Last Updated', value: doc.date },
                  { label: 'Pages', value: String((doc as Record<string, unknown>).pages) },
                  { label: 'Lifecycle', value: (doc as Record<string, unknown>).lifecycle as string },
                ].map(field => (
                  <div key={field.label}>
                    <p className="text-xs text-slate-500 mb-0.5">{field.label}</p>
                    <p className={`text-sm font-medium text-slate-200 ${field.mono ? 'font-mono text-teal-300' : ''}`}>{field.value}</p>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Tag className="w-4 h-4 text-teal-400" /> Tags
              </h2>
              <div className="flex flex-wrap gap-2">
                {(doc.tags ?? []).map((tag: string) => (
                  <span key={tag} className="px-3 py-1 bg-slate-800/50 border border-slate-700/50 text-slate-300 text-sm rounded-full flex items-center gap-1.5">
                    <Tag className="w-3 h-3 text-teal-400" />{tag}
                  </span>
                ))}
                {(!doc.tags || doc.tags.length === 0) && (
                  <p className="text-sm text-slate-500">No tags assigned.</p>
                )}
              </div>
            </GlassCard>
          </div>

          <div className="space-y-4">
            {/* OCR Status */}
            <GlassCard className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileSearch className="w-4 h-4 text-teal-400" />
                <h3 className="text-sm font-bold text-white">OCR Status</h3>
              </div>
              <Badge variant={ocrVariant(doc.ocrStatus)} className="mb-3">{doc.ocrStatus}</Badge>
              {ocrConfidence !== null && ocrConfidence !== undefined && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Confidence</span>
                    <span className="text-teal-300 font-bold">{ocrConfidence}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${ocrConfidence >= 80 ? 'bg-gradient-to-r from-teal-500 to-emerald-500' : ocrConfidence >= 60 ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-rose-500'}`}
                      style={{ width: `${ocrConfidence}%` }}
                    />
                  </div>
                </div>
              )}
              {ocrJob?.failureReason && (
                <div className="mt-3 p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                  <p className="text-xs text-rose-300">{ocrJob.failureReason}</p>
                </div>
              )}
              {ocrText && (
                <button
                  onClick={() => setActiveTab('ocr')}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 text-xs border border-teal-500/20 transition-colors"
                >
                  <ScanText className="w-3.5 h-3.5" /> View OCR Text
                </button>
              )}
            </GlassCard>

            {/* Linked PL */}
            <GlassCard className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <LinkIcon className="w-4 h-4 text-teal-400" />
                <h3 className="text-sm font-bold text-white">Linked PL Records</h3>
              </div>
              {hasLinkedPL ? (
                <button
                  onClick={() => navigate(`/pl/${linkedPL.replace('PL-', '')}`)}
                  className="w-full flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-800/60 text-left transition-colors group border border-slate-700/40 hover:border-teal-500/30"
                >
                  <Layers className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-indigo-300">{linkedPL}</p>
                  </div>
                  <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-teal-400 transition-colors" />
                </button>
              ) : (
                <p className="text-xs text-slate-500">No linked PL records.</p>
              )}
            </GlassCard>

            {/* Related Documents */}
            {hasLinkedPL && (
              <GlassCard className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-teal-400" />
                  <h3 className="text-sm font-bold text-white">Related Documents</h3>
                </div>
                <RelatedDocsPanel
                  plNumber={linkedPL}
                  currentDocId={doc.id}
                  onNavigate={id => navigate(`/documents/${id}`)}
                />
              </GlassCard>
            )}
          </div>
        </div>
      )}

      {activeTab === 'preview' && (
        <GlassCard className="p-0 overflow-hidden">
          {/* Viewer toolbar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-900/40">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">{doc.name}</span>
              <Badge variant={statusVariant(doc.status)} className="text-[10px]">{doc.status}</Badge>
            </div>
            <div className="flex items-center gap-1">
              <button className="w-7 h-7 rounded-lg bg-slate-800/60 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors">
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs text-slate-500 px-2">100%</span>
              <button className="w-7 h-7 rounded-lg bg-slate-800/60 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors">
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button className="w-7 h-7 rounded-lg bg-slate-800/60 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors ml-1">
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="p-12 text-center bg-slate-950/30">
            <div className="w-24 h-32 rounded-2xl bg-slate-800/60 border-2 border-dashed border-slate-700/60 flex flex-col items-center justify-center mx-auto mb-4 gap-2">
              <FileImage className="w-8 h-8 text-teal-400/50" />
              <span className="text-[9px] text-slate-600 uppercase tracking-widest">{(doc as Record<string, unknown>).type as string}</span>
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Document Preview</h2>
            <p className="text-slate-400 text-sm mb-2 max-w-md mx-auto">
              Preview is not available for this file type in demo mode.
            </p>
            <p className="text-xs text-slate-600 mb-6 max-w-sm mx-auto">
              In production, documents render in an embedded viewer with pan, zoom, and annotation support.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="secondary"><Download className="w-4 h-4" /> Download Original</Button>
              <Button><Eye className="w-4 h-4" /> Open in Full Viewer</Button>
            </div>
          </div>
        </GlassCard>
      )}

      {activeTab === 'ocr' && (
        <div className="space-y-4">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ScanText className="w-4 h-4 text-teal-400" /> OCR Extraction Results
              </h2>
              {doc.ocrStatus !== 'Completed' && (
                <Button variant="secondary" size="sm">
                  <RefreshCw className="w-3.5 h-3.5" /> Retry OCR
                </Button>
              )}
            </div>

            {ocrJob ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Job ID', value: ocrJob.id },
                  { label: 'Status', value: ocrJob.status },
                  { label: 'Pages Processed', value: String(ocrJob.pages) },
                  { label: 'References Extracted', value: String(ocrJob.extractedRefs) },
                ].map(f => (
                  <div key={f.label} className="bg-slate-800/30 rounded-xl p-3">
                    <p className="text-xs text-slate-500 mb-1">{f.label}</p>
                    <p className="text-sm font-medium text-slate-200 font-mono">{f.value}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {ocrJob?.failureReason && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-rose-300">Processing Failed</p>
                    <p className="text-xs text-rose-400 mt-1">{ocrJob.failureReason}</p>
                  </div>
                </div>
              </div>
            )}

            {/* OCR Full Text */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-slate-500" /> Extracted Text
                </h3>
                <div className="relative">
                  <input
                    value={ocrSearch}
                    onChange={e => setOcrSearch(e.target.value)}
                    placeholder="Highlight in text..."
                    className="text-xs bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-1.5 text-slate-300 placeholder-slate-600 outline-none focus:border-teal-500/40 w-40"
                  />
                </div>
              </div>
              <OcrTextViewer text={ocrText ?? ''} query={ocrSearch} />
            </div>
          </GlassCard>

          {/* Extracted References */}
          {resolvedRefs.length > 0 && (
            <GlassCard className="p-6">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Hash className="w-4 h-4 text-teal-400" /> Detected References
                <span className="text-xs text-slate-600 font-normal font-mono">({resolvedRefs.length})</span>
              </h3>
              <div className="space-y-2">
                {resolvedRefs.map((ref, i) => {
                  const isPlRef = /^\d{8}/.test(ref) || ref.includes('PL ') || ref.includes('PL-');
                  const isDocRef = ref.startsWith('DWG-') || ref.startsWith('DOC-');
                  return (
                    <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-800/30 border border-slate-700/30 group">
                      <Hash className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
                      <span className="text-xs text-slate-300 flex-1">{ref}</span>
                      {isPlRef && (
                        <button
                          onClick={() => {
                            const match = ref.match(/(\d{8})/);
                            if (match) navigate(`/pl/${match[1]}`);
                          }}
                          className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] text-teal-400 hover:text-teal-300 transition-all"
                        >
                          <ExternalLink className="w-3 h-3" /> View PL
                        </button>
                      )}
                      {isDocRef && (
                        <button
                          onClick={() => {
                            const match = ref.match(/(DOC-[\d-]+)/);
                            if (match) navigate(`/documents/${match[1]}`);
                          }}
                          className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-all"
                        >
                          <ExternalLink className="w-3 h-3" /> View Doc
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <GlassCard className="p-6">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-400" /> Version & Change History
          </h2>
          <div className="space-y-4">
            {[
              { rev: doc.revision, action: 'Current Revision', user: (doc as Record<string, unknown>).author as string, date: doc.date, note: 'Active version — all edits tracked in audit log.', current: true },
              { rev: 'B.0', action: 'Revision Released', user: 'S. Patel', date: '2026-01-15', note: 'Updated thermal limits to match IEC 60076-2 standard. Reviewed by DyCE/Design.', current: false },
              { rev: 'A.4', action: 'Document Created', user: 'J. Halloway', date: '2025-08-20', note: 'Initial document upload and OCR processing completed.', current: false },
            ].map((h, i, arr) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono border ${h.current ? 'bg-teal-500/20 border-teal-500/50 text-teal-300' : 'bg-slate-800 border-slate-700/50 text-slate-500'}`}>
                    {h.rev}
                  </div>
                  {i < arr.length - 1 && <div className="w-px flex-1 bg-slate-700/50 mt-2" />}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-sm font-semibold text-slate-200">{h.action}</span>
                    {h.current && <Badge variant="success">Current</Badge>}
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Shield className="w-3 h-3" /> {h.user}
                    <Calendar className="w-3 h-3 ml-1" /> {h.date}
                  </p>
                  <p className="text-sm text-slate-400 mt-1">{h.note}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
