import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Download, FileText, RefreshCw, Search, X } from 'lucide-react';
import { GlassCard, Badge, Button, Input } from '../components/ui/Shared';
import { DatePicker } from '../components/ui/DatePicker';
import { ExportImportService } from '../services/ExportImportService';
import { getReportDefinition, parseReportDate, type ReportColumn, type ReportRow } from '../lib/reporting';

function getStatusVariant(status: string) {
  if (status === 'Ready') return 'success';
  if (status === 'Generating') return 'processing';
  return 'warning';
}

function buildExportRows(rows: ReportRow[], columns: ReportColumn[]) {
  return rows.map((row) => columns.map((column) => String(row[column.key] ?? '—')));
}

export default function ReportTablePage() {
  const navigate = useNavigate();
  const { reportId } = useParams<{ reportId: string }>();
  const report = getReportDefinition(reportId);
  const detailRef = useRef<HTMLDivElement | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [refreshStamp, setRefreshStamp] = useState(Date.now());

  const allRows = useMemo(() => (report ? report.getRows() : []), [report, refreshStamp]);

  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      const rowDate = parseReportDate(row[report?.dateKey ?? '']);
      const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
      const toTime = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null;
      const matchesDate =
        (!fromTime || (rowDate != null && rowDate >= fromTime)) &&
        (!toTime || (rowDate != null && rowDate <= toTime));

      const haystack = Object.values(row).join(' ').toLowerCase();
      const matchesSearch = !search.trim() || haystack.includes(search.trim().toLowerCase());
      return matchesDate && matchesSearch;
    });
  }, [allRows, dateFrom, dateTo, report, search]);

  useEffect(() => {
    if (detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [reportId]);

  if (!report) {
    return (
      <div className="max-w-5xl mx-auto">
        <GlassCard className="p-8 text-center">
          <h1 className="text-xl font-bold text-white">Report not found</h1>
          <p className="mt-2 text-sm text-slate-400">The selected report definition does not exist.</p>
          <Button className="mt-4" onClick={() => navigate('/reports')}>
            <ArrowLeft className="w-4 h-4" /> Back to Reports
          </Button>
        </GlassCard>
      </div>
    );
  }

  const exportRows = buildExportRows(filteredRows, report.columns);
  const exportHeaders = report.columns.map((column) => column.label);
  const subtitle = [
    `Rows: ${filteredRows.length}`,
    dateFrom ? `From: ${dateFrom}` : null,
    dateTo ? `To: ${dateTo}` : null,
    `Refreshed: ${new Date(refreshStamp).toLocaleString()}`,
  ].filter(Boolean).join(' · ');

  return (
    <div ref={detailRef} className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => navigate('/reports')} className="mb-3 inline-flex items-center gap-2 text-xs text-teal-300 hover:text-teal-200 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to reports
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-white">{report.name}</h1>
            <Badge variant={getStatusVariant(report.status)}>{report.status}</Badge>
          </div>
          <p className="mt-2 text-sm text-slate-400">{report.description}</p>
        </div>

        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="secondary" size="sm" onClick={() => setRefreshStamp(Date.now())}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh snapshot
          </Button>
          <Button variant="secondary" size="sm" onClick={() => ExportImportService.exportGenericTableExcel(report.name, exportHeaders, exportRows, report.filenamePrefix)}>
            <Download className="w-3.5 h-3.5" /> Excel
          </Button>
          <Button variant="secondary" size="sm" onClick={() => ExportImportService.exportGenericTablePdf(report.name, exportHeaders, exportRows, subtitle)}>
            <Download className="w-3.5 h-3.5" /> PDF
          </Button>
          <Button size="sm" onClick={() => ExportImportService.exportGenericTableWord(report.name, exportHeaders, exportRows, report.filenamePrefix, subtitle)}>
            <FileText className="w-3.5 h-3.5" /> Word
          </Button>
        </div>
      </div>

      <GlassCard className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <DatePicker label="Date From" value={dateFrom} onChange={setDateFrom} placeholder="All dates" />
          <DatePicker label="Date To" value={dateTo} onChange={setDateTo} placeholder="All dates" />
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Search In Rows</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by ID, title, user, PL, document, status..."
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="info">{filteredRows.length} rows</Badge>
            <Badge variant="default">{report.category}</Badge>
            <span className="text-xs text-slate-500">Generated {report.generated}</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setDateFrom('');
              setDateTo('');
              setSearch('');
            }}
          >
            <X className="w-3.5 h-3.5" /> Reset Filters
          </Button>
        </div>
      </GlassCard>

      <GlassCard className="overflow-hidden">
        <div className="border-b border-white/5 px-5 py-3">
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>

        {filteredRows.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-300 font-medium">No rows available</p>
            <p className="mt-2 text-sm text-slate-500">{report.emptyState}</p>
          </div>
        ) : (
          <div className="overflow-auto max-h-[70vh]">
            <table className="w-full min-w-[980px]">
              <thead className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur">
                <tr className="border-b border-white/5">
                  {report.columns.map((column) => (
                    <th
                      key={column.key}
                      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 ${column.align === 'right' ? 'text-right' : 'text-left'}`}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, rowIndex) => (
                  <tr key={`${report.id}-${rowIndex}`} className="border-b border-white/5 hover:bg-slate-900/30 transition-colors">
                    {report.columns.map((column) => (
                      <td
                        key={column.key}
                        className={`px-4 py-3 text-sm ${column.align === 'right' ? 'text-right' : 'text-left'} ${column.mono ? 'font-mono text-teal-300' : 'text-slate-200'}`}
                      >
                        {String(row[column.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
