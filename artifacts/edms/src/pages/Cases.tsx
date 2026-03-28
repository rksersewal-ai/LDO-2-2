import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileSearch,
  FileText,
  Link as LinkIcon,
  MessageSquareText,
  Plus,
  ShieldAlert,
  User,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { GlassCard, Badge, Button, Input, Select } from '../components/ui/Shared';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { PLNumberSelect } from '../components/ui/PLNumberSelect';
import { MOCK_DOCUMENTS } from '../lib/mock';
import type { CaseRecord } from '../lib/types';
import { usePLItems } from '../hooks/usePLItems';
import { CaseService } from '../services/CaseService';

type DisplayStatus = 'Open' | 'In Progress' | 'Closed';
type DisplaySeverity = 'Low' | 'Medium' | 'High' | 'Critical';

interface CaseComment {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

interface NewCaseFormState {
  title: string;
  description: string;
  assignee: string;
  severity: DisplaySeverity;
  plNumber: string;
}

const COMMENTS_KEY = 'ldo2_case_comments';

const DEFAULT_NEW_CASE_FORM: NewCaseFormState = {
  title: '',
  description: '',
  assignee: '',
  severity: 'Medium',
  plNumber: '',
};

function toDisplayStatus(status: CaseRecord['status']): DisplayStatus {
  if (status === 'CLOSED') return 'Closed';
  if (status === 'IN_PROGRESS') return 'In Progress';
  return 'Open';
}

function toInternalStatus(status: DisplayStatus): CaseRecord['status'] {
  if (status === 'Closed') return 'CLOSED';
  if (status === 'In Progress') return 'IN_PROGRESS';
  return 'OPEN';
}

function toDisplaySeverity(severity: CaseRecord['severity']): DisplaySeverity {
  if (severity === 'LOW') return 'Low';
  if (severity === 'HIGH') return 'High';
  if (severity === 'CRITICAL') return 'Critical';
  return 'Medium';
}

function toInternalSeverity(severity: DisplaySeverity): CaseRecord['severity'] {
  if (severity === 'Low') return 'LOW';
  if (severity === 'High') return 'HIGH';
  if (severity === 'Critical') return 'CRITICAL';
  return 'MEDIUM';
}

function statusVariant(status: DisplayStatus) {
  if (status === 'Closed') return 'success' as const;
  if (status === 'Open') return 'danger' as const;
  if (status === 'In Progress') return 'warning' as const;
  return 'default' as const;
}

function severityVariant(severity: DisplaySeverity) {
  if (severity === 'Critical') return 'danger' as const;
  if (severity === 'High') return 'danger' as const;
  if (severity === 'Medium') return 'warning' as const;
  return 'default' as const;
}

function formatDate(value: string) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function loadComments(): Record<string, CaseComment[]> {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(COMMENTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function persistComments(value: Record<string, CaseComment[]>) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(COMMENTS_KEY, JSON.stringify(value));
  }
}

export default function Cases() {
  const navigate = useNavigate();
  const { data: plItems, loading: plItemsLoading } = usePLItems();
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | DisplayStatus>('All');
  const [commentsByCase, setCommentsByCase] = useState<Record<string, CaseComment[]>>(() => loadComments());
  const [newCaseOpen, setNewCaseOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [newCaseForm, setNewCaseForm] = useState<NewCaseFormState>(DEFAULT_NEW_CASE_FORM);
  const [statusDraft, setStatusDraft] = useState<DisplayStatus>('Open');
  const [statusNote, setStatusNote] = useState('');
  const [commentDraft, setCommentDraft] = useState('');
  const [documentSearch, setDocumentSearch] = useState('');

  const refreshCases = async () => {
    const result = await CaseService.getAll();
    setCases(result);
  };

  useEffect(() => {
    refreshCases();
  }, []);

  useEffect(() => {
    persistComments(commentsByCase);
  }, [commentsByCase]);

  const selectedCase = useMemo(
    () => cases.find((item) => item.id === selectedCaseId || item.caseNumber === selectedCaseId) ?? null,
    [cases, selectedCaseId]
  );

  const filtered = useMemo(() => {
    return cases.filter((record) => {
      const displayStatus = toDisplayStatus(record.status);
      const matchesStatus = statusFilter === 'All' || displayStatus === statusFilter;
      const query = search.trim().toLowerCase();
      const matchesSearch = !query
        || record.title.toLowerCase().includes(query)
        || record.caseNumber.toLowerCase().includes(query)
        || (record.plNumber?.toLowerCase().includes(query) ?? false)
        || record.assignee.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [cases, search, statusFilter]);

  const linkedDocs = useMemo(
    () => selectedCase
      ? MOCK_DOCUMENTS.filter((document) => selectedCase.linkedDocumentIds.includes(document.id))
      : [],
    [selectedCase]
  );

  const filteredDocuments = useMemo(() => {
    const query = documentSearch.trim().toLowerCase();
    return MOCK_DOCUMENTS.filter((document) => {
      if (selectedCase?.linkedDocumentIds.includes(document.id)) {
        return false;
      }

      return !query
        || document.id.toLowerCase().includes(query)
        || document.name.toLowerCase().includes(query)
        || document.linkedPL.toLowerCase().includes(query);
    });
  }, [documentSearch, selectedCase]);

  const selectedComments = selectedCase ? (commentsByCase[selectedCase.id] ?? []) : [];

  const resetNewCaseForm = () => {
    setNewCaseForm(DEFAULT_NEW_CASE_FORM);
    setNewCaseOpen(false);
  };

  const addCommentToCase = async (caseId: string, text: string) => {
    if (!text.trim()) {
      return;
    }

    const nextComment: CaseComment = {
      id: `CMT-${Date.now()}`,
      text: text.trim(),
      author: 'EDMS Administrator',
      createdAt: new Date().toISOString(),
    };

    setCommentsByCase((current) => ({
      ...current,
      [caseId]: [nextComment, ...(current[caseId] ?? [])],
    }));
    await CaseService.update(caseId, {});
    await refreshCases();
  };

  const handleCreateCase = async () => {
    if (!newCaseForm.title.trim() || !newCaseForm.description.trim() || !newCaseForm.assignee.trim()) {
      toast.error('Title, description, and assignee are required');
      return;
    }

    const created = await CaseService.add({
      title: newCaseForm.title.trim(),
      description: newCaseForm.description.trim(),
      status: 'OPEN',
      severity: toInternalSeverity(newCaseForm.severity),
      plNumber: newCaseForm.plNumber || undefined,
      linkedDocumentIds: [],
      linkedWorkIds: [],
      assignee: newCaseForm.assignee.trim(),
      type: 'Discrepancy',
    });

    await refreshCases();
    setSelectedCaseId(created.id);
    resetNewCaseForm();
    toast.success(`Case ${created.caseNumber} created`);
  };

  const handleStatusSave = async () => {
    if (!selectedCase) return;

    await CaseService.update(selectedCase.id, { status: toInternalStatus(statusDraft) });
    if (statusNote.trim()) {
      await addCommentToCase(selectedCase.id, `Status updated to ${statusDraft}: ${statusNote.trim()}`);
      setStatusNote('');
    } else {
      await refreshCases();
    }
    setStatusDialogOpen(false);
    toast.success(`Case moved to ${statusDraft}`);
  };

  const handleCommentSave = async () => {
    if (!selectedCase || !commentDraft.trim()) {
      return;
    }

    await addCommentToCase(selectedCase.id, commentDraft);
    setCommentDraft('');
    setCommentDialogOpen(false);
    toast.success('Comment added');
  };

  const handleLinkDocument = async (documentId: string) => {
    if (!selectedCase) return;

    const nextIds = [...selectedCase.linkedDocumentIds, documentId];
    await CaseService.update(selectedCase.id, { linkedDocumentIds: nextIds });
    await refreshCases();
    setLinkDialogOpen(false);
    setDocumentSearch('');
    toast.success(`Linked ${documentId} to ${selectedCase.caseNumber}`);
  };

  const handleUnlinkDocument = async (documentId: string) => {
    if (!selectedCase) return;

    await CaseService.update(selectedCase.id, {
      linkedDocumentIds: selectedCase.linkedDocumentIds.filter((id) => id !== documentId),
    });
    await refreshCases();
    toast.success(`Removed ${documentId} from ${selectedCase.caseNumber}`);
  };

  const handleCloseCase = async () => {
    if (!selectedCase) return;

    await CaseService.update(selectedCase.id, { status: 'CLOSED' });
    if (statusNote.trim()) {
      await addCommentToCase(selectedCase.id, `Case closed: ${statusNote.trim()}`);
      setStatusNote('');
    } else {
      await refreshCases();
    }

    setCloseDialogOpen(false);
    toast.success(`${selectedCase.caseNumber} closed`);
  };

  if (selectedCase) {
    const selectedPl = selectedCase.plNumber
      ? plItems.find((item) => item.plNumber === selectedCase.plNumber)
      : null;
    const displayStatus = toDisplayStatus(selectedCase.status);
    const displaySeverity = toDisplaySeverity(selectedCase.severity);

    return (
      <>
        <div className="space-y-6 max-w-[1200px] mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="px-2" onClick={() => setSelectedCaseId(null)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                <h1 className="text-2xl font-bold text-white">{selectedCase.title}</h1>
                <Badge variant={statusVariant(displayStatus)}>{displayStatus}</Badge>
                <Badge variant={severityVariant(displaySeverity)}>{displaySeverity}</Badge>
              </div>
              <p className="text-sm text-slate-400 mt-1 font-mono pl-8">
                {selectedCase.caseNumber} · Updated {formatDate(selectedCase.updatedAt)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <GlassCard className="p-6">
                <h2 className="text-lg font-bold text-white mb-4">Case Description</h2>
                <p className="text-slate-300 leading-relaxed">{selectedCase.description}</p>
              </GlassCard>

              <GlassCard className="p-6">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h2 className="text-lg font-bold text-white">Linked Documents</h2>
                  <Button variant="secondary" size="sm" onClick={() => setLinkDialogOpen(true)}>
                    <Plus className="w-3.5 h-3.5" /> Link Document
                  </Button>
                </div>
                {linkedDocs.length > 0 ? (
                  <div className="space-y-2">
                    {linkedDocs.map((document) => (
                      <div key={document.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 border border-slate-700/50">
                        <button
                          className="flex flex-1 items-center gap-3 text-left hover:text-teal-300 transition-colors"
                          onClick={() => navigate(`/documents/${document.id}`)}
                        >
                          <FileText className="w-4 h-4 text-teal-500" />
                          <div className="min-w-0">
                            <p className="text-sm text-teal-400 font-mono">{document.id}</p>
                            <p className="text-xs text-slate-400 truncate">{document.name}</p>
                          </div>
                        </button>
                        <Button variant="ghost" size="sm" onClick={() => handleUnlinkDocument(document.id)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No documents linked to this case yet.</p>
                )}
              </GlassCard>

              <GlassCard className="p-6">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h2 className="text-lg font-bold text-white">Notes & Activity</h2>
                  <Button variant="secondary" size="sm" onClick={() => setCommentDialogOpen(true)}>
                    <MessageSquareText className="w-3.5 h-3.5" /> Add Comment
                  </Button>
                </div>
                {selectedComments.length > 0 ? (
                  <div className="space-y-3">
                    {selectedComments.map((comment) => (
                      <div key={comment.id} className="rounded-xl border border-white/6 bg-slate-950/35 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-slate-200">{comment.author}</p>
                          <p className="text-[11px] text-slate-500">{formatDate(comment.createdAt)}</p>
                        </div>
                        <p className="mt-2 text-sm text-slate-400">{comment.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No comments recorded for this case yet.</p>
                )}
              </GlassCard>
            </div>

            <div className="space-y-4">
              <GlassCard className="p-5">
                <h3 className="text-sm font-bold text-white mb-4">Case Metadata</h3>
                <div className="space-y-3">
                  {[
                    { icon: User, label: 'Assignee', value: selectedCase.assignee },
                    { icon: Calendar, label: 'Created', value: formatDate(selectedCase.createdAt) },
                    { icon: Clock, label: 'Updated', value: formatDate(selectedCase.updatedAt) },
                  ].map((field) => (
                    <div key={field.label} className="flex items-center gap-3">
                      <field.icon className="w-4 h-4 text-slate-500 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500">{field.label}</p>
                        <p className="text-sm text-slate-200">{field.value}</p>
                      </div>
                    </div>
                  ))}

                  <div className="flex items-center gap-3">
                    <LinkIcon className="w-4 h-4 text-slate-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">Linked PL</p>
                      {selectedCase.plNumber ? (
                        <button
                          onClick={() => navigate(`/pl/${selectedCase.plNumber}`)}
                          className="text-sm text-teal-300 hover:text-teal-200 transition-colors"
                        >
                          {selectedCase.plNumber} {selectedPl ? `· ${selectedPl.name}` : ''}
                        </button>
                      ) : (
                        <p className="text-sm text-slate-400">No PL linked</p>
                      )}
                    </div>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <h3 className="text-sm font-bold text-white mb-3">Actions</h3>
                <div className="space-y-2">
                  <Button
                    className="w-full justify-start"
                    onClick={() => {
                      setStatusDraft(displayStatus);
                      setStatusDialogOpen(true);
                    }}
                  >
                    Update Status
                  </Button>
                  <Button variant="secondary" className="w-full justify-start" onClick={() => setCommentDialogOpen(true)}>
                    Add Comment
                  </Button>
                  <Button variant="secondary" className="w-full justify-start" onClick={() => setLinkDialogOpen(true)}>
                    Link Document
                  </Button>
                  {displayStatus !== 'Closed' && (
                    <Button
                      variant="danger"
                      className="w-full justify-start"
                      onClick={() => setCloseDialogOpen(true)}
                    >
                      Close Case
                    </Button>
                  )}
                </div>
              </GlassCard>
            </div>
          </div>
        </div>

        <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
          <DialogContent className="border border-slate-700/60 bg-slate-950 text-slate-100 sm:max-w-[460px]">
            <DialogHeader>
              <DialogTitle>Update Case Status</DialogTitle>
              <DialogDescription className="text-slate-400">
                Apply a workflow status to {selectedCase.caseNumber} without leaving the current review context.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Status</label>
                <Select value={statusDraft} onChange={(event) => setStatusDraft(event.target.value as DisplayStatus)}>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Closed">Closed</option>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Operator Note</label>
                <Textarea value={statusNote} onChange={(event) => setStatusNote(event.target.value)} placeholder="Optional status rationale for the case log." />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="secondary" onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleStatusSave}>Save Status</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
          <DialogContent className="border border-slate-700/60 bg-slate-950 text-slate-100 sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Add Case Comment</DialogTitle>
              <DialogDescription className="text-slate-400">
                Add a review note, engineering observation, or follow-up instruction.
              </DialogDescription>
            </DialogHeader>
            <Textarea value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} placeholder="Write the case note to store in the activity log." />
            <DialogFooter className="gap-2">
              <Button variant="secondary" onClick={() => setCommentDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCommentSave}>Add Comment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
          <DialogContent className="border border-slate-700/60 bg-slate-950 text-slate-100 sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Link Document</DialogTitle>
              <DialogDescription className="text-slate-400">
                Search the repository and link one of the accessible documents to this case.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                value={documentSearch}
                onChange={(event) => setDocumentSearch(event.target.value)}
                placeholder="Search by document ID, title, or linked PL..."
              />
              <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                {filteredDocuments.length > 0 ? filteredDocuments.map((document) => (
                  <button
                    key={document.id}
                    onClick={() => handleLinkDocument(document.id)}
                    className="w-full rounded-xl border border-slate-700/50 bg-slate-900/50 px-4 py-3 text-left transition-colors hover:border-teal-500/40 hover:bg-slate-900"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">{document.name}</p>
                        <p className="mt-1 text-[11px] font-mono text-teal-400">{document.id}</p>
                      </div>
                      <Badge variant="info">{document.type}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Linked PL: {document.linkedPL} · Revision {document.revision}
                    </p>
                  </button>
                )) : (
                  <p className="rounded-xl border border-white/6 bg-slate-950/35 px-4 py-5 text-sm text-slate-500">
                    No matching documents available to link.
                  </p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
          <DialogContent className="border border-rose-500/25 bg-slate-950 text-slate-100 sm:max-w-[460px]">
            <DialogHeader>
              <DialogTitle>Close Case</DialogTitle>
              <DialogDescription className="text-slate-400">
                This updates the case lifecycle and keeps the current filters and list position intact when you return.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-slate-300">
                {selectedCase.caseNumber} will be marked as closed. Add an optional resolution note below.
              </p>
              <Textarea value={statusNote} onChange={(event) => setStatusNote(event.target.value)} placeholder="Optional close-out note or resolution summary." />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="secondary" onClick={() => setCloseDialogOpen(false)}>Cancel</Button>
              <Button variant="danger" onClick={handleCloseCase}>Close Case</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Cases</h1>
            <p className="text-slate-400 text-sm">Engineering discrepancy and compliance case management.</p>
          </div>
          <Button onClick={() => setNewCaseOpen(true)}>
            <ShieldAlert className="w-4 h-4" /> New Case
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-48">
            <FileSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search cases by ID, title..."
              className="pl-9 w-full"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {(['All', 'Open', 'In Progress', 'Closed'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                  statusFilter === status ? 'bg-teal-500/20 border-teal-500/40 text-teal-300' : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((record) => {
            const displayStatus = toDisplayStatus(record.status);
            const displaySeverity = toDisplaySeverity(record.severity);
            return (
              <GlassCard
                key={record.id}
                className="p-5 hover:border-teal-500/40 cursor-pointer transition-all group"
                onClick={() => setSelectedCaseId(record.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span className="font-mono text-xs text-teal-400">{record.caseNumber}</span>
                    <Badge variant={statusVariant(displayStatus)}>{displayStatus}</Badge>
                    <Badge variant={severityVariant(displaySeverity)}>{displaySeverity}</Badge>
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-slate-200 mb-2">{record.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-2 mb-3">{record.description}</p>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" />{record.assignee}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Updated {formatDate(record.updatedAt)}</span>
                </div>
              </GlassCard>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <GlassCard className="p-12 text-center">
            <ShieldAlert className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
            <p className="text-slate-500">No cases match the current filters</p>
          </GlassCard>
        )}
      </div>

      <Dialog open={newCaseOpen} onOpenChange={(open) => {
        setNewCaseOpen(open);
        if (!open) {
          setNewCaseForm(DEFAULT_NEW_CASE_FORM);
        }
      }}>
        <DialogContent className="border border-slate-700/60 bg-slate-950 text-slate-100 sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle>Create New Case</DialogTitle>
            <DialogDescription className="text-slate-400">
              Start a new EDMS discrepancy or compliance case and link it to the relevant PL at creation time.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Title</label>
              <Input value={newCaseForm.title} onChange={(event) => setNewCaseForm((current) => ({ ...current, title: event.target.value }))} placeholder="Brief case title" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Description</label>
              <Textarea value={newCaseForm.description} onChange={(event) => setNewCaseForm((current) => ({ ...current, description: event.target.value }))} placeholder="Describe the discrepancy, compliance issue, or investigation." />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Assignee</label>
                <Input value={newCaseForm.assignee} onChange={(event) => setNewCaseForm((current) => ({ ...current, assignee: event.target.value }))} placeholder="Responsible engineer or records owner" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Severity</label>
                <Select value={newCaseForm.severity} onChange={(event) => setNewCaseForm((current) => ({ ...current, severity: event.target.value as DisplaySeverity }))}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </Select>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Linked PL</label>
              <PLNumberSelect
                value={newCaseForm.plNumber}
                onChange={(plNumber) => setNewCaseForm((current) => ({ ...current, plNumber }))}
                plItems={plItems}
                loading={plItemsLoading}
                placeholder="Search and select a PL number..."
                helperText="Optional, but recommended for traceability back to the product structure."
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={resetNewCaseForm}>Cancel</Button>
            <Button onClick={handleCreateCase}>
              <Plus className="w-4 h-4" /> Create Case
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
