import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Activity,
  ArrowRight,
  CopyCheck,
  Database,
  FileSearch,
  Layers3,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import {
  Badge,
  Button,
  GlassCard,
  Input,
  PageHeader,
} from "../components/ui/Shared";
import { useToast } from "../contexts/ToastContext";
import apiClient, { ApiClient } from "../services/ApiClient";
import type {
  InitialRunActionResult,
  InitialRunJobSummary,
  InitialRunSourceDetail,
  InitialRunSummary,
} from "../lib/types";

type InitialRunAction =
  | "index_sources"
  | "backfill_hashes"
  | "refresh_deduplication"
  | "queue_pending_ocr";

const ACTION_ORDER: Array<{
  action: InitialRunAction;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "primary" | "secondary";
}> = [
  {
    action: "index_sources",
    title: "Index active sources",
    description:
      "Walk every active file source and create EDMS records only for files not already represented when skip mode is enabled.",
    icon: Layers3,
  },
  {
    action: "backfill_hashes",
    title: "Calculate hashes",
    description:
      "Backfill sparse fingerprints and, when enabled, full SHA-256 hashes so later dedup decisions are based on stable content identity.",
    icon: Database,
    variant: "secondary",
  },
  {
    action: "refresh_deduplication",
    title: "Refresh dedup engine",
    description:
      "Re-evaluate documents that still need duplicate grouping or are stuck on sparse-only groups after hashing.",
    icon: CopyCheck,
    variant: "secondary",
  },
  {
    action: "queue_pending_ocr",
    title: "Queue OCR backlog",
    description:
      "Queue OCR only for documents still marked Not Started or Failed, leaving completed and already-processing items untouched.",
    icon: FileSearch,
    variant: "secondary",
  },
];

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusVariant(status: string) {
  if (status === "COMPLETED") return "success" as const;
  if (status === "RUNNING") return "processing" as const;
  if (status === "FAILED") return "danger" as const;
  return "warning" as const;
}

function JobTable({
  title,
  jobs,
  emptyLabel,
}: {
  title: string;
  jobs: InitialRunJobSummary[];
  emptyLabel: string;
}) {
  return (
    <GlassCard className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <span className="text-xs text-muted-foreground">
          Latest {jobs.length}
        </span>
      </div>
      <div className="divide-y divide-border/60">
        {jobs.length === 0 && (
          <div className="px-5 py-10 text-sm text-muted-foreground">
            {emptyLabel}
          </div>
        )}
        {jobs.map((job) => (
          <div
            key={job.id}
            className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1.2fr)_auto_minmax(0,1fr)]"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {job.source_name || "All indexed sources"}
              </p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                {job.id}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={statusVariant(job.status)}>{job.status}</Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              <div>
                Started: {formatDateTime(job.started_at || job.created_at)}
              </div>
              <div>Finished: {formatDateTime(job.completed_at)}</div>
              {"indexed_count" in job && job.indexed_count != null && (
                <div>
                  Indexed {job.indexed_count} / discovered{" "}
                  {job.discovered_count ?? 0}
                </div>
              )}
              {"documents_indexed" in job && job.documents_indexed != null && (
                <div>
                  Indexed {job.documents_indexed} / scanned{" "}
                  {job.documents_scanned ?? 0}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function SourceInventoryTable({
  sources,
}: {
  sources: InitialRunSourceDetail[];
}) {
  return (
    <GlassCard className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Active Source Inventory
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            The initial crawl discovers files from these roots and creates or
            refreshes `IndexedSourceFileState` records.
          </p>
        </div>
        <Badge variant="info">{sources.length} active sources</Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border/70 bg-secondary/20 text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">Source</th>
              <th className="px-5 py-3 font-medium">Tracked</th>
              <th className="px-5 py-3 font-medium">Indexed Docs</th>
              <th className="px-5 py-3 font-medium">Issues</th>
              <th className="px-5 py-3 font-medium">Last Crawl</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {sources.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-12 text-sm text-muted-foreground"
                >
                  No active indexed sources are configured yet.
                </td>
              </tr>
            )}
            {sources.map((source) => (
              <tr key={source.id}>
                <td className="px-5 py-4 align-top">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {source.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {source.source_system}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                      {source.root_path}
                    </p>
                  </div>
                </td>
                <td className="px-5 py-4 align-top">
                  <div className="text-xs text-muted-foreground">
                    <div>{source.tracked_files} tracked files</div>
                    <div>{source.active_files} active</div>
                  </div>
                </td>
                <td className="px-5 py-4 align-top text-xs text-muted-foreground">
                  {source.indexed_documents}
                </td>
                <td className="px-5 py-4 align-top">
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={source.missing_files > 0 ? "warning" : "success"}
                    >
                      Missing {source.missing_files}
                    </Badge>
                    <Badge
                      variant={source.failed_files > 0 ? "danger" : "success"}
                    >
                      Failed {source.failed_files}
                    </Badge>
                  </div>
                  {source.last_error && (
                    <p className="mt-2 max-w-md text-xs text-amber-300">
                      {source.last_error}
                    </p>
                  )}
                </td>
                <td className="px-5 py-4 align-top text-xs text-muted-foreground">
                  <div>{formatDateTime(source.last_crawled_at)}</div>
                  <div>
                    Successful:{" "}
                    {formatDateTime(source.last_successful_crawl_at)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

export default function AdminInitialRun() {
  const navigate = useNavigate();
  const { showError, showSuccess, showInfo } = useToast();
  const [summary, setSummary] = useState<InitialRunSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [runningAction, setRunningAction] = useState<InitialRunAction | null>(
    null,
  );
  const [skipIndexed, setSkipIndexed] = useState(true);
  const [forceFullHash, setForceFullHash] = useState(false);
  const [batchSize, setBatchSize] = useState("");

  const fetchSummary = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const payload = await apiClient.getInitialRunSummary();
      setSummary(payload);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to load initial-run summary.";
      showError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showError]);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  const resolvedBatchSize = useMemo(() => {
    const parsed = Number(batchSize);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }, [batchSize]);

  const actionMetrics = useMemo(() => {
    if (!summary) return null;
    return {
      index_sources: {
        primary: `${summary.sources.active_sources} sources`,
        secondary: `${summary.sources.tracked_files} tracked files on record`,
        hint: skipIndexed
          ? "Already active and indexed file states are skipped."
          : "Every discovered file will be re-evaluated.",
      },
      backfill_hashes: {
        primary: `${summary.documents.missing_sparse_hash} sparse hash gaps`,
        secondary: `${summary.documents.missing_full_hash} full hash gaps`,
        hint: forceFullHash
          ? "This run will force full SHA-256 for every targeted document."
          : "Full hashes will follow the existing high-value policy.",
      },
      refresh_deduplication: {
        primary: `${summary.documents.pending_dedup} docs need dedup refresh`,
        secondary: `${summary.documents.duplicate_groups} duplicate groups already detected`,
        hint: "Use after indexing and hashing so group keys can settle on the newest content identity.",
      },
      queue_pending_ocr: {
        primary: `${summary.documents.pending_ocr} pending OCR docs`,
        secondary: `${summary.documents.processing_ocr} already processing`,
        hint: "Completed OCR jobs are left alone; only backlog documents are queued.",
      },
    };
  }, [forceFullHash, skipIndexed, summary]);

  const runAction = async (action: InitialRunAction) => {
    setRunningAction(action);
    try {
      const result: InitialRunActionResult =
        await apiClient.triggerInitialRunAction({
          action,
          batch_size: resolvedBatchSize,
          skip_indexed: skipIndexed,
          force_full_hash: forceFullHash,
        });
      showSuccess(result.message);
      await fetchSummary();
    } catch (error) {
      const message =
        error && typeof error === "object" && "isAxiosError" in error
          ? ApiClient.getErrorMessage(error as any)
          : error instanceof Error
            ? error.message
            : "Unable to launch the selected initial-run action.";
      showError(message);
    } finally {
      setRunningAction(null);
    }
  };

  if (isLoading && !summary) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Initial Production Run"
          subtitle="Loading source inventory and backlog state."
        />
      </div>
    );
  }

  const documents = summary?.documents;
  const sources = summary?.sources;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Initial Production Run"
        subtitle="Bootstrap indexed sources, hash inventory, deduplication, and OCR from one operator console."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => void fetchSummary()}>
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate("/admin/deduplication")}
          >
            Dedup console
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate("/ocr")}
          >
            OCR monitor
          </Button>
        </div>
      </PageHeader>

      <GlassCard className="border-primary/20 bg-gradient-to-r from-card via-card to-primary/5 p-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                Operator Runbook
              </h2>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Recommended order for a first production bootstrap: crawl active
              sources, backfill hashes, refresh dedup groups, then queue OCR.
              Each action is safe to repeat and will reuse the existing backlog
              filters instead of blindly reprocessing completed work.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                "1. Index sources",
                "2. Hash backlog",
                "3. Dedup refresh",
                "4. OCR backlog",
              ].map((step) => (
                <span
                  key={step}
                  className="rounded-full border border-border/70 bg-secondary/30 px-3 py-1 text-xs text-muted-foreground"
                >
                  {step}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <GlassCard className="p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Source Footprint
              </div>
              <div className="mt-2 text-2xl font-semibold text-foreground">
                {sources?.active_sources ?? 0}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Active indexed sources
              </p>
            </GlassCard>
            <GlassCard className="p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                OCR Backlog
              </div>
              <div className="mt-2 text-2xl font-semibold text-foreground">
                {documents?.pending_ocr ?? 0}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Pending OCR documents
              </p>
            </GlassCard>
            <GlassCard className="p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Hash Gaps
              </div>
              <div className="mt-2 text-2xl font-semibold text-foreground">
                {documents?.missing_sparse_hash ?? 0}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Sparse fingerprints still missing
              </p>
            </GlassCard>
            <GlassCard className="p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Duplicate Review
              </div>
              <div className="mt-2 text-2xl font-semibold text-foreground">
                {documents?.duplicate_groups ?? 0}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Duplicate groups already materialized
              </p>
            </GlassCard>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            Execution Controls
          </h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="rounded-2xl border border-border/70 bg-secondary/20 px-4 py-3">
            <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Skip indexed files
            </span>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-sm text-foreground">
                Ignore source files that already have an active indexed state.
              </p>
              <button
                type="button"
                onClick={() => setSkipIndexed((value) => !value)}
                className={`inline-flex h-7 w-12 items-center rounded-full border px-1 transition-colors ${
                  skipIndexed
                    ? "border-primary/40 bg-primary/20"
                    : "border-border bg-secondary/40"
                }`}
                aria-pressed={skipIndexed}
              >
                <span
                  className={`h-5 w-5 rounded-full bg-white transition-transform ${
                    skipIndexed ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </label>

          <label className="rounded-2xl border border-border/70 bg-secondary/20 px-4 py-3">
            <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Force full SHA-256
            </span>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-sm text-foreground">
                Escalate hash and dedup work to full-file hashing.
              </p>
              <button
                type="button"
                onClick={() => setForceFullHash((value) => !value)}
                className={`inline-flex h-7 w-12 items-center rounded-full border px-1 transition-colors ${
                  forceFullHash
                    ? "border-primary/40 bg-primary/20"
                    : "border-border bg-secondary/40"
                }`}
                aria-pressed={forceFullHash}
              >
                <span
                  className={`h-5 w-5 rounded-full bg-white transition-transform ${
                    forceFullHash ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </label>

          <label className="rounded-2xl border border-border/70 bg-secondary/20 px-4 py-3">
            <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Batch cap
            </span>
            <div className="mt-2 flex items-center gap-3">
              <Input
                value={batchSize}
                onChange={(event) =>
                  setBatchSize(event.target.value.replace(/[^\d]/g, ""))
                }
                inputMode="numeric"
                placeholder="All pending"
                className="max-w-[180px]"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to target the full current backlog.
              </p>
            </div>
          </label>
        </div>
      </GlassCard>

      <div className="grid gap-4 xl:grid-cols-2">
        {ACTION_ORDER.map((item) => {
          const Icon = item.icon;
          const metrics = actionMetrics?.[item.action];
          const isBusy = runningAction === item.action;
          return (
            <GlassCard key={item.action} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl border border-primary/25 bg-primary/10 p-3">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">
                      {item.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
                <Badge variant={isBusy ? "processing" : "info"}>
                  {isBusy ? "Running" : "Ready"}
                </Badge>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-secondary/20 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    Primary backlog
                  </div>
                  <div className="mt-2 text-lg font-semibold text-foreground">
                    {metrics?.primary ?? "—"}
                  </div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-secondary/20 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    Operational note
                  </div>
                  <div className="mt-2 text-sm text-foreground">
                    {metrics?.secondary ?? "—"}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-border/70 bg-card px-4 py-3 text-xs leading-6 text-muted-foreground">
                {metrics?.hint}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <Button
                  variant={item.variant ?? "primary"}
                  onClick={() => void runAction(item.action)}
                  disabled={!!runningAction}
                >
                  {isBusy && <RefreshCw className="h-4 w-4 animate-spin" />}
                  {!isBusy && <ArrowRight className="h-4 w-4" />}
                  {isBusy ? "Launching..." : "Run action"}
                </Button>

                {item.action === "refresh_deduplication" && (
                  <button
                    type="button"
                    className="text-xs text-primary transition-colors hover:text-primary/80"
                    onClick={() => navigate("/admin/deduplication")}
                  >
                    Open dedup console
                  </button>
                )}
                {item.action === "queue_pending_ocr" && (
                  <button
                    type="button"
                    className="text-xs text-primary transition-colors hover:text-primary/80"
                    onClick={() => navigate("/ocr")}
                  >
                    Open OCR monitor
                  </button>
                )}
                {item.action === "index_sources" && (
                  <button
                    type="button"
                    className="text-xs text-primary transition-colors hover:text-primary/80"
                    onClick={() =>
                      showInfo(
                        "The source crawl will create or refresh records only for unmatched files when skip mode is enabled.",
                      )
                    }
                  >
                    How skip mode works
                  </button>
                )}
              </div>
            </GlassCard>
          );
        })}
      </div>

      <SourceInventoryTable sources={summary?.active_source_details ?? []} />

      <div className="grid gap-4 xl:grid-cols-2">
        <JobTable
          title="Recent Crawl Jobs"
          jobs={summary?.latest_jobs.crawl ?? []}
          emptyLabel="No crawl jobs have been created yet."
        />
        <JobTable
          title="Recent Hash Backfill Jobs"
          jobs={summary?.latest_jobs.hash_backfill ?? []}
          emptyLabel="No hash backfill jobs have been created yet."
        />
      </div>
    </div>
  );
}
