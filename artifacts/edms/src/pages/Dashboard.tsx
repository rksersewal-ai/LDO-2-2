import { useNavigate } from "react-router";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  Briefcase,
  CheckSquare,
  ChevronRight,
  Component,
  CopyCheck,
  Database,
  FileBarChart,
  FileText,
  FolderOpen,
  GitPullRequest,
  Milestone,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, Button, GlassCard } from "../components/ui/Shared";
import { DashboardDataService } from "../services/DashboardDataService";
import {
  DocumentPreviewButton,
  getDocumentContextAttributes,
} from "../components/documents/DocumentPreviewActions";

type MetricTone = "teal" | "amber" | "rose" | "blue" | "slate";

const TONE_STYLES: Record<MetricTone, string> = {
  teal: "border-primary/15 bg-primary/10 text-primary",
  amber: "border-amber-500/15 bg-amber-500/10 text-amber-400",
  rose: "border-rose-500/15 bg-rose-500/10 text-rose-400",
  blue: "border-blue-500/15 bg-blue-500/10 text-blue-400",
  slate: "border-border bg-secondary/80 text-muted-foreground",
};

function parseDateSafe(value?: string) {
  return value ? new Date(value).getTime() : 0;
}

function formatCompactDate(value?: string) {
  if (!value) return "No date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusVariant(status: string) {
  const value = status.toLowerCase();
  if (
    value.includes("approved") ||
    value.includes("complete") ||
    value.includes("resolved") ||
    value.includes("active") ||
    value.includes("released")
  ) {
    return "success" as const;
  }

  if (value.includes("processing")) {
    return "processing" as const;
  }

  if (
    value.includes("failed") ||
    value.includes("rejected") ||
    value.includes("obsolete") ||
    value.includes("escalated")
  ) {
    return "danger" as const;
  }

  if (
    value.includes("review") ||
    value.includes("pending") ||
    value.includes("open")
  ) {
    return "warning" as const;
  }

  return "default" as const;
}

function MetricCard({
  tone,
  icon: Icon,
  label,
  value,
  helper,
  action,
  onClick,
}: {
  tone: MetricTone;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  helper: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="industrial-panel group w-full overflow-hidden p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/20"
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-2xl border",
            TONE_STYLES[tone],
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
      </div>

      <div className="mt-6">
        <div className="metric-emphasis text-[34px]">{value}</div>
        <div className="mt-2 text-sm font-semibold text-foreground">
          {label}
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{helper}</p>
      </div>

      <div className="mt-5 text-xs font-semibold uppercase tracking-[0.08em] text-primary">
        {action}
      </div>
    </button>
  );
}

function SectionHeader({
  eyebrow,
  title,
  summary,
  actionLabel,
  onAction,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4">
      <div>
        <div className="section-kicker">{eyebrow}</div>
        <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-foreground">
          {title}
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
          {summary}
        </p>
      </div>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/75 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:bg-card hover:text-foreground"
        >
          {actionLabel}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const snapshot = DashboardDataService.getCachedOrBuild();

  const documents = [...snapshot.documents.data]
    .sort((a, b) => parseDateSafe(b.date) - parseDateSafe(a.date))
    .slice(0, 5);
  const approvals = [...snapshot.approvals.data]
    .filter((item) => item.status !== "Approved")
    .sort((a, b) => parseDateSafe(a.dueDate) - parseDateSafe(b.dueDate))
    .slice(0, 4);
  const activeCases = [...snapshot.cases.data]
    .filter((item) => !["Closed", "Resolved"].includes(item.status))
    .slice(0, 4);
  const ocrAttention = [...snapshot.ocrJobs.data]
    .filter((item) => item.status !== "Completed")
    .slice(0, 4);

  const duplicateSavingsGb = (
    snapshot.dedupGroups.data.reduce(
      (total, group) => total + group.potentialSavingsBytes,
      0,
    ) /
    (1024 * 1024 * 1024)
  ).toFixed(1);

  const summaryRows = [
    {
      label: "PL knowledge coverage",
      value: snapshot.plItems.total.toLocaleString(),
      note: `${snapshot.products.inProduction} production products currently mapped to controlled PLs.`,
      tone: "teal" as const,
      icon: Database,
    },
    {
      label: "Reporting readiness",
      value: snapshot.reports.total.toLocaleString(),
      note: `${snapshot.documents.approved} approved documents are available for downstream reporting packs.`,
      tone: "blue" as const,
      icon: FileBarChart,
    },
    {
      label: "Deduplication impact",
      value: `${snapshot.dedupGroups.pending} pending`,
      note: `${duplicateSavingsGb} GB of potential repository savings remain in review.`,
      tone: "amber" as const,
      icon: CopyCheck,
    },
  ];

  return (
    <div className="space-y-6 pb-4">
      <section className="industrial-panel relative overflow-hidden p-6 md:p-8">
        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="max-w-3xl">
            <div className="section-kicker">Operations Command</div>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em] text-foreground md:text-5xl">
              One disciplined surface for documents, approvals, PL control, and
              release risk.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground md:text-[15px]">
              The workspace is tuned for compact scanning, contrast-safe
              decision making, and fast movement across the engineering control
              loop.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={() => navigate("/documents")}>
                Open Document Hub
              </Button>
              <Button
                variant="teal-outline"
                onClick={() => navigate("/approvals")}
              >
                Review Pending Approvals
              </Button>
              <Button variant="secondary" onClick={() => navigate("/search")}>
                Search Workspace
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Badge variant="success">Light theme active</Badge>
              <Badge variant="warning">
                {snapshot.approvals.pending} items awaiting sign-off
              </Badge>
              <Badge variant="processing">
                {snapshot.ocrJobs.processing} OCR jobs in progress
              </Badge>
              <Badge variant="danger">
                {snapshot.cases.highSeverity} high-severity cases open
              </Badge>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="industrial-subpanel rounded-[26px] border border-border/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Release Readiness
              </p>
              <div className="mt-5 metric-emphasis text-[36px]">87%</div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Based on controlled documents, active approvals, and OCR
                exception load across the release lane.
              </p>
            </div>

            <div className="industrial-subpanel rounded-[26px] border border-border/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Repository Savings
              </p>
              <div className="mt-5 metric-emphasis text-[36px]">
                {duplicateSavingsGb}
                <span className="ml-1 text-base tracking-normal text-muted-foreground">
                  GB
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Estimated storage recovery if pending duplicate groups are
                dispositioned this cycle.
              </p>
            </div>

            <div className="industrial-subpanel rounded-[26px] border border-border/70 p-4 sm:col-span-2">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Today&apos;s Operating Focus
                  </p>
                  <p className="mt-2 text-sm leading-6 text-foreground">
                    Clear the approval lane, close OCR failures blocking
                    previews, and review open discrepancy cases before report
                    export.
                  </p>
                </div>
                <div className="rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
                  {new Date().toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          tone="teal"
          icon={FolderOpen}
          label="Documents under control"
          value={snapshot.documents.total.toLocaleString()}
          helper={`${snapshot.documents.approved} documents are already approved and ready for downstream use.`}
          action="Go to Document Hub"
          onClick={() => navigate("/documents")}
        />
        <MetricCard
          tone="amber"
          icon={CheckSquare}
          label="Approval load"
          value={snapshot.approvals.pending.toLocaleString()}
          helper="Pending sign-offs are clustered by due date so release blockers can be cleared first."
          action="Open Approvals"
          onClick={() => navigate("/approvals")}
        />
        <MetricCard
          tone="rose"
          icon={ShieldAlert}
          label="Open case pressure"
          value={snapshot.cases.open.toLocaleString()}
          helper={`${snapshot.cases.highSeverity} high-severity investigations remain unresolved.`}
          action="View Cases"
          onClick={() => navigate("/cases")}
        />
        <MetricCard
          tone="blue"
          icon={Activity}
          label="OCR attention lane"
          value={`${snapshot.ocrJobs.processing + snapshot.ocrJobs.failed}`}
          helper={`${snapshot.ocrJobs.failed} jobs failed or require intervention before preview and search are reliable.`}
          action="Open OCR Monitor"
          onClick={() => navigate("/ocr")}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <GlassCard className="industrial-panel overflow-hidden p-0">
          <SectionHeader
            eyebrow="Release Lane"
            title="Documents and approvals sharing the same operating tempo"
            summary="Keep release candidates, sign-off work, and preview access within a single review surface."
            actionLabel="Open full lane"
            onAction={() => navigate("/documents")}
          />

          <div className="grid gap-4 p-5 lg:grid-cols-[1.02fr_0.98fr]">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Recent controlled documents
                </h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate("/documents")}
                >
                  View All
                </Button>
              </div>

              {documents.map((document) => (
                <div
                  key={document.id}
                  {...getDocumentContextAttributes(document.id, document.name)}
                  className="industrial-subpanel flex items-center gap-4 rounded-[22px] border border-border/70 px-4 py-3"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/documents/${document.id}`)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-sm font-semibold text-foreground">
                      {document.name}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono text-primary">
                        {document.id}
                      </span>
                      <span>Rev {document.revision}</span>
                      <span>{document.owner}</span>
                      <span>{formatCompactDate(document.date)}</span>
                    </div>
                  </button>

                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(document.status)}>
                      {document.status}
                    </Badge>
                    <DocumentPreviewButton
                      documentId={document.id}
                      title={document.name}
                      variant="teal-outline"
                      label="Preview"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Pending sign-off queue
                </h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate("/approvals")}
                >
                  Review Queue
                </Button>
              </div>

              {approvals.map((approval) => (
                <button
                  key={approval.id}
                  type="button"
                  onClick={() => navigate("/approvals")}
                  className="industrial-subpanel w-full rounded-[22px] border border-border/70 px-4 py-3 text-left transition-colors hover:border-primary/20"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <GitPullRequest className="h-4 w-4 text-primary" />
                        <p className="truncate text-sm font-semibold text-foreground">
                          {approval.title}
                        </p>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono text-primary">
                          {approval.id}
                        </span>
                        <span>{approval.requester}</span>
                        <span>Due {formatCompactDate(approval.dueDate)}</span>
                      </div>
                    </div>

                    <Badge variant={statusVariant(approval.status)}>
                      {approval.status}
                    </Badge>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      {approval.type}
                    </p>
                    {approval.linkedDoc ? (
                      <DocumentPreviewButton
                        documentId={approval.linkedDoc}
                        label="Linked Doc"
                        variant="ghost"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        No linked preview
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </GlassCard>

        <GlassCard className="industrial-panel overflow-hidden p-0">
          <SectionHeader
            eyebrow="Risk Desk"
            title="Exceptions worth attention now"
            summary="Cases, OCR failures, and duplicate groups are staged together so operators can clear blockers before they spread."
            actionLabel="Open OCR"
            onAction={() => navigate("/ocr")}
          />

          <div className="space-y-4 p-5">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-400" />
                <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Active investigations
                </h3>
              </div>
              {activeCases.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate("/cases")}
                  className="industrial-subpanel w-full rounded-[22px] border border-border/70 px-4 py-3 text-left transition-colors hover:border-primary/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {item.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono text-primary">
                          {item.id}
                        </span>
                        <span>{item.assignee}</span>
                        <span>{item.linkedPL}</span>
                      </div>
                    </div>
                    <Badge variant={statusVariant(item.status)}>
                      {item.status}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  OCR exceptions
                </h3>
              </div>
              {ocrAttention.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate("/ocr")}
                  className="industrial-subpanel w-full rounded-[22px] border border-border/70 px-4 py-3 text-left transition-colors hover:border-primary/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {item.filename}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono text-primary">
                          {item.id}
                        </span>
                        <span>{item.document}</span>
                        <span>{item.pages} pages</span>
                      </div>
                    </div>
                    <Badge variant={statusVariant(item.status)}>
                      {item.status}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>

            <div className="rounded-[24px] border border-border/70 bg-primary/7 px-4 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">
                    Duplicate review backlog
                  </p>
                  <p className="mt-1 text-sm leading-6 text-foreground">
                    {snapshot.dedupGroups.pending} groups remain in manual
                    review.
                  </p>
                </div>
                <div className="rounded-2xl border border-primary/15 bg-card/85 px-3 py-2 text-right">
                  <div className="text-lg font-semibold text-foreground">
                    {duplicateSavingsGb} GB
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    recoverable
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                variant="teal-outline"
                className="mt-4"
                onClick={() => navigate("/admin/deduplication")}
              >
                Open Deduplication Console
              </Button>
            </div>
          </div>
        </GlassCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <GlassCard className="industrial-panel overflow-hidden p-0">
          <SectionHeader
            eyebrow="Quick Access"
            title="Primary work areas"
            summary="Routes are arranged for dense operational work rather than decorative dashboards."
          />

          <div className="grid gap-3 p-5 sm:grid-cols-2">
            {[
              {
                icon: FolderOpen,
                title: "Document Hub",
                detail:
                  "Release, archive, OCR, and preview control in one lane.",
                path: "/documents",
              },
              {
                icon: Component,
                title: "BOM Explorer",
                detail:
                  "Review assemblies, product structures, and change lineage.",
                path: "/bom",
              },
              {
                icon: Briefcase,
                title: "Work Ledger",
                detail:
                  "Track verified records, closure, and linked PL activity.",
                path: "/ledger",
              },
              {
                icon: Bell,
                title: "Alert Rules",
                detail:
                  "Tune notifications and exception routing without leaving the shell.",
                path: "/alerts",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className="industrial-subpanel group rounded-[24px] border border-border/70 p-4 text-left transition-all hover:border-primary/20"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-foreground">
                    {item.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {item.detail}
                  </p>
                </button>
              );
            })}
          </div>
        </GlassCard>

        <GlassCard className="industrial-panel overflow-hidden p-0">
          <SectionHeader
            eyebrow="Operations Snapshot"
            title="Cross-system state in compact form"
            summary="Counts are paired with context so teams can scan without decoding a card wall."
          />

          <div className="space-y-3 p-5">
            {summaryRows.map(({ label, value, note, tone, icon: Icon }) => (
              <div
                key={label}
                className="industrial-subpanel flex items-start gap-4 rounded-[24px] border border-border/70 px-4 py-4"
              >
                <div
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border",
                    TONE_STYLES[tone],
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold text-foreground">
                      {label}
                    </p>
                    <span className="font-mono text-sm font-semibold text-primary">
                      {value}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {note}
                  </p>
                </div>
              </div>
            ))}

            <div className="grid gap-3 pt-1 sm:grid-cols-3">
              {[
                {
                  label: "Products in production",
                  value: snapshot.products.inProduction.toString(),
                  icon: Milestone,
                },
                {
                  label: "Work records active",
                  value: snapshot.workRecords.inProgress.toString(),
                  icon: Briefcase,
                },
                {
                  label: "Audit entries loaded",
                  value: snapshot.auditLog.length.toString(),
                  icon: FileBarChart,
                },
              ].map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="rounded-[22px] border border-border/70 bg-background/70 px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {label}
                    </p>
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-foreground">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </section>
    </div>
  );
}
