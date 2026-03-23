import { useState } from 'react';
import { GlassCard, Badge, Button, Input } from '../components/ui/Shared';
import { MOCK_WORK_LEDGER } from '../lib/mockExtended';
import { FileBarChart, Download, Filter, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const byStatus = [
  { status: 'Complete', count: MOCK_WORK_LEDGER.filter(w => w.status === 'Complete').length },
  { status: 'In Progress', count: MOCK_WORK_LEDGER.filter(w => w.status === 'In Progress').length },
  { status: 'Pending', count: MOCK_WORK_LEDGER.filter(w => w.status === 'Pending').length },
  { status: 'Verification', count: MOCK_WORK_LEDGER.filter(w => w.status === 'Pending Verification').length },
];

const byType = [
  { type: 'Inspection', count: 1 }, { type: 'Calibration', count: 1 }, { type: 'Review', count: 1 }, { type: 'Reporting', count: 1 }, { type: 'Audit', count: 1 },
];

export default function LedgerReports() {
  const [period, setPeriod] = useState('This Month');
  const total = MOCK_WORK_LEDGER.length;
  const completed = MOCK_WORK_LEDGER.filter(w => w.status === 'Complete').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl text-white mb-2" style={{ fontWeight: 700 }}>Work Ledger Reports</h1>
          <p className="text-slate-400 text-sm">Summary views and operational reporting for work records.</p>
        </div>
        <div className="flex gap-3">
          <select value={period} onChange={e => setPeriod(e.target.value)} className="bg-slate-950/50 border border-teal-500/20 text-slate-200 text-sm rounded-xl px-4 py-2 focus:outline-none">
            <option>This Week</option><option>This Month</option><option>This Quarter</option><option>Custom</option>
          </select>
          <Button variant="secondary"><Download className="w-4 h-4" /> Export</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <GlassCard className="p-5">
          <div className="text-xs text-slate-400 mb-1">Total Records</div>
          <div className="text-3xl text-white" style={{ fontWeight: 700 }}>{total}</div>
        </GlassCard>
        <GlassCard className="p-5">
          <div className="text-xs text-slate-400 mb-1">Completed</div>
          <div className="text-3xl text-teal-400" style={{ fontWeight: 700 }}>{completed}</div>
        </GlassCard>
        <GlassCard className="p-5">
          <div className="text-xs text-slate-400 mb-1">Open</div>
          <div className="text-3xl text-amber-400" style={{ fontWeight: 700 }}>{total - completed}</div>
        </GlassCard>
        <GlassCard className="p-5">
          <div className="text-xs text-slate-400 mb-1">Completion Rate</div>
          <div className="text-3xl text-white" style={{ fontWeight: 700 }}>{Math.round((completed / total) * 100)}%</div>
        </GlassCard>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <h3 className="text-sm text-slate-300 mb-4" style={{ fontWeight: 600 }}>Records by Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="status" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
        <GlassCard className="p-6">
          <h3 className="text-sm text-slate-300 mb-4" style={{ fontWeight: 600 }}>Records by Type</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byType}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="type" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* Detailed Breakdown Table */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-700/50 bg-slate-900/50 flex items-center justify-between">
          <h3 className="text-sm text-white" style={{ fontWeight: 600 }}>Detailed Breakdown</h3>
        </div>
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-slate-700/50 text-slate-400">
              <th className="py-3 pl-4" style={{ fontWeight: 600 }}>ID</th>
              <th className="py-3" style={{ fontWeight: 600 }}>Title</th>
              <th className="py-3" style={{ fontWeight: 600 }}>Type</th>
              <th className="py-3" style={{ fontWeight: 600 }}>Status</th>
              <th className="py-3" style={{ fontWeight: 600 }}>Assignee</th>
              <th className="py-3" style={{ fontWeight: 600 }}>Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 text-slate-300">
            {MOCK_WORK_LEDGER.map(w => (
              <tr key={w.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-3 pl-4 font-mono text-teal-400 text-xs">{w.id}</td>
                <td className="py-3">{w.title}</td>
                <td className="py-3 text-slate-400">{w.type}</td>
                <td className="py-3"><Badge variant={w.status === 'Complete' ? 'success' : w.status === 'In Progress' ? 'processing' : 'warning'}>{w.status}</Badge></td>
                <td className="py-3">{w.assignee}</td>
                <td className="py-3 text-slate-400">{w.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>
    </div>
  );
}
