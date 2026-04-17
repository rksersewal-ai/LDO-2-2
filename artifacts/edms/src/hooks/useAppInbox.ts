import { useCallback, useEffect, useState } from "react";
import type { AppInboxItem } from "../lib/types";
import { InboxService } from "../services/InboxService";

export function useAppInbox() {
  const [items, setItems] = useState<AppInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"backend" | "mock">("mock");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await InboxService.getItems();
      setItems(response.items);
      setSource(response.source);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    items,
    loading,
    source,
    refresh: load,
  };
}
