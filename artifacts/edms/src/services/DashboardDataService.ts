/**
 * DashboardDataService
 *
 * Centralizes all data access for the Dashboard page. In mock mode the data comes
 * from in-memory mock stores; in production mode it delegates to ApiClient.
 *
 * Pages should import from this service instead of pulling mock arrays directly.
 */

import { MOCK_DOCUMENTS, MOCK_AUDIT_LOG } from "../lib/mock";
import {
  MOCK_APPROVALS,
  MOCK_OCR_JOBS,
  MOCK_NOTIFICATIONS,
  MOCK_WORK_LEDGER,
  MOCK_CASES,
  MOCK_REPORTS,
} from "../lib/mockExtended";
import { PRODUCTS, PL_DATABASE } from "../lib/bomData";
import { DUPLICATE_GROUPS } from "../lib/deduplicationMock";
import apiClient from "./ApiClient";

const useMockApi = import.meta.env.VITE_ENABLE_DEV_MOCK_API === "true";

export interface DashboardKpiSnapshot {
  documents: { total: number; approved: number; data: readonly any[] };
  approvals: { total: number; pending: number; data: readonly any[] };
  ocrJobs: {
    total: number;
    failed: number;
    processing: number;
    data: readonly any[];
  };
  notifications: { total: number; unread: number; data: readonly any[] };
  cases: {
    total: number;
    open: number;
    highSeverity: number;
    data: readonly any[];
  };
  workRecords: {
    total: number;
    completed: number;
    inProgress: number;
    data: readonly any[];
  };
  plItems: { total: number; data: readonly any[] };
  products: {
    total: number;
    inProduction: number;
    inDevelopment: number;
    data: readonly any[];
  };
  dedupGroups: { total: number; pending: number; data: readonly any[] };
  reports: { total: number; data: readonly any[] };
  auditLog: readonly any[];
}

function buildMockSnapshot(): DashboardKpiSnapshot {
  const plRecords = Object.entries(PL_DATABASE).map(([id, rec]) => ({
    id,
    ...rec,
  }));

  return {
    documents: {
      total: MOCK_DOCUMENTS.length,
      approved: MOCK_DOCUMENTS.filter((d) => d.status === "Approved").length,
      data: MOCK_DOCUMENTS,
    },
    approvals: {
      total: MOCK_APPROVALS.length,
      pending: MOCK_APPROVALS.filter((a) => a.status === "Pending").length,
      data: MOCK_APPROVALS,
    },
    ocrJobs: {
      total: MOCK_OCR_JOBS.length,
      failed: MOCK_OCR_JOBS.filter((j) => j.status === "Failed").length,
      processing: MOCK_OCR_JOBS.filter((j) => j.status === "Processing").length,
      data: MOCK_OCR_JOBS,
    },
    notifications: {
      total: MOCK_NOTIFICATIONS.length,
      unread: MOCK_NOTIFICATIONS.filter((n) => !n.read).length,
      data: MOCK_NOTIFICATIONS,
    },
    cases: {
      total: MOCK_CASES.length,
      open: MOCK_CASES.filter((c) => c.status !== "Resolved").length,
      highSeverity: MOCK_CASES.filter((c) => c.severity === "High").length,
      data: MOCK_CASES,
    },
    workRecords: {
      total: MOCK_WORK_LEDGER.length,
      completed: MOCK_WORK_LEDGER.filter((w) => w.status === "Complete").length,
      inProgress: MOCK_WORK_LEDGER.filter(
        (w) => w.status === "Pending" || w.status === "In Progress",
      ).length,
      data: MOCK_WORK_LEDGER,
    },
    plItems: {
      total: plRecords.length,
      data: plRecords,
    },
    products: {
      total: PRODUCTS.length,
      inProduction: PRODUCTS.filter((p) => p.lifecycle === "Production").length,
      inDevelopment: PRODUCTS.filter((p) => p.lifecycle === "In Development")
        .length,
      data: PRODUCTS,
    },
    dedupGroups: {
      total: DUPLICATE_GROUPS.length,
      pending: DUPLICATE_GROUPS.filter((g) => g.status === "pending").length,
      data: DUPLICATE_GROUPS,
    },
    reports: {
      total: MOCK_REPORTS.length,
      data: MOCK_REPORTS,
    },
    auditLog: MOCK_AUDIT_LOG,
  };
}

let _cached: DashboardKpiSnapshot | null = null;

export const DashboardDataService = {
  /**
   * Returns the full dashboard KPI snapshot.
   * In mock mode this is synchronous (returns immediately).
   * With a real backend it calls /api/dashboard/stats/ and normalizes the response.
   */
  async getSnapshot(): Promise<DashboardKpiSnapshot> {
    if (useMockApi) {
      if (!_cached) _cached = buildMockSnapshot();
      return _cached;
    }

    // Real API path — falls back to mock on failure
    try {
      const stats = await apiClient.getDashboardStats();
      // Map backend stats to our snapshot shape; fill gaps from mock for now
      const mock = buildMockSnapshot();
      return {
        ...mock,
        documents: {
          total: (stats as any).documents?.total ?? mock.documents.total,
          approved:
            (stats as any).documents?.approved ?? mock.documents.approved,
          data: mock.documents.data,
        },
      };
    } catch {
      return buildMockSnapshot();
    }
  },

  /** Synchronous access to the cached snapshot (for initial render). */
  getCachedOrBuild(): DashboardKpiSnapshot {
    if (!_cached) _cached = buildMockSnapshot();
    return _cached;
  },

  /** Invalidate cached data (e.g. after a mutation). */
  invalidate() {
    _cached = null;
  },
};
