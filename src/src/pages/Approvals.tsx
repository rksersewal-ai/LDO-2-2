import { useState } from "react";
import { GlassCard, Badge, Button } from "../components/ui/Shared";
import { MOCK_APPROVALS } from "../lib/mockExtended";
import {
  CheckSquare,
  X,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router";

const statusVariant = (s: string) => {
  if (s === "Approved") return "success" as const;
  if (s === "Pending") return "warning" as const;
  if (s === "Rejected") return "danger" as const;
  return "default" as const;
};

export default function Approvals() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>("Pending");
  const [selectedApproval, setSelectedApproval] = useState<
    (typeof MOCK_APPROVALS)[0] | null
  >(null);

  const filtered =
    filter === "All"
      ? MOCK_APPROVALS
      : MOCK_APPROVALS.filter((a) => a.status === filter);
  const pendingCount = MOCK_APPROVALS.filter(
    (a) => a.status === "Pending",
  ).length;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-3xl text-white mb-2" style={{ fontWeight: 700 }}>
          Approvals
        </h1>
        <p className="text-slate-400 text-sm">
          Review and action pending approval requests.{" "}
          <span className="text-amber-400" style={{ fontWeight: 600 }}>
            {pendingCount} items awaiting your decision.
          </span>
        </p>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2">
        {["Pending", "Approved", "Rejected", "All"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm transition-colors border ${filter === s ? "bg-teal-500/20 border-teal-500/40 text-teal-300" : "bg-slate-900/50 border-slate-700/50 text-slate-400 hover:text-slate-200"}`}
            style={{ fontWeight: 500 }}
          >
            {s} {s === "Pending" && `(${pendingCount})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-slate-500">
          <CheckSquare className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-lg text-slate-400">No items in this queue</p>
          <p className="text-sm mt-2">All caught up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <GlassCard
              key={a.id}
              className="p-5 hover:border-teal-500/40 cursor-pointer transition-all"
              onClick={() => setSelectedApproval(a)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${a.status === "Pending" ? "bg-amber-500/10 text-amber-400" : a.status === "Approved" ? "bg-teal-500/10 text-teal-400" : "bg-rose-500/10 text-rose-400"}`}
                  >
                    {a.status === "Pending" ? (
                      <Clock className="w-5 h-5" />
                    ) : a.status === "Approved" ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <XCircle className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs text-slate-500 font-mono">
                        {a.id}
                      </span>
                      <Badge variant={statusVariant(a.status)}>
                        {a.status}
                      </Badge>
                      {a.urgency === "High" && (
                        <Badge variant="danger">Urgent</Badge>
                      )}
                    </div>
                    <h3
                      className="text-sm text-slate-200 mb-1"
                      style={{ fontWeight: 600 }}
                    >
                      {a.title}
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>Type: {a.type}</span>
                      <span>By: {a.requester}</span>
                      <span>Due: {a.dueDate}</span>
                    </div>
                  </div>
                </div>
                {a.status === "Pending" && (
                  <div
                    className="flex gap-2 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      className="text-rose-400 hover:bg-rose-500/10 px-3 py-1.5"
                    >
                      Reject
                    </Button>
                    <Button className="px-3 py-1.5">Approve</Button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 mt-3 pl-14 text-xs text-slate-500">
                <span
                  className="flex items-center gap-1 text-teal-400/70 cursor-pointer hover:text-teal-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/documents/${a.linkedDoc}`);
                  }}
                >
                  <FileText className="w-3 h-3" /> {a.linkedDoc}
                </span>
                {a.linkedPL !== "N/A" && (
                  <span
                    className="flex items-center gap-1 text-teal-400/70 cursor-pointer hover:text-teal-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/pl/${a.linkedPL}`);
                    }}
                  >
                    <ArrowRight className="w-3 h-3" /> {a.linkedPL}
                  </span>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Detail Drawer */}
      {selectedApproval && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex justify-end"
          onClick={() => setSelectedApproval(null)}
        >
          <div
            className="w-[480px] bg-slate-900 border-l border-teal-500/20 h-full overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg text-white" style={{ fontWeight: 700 }}>
                Approval Detail
              </h2>
              <button
                onClick={() => setSelectedApproval(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500">ID</label>
                <div className="text-sm text-teal-400 font-mono mt-0.5">
                  {selectedApproval.id}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500">Title</label>
                <div className="text-sm text-slate-200 mt-0.5">
                  {selectedApproval.title}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500">Type</label>
                  <div className="text-sm text-slate-200 mt-0.5">
                    {selectedApproval.type}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Status</label>
                  <div className="mt-0.5">
                    <Badge variant={statusVariant(selectedApproval.status)}>
                      {selectedApproval.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Requester</label>
                  <div className="text-sm text-slate-200 mt-0.5">
                    {selectedApproval.requester}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Due Date</label>
                  <div className="text-sm text-slate-200 mt-0.5">
                    {selectedApproval.dueDate}
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-700/50 pt-4">
                <label className="text-xs text-slate-500">
                  Linked Document
                </label>
                <div
                  className="text-sm text-teal-400 cursor-pointer hover:underline mt-0.5"
                  onClick={() =>
                    navigate(`/documents/${selectedApproval.linkedDoc}`)
                  }
                >
                  {selectedApproval.linkedDoc}
                </div>
              </div>
              {selectedApproval.status === "Pending" && (
                <div className="flex gap-3 pt-4">
                  <Button variant="danger" className="flex-1">
                    Reject
                  </Button>
                  <Button className="flex-1">Approve</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
