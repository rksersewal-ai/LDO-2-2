import { useState } from "react";
import { GlassCard, Badge, Button, Input } from "../components/ui/Shared";
import { MOCK_AUDIT_EXTENDED } from "../lib/mockExtended";
import {
  FileSearch,
  Filter,
  X,
  Shield,
  AlertTriangle,
  Info,
  AlertCircle,
} from "lucide-react";

const severityVariant = (s: string) => {
  if (s === "Critical") return "danger" as const;
  if (s === "Warning") return "warning" as const;
  return "default" as const;
};
const severityIcon = (s: string) => {
  if (s === "Critical")
    return <AlertCircle className="w-3.5 h-3.5 text-rose-400" />;
  if (s === "Warning")
    return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
  return <Info className="w-3.5 h-3.5 text-slate-400" />;
};

export default function AuditLog() {
  const [moduleFilter, setModuleFilter] = useState<string>("All");
  const [severityFilter, setSeverityFilter] = useState<string>("All");
  const [selectedEvent, setSelectedEvent] = useState<
    (typeof MOCK_AUDIT_EXTENDED)[0] | null
  >(null);

  const modules = [
    "All",
    ...Array.from(new Set(MOCK_AUDIT_EXTENDED.map((e) => e.module))),
  ];
  const filtered = MOCK_AUDIT_EXTENDED.filter(
    (e) => moduleFilter === "All" || e.module === moduleFilter,
  ).filter((e) => severityFilter === "All" || e.severity === severityFilter);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-3xl text-white mb-2" style={{ fontWeight: 700 }}>
          Audit Log
        </h1>
        <p className="text-slate-400 text-sm">
          System-wide event traceability and investigation workspace.
        </p>
      </div>

      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <FileSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search events by user, entity, action..."
              className="pl-9 w-full"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="bg-slate-950/50 border border-teal-500/20 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none"
            >
              {modules.map((m) => (
                <option key={m} value={m}>
                  {m === "All" ? "All Modules" : m}
                </option>
              ))}
            </select>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-slate-950/50 border border-teal-500/20 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none"
            >
              <option value="All">All Severities</option>
              <option value="Info">Info</option>
              <option value="Warning">Warning</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-700/50 text-slate-400">
                <th className="pb-3 pl-4" style={{ fontWeight: 600 }}>
                  Event ID
                </th>
                <th className="pb-3" style={{ fontWeight: 600 }}>
                  Severity
                </th>
                <th className="pb-3" style={{ fontWeight: 600 }}>
                  Action
                </th>
                <th className="pb-3" style={{ fontWeight: 600 }}>
                  Module
                </th>
                <th className="pb-3" style={{ fontWeight: 600 }}>
                  User
                </th>
                <th className="pb-3" style={{ fontWeight: 600 }}>
                  Entity
                </th>
                <th className="pb-3" style={{ fontWeight: 600 }}>
                  IP Address
                </th>
                <th className="pb-3" style={{ fontWeight: 600 }}>
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filtered.map((e) => (
                <tr
                  key={e.id}
                  className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedEvent(e)}
                >
                  <td className="py-3 pl-4 font-mono text-xs text-slate-500">
                    {e.id}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-1.5">
                      {severityIcon(e.severity)}
                      <Badge variant={severityVariant(e.severity)}>
                        {e.severity}
                      </Badge>
                    </div>
                  </td>
                  <td className="py-3">
                    <Badge
                      variant={
                        e.action.includes("FAIL") || e.action.includes("DENIED")
                          ? "danger"
                          : e.action.includes("SUCCESS") ||
                              e.action === "CREATE"
                            ? "success"
                            : e.action === "UPDATE" ||
                                e.action === "APPROVAL_REQ"
                              ? "warning"
                              : "default"
                      }
                    >
                      {e.action}
                    </Badge>
                  </td>
                  <td className="py-3 text-slate-400">{e.module}</td>
                  <td
                    className="py-3 text-teal-400"
                    style={{ fontWeight: 500 }}
                  >
                    {e.user}
                  </td>
                  <td className="py-3 text-slate-300 font-mono text-xs">
                    {e.entity}
                  </td>
                  <td className="py-3 font-mono text-xs text-slate-500">
                    {e.ip}
                  </td>
                  <td className="py-3 text-slate-400 text-xs">{e.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-slate-500">
            No audit events match the current filters.
          </div>
        )}
      </GlassCard>

      {/* Event Detail Drawer */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex justify-end"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="w-[440px] bg-slate-900 border-l border-teal-500/20 h-full overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg text-white" style={{ fontWeight: 700 }}>
                Event Detail
              </h2>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500">Event ID</label>
                <div className="text-sm font-mono text-slate-300 mt-0.5">
                  {selectedEvent.id}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500">Action</label>
                  <div className="mt-0.5">
                    <Badge variant="default">{selectedEvent.action}</Badge>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Severity</label>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    {severityIcon(selectedEvent.severity)}
                    <Badge variant={severityVariant(selectedEvent.severity)}>
                      {selectedEvent.severity}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Module</label>
                  <div className="text-sm text-slate-200 mt-0.5">
                    {selectedEvent.module}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500">User</label>
                  <div className="text-sm text-teal-400 mt-0.5">
                    {selectedEvent.user}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500">Entity</label>
                <div className="text-sm text-slate-300 font-mono mt-0.5">
                  {selectedEvent.entity}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500">IP Address</label>
                <div className="text-sm text-slate-300 font-mono mt-0.5">
                  {selectedEvent.ip}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500">Timestamp</label>
                <div className="text-sm text-slate-300 mt-0.5">
                  {selectedEvent.time}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
