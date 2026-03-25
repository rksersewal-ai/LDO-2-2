import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { GlassCard, Badge, Button, Input, FilterPills, PageHeader } from '../components/ui/Shared';
import { MOCK_DOCUMENTS } from '../lib/mock';
import { ExportImportService } from '../services/ExportImportService';
import {
  FileText, Search, Upload, Download, Eye,
  Grid, List, ChevronRight, FileImage, File,
  Plus, SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown,
  ScanText, Link as LinkIcon, CheckSquare, Square, X,
  CheckCheck, Minus, Send, FolderOpen, ToggleLeft, ToggleRight, Columns3,
} from 'lucide-react';

const statusVariant = (s: string) => {
  if (s === 'Approved') return 'success' as const;
  if (s === 'In Review') return 'warning' as const;
  if (s === 'Obsolete') return 'danger' as const;
  if (s === 'Draft') return 'warning' as const;
  return 'default' as const;
};

const ocrVariant = (s: string) => {
  if (s === 'Completed') return 'success' as const;
  if (s === 'Processing') return 'processing' as const;
  if (s === 'Failed') return 'danger' as const;
  return 'default' as const;
};

const FileIcon = ({ type }: { type: string }) => {
  if (type === 'PNG' || type === 'JPG') return <FileImage className="w-5 h-5 text-purple-400" />;
  if (type === 'XLSX') return <File className="w-5 h-5 text-green-400" />;
  if (type === 'DOCX') return <File className="w-5 h-5 text-blue-400" />;
  return <FileText className="w-5 h-5 text-teal-400" />;
};

type SortField = 'date' | 'name' | 'type' | 'status' | 'revision' | 'category';
type SortDir = 'asc' | 'desc';

const STATUS_FILTERS = ['All', 'Approved', 'In Review', 'Draft', 'Obsolete'];
const OCR_FILTERS = ['All', 'Completed', 'Processing', 'Failed', 'Not Required'];
const TYPE_FILTERS = ['All', 'PDF', 'DOCX', 'XLSX', 'PNG', 'JPG'];
const CATEGORY_FILTERS = ['All', 'Electrical Schema', 'Specification', 'CAD Output', 'Calibration Log', 'Test Report', 'Certificate'];

function Toast({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-teal-500/30 shadow-2xl shadow-black/60 text-sm text-slate-200 animate-slide-in-right">
      <CheckCheck className="w-4 h-4 text-teal-400 shrink-0" />
      <span>{msg}</span>
      <button onClick={onDismiss} className="ml-2 text-slate-500 hover:text-slate-300 transition-colors">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function DocumentHub() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [ocrFilter, setOcrFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showObsolete, setShowObsolete] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [docPage, setDocPage] = useState(1);
  const DOC_PAGE_SIZE = 15;
  const [showColMenu, setShowColMenu] = useState(false);
  const ALL_COLS = ['id', 'name', 'category', 'type', 'revision', 'status', 'ocr', 'linkedPL', 'date'] as const;
  type ColKey = typeof ALL_COLS[number];
  const COL_LABELS: Record<ColKey, string> = { id: 'Doc ID', name: 'Name', category: 'Category', type: 'Type', revision: 'Rev', status: 'Status', ocr: 'OCR', linkedPL: 'Linked PL', date: 'Updated' };
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(new Set(ALL_COLS));
  const toggleCol = (c: ColKey) => setVisibleCols(v => { const n = new Set(v); if (n.has(c)) { if (n.size > 2) n.delete(c); } else n.add(c); return n; });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-2.5 h-2.5 text-slate-600" />;
    return sortDir === 'asc'
      ? <ArrowUp className="w-2.5 h-2.5 text-teal-400" />
      : <ArrowDown className="w-2.5 h-2.5 text-teal-400" />;
  };

  const filtered = useMemo(() => {
    let docs = MOCK_DOCUMENTS.filter(d => {
      if (!showObsolete && d.status === 'Obsolete') return false;
      const matchSearch = !search ||
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.id.toLowerCase().includes(search.toLowerCase()) ||
        d.linkedPL?.toLowerCase().includes(search.toLowerCase()) ||
        d.author?.toLowerCase().includes(search.toLowerCase()) ||
        d.tags?.some((t: string) => t.toLowerCase().includes(search.toLowerCase()));
      const matchStatus = statusFilter === 'All' || d.status === statusFilter;
      const matchOcr = ocrFilter === 'All' || d.ocrStatus === ocrFilter;
      const matchType = typeFilter === 'All' || d.type === typeFilter;
      const matchCategory = categoryFilter === 'All' || d.category === categoryFilter;
      return matchSearch && matchStatus && matchOcr && matchType && matchCategory;
    });

    docs = [...docs].sort((a, b) => {
      let va: string, vb: string;
      switch (sortField) {
        case 'name': va = a.name; vb = b.name; break;
        case 'type': va = a.type; vb = b.type; break;
        case 'status': va = a.status; vb = b.status; break;
        case 'revision': va = a.revision; vb = b.revision; break;
        case 'category': va = a.category; vb = b.category; break;
        default: va = a.date; vb = b.date;
      }
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });

    return docs;
  }, [search, statusFilter, ocrFilter, typeFilter, categoryFilter, sortField, sortDir, showObsolete]);

  useEffect(() => { setDocPage(1); }, [filtered]);

  const totalDocPages = Math.max(1, Math.ceil(filtered.length / DOC_PAGE_SIZE));
  const paginated = filtered.slice((docPage - 1) * DOC_PAGE_SIZE, docPage * DOC_PAGE_SIZE);

  const stats = {
    total: MOCK_DOCUMENTS.length,
    approved: MOCK_DOCUMENTS.filter(d => d.status === 'Approved').length,
    inReview: MOCK_DOCUMENTS.filter(d => d.status === 'In Review').length,
    ocrPending: MOCK_DOCUMENTS.filter(d => d.ocrStatus === 'Processing').length,
  };

  const activeFilters = [statusFilter, ocrFilter, typeFilter, categoryFilter].filter(f => f !== 'All').length;

  const allSelected = filtered.length > 0 && filtered.every(d => selectedIds.has(d.id));
  const someSelected = filtered.some(d => selectedIds.has(d.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(d => d.id)));
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const selectionCount = selectedIds.size;
  const clearSelection = () => setSelectedIds(new Set());

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      {toast && <Toast msg={toast} onDismiss={() => setToast(null)} />}

      <PageHeader
        title="Document Hub"
        subtitle="Manage, search, and track all engineering documents linked to PL records"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => ExportImportService.downloadDocumentsCSV()}>
              <Download className="w-3.5 h-3.5" /> CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={() => ExportImportService.exportDocumentsExcel()}>
              <Download className="w-3.5 h-3.5" /> Excel
            </Button>
            <Button variant="secondary" size="sm">
              <Upload className="w-3.5 h-3.5" /> Bulk Upload
            </Button>
            <Button size="sm" onClick={() => navigate('/documents/ingest')}>
              <Plus className="w-3.5 h-3.5" /> Ingest Document
            </Button>
          </div>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Documents', value: stats.total, icon: <FileText className="w-4 h-4 text-teal-400" /> },
          { label: 'Approved', value: stats.approved, icon: <Eye className="w-4 h-4 text-emerald-400" /> },
          { label: 'In Review', value: stats.inReview, icon: <ArrowUpDown className="w-4 h-4 text-amber-400" /> },
          { label: 'OCR Pending', value: stats.ocrPending, icon: <ScanText className="w-4 h-4 text-blue-400" /> },
        ].map(s => (
          <GlassCard key={s.label} className="px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center shrink-0">
              {s.icon}
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{s.label}</p>
              <p className="text-xl font-bold text-slate-100">{s.value}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-4">
        {/* Search + toolbar */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search by name, ID, PL number, author, or tags..."
              className="pl-9 w-full"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Show obsolete toggle */}
            <button
              onClick={() => setShowObsolete(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                showObsolete
                  ? 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-slate-200'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
              title={showObsolete ? 'Showing obsolete versions' : 'Hiding obsolete versions'}
            >
              {showObsolete
                ? <ToggleRight className="w-4 h-4 text-slate-500" />
                : <ToggleLeft className="w-4 h-4 text-rose-400" />
              }
              {showObsolete ? 'Incl. Obsolete' : 'Excl. Obsolete'}
            </button>

            <button
              onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${showFilters || activeFilters > 0 ? 'bg-teal-500/15 border-teal-500/40 text-teal-300' : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-slate-200'}`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
              {activeFilters > 0 && (
                <span className="w-4 h-4 rounded-full bg-teal-500 text-white text-[9px] flex items-center justify-center">{activeFilters}</span>
              )}
            </button>
            {/* Column visibility toggle */}
            {viewMode === 'table' && (
              <div className="relative">
                <button
                  onClick={() => setShowColMenu(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${showColMenu ? 'bg-teal-500/15 border-teal-500/40 text-teal-300' : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-slate-200'}`}
                >
                  <Columns3 className="w-3.5 h-3.5" /> Columns
                </button>
                {showColMenu && (
                  <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-slate-900/95 backdrop-blur-xl border border-white/8 rounded-xl shadow-2xl shadow-black/60 p-2">
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-1">Visible Columns</p>
                    {ALL_COLS.map(c => (
                      <button
                        key={c}
                        onClick={() => toggleCol(c)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-700/50 text-left transition-colors"
                      >
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${visibleCols.has(c) ? 'bg-teal-500/30 border-teal-500/60' : 'border-slate-600'}`}>
                          {visibleCols.has(c) && <CheckCheck className="w-2.5 h-2.5 text-teal-400" />}
                        </div>
                        <span className="text-xs text-slate-300">{COL_LABELS[c]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="flex border border-slate-700/60 rounded-xl overflow-hidden">
              <button onClick={() => setViewMode('table')} className={`px-3 py-2 transition-colors ${viewMode === 'table' ? 'bg-teal-500/20 text-teal-300' : 'text-slate-500 hover:text-slate-300'}`} title="Table view">
                <List className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode('grid')} className={`px-3 py-2 transition-colors ${viewMode === 'grid' ? 'bg-teal-500/20 text-teal-300' : 'text-slate-500 hover:text-slate-300'}`} title="Grid view">
                <Grid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Expanded filter panels */}
        {showFilters && (
          <div className="mb-4 pt-3 border-t border-white/5 space-y-3">
            <div className="flex flex-wrap gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 mb-1.5">Status</p>
                <FilterPills options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 mb-1.5">OCR Status</p>
                <FilterPills options={OCR_FILTERS} value={ocrFilter} onChange={setOcrFilter} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 mb-1.5">File Type</p>
                <FilterPills options={TYPE_FILTERS} value={typeFilter} onChange={setTypeFilter} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 mb-1.5">Category</p>
                <FilterPills options={CATEGORY_FILTERS} value={categoryFilter} onChange={setCategoryFilter} />
              </div>
            </div>
            {activeFilters > 0 && (
              <button
                onClick={() => { setStatusFilter('All'); setOcrFilter('All'); setTypeFilter('All'); setCategoryFilter('All'); }}
                className="text-xs text-slate-500 hover:text-teal-400 underline transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Bulk action toolbar */}
        {someSelected && (
          <div className="mb-3 flex items-center gap-2 px-3 py-2.5 bg-teal-500/8 border border-teal-500/25 rounded-xl">
            <CheckSquare className="w-4 h-4 text-teal-400 shrink-0" />
            <span className="text-xs font-semibold text-teal-300">{selectionCount} selected</span>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => showToast(`Downloading ${selectionCount} document${selectionCount > 1 ? 's' : ''}…`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 text-xs border border-slate-700/40 hover:border-teal-500/30 transition-all"
              >
                <Download className="w-3.5 h-3.5 text-teal-400" /> Download Selected
              </button>
              <button
                onClick={() => showToast(`Approval request sent for ${selectionCount} document${selectionCount > 1 ? 's' : ''}.`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 text-xs border border-slate-700/40 hover:border-amber-500/30 transition-all"
              >
                <Send className="w-3.5 h-3.5 text-amber-400" /> Request Approval
              </button>
              <button
                onClick={() => showToast(`${selectionCount} document${selectionCount > 1 ? 's' : ''} moved to selected folder.`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 text-xs border border-slate-700/40 hover:border-indigo-500/30 transition-all"
              >
                <FolderOpen className="w-3.5 h-3.5 text-indigo-400" /> Move to Folder
              </button>
              <button
                onClick={clearSelection}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                title="Clear selection"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <div className="text-xs text-slate-500 mb-3 font-medium flex items-center gap-2">
          <span>Showing <span className="text-teal-400 font-semibold">{Math.min((docPage - 1) * DOC_PAGE_SIZE + 1, filtered.length)}–{Math.min(docPage * DOC_PAGE_SIZE, filtered.length)}</span> of <span className="text-slate-400 font-semibold">{filtered.length}</span> documents</span>
          {!showObsolete && <span className="text-rose-400/70">· obsolete hidden</span>}
          {search && <span>matching "<span className="text-slate-300">{search}</span>"</span>}
        </div>

        {/* Table view */}
        {viewMode === 'table' ? (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-white/5 text-slate-500">
                  <th className="pb-3 pl-3 w-8">
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center justify-center text-slate-500 hover:text-teal-400 transition-colors"
                      title={allSelected ? 'Deselect all' : 'Select all'}
                    >
                      {allSelected ? (
                        <CheckSquare className="w-4 h-4 text-teal-400" />
                      ) : someSelected ? (
                        <Minus className="w-4 h-4 text-teal-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  {visibleCols.has('id') && <th className="pb-3 pl-1 font-semibold text-[11px] uppercase tracking-wide">Document ID</th>}
                  {visibleCols.has('name') && <th className="pb-3 pr-4 font-semibold text-[11px] uppercase tracking-wide"><button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-slate-300 transition-colors">Name <SortIcon field="name" /></button></th>}
                  {visibleCols.has('category') && <th className="pb-3 font-semibold text-[11px] uppercase tracking-wide"><button onClick={() => handleSort('category')} className="flex items-center gap-1 hover:text-slate-300 transition-colors">Category <SortIcon field="category" /></button></th>}
                  {visibleCols.has('type') && <th className="pb-3 font-semibold text-[11px] uppercase tracking-wide"><button onClick={() => handleSort('type')} className="flex items-center gap-1 hover:text-slate-300 transition-colors">Type <SortIcon field="type" /></button></th>}
                  {visibleCols.has('revision') && <th className="pb-3 font-semibold text-[11px] uppercase tracking-wide"><button onClick={() => handleSort('revision')} className="flex items-center gap-1 hover:text-slate-300 transition-colors">Rev <SortIcon field="revision" /></button></th>}
                  {visibleCols.has('status') && <th className="pb-3 font-semibold text-[11px] uppercase tracking-wide"><button onClick={() => handleSort('status')} className="flex items-center gap-1 hover:text-slate-300 transition-colors">Status <SortIcon field="status" /></button></th>}
                  {visibleCols.has('ocr') && <th className="pb-3 font-semibold text-[11px] uppercase tracking-wide">OCR</th>}
                  {visibleCols.has('linkedPL') && <th className="pb-3 font-semibold text-[11px] uppercase tracking-wide">Linked PL</th>}
                  {visibleCols.has('date') && <th className="pb-3 font-semibold text-[11px] uppercase tracking-wide"><button onClick={() => handleSort('date')} className="flex items-center gap-1 hover:text-slate-300 transition-colors">Updated <SortIcon field="date" /></button></th>}
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {paginated.map(doc => {
                  const isSelected = selectedIds.has(doc.id);
                  return (
                    <tr
                      key={doc.id}
                      className={`hover:bg-slate-800/40 cursor-pointer transition-colors group ${isSelected ? 'bg-teal-500/5' : ''}`}
                      onClick={() => navigate(`/documents/${doc.id}${search ? `?q=${encodeURIComponent(search)}` : ''}`)}
                    >
                      <td className="py-3 pl-3" onClick={e => toggleSelect(doc.id, e)}>
                        <button className="flex items-center justify-center text-slate-500 hover:text-teal-400 transition-colors">
                          {isSelected
                            ? <CheckSquare className="w-4 h-4 text-teal-400" />
                            : <Square className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          }
                        </button>
                      </td>
                      {visibleCols.has('id') && (
                        <td className="py-3 pl-1">
                          <div className="flex items-center gap-2">
                            <FileIcon type={doc.type} />
                            <span className="font-mono text-teal-400 text-xs">{doc.id}</span>
                          </div>
                        </td>
                      )}
                      {visibleCols.has('name') && (
                        <td className="py-3 pr-4">
                          <span className="text-slate-200 font-medium">{doc.name}</span>
                          <div className="text-[11px] text-slate-500">{doc.author} · {doc.size}</div>
                        </td>
                      )}
                      {visibleCols.has('category') && (
                        <td className="py-3">
                          <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-300 rounded-md text-xs border border-indigo-500/20">{doc.category}</span>
                        </td>
                      )}
                      {visibleCols.has('type') && (
                        <td className="py-3">
                          <span className="px-2 py-0.5 bg-slate-800/80 text-slate-400 rounded-md text-xs border border-slate-700/40">{doc.type}</span>
                        </td>
                      )}
                      {visibleCols.has('revision') && <td className="py-3 text-slate-400 font-mono text-xs">{doc.revision}</td>}
                      {visibleCols.has('status') && <td className="py-3"><Badge variant={statusVariant(doc.status)}>{doc.status}</Badge></td>}
                      {visibleCols.has('ocr') && <td className="py-3"><Badge variant={ocrVariant(doc.ocrStatus)}>{doc.ocrStatus}</Badge></td>}
                      {visibleCols.has('linkedPL') && (
                        <td className="py-3 font-mono text-xs">
                          {doc.linkedPL && doc.linkedPL !== 'N/A' ? (
                            <span className="flex items-center gap-1 text-teal-400">
                              <LinkIcon className="w-3 h-3" />
                              {doc.linkedPL}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      )}
                      {visibleCols.has('date') && <td className="py-3 text-slate-500 text-xs">{doc.date}</td>}
                      <td className="py-3 pr-3">
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-teal-400 transition-colors" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-16 text-slate-500">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium text-slate-400 mb-1">No documents found</p>
                <p className="text-sm mb-4">Try adjusting your search or filter criteria</p>
                <div className="flex gap-2 justify-center">
                  {activeFilters > 0 && (
                    <Button variant="secondary" size="sm" onClick={() => { setStatusFilter('All'); setOcrFilter('All'); setTypeFilter('All'); setCategoryFilter('All'); }}>
                      Clear Filters
                    </Button>
                  )}
                  <Button size="sm" onClick={() => navigate('/documents/ingest')}>
                    <Plus className="w-3.5 h-3.5" /> Ingest First Document
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Grid view */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginated.map(doc => {
              const isSelected = selectedIds.has(doc.id);
              return (
                <div
                  key={doc.id}
                  className={`p-4 rounded-xl border cursor-pointer transition-all group hover:shadow-lg ${
                    isSelected
                      ? 'bg-teal-500/8 border-teal-500/35 hover:border-teal-400/50'
                      : 'bg-slate-900/40 border-white/5 hover:border-teal-500/30 hover:shadow-teal-950/30'
                  }`}
                  onClick={() => navigate(`/documents/${doc.id}${search ? `?q=${encodeURIComponent(search)}` : ''}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={e => toggleSelect(doc.id, e)}
                        className="text-slate-600 hover:text-teal-400 transition-colors"
                      >
                        {isSelected
                          ? <CheckSquare className="w-4 h-4 text-teal-400" />
                          : <Square className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        }
                      </button>
                      <div className="w-8 h-8 rounded-xl bg-slate-800/60 border border-white/5 flex items-center justify-center">
                        <FileIcon type={doc.type} />
                      </div>
                    </div>
                    <Badge variant={statusVariant(doc.status)}>{doc.status}</Badge>
                  </div>
                  <p className="text-sm font-medium text-slate-200 mb-1 line-clamp-2 group-hover:text-white transition-colors">{doc.name}</p>
                  <p className="font-mono text-[11px] text-teal-400 mb-2">{doc.id}</p>

                  {/* Category badge */}
                  <div className="mb-2">
                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-300/80 rounded-md text-[10px] border border-indigo-500/15">{doc.category}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{doc.type} · {doc.size}</span>
                    <span className="font-mono">Rev {doc.revision}</span>
                  </div>

                  {/* Linked PL */}
                  {doc.linkedPL && doc.linkedPL !== 'N/A' && (
                    <div className="mt-2 flex items-center gap-1 text-[11px] text-teal-500/80">
                      <LinkIcon className="w-3 h-3" /> {doc.linkedPL}
                    </div>
                  )}

                  <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
                    <Badge variant={ocrVariant(doc.ocrStatus)} className="text-[10px]">{doc.ocrStatus}</Badge>
                    <span className="text-[10px] text-slate-600">{doc.date}</span>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-16 text-slate-500">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium text-slate-400 mb-1">No documents found</p>
                <p className="text-sm mb-4">Try adjusting your search or filter criteria</p>
                <Button size="sm" onClick={() => navigate('/documents/ingest')}>
                  <Plus className="w-3.5 h-3.5" /> Ingest First Document
                </Button>
              </div>
            )}
          </div>
        )}
        {/* Pagination Controls */}
        {totalDocPages > 1 && (
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/5">
            <span className="text-xs text-slate-500">Page <span className="text-slate-400 font-semibold">{docPage}</span> of {totalDocPages}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setDocPage(1)}
                disabled={docPage === 1}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-teal-300 hover:bg-slate-800/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >«</button>
              <button
                onClick={() => setDocPage(p => Math.max(1, p - 1))}
                disabled={docPage === 1}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-teal-300 hover:bg-slate-800/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >‹ Prev</button>
              {Array.from({ length: Math.min(5, totalDocPages) }, (_, i) => {
                const start = Math.max(1, Math.min(docPage - 2, totalDocPages - 4));
                const pg = start + i;
                return (
                  <button
                    key={pg}
                    onClick={() => setDocPage(pg)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${pg === docPage ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60'}`}
                  >{pg}</button>
                );
              })}
              <button
                onClick={() => setDocPage(p => Math.min(totalDocPages, p + 1))}
                disabled={docPage === totalDocPages}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-teal-300 hover:bg-slate-800/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >Next ›</button>
              <button
                onClick={() => setDocPage(totalDocPages)}
                disabled={docPage === totalDocPages}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-teal-300 hover:bg-slate-800/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >»</button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
