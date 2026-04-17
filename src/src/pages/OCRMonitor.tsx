import { useState } from "react";
import { GlassCard, Badge, Button } from "../components/ui/Shared";
import { MOCK_OCR_JOBS } from "../lib/mockExtended";
import {
  ServerCog,
  RefreshCw,
  FileText,
  X,
  CheckCircle,
  Clock,
  XCircle,
  SkipForward,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router";

const statusIcon = (s: string) => {
  if (s === "Completed")
    return <CheckCircle className="w-4 h-4 text-teal-500" />;
  if (s === "Processing")
    return <Clock className="w-4 h-4 text-blue-400 animate-pulse" />;
  if (s === "Failed") return <XCircle className="w-4 h-4 text-rose-500" />;
  return <SkipForward className="w-4 h-4 text-slate-500" />;
};
const statusVariant = (s: string) => {
  if (s === "Completed") return "success" as const;
  if (s === "Processing") return "processing" as const;
  if (s === "Failed") return "danger" as const;
  return "default" as const;
};

export default function OCRMonitor() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>("All");
  const [selectedJob, setSelectedJob] = useState<
    (typeof MOCK_OCR_JOBS)[0] | null
  >(null);

  const filtered =
    filter === "All"
      ? MOCK_OCR_JOBS
      : MOCK_OCR_JOBS.filter((j) => j.status === filter);
  const completed = MOCK_OCR_JOBS.filter(
    (j) => j.status === "Completed",
  ).length;
  const failed = MOCK_OCR_JOBS.filter((j) => j.status === "Failed").length;
  const processing = MOCK_OCR_JOBS.filter(
    (j) => j.status === "Processing",
  ).length;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-3xl text-white mb-2" style={{ fontWeight: 700 }}>
          OCR Monitor
        </h1>
        <p className="text-slate-400 text-sm">
          Pipeline monitoring, job tracking, and extraction oversight.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <GlassCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-teal-500/10 text-teal-400 flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Completed</div>
            <div className="text-xl text-white" style={{ fontWeight: 700 }}>
              {completed}
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Processing</div>
            <div className="text-xl text-white" style={{ fontWeight: 700 }}>
              {processing}
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Failed</div>
            <div className="text-xl text-white" style={{ fontWeight: 700 }}>
              {failed}
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <ServerCog className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Engine</div>
            <div
              className="text-sm text-white flex items-center gap-2"
              style={{ fontWeight: 700 }}
            >
              Online{" "}
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {["All", "Completed", "Processing", "Failed", "Skipped"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${filter === s ? "bg-teal-500/20 border-teal-500/40 text-teal-300" : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-slate-200"}`}
            style={{ fontWeight: 500 }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Jobs Table */}
      <GlassCard className="p-0 overflow-hidden">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-slate-700/50 text-slate-400 bg-slate-900/50">
              <th className="py-3 pl-4" style={{ fontWeight: 600 }}>
                Job ID
              </th>
              <th className="py-3" style={{ fontWeight: 600 }}>
                Document
              </th>
              <th className="py-3" style={{ fontWeight: 600 }}>
                Status
              </th>
              <th className="py-3" style={{ fontWeight: 600 }}>
                Confidence
              </th>
              <th className="py-3" style={{ fontWeight: 600 }}>
                Pages
              </th>
              <th className="py-3" style={{ fontWeight: 600 }}>
                Refs Found
              </th>
              <th className="py-3" style={{ fontWeight: 600 }}>
                Started
              </th>
              <th className="py-3 pr-4" style={{ fontWeight: 600 }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filtered.map((j) => (
              <tr
                key={j.id}
                className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                onClick={() => setSelectedJob(j)}
              >
                <td className="py-3 pl-4 font-mono text-xs text-slate-500">
                  {j.id}
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span
                      className="text-teal-400 hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/documents/${j.document}`);
                      }}
                    >
                      {j.document}
                    </span>
                  </div>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-1.5">
                    {statusIcon(j.status)}
                    <Badge variant={statusVariant(j.status)}>{j.status}</Badge>
                  </div>
                </td>
                <td className="py-3">
                  {j.confidence !== null ? (
                    <span
                      className={
                        j.confidence > 90
                          ? "text-teal-400"
                          : j.confidence > 50
                            ? "text-amber-400"
                            : "text-rose-400"
                      }
                    >
                      {j.confidence}%
                    </span>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
                <td className="py-3 text-slate-400">{j.pages}</td>
                <td className="py-3 text-slate-400">{j.extractedRefs}</td>
                <td className="py-3 text-slate-400 text-xs">
                  {j.startTime || "—"}
                </td>
                <td className="py-3 pr-4" onClick={(e) => e.stopPropagation()}>
                  {(j.status === "Failed" || j.status === "Completed") && (
                    <Button variant="ghost" className="text-xs px-2 py-1">
                      <RefreshCw className="w-3 h-3" /> Rerun
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-slate-500">
            No jobs match this filter.
          </div>
        )}
      </GlassCard>

      {/* Job Detail Drawer */}
      {selectedJob && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex justify-end"
          onClick={() => setSelectedJob(null)}
        >
          <div
            className="w-[480px] bg-slate-900 border-l border-teal-500/20 h-full overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg text-white" style={{ fontWeight: 700 }}>
                OCR Job Detail
              </h2>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500">Job ID</label>
                <div className="text-sm font-mono text-slate-300 mt-0.5">
                  {selectedJob.id}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500">
                  Source Document
                </label>
                <div
                  className="text-sm text-teal-400 cursor-pointer hover:underline mt-0.5"
                  onClick={() => navigate(`/documents/${selectedJob.document}`)}
                >
                  {selectedJob.document}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500">Filename</label>
                <div className="text-sm text-slate-300 mt-0.5">
                  {selectedJob.filename}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500">Status</label>
                  <div className="mt-0.5">
                    <Badge variant={statusVariant(selectedJob.status)}>
                      {selectedJob.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Confidence</label>
                  <div className="text-sm mt-0.5">
                    {selectedJob.confidence !== null
                      ? `${selectedJob.confidence}%`
                      : "—"}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500">
                    Pages Processed
                  </label>
                  <div className="text-sm text-slate-300 mt-0.5">
                    {selectedJob.pages}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500">
                    References Found
                  </label>
                  <div className="text-sm text-slate-300 mt-0.5">
                    {selectedJob.extractedRefs}
                  </div>
                </div>
              </div>
              {selectedJob.startTime && (
                <div>
                  <label className="text-xs text-slate-500">Start Time</label>
                  <div className="text-sm text-slate-300 mt-0.5">
                    {selectedJob.startTime}
                  </div>
                </div>
              )}
              {selectedJob.endTime && (
                <div>
                  <label className="text-xs text-slate-500">End Time</label>
                  <div className="text-sm text-slate-300 mt-0.5">
                    {selectedJob.endTime}
                  </div>
                </div>
              )}
              {(selectedJob as any).failureReason && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                  <div
                    className="flex items-center gap-2 text-rose-400 text-sm mb-1"
                    style={{ fontWeight: 600 }}
                  >
                    <AlertCircle className="w-4 h-4" /> Failure Reason
                  </div>
                  <p className="text-xs text-rose-300/80">
                    {(selectedJob as any).failureReason}
                  </p>
                </div>
              )}
              <div className="pt-4">
                <Button className="w-full">
                  <RefreshCw className="w-4 h-4" /> Rerun Extraction
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
