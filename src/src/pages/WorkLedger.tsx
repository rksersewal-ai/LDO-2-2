import { useState } from 'react';
import { GlassCard, Badge, Button, Input } from '../components/ui/Shared';
import { MOCK_WORK_LEDGER } from '../lib/mockExtended';
import { Plus, Filter, FileSearch, Briefcase, ChevronRight, X } from 'lucide-react';
import { useNavigate } from 'react-router';

const statusVariant = (s: string) => {
  if (s === 'Complete') return 'success';
  if (s === 'In Progress') return 'processing';
  if (s === 'Pending' || s === 'Pending Verification') return 'warning';
  return 'default';
};

export default function WorkLedger() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedWork, setSelectedWork] = useState<typeof MOCK_WORK_LEDGER[0] | null>(null);

  const filtered = MOCK_WORK_LEDGER.filter(w => !statusFilter || w.status === statusFilter);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl text-white mb-2" style={{ fontWeight: 700 }}>Work Ledger</h1>
          <p className="text-slate-400 text-sm">Track, create, and manage work records across the organization.</p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> New Work Record</Button>
      </div>

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <FileSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input placeholder="Filter by ID, title, assignee..." className="pl-9 w-full" />
          </div>
          <Button variant="secondary"><Filter className="w-4 h-4" /> Filters</Button>
          <div className="flex gap-2 ml-auto">
            {['Complete', 'In Progress', 'Pending', 'Pending Verification'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(statusFilter === s ? null : s)}
                className={`px-3 py-1 rounded-lg text-xs border transition-colors ${statusFilter === s ? 'bg-teal-500/20 border-teal-500/40 text-teal-300' : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-slate-200'}`}
                style={{ fontWeight: 500 }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-700/50 text-slate-400">
                <th className="pb-3 pl-4" style={{ fontWeight: 600 }}>Work ID</th>
                <th className="pb-3" style={{ fontWeight: 600 }}>Title</th>
                <th className="pb-3" style={{ fontWeight: 600 }}>Type</th>
                <th className="pb-3" style={{ fontWeight: 600 }}>Status</th>
                <th className="pb-3" style={{ fontWeight: 600 }}>Assignee</th>
                <th className="pb-3" style={{ fontWeight: 600 }}>Linked PL</th>
                <th className="pb-3" style={{ fontWeight: 600 }}>Priority</th>
                <th className="pb-3" style={{ fontWeight: 600 }}>Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filtered.map(w => (
                <tr key={w.id} className="hover:bg-slate-800/30 transition-colors cursor-pointer group" onClick={() => setSelectedWork(w)}>
                  <td className="py-4 pl-4 font-mono text-teal-400 group-hover:text-teal-300">{w.id}</td>
                  <td className="py-4 text-slate-200 flex items-center gap-2"><Briefcase className="w-4 h-4 text-slate-500" />{w.title}</td>
                  <td className="py-4 text-slate-400">{w.type}</td>
                  <td className="py-4"><Badge variant={statusVariant(w.status)}>{w.status}</Badge></td>
                  <td className="py-4 text-slate-300">{w.assignee}</td>
                  <td className="py-4">{w.linkedPL !== 'N/A' ? <span className="text-teal-400 hover:underline" onClick={(e) => { e.stopPropagation(); navigate(`/pl/${w.linkedPL}`); }}>{w.linkedPL}</span> : <span className="text-slate-600">N/A</span>}</td>
                  <td className="py-4"><Badge variant={w.priority === 'High' ? 'danger' : w.priority === 'Normal' ? 'default' : 'success'}>{w.priority}</Badge></td>
                  <td className="py-4 text-slate-400">{w.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-slate-500">No work records match the current filter.</div>
        )}
      </GlassCard>

      {/* Work Detail Side Panel */}
      {selectedWork && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={() => setSelectedWork(null)}>
          <div className="w-[480px] bg-slate-900 border-l border-teal-500/20 h-full overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg text-white" style={{ fontWeight: 700 }}>Work Record Detail</h2>
              <button onClick={() => setSelectedWork(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-5">
              <div>
                <label className="text-xs text-slate-500">Work ID</label>
                <div className="text-sm text-teal-400 font-mono mt-0.5">{selectedWork.id}</div>
              </div>
              <div>
                <label className="text-xs text-slate-500">Title</label>
                <div className="text-sm text-slate-200 mt-0.5">{selectedWork.title}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-slate-500">Type</label><div className="text-sm text-slate-200 mt-0.5">{selectedWork.type}</div></div>
                <div><label className="text-xs text-slate-500">Status</label><div className="mt-0.5"><Badge variant={statusVariant(selectedWork.status)}>{selectedWork.status}</Badge></div></div>
                <div><label className="text-xs text-slate-500">Assignee</label><div className="text-sm text-slate-200 mt-0.5">{selectedWork.assignee}</div></div>
                <div><label className="text-xs text-slate-500">Priority</label><div className="mt-0.5"><Badge variant={selectedWork.priority === 'High' ? 'danger' : 'default'}>{selectedWork.priority}</Badge></div></div>
              </div>
              <div className="border-t border-slate-700/50 pt-4">
                <label className="text-xs text-slate-500">Linked PL</label>
                <div className="text-sm text-teal-400 cursor-pointer hover:underline mt-0.5" onClick={() => navigate(`/pl/${selectedWork.linkedPL}`)}>{selectedWork.linkedPL}</div>
              </div>
              <div>
                <label className="text-xs text-slate-500">Linked Document</label>
                <div className="text-sm text-teal-400 cursor-pointer hover:underline mt-0.5" onClick={() => navigate(`/documents/${selectedWork.linkedDoc}`)}>{selectedWork.linkedDoc}</div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="secondary" className="flex-1">Edit Record</Button>
                {selectedWork.status === 'Pending Verification' && <Button className="flex-1">Verify & Close</Button>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowForm(false)}>
          <GlassCard className="w-full max-w-lg p-6" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg text-white" style={{ fontWeight: 700 }}>Create Work Record</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm text-slate-300 mb-1">Title</label><Input className="w-full" placeholder="Work record title" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-slate-300 mb-1">Type</label>
                  <select className="w-full bg-slate-950/50 border border-teal-500/20 text-slate-200 text-sm rounded-xl px-4 py-2 focus:outline-none">
                    <option>Inspection</option><option>Calibration</option><option>Review</option><option>Reporting</option><option>Audit</option>
                  </select>
                </div>
                <div><label className="block text-sm text-slate-300 mb-1">Priority</label>
                  <select className="w-full bg-slate-950/50 border border-teal-500/20 text-slate-200 text-sm rounded-xl px-4 py-2 focus:outline-none">
                    <option>Normal</option><option>High</option><option>Low</option>
                  </select>
                </div>
              </div>
              <div><label className="block text-sm text-slate-300 mb-1">Linked PL</label><Input className="w-full" placeholder="e.g. PL-55092" /></div>
              <div><label className="block text-sm text-slate-300 mb-1">Linked Document</label><Input className="w-full" placeholder="e.g. DOC-2026-9021" /></div>
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button className="flex-1" onClick={() => setShowForm(false)}>Create Record</Button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
