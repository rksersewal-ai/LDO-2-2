import { GlassCard, Badge, Button, Input } from "../components/ui/Shared";
import { MOCK_PL_RECORDS } from "../lib/mock";
import { PL_DATABASE } from "../lib/bomData";
import {
  Search,
  Filter,
  DatabaseBackup,
  ArrowRight,
  Layers,
  FileText,
  Component,
  Box,
  Cpu,
  Shield,
  Hash,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useState } from "react";

function NodeIcon({
  type,
  className = "w-5 h-5",
}: {
  type: string;
  className?: string;
}) {
  if (type === "assembly")
    return <Box className={`${className} text-blue-400`} />;
  if (type === "sub-assembly")
    return <Layers className={`${className} text-indigo-400`} />;
  return <Cpu className={`${className} text-slate-400`} />;
}

export default function PLKnowledgeHub() {
  const navigate = useNavigate();
  const [view, setView] = useState<"bom" | "legacy">("bom");

  // Convert PL_DATABASE to array
  const bomPLRecords = Object.values(PL_DATABASE);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl text-white mb-2" style={{ fontWeight: 700 }}>
            PL Knowledge Hub
          </h1>
          <p className="text-slate-400 text-sm">
            Central repository for Product Lifecycle records — all items
            identified by 8-digit PL number.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-slate-700/50 overflow-hidden">
            <button
              onClick={() => setView("bom")}
              className={`px-3 py-1.5 text-xs transition-colors ${view === "bom" ? "bg-teal-500/15 text-teal-300" : "text-slate-500 hover:text-slate-300"}`}
            >
              BOM PL Records ({bomPLRecords.length})
            </button>
            <button
              onClick={() => setView("legacy")}
              className={`px-3 py-1.5 text-xs transition-colors ${view === "legacy" ? "bg-teal-500/15 text-teal-300" : "text-slate-500 hover:text-slate-300"}`}
            >
              Legacy Records ({MOCK_PL_RECORDS.length})
            </button>
          </div>
          <Button>Create PL Record</Button>
        </div>
      </div>

      <GlassCard className="p-6">
        <div className="flex items-center gap-4 mb-8">
          <div className="relative flex-1 max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-500" />
            <Input
              placeholder="Search PL records by ID, description, or linked entities..."
              className="pl-12 w-full py-3 text-lg bg-slate-900/80"
            />
          </div>
          <Button variant="secondary" className="py-3">
            <Filter className="w-5 h-5" /> Advanced Filters
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar: Quick Filters */}
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                Lifecycle State
              </h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-slate-600 bg-slate-900 text-teal-500"
                    defaultChecked
                  />
                  Active / Production (1)
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-slate-600 bg-slate-900 text-teal-500"
                    defaultChecked
                  />
                  In Development (1)
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-slate-600 bg-slate-900 text-teal-500"
                  />
                  Obsolete / EOL (1)
                </label>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                Record Owner
              </h3>
              <div className="space-y-2">
                <div className="text-sm text-teal-400 hover:underline cursor-pointer">
                  My Records (0)
                </div>
                <div className="text-sm text-slate-400 hover:text-slate-300 cursor-pointer">
                  Engineering Dept (2)
                </div>
                <div className="text-sm text-slate-400 hover:text-slate-300 cursor-pointer">
                  Quality Assurance (1)
                </div>
              </div>
            </div>
          </div>

          {/* Right Area: Results List */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-400">
                Showing{" "}
                {view === "bom" ? bomPLRecords.length : MOCK_PL_RECORDS.length}{" "}
                records
              </span>
              <div className="text-sm text-slate-400 flex items-center gap-2">
                Sort by:{" "}
                <span
                  className="text-teal-400 cursor-pointer"
                  style={{ fontWeight: 500 }}
                >
                  Recently Updated
                </span>
              </div>
            </div>

            {view === "bom" ? (
              <>
                {bomPLRecords.map((record) => (
                  <div
                    key={record.plNumber}
                    onClick={() => navigate(`/pl/${record.plNumber}`)}
                    className="bg-slate-900/50 border border-slate-700/50 hover:border-teal-500/50 rounded-xl p-5 cursor-pointer transition-all hover:bg-slate-800/50 group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-teal-900/30 text-teal-400 flex items-center justify-center shrink-0">
                          <NodeIcon type={record.type} />
                        </div>
                        <div>
                          <h3
                            className="text-lg text-slate-200 group-hover:text-teal-300 transition-colors"
                            style={{ fontWeight: 600 }}
                          >
                            {record.name}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                            <code className="font-mono text-teal-400/80 text-xs">
                              PL {record.plNumber}
                            </code>
                            <span>•</span>
                            <span>{record.lifecycleState}</span>
                            <span>•</span>
                            <span>{record.department}</span>
                            {record.safetyVital && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-rose-400">
                                  <Shield className="w-3 h-3" /> Safety Vital
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant={
                          record.lifecycleState === "Production" ||
                          record.lifecycleState === "Active"
                            ? "success"
                            : record.lifecycleState === "End of Life" ||
                                record.lifecycleState === "Obsolete"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {record.lifecycleState}
                      </Badge>
                    </div>

                    <p className="text-sm text-slate-400 mt-3 mb-4 line-clamp-2 pl-13">
                      {record.description}
                    </p>

                    <div className="flex items-center gap-6 pl-13 pt-4 border-t border-slate-800">
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <FileText className="w-4 h-4 text-slate-500" />
                        <span
                          className="text-slate-300"
                          style={{ fontWeight: 500 }}
                        >
                          {record.linkedDocuments.length}
                        </span>{" "}
                        Docs
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Component className="w-4 h-4 text-slate-500" />
                        <span
                          className="text-slate-300"
                          style={{ fontWeight: 500 }}
                        >
                          {record.linkedDrawings.length}
                        </span>{" "}
                        Drawings
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Layers className="w-4 h-4 text-slate-500" />
                        <span
                          className="text-slate-300"
                          style={{ fontWeight: 500 }}
                        >
                          {record.whereUsed.length}
                        </span>{" "}
                        Where Used
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <span
                          className="text-slate-300"
                          style={{ fontWeight: 500 }}
                        >
                          Rev {record.revision}
                        </span>
                      </div>
                      <div className="ml-auto flex items-center text-sm text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        View Record <ArrowRight className="w-4 h-4 ml-1" />
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <>
                {MOCK_PL_RECORDS.map((record) => (
                  <div
                    key={record.id}
                    onClick={() => navigate(`/pl/${record.id}`)}
                    className="bg-slate-900/50 border border-slate-700/50 hover:border-teal-500/50 rounded-xl p-5 cursor-pointer transition-all hover:bg-slate-800/50 group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-teal-900/30 text-teal-400 flex items-center justify-center shrink-0">
                          <DatabaseBackup className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-200 group-hover:text-teal-300 transition-colors">
                            {record.title}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                            <span className="font-mono text-teal-400/80">
                              {record.id}
                            </span>
                            <span>•</span>
                            <span>{record.lifecycle}</span>
                            <span>•</span>
                            <span>Owner: {record.owner}</span>
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant={
                          record.status === "Active"
                            ? "success"
                            : record.status === "Obsolete"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {record.status}
                      </Badge>
                    </div>

                    <p className="text-sm text-slate-400 mt-4 mb-4 line-clamp-2 pl-13">
                      {record.description}
                    </p>

                    <div className="flex items-center gap-6 pl-13 pt-4 border-t border-slate-800">
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <FileText className="w-4 h-4 text-slate-500" />
                        <span className="font-medium text-slate-300">
                          {record.linkedDocs.length}
                        </span>{" "}
                        Linked Docs
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Component className="w-4 h-4 text-slate-500" />
                        <span className="font-medium text-slate-300">
                          {record.linkedBOMs.length}
                        </span>{" "}
                        BOM Nodes
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Layers className="w-4 h-4 text-slate-500" />
                        <span className="font-medium text-slate-300">
                          {record.ledgerEntries}
                        </span>{" "}
                        Ledger Entries
                      </div>
                      <div className="ml-auto flex items-center text-sm text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        View Record <ArrowRight className="w-4 h-4 ml-1" />
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
