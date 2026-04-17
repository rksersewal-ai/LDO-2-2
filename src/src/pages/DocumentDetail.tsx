import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { GlassCard, Badge, Button, Input } from "../components/ui/Shared";
import { MOCK_DOCUMENTS } from "../lib/mock";
import { getPLRecord, PL_DATABASE } from "../lib/bomData";
import {
  FileText,
  Download,
  Edit3,
  Maximize,
  ZoomIn,
  ZoomOut,
  Link as LinkIcon,
  AlertCircle,
  RefreshCw,
  Eye,
  History,
  X,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  CheckCircle,
  Settings,
  User,
  Calendar,
  BookOpen,
  Scaling,
  Plus,
  RotateCw,
  GitCompare,
  Paperclip,
  Tag,
  ExternalLink,
  Hash,
  Box,
  Layers,
  Shield,
  ArrowRight,
  Printer,
  ChevronDown,
  Copy,
  ArrowUpDown,
  Cpu,
} from "lucide-react";

// Mock OCR-detected references
interface OCRReference {
  type: "PL" | "Drawing" | "Specification" | "Document";
  value: string;
  page: number;
  line?: number;
  context: string;
  linkedId?: string;
}

function getDocOCRReferences(docId: string): OCRReference[] {
  const refs: Record<string, OCRReference[]> = {
    "DOC-2026-9021": [
      {
        type: "PL",
        value: "PL 38100000",
        page: 1,
        context: "Referenced in header block — WAP7 Locomotive",
        linkedId: "38100000",
      },
      {
        type: "PL",
        value: "PL 38110000",
        page: 2,
        line: 14,
        context: "Bogie Assembly wiring connection point",
        linkedId: "38110000",
      },
      {
        type: "Drawing",
        value: "DWG-BOG-ASM-001",
        page: 3,
        context: "Cross-reference to bogie assembly drawing",
      },
      {
        type: "Specification",
        value: "RDSO Spec E-1234",
        page: 5,
        line: 8,
        context: "Compliance reference for wiring standards",
      },
      {
        type: "PL",
        value: "PL 38140000",
        page: 7,
        context: "Control Electronics Cabinet connection detail",
        linkedId: "38140000",
      },
      {
        type: "Document",
        value: "DOC-2026-4001",
        page: 8,
        line: 22,
        context: "See Control System Architecture Specification",
        linkedId: "DOC-2026-4001",
      },
    ],
    "DOC-2026-9022": [
      {
        type: "PL",
        value: "PL 38100000",
        page: 1,
        context: "Referenced in document header",
        linkedId: "38100000",
      },
      {
        type: "PL",
        value: "PL 38130000",
        page: 4,
        line: 6,
        context: "Main Transformer thermal limits",
        linkedId: "38130000",
      },
      {
        type: "Specification",
        value: "IEC 60076-2",
        page: 12,
        context: "Temperature rise limits reference",
      },
      {
        type: "Drawing",
        value: "DWG-TRF-ASM-001",
        page: 15,
        context: "Transformer assembly cross-reference",
      },
    ],
    "DOC-2026-9023": [],
    "DOC-2025-1104": [
      {
        type: "PL",
        value: "PL 38112003",
        page: 2,
        context: "Damper Unit calibration data",
        linkedId: "38112003",
      },
      {
        type: "Specification",
        value: "RDSO Spec M-5500",
        page: 3,
        line: 11,
        context: "Calibration procedure reference",
      },
    ],
  };
  return (
    refs[docId] || [
      {
        type: "PL",
        value: "PL 38100000",
        page: 1,
        context: "Referenced in header block",
        linkedId: "38100000",
      },
    ]
  );
}

// Related documents mock
function getRelatedDocs(docId: string) {
  return MOCK_DOCUMENTS.filter((d) => d.id !== docId).slice(0, 3);
}

// Revision history mock
function getRevisionHistory(docId: string) {
  return [
    {
      revision: "C.1",
      date: "2026-03-20",
      author: "J. Halloway",
      notes: "Updated wiring diagram per ECO-2025-1102",
    },
    {
      revision: "C.0",
      date: "2025-11-15",
      author: "J. Halloway",
      notes: "Major revision — new layout format",
    },
    {
      revision: "B.4",
      date: "2025-06-10",
      author: "M. Chen",
      notes: "Corrected connector labeling on page 4",
    },
    {
      revision: "B.3",
      date: "2025-03-22",
      author: "M. Chen",
      notes: "Added thermal sensor wiring routes",
    },
    {
      revision: "A.0",
      date: "2024-08-01",
      author: "J. Halloway",
      notes: "Initial release",
    },
  ];
}

function refTypeColor(type: string) {
  if (type === "PL") return "text-teal-400 bg-teal-500/10 border-teal-500/20";
  if (type === "Drawing")
    return "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";
  if (type === "Specification")
    return "text-amber-400 bg-amber-500/10 border-amber-500/20";
  return "text-blue-400 bg-blue-500/10 border-blue-500/20";
}

export default function DocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [openTabs, setOpenTabs] = useState([
    { id: id || "DOC-2026-9021", active: true },
    { id: "DOC-2026-9022", active: false },
  ]);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [leftPanel, setLeftPanel] = useState<"pages" | "ocr">("pages");
  const [rightPanel, setRightPanel] = useState<
    "metadata" | "pl" | "related" | "revisions"
  >("metadata");
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [selectedOCRRef, setSelectedOCRRef] = useState<OCRReference | null>(
    null,
  );

  const activeDocId = openTabs.find((t) => t.active)?.id || id;
  const doc =
    MOCK_DOCUMENTS.find((d) => d.id === activeDocId) || MOCK_DOCUMENTS[0];
  const ocrRefs = useMemo(() => getDocOCRReferences(doc.id), [doc.id]);
  const relatedDocs = useMemo(() => getRelatedDocs(doc.id), [doc.id]);
  const revHistory = useMemo(() => getRevisionHistory(doc.id), [doc.id]);

  // Check if linked PL is an 8-digit number
  const linkedPLRecord = doc.linkedPL
    ? getPLRecord(doc.linkedPL.replace("PL-", "").replace("PL ", ""))
    : undefined;

  const handleTabClick = (tabId: string) => {
    setOpenTabs(openTabs.map((t) => ({ ...t, active: t.id === tabId })));
    setCurrentPage(1);
    setRotation(0);
  };

  const closeTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    const newTabs = openTabs.filter((t) => t.id !== tabId);
    if (newTabs.length === 0) {
      navigate("/documents");
      return;
    }
    if (openTabs.find((t) => t.id === tabId)?.active) {
      newTabs[0].active = true;
    }
    setOpenTabs(newTabs);
  };

  const addTab = () => {
    const availDoc = MOCK_DOCUMENTS.find(
      (d) => !openTabs.some((t) => t.id === d.id),
    );
    if (availDoc) {
      setOpenTabs([
        ...openTabs.map((t) => ({ ...t, active: false })),
        { id: availDoc.id, active: true },
      ]);
    }
  };

  const handleRefClick = (ref: OCRReference) => {
    setSelectedOCRRef(ref);
    if (ref.linkedId) {
      if (ref.type === "PL") navigate(`/pl/${ref.linkedId}`);
      else if (ref.type === "Document") navigate(`/documents/${ref.linkedId}`);
    }
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-0 max-w-[1800px] mx-auto">
      {/* ── DOCUMENT TABS ── */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-slate-900/60 border-b border-teal-500/10 shrink-0">
        {openTabs.map((tab) => {
          const tabDoc = MOCK_DOCUMENTS.find((d) => d.id === tab.id);
          return (
            <div
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-t-lg cursor-pointer transition-colors text-xs border-b-2
                ${tab.active ? "bg-teal-900/20 border-teal-400 text-teal-300" : "bg-slate-900/50 border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800"}`}
            >
              <FileText className="w-3 h-3" />
              <span
                className="max-w-[140px] truncate"
                style={{ fontWeight: tab.active ? 500 : 400 }}
              >
                {tabDoc?.id || tab.id}
              </span>
              <X
                className="w-3 h-3 ml-1 hover:bg-slate-700 rounded-full shrink-0"
                onClick={(e) => closeTab(e, tab.id)}
              />
            </div>
          );
        })}
        <button
          onClick={addTab}
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-600 hover:text-slate-400 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── WORKSPACE HEADER ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/40 border-b border-teal-500/10 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={() => navigate("/documents")}
            className="p-1 hover:bg-slate-800 rounded-lg shrink-0"
          >
            <ChevronLeft className="w-4 h-4 text-slate-500" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1
                className="text-base text-white truncate"
                style={{ fontWeight: 600 }}
              >
                {doc.name}
              </h1>
              <Badge
                variant={
                  doc.status === "Approved"
                    ? "success"
                    : doc.status === "In Review"
                      ? "warning"
                      : "default"
                }
                className="text-[9px] shrink-0"
              >
                {doc.status}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-0.5">
              <code className="text-teal-400 font-mono">{doc.id}</code>
              <span>Rev {doc.revision}</span>
              <span>
                {doc.type} · {doc.size}
              </span>
              <span>{doc.pages} pages</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" className="px-2 py-1.5 text-xs">
            <Printer className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" className="px-2 py-1.5 text-xs">
            <Edit3 className="w-3.5 h-3.5" /> Edit
          </Button>
          <Button variant="secondary" className="px-3 py-1.5 text-xs">
            <Download className="w-3.5 h-3.5" /> Download
          </Button>
          <Button className="px-3 py-1.5 text-xs">Route for Approval</Button>
        </div>
      </div>

      {/* ── 3-COLUMN WORKSPACE ── */}
      <div className="flex-1 flex min-h-0">
        {/* ── LEFT PANEL: Page Navigation + OCR Matches ── */}
        {showLeftPanel && (
          <div className="w-56 shrink-0 border-r border-slate-800/50 flex flex-col bg-slate-950/30">
            {/* Panel tabs */}
            <div className="flex border-b border-slate-800 shrink-0">
              <button
                onClick={() => setLeftPanel("pages")}
                className={`flex-1 px-3 py-2 text-[10px] border-b-2 transition-colors ${leftPanel === "pages" ? "border-teal-400 text-teal-300" : "border-transparent text-slate-500"}`}
              >
                Pages
              </button>
              <button
                onClick={() => setLeftPanel("ocr")}
                className={`flex-1 px-3 py-2 text-[10px] border-b-2 transition-colors ${leftPanel === "ocr" ? "border-teal-400 text-teal-300" : "border-transparent text-slate-500"}`}
              >
                OCR Matches ({ocrRefs.length})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {leftPanel === "pages" ? (
                /* Page thumbnails */
                <div className="space-y-2">
                  {Array.from({ length: doc.pages }, (_, i) => i + 1).map(
                    (pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-full rounded-lg overflow-hidden border transition-colors ${currentPage === pageNum ? "border-teal-400 ring-1 ring-teal-400/30" : "border-slate-700/30 hover:border-slate-600"}`}
                      >
                        <div className="w-full aspect-[8.5/11] bg-slate-800/50 flex items-center justify-center relative">
                          <FileText className="w-6 h-6 text-slate-700" />
                          {/* Show OCR indicator if this page has references */}
                          {ocrRefs.some((r) => r.page === pageNum) && (
                            <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400" />
                          )}
                        </div>
                        <div
                          className={`py-1 text-center text-[9px] ${currentPage === pageNum ? "bg-teal-500/10 text-teal-300" : "text-slate-500"}`}
                        >
                          Page {pageNum}
                        </div>
                      </button>
                    ),
                  )}
                </div>
              ) : (
                /* OCR detected references */
                <div className="space-y-1.5">
                  {ocrRefs.length === 0 ? (
                    <div className="text-center py-6 text-slate-600">
                      <FileSearch className="w-6 h-6 mx-auto mb-2 opacity-50" />
                      <p className="text-[10px]">No OCR references detected</p>
                    </div>
                  ) : (
                    ocrRefs.map((ref, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setCurrentPage(ref.page);
                          setSelectedOCRRef(ref);
                        }}
                        className={`w-full p-2 rounded-lg border text-left transition-colors hover:bg-slate-800/40
                          ${selectedOCRRef === ref ? "border-teal-500/40 bg-teal-500/5" : "border-slate-700/30"}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className={`text-[8px] px-1.5 py-0.5 rounded border ${refTypeColor(ref.type)}`}
                          >
                            {ref.type}
                          </span>
                          <span className="text-[9px] text-slate-500">
                            P.{ref.page}
                            {ref.line ? `, L.${ref.line}` : ""}
                          </span>
                        </div>
                        <p
                          className="text-[10px] text-teal-300 font-mono"
                          style={{ fontWeight: 500 }}
                        >
                          {ref.value}
                        </p>
                        <p className="text-[9px] text-slate-500 mt-0.5 line-clamp-2">
                          {ref.context}
                        </p>
                        {ref.linkedId && (
                          <span className="text-[8px] text-teal-400 flex items-center gap-0.5 mt-1">
                            <ExternalLink className="w-2.5 h-2.5" /> Click to
                            navigate
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CENTER: Document Viewer ── */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
          {/* Viewer toolbar */}
          <div className="h-10 border-b border-slate-800/50 flex items-center justify-between px-3 bg-slate-900/50 shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowLeftPanel(!showLeftPanel)}
                className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-slate-300"
              >
                {showLeftPanel ? (
                  <ChevronLeft className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
              <div className="w-px h-4 bg-slate-800" />
              {/* Page navigation */}
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 disabled:opacity-30"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] text-slate-300 font-mono min-w-[80px] text-center">
                Page {currentPage} / {doc.pages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(doc.pages, p + 1))
                }
                disabled={currentPage >= doc.pages}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 disabled:opacity-30"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoom((z) => Math.max(25, z - 25))}
                className="p-1 hover:bg-slate-800 rounded text-slate-400"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] text-slate-400 font-mono w-10 text-center">
                {zoom}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(300, z + 25))}
                className="p-1 hover:bg-slate-800 rounded text-slate-400"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-4 bg-slate-800 mx-1" />
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-1 hover:bg-slate-800 rounded text-slate-400"
                title="Rotate"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoom(100)}
                className="p-1 hover:bg-slate-800 rounded text-slate-400"
                title="Fit to Width"
              >
                <Scaling className="w-3.5 h-3.5" />
              </button>
              <button
                className="p-1 hover:bg-slate-800 rounded text-slate-400"
                title="Fullscreen"
              >
                <Maximize className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-4 bg-slate-800 mx-1" />
              <button
                onClick={() => setShowRightPanel(!showRightPanel)}
                className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-slate-300"
              >
                {showRightPanel ? (
                  <ChevronRight className="w-3.5 h-3.5" />
                ) : (
                  <ChevronLeft className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Document rendering area */}
          <div className="flex-1 overflow-auto p-8 flex items-start justify-center">
            <div
              className="relative"
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transformOrigin: "top center",
                transition: "transform 0.2s ease",
              }}
            >
              {doc.type === "PDF" ||
              doc.type === "PNG" ||
              doc.type === "DOCX" ? (
                <div className="w-[680px] bg-white shadow-2xl shadow-black/40 rounded-sm border border-slate-700/30 relative">
                  {/* Simulated document content */}
                  <div className="aspect-[8.5/11] p-12 flex flex-col">
                    {/* Header */}
                    <div className="border-b-2 border-slate-300 pb-4 mb-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] text-slate-400 font-mono">
                            DOCUMENT NO: {doc.id}
                          </p>
                          <h2
                            className="text-sm text-slate-800 mt-1"
                            style={{ fontWeight: 600 }}
                          >
                            {doc.name}
                          </h2>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Revision {doc.revision} | {doc.date}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] text-slate-400 uppercase tracking-wider">
                            WAP7 Locomotive EDMS
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {doc.owner}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Simulated content with clickable OCR references */}
                    <div className="flex-1 space-y-4 text-[10px] text-slate-600 leading-relaxed">
                      <p>
                        This document describes the {doc.name.toLowerCase()}{" "}
                        specifications and requirements for the WAP7 locomotive
                        project.
                      </p>

                      {ocrRefs.filter((r) => r.page === currentPage).length >
                        0 && (
                        <div className="space-y-3">
                          <p className="text-slate-500">
                            The following references are detected on this page:
                          </p>
                          {ocrRefs
                            .filter((r) => r.page === currentPage)
                            .map((ref, i) => (
                              <div key={i} className="relative">
                                <p className="text-slate-600">
                                  {ref.context
                                    .split(ref.value)
                                    .map((part, j, arr) => (
                                      <span key={j}>
                                        {part}
                                        {j < arr.length - 1 && (
                                          <button
                                            onClick={() => handleRefClick(ref)}
                                            className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200 transition-colors cursor-pointer text-[10px]"
                                            style={{ fontWeight: 600 }}
                                          >
                                            {ref.value}
                                            {ref.linkedId && (
                                              <ExternalLink className="w-2.5 h-2.5" />
                                            )}
                                          </button>
                                        )}
                                      </span>
                                    ))}
                                  {ref.line && (
                                    <span className="text-slate-400 ml-2">
                                      [Line {ref.line}]
                                    </span>
                                  )}
                                </p>
                              </div>
                            ))}
                        </div>
                      )}

                      <div className="mt-6 p-4 bg-slate-50 rounded border border-slate-200">
                        <p className="text-[9px] text-slate-500 italic">
                          [Simulated document content — Page {currentPage} of{" "}
                          {doc.pages}]
                        </p>
                        <p className="text-[9px] text-slate-400 mt-1">
                          In a production environment, this area would render
                          the actual PDF/document content with highlighted
                          OCR-detected references as clickable links.
                        </p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-slate-200 pt-3 mt-4 flex justify-between text-[8px] text-slate-400">
                      <span>
                        {doc.id} Rev {doc.revision}
                      </span>
                      <span>
                        Page {currentPage} of {doc.pages}
                      </span>
                      <span>
                        {doc.lifecycle} — {doc.category}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-[680px] aspect-[8.5/11] bg-slate-800 rounded-sm flex flex-col items-center justify-center text-slate-500 border border-slate-700">
                  <FileSearch className="w-16 h-16 mb-4 opacity-50" />
                  <p>Preview not available for {doc.type} files.</p>
                  <Button variant="secondary" className="mt-4">
                    <Download className="w-4 h-4" /> Download to View
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Bottom toolbar */}
          <div className="h-10 border-t border-slate-800/50 flex items-center justify-between px-3 bg-slate-900/50 shrink-0">
            <div className="flex items-center gap-2">
              <Button variant="ghost" className="px-2 py-1 text-[10px]">
                <Download className="w-3 h-3" /> Download
              </Button>
              <Button variant="ghost" className="px-2 py-1 text-[10px]">
                <RefreshCw className="w-3 h-3" /> Re-OCR
              </Button>
              <Button variant="ghost" className="px-2 py-1 text-[10px]">
                <RotateCw className="w-3 h-3" /> Rotate
              </Button>
              <Button variant="ghost" className="px-2 py-1 text-[10px]">
                <GitCompare className="w-3 h-3" /> Compare
              </Button>
              <Button variant="ghost" className="px-2 py-1 text-[10px]">
                <Paperclip className="w-3 h-3" /> Attach
              </Button>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-600">
              {doc.ocrStatus === "Completed" && (
                <span className="flex items-center gap-1 text-teal-400">
                  <CheckCircle className="w-3 h-3" /> OCR: {doc.ocrConfidence}%
                </span>
              )}
              {doc.ocrStatus === "Processing" && (
                <Badge variant="processing" className="text-[8px]">
                  OCR Processing
                </Badge>
              )}
              {doc.ocrStatus === "Failed" && (
                <Badge variant="danger" className="text-[8px]">
                  OCR Failed
                </Badge>
              )}
              <span className="ml-2">{ocrRefs.length} references detected</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL: Metadata + Intelligence ── */}
        {showRightPanel && (
          <div className="w-72 shrink-0 border-l border-slate-800/50 flex flex-col bg-slate-950/30">
            {/* Panel tabs */}
            <div className="flex border-b border-slate-800 shrink-0 overflow-x-auto">
              {[
                { id: "metadata", label: "Metadata" },
                { id: "pl", label: "PL Info" },
                { id: "related", label: "Related" },
                { id: "revisions", label: "History" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setRightPanel(tab.id as any)}
                  className={`flex-1 px-2 py-2 text-[10px] border-b-2 transition-colors whitespace-nowrap
                    ${rightPanel === tab.id ? "border-teal-400 text-teal-300" : "border-transparent text-slate-500"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {/* ── METADATA ── */}
              {rightPanel === "metadata" && (
                <>
                  <div>
                    <h4 className="text-[9px] text-slate-600 uppercase tracking-wider mb-2">
                      Identity
                    </h4>
                    <div className="space-y-2">
                      {[
                        { label: "Document ID", value: doc.id, mono: true },
                        { label: "Category", value: doc.category },
                        { label: "Lifecycle", value: doc.lifecycle },
                        {
                          label: "Owner",
                          value: `${doc.owner} (${doc.author})`,
                        },
                        { label: "Upload Date", value: doc.date },
                        { label: "Revision", value: doc.revision },
                        {
                          label: "File Type",
                          value: `${doc.type} · ${doc.size}`,
                        },
                        { label: "Pages", value: String(doc.pages) },
                      ].map((item) => (
                        <div key={item.label} className="flex justify-between">
                          <span className="text-[10px] text-slate-500">
                            {item.label}
                          </span>
                          <span
                            className={`text-[10px] text-slate-300 ${(item as any).mono ? "font-mono text-teal-400" : ""}`}
                          >
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[9px] text-slate-600 uppercase tracking-wider mb-2">
                      Tags
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {doc.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700"
                        >
                          {tag}
                        </span>
                      ))}
                      <button className="text-[9px] text-teal-400 px-2 py-0.5 rounded-full border border-teal-500/30 border-dashed hover:bg-teal-500/5">
                        + Add
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[9px] text-slate-600 uppercase tracking-wider mb-2">
                      Linked PL Record
                    </h4>
                    <button
                      onClick={() =>
                        doc.linkedPL &&
                        navigate(`/pl/${doc.linkedPL.replace("PL-", "")}`)
                      }
                      className="w-full p-2 rounded-lg border border-slate-700/30 bg-slate-800/20 hover:border-teal-500/30 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <LinkIcon className="w-3.5 h-3.5 text-teal-500" />
                        <span
                          className="text-[10px] text-teal-400 font-mono"
                          style={{ fontWeight: 500 }}
                        >
                          {doc.linkedPL}
                        </span>
                      </div>
                    </button>
                  </div>

                  <div>
                    <h4 className="text-[9px] text-slate-600 uppercase tracking-wider mb-2">
                      Used In (BOM)
                    </h4>
                    <button
                      onClick={() => navigate("/bom")}
                      className="w-full p-2 rounded-lg border border-slate-700/30 bg-slate-800/20 hover:border-teal-500/30 transition-colors text-left flex items-center gap-2"
                    >
                      <Box className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-[10px] text-slate-300">
                        WAP7 Locomotive Assembly
                      </span>
                    </button>
                  </div>

                  {/* OCR Status */}
                  <div>
                    <h4 className="text-[9px] text-slate-600 uppercase tracking-wider mb-2">
                      OCR Intelligence
                    </h4>
                    <div className="p-2 rounded-lg border border-slate-700/30 bg-slate-800/20">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-slate-500">
                          Status
                        </span>
                        <Badge
                          variant={
                            doc.ocrStatus === "Completed"
                              ? "success"
                              : doc.ocrStatus === "Processing"
                                ? "processing"
                                : "danger"
                          }
                          className="text-[8px]"
                        >
                          {doc.ocrStatus}
                        </Badge>
                      </div>
                      {doc.ocrConfidence !== null && (
                        <>
                          <div className="flex justify-between text-[10px] mb-1">
                            <span className="text-slate-500">Confidence</span>
                            <span
                              className={
                                doc.ocrConfidence > 90
                                  ? "text-teal-400"
                                  : "text-amber-400"
                              }
                            >
                              {doc.ocrConfidence}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1">
                            <div
                              className={`h-1 rounded-full ${doc.ocrConfidence > 90 ? "bg-teal-500" : "bg-amber-500"}`}
                              style={{ width: `${doc.ocrConfidence}%` }}
                            />
                          </div>
                        </>
                      )}
                      <div className="flex justify-between text-[10px] mt-1.5">
                        <span className="text-slate-500">References Found</span>
                        <span className="text-slate-300">{ocrRefs.length}</span>
                      </div>
                    </div>
                    <Button variant="ghost" className="w-full mt-2 text-[10px]">
                      <RefreshCw className="w-3 h-3" /> Rerun OCR Extraction
                    </Button>
                  </div>
                </>
              )}

              {/* ── PL INFORMATION ── */}
              {rightPanel === "pl" && (
                <>
                  {linkedPLRecord ? (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg border border-teal-500/20 bg-teal-500/5">
                        <div className="flex items-center gap-2 mb-2">
                          <Hash className="w-4 h-4 text-teal-400" />
                          <code className="text-xs text-teal-400 font-mono">
                            PL {linkedPLRecord.plNumber}
                          </code>
                        </div>
                        <h4
                          className="text-xs text-white mb-1"
                          style={{ fontWeight: 500 }}
                        >
                          {linkedPLRecord.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 line-clamp-3">
                          {linkedPLRecord.description}
                        </p>
                      </div>
                      <div className="space-y-2">
                        {[
                          { label: "Type", value: linkedPLRecord.type },
                          {
                            label: "Lifecycle",
                            value: linkedPLRecord.lifecycleState,
                          },
                          { label: "Owner", value: linkedPLRecord.owner },
                          {
                            label: "Weight",
                            value: linkedPLRecord.weight || "—",
                          },
                          {
                            label: "Material",
                            value: linkedPLRecord.material || "—",
                          },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="flex justify-between"
                          >
                            <span className="text-[10px] text-slate-500">
                              {item.label}
                            </span>
                            <span className="text-[10px] text-slate-300">
                              {item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                      {linkedPLRecord.safetyVital && (
                        <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
                          <Shield className="w-3.5 h-3.5 text-rose-400" />
                          <span className="text-[10px] text-rose-300">
                            Safety Vital Classification
                          </span>
                        </div>
                      )}
                      <Button
                        variant="secondary"
                        className="w-full text-[10px]"
                        onClick={() =>
                          navigate(`/pl/${linkedPLRecord.plNumber}`)
                        }
                      >
                        <ExternalLink className="w-3 h-3" /> View Full PL Record
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-600">
                      <Hash className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-xs">
                        Linked PL: {doc.linkedPL || "None"}
                      </p>
                      <p className="text-[10px] text-slate-700 mt-1">
                        Detailed PL data available for 8-digit PL numbers
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* ── RELATED DOCUMENTS ── */}
              {rightPanel === "related" && (
                <>
                  <h4 className="text-[9px] text-slate-600 uppercase tracking-wider">
                    Related Documents
                  </h4>
                  <div className="space-y-2">
                    {relatedDocs.map((rd) => (
                      <button
                        key={rd.id}
                        onClick={() => navigate(`/documents/${rd.id}`)}
                        className="w-full p-2.5 rounded-lg border border-slate-700/30 bg-slate-800/20 hover:border-teal-500/30 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-3.5 h-3.5 text-teal-500" />
                          <code className="text-[9px] text-teal-400 font-mono">
                            {rd.id}
                          </code>
                          <Badge
                            variant={
                              rd.status === "Approved"
                                ? "success"
                                : rd.status === "In Review"
                                  ? "warning"
                                  : "default"
                            }
                            className="text-[7px] px-1"
                          >
                            {rd.status}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-slate-300 line-clamp-1">
                          {rd.name}
                        </p>
                        <p className="text-[9px] text-slate-600 mt-0.5">
                          Rev {rd.revision} · {rd.type}
                        </p>
                      </button>
                    ))}
                  </div>

                  {/* OCR-Suggested Links */}
                  <h4 className="text-[9px] text-slate-600 uppercase tracking-wider mt-4">
                    OCR-Suggested Links
                  </h4>
                  <div className="space-y-2">
                    {ocrRefs
                      .filter((r) => r.type === "Document" && r.linkedId)
                      .map((ref, i) => (
                        <div
                          key={i}
                          className="p-2 rounded-lg border border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40 transition-colors cursor-pointer"
                          onClick={() => handleRefClick(ref)}
                        >
                          <div className="flex items-center gap-1.5">
                            <FileSearch className="w-3 h-3 text-amber-400" />
                            <span className="text-[9px] text-amber-300 font-mono">
                              {ref.value}
                            </span>
                          </div>
                          <p className="text-[9px] text-slate-500 mt-0.5">
                            {ref.context}
                          </p>
                          <p className="text-[8px] text-amber-400 mt-1">
                            Found on Page {ref.page}
                          </p>
                        </div>
                      ))}
                  </div>
                </>
              )}

              {/* ── REVISION HISTORY ── */}
              {rightPanel === "revisions" && (
                <>
                  <h4 className="text-[9px] text-slate-600 uppercase tracking-wider">
                    Revision History
                  </h4>
                  <div className="space-y-0">
                    {revHistory.map((rev, i) => (
                      <div key={rev.revision} className="relative pl-5 pb-4">
                        {/* Timeline line */}
                        {i < revHistory.length - 1 && (
                          <div className="absolute left-[7px] top-3 bottom-0 w-px bg-slate-700/50" />
                        )}
                        {/* Timeline dot */}
                        <div
                          className={`absolute left-0 top-1 w-4 h-4 rounded-full flex items-center justify-center
                          ${i === 0 ? "bg-teal-500/20 border-2 border-teal-400" : "bg-slate-800 border border-slate-700"}`}
                        >
                          {i === 0 && (
                            <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span
                              className="text-[10px] text-white font-mono"
                              style={{ fontWeight: 500 }}
                            >
                              Rev {rev.revision}
                            </span>
                            {i === 0 && (
                              <Badge
                                variant="success"
                                className="text-[7px] px-1"
                              >
                                Current
                              </Badge>
                            )}
                          </div>
                          <p className="text-[9px] text-slate-400">
                            {rev.notes}
                          </p>
                          <div className="flex items-center gap-2 text-[8px] text-slate-600 mt-0.5">
                            <span>{rev.date}</span>
                            <span>{rev.author}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
