const RECENT_PREVIEW_KEY = "edms_recent_document_preview";

export interface RecentDocumentPreview {
  documentId: string;
  title: string;
  openedAt: string;
}

export const DocumentPreviewService = {
  setRecentPreview(preview: RecentDocumentPreview) {
    localStorage.setItem(RECENT_PREVIEW_KEY, JSON.stringify(preview));
  },

  getRecentPreview(): RecentDocumentPreview | null {
    try {
      const raw = localStorage.getItem(RECENT_PREVIEW_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as Partial<RecentDocumentPreview>;
      if (!parsed.documentId) {
        return null;
      }
      return {
        documentId: parsed.documentId,
        title: parsed.title || parsed.documentId,
        openedAt: parsed.openedAt || new Date().toISOString(),
      };
    } catch {
      return null;
    }
  },

  clearRecentPreview() {
    localStorage.removeItem(RECENT_PREVIEW_KEY);
  },
};
