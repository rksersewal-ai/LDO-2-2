import { useState } from "react";
import { GlassCard, Badge, Button, Input } from "../components/ui/Shared";
import { MOCK_CASES } from "../lib/mockExtended";
import {
  ShieldAlert,
  Filter,
  FileSearch,
  FileText,
  ArrowLeft,
  X,
  Clock,
  User,
  Calendar,
  Link as LinkIcon,
} from "lucide-react";
import { useNavigate } from "react-router";

const statusVariant = (s: string) => {
  if (s === "Closed") return "success";
  if (s === "Open") return "danger";
  if (s === "In Progress") return "warning";
  return "default";
};

export default function Cases() {
  const navigate = useNavigate();
  const [selectedCase, setSelectedCase] = useState<
    (typeof MOCK_CASES)[0] | null
  >(null);

  if (selectedCase) {
    return (
      <div className="space-y-6 max-w-[1200px] mx-auto">
        <div className="flex items-center gap-4 mb-2">
          <Button
            variant="ghost"
            className="px-2"
            onClick={() => setSelectedCase(null)}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <h1 className="text-2xl text-white" style={{ fontWeight: 700 }}>
                {selectedCase.title}
              </h1>
              <Badge variant={statusVariant(selectedCase.status)}>
                {selectedCase.status}
              </Badge>
              <Badge
                variant={
                  selectedCase.severity === "High"
                    ? "danger"
                    : selectedCase.severity === "Medium"
                      ? "warning"
                      : "default"
                }
              >
                {selectedCase.severity}
              </Badge>
            </div>
            <p className="text-sm text-slate-400 mt-1 font-mono pl-8">
              {selectedCase.id} • Updated {selectedCase.updated}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <GlassCard className="p-6">
              <h2
                className="text-lg text-white mb-4"
                style={{ fontWeight: 700 }}
              >
                Case Description
              </h2>
              <p className="text-slate-300 leading-relaxed">
                {selectedCase.description}
              </p>
            </GlassCard>

            <GlassCard className="p-6">
              <h2
                className="text-lg text-white mb-4"
                style={{ fontWeight: 700 }}
              >
                Linked Documents
              </h2>
              {selectedCase.linkedDocs.length > 0 ? (
                <div className="space-y-2">
                  {selectedCase.linkedDocs.map((docId) => (
                    <div
                      key={docId}
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 border border-slate-700/50 hover:border-teal-500/30 cursor-pointer transition-colors"
                      onClick={() => navigate(`/documents/${docId}`)}
                    >
                      <FileText className="w-4 h-4 text-teal-500" />
                      <span className="text-sm text-teal-400 font-mono">
                        {docId}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  No documents linked to this case.
                </p>
              )}
            </GlassCard>

            <GlassCard className="p-6">
              <h2
                className="text-lg text-white mb-4"
                style={{ fontWeight: 700 }}
              >
                Timeline
              </h2>
              <div className="space-y-4 relative border-l-2 border-slate-700/50 ml-4 pl-6">
                <div>
                  <div
                    className="absolute -left-[9px] w-4 h-4 rounded-full bg-teal-500 border-2 border-slate-900"
                    style={{ marginTop: 2 }}
                  ></div>
                  <div className="text-xs text-slate-500">
                    {selectedCase.created}
                  </div>
                  <div className="text-sm text-slate-300">
                    Case created by {selectedCase.assignee}
                  </div>
                </div>
                <div>
                  <div
                    className="absolute -left-[9px] w-4 h-4 rounded-full bg-amber-500 border-2 border-slate-900"
                    style={{ marginTop: 2 }}
                  ></div>
                  <div className="text-xs text-slate-500">
                    {selectedCase.updated}
                  </div>
                  <div className="text-sm text-slate-300">
                    Status updated to {selectedCase.status}
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          <div className="space-y-6">
            <GlassCard className="p-5">
              <h3
                className="text-xs text-slate-500 uppercase tracking-widest mb-4"
                style={{ fontWeight: 700 }}
              >
                Case Metadata
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 flex items-center gap-1">
                    <User className="w-3 h-3" /> Assignee
                  </label>
                  <div className="text-sm text-slate-200 mt-0.5">
                    {selectedCase.assignee}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Created
                  </label>
                  <div className="text-sm text-slate-200 mt-0.5">
                    {selectedCase.created}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 flex items-center gap-1">
                    <LinkIcon className="w-3 h-3" /> Linked PL
                  </label>
                  <div
                    className="text-sm text-teal-400 mt-0.5 cursor-pointer hover:underline"
                    onClick={() => navigate(`/pl/${selectedCase.linkedPL}`)}
                  >
                    {selectedCase.linkedPL}
                  </div>
                </div>
              </div>
            </GlassCard>
            <div className="flex flex-col gap-2">
              {selectedCase.status !== "Closed" && (
                <Button className="w-full">Resolve Case</Button>
              )}
              <Button variant="secondary" className="w-full">
                Add Comment
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl text-white mb-2" style={{ fontWeight: 700 }}>
            Cases
          </h1>
          <p className="text-slate-400 text-sm">
            Track issues, discrepancies, and resolution workflows.
          </p>
        </div>
        <Button>
          <ShieldAlert className="w-4 h-4" /> Open New Case
        </Button>
      </div>

      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <FileSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input placeholder="Search cases..." className="pl-9 w-full" />
          </div>
          <Button variant="secondary">
            <Filter className="w-4 h-4" /> Filters
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-700/50 text-slate-400">
                <th className="pb-3 pl-4" style={{ fontWeight: 600 }}>
                  Case ID
                </th>
                <th className="pb-3" style={{ fontWeight: 600 }}>
                  Title
                </th>
                <th className="pb-3" style={{ fontWeight: 600 }}>
                  Status
                </th>
                <th className="pb-3" style={{ fontWeight: 600 }}>
                  Severity
                </th>
                <th className="pb-3" style={{ fontWeight: 600 }}>
                  Assignee
                </th>
                <th className="pb-3" style={{ fontWeight: 600 }}>
                  Linked PL
                </th>
                <th className="pb-3" style={{ fontWeight: 600 }}>
                  Updated
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {MOCK_CASES.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-slate-800/30 transition-colors cursor-pointer group"
                  onClick={() => setSelectedCase(c)}
                >
                  <td className="py-4 pl-4 font-mono text-teal-400 group-hover:text-teal-300">
                    {c.id}
                  </td>
                  <td className="py-4 text-slate-200">{c.title}</td>
                  <td className="py-4">
                    <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                  </td>
                  <td className="py-4">
                    <Badge
                      variant={
                        c.severity === "High"
                          ? "danger"
                          : c.severity === "Medium"
                            ? "warning"
                            : "default"
                      }
                    >
                      {c.severity}
                    </Badge>
                  </td>
                  <td className="py-4 text-slate-300">{c.assignee}</td>
                  <td className="py-4 text-teal-400">{c.linkedPL}</td>
                  <td className="py-4 text-slate-400">{c.updated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
