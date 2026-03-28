import { useNavigate } from 'react-router';
import { GlassCard, Badge } from '../components/ui/Shared';
import { getReportDefinition, REPORT_DEFINITIONS } from '../lib/reporting';
import { MOCK_DOCUMENTS } from '../lib/mock';
import { MOCK_WORK_LEDGER } from '../lib/mockExtended';
import { ArrowRight, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#14b8a6', '#f59e0b', '#64748b', '#ef4444'];

const docStatusData = [
  { name: 'Approved', value: MOCK_DOCUMENTS.filter((d) => d.status === 'Approved').length },
  { name: 'In Review', value: MOCK_DOCUMENTS.filter((d) => d.status === 'In Review').length },
  { name: 'Draft', value: MOCK_DOCUMENTS.filter((d) => d.status === 'Draft').length },
  { name: 'Obsolete', value: MOCK_DOCUMENTS.filter((d) => d.status === 'Obsolete').length },
];

const workByType = [
  { type: 'Inspection', count: MOCK_WORK_LEDGER.filter((r) => r.type === 'Inspection').length },
  { type: 'Calibration', count: MOCK_WORK_LEDGER.filter((r) => r.type === 'Calibration').length },
  { type: 'Review', count: MOCK_WORK_LEDGER.filter((r) => r.type === 'Review').length },
  { type: 'Reporting', count: MOCK_WORK_LEDGER.filter((r) => r.type === 'Reporting').length },
  { type: 'Audit', count: MOCK_WORK_LEDGER.filter((r) => r.type === 'Audit').length },
];

function getStatusVariant(status: string) {
  if (status === 'Ready') return 'success';
  if (status === 'Generating') return 'processing';
  return 'warning';
}

export default function Reports() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Reports</h1>
        <p className="text-slate-400 text-sm">Operational summaries, analytics, and exportable reports.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_DEFINITIONS.map((report) => {
          const definition = getReportDefinition(report.id);
          const rowCount = definition?.getRows().length ?? 0;

          return (
            <GlassCard
              key={report.id}
              className="p-5 hover:border-teal-500/40 cursor-pointer transition-all"
              onClick={() => navigate(`/reports/${report.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <Badge variant={getStatusVariant(report.status)}>{report.status}</Badge>
              </div>
              <h3 className="text-sm font-semibold text-slate-200 mb-1">{report.name}</h3>
              <p className="text-xs text-slate-500 mb-3 line-clamp-2">{report.description}</p>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="px-2 py-0.5 bg-slate-800 rounded-md text-slate-400">{report.category}</span>
                <span>{rowCount} live rows</span>
              </div>
              <div className="mt-4 flex items-center justify-between text-[11px] text-teal-300">
                <span>Open live table</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </GlassCard>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <h2 className="text-base font-bold text-white mb-4">Document Status Distribution</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={docStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                {docStatusData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(20, 184, 166, 0.2)', borderRadius: '12px', color: '#e2e8f0' }} />
            </PieChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="text-base font-bold text-white mb-4">Work Records by Type</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={workByType}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(71, 85, 105, 0.3)" />
              <XAxis dataKey="type" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(20, 184, 166, 0.2)', borderRadius: '12px', color: '#e2e8f0' }} />
              <Bar dataKey="count" fill="#14b8a6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>
    </div>
  );
}
