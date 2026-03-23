import { useState } from 'react';
import { GlassCard, Badge, Button } from '../components/ui/Shared';
import { MOCK_REPORTS, MOCK_WORK_LEDGER } from '../lib/mockExtended';
import { BarChart3, Download, Filter, FileText, Loader2, PieChart } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RPieChart, Pie, Cell } from 'recharts';

const docStatusData = [
  { name: 'Approved', value: 2 }, { name: 'In Review', value: 1 }, { name: 'Draft', value: 1 }, { name: 'Obsolete', value: 1 },
];
const COLORS = ['#14b8a6', '#f59e0b', '#64748b', '#ef4444'];

const workByType = [
  { type: 'Inspection', count: 1 }, { type: 'Calibration', count: 1 }, { type: 'Review', count: 1 }, { type: 'Reporting', count: 1 }, { type: 'Audit', count: 1 },
];

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState<typeof MOCK_REPORTS[0] | null>(null);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl text-white mb-2" style={{ fontWeight: 700 }}>Reports</h1>
        <p className="text-slate-400 text-sm">Operational summaries, analytics, and exportable reports.</p>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MOCK_REPORTS.map(r => (
          <GlassCard key={r.id} className="p-5 hover:border-teal-500/40 cursor-pointer transition-all" onClick={() => setSelectedReport(r)}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <Badge variant={r.status === 'Ready' ? 'success' : 'processing'}>{r.status}</Badge>
            </div>
            <h3 className="text-sm text-slate-200 mb-1" style={{ fontWeight: 600 }}>{r.name}</h3>
            <p className="text-xs text-slate-400 mb-3">{r.description}</p>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{r.category}</span>
              <span>{r.generated}</span>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Inline Report View */}
      {selectedReport ? (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl text-white" style={{ fontWeight: 700 }}>{selectedReport.name}</h2>
              <p className="text-sm text-slate-400 mt-1">Generated: {selectedReport.generated}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary"><Download className="w-4 h-4" /> Export PDF</Button>
              <Button variant="ghost" onClick={() => setSelectedReport(null)}>Close</Button>
            </div>
          </div>

          {selectedReport.status === 'Generating' ? (
            <div className="flex flex-col items-center py-16 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-teal-500 mb-4" />
              <p>Report is being generated...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm text-slate-300 mb-4" style={{ fontWeight: 600 }}>Document Status Distribution</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RPieChart>
                      <Pie data={docStatusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {docStatusData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }} />
                    </RPieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                <h3 className="text-sm text-slate-300 mb-4" style={{ fontWeight: 600 }}>Work Records by Type</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={workByType}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="type" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }} />
                      <Bar dataKey="count" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </GlassCard>
      ) : (
        <div className="text-center text-sm text-slate-500 py-8">Select a report above to view its summary</div>
      )}
    </div>
  );
}
