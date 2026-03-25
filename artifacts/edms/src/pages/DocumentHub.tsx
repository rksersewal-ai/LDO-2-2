import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { GlassCard, Badge, Button, Input, FilterPills, PageHeader } from '../components/ui/Shared';
import { MOCK_DOCUMENTS } from '../lib/mock';
import {
  FileText, Search, Upload, Download, Eye,
  Grid, List, ChevronRight, FileImage, File,
  Plus, SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown,
  ScanText, Link as LinkIcon,
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

type SortField = 'date' | 'name' | 'type' | 'status' | 'revision';
type SortDir = 'asc' | 'desc';

const STATUS_FILTERS = ['All', 'Approved', 'In Review', 'Draft', 'Obsolete'];
const OCR_FILTERS = ['All', 'Completed', 'Processing', 'Failed', 'Not Required'];
const TYPE_FILTERS = ['All', 'PDF', 'DOCX', 'XLSX', 'PNG', 'JPG'];
const CATEGORY_FILTERS = ['All', 'Electrical Schema', 'Specification', 'CAD Output', 'Calibration Log', 'Test Report', 'Certificate'];

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
        default: va = a.date; vb = b.date;
      }
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });

    return docs;
  }, [search, statusFilter, ocrFilter, typeFilter, categoryFilter, sortField, sortDir]);

  const stats = {
    total: MOCK_DOCUMENTS.length,
    approved: MOCK_DOCUMENTS.filter(d => d.status === 'Approved').length,
    inReview: MOCK_DOCUMENTS.filter(d => d.status === 'In Review').length,
    ocrPending: MOCK_DOCUMENTS.filter(d => d.ocrStatus === 'Processing').length,
  };

  const activeFilters = [statusFilter, ocrFilter, typeFilter, categoryFilter].filter(f => f !== 'All').length;

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      <PageHeader
        title="Document Hub"
        subtitle="Manage, search, and track all engineering documents linked to PL records"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm">
              <Download className="w-3.5 h-3.5" /> Export
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${showFilters || activeFilters > 0 ? 'bg-teal-500/15 border-teal-500/40 text-teal-300' : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-slate-200'}`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
              {activeFilters > 0 && (
                <span className="w-4 h-4 rounded-full bg-teal-500 text-white text-[9px] flex items-center justify-center">{activeFilters}</span>
              )}
            </button>
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

        <div className="text-xs text-slate-500 mb-3 font-medium flex items-center gap-2">
          <span>Showing <span className="text-teal-400 font-semibold">{filtered.length}</span> of {MOCK_DOCUMENTS.length} documents</span>
          {search && <span>matching "<span className="text-slate-300">{search}</span>"</span>}
        </div>

        {/* Table view */}
        {viewMode === 'table' ? (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-white/5 text-slate-500">
                  <th className="pb-3 pl-3 font-semibold text-[11px] uppercase tracking-wide">Document ID</th>
                  <th className="pb-3 pr-4 font-semibold text-[11px] uppercase tracking-wide">
                    <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-slate-300 transition-colors">
                      Name <SortIcon field="name" />
                    </button>
                  </th>
                  <th className="pb-3 font-semibold text-[11px] uppercase tracking-wide">
                    <button onClick={() => handleSort('type')} className="flex items-center gap-1 hover:text-slate-300 transition-colors">
                      Type <SortIcon field="type" />
                    </button>
                  </th>
                  <th className="pb-3 font-semibold text-[11px] uppercase tracking-wide">
                    <button onClick={() => handleSort('revision')} className="flex items-center gap-1 hover:text-slate-300 transition-colors">
                      Rev <SortIcon field="revision" />
                    </button>
                  </th>
                  <th className="pb-3 font-semibold text-[11px] uppercase tracking-wide">
                    <button onClick={() => handleSort('status')} className="flex items-center gap-1 hover:text-slate-300 transition-colors">
                      Status <SortIcon field="status" />
                    </button>
                  </th>
                  <th className="pb-3 font-semibold text-[11px] uppercase tracking-wide">OCR</th>
                  <th className="pb-3 font-semibold text-[11px] uppercase tracking-wide">Linked PL</th>
                  <th className="pb-3 font-semibold text-[11px] uppercase tracking-wide">
                    <button onClick={() => handleSort('date')} className="flex items-center gap-1 hover:text-slate-300 transition-colors">
                      Updated <SortIcon field="date" />
                    </button>
                  </th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {filtered.map(doc => (
                  <tr
                    key={doc.id}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                    onClick={() => navigate(`/documents/${doc.id}`)}
                  >
                    <td className="py-3 pl-3">
                      <div className="flex items-center gap-2">
                        <FileIcon type={doc.type} />
                        <span className="font-mono text-teal-400 text-xs">{doc.id}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-slate-200 font-medium">{doc.name}</span>
                      <div className="text-[11px] text-slate-500">{doc.author} · {doc.size}</div>
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 bg-slate-800/80 text-slate-400 rounded-md text-xs border border-slate-700/40">{doc.type}</span>
                    </td>
                    <td className="py-3 text-slate-400 font-mono text-xs">{doc.revision}</td>
                    <td className="py-3">
                      <Badge variant={statusVariant(doc.status)}>{doc.status}</Badge>
                    </td>
                    <td className="py-3">
                      <Badge variant={ocrVariant(doc.ocrStatus)}>{doc.ocrStatus}</Badge>
                    </td>
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
                    <td className="py-3 text-slate-500 text-xs">{doc.date}</td>
                    <td className="py-3 pr-3">
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-teal-400 transition-colors" />
                    </td>
                  </tr>
                ))}
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
            {filtered.map(doc => (
              <div
                key={doc.id}
                className="p-4 rounded-xl bg-slate-900/40 border border-white/5 hover:border-teal-500/30 cursor-pointer transition-all group hover:shadow-lg hover:shadow-teal-950/30"
                onClick={() => navigate(`/documents/${doc.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800/60 border border-white/5 flex items-center justify-center">
                    <FileIcon type={doc.type} />
                  </div>
                  <Badge variant={statusVariant(doc.status)}>{doc.status}</Badge>
                </div>
                <p className="text-sm font-medium text-slate-200 mb-1 line-clamp-2 group-hover:text-white transition-colors">{doc.name}</p>
                <p className="font-mono text-[11px] text-teal-400 mb-2">{doc.id}</p>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{doc.type} · {doc.size}</span>
                  <span>Rev {doc.revision}</span>
                </div>
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
            ))}
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
      </GlassCard>
    </div>
  );
}
