import type { AppInboxItem } from "../lib/types";
import { MOCK_NOTIFICATIONS } from "../lib/mockExtended";
import apiClient from "./ApiClient";

function mapMockNotifications(): AppInboxItem[] {
  return MOCK_NOTIFICATIONS.map((notification) => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    subtitle: notification.message,
    status: notification.read ? "READ" : "UNREAD",
    created_at: notification.time,
    payload: notification.entity ? { entity: notification.entity } : {},
  }));
}

export const InboxService = {
  async getItems(
    signal?: AbortSignal,
  ): Promise<{ items: AppInboxItem[]; source: "backend" | "mock" }> {
    try {
      const response = await apiClient.getInbox({ signal });
      return { items: response.items, source: "backend" };
    } catch (error) {
      console.warn("[InboxService] Falling back to mock notifications.", error);
      return { items: mapMockNotifications(), source: "mock" };
    }
  },

  async actOnItem(
    itemId: string,
    payload: {
      action: string;
      notes?: string;
      comment?: string;
      reason?: string;
      bypass_reason?: string;
      effectivity_date?: string;
    },
  ) {
    return apiClient.actOnWorkflowItem(itemId, payload);
  },
};
