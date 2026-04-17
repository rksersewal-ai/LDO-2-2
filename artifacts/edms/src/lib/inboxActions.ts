import type { AppInboxItem } from "./types";

export type InboxAction = {
  key: string;
  label: string;
  variant?: "primary" | "secondary" | "danger";
  payload: {
    action: string;
    notes?: string;
    comment?: string;
    reason?: string;
    bypass_reason?: string;
    effectivity_date?: string;
  };
};

export function getWorkflowActions(notification: AppInboxItem): InboxAction[] {
  switch (notification.type) {
    case "approval":
      return [
        {
          key: "approve",
          label: "Approve",
          payload: {
            action: "approve",
            comment: "Approved from notifications inbox",
          },
        },
        {
          key: "reject",
          label: "Reject",
          variant: "danger",
          payload: {
            action: "reject",
            reason: "Rejected from notifications inbox",
          },
        },
      ];
    case "change_request":
      return [
        {
          key: "approve",
          label: "Approve",
          payload: {
            action: "approve",
            notes: "Approved from notifications inbox",
          },
        },
        {
          key: "reject",
          label: "Reject",
          variant: "danger",
          payload: {
            action: "reject",
            notes: "Rejected from notifications inbox",
          },
        },
      ];
    case "change_notice":
      if (notification.status === "ISSUED") {
        return [
          {
            key: "approve",
            label: "Approve",
            payload: {
              action: "approve",
              notes: "Approved from notifications inbox",
            },
          },
        ];
      }
      if (notification.status === "APPROVED") {
        return [
          {
            key: "release",
            label: "Release",
            payload: {
              action: "release",
              notes: "Released from notifications inbox",
            },
          },
        ];
      }
      return [];
    case "dedup_review":
      return [
        {
          key: "ignore",
          label: "Ignore group",
          variant: "secondary",
          payload: {
            action: "ignore",
            notes: "Ignored from notifications inbox",
          },
        },
      ];
    default:
      return [];
  }
}
