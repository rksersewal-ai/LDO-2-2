import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { GlassCard, Badge, Button } from '../components/ui/Shared';
import { MOCK_DOCUMENTS } from '../lib/mock';
import { MOCK_OCR_JOBS } from '../lib/mockExtended';
import { PL_DATABASE } from '../lib/bomData';

type DocRecord = {
  id: string;
  name: string;
  type: string;
  size: string;
  revision: string;
  status: string;
  author: string;
  owner: string;
  date: string;
  linkedPL: string;
  ocrStatus: string;
  ocrConfidence: number | null;
  ocrText?: string;
  category: string;
  lifecycle: string;
  pages: number;
  tags: string[];
};

import {
  FileText, ArrowLeft, Download, Edit3, History,
  FileSearch, Tag, Calendar,
  AlertCircle, Clock, Shield,
  ChevronRight, ChevronLeft, ExternalLink, Hash, Layers,
  ScanText, Copy, CheckCheck, RefreshCw,
  ZoomIn, ZoomOut, RotateCw, Maximize2, X,
  Plus, Paperclip, GitCompare, FileImage,
  ChevronDown, ChevronUp, Link as LinkIcon,
  Info, BookOpen, Users, FileCode, AlertTriangle,
  Send, Check, Loader2,
} from 'lucide-react';

const PANEL_LS_KEY = 'edms_doc_panel_state';

function loadPanelState() {
  try {
    const raw = localStorage.getItem(PANEL_LS_KEY);
    if (raw) return JSON.parse(raw) as { leftOpen: boolean; rightOpen: boolean };
  } catch { /* ignore */ }
  return { leftOpen: true, rightOpen: true };
}

function savePanelState(state: { leftOpen: boolean; rightOpen: boolean }) {
  localStorage.setItem(PANEL_LS_KEY, JSON.stringify(state));
}

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

interface TabDoc {
  id: string;
  name: string;
  doc: DocRecord | null;
}

const PATTERNS = [
  { type: 'pl', regex: /\b\d{8}\b/g, prefix: '/pl/', label: 'PL' },
  { type: 'dwg', regex: /\bDWG-[\w-]+/g, prefix: null, label: 'DWG' },
  { type: 'spec', regex: /\bSPC-[\w-]+/g, prefix: null, label: 'SPC' },
  { type: 'doc', regex: /\bDOC-\d{4}-\d{4}\b/g, prefix: '/documents/', label: 'DOC' },
];

interface OcrRef { text: string; type: string; prefix: string | null; }

function detectRefs(text: string): OcrRef[] {
  const refs: OcrRef[] = [];
  const seen = new Set<string>();
  for (const p of PATTERNS) {
    const matches = text.match(new RegExp(p.regex.source, 'g')) ?? [];
    for (const m of matches) {
      if (!seen.has(m)) { seen.add(m); refs.push({ text: m, type: p.type, prefix: p.prefix }); }
    }
  }
  return refs;
}

function renderOcrWithLinks(text: string, query: string, onNavigate: (path: string) => void): React.ReactNode[] {
  const allPatterns = PATTERNS.map(p => `(${p.regex.source})`).join('|');
  const combined = new RegExp(allPatterns, 'g');
  const parts: React.ReactNode[] = [];
  let lastIndex = 0; let match: RegExpExecArray | null; let key = 0;

  const highlightQuery = (chunk: string) => {
    if (!query) return [chunk];
    const qi = chunk.toLowerCase().indexOf(query.toLowerCase());
    if (qi < 0) return [chunk];
    return [chunk.slice(0, qi), <mark key={`h-${key++}`} className="bg-teal-500/25 text-teal-200 rounded-sm px-0.5">{chunk.slice(qi, qi + query.length)}</mark>, chunk.slice(qi + query.length)];
  };

  while ((match = combined.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index);
    if (before) parts.push(...highlightQuery(before));
    const matched = match[0];
    let path: string | null = null;
    let refColor = 'text-blue-300 hover:text-blue-200 underline decoration-dotted underline-offset-2';
    if (/^\d{8}$/.test(matched)) { path = `/pl/${matched}`; refColor = 'text-indigo-300 hover:text-indigo-200 underline decoration-dotted underline-offset-2'; }
    else if (/^DOC-/.test(matched)) { path = `/documents/${matched}`; refColor = 'text-teal-300 hover:text-teal-200 underline decoration-dotted underline-offset-2'; }
    if (path) {
      parts.push(<button key={key++} onClick={() => onNavigate(path!)} className={`font-mono text-xs ${refColor} transition-colors cursor-pointer`} title={`Navigate to ${matched}`}>{matched}</button>);
    } else {
      parts.push(<span key={key++} className="font-mono text-xs text-amber-300 bg-amber-900/20 px-1 rounded">{matched}</span>);
    }
    lastIndex = match.index + matched.length;
  }
  if (lastIndex < text.length) parts.push(...highlightQuery(text.slice(lastIndex)));
  return parts;
}

function DocumentViewer({ doc, zoom, rotation, currentPage, pageCount }: {
  doc: DocRecord | null; zoom: number; rotation: number; currentPage: number; pageCount: number;
}) {
  const getFileIcon = () => {
    if (!doc) return <FileText className="w-16 h-16 text-slate-600" />;
    const t = doc.type?.toUpperCase();
    if (t === 'PDF') return <FileText className="w-16 h-16 text-rose-400/60" />;
    if (['PNG', 'JPG', 'JPEG', 'SVG'].includes(t)) return <FileImage className="w-16 h-16 text-blue-400/60" />;
    return <FileCode className="w-16 h-16 text-amber-400/60" />;
  };

  return (
    <div
      className="w-full h-full flex items-center justify-center overflow-hidden bg-slate-950/40 rounded-xl"
      style={{ transform: `scale(${zoom}) rotate(${rotation}deg)`, transformOrigin: 'center center', transition: 'transform 0.2s ease' }}
    >
      <div className="flex flex-col items-center justify-center gap-4 p-12 text-center max-w-sm">
        {getFileIcon()}
        {doc ? (
          <>
            <div>
              <p className="text-slate-300 font-semibold text-sm">{doc.name}</p>
              <p className="text-slate-500 text-xs mt-1 font-mono">{doc.id}</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span>{doc.type} · {doc.size}</span>
              <span>Page {currentPage} of {pageCount}</span>
            </div>
            <div className="px-4 py-2 bg-slate-800/60 border border-slate-700/40 rounded-xl text-xs text-slate-400 leading-relaxed">
              Viewer placeholder — in production, renders the actual PDF/image with annotations and OCR overlay.
            </div>
            {doc.ocrStatus === 'Completed' && doc.ocrConfidence && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-900/20 border border-teal-500/20 rounded-lg text-xs text-teal-300">
                <ScanText className="w-3.5 h-3.5" /> OCR {doc.ocrConfidence}% confidence
              </div>
            )}
          </>
        ) : (
          <p className="text-slate-500 text-sm">No document selected</p>
        )}
      </div>
    </div>
  );
}

function PageNavPanel({ pageCount, currentPage, onPageChange }: { pageCount: number; currentPage: number; onPageChange: (p: number) => void }) {
  return (
    <div className="space-y-1.5 custom-scrollbar overflow-y-auto flex-1">
      {Array.from({ length: pageCount }, (_, i) => i + 1).map(p => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all ${
            currentPage === p
              ? 'bg-teal-500/15 border border-teal-500/25 text-teal-300'
              : 'text-slate-400 hover:bg-slate-800/50 border border-transparent'
          }`}
        >
          <div className={`w-full h-16 rounded-lg mb-1.5 flex items-center justify-center ${currentPage === p ? 'bg-teal-900/30' : 'bg-slate-800/40'} border border-white/5`}>
            <FileText className={`w-5 h-5 ${currentPage === p ? 'text-teal-400' : 'text-slate-600'}`} />
          </div>
          <span className="font-medium">Page {p}</span>
        </button>
      ))}
    </div>
  );
}

interface OcrPanelProps { text: string; query: string; onQueryChange: (q: string) => void; onNavigate: (path: string) => void; }

function OcrPanel({ text, query, onQueryChange, onNavigate }: OcrPanelProps) {
  const [copied, setCopied] = useState(false);
  const refs = detectRefs(text);
  return (
    <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
      <div className="relative">
        <FileSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
        <input type="text" value={query} onChange={e => onQueryChange(e.target.value)} placeholder="Search OCR text..."
          className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900/60 border border-slate-700/50 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-500/50" />
      </div>
      {refs.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Detected References ({refs.length})</p>
          <div className="space-y-1">
            {refs.map((r, i) => (
              <button key={i} onClick={() => r.prefix ? onNavigate(r.prefix + r.text) : undefined}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs transition-all border ${
                  r.prefix ? 'bg-teal-900/20 border-teal-500/20 text-teal-300 hover:bg-teal-900/30 cursor-pointer' : 'bg-amber-900/15 border-amber-500/20 text-amber-300 cursor-default'
                }`}
              >
                <Hash className="w-3 h-3 shrink-0" />
                <span className="font-mono flex-1 truncate">{r.text}</span>
                {r.prefix && <ChevronRight className="w-3 h-3 shrink-0 text-teal-500" />}
              </button>
            ))}
          </div>
        </div>
      )}
      {text ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-slate-500">{text.split(' ').length} words</p>
            <button onClick={() => navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 text-[10px] transition-colors border border-slate-700/40">
              {copied ? <CheckCheck className="w-3 h-3 text-teal-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="text-[10px] text-slate-400 bg-slate-900/60 border border-slate-700/40 rounded-xl p-3 leading-relaxed overflow-auto whitespace-pre-wrap font-mono max-h-80">
            {renderOcrWithLinks(text, query, onNavigate)}
          </pre>
        </div>
      ) : (
        <div className="text-center py-6 text-slate-600">
          <ScanText className="w-6 h-6 mx-auto mb-2 opacity-40" />
          <p className="text-xs">No OCR text available</p>
        </div>
      )}
    </div>
  );
}

interface RightPanelProps {
  doc: DocRecord | null;
  ocrJob: typeof MOCK_OCR_JOBS[0] | null;
  ocrStatusOverride?: string;
  onNavigate: (path: string) => void;
  activeSection: string;
  onSectionChange: (s: string) => void;
}

function RightPanel({ doc, ocrJob, ocrStatusOverride, onNavigate, activeSection, onSectionChange }: RightPanelProps) {
  const navigate = useNavigate();

  const plRecord = doc?.linkedPL && doc.linkedPL !== 'N/A'
    ? PL_DATABASE[doc.linkedPL.replace('PL-', '')]
    : null;

  const relatedDocs = MOCK_DOCUMENTS.filter(d =>
    d.id !== doc?.id && (
      (doc?.linkedPL && d.linkedPL === doc.linkedPL) ||
      (doc?.tags && d.tags && d.tags.some((t: string) => doc.tags?.includes(t)))
    )
  ).slice(0, 4);

  const revHistory = [
    { rev: doc?.revision ?? 'A.0', date: doc?.date ?? '—', author: doc?.author ?? '—', note: 'Current revision' },
    { rev: 'B.0', date: '2025-12-01', author: doc?.author ?? '—', note: 'Previous revision' },
    { rev: 'A.0', date: '2025-06-01', author: 'System', note: 'Initial release' },
  ];

  const sections = [
    { id: 'meta', icon: Info, label: 'Metadata' },
    { id: 'tags', icon: Tag, label: 'Tags' },
    { id: 'pl', icon: Layers, label: 'PL Info' },
    { id: 'used', icon: Users, label: 'Used In' },
    { id: 'related', icon: BookOpen, label: 'Related' },
    { id: 'history', icon: History, label: 'Revisions' },
  ];

  const effectiveOcrStatus = ocrStatusOverride ?? ocrJob?.status;

  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-3 gap-1 mb-3 shrink-0">
        {sections.map(s => {
          const Icon = s.icon;
          return (
            <button key={s.id} onClick={() => onSectionChange(s.id)}
              className={`flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                activeSection === s.id
                  ? 'bg-teal-500/15 text-teal-300 border border-teal-500/25'
                  : 'text-slate-500 hover:text-slate-300 border border-transparent hover:bg-slate-800/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />{s.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
        {activeSection === 'meta' && doc && (
          <>
            <div className="space-y-2">
              {([
                { label: 'Document ID', value: doc.id, mono: true },
                { label: 'Category', value: doc.category },
                { label: 'Revision', value: doc.revision, mono: true },
                { label: 'File Type', value: doc.type },
                { label: 'Size', value: doc.size },
                { label: 'Pages', value: String(doc.pages ?? 1) },
                { label: 'Author', value: doc.author },
                { label: 'Owner', value: doc.owner },
                { label: 'Date', value: doc.date },
                { label: 'Lifecycle', value: doc.lifecycle },
              ] as { label: string; value: string; mono?: boolean }[]).map(f => (
                <div key={f.label} className="flex items-start justify-between gap-2 py-1.5 border-b border-white/[0.04]">
                  <span className="text-[10px] text-slate-500 shrink-0 mt-0.5">{f.label}</span>
                  <span className={`text-xs text-slate-200 text-right ${f.mono ? 'font-mono text-teal-400' : ''}`}>{f.value}</span>
                </div>
              ))}
            </div>
            {ocrJob && (
              <div className="glass-card rounded-xl p-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">OCR Status</p>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={ocrVariant(effectiveOcrStatus ?? '')}>{effectiveOcrStatus}</Badge>
                  {ocrJob.confidence && !ocrStatusOverride && (
                    <span className="text-xs text-slate-400">{ocrJob.confidence}% confidence</span>
                  )}
                </div>
                {ocrJob.failureReason && !ocrStatusOverride && (
                  <p className="text-[10px] text-rose-300 bg-rose-900/20 border border-rose-500/20 rounded-lg p-2">{ocrJob.failureReason}</p>
                )}
                {ocrJob.extractedRefs > 0 && !ocrStatusOverride && (
                  <p className="text-[10px] text-slate-500">{ocrJob.extractedRefs} references extracted</p>
                )}
                {ocrStatusOverride && (
                  <p className="text-[10px] text-blue-300 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Re-running OCR…</p>
                )}
              </div>
            )}
          </>
        )}

        {activeSection === 'tags' && doc && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {(doc.tags ?? []).map((tag: string) => (
                <span key={tag} className="px-2.5 py-1 bg-slate-800/60 border border-slate-700/40 rounded-full text-xs text-slate-300">{tag}</span>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Badge variant={statusVariant(doc.status)}>{doc.status}</Badge>
              <Badge variant="default" className="text-slate-400">{doc.lifecycle}</Badge>
            </div>
          </div>
        )}

        {activeSection === 'pl' && (
          <>
            {plRecord ? (
              <div className="space-y-3">
                <div className="glass-card rounded-xl p-3 space-y-2.5">
                  {plRecord.safetyVital && (
                    <div className="flex items-center gap-2 px-2.5 py-1.5 bg-rose-900/20 border border-rose-500/20 rounded-lg">
                      <Shield className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span className="text-xs text-rose-300 font-medium">Safety Vital</span>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] text-slate-500">PL Number</p>
                    <p className="font-mono text-sm font-semibold text-teal-400 flex items-center gap-1">
                      <Hash className="w-3 h-3" />{plRecord.plNumber}
                    </p>
                  </div>
                  {([
                    { label: 'Name', value: plRecord.name },
                    { label: 'Owner', value: plRecord.owner },
                    { label: 'Dept', value: plRecord.department },
                    { label: 'Lifecycle', value: plRecord.lifecycleState },
                    { label: 'Revision', value: plRecord.revision },
                  ] as { label: string; value: string }[]).map(f => (
                    <div key={f.label}>
                      <p className="text-[10px] text-slate-500">{f.label}</p>
                      <p className="text-xs text-slate-200">{f.value}</p>
                    </div>
                  ))}
                </div>
                <button onClick={() => navigate(`/pl/${plRecord.plNumber}`)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs hover:bg-teal-500/15 transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" /> View Full PL Record
                </button>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-600">
                <Layers className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">No PL record linked</p>
                {doc?.linkedPL && doc.linkedPL !== 'N/A' && (
                  <p className="text-[10px] text-slate-600 mt-1 font-mono">{doc.linkedPL}</p>
                )}
              </div>
            )}
          </>
        )}

        {activeSection === 'used' && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">Products Using This Document</p>
            {plRecord?.whereUsed && plRecord.whereUsed.length > 0 ? (
              plRecord.whereUsed.map((w, i) => (
                <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/40 border border-white/5">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-200 font-medium truncate">{w.parentName}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{w.parentPL} · Find #{w.findNumber}</p>
                  </div>
                  <span className="text-[10px] text-slate-500">×{w.quantity}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-600">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">No usage data available</p>
              </div>
            )}
          </div>
        )}

        {activeSection === 'related' && (
          <div className="space-y-2">
            {relatedDocs.length > 0 ? relatedDocs.map(rd => (
              <button key={rd.id} onClick={() => onNavigate(`/documents/${rd.id}`)}
                className="w-full flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/40 border border-white/5 hover:border-teal-500/20 hover:bg-slate-900/60 transition-all text-left">
                <FileText className="w-4 h-4 text-teal-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-200 truncate">{rd.name}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{rd.id}</p>
                </div>
                <Badge variant={statusVariant(rd.status)} className="text-[9px] px-1.5 shrink-0">{rd.status}</Badge>
              </button>
            )) : (
              <div className="text-center py-8 text-slate-600">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">No related documents found</p>
              </div>
            )}
          </div>
        )}

        {activeSection === 'history' && (
          <div className="space-y-2">
            {revHistory.map((r, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${i === 0 ? 'bg-teal-500/30 border border-teal-500/60 text-teal-300' : 'bg-slate-800 border border-slate-700 text-slate-500'}`}>
                    {i === 0 ? '●' : '○'}
                  </div>
                  {i < revHistory.length - 1 && <div className="w-px flex-1 bg-slate-700/40 my-1" />}
                </div>
                <div className="flex-1 pb-3">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-xs text-teal-400 font-semibold">Rev {r.rev}</span>
                    {i === 0 && <span className="text-[10px] px-1.5 py-0.5 bg-teal-500/15 text-teal-400 rounded-full border border-teal-500/25">Current</span>}
                  </div>
                  <p className="text-[10px] text-slate-400 mb-0.5">{r.note}</p>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <Calendar className="w-3 h-3" />{r.date}
                    <span>·</span><span>{r.author}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface EditMetaFormData {
  revision: string;
  status: string;
  linkedPL: string;
  tags: string;
}

function EditMetadataSlideOver({ doc, onClose, onSave }: { doc: DocRecord; onClose: () => void; onSave: (data: EditMetaFormData) => void }) {
  const [form, setForm] = useState<EditMetaFormData>({
    revision: doc.revision,
    status: doc.status,
    linkedPL: doc.linkedPL,
    tags: (doc.tags ?? []).join(', '),
  });

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      {/* Slide-over */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-96 bg-slate-900/98 backdrop-blur-xl border-l border-white/8 shadow-2xl flex flex-col slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
          <div>
            <p className="text-xs text-slate-500 font-mono mb-0.5">{doc.id}</p>
            <h2 className="text-sm font-semibold text-white">Edit Metadata</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Revision</label>
            <input
              value={form.revision}
              onChange={e => setForm(f => ({ ...f, revision: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/60 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 rounded-xl text-sm text-slate-200 font-mono outline-none transition-all"
              placeholder="e.g. C.2"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Status</label>
            <select
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/60 focus:border-teal-500/50 rounded-xl text-sm text-slate-200 outline-none transition-all cursor-pointer"
            >
              {['Draft', 'In Review', 'Approved', 'Obsolete'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Linked PL Number</label>
            <input
              value={form.linkedPL}
              onChange={e => setForm(f => ({ ...f, linkedPL: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/60 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 rounded-xl text-sm text-slate-200 font-mono outline-none transition-all"
              placeholder="e.g. PL-55092"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Tags <span className="text-slate-600">(comma-separated)</span></label>
            <textarea
              value={form.tags}
              onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/60 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 rounded-xl text-sm text-slate-200 outline-none transition-all resize-none"
              placeholder="e.g. Electrical, Schematic, Safety Vital"
            />
            {/* Tag preview */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                <span key={tag} className="px-2 py-0.5 bg-slate-700/60 border border-slate-600/40 rounded-full text-[11px] text-slate-300">{tag}</span>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-xl p-3 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Read-only fields</p>
            {[{ label: 'Document ID', value: doc.id }, { label: 'Author', value: doc.author }, { label: 'Category', value: doc.category }, { label: 'File Type', value: doc.type }].map(f => (
              <div key={f.label} className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">{f.label}</span>
                <span className="text-[11px] text-slate-400 font-mono">{f.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-white/8 shrink-0">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 text-sm border border-slate-700/50 transition-colors">
            Cancel
          </button>
          <button onClick={() => onSave(form)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-sm font-medium shadow-md shadow-teal-900/30 border border-teal-400/20 transition-all">
            <Check className="w-3.5 h-3.5" /> Save Changes
          </button>
        </div>
      </div>
    </>
  );
}

function ApprovalDialog({ doc, onClose, onConfirm }: { doc: DocRecord; onClose: () => void; onConfirm: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[420px] bg-slate-900/98 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
            <Send className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white mb-0.5">Route for Approval</h3>
            <p className="text-xs text-slate-500">This will submit the document for the standard approval workflow.</p>
          </div>
          <button onClick={onClose} className="ml-auto text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="glass-card rounded-xl p-3 mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Document</span>
            <span className="text-[11px] text-teal-400 font-mono">{doc.id}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Current status</span>
            <Badge variant={statusVariant(doc.status)} className="text-[10px]">{doc.status}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Revision</span>
            <span className="text-[11px] text-slate-300 font-mono">{doc.revision}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Approver</span>
            <span className="text-[11px] text-slate-300">Section Head</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/8 border border-amber-500/20 rounded-xl mb-4">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <p className="text-xs text-amber-300">The document status will change to <strong>In Review</strong> once submitted.</p>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 text-sm border border-slate-700/50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-sm font-medium border border-amber-500/30 transition-colors">
            <Send className="w-3.5 h-3.5" /> Submit for Approval
          </button>
        </div>
      </div>
    </>
  );
}

function Toast({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-teal-500/30 shadow-2xl shadow-black/60 text-sm text-slate-200 slide-in-right">
      <CheckCheck className="w-4 h-4 text-teal-400 shrink-0" />
      <span>{msg}</span>
      <button onClick={onDismiss} className="ml-2 text-slate-500 hover:text-slate-300 transition-colors">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [tabs, setTabs] = useState<TabDoc[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [ocrQuery, setOcrQuery] = useState('');
  const [rightSection, setRightSection] = useState('meta');
  const [leftSection, setLeftSection] = useState<'pages' | 'ocr'>('pages');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Collapsible panels with localStorage persistence
  const [leftOpen, setLeftOpen] = useState(() => loadPanelState().leftOpen);
  const [rightOpen, setRightOpen] = useState(() => loadPanelState().rightOpen);

  const toggleLeft = () => setLeftOpen(v => { const next = !v; savePanelState({ leftOpen: next, rightOpen }); return next; });
  const toggleRight = () => setRightOpen(v => { const next = !v; savePanelState({ leftOpen, rightOpen: next }); return next; });

  // Doc metadata overrides (for Edit Metadata)
  const [docOverrides, setDocOverrides] = useState<Map<string, Partial<DocRecord>>>(new Map());
  // OCR status overrides (for Rerun OCR)
  const [ocrOverrides, setOcrOverrides] = useState<Map<string, string>>(new Map());

  // Modals
  const [showEditMeta, setShowEditMeta] = useState(false);
  const [showApproval, setShowApproval] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    if (!id) return;
    const rawDoc = MOCK_DOCUMENTS.find(d => d.id === id);
    if (!rawDoc) return;
    const newTab: TabDoc = { id, name: rawDoc.name, doc: rawDoc as DocRecord };
    setTabs([newTab]);
    setActiveTabId(id);
    setZoom(1); setRotation(0); setCurrentPage(1);
  }, [id]);

  const addTabFromSearch = (docId: string) => {
    if (tabs.find(t => t.id === docId)) { setActiveTabId(docId); return; }
    const rawDoc = MOCK_DOCUMENTS.find(d => d.id === docId);
    if (!rawDoc) return;
    setTabs(prev => [...prev, { id: docId, name: rawDoc.name, doc: rawDoc as DocRecord }]);
    setActiveTabId(docId);
  };

  const closeTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) { navigate('/documents'); return; }
    const idx = tabs.findIndex(t => t.id === tabId);
    const remaining = tabs.filter(t => t.id !== tabId);
    setTabs(remaining);
    if (activeTabId === tabId) setActiveTabId(remaining[Math.max(0, idx - 1)].id);
  };

  const activeTab = tabs.find(t => t.id === activeTabId);
  const baseDoc = activeTab?.doc ?? null;
  const docOverride = docOverrides.get(activeTabId) ?? {};
  const activeDoc: DocRecord | null = baseDoc ? { ...baseDoc, ...docOverride } : null;
  const rawDoc = MOCK_DOCUMENTS.find(d => d.id === activeTabId);
  const ocrJob = MOCK_OCR_JOBS.find(j => j.document === activeTabId) ?? null;
  const ocrText = activeDoc?.ocrText ?? '';
  const pageCount = rawDoc?.pages ?? 1;
  const ocrStatusOverride = ocrOverrides.get(activeTabId);

  const handleDownload = () => showToast(`Downloading "${activeDoc?.name ?? activeTabId}"…`);

  const handleSaveMetadata = (data: EditMetaFormData) => {
    const tags = data.tags.split(',').map(t => t.trim()).filter(Boolean);
    setDocOverrides(prev => {
      const next = new Map(prev);
      next.set(activeTabId, { ...docOverride, revision: data.revision, status: data.status, linkedPL: data.linkedPL, tags });
      return next;
    });
    setShowEditMeta(false);
    showToast('Metadata saved successfully.');
  };

  const handleRouteForApproval = () => {
    setDocOverrides(prev => {
      const next = new Map(prev);
      next.set(activeTabId, { ...docOverride, status: 'In Review' });
      return next;
    });
    setShowApproval(false);
    showToast('Document submitted for approval. Status set to "In Review".');
  };

  const handleRerunOcr = () => {
    setOcrOverrides(prev => { const next = new Map(prev); next.set(activeTabId, 'Processing'); return next; });
    showToast('OCR re-run triggered. Status set to Processing.');
    setTimeout(() => {
      setOcrOverrides(prev => { const next = new Map(prev); next.delete(activeTabId); return next; });
    }, 8000);
  };

  const handleNavigate = (path: string) => {
    if (path.startsWith('/documents/')) {
      addTabFromSearch(path.replace('/documents/', ''));
    } else {
      navigate(path);
    }
  };

  if (tabs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <GlassCard className="p-12 text-center">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="text-slate-300 font-medium">Document not found</p>
          <p className="text-slate-500 text-sm mb-4">The document "{id}" does not exist in this system.</p>
          <Button onClick={() => navigate('/documents')}><ArrowLeft className="w-4 h-4" /> Back to Document Hub</Button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-[calc(100vh-120px)] ${isFullscreen ? 'fixed inset-0 z-50 h-screen bg-slate-950' : ''}`}>
      {toast && <Toast msg={toast} onDismiss={() => setToast(null)} />}
      {showEditMeta && activeDoc && (
        <EditMetadataSlideOver doc={activeDoc} onClose={() => setShowEditMeta(false)} onSave={handleSaveMetadata} />
      )}
      {showApproval && activeDoc && (
        <ApprovalDialog doc={activeDoc} onClose={() => setShowApproval(false)} onConfirm={handleRouteForApproval} />
      )}

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-1 pb-1 border-b border-white/5 shrink-0 overflow-x-auto">
        <button onClick={() => navigate('/documents')}
          className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 text-slate-500 hover:text-teal-400 transition-colors text-xs rounded-lg hover:bg-slate-800/40 mr-1">
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        {tabs.map(tab => (
          <div key={tab.id} onClick={() => setActiveTabId(tab.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-t-xl cursor-pointer text-xs font-medium whitespace-nowrap transition-all group border-b-2 ${
              activeTabId === tab.id
                ? 'bg-slate-800/60 text-teal-300 border-teal-500'
                : 'bg-slate-900/40 text-slate-500 hover:text-slate-300 border-transparent hover:bg-slate-800/30'
            }`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="max-w-[160px] truncate">{tab.name}</span>
            <button onClick={(e) => closeTab(tab.id, e)}
              className="ml-1 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-rose-500/20 hover:text-rose-400 transition-all text-slate-600">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <button
          onClick={() => { const all = MOCK_DOCUMENTS.filter(d => !tabs.find(t => t.id === d.id)); if (all.length > 0) addTabFromSearch(all[0].id); }}
          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-slate-600 hover:text-teal-400 transition-colors text-xs rounded-lg hover:bg-slate-800/40 border border-dashed border-slate-700/40 hover:border-teal-500/30 ml-1">
          <Plus className="w-3.5 h-3.5" /> Open
        </button>

        {/* Action bar — right side of tab strip */}
        <div className="ml-auto flex items-center gap-1 shrink-0 pl-4 border-l border-white/5">
          <button onClick={handleDownload}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700/60 text-slate-300 text-xs border border-slate-700/40 hover:border-teal-500/30 transition-all">
            <Download className="w-3.5 h-3.5 text-teal-400" /> Download
          </button>
          <button onClick={() => setShowEditMeta(true)} disabled={!activeDoc}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700/60 text-slate-300 text-xs border border-slate-700/40 hover:border-indigo-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            <Edit3 className="w-3.5 h-3.5 text-indigo-400" /> Edit Metadata
          </button>
          <button onClick={() => setShowApproval(true)} disabled={!activeDoc}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700/60 text-slate-300 text-xs border border-slate-700/40 hover:border-amber-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            <Send className="w-3.5 h-3.5 text-amber-400" /> Route for Approval
          </button>
          <button onClick={handleRerunOcr} disabled={!activeDoc || !!ocrStatusOverride}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700/60 text-slate-300 text-xs border border-slate-700/40 hover:border-blue-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            {ocrStatusOverride
              ? <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
              : <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
            }
            {ocrStatusOverride ? 'Running…' : 'Rerun OCR'}
          </button>
          <button onClick={() => setIsFullscreen(f => !f)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-teal-400 hover:bg-slate-800/60 transition-all" title="Toggle fullscreen">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main 3-panel layout */}
      <div className="flex-1 flex gap-2 p-2 min-h-0">

        {/* LEFT PANEL */}
        <div className={`flex flex-col glass-card rounded-xl p-2 shrink-0 transition-all duration-200 ${leftOpen ? 'w-44' : 'w-8'}`}>
          {leftOpen ? (
            <>
              <div className="flex items-center gap-1 mb-2 shrink-0">
                <button onClick={() => setLeftSection('pages')}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-medium transition-all ${leftSection === 'pages' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/25' : 'text-slate-500 hover:text-slate-300'}`}>
                  Pages
                </button>
                <button onClick={() => setLeftSection('ocr')}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-medium transition-all ${leftSection === 'ocr' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/25' : 'text-slate-500 hover:text-slate-300'}`}>
                  OCR
                </button>
                <button onClick={toggleLeft} className="p-1 text-slate-600 hover:text-slate-300 transition-colors" title="Collapse left panel">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
              {leftSection === 'pages' ? (
                <PageNavPanel pageCount={pageCount} currentPage={currentPage} onPageChange={setCurrentPage} />
              ) : (
                <OcrPanel text={ocrText} query={ocrQuery} onQueryChange={setOcrQuery} onNavigate={handleNavigate} />
              )}
            </>
          ) : (
            <button onClick={toggleLeft} className="flex-1 flex items-center justify-center text-slate-600 hover:text-teal-400 transition-colors" title="Expand left panel">
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* CENTER VIEWER */}
        <div className="flex-1 flex flex-col glass-card rounded-xl overflow-hidden min-w-0">
          {/* Viewer toolbar */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 shrink-0 gap-2">
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}
                className="p-1.5 rounded-lg text-slate-400 hover:text-teal-400 hover:bg-slate-800/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-400 px-1 font-mono">{currentPage} / {pageCount}</span>
              <button onClick={() => setCurrentPage(p => Math.min(pageCount, p + 1))} disabled={currentPage >= pageCount}
                className="p-1.5 rounded-lg text-slate-400 hover:text-teal-400 hover:bg-slate-800/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-1">
              {activeDoc && (
                <div className="flex items-center gap-2 mr-2">
                  <Badge variant={statusVariant(activeDoc.status)} className="text-[10px]">{activeDoc.status}</Badge>
                  <span className="text-[10px] text-slate-500 font-mono">Rev {activeDoc.revision}</span>
                </div>
              )}
              <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="p-1.5 rounded-lg text-slate-400 hover:text-teal-400 hover:bg-slate-800/60 transition-all" title="Zoom Out">
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-400 w-12 text-center font-mono">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="p-1.5 rounded-lg text-slate-400 hover:text-teal-400 hover:bg-slate-800/60 transition-all" title="Zoom In">
                <ZoomIn className="w-4 h-4" />
              </button>
              <button onClick={() => setZoom(1)} className="px-2 py-1 rounded-lg text-slate-500 hover:text-slate-300 text-[10px] hover:bg-slate-800/60 transition-all border border-slate-700/40">
                Fit
              </button>
              <button onClick={() => setRotation(r => (r + 90) % 360)} className="p-1.5 rounded-lg text-slate-400 hover:text-teal-400 hover:bg-slate-800/60 transition-all" title="Rotate">
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Document area */}
          <div className="flex-1 overflow-hidden p-4">
            <DocumentViewer doc={activeDoc} zoom={zoom} rotation={rotation} currentPage={currentPage} pageCount={pageCount} />
          </div>

          {/* Bottom toolbar */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-t border-white/5 shrink-0">
            <button onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700/60 text-slate-300 text-xs border border-slate-700/40 hover:border-teal-500/20 transition-all">
              <Download className="w-3.5 h-3.5 text-teal-400" /> Download
            </button>
            <button onClick={handleRerunOcr} disabled={!!ocrStatusOverride}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700/60 text-slate-300 text-xs border border-slate-700/40 hover:border-amber-500/20 transition-all disabled:opacity-40">
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" /> Re-OCR
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700/60 text-slate-300 text-xs border border-slate-700/40 hover:border-blue-500/20 transition-all">
              <GitCompare className="w-3.5 h-3.5 text-blue-400" /> Compare
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700/60 text-slate-300 text-xs border border-slate-700/40 hover:border-indigo-500/20 transition-all">
              <Paperclip className="w-3.5 h-3.5 text-indigo-400" /> Attach
            </button>
            <button onClick={() => setShowEditMeta(true)} disabled={!activeDoc}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700/60 text-slate-300 text-xs border border-slate-700/40 transition-all ml-auto disabled:opacity-40">
              <Edit3 className="w-3.5 h-3.5 text-slate-400" /> Edit Metadata
            </button>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className={`flex flex-col glass-card rounded-xl p-3 shrink-0 transition-all duration-200 ${rightOpen ? 'w-56' : 'w-8'}`}>
          {rightOpen ? (
            <>
              <div className="flex items-center justify-between mb-2 shrink-0">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Info</span>
                <button onClick={toggleRight} className="p-0.5 text-slate-600 hover:text-slate-300 transition-colors" title="Collapse right panel">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <RightPanel
                doc={activeDoc}
                ocrJob={ocrJob}
                ocrStatusOverride={ocrStatusOverride}
                onNavigate={handleNavigate}
                activeSection={rightSection}
                onSectionChange={setRightSection}
              />
            </>
          ) : (
            <button onClick={toggleRight} className="flex-1 flex items-center justify-center text-slate-600 hover:text-teal-400 transition-colors" title="Expand right panel">
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
