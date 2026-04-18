/**
 * useApi Hook
 * Simplified API integration hook for React components with standardized API responses
 *
 * All list endpoints return: NormalizedListResult<T>
 * All item endpoints return: T
 * All mutations return: T
 */

import { useState, useCallback } from "react";
import type { AxiosError } from "axios";
import apiClient from "../services/ApiClient";
import type {
  NormalizedListResult,
  ListQueryParams,
  SearchScope,
} from "../lib/types";

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: AxiosError) => void;
  autoFetch?: boolean;
}

/**
 * Generic API hook for GET requests
 * For list endpoints, ensures normalized response shape
 */
export function useApiGet<T = any>(url: string, options: UseApiOptions = {}) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: options.autoFetch !== false,
    error: null,
  });

  const fetch = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await apiClient.client.get(url);
      setState((prev) => ({ ...prev, data: response.data, loading: false }));
      options.onSuccess?.(response.data);
    } catch (error) {
      const err = error as AxiosError;
      const message = apiClient.getErrorMessage(err);
      setState((prev) => ({ ...prev, error: message, loading: false }));
      options.onError?.(err);
    }
  }, [url, options]);

  return { ...state, refetch: fetch };
}

/**
 * Generic API hook for POST/PATCH requests
 */
export function useApiMutation<T = any, D = any>(
  method: "post" | "patch" | "put" | "delete" = "post",
  options: UseApiOptions = {},
) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const mutate = useCallback(
    async (url: string, data?: D) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        let response;
        if (method === "delete") {
          response = await apiClient.client.delete(url);
        } else {
          response = await apiClient.client[method](url, data);
        }
        setState((prev) => ({ ...prev, data: response.data, loading: false }));
        options.onSuccess?.(response.data);
        return response.data;
      } catch (error) {
        const err = error as AxiosError;
        const message = apiClient.getErrorMessage(err);
        setState((prev) => ({ ...prev, error: message, loading: false }));
        options.onError?.(err);
        throw err;
      }
    },
    [method, options],
  );

  return { ...state, mutate };
}

/**
 * API hook for document list operations with pagination
 * Uses standardized ApiClient methods that return NormalizedListResult<Document>
 */
export function useDocumentList(query?: ListQueryParams) {
  const [state, setState] = useState<UseApiState<NormalizedListResult<any>>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetch = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await apiClient.getDocuments(query);
      setState((prev) => ({ ...prev, data: response, loading: false }));
    } catch (error) {
      const err = error as AxiosError;
      const message = apiClient.getErrorMessage(err);
      setState((prev) => ({ ...prev, error: message, loading: false }));
    }
  }, [query?.page, query?.pageSize, query?.search, query?.sort]);

  const createMutation = useApiMutation("post");
  const updateMutation = useApiMutation("patch");
  const deleteMutation = useApiMutation("delete");

  return {
    ...state,
    refetch: fetch,
    createDocument: (data: FormData) =>
      createMutation.mutate("/documents/", data),
    updateDocument: (id: string, data: any) =>
      updateMutation.mutate(`/documents/${id}/`, data),
    deleteDocument: (id: string) => deleteMutation.mutate(`/documents/${id}/`),
  };
}

/**
 * API hook for work records list operations with pagination
 * Uses standardized ApiClient methods that return NormalizedListResult<WorkRecord>
 */
export function useWorkRecordList(query?: ListQueryParams) {
  const [state, setState] = useState<UseApiState<NormalizedListResult<any>>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetch = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await apiClient.getWorkRecords(query);
      setState((prev) => ({ ...prev, data: response, loading: false }));
    } catch (error) {
      const err = error as AxiosError;
      const message = apiClient.getErrorMessage(err);
      setState((prev) => ({ ...prev, error: message, loading: false }));
    }
  }, [query?.page, query?.pageSize, query?.search, query?.sort]);

  const createMutation = useApiMutation("post");
  const updateMutation = useApiMutation("patch");
  const deleteMutation = useApiMutation("delete");

  return {
    ...state,
    refetch: fetch,
    createRecord: (data: any) => createMutation.mutate("/work-records/", data),
    updateRecord: (id: string, data: any) =>
      updateMutation.mutate(`/work-records/${id}/`, data),
    deleteRecord: (id: string) => deleteMutation.mutate(`/work-records/${id}/`),
  };
}

/**
 * @deprecated Use useDocumentList or useWorkRecordList instead
 * Legacy hook kept for backwards compatibility
 */
export function useDocuments() {
  const list = useDocumentList();
  return {
    documents: list.data?.items || [],
    loading: list.loading,
    error: list.error,
    refetch: list.refetch,
    createDocument: list.createDocument,
    updateDocument: list.updateDocument,
    deleteDocument: list.deleteDocument,
  };
}

/**
 * @deprecated Use useWorkRecordList instead
 * Legacy hook kept for backwards compatibility
 */
export function useWorkRecords() {
  const list = useWorkRecordList();
  return {
    records: list.data?.items || [],
    loading: list.loading,
    error: list.error,
    refetch: list.refetch,
    createRecord: list.createRecord,
    updateRecord: list.updateRecord,
    deleteRecord: list.deleteRecord,
  };
}

/**
 * API hook for search functionality
 */
export function useSearch(query: string, scope?: SearchScope) {
  const [state, setState] = useState<UseApiState<any>>({
    data: null,
    loading: false,
    error: null,
  });

  const search = useCallback(async () => {
    if (!query.trim()) {
      setState((prev) => ({ ...prev, data: null }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await apiClient.search(query, scope);
      setState((prev) => ({ ...prev, data: response, loading: false }));
    } catch (error) {
      const err = error as AxiosError;
      const message = apiClient.getErrorMessage(err);
      setState((prev) => ({ ...prev, error: message, loading: false }));
    }
  }, [query, scope]);

  return { ...state, search };
}
