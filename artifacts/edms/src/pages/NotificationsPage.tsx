import { useMemo, useState } from 'react';
import { Bell, CheckSquare, ServerCog, AlertCircle, Briefcase, ExternalLink, AlertTriangle, GitBranch, GitCommitHorizontal, Eye, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router';
import { GlassCard, PageHeader, Button } from '../components/ui/Shared';
import { resolveNotificationActionLabel, resolveNotificationPath } from '../lib/notificationRouting';
import { useDocumentChangeAlerts } from '../hooks/useDocumentChangeAlerts';
import { useAppInbox } from '../hooks/useAppInbox';
import { InboxService } from '../services/InboxService';
import type { AppInboxItem } from '../lib/types';
import { getWorkflowActions, type InboxAction } from '../lib/inboxActions';
import { resolveDocumentPreviewPath, resolveNotificationPreviewDocumentId } from '../lib/documentPreview';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { DocumentChangeReviewCard } from '../components/documents/DocumentChangeReviewCard';

const typeIcon = (type: string) => {
  if (type === 'approval') return <CheckSquare className="w-4 h-4 text-amber-400" />;
  if (type === 'ocr') return <ServerCog className="w-4 h-4 text-blue-400" />;
  if (type === 'case') return <AlertCircle className="w-4 h-4 text-rose-400" />;
  if (type === 'work') return <Briefcase className="w-4 h-4 text-primary" />;
  if (type === 'design-change') return <AlertTriangle className="w-4 h-4 text-amber-300" />;
  if (type === 'dedup_review') return <AlertTriangle className="w-4 h-4 text-violet-300" />;
  if (type === 'indexing_failure') return <ServerCog className="w-4 h-4 text-rose-300" />;
  if (type === 'change_request') return <GitBranch className="w-4 h-4 text-cyan-300" />;
  if (type === 'change_notice') return <GitCommitHorizontal className="w-4 h-4 text-indigo-300" />;
  return <Bell className="w-4 h-4 text-muted-foreground" />;
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { alerts: documentChangeAlerts, approveAlert, bypassAlert } = useDocumentChangeAlerts();
  const { items: inboxItems, source, refresh } = useAppInbox();
  const standardInboxItems = inboxItems.filter((item) => item.type !== 'supervisor_review');
  const unreadCount = standardInboxItems.length + documentChangeAlerts.length;
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string>('');
  const actionable = source === 'backend';

  const standardItemsWithActions = useMemo(
    () =>
      standardInboxItems.map((item) => ({
        ...item,
        actions: actionable ? getWorkflowActions(item) : [],
      })),
    [actionable, standardInboxItems]
  );

  const handleWorkflowAction = async (notification: AppInboxItem, action: InboxAction) => {
    setBusyItemId(`${notification.id}:${action.key}`);
    setFeedback('');
    try {
      const response = await InboxService.actOnItem(notification.id, action.payload);
      await refresh();
      setFeedback(`${notification.title} marked as ${response?.result || action.key}.`);
    } catch (error) {
      console.error('[NotificationsPage] Failed workflow action', error);
      setFeedback(`Could not complete "${action.label}" for ${notification.title}.`);
    } finally {
      setBusyItemId(null);
    }
  };

  const openPreview = (documentId: string) => {
    navigate(resolveDocumentPreviewPath(documentId));
  };

  return (
    <div className="space-y-6 max-w-[1120px] mx-auto">
      <PageHeader
        title="Notifications & Decision Inbox"
        subtitle="Review alerts, jump to the affected record, and close the items that still require an action."
        breadcrumb={<span>Operations / Notifications</span>}
        actions={
          <Button variant="secondary" size="sm" onClick={() => navigate('/')}>
            Back to Dashboard
          </Button>
        }
      />

      {feedback && (
        <GlassCard className="px-4 py-3">
          <p className="text-sm text-teal-200">{feedback}</p>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Open Items</p>
          <p className="mt-2 text-3xl font-bold text-white">{unreadCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Items still requiring review or acknowledgement.</p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Document Change Reviews</p>
          <p className="mt-2 text-3xl font-bold text-amber-300">{documentChangeAlerts.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Supervisor reviews waiting on approval or bypass.</p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Standard Alerts</p>
          <p className="mt-2 text-3xl font-bold text-primary/90">{standardInboxItems.length}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Workflow, OCR, deduplication, and indexing items from the {source === 'backend' ? 'backend inbox' : 'fallback queue'}.
          </p>
        </GlassCard>
      </div>

      {documentChangeAlerts.length > 0 && (
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Document Change Reviews</h2>
              <p className="text-sm text-muted-foreground">Persistent supervisor alerts for linked PL documents.</p>
            </div>
          </div>
          <div className="space-y-3">
            {documentChangeAlerts.map((alert) => (
              <DocumentChangeReviewCard
                key={alert.id}
                alert={alert}
                busy={busyItemId === `doc-review:${alert.id}`}
                onOpenPl={() => navigate(`/pl/${alert.plId}?tab=crossrefs&doc=${alert.documentId}`)}
                onApprove={async () => {
                  setBusyItemId(`doc-review:${alert.id}`);
                  setFeedback('');
                  try {
                    await approveAlert(alert.id, 'Approved from notifications inbox');
                    setFeedback(`Approved latest document update for PL ${alert.plNumber}.`);
                  } catch (error) {
                    console.error('[NotificationsPage] Failed to approve supervisor review', error);
                    setFeedback(`Could not approve the document update for PL ${alert.plNumber}.`);
                  } finally {
                    setBusyItemId(null);
                  }
                }}
                onBypass={async () => {
                  setBusyItemId(`doc-review:${alert.id}`);
                  setFeedback('');
                  try {
                    await bypassAlert(alert.id, { bypassReason: 'Bypassed from notifications inbox' });
                    setFeedback(`Bypassed latest document update for PL ${alert.plNumber}.`);
                  } catch (error) {
                    console.error('[NotificationsPage] Failed to bypass supervisor review', error);
                    setFeedback(`Could not bypass the document update for PL ${alert.plNumber}.`);
                  } finally {
                    setBusyItemId(null);
                  }
                }}
              />
            ))}
          </div>
        </GlassCard>
      )}

      <GlassCard className="p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">Notification Stream</h2>
          <p className="text-sm text-muted-foreground">
            Open the affected page directly from each alert, or act from here where the workflow supports it.
          </p>
        </div>
        <div className="space-y-2">
          {standardItemsWithActions.map((notification) => (
            (() => {
              const previewDocumentId = resolveNotificationPreviewDocumentId(notification);
              return (
            <div
              key={notification.id}
              className="w-full rounded-2xl border border-teal-500/18 bg-teal-950/15 px-4 py-4 text-left transition-colors hover:bg-teal-900/18"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">{typeIcon(notification.type)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{notification.title}</span>
                    <span className="h-2 w-2 rounded-full bg-teal-400" />
                  </div>
                  <p className="text-sm text-foreground/90 mt-1">{notification.subtitle || 'Action required in the EDMS workflow queue.'}</p>
                  <p className="text-[11px] text-muted-foreground mt-2">{notification.created_at || 'Now'}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {previewDocumentId && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openPreview(previewDocumentId)}
                      >
                        <Eye className="w-3 h-3" />
                        Preview document
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate(resolveNotificationPath(notification))}
                    >
                      <ExternalLink className="w-3 h-3" />
                      {resolveNotificationActionLabel(notification)}
                    </Button>
                    {notification.actions.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm">
                            <MoreHorizontal className="w-3 h-3" />
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 border border-border/60 bg-slate-950 text-foreground">
                          {notification.actions.map((action) => (
                            <DropdownMenuItem
                              key={action.key}
                              disabled={busyItemId === `${notification.id}:${action.key}`}
                              className={`focus:bg-secondary ${action.variant === 'danger' ? 'text-rose-200 focus:text-rose-100' : ''}`}
                              onSelect={() => void handleWorkflowAction(notification, action)}
                            >
                              {busyItemId === `${notification.id}:${action.key}` ? 'Working...' : action.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 shrink-0 text-muted-foreground mt-1" />
              </div>
            </div>
              );
            })()
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
