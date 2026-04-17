import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  GlassCard,
  Badge,
  Button,
  Input,
  FilterPills,
  PageHeader,
} from "../components/ui/Shared";
import { SafeSection } from "../components/ui/SafeSection";
import { useAbortOnNavigate } from "../hooks/useAbortOnNavigate";
import { MOCK_DOCUMENTS } from "../lib/mock";
import { ExportImportService } from "../services/ExportImportService";
import {
  DocumentPreviewButton,
  getDocumentContextAttributes,
} from "../components/documents/DocumentPreviewActions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  FileText,
  Search,
  Upload,
  Download,
  Eye,
  Grid,
  List,
  ChevronRight,
  FileImage,
  File,
  Plus,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ScanText,
  Link as LinkIcon,
  CheckSquare,
  Square,
  X,
  CheckCheck,
  Minus,
  Send,
  FolderOpen,
  ToggleLeft,
  ToggleRight,
  Columns3,
} from "lucide-react";

const statusVariant = (s: string) => {
  if (s === "Approved") return "success" as const;
  if (s === "In Review") return "warning" as const;
  if (s === "Obsolete") return "danger" as const;
  if (s === "Draft") return "warning" as const;
  return "default" as const;
};

const ocrVariant = (s: string) => {
  if (s === "Completed") return "success" as const;
  if (s === "Processing") return "processing" as const;
  if (s === "Failed") return "danger" as const;
  return "default" as const;
};

const FileIcon = ({ type }: { type: string }) => {
  if (type === "PNG" || type === "JPG")
    return <FileImage className="w-5 h-5 text-purple-400" />;
  if (type === "XLSX") return <File className="w-5 h-5 text-green-400" />;
  if (type === "DOCX") return <File className="w-5 h-5 text-blue-400" />;
  return <FileText className="w-5 h-5 text-primary" />;
};

type SortField = "date" | "name" | "type" | "status" | "revision" | "category";
type SortDir = "asc" | "desc";

const STATUS_FILTERS = ["All", "Approved", "In Review", "Draft", "Obsolete"];
const OCR_FILTERS = [
  "All",
  "Completed",
  "Processing",
  "Failed",
  "Not Required",
];
const TYPE_FILTERS = ["All", "PDF", "DOCX", "XLSX", "PNG", "JPG"];
const CATEGORY_FILTERS = [
  "All",
  "Electrical Schema",
  "Specification",
  "CAD Output",
  "Calibration Log",
  "Test Report",
  "Certificate",
];

type DocumentRecord = (typeof MOCK_DOCUMENTS)[number];

const DOCUMENT_EXPORT_HEADERS = [
  "ID",
  "Name",
  "Category",
  "Type",
  "Revision",
  "Status",
  "OCR Status",
  "Linked PL",
  "Author",
  "Date",
];

function documentExportRows(documents: DocumentRecord[]) {
  return documents.map((document) => [
    document.id,
    document.name,
    document.category,
    document.type,
    document.revision,
    document.status,
    document.ocrStatus,
    document.linkedPL ?? "",
    document.author ?? "",
    document.date,
  ]);
}

function downloadDocumentsCsv(
  documents: DocumentRecord[],
  filenamePrefix: string,
) {
  const csv = [
    DOCUMENT_EXPORT_HEADERS.join(","),
    ...documentExportRows(documents).map((row) =>
      row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","),
    ),
  ].join("\n");
  const date = new Date().toISOString().split("T")[0];
  ExportImportService.downloadBlob(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    `${filenamePrefix}-${date}.csv`,
  );
}

function exportDocumentsExcel(
  documents: DocumentRecord[],
  filenamePrefix: string,
) {
  ExportImportService.exportGenericTableExcel(
    "Documents",
    DOCUMENT_EXPORT_HEADERS,
    documentExportRows(documents),
    filenamePrefix,
  );
}

function currentIsoDate() {
  return new Date().toISOString().split("T")[0];
}

function mergeTags(existing: string[] | undefined, next: string[]) {
  return Array.from(new Set([...(existing ?? []), ...next]));
}

function Toast({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-card/95 backdrop-blur-xl border border-teal-500/30 shadow-2xl shadow-black/60 text-sm text-foreground animate-slide-in-right">
      <CheckCheck className="w-4 h-4 text-primary shrink-0" />
      <span>{msg}</span>
      <button
        onClick={onDismiss}
        className="ml-2 text-muted-foreground hover:text-foreground/90 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function DocumentHub() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentRecord[]>(() =>
    MOCK_DOCUMENTS.map((document) => ({
      ...document,
      tags: [...(document.tags ?? [])],
    })),
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [ocrFilter, setOcrFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showObsolete, setShowObsolete] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [docPage, setDocPage] = useState(1);
  const DOC_PAGE_SIZE = 15;
  const [showColMenu, setShowColMenu] = useState(false);
  const ALL_COLS = [
    "id",
    "name",
    "category",
    "type",
    "revision",
    "status",
    "ocr",
    "linkedPL",
    "date",
  ] as const;
  type ColKey = (typeof ALL_COLS)[number];
  const COL_LABELS: Record<ColKey, string> = {
    id: "Doc ID",
    name: "Name",
    category: "Category",
    type: "Type",
    revision: "Rev",
    status: "Status",
    ocr: "OCR",
    linkedPL: "Linked PL",
    date: "Updated",
  };
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(
    new Set(ALL_COLS),
  );
  const toggleCol = (c: ColKey) =>
    setVisibleCols((v) => {
      const n = new Set(v);
      if (n.has(c)) {
        if (n.size > 2) n.delete(c);
      } else n.add(c);
      return n;
    });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <ArrowUpDown className="w-2.5 h-2.5 text-slate-600" />;
    return sortDir === "asc" ? (
      <ArrowUp className="w-2.5 h-2.5 text-primary" />
    ) : (
      <ArrowDown className="w-2.5 h-2.5 text-primary" />
    );
  };

  const filtered = useMemo(() => {
    let docs = documents.filter((d) => {
      if (!showObsolete && d.status === "Obsolete") return false;
      const matchSearch =
        !search ||
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.id.toLowerCase().includes(search.toLowerCase()) ||
        d.linkedPL?.toLowerCase().includes(search.toLowerCase()) ||
        d.author?.toLowerCase().includes(search.toLowerCase()) ||
        d.tags?.some((t: string) =>
          t.toLowerCase().includes(search.toLowerCase()),
        );
      const matchStatus = statusFilter === "All" || d.status === statusFilter;
      const matchOcr = ocrFilter === "All" || d.ocrStatus === ocrFilter;
      const matchType = typeFilter === "All" || d.type === typeFilter;
      const matchCategory =
        categoryFilter === "All" || d.category === categoryFilter;
      return (
        matchSearch && matchStatus && matchOcr && matchType && matchCategory
      );
    });

    docs = [...docs].sort((a, b) => {
      let va: string, vb: string;
      switch (sortField) {
        case "name":
          va = a.name;
          vb = b.name;
          break;
        case "type":
          va = a.type;
          vb = b.type;
          break;
        case "status":
          va = a.status;
          vb = b.status;
          break;
        case "revision":
          va = a.revision;
          vb = b.revision;
          break;
        case "category":
          va = a.category;
          vb = b.category;
          break;
        default:
          va = a.date;
          vb = b.date;
      }
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });

    return docs;
  }, [
    documents,
    search,
    statusFilter,
    ocrFilter,
    typeFilter,
    categoryFilter,
    sortField,
    sortDir,
    showObsolete,
  ]);

  useEffect(() => {
    setDocPage(1);
    setSelectedIds(new Set());
  }, [filtered]);

  const totalDocPages = Math.max(1, Math.ceil(filtered.length / DOC_PAGE_SIZE));
  const paginated = filtered.slice(
    (docPage - 1) * DOC_PAGE_SIZE,
    docPage * DOC_PAGE_SIZE,
  );

  const categoryOptions = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(documents.map((document) => document.category)),
      ).sort(),
    ],
    [documents],
  );

  const stats = {
    total: documents.length,
    approved: documents.filter((d) => d.status === "Approved").length,
    inReview: documents.filter((d) => d.status === "In Review").length,
    ocrPending: documents.filter((d) => d.ocrStatus === "Processing").length,
    ocrFailed: documents.filter((d) => d.ocrStatus === "Failed").length,
    unlinked: documents.filter((d) => !d.linkedPL || d.linkedPL === "N/A")
      .length,
  };

  const activeFilters = [
    statusFilter,
    ocrFilter,
    typeFilter,
    categoryFilter,
  ].filter((f) => f !== "All").length;

  const allSelected =
    filtered.length > 0 && filtered.every((d) => selectedIds.has(d.id));
  const someSelected = filtered.some((d) => selectedIds.has(d.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((d) => d.id)));
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectionCount = selectedIds.size;
  const clearSelection = () => setSelectedIds(new Set());
  const exportDataset =
    search || activeFilters > 0 || !showObsolete ? filtered : documents;

  // Bulk upload
  const bulkInputRef = useRef<HTMLInputElement>(null);
  const handleBulkFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const count = e.target.files?.length ?? 0;
    e.target.value = "";
    if (count > 0) {
      showToast(
        `${count} file${count > 1 ? "s" : ""} queued — opening ingest…`,
      );
      setTimeout(() => navigate("/documents/ingest"), 900);
    }
  };

  // Download selected as CSV
  const handleDownloadSelected = () => {
    const docs = documents.filter((d) => selectedIds.has(d.id));
    downloadDocumentsCsv(docs, "selected-documents");
    showToast(
      `Downloaded ${docs.length} document${docs.length > 1 ? "s" : ""} as CSV.`,
    );
  };

  // Request approval — navigate to approvals page with selected IDs
  const handleRequestApproval = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setDocuments((current) =>
      current.map((document) =>
        selectedIds.has(document.id)
          ? {
              ...document,
              status: "In Review",
              date: currentIsoDate(),
              tags: mergeTags(document.tags, ["Approval Queue"]),
            }
          : document,
      ),
    );
    showToast(
      `${ids.length} document${ids.length > 1 ? "s" : ""} sent to approval queue.`,
    );
    clearSelection();
    navigate(`/approvals?docs=${encodeURIComponent(ids.join(","))}`);
  };

  // Folder picker
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);
  const FOLDERS = [
    "Electrical Schema",
    "Specification",
    "CAD Output",
    "Calibration Log",
    "Test Report",
    "Certificate",
    "Archive",
  ] as const;

  const moveSelectedDocuments = (folder: (typeof FOLDERS)[number]) => {
    const movedCount = selectionCount;
    setDocuments((current) =>
      current.map((document) => {
        if (!selectedIds.has(document.id)) {
          return document;
        }

        if (folder === "Archive") {
          return {
            ...document,
            status: "Obsolete",
            lifecycle: "Archived",
            date: currentIsoDate(),
            tags: mergeTags(document.tags, ["Archive"]),
          };
        }

        return {
          ...document,
          category: folder,
          lifecycle:
            document.lifecycle === "Archived" ? "Draft" : document.lifecycle,
          status: document.status === "Obsolete" ? "Draft" : document.status,
          date: currentIsoDate(),
          tags: mergeTags(document.tags, [folder, "Relocated"]),
        };
      }),
    );
    setFolderPickerOpen(false);
    showToast(
      `${movedCount} document${movedCount > 1 ? "s" : ""} moved to "${folder}".`,
    );
    clearSelection();
  };

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      {toast && <Toast msg={toast} onDismiss={() => setToast(null)} />}

      {/* Hidden bulk upload file input */}
      <input
        ref={bulkInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
        className="hidden"
        onChange={handleBulkFileSelect}
      />

      {/* Folder picker dialog */}
      <Dialog open={folderPickerOpen} onOpenChange={setFolderPickerOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Move to Folder</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-2">
            Select destination folder for{" "}
            <span className="text-foreground font-medium">
              {selectionCount} document{selectionCount > 1 ? "s" : ""}
            </span>
            .
          </p>
          <div className="grid gap-1">
            {FOLDERS.map((folder) => (
              <button
                key={folder}
                onClick={() => moveSelectedDocuments(folder)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-secondary/60 text-sm text-left border border-transparent hover:border-border transition-colors"
              >
                <FolderOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-foreground/90">{folder}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <PageHeader
        title="Document Hub"
        subtitle="Manage, search, and track all engineering documents linked to PL records"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                downloadDocumentsCsv(exportDataset, "documents-view")
              }
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                exportDocumentsExcel(exportDataset, "documents-view")
              }
            >
              <Download className="w-3.5 h-3.5" /> Excel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => bulkInputRef.current?.click()}
            >
              <Upload className="w-3.5 h-3.5" /> Bulk Upload
            </Button>
            <Button size="sm" onClick={() => navigate("/documents/ingest")}>
              <Plus className="w-3.5 h-3.5" /> Ingest Document
            </Button>
          </div>
        }
      />

      <GlassCard className="overflow-hidden border border-primary/20">
        <div className="relative p-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(19,191,168,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.1),transparent_28%)]" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                Document Control Workbench
              </p>
              <h2 className="mt-2 text-xl font-semibold text-foreground">
                Keep release-ready files, OCR exceptions, archive moves, and PL
                linkage inside one operator surface.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Bulk actions now update the live workspace state, queue document
                approvals, and move records into controlled archive or category
                lanes without leaving the grid.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:w-[320px]">
              {[
                {
                  label: "Release-ready",
                  value: stats.approved,
                  hint: "Approved documents in active circulation",
                },
                {
                  label: "Review lane",
                  value: stats.inReview,
                  hint: "Files currently awaiting sign-off",
                },
                {
                  label: "OCR queue",
                  value: stats.ocrPending + stats.ocrFailed,
                  hint: "Processing and failed OCR items",
                },
                {
                  label: "Unlinked PL",
                  value: stats.unlinked,
                  hint: "Docs missing part linkage or evidence chain",
                },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-xl border border-border/70 bg-card/70 px-4 py-3"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {metric.label}
                  </p>
                  <p className="mt-2 font-mono text-2xl font-semibold text-foreground">
                    {metric.value}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {metric.hint}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="teal-outline"
              onClick={() => setStatusFilter("In Review")}
            >
              <Send className="w-3.5 h-3.5" />
              Focus Review Queue
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setOcrFilter("Processing")}
            >
              <ScanText className="w-3.5 h-3.5" />
              OCR Processing
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setSearch("PL-")}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              Find Linked PL Records
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate("/templates")}
            >
              <FileText className="w-3.5 h-3.5" />
              Templates
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total Documents",
            value: stats.total,
            icon: <FileText className="w-4 h-4 text-primary" />,
            onClick: () => {
              setStatusFilter("All");
              setOcrFilter("All");
              setTypeFilter("All");
              setCategoryFilter("All");
            },
          },
          {
            label: "In Review",
            value: stats.inReview,
            icon: <Send className="w-4 h-4 text-amber-400" />,
            onClick: () => setStatusFilter("In Review"),
          },
          {
            label: "OCR Exceptions",
            value: stats.ocrFailed,
            icon: <ScanText className="w-4 h-4 text-blue-400" />,
            onClick: () => setOcrFilter("Failed"),
          },
          {
            label: "Unlinked PL",
            value: stats.unlinked,
            icon: <LinkIcon className="w-4 h-4 text-indigo-400" />,
            onClick: () => setSearch("N/A"),
          },
        ].map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={s.onClick}
            className="rounded-md border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/30 hover:bg-secondary/30"
          >
            <div className="w-8 h-8 rounded-lg bg-secondary/60 flex items-center justify-center shrink-0">
              {s.icon}
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {s.label}
              </p>
              <p className="text-xl font-bold text-foreground">{s.value}</p>
            </div>
          </button>
        ))}
      </div>

      <GlassCard className="p-4">
        {/* Search + toolbar */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, ID, PL number, author, or tags..."
              className="pl-9 w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Show obsolete toggle */}
            <button
              onClick={() => setShowObsolete((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                showObsolete
                  ? "bg-secondary/60 border-border text-muted-foreground hover:text-foreground"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-300"
              }`}
              title={
                showObsolete
                  ? "Showing obsolete versions"
                  : "Hiding obsolete versions"
              }
            >
              {showObsolete ? (
                <ToggleRight className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ToggleLeft className="w-4 h-4 text-rose-400" />
              )}
              {showObsolete ? "Incl. Obsolete" : "Excl. Obsolete"}
            </button>

            <button
              onClick={() => setShowFilters((f) => !f)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${showFilters || activeFilters > 0 ? "bg-teal-500/15 border-teal-500/40 text-primary/90" : "bg-secondary/60 border-border text-muted-foreground hover:text-foreground"}`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
              {activeFilters > 0 && (
                <span className="w-4 h-4 rounded-full bg-teal-500 text-white text-[9px] flex items-center justify-center">
                  {activeFilters}
                </span>
              )}
            </button>
            {/* Column visibility toggle */}
            {viewMode === "table" && (
              <div className="relative">
                <button
                  onClick={() => setShowColMenu((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${showColMenu ? "bg-teal-500/15 border-teal-500/40 text-primary/90" : "bg-secondary/60 border-border text-muted-foreground hover:text-foreground"}`}
                >
                  <Columns3 className="w-3.5 h-3.5" /> Columns
                </button>
                {showColMenu && (
                  <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-card/95 backdrop-blur-xl border border-white/8 rounded-xl shadow-2xl shadow-black/60 p-2">
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Visible Columns
                    </p>
                    {ALL_COLS.map((c) => (
                      <button
                        key={c}
                        onClick={() => toggleCol(c)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-700/50 text-left transition-colors"
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${visibleCols.has(c) ? "bg-teal-500/30 border-teal-500/60" : "border-slate-600"}`}
                        >
                          {visibleCols.has(c) && (
                            <CheckCheck className="w-2.5 h-2.5 text-primary" />
                          )}
                        </div>
                        <span className="text-xs text-foreground/90">
                          {COL_LABELS[c]}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="flex border border-border/60 rounded-xl overflow-hidden">
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 py-2 transition-colors ${viewMode === "table" ? "bg-teal-500/20 text-primary/90" : "text-muted-foreground hover:text-foreground/90"}`}
                title="Table view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`px-3 py-2 transition-colors ${viewMode === "grid" ? "bg-teal-500/20 text-primary/90" : "text-muted-foreground hover:text-foreground/90"}`}
                title="Grid view"
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Expanded filter panels */}
        {showFilters && (
          <div className="mb-4 pt-3 border-t border-border space-y-3">
            <div className="flex flex-wrap gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-1.5">
                  Status
                </p>
                <FilterPills
                  options={STATUS_FILTERS}
                  value={statusFilter}
                  onChange={setStatusFilter}
                />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-1.5">
                  OCR Status
                </p>
                <FilterPills
                  options={OCR_FILTERS}
                  value={ocrFilter}
                  onChange={setOcrFilter}
                />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-1.5">
                  File Type
                </p>
                <FilterPills
                  options={TYPE_FILTERS}
                  value={typeFilter}
                  onChange={setTypeFilter}
                />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-1.5">
                  Category
                </p>
                <FilterPills
                  options={categoryOptions}
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                />
              </div>
            </div>
            {activeFilters > 0 && (
              <button
                onClick={() => {
                  setStatusFilter("All");
                  setOcrFilter("All");
                  setTypeFilter("All");
                  setCategoryFilter("All");
                }}
                className="text-xs text-muted-foreground hover:text-primary underline transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Bulk action toolbar */}
        {someSelected && (
          <div className="mb-3 flex items-center gap-2 px-3 py-2.5 bg-teal-500/8 border border-teal-500/25 rounded-xl">
            <CheckSquare className="w-4 h-4 text-primary shrink-0" />
            <span className="text-xs font-semibold text-primary/90">
              {selectionCount} selected
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={handleDownloadSelected}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/60 hover:bg-slate-700/60 text-foreground/90 text-xs border border-border/40 hover:border-teal-500/30 transition-all"
              >
                <Download className="w-3.5 h-3.5 text-primary" /> Download
                Selected
              </button>
              <button
                onClick={handleRequestApproval}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/60 hover:bg-slate-700/60 text-foreground/90 text-xs border border-border/40 hover:border-amber-500/30 transition-all"
              >
                <Send className="w-3.5 h-3.5 text-amber-400" /> Request Approval
              </button>
              <button
                onClick={() => setFolderPickerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/60 hover:bg-slate-700/60 text-foreground/90 text-xs border border-border/40 hover:border-indigo-500/30 transition-all"
              >
                <FolderOpen className="w-3.5 h-3.5 text-indigo-400" /> Move to
                Folder
              </button>
              <button
                onClick={clearSelection}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                title="Clear selection"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground mb-3 font-medium flex items-center gap-2">
          <span>
            Showing{" "}
            <span className="text-primary font-semibold">
              {Math.min((docPage - 1) * DOC_PAGE_SIZE + 1, filtered.length)}–
              {Math.min(docPage * DOC_PAGE_SIZE, filtered.length)}
            </span>{" "}
            of{" "}
            <span className="text-muted-foreground font-semibold">
              {filtered.length}
            </span>{" "}
            documents
          </span>
          {!showObsolete && (
            <span className="text-rose-400/70">· obsolete hidden</span>
          )}
          {search && (
            <span>
              matching "<span className="text-foreground/90">{search}</span>"
            </span>
          )}
        </div>

        {/* Table view */}
        {viewMode === "table" ? (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-3 pl-3 w-8">
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                      title={allSelected ? "Deselect all" : "Select all"}
                    >
                      {allSelected ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : someSelected ? (
                        <Minus className="w-4 h-4 text-primary" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  {visibleCols.has("id") && (
                    <th className="pb-3 pl-1 font-semibold text-[11px] uppercase tracking-wide">
                      Document ID
                    </th>
                  )}
                  {visibleCols.has("name") && (
                    <th className="pb-3 pr-4 font-semibold text-[11px] uppercase tracking-wide">
                      <button
                        onClick={() => handleSort("name")}
                        className="flex items-center gap-1 hover:text-foreground/90 transition-colors"
                      >
                        Name <SortIcon field="name" />
                      </button>
                    </th>
                  )}
                  {visibleCols.has("category") && (
                    <th className="pb-3 font-semibold text-[11px] uppercase tracking-wide">
                      <button
                        onClick={() => handleSort("category")}
                        className="flex items-center gap-1 hover:text-foreground/90 transition-colors"
                      >
                        Category <SortIcon field="category" />
                      </button>
                    </th>
                  )}
                  {visibleCols.has("type") && (
                    <th className="pb-3 font-semibold text-[11px] uppercase tracking-wide">
                      <button
                        onClick={() => handleSort("type")}
                        className="flex items-center gap-1 hover:text-foreground/90 transition-colors"
                      >
                        Type <SortIcon field="type" />
                      </button>
                    </th>
                  )}
                  {visibleCols.has("revision") && (
                    <th className="pb-3 font-semibold text-[11px] uppercase tracking-wide">
                      <button
                        onClick={() => handleSort("revision")}
                        className="flex items-center gap-1 hover:text-foreground/90 transition-colors"
                      >
                        Rev <SortIcon field="revision" />
                      </button>
                    </th>
                  )}
                  {visibleCols.has("status") && (
                    <th className="pb-3 font-semibold text-[11px] uppercase tracking-wide">
                      <button
                        onClick={() => handleSort("status")}
                        className="flex items-center gap-1 hover:text-foreground/90 transition-colors"
                      >
                        Status <SortIcon field="status" />
                      </button>
                    </th>
                  )}
                  {visibleCols.has("ocr") && (
                    <th className="pb-3 font-semibold text-[11px] uppercase tracking-wide">
                      OCR
                    </th>
                  )}
                  {visibleCols.has("linkedPL") && (
                    <th className="pb-3 font-semibold text-[11px] uppercase tracking-wide">
                      Linked PL
                    </th>
                  )}
                  {visibleCols.has("date") && (
                    <th className="pb-3 font-semibold text-[11px] uppercase tracking-wide">
                      <button
                        onClick={() => handleSort("date")}
                        className="flex items-center gap-1 hover:text-foreground/90 transition-colors"
                      >
                        Updated <SortIcon field="date" />
                      </button>
                    </th>
                  )}
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {paginated.map((doc) => {
                  const isSelected = selectedIds.has(doc.id);
                  return (
                    <tr
                      key={doc.id}
                      {...getDocumentContextAttributes(doc.id, doc.name)}
                      className={`hover:bg-secondary/40 cursor-pointer transition-colors group ${isSelected ? "bg-teal-500/5" : ""}`}
                      onClick={() =>
                        navigate(
                          `/documents/${doc.id}${search ? `?q=${encodeURIComponent(search)}` : ""}`,
                        )
                      }
                    >
                      <td
                        className="py-3 pl-3"
                        onClick={(e) => toggleSelect(doc.id, e)}
                      >
                        <button className="flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </button>
                      </td>
                      {visibleCols.has("id") && (
                        <td className="py-3 pl-1">
                          <div className="flex items-center gap-2">
                            <FileIcon type={doc.type} />
                            <span className="font-mono text-primary text-xs">
                              {doc.id}
                            </span>
                          </div>
                        </td>
                      )}
                      {visibleCols.has("name") && (
                        <td className="py-3 pr-4">
                          <span className="text-foreground font-medium">
                            {doc.name}
                          </span>
                          <div className="text-[11px] text-muted-foreground">
                            {doc.author} · {doc.size}
                          </div>
                        </td>
                      )}
                      {visibleCols.has("category") && (
                        <td className="py-3">
                          <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-300 rounded-md text-xs border border-indigo-500/20">
                            {doc.category}
                          </span>
                        </td>
                      )}
                      {visibleCols.has("type") && (
                        <td className="py-3">
                          <span className="px-2 py-0.5 bg-secondary/80 text-muted-foreground rounded-md text-xs border border-border/40">
                            {doc.type}
                          </span>
                        </td>
                      )}
                      {visibleCols.has("revision") && (
                        <td className="py-3 text-muted-foreground font-mono text-xs">
                          {doc.revision}
                        </td>
                      )}
                      {visibleCols.has("status") && (
                        <td className="py-3">
                          <Badge variant={statusVariant(doc.status)}>
                            {doc.status}
                          </Badge>
                        </td>
                      )}
                      {visibleCols.has("ocr") && (
                        <td className="py-3">
                          <Badge variant={ocrVariant(doc.ocrStatus)}>
                            {doc.ocrStatus}
                          </Badge>
                        </td>
                      )}
                      {visibleCols.has("linkedPL") && (
                        <td className="py-3 font-mono text-xs">
                          {doc.linkedPL && doc.linkedPL !== "N/A" ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                navigate(`/pl/${doc.linkedPL}`);
                              }}
                              className="flex items-center gap-1 text-primary transition-colors hover:text-teal-200"
                            >
                              <LinkIcon className="w-3 h-3" />
                              {doc.linkedPL}
                            </button>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      )}
                      {visibleCols.has("date") && (
                        <td className="py-3 text-muted-foreground text-xs">
                          {doc.date}
                        </td>
                      )}
                      <td className="py-3 pr-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <DocumentPreviewButton
                            documentId={doc.id}
                            title={doc.name}
                            iconOnly
                            className="h-8 min-h-0 px-2 text-foreground/90 hover:text-teal-200"
                          />
                          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-primary transition-colors" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium text-muted-foreground mb-1">
                  No documents found
                </p>
                <p className="text-sm mb-4">
                  Try adjusting your search or filter criteria
                </p>
                <div className="flex gap-2 justify-center">
                  {activeFilters > 0 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setStatusFilter("All");
                        setOcrFilter("All");
                        setTypeFilter("All");
                        setCategoryFilter("All");
                      }}
                    >
                      Clear Filters
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => navigate("/documents/ingest")}
                  >
                    <Plus className="w-3.5 h-3.5" /> Ingest First Document
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Grid view */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginated.map((doc) => {
              const isSelected = selectedIds.has(doc.id);
              return (
                <div
                  key={doc.id}
                  {...getDocumentContextAttributes(doc.id, doc.name)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all group hover:shadow-lg ${
                    isSelected
                      ? "bg-teal-500/8 border-teal-500/35 hover:border-teal-400/50"
                      : "bg-card/40 border-border hover:border-teal-500/30 hover:shadow-teal-950/30"
                  }`}
                  onClick={() =>
                    navigate(
                      `/documents/${doc.id}${search ? `?q=${encodeURIComponent(search)}` : ""}`,
                    )
                  }
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => toggleSelect(doc.id, e)}
                        className="text-slate-600 hover:text-primary transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-primary" />
                        ) : (
                          <Square className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                      <div className="w-8 h-8 rounded-xl bg-secondary/60 border border-border flex items-center justify-center">
                        <FileIcon type={doc.type} />
                      </div>
                    </div>
                    <Badge variant={statusVariant(doc.status)}>
                      {doc.status}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1 line-clamp-2 group-hover:text-white transition-colors">
                    {doc.name}
                  </p>
                  <p className="font-mono text-[11px] text-primary mb-2">
                    {doc.id}
                  </p>

                  {/* Category badge */}
                  <div className="mb-2">
                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-300/80 rounded-md text-[10px] border border-indigo-500/15">
                      {doc.category}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {doc.type} · {doc.size}
                    </span>
                    <span className="font-mono">Rev {doc.revision}</span>
                  </div>

                  {/* Linked PL */}
                  {doc.linkedPL && doc.linkedPL !== "N/A" && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/pl/${doc.linkedPL}`);
                      }}
                      className="mt-2 flex items-center gap-1 text-[11px] text-primary/80 transition-colors hover:text-teal-200"
                    >
                      <LinkIcon className="w-3 h-3" /> {doc.linkedPL}
                    </button>
                  )}

                  <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
                    <Badge
                      variant={ocrVariant(doc.ocrStatus)}
                      className="text-[10px]"
                    >
                      {doc.ocrStatus}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-600">
                        {doc.date}
                      </span>
                      <DocumentPreviewButton
                        documentId={doc.id}
                        title={doc.name}
                        iconOnly
                        className="h-7 min-h-0 px-2 text-foreground/90 hover:text-teal-200"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-16 text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium text-muted-foreground mb-1">
                  No documents found
                </p>
                <p className="text-sm mb-4">
                  Try adjusting your search or filter criteria
                </p>
                <Button size="sm" onClick={() => navigate("/documents/ingest")}>
                  <Plus className="w-3.5 h-3.5" /> Ingest First Document
                </Button>
              </div>
            )}
          </div>
        )}
        {/* Pagination Controls */}
        {totalDocPages > 1 && (
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Page{" "}
              <span className="text-muted-foreground font-semibold">
                {docPage}
              </span>{" "}
              of {totalDocPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setDocPage(1)}
                disabled={docPage === 1}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-primary/90 hover:bg-secondary/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                «
              </button>
              <button
                onClick={() => setDocPage((p) => Math.max(1, p - 1))}
                disabled={docPage === 1}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-primary/90 hover:bg-secondary/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                ‹ Prev
              </button>
              {Array.from({ length: Math.min(5, totalDocPages) }, (_, i) => {
                const start = Math.max(
                  1,
                  Math.min(docPage - 2, totalDocPages - 4),
                );
                const pg = start + i;
                return (
                  <button
                    key={pg}
                    onClick={() => setDocPage(pg)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${pg === docPage ? "bg-teal-500/20 text-primary/90 border border-teal-500/40" : "text-muted-foreground hover:text-foreground/90 hover:bg-secondary/60"}`}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                onClick={() =>
                  setDocPage((p) => Math.min(totalDocPages, p + 1))
                }
                disabled={docPage === totalDocPages}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-primary/90 hover:bg-secondary/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Next ›
              </button>
              <button
                onClick={() => setDocPage(totalDocPages)}
                disabled={docPage === totalDocPages}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-primary/90 hover:bg-secondary/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                »
              </button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
