import { useState, useMemo, useRef } from 'react';
import { GlassCard, Badge, Button, Input } from '../components/ui/Shared';
import { MOCK_DOCUMENTS } from '../lib/mock';
import { useAuth } from '../lib/auth';
import {
  Filter, Download, Plus, LayoutGrid, List, FileText, CheckCircle, Clock,
  XCircle, FileSearch, Search, Sparkles, SortAsc, SortDesc, X, Loader2,
  Upload, AlertTriangle, Shield, Hash, Calendar, User, Tag, Eye,
  Fingerprint, Trash2, RefreshCw, ChevronDown, FolderOpen, ArrowRight,
  FileImage, BarChart3, Zap, ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router';

// Extended documents for richer search
const ALL_DOCUMENTS = [
  ...MOCK_DOCUMENTS,
  {
    id: 'DOC-2026-1101', name: 'Bogie Frame Stress Analysis Report', type: 'PDF', size: '34.2 MB',
    revision: 'C.0', status: 'Approved', author: 'D. Mukherjee', owner: 'Bogie Design Division',
    date: '2025-06-10', linkedPL: 'PL-38110000', ocrStatus: 'Completed', ocrConfidence: 96,
    category: 'Test Report', lifecycle: 'Active', pages: 48, tags: ['Structural', 'FEA', 'Safety Vital'],
  },
  {
    id: 'DOC-2026-1201', name: 'Brake System Type Test Report', type: 'PDF', size: '42.1 MB',
    revision: 'B.2', status: 'Approved', author: 'S. Patel', owner: 'Brake Systems Division',
    date: '2025-04-18', linkedPL: 'PL-38111000', ocrStatus: 'Completed', ocrConfidence: 94,
    category: 'Test Report', lifecycle: 'Active', pages: 86, tags: ['Safety Vital', 'Brake', 'Type Test'],
  },
  {
    id: 'DOC-2026-2001', name: 'Traction Motor Type Test Report', type: 'PDF', size: '28.4 MB',
    revision: 'B.0', status: 'Approved', author: 'A. Sharma', owner: 'Electrical Design Division',
    date: '2025-04-10', linkedPL: 'PL-38120000', ocrStatus: 'Completed', ocrConfidence: 97,
    category: 'Test Report', lifecycle: 'Active', pages: 124, tags: ['Electrical', 'Traction Motor'],
  },
  {
    id: 'DOC-2026-3001', name: 'Transformer Routine Test Certificate', type: 'PDF', size: '15.6 MB',
    revision: 'C.0', status: 'Approved', author: 'P. Gupta', owner: 'Transformer Division',
    date: '2025-10-28', linkedPL: 'PL-38130000', ocrStatus: 'Completed', ocrConfidence: 99,
    category: 'Certificate', lifecycle: 'Active', pages: 22, tags: ['Electrical', 'Transformer'],
  },
  {
    id: 'DOC-2026-5001', name: 'Pantograph Type Test Report', type: 'PDF', size: '18.2 MB',
    revision: 'A.5', status: 'Approved', author: 'M. Reddy', owner: 'Current Collection Division',
    date: '2025-05-20', linkedPL: 'PL-38150000', ocrStatus: 'Completed', ocrConfidence: 91,
    category: 'Test Report', lifecycle: 'Active', pages: 56, tags: ['High Voltage', 'Pantograph'],
  },
  {
    id: 'DOC-2026-4001', name: 'Control System Architecture Specification', type: 'PDF', size: '22.1 MB',
    revision: 'B.3', status: 'Approved', author: 'K. Joshi', owner: 'Electronics Division',
    date: '2025-12-05', linkedPL: 'PL-38140000', ocrStatus: 'Completed', ocrConfidence: 93,
    category: 'Specification', lifecycle: 'Active', pages: 95, tags: ['Electronics', 'Control'],
  },
];

// Mock dedup results
const DEDUP_RESULTS = [
  { id: 'DUP-001', doc1: 'DOC-2026-9021', doc2: 'DOC-2025-1104', similarity: 34, method: 'Metadata', status: 'Dismissed' },
  { id: 'DUP-002', doc1: 'DOC-2026-9022', doc2: 'DOC-2026-3001', similarity: 22, method: 'Content Hash', status: 'Dismissed' },
  { id: 'DUP-003', doc1: 'DOC-2026-1101', doc2: 'DOC-2026-1201', similarity: 78, method: 'Metadata + Hash', status: 'Pending Review' },
];

type SubPage = 'repository' | 'ingest' | 'dedup';
type SortField = 'date' | 'name' | 'id' | 'status';

function getDocTypeIcon(type: string) {
  if (type === 'PDF') return '📄';
  if (type === 'DOCX') return '📝';
  if (type === 'XLSX') return '📊';
  if (type === 'PNG' || type === 'JPG') return '🖼️';
  return '📎';
}

function getCategoryColor(cat: string) {
  if (cat?.includes('Test')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  if (cat?.includes('Specification')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  if (cat?.includes('Certificate')) return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
  if (cat?.includes('Procedure') || cat?.includes('Calibration')) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  if (cat?.includes('Schema') || cat?.includes('Drawing')) return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
  return 'bg-slate-800 text-slate-400 border-slate-700';
}

export default function Documents() {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const isAdmin = hasPermission(['admin']);

  // Sub-page
  const [subPage, setSubPage] = useState<SubPage>('repository');

  // Search & filter state
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'basic' | 'advanced'>('basic');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showObsolete, setShowObsolete] = useState(false);

  // Ingest state
  const [dragOver, setDragOver] = useState(false);
  const [ingestFiles, setIngestFiles] = useState<{ name: string; size: string; type: string; status: 'pending' | 'uploading' | 'processing' | 'done' | 'error' }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dedup state
  const [dedupRunning, setDedupRunning] = useState(false);
  const [dedupComplete, setDedupComplete] = useState(false);

  const categories = useMemo(() => [...new Set(ALL_DOCUMENTS.map(d => d.category).filter(Boolean))], []);
  const statuses = useMemo(() => [...new Set(ALL_DOCUMENTS.map(d => d.status))], []);
  const types = useMemo(() => [...new Set(ALL_DOCUMENTS.map(d => d.type))], []);

  const results = useMemo(() => {
    let docs = [...ALL_DOCUMENTS];
    if (!showObsolete) docs = docs.filter(d => d.status !== 'Obsolete');

    if (query.trim()) {
      const q = query.toLowerCase();
      docs = docs.filter(d => {
        const basicMatch = d.name.toLowerCase().includes(q) || d.id.toLowerCase().includes(q) ||
          (d.category || '').toLowerCase().includes(q) || d.tags.some(t => t.toLowerCase().includes(q)) ||
          d.author.toLowerCase().includes(q) || (d.linkedPL || '').toLowerCase().includes(q);
        return basicMatch;
      });
    }

    if (statusFilter) docs = docs.filter(d => d.status === statusFilter);
    if (categoryFilter) docs = docs.filter(d => d.category === categoryFilter);
    if (typeFilter) docs = docs.filter(d => d.type === typeFilter);

    docs.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') cmp = a.date.localeCompare(b.date);
      else if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'id') cmp = a.id.localeCompare(b.id);
      else if (sortField === 'status') cmp = a.status.localeCompare(b.status);
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return docs;
  }, [query, searchMode, statusFilter, categoryFilter, typeFilter, sortField, sortDir, showObsolete]);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const files = Array.from(e.dataTransfer.files).map(f => ({
      name: f.name, size: `${(f.size / 1024 / 1024).toFixed(1)} MB`, type: f.name.split('.').pop()?.toUpperCase() || 'FILE',
      status: 'pending' as const,
    }));
    setIngestFiles(prev => [...prev, ...files]);
  };

  const simulateUpload = () => {
    setIngestFiles(prev => prev.map(f => f.status === 'pending' ? { ...f, status: 'uploading' } : f));
    setTimeout(() => {
      setIngestFiles(prev => prev.map(f => f.status === 'uploading' ? { ...f, status: 'processing' } : f));
      setTimeout(() => {
        setIngestFiles(prev => prev.map(f => f.status === 'processing' ? { ...f, status: 'done' } : f));
      }, 1500);
    }, 1200);
  };

  const runDedup = () => {
    setDedupRunning(true); setDedupComplete(false);
    setTimeout(() => { setDedupRunning(false); setDedupComplete(true); }, 3000);
  };

  const activeFilters = [statusFilter, categoryFilter, typeFilter].filter(Boolean).length;

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap shrink-0">
        <div>
          <h1 className="text-3xl text-white mb-1" style={{ fontWeight: 700 }}>Document Hub</h1>
          <p className="text-slate-400 text-sm">Unified document repository — search, ingest, and manage all technical documentation.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary"><Download className="w-4 h-4" /> Export List</Button>
          <Button onClick={() => setSubPage('ingest')}><Plus className="w-4 h-4" /> Ingest Document</Button>
        </div>
      </div>

      {/* Sub-page tabs */}
      <div className="flex items-center gap-1 border-b border-slate-700/30 shrink-0">
        {[
          { id: 'repository' as SubPage, label: 'Repository & Search', icon: FolderOpen, count: ALL_DOCUMENTS.length },
          { id: 'ingest' as SubPage, label: 'Ingest Documents', icon: Upload },
          ...(isAdmin ? [{ id: 'dedup' as SubPage, label: 'Deduplication Engine', icon: Fingerprint }] : []),
        ].map(tab => (
          <button key={tab.id} onClick={() => setSubPage(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 transition-colors
              ${subPage === tab.id ? 'border-teal-400 text-teal-300' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
            style={{ fontWeight: subPage === tab.id ? 600 : 400 }}
            role="tab" aria-selected={subPage === tab.id} aria-controls={`panel-${tab.id}`}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count !== undefined && <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* ═══ REPOSITORY & SEARCH ═══ */}
      {subPage === 'repository' && (
        <div className="flex-1 flex flex-col min-h-0" id="panel-repository" role="tabpanel">
          {/* Search Bar */}
          <GlassCard className="p-4 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center rounded-lg border border-slate-700/50 overflow-hidden">
                <button onClick={() => setSearchMode('basic')} role="tab" aria-selected={searchMode === 'basic'}
                  className={`px-3 py-1.5 text-xs flex items-center gap-1 transition-colors ${searchMode === 'basic' ? 'bg-teal-500/15 text-teal-300' : 'text-slate-500 hover:text-slate-300'}`}>
                  <Search className="w-3.5 h-3.5" /> Basic
                </button>
                <button onClick={() => setSearchMode('advanced')} role="tab" aria-selected={searchMode === 'advanced'}
                  className={`px-3 py-1.5 text-xs flex items-center gap-1 transition-colors ${searchMode === 'advanced' ? 'bg-teal-500/15 text-teal-300' : 'text-slate-500 hover:text-slate-300'}`}>
                  <Sparkles className="w-3.5 h-3.5" /> Advanced (OCR Content)
                </button>
              </div>
              <span className="text-[10px] text-slate-600 hidden lg:block">
                {searchMode === 'basic' ? 'Searches metadata: title, ID, tags, author' : 'Searches inside document content via OCR'}
              </span>
            </div>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-500" />
                <Input value={query} onChange={e => setQuery(e.target.value)}
                  placeholder={searchMode === 'basic' ? 'Search by document ID, title, author, tags, PL number...' : 'Search inside document content — OCR text, references, specs...'}
                  className="pl-11 w-full py-2.5" aria-label="Search documents" />
                {query && <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300" aria-label="Clear search"><X className="w-4 h-4" /></button>}
              </div>
              <Button variant="secondary" onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters} aria-label="Toggle filters">
                <Filter className="w-4 h-4" /> Filters
                {activeFilters > 0 && <span className="w-5 h-5 rounded-full bg-teal-500 text-white text-[9px] flex items-center justify-center">{activeFilters}</span>}
              </Button>
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="mt-3 pt-3 border-t border-slate-700/30 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Status</label>
                  <div className="flex flex-wrap gap-1">{statuses.map(s => (
                    <button key={s} onClick={() => setStatusFilter(statusFilter === s ? null : s)} role="checkbox" aria-checked={statusFilter === s}
                      className={`px-2 py-1 rounded-lg text-[10px] border transition-colors ${statusFilter === s ? 'bg-teal-500/20 border-teal-500/40 text-teal-300' : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-slate-200'}`}>{s}</button>
                  ))}</div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Category</label>
                  <div className="flex flex-wrap gap-1">{categories.map(c => (
                    <button key={c} onClick={() => setCategoryFilter(categoryFilter === c ? null : c)} role="checkbox" aria-checked={categoryFilter === c}
                      className={`px-2 py-1 rounded-lg text-[10px] border transition-colors ${categoryFilter === c ? 'bg-teal-500/20 border-teal-500/40 text-teal-300' : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-slate-200'}`}>{c}</button>
                  ))}</div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">File Type</label>
                  <div className="flex flex-wrap gap-1">{types.map(t => (
                    <button key={t} onClick={() => setTypeFilter(typeFilter === t ? null : t)} role="checkbox" aria-checked={typeFilter === t}
                      className={`px-2 py-1 rounded-lg text-[10px] border transition-colors ${typeFilter === t ? 'bg-teal-500/20 border-teal-500/40 text-teal-300' : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-slate-200'}`}>{t}</button>
                  ))}</div>
                </div>
                <div className="md:col-span-3 flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                    <input type="checkbox" checked={showObsolete} onChange={e => setShowObsolete(e.target.checked)}
                      className="rounded border-slate-600 bg-slate-900 text-teal-500" aria-label="Show obsolete documents" /> Show Obsolete
                  </label>
                  {activeFilters > 0 && (
                    <button onClick={() => { setStatusFilter(null); setCategoryFilter(null); setTypeFilter(null); }}
                      className="text-xs text-teal-400 hover:text-teal-300" aria-label="Clear all filters">Clear All Filters</button>
                  )}
                </div>
              </div>
            )}
          </GlassCard>

          {/* Results toolbar */}
          <div className="flex items-center justify-between my-2 shrink-0">
            <span className="text-sm text-slate-400"><span className="text-white" style={{ fontWeight: 600 }}>{results.length}</span> documents{query ? ` matching "${query}"` : ''}</span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {(['date', 'name', 'id'] as SortField[]).map(f => (
                  <button key={f} onClick={() => { if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortField(f); setSortDir('desc'); } }}
                    aria-label={`Sort by ${f}`}
                    className={`px-2 py-1 rounded text-[10px] transition-colors ${sortField === f ? 'bg-teal-500/15 text-teal-300' : 'text-slate-500 hover:text-slate-300'}`}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                    {sortField === f && (sortDir === 'desc' ? <SortDesc className="w-3 h-3 inline ml-0.5" /> : <SortAsc className="w-3 h-3 inline ml-0.5" />)}
                  </button>
                ))}
              </div>
              <div className="flex items-center rounded-lg border border-slate-700/50 overflow-hidden">
                <button onClick={() => setView('list')} aria-label="List view" aria-pressed={view === 'list'}
                  className={`px-2 py-1.5 transition-colors ${view === 'list' ? 'bg-teal-500/15 text-teal-300' : 'text-slate-500 hover:text-slate-300'}`}><List className="w-3.5 h-3.5" /></button>
                <button onClick={() => setView('grid')} aria-label="Grid view" aria-pressed={view === 'grid'}
                  className={`px-2 py-1.5 transition-colors ${view === 'grid' ? 'bg-teal-500/15 text-teal-300' : 'text-slate-500 hover:text-slate-300'}`}><LayoutGrid className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto">
            {view === 'list' ? (
              <GlassCard className="p-0 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50 text-[10px] text-slate-500 uppercase tracking-wider bg-slate-900/50">
                      <th className="py-2.5 pl-4">Document ID</th>
                      <th className="py-2.5">Name</th>
                      <th className="py-2.5">Category</th>
                      <th className="py-2.5">Rev</th>
                      <th className="py-2.5">Status</th>
                      <th className="py-2.5">OCR</th>
                      <th className="py-2.5">Linked PL</th>
                      <th className="py-2.5 pr-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {results.map(doc => (
                      <tr key={doc.id} onClick={() => navigate(`/documents/${doc.id}`)}
                        className="hover:bg-slate-800/30 transition-colors cursor-pointer group" role="link" tabIndex={0}
                        onKeyDown={e => e.key === 'Enter' && navigate(`/documents/${doc.id}`)}>
                        <td className="py-3 pl-4 font-mono text-teal-400 text-xs group-hover:text-teal-300">{doc.id}</td>
                        <td className="py-3 text-xs text-slate-200">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{getDocTypeIcon(doc.type)}</span>
                            <span className="truncate max-w-[250px]">{doc.name}</span>
                          </div>
                        </td>
                        <td className="py-3"><span className={`text-[9px] px-2 py-0.5 rounded-full border ${getCategoryColor(doc.category)}`}>{doc.category}</span></td>
                        <td className="py-3 text-xs text-slate-500">{doc.revision}</td>
                        <td className="py-3">
                          <Badge variant={doc.status === 'Approved' ? 'success' : doc.status === 'In Review' ? 'warning' : doc.status === 'Obsolete' ? 'danger' : 'default'} className="text-[9px]">{doc.status}</Badge>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1 text-[10px]">
                            {doc.ocrStatus === 'Completed' && <CheckCircle className="w-3 h-3 text-teal-500" />}
                            {doc.ocrStatus === 'Processing' && <Clock className="w-3 h-3 text-blue-400" />}
                            {doc.ocrStatus === 'Failed' && <XCircle className="w-3 h-3 text-rose-500" />}
                            {doc.ocrStatus === 'Not Required' && <span className="w-3 h-3 inline-block rounded-full bg-slate-600" />}
                            <span className="text-slate-500">{doc.ocrConfidence ? `${doc.ocrConfidence}%` : '—'}</span>
                          </div>
                        </td>
                        <td className="py-3">
                          {doc.linkedPL !== 'N/A' ? <span className="text-teal-400 text-xs font-mono">{doc.linkedPL}</span> : <span className="text-slate-700 text-xs">—</span>}
                        </td>
                        <td className="py-3 pr-4 text-xs text-slate-600">{doc.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </GlassCard>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {results.map(doc => (
                  <GlassCard key={doc.id} className="p-4 hover:border-teal-500/40 cursor-pointer transition-all group flex flex-col"
                    onClick={() => navigate(`/documents/${doc.id}`)} role="link" tabIndex={0}
                    onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && navigate(`/documents/${doc.id}`)}>
                    <div className="w-full h-28 rounded-lg bg-slate-800/50 border border-slate-700/30 flex flex-col items-center justify-center mb-3 group-hover:border-teal-500/30 transition-colors">
                      <span className="text-3xl mb-1">{getDocTypeIcon(doc.type)}</span>
                      <span className="text-[9px] text-slate-500">{doc.type} · {doc.pages}p</span>
                    </div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <code className="text-[9px] text-teal-400 font-mono">{doc.id}</code>
                      <Badge variant={doc.status === 'Approved' ? 'success' : doc.status === 'In Review' ? 'warning' : 'default'} className="text-[8px] px-1">{doc.status}</Badge>
                    </div>
                    <h4 className="text-xs text-slate-200 group-hover:text-teal-300 transition-colors mb-1 line-clamp-2 flex-1" style={{ fontWeight: 500 }}>{doc.name}</h4>
                    <div className="flex items-center gap-2 text-[9px] text-slate-600 mt-auto">
                      <span>Rev {doc.revision}</span>
                      <span>{doc.date}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {doc.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="text-[7px] px-1.5 py-0.5 rounded-full border bg-slate-800 text-slate-400 border-slate-700">{tag}</span>
                      ))}
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ INGEST DOCUMENTS ═══ */}
      {subPage === 'ingest' && (
        <div className="flex-1 flex flex-col gap-4 min-h-0" id="panel-ingest" role="tabpanel">
          <GlassCard className="p-6">
            <h2 className="text-lg text-white mb-1" style={{ fontWeight: 600 }}>Document Ingestion</h2>
            <p className="text-sm text-slate-400 mb-6">Upload documents for OCR processing, metadata extraction, and repository indexing.</p>

            {/* Drop zone */}
            <div className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${dragOver ? 'border-teal-400 bg-teal-500/10' : 'border-slate-700/50 hover:border-slate-600'}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              role="button" tabIndex={0} aria-label="Drop files here or click to browse">
              <Upload className="w-12 h-12 mx-auto mb-4 text-slate-600" />
              <p className="text-slate-400 mb-2">Drag & drop files here, or</p>
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                <FolderOpen className="w-4 h-4" /> Browse Files
              </Button>
              <input ref={fileInputRef} type="file" multiple className="hidden"
                onChange={e => {
                  if (e.target.files) {
                    const files = Array.from(e.target.files).map(f => ({
                      name: f.name, size: `${(f.size / 1024 / 1024).toFixed(1)} MB`, type: f.name.split('.').pop()?.toUpperCase() || 'FILE', status: 'pending' as const,
                    }));
                    setIngestFiles(prev => [...prev, ...files]);
                  }
                }} />
              <p className="text-[10px] text-slate-600 mt-4">Supported: PDF, DOCX, XLSX, PNG, JPG, DWG, TIFF — Max 200 MB per file</p>
            </div>
          </GlassCard>

          {/* File queue */}
          {ingestFiles.length > 0 && (
            <GlassCard className="p-4 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm text-white" style={{ fontWeight: 600 }}>Upload Queue ({ingestFiles.length} files)</h3>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setIngestFiles([])} aria-label="Clear queue"><Trash2 className="w-4 h-4" /> Clear</Button>
                  <Button onClick={simulateUpload} disabled={ingestFiles.every(f => f.status !== 'pending')}>
                    <Upload className="w-4 h-4" /> Start Ingestion
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {ingestFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-slate-700/30 bg-slate-800/20">
                    <span className="text-lg">{getDocTypeIcon(f.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-200 truncate">{f.name}</p>
                      <p className="text-[10px] text-slate-500">{f.size} · {f.type}</p>
                    </div>
                    <Badge variant={f.status === 'done' ? 'success' : f.status === 'error' ? 'danger' : f.status === 'uploading' || f.status === 'processing' ? 'processing' : 'default'} className="text-[9px]">
                      {f.status === 'pending' ? 'Pending' : f.status === 'uploading' ? 'Uploading...' : f.status === 'processing' ? 'OCR Processing...' : f.status === 'done' ? 'Ingested' : 'Error'}
                    </Badge>
                    <button onClick={() => setIngestFiles(prev => prev.filter((_, j) => j !== i))} className="p-1 hover:bg-slate-700 rounded text-slate-600" aria-label={`Remove ${f.name}`}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      )}

      {/* ═══ DEDUPLICATION ENGINE (Admin Only) ═══ */}
      {subPage === 'dedup' && isAdmin && (
        <div className="flex-1 flex flex-col gap-4 min-h-0" id="panel-dedup" role="tabpanel">
          <GlassCard className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <Fingerprint className="w-6 h-6 text-teal-400" />
                  <h2 className="text-lg text-white" style={{ fontWeight: 600 }}>Deduplication Engine</h2>
                  <Badge variant="danger" className="text-[9px]"><Shield className="w-3 h-3 mr-1" />Admin Only</Badge>
                </div>
                <p className="text-sm text-slate-400">Detect duplicate documents using metadata matching and content hash fingerprinting.</p>
              </div>
              <Button onClick={runDedup} disabled={dedupRunning}>
                {dedupRunning ? <><Loader2 className="w-4 h-4 animate-spin" /> Running...</> : <><Zap className="w-4 h-4" /> Run Dedup Scan</>}
              </Button>
            </div>

            {/* Method description */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                { title: 'Metadata Match', desc: 'Compares document title, author, date, PL reference, and category fields for similarity.', icon: Tag, color: 'text-blue-400 bg-blue-500/10' },
                { title: 'Content Hash (64KB Sampling)', desc: 'Computes SHA-256 hash on 3 positions: first 64KB, middle 64KB, and last 64KB of file content.', icon: Fingerprint, color: 'text-teal-400 bg-teal-500/10' },
                { title: 'Combined Score', desc: 'Weighted score from both methods. >80% similarity flagged as potential duplicate.', icon: BarChart3, color: 'text-amber-400 bg-amber-500/10' },
              ].map(method => (
                <div key={method.title} className="p-4 rounded-xl border border-slate-700/30 bg-slate-800/20">
                  <div className={`w-8 h-8 rounded-lg ${method.color} flex items-center justify-center mb-3`}>
                    <method.icon className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs text-white mb-1" style={{ fontWeight: 600 }}>{method.title}</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed">{method.desc}</p>
                </div>
              ))}
            </div>

            {/* Hash detail */}
            <div className="p-4 rounded-xl border border-slate-700/30 bg-slate-950/30">
              <h4 className="text-xs text-slate-400 mb-3" style={{ fontWeight: 600 }}>64KB 3-Position Hash Algorithm</h4>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-6 rounded-lg bg-slate-800 border border-slate-700 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-[8%] bg-teal-500/30 border-r border-teal-500/50 flex items-center justify-center text-[7px] text-teal-300">64KB</div>
                  <div className="absolute left-[46%] top-0 bottom-0 w-[8%] bg-teal-500/30 border-x border-teal-500/50 flex items-center justify-center text-[7px] text-teal-300">64KB</div>
                  <div className="absolute right-0 top-0 bottom-0 w-[8%] bg-teal-500/30 border-l border-teal-500/50 flex items-center justify-center text-[7px] text-teal-300">64KB</div>
                  <span className="absolute inset-0 flex items-center justify-center text-[8px] text-slate-600">Document File Content</span>
                </div>
              </div>
              <p className="text-[9px] text-slate-600">Position 1: Bytes 0–65535 | Position 2: Midpoint ±32KB | Position 3: Last 64KB — SHA-256 computed per segment then combined.</p>
            </div>
          </GlassCard>

          {/* Dedup Results */}
          {(dedupRunning || dedupComplete) && (
            <GlassCard className="p-4 flex-1 overflow-y-auto">
              <h3 className="text-sm text-white mb-4" style={{ fontWeight: 600 }}>
                {dedupRunning ? 'Scanning...' : `Scan Complete — ${DEDUP_RESULTS.length} potential matches found`}
              </h3>
              {dedupRunning ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-teal-500 mx-auto mb-4" />
                    <p className="text-sm text-slate-400">Computing hashes across {ALL_DOCUMENTS.length} documents...</p>
                    <p className="text-[10px] text-slate-600 mt-1">Phase: Metadata comparison → Content hashing → Score calculation</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {DEDUP_RESULTS.map(dup => (
                    <div key={dup.id} className={`p-4 rounded-xl border ${dup.similarity >= 70 ? 'border-amber-500/30 bg-amber-500/5' : 'border-slate-700/30 bg-slate-800/20'}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Fingerprint className="w-4 h-4 text-teal-400" />
                          <code className="text-xs text-slate-400">{dup.id}</code>
                          <Badge variant={dup.similarity >= 70 ? 'warning' : 'default'} className="text-[9px]">{dup.similarity}% similar</Badge>
                          <span className="text-[9px] text-slate-500">via {dup.method}</span>
                        </div>
                        <Badge variant={dup.status === 'Pending Review' ? 'warning' : 'default'} className="text-[9px]">{dup.status}</Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => navigate(`/documents/${dup.doc1}`)} className="flex-1 p-2 rounded-lg border border-slate-700/30 bg-slate-800/30 hover:border-teal-500/30 transition-colors text-left">
                          <code className="text-[10px] text-teal-400 font-mono">{dup.doc1}</code>
                          <p className="text-[10px] text-slate-400 mt-0.5">{ALL_DOCUMENTS.find(d => d.id === dup.doc1)?.name || dup.doc1}</p>
                        </button>
                        <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />
                        <button onClick={() => navigate(`/documents/${dup.doc2}`)} className="flex-1 p-2 rounded-lg border border-slate-700/30 bg-slate-800/30 hover:border-teal-500/30 transition-colors text-left">
                          <code className="text-[10px] text-teal-400 font-mono">{dup.doc2}</code>
                          <p className="text-[10px] text-slate-400 mt-0.5">{ALL_DOCUMENTS.find(d => d.id === dup.doc2)?.name || dup.doc2}</p>
                        </button>
                      </div>
                      {dup.status === 'Pending Review' && (
                        <div className="flex gap-2 mt-3 justify-end">
                          <Button variant="ghost" className="text-xs px-3 py-1">Dismiss</Button>
                          <Button variant="secondary" className="text-xs px-3 py-1"><Eye className="w-3 h-3" /> Compare</Button>
                          <Button variant="danger" className="text-xs px-3 py-1"><Trash2 className="w-3 h-3" /> Remove Duplicate</Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          )}
        </div>
      )}
    </div>
  );
}
