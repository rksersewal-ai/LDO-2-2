import { useState, useMemo, useEffect } from 'react';
import { GlassCard, Badge, Button, Input, PageHeader } from '../components/ui/Shared';
import { MOCK_AUDIT_EXTENDED } from '../lib/mockExtended';
import {
  FileSearch, Filter, X, AlertCircle, AlertTriangle, Info,
  Download, ChevronLeft, ChevronRight, User, Calendar,
} from 'lucide-react';
import * as XLSX from 'xlsx';

const severityVariant = (s: string) => {
  if (s === 'Critical') return 'danger' as const;
  if (s === 'Warning') return 'warning' as const;
  return 'default' as const;
};
const severityIcon = (s: string) => {
  if (s === 'Critical') return <AlertCircle className="w-3.5 h-3.5 text-rose-400" />;
  if (s === 'Warning') return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
  return <Info className="w-3.5 h-3.5 text-slate-400" />;
};

const PAGE_SIZE = 20;

export default function AuditLog() {
  const [moduleFilter, setModuleFilter] = useState<string>('All');
  const [severityFilter, setSeverityFilter] = useState<string>('All');
  const [userFilter, setUserFilter] = useState<string>('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<typeof MOCK_AUDIT_EXTENDED[0] | null>(null);
  const [page, setPage] = useState(1);

  const modules = useMemo(() => ['All', ...Array.from(new Set(MOCK_AUDIT_EXTENDED.map(e => e.module))).sort()], []);
  const users = useMemo(() => ['All', ...Array.from(new Set(MOCK_AUDIT_EXTENDED.map(e => e.user))).sort()], []);

  const filtered = useMemo(() => {
    return MOCK_AUDIT_EXTENDED.filter(e => {
      if (moduleFilter !== 'All' && e.module !== moduleFilter) return false;
      if (severityFilter !== 'All' && e.severity !== severityFilter) return false;
      if (userFilter !== 'All' && e.user !== userFilter) return false;
      if (search && !e.action.toLowerCase().includes(search.toLowerCase()) && !e.user.toLowerCase().includes(search.toLowerCase()) && !e.entity.toLowerCase().includes(search.toLowerCase())) return false;
      if (dateFrom) {
        const evDate = e.time?.split(' ')[0] ?? '';
        if (evDate < dateFrom) return false;
      }
      if (dateTo) {
        const evDate = e.time?.split(' ')[0] ?? '';
        if (evDate > dateTo) return false;
      }
      return true;
    });
  }, [moduleFilter, severityFilter, userFilter, search, dateFrom, dateTo]);

  useEffect(() => { setPage(1); }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const activeFilters = [moduleFilter !== 'All', severityFilter !== 'All', userFilter !== 'All', !!dateFrom, !!dateTo].filter(Boolean).length;

  const clearFilters = () => {
    setModuleFilter('All');
    setSeverityFilter('All');
    setUserFilter('All');
    setDateFrom('');
    setDateTo('');
    setSearch('');
  };

  const exportCSV = () => {
    const headers = ['Event ID', 'Severity', 'Action', 'Module', 'Entity', 'User', 'IP Address', 'Timestamp', 'Details'];
    const rows = filtered.map(e => [e.id, e.severity, e.action, e.module, e.entity, e.user, e.ip, e.time, e.details ?? '']);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    const headers = ['Event ID', 'Severity', 'Action', 'Module', 'Entity', 'User', 'IP Address', 'Timestamp', 'Details'];
    const rows = filtered.map(e => [e.id, e.severity, e.action, e.module, e.entity, e.user, e.ip, e.time, e.details ?? '']);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = headers.map((_, i) => ({ wch: i === 2 ? 35 : i === 8 ? 50 : 18 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Log');
    XLSX.writeFile(wb, `audit-log-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Audit Log"
        subtitle="System-wide event traceability and investigation workspace"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={exportCSV}>
              <Download className="w-3.5 h-3.5" /> CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={exportExcel}>
              <Download className="w-3.5 h-3.5" /> Excel
            </Button>
          </div>
        }
      />

      <GlassCard className="p-4">
        {/* Search + Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <FileSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search by user, entity, action..."
              className="pl-9 w-full"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Module filter */}
          <select
            value={moduleFilter}
            onChange={e => setModuleFilter(e.target.value)}
            className="bg-slate-950/50 border border-teal-500/20 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500/40"
          >
            {modules.map(m => <option key={m}>{m}</option>)}
          </select>

          {/* Severity filter */}
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
            className="bg-slate-950/50 border border-teal-500/20 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500/40"
          >
            {['All', 'Critical', 'Warning', 'Info'].map(s => <option key={s}>{s}</option>)}
          </select>

          {/* User filter */}
          <select
            value={userFilter}
            onChange={e => setUserFilter(e.target.value)}
            className="bg-slate-950/50 border border-teal-500/20 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500/40"
          >
            {users.map(u => <option key={u}>{u}</option>)}
          </select>

          {activeFilters > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Clear ({activeFilters})
            </button>
          )}
        </div>

        {/* Date range row */}
        <div className="flex flex-wrap items-center gap-3 mb-4 pb-4 border-b border-white/5">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Calendar className="w-3.5 h-3.5 text-slate-600" />
            <span>Date range:</span>
          </div>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="bg-slate-950/50 border border-teal-500/20 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500/40"
          />
          <span className="text-slate-600 text-xs">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="bg-slate-950/50 border border-teal-500/20 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500/40"
          />
          <span className="text-xs text-slate-500 ml-auto">
            <span className="text-teal-400 font-semibold">{filtered.length}</span> events
            {activeFilters > 0 && <span className="text-slate-600"> (filtered from {MOCK_AUDIT_EXTENDED.length})</span>}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-700/50 text-slate-400">
                <th className="pb-3 pl-4 font-semibold text-xs">Event ID</th>
                <th className="pb-3 font-semibold text-xs">Severity</th>
                <th className="pb-3 font-semibold text-xs">Action</th>
                <th className="pb-3 font-semibold text-xs">Module</th>
                <th className="pb-3 font-semibold text-xs">Entity</th>
                <th className="pb-3 font-semibold text-xs">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" />User</span>
                </th>
                <th className="pb-3 font-semibold text-xs">IP Address</th>
                <th className="pb-3 font-semibold text-xs">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {paginated.map(event => (
                <tr
                  key={event.id}
                  className={`hover:bg-slate-800/30 cursor-pointer transition-colors ${selectedEvent?.id === event.id ? 'bg-slate-800/40' : ''}`}
                  onClick={() => setSelectedEvent(selectedEvent?.id === event.id ? null : event)}
                >
                  <td className="py-3 pl-4 font-mono text-xs text-teal-400">{event.id}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-1.5">
                      {severityIcon(event.severity)}
                      <Badge variant={severityVariant(event.severity)}>{event.severity}</Badge>
                    </div>
                  </td>
                  <td className="py-3 font-mono text-xs text-slate-300">{event.action}</td>
                  <td className="py-3 text-slate-400 text-xs">{event.module}</td>
                  <td className="py-3 font-mono text-xs text-blue-400">{event.entity}</td>
                  <td className="py-3 text-slate-300 text-xs">{event.user}</td>
                  <td className="py-3 font-mono text-xs text-slate-500">{event.ip}</td>
                  <td className="py-3 text-slate-500 text-xs">{event.time}</td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-500">
                    <Filter className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="font-medium text-slate-400">No events match your filters</p>
                    <button onClick={clearFilters} className="mt-2 text-xs text-teal-400 hover:text-teal-300">Clear filters</button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Expanded event detail */}
        {selectedEvent && (
          <div className="mt-4 p-4 bg-slate-800/30 rounded-xl border border-teal-500/20">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">Event Detail: <span className="font-mono text-teal-400">{selectedEvent.id}</span></h3>
              <button onClick={() => setSelectedEvent(null)} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(selectedEvent).map(([k, v]) => (
                <div key={k}>
                  <p className="text-[10px] text-slate-500 mb-0.5 uppercase tracking-wider font-semibold">{k}</p>
                  <p className="text-xs font-mono text-slate-200 break-all">{String(v)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/5">
            <span className="text-xs text-slate-500">
              Page <span className="text-slate-400 font-semibold">{page}</span> of {totalPages}
              {' · '}showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-teal-300 hover:bg-slate-800/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const pg = start + i;
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${pg === page ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60'}`}
                  >{pg}</button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-teal-300 hover:bg-slate-800/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
