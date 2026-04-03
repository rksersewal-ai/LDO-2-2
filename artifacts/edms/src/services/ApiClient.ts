/**
 * API Client Service
 * Centralized HTTP client for all backend API calls with JWT authentication
 * 
 * Uses standardized response shapes:
 * - ApiListResponse<T> for GET /endpoint/ (paginated lists)
 * - ApiItemResponse<T> for GET /endpoint/:id (single items)
 * - ApiMutationResponse<T> for POST/PATCH/PUT/DELETE
 * 
 * All responses are validated at runtime using Zod schemas to catch data shape mismatches
 * before they cause crashes in components.
 */

import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import type {
  AppInboxItem,
  ApiListResponse,
  ApiItemResponse,
  ApiMutationResponse,
  ApiDeleteResponse,
  NormalizedListResult,
  ListQueryParams,
  SearchBucketsResponse,
  SearchScope,
} from '../lib/types';

interface ApiErrorResponse {
  detail?: string;
  message?: string;
  errors?: Record<string, string[]>;
}

interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

interface RequestOptions {
  signal?: AbortSignal;
}

const ACCESS_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const USER_KEY = 'user';
const SESSION_KEY = 'ldo2_session';
const SESSION_TIMESTAMP_KEY = `${SESSION_KEY}_ts`;

export class ApiClient {
  public readonly client: AxiosInstance;
  private baseURL: string;
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    initialDelayMs: 1000,      // 1 second
    maxDelayMs: 30000,         // 30 seconds
    backoffMultiplier: 2,      // Exponential backoff
  };

  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || '/api';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000'),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add JWT token to requests
    this.client.interceptors.request.use((config) => {
      const token = this.getStoredAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle responses and errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiErrorResponse>) => {
        if (this.shouldRedirectOnUnauthorized(error)) {
          // Token expired or invalid
          this.clearStoredAuth();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  private clearStoredAuth() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_TIMESTAMP_KEY);
  }

  private getStoredAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  private getStoredRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  private shouldRedirectOnUnauthorized(error: AxiosError<ApiErrorResponse>): boolean {
    if (error.response?.status !== 401) {
      return false;
    }

    const requestUrl = error.config?.url || '';
    return !/\/auth\/login\/?$/.test(requestUrl);
  }

  private setStoredAuth(access: string, refresh?: string | null) {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    if (refresh) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Retry Logic & Error Handling
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Determine if an error is retryable (transient)
   * Retryable errors: timeouts, rate limiting (429), server errors (5xx)
   * Non-retryable errors: 4xx (except 429), 401, 403
   */
  private isRetryableError(error: any): boolean {
    const status = error.response?.status;
    const code = error.code;

    // Network errors (timeout, connection refused)
    if (code === 'ECONNABORTED' || code === 'ECONNREFUSED' || code === 'ETIMEDOUT') {
      return true;
    }

    // Rate limiting
    if (status === 429) {
      return true;
    }

    // Server errors (5xx)
    if (status && status >= 500) {
      return true;
    }

    // HTTP 408 Request Timeout
    if (status === 408) {
      return true;
    }

    // Do NOT retry client errors (4xx) except 429 and 408
    if (status && status >= 400 && status < 500) {
      return false;
    }

    // Network error (no status code)
    if (!status && code) {
      return true;
    }

    return false;
  }

  /**
   * Calculate exponential backoff delay with jitter
   * Formula: min(maxDelay, initialDelay * (backoffMultiplier ^ attempt)) + random jitter
   */
  private calculateBackoffDelay(attempt: number): number {
    const baseDelay = this.retryConfig.initialDelayMs * 
      Math.pow(this.retryConfig.backoffMultiplier, attempt);
    
    const capped = Math.min(baseDelay, this.retryConfig.maxDelayMs);
    
    // Add random jitter (±10%)
    const jitter = capped * (0.9 + Math.random() * 0.2);
    
    return Math.round(jitter);
  }

  /**
   * Delay execution for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute request with automatic retry on transient failures
   * Only retries safe operations (GET by default)
   */
  private async executeWithRetry<T>(
    fn: () => Promise<AxiosResponse<T>>,
    method: string = 'GET',
    maxRetries: number = this.retryConfig.maxRetries
  ): Promise<AxiosResponse<T>> {
    let lastError: any;
    
    // Only retry GET requests by default; other methods can force retry
    const shouldRetry = method === 'GET' || maxRetries > this.retryConfig.maxRetries;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        const normalizedError = error as any;
        lastError = normalizedError;

        if (!shouldRetry) {
          throw normalizedError;
        }

        // Don't retry on non-retryable errors
        if (!this.isRetryableError(normalizedError)) {
          throw normalizedError;
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          throw normalizedError;
        }

        // Calculate backoff and wait
        const delayMs = this.calculateBackoffDelay(attempt);
        const status = normalizedError.response?.status;
        const code = normalizedError.code;

        console.warn(
          `[ApiClient] Request failed (${code || status}), ` +
          `retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`
        );

        await this.sleep(delayMs);
      }
    }

    throw lastError;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Response Normalization Helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Normalize any list response to standard shape
   * Handles both paginated and non-paginated responses
   */
  private normalizeListResponse<T>(
    response: any,
    pageSize: number = 15
  ): NormalizedListResult<T> {
    // Check if response is already in standard format
    if (response && typeof response === 'object' && 'results' in response && 'total' in response) {
      const page = response.page || 1;
      return {
        items: response.results,
        total: response.total,
        page,
        pageSize: response.pageSize || pageSize,
        hasMore: page * (response.pageSize || pageSize) < response.total,
      };
    }

    // Django REST Framework PageNumberPagination
    if (response && typeof response === 'object' && 'results' in response && 'count' in response) {
      const resolvedPageSize = response.pageSize || pageSize;
      const next = response.next as string | null | undefined;
      const previous = response.previous as string | null | undefined;
      let page = response.page || 1;

      if (previous && !response.page) {
        const previousUrl = new URL(previous, window.location.origin);
        const previousPage = Number(previousUrl.searchParams.get('page') || '1');
        page = previousPage + 1;
      } else if (next && !response.page) {
        const nextUrl = new URL(next, window.location.origin);
        const nextPage = Number(nextUrl.searchParams.get('page') || '2');
        page = Math.max(1, nextPage - 1);
      }

      return {
        items: response.results,
        total: response.count,
        page,
        pageSize: resolvedPageSize,
        hasMore: Boolean(next) || page * resolvedPageSize < response.count,
      };
    }

    // Legacy format: array response
    if (Array.isArray(response)) {
      return {
        items: response,
        total: response.length,
        page: 1,
        pageSize: response.length,
        hasMore: false,
      };
    }

    if (response && typeof response === 'object' && 'items' in response && 'total' in response) {
      return {
        items: response.items,
        total: response.total,
        page: response.page || 1,
        pageSize: response.pageSize || pageSize,
        hasMore: response.hasMore || false,
      };
    }

    // Default empty
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize,
      hasMore: false,
    };
  }

  private normalizeSearchResponse(response: any): SearchBucketsResponse {
    return {
      documents: Array.isArray(response?.documents) ? response.documents : [],
      work_records: Array.isArray(response?.work_records) ? response.work_records : [],
      pl_items: Array.isArray(response?.pl_items) ? response.pl_items : [],
      cases: Array.isArray(response?.cases) ? response.cases : [],
      total:
        typeof response?.total === 'number'
          ? response.total
          : 0,
      facets: {
        documents: {
          source_system: Array.isArray(response?.facets?.documents?.source_system) ? response.facets.documents.source_system : [],
          category: Array.isArray(response?.facets?.documents?.category) ? response.facets.documents.category : [],
          duplicate_status: Array.isArray(response?.facets?.documents?.duplicate_status) ? response.facets.documents.duplicate_status : [],
          ocr_status: Array.isArray(response?.facets?.documents?.ocr_status) ? response.facets.documents.ocr_status : [],
          hash_status: Array.isArray(response?.facets?.documents?.hash_status) ? response.facets.documents.hash_status : [],
          pl_linked: Array.isArray(response?.facets?.documents?.pl_linked) ? response.facets.documents.pl_linked : [],
        },
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Configuration
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Configure retry behavior globally
   */
  setRetryConfig(config: Partial<RetryConfig>) {
    this.retryConfig = { ...this.retryConfig, ...config };
  }

  /**
   * Get current retry configuration
   */
  getRetryConfig(): RetryConfig {
    return { ...this.retryConfig };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Auth Endpoints
  // ─────────────────────────────────────────────────────────────────────────

  async login(username: string, password: string) {
    // Login is retried for resilience
    const response = await this.executeWithRetry(
      () => this.client.post<{
        access: string;
        refresh?: string;
        token?: string;
        user: any;
      }>('/auth/login/', { username, password }),
      'POST'
    );
    
    const access = response.data.access || response.data.token;
    if (!access) {
      throw new Error('Login response did not include an access token');
    }

    const { refresh, user } = response.data;
    this.setStoredAuth(access, refresh);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    
    return { token: access, user };
  }

  async logout() {
    const refresh = this.getStoredRefreshToken();
    try {
      await this.client.post('/auth/logout/', refresh ? { refresh } : undefined);
    } finally {
      this.clearStoredAuth();
    }
  }

  async refreshToken() {
    const refresh = this.getStoredRefreshToken();
    if (!refresh) throw new Error('No refresh token found');
    
    const response = await this.client.post<{ access: string; refresh?: string }>('/auth/token/refresh/', {
      refresh,
    });
    
    const { access, refresh: rotatedRefresh } = response.data;
    this.setStoredAuth(access, rotatedRefresh || refresh);
    return access;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Document Endpoints
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get paginated list of documents with automatic retry on transient failures
   * Returns: NormalizedListResult<Document>
   */
  async getDocuments(
    query?: ListQueryParams,
    options: RequestOptions = {}
  ): Promise<NormalizedListResult<any>> {
    try {
      const params = {
        page: query?.page || 1,
        page_size: query?.pageSize || 15,
        ...(query?.search && { search: query.search }),
        ...(query?.sort && { ordering: query.sort }),
        ...(query?.filters && query.filters),
      };

      const response = await this.executeWithRetry(
        () => this.client.get('/documents/', { params, signal: options.signal }),
        'GET',
        this.retryConfig.maxRetries
      );
      return this.normalizeListResponse(response.data, params.page_size);
    } catch (error) {
      if (import.meta.env.VITE_ENABLE_DEV_MOCK_API === 'true') {
        console.warn('API unavailable after retries, using mock data:', error);
        const { MOCK_DOCUMENTS } = await import('../lib/mock');
        return {
          items: MOCK_DOCUMENTS,
          total: MOCK_DOCUMENTS.length,
          page: 1,
          pageSize: 15,
          hasMore: false,
        };
      }

      throw error;
    }
  }

  /**
   * Get single document by ID with automatic retry
   * Returns: Document
   */
  async getDocument(id: string, options: RequestOptions = {}) {
    const response = await this.executeWithRetry(
      () => this.client.get(`/documents/${id}/`, { signal: options.signal }),
      'GET'
    );
    return response.data;
  }

  async getDocumentAssertions(id: string, options: RequestOptions = {}) {
    const response = await this.executeWithRetry(
      () => this.client.get(`/documents/${id}/assertions/`, { signal: options.signal }),
      'GET'
    );
    return Array.isArray(response.data) ? response.data : [];
  }

  async getDocumentEntities(id: string, options: RequestOptions = {}) {
    const response = await this.executeWithRetry(
      () => this.client.get(`/documents/${id}/entities/`, { signal: options.signal }),
      'GET'
    );
    return Array.isArray(response.data) ? response.data : [];
  }

  async approveDocumentEntity(id: string, entityId: string, payload?: { notes?: string }) {
    const response = await this.client.post(`/documents/${id}/entities/${entityId}/approve/`, payload ?? {});
    return response.data;
  }

  async rejectDocumentEntity(id: string, entityId: string, payload?: { notes?: string }) {
    const response = await this.client.post(`/documents/${id}/entities/${entityId}/reject/`, payload ?? {});
    return response.data;
  }

  async promoteDocumentEntityToAssertion(
    id: string,
    entityId: string,
    payload: { field_key: string; notes?: string }
  ) {
    const response = await this.client.post(`/documents/${id}/entities/${entityId}/promote/`, payload);
    return response.data;
  }

  async approveDocumentAssertion(id: string, assertionId: string, payload?: { notes?: string }) {
    const response = await this.client.post(`/documents/${id}/assertions/${assertionId}/approve/`, payload ?? {});
    return response.data;
  }

  async rejectDocumentAssertion(id: string, assertionId: string, payload?: { notes?: string }) {
    const response = await this.client.post(`/documents/${id}/assertions/${assertionId}/reject/`, payload ?? {});
    return response.data;
  }

  async reindexDocumentMetadata(id: string) {
    const response = await this.client.post(`/documents/${id}/reindex-metadata/`);
    return response.data;
  }

  async createDocument(data: FormData) {
    const response = await this.client.post('/documents/', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async ingestDocument(data: FormData) {
    const response = await this.client.post('/documents/ingest/', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async updateDocument(id: string, data: Partial<any>) {
    const response = await this.client.patch(`/documents/${id}/`, data);
    return response.data;
  }

  async deleteDocument(id: string) {
    await this.client.delete(`/documents/${id}/`);
  }

  async uploadDocumentVersion(id: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await this.client.post(`/documents/${id}/versions/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Work Records Endpoints
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get paginated list of work records with automatic retry
   * Returns: NormalizedListResult<WorkRecord>
   */
  async getWorkRecords(
    query?: ListQueryParams,
    options: RequestOptions = {}
  ): Promise<NormalizedListResult<any>> {
    const params = {
      page: query?.page || 1,
      page_size: query?.pageSize || 15,
      ...(query?.search && { search: query.search }),
      ...(query?.sort && { ordering: query.sort }),
      ...(query?.filters && query.filters),
    };

    const response = await this.executeWithRetry(
      () => this.client.get('/work-records/', { params, signal: options.signal }),
      'GET'
    );
    return this.normalizeListResponse(response.data, params.page_size);
  }

  /**
   * Get single work record by ID with automatic retry
   * Returns: WorkRecord
   */
  async getWorkRecord(id: string, options: RequestOptions = {}) {
    const response = await this.executeWithRetry(
      () => this.client.get(`/work-records/${id}/`, { signal: options.signal }),
      'GET'
    );
    return response.data;
  }

  async createWorkRecord(data: any) {
    const response = await this.client.post('/work-records/', data);
    return response.data;
  }

  async updateWorkRecord(id: string, data: Partial<any>) {
    const response = await this.client.patch(`/work-records/${id}/`, data);
    return response.data;
  }

  async deleteWorkRecord(id: string) {
    await this.client.delete(`/work-records/${id}/`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PL (Product/Locomotive) Endpoints
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get paginated list of PL items with automatic retry
   * Returns: NormalizedListResult<PLNumber>
   */
  async getPlItems(
    query?: ListQueryParams,
    options: RequestOptions = {}
  ): Promise<NormalizedListResult<any>> {
    const params = {
      page: query?.page || 1,
      page_size: query?.pageSize || 15,
      ...(query?.search && { search: query.search }),
      ...(query?.sort && { ordering: query.sort }),
      ...(query?.filters && query.filters),
    };

    const response = await this.executeWithRetry(
      () => this.client.get('/pl-items/', { params, signal: options.signal }),
      'GET'
    );
    return this.normalizeListResponse(response.data, params.page_size);
  }

  /**
   * Get single PL item by ID with automatic retry
   * Returns: PLNumber
   */
  async getPlItem(id: string, options: RequestOptions = {}) {
    const response = await this.executeWithRetry(
      () => this.client.get(`/pl-items/${id}/`, { signal: options.signal }),
      'GET'
    );
    return response.data;
  }

  async createPlItem(data: any) {
    const response = await this.client.post('/pl-items/', data);
    return response.data;
  }

  async updatePlItem(id: string, data: Partial<any>) {
    const response = await this.client.patch(`/pl-items/${id}/`, data);
    return response.data;
  }

  async getSupervisorDocumentReviews(
    params?: {
      pl_item?: string;
      document?: string;
    },
    options: RequestOptions = {}
  ): Promise<NormalizedListResult<any>> {
    const response = await this.executeWithRetry(
      () => this.client.get('/supervisor-document-reviews/', { params, signal: options.signal }),
      'GET'
    );
    return this.normalizeListResponse(response.data, 50);
  }

  async approveSupervisorDocumentReview(id: string, payload?: { notes?: string }) {
    const response = await this.client.post(`/supervisor-document-reviews/${id}/approve/`, payload ?? {});
    return response.data;
  }

  async bypassSupervisorDocumentReview(id: string, payload?: { notes?: string; bypass_reason?: string }) {
    const response = await this.client.post(`/supervisor-document-reviews/${id}/bypass/`, payload ?? {});
    return response.data;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Case/Discrepancy Endpoints
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get paginated list of cases with automatic retry
   * Returns: NormalizedListResult<CaseRecord>
   */
  async getCases(
    query?: ListQueryParams,
    options: RequestOptions = {}
  ): Promise<NormalizedListResult<any>> {
    const params = {
      page: query?.page || 1,
      page_size: query?.pageSize || 15,
      ...(query?.search && { search: query.search }),
      ...(query?.sort && { ordering: query.sort }),
      ...(query?.filters && query.filters),
    };

    const response = await this.executeWithRetry(
      () => this.client.get('/cases/', { params, signal: options.signal }),
      'GET'
    );
    return this.normalizeListResponse(response.data, params.page_size);
  }

  /**
   * Get single case by ID with automatic retry
   * Returns: CaseRecord
   */
  async getCase(id: string, options: RequestOptions = {}) {
    const response = await this.executeWithRetry(
      () => this.client.get(`/cases/${id}/`, { signal: options.signal }),
      'GET'
    );
    return response.data;
  }

  async createCase(data: any) {
    const response = await this.client.post('/cases/', data);
    return response.data;
  }

  async updateCase(id: string, data: Partial<any>) {
    const response = await this.client.patch(`/cases/${id}/`, data);
    return response.data;
  }

  async closeCase(id: string, resolution: string) {
    const response = await this.client.post(`/cases/${id}/close/`, { resolution });
    return response.data;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // OCR Endpoints
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get paginated list of OCR jobs with automatic retry
   * Returns: NormalizedListResult<OcrJob>
   */
  async getOcrJobs(
    query?: ListQueryParams,
    options: RequestOptions = {}
  ): Promise<NormalizedListResult<any>> {
    const params = {
      page: query?.page || 1,
      page_size: query?.pageSize || 15,
      ...(query?.search && { search: query.search }),
      ...(query?.sort && { ordering: query.sort }),
      ...(query?.filters && query.filters),
    };

    const response = await this.executeWithRetry(
      () => this.client.get('/ocr/jobs/', { params, signal: options.signal }),
      'GET'
    );
    return this.normalizeListResponse(response.data, params.page_size);
  }

  /**
   * Get single OCR job by ID with automatic retry
   * Returns: OcrJob
   */
  async getOcrJob(id: string, options: RequestOptions = {}) {
    const response = await this.executeWithRetry(
      () => this.client.get(`/ocr/jobs/${id}/`, { signal: options.signal }),
      'GET'
    );
    return response.data;
  }

  async startOcrJob(documentId: string) {
    const response = await this.client.post('/ocr/jobs/', { document_id: documentId });
    return response.data;
  }

  async getOcrResult(documentId: string) {
    const response = await this.client.get(`/ocr/results/${documentId}/`);
    return response.data;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Approval Endpoints
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get paginated list of approvals with automatic retry
   * Returns: NormalizedListResult<Approval>
   */
  async getApprovals(
    query?: ListQueryParams,
    options: RequestOptions = {}
  ): Promise<NormalizedListResult<any>> {
    const params = {
      page: query?.page || 1,
      page_size: query?.pageSize || 15,
      ...(query?.search && { search: query.search }),
      ...(query?.sort && { ordering: query.sort }),
      ...(query?.filters && query.filters),
    };

    const response = await this.executeWithRetry(
      () => this.client.get('/approvals/', { params, signal: options.signal }),
      'GET'
    );
    return this.normalizeListResponse(response.data, params.page_size);
  }

  /**
   * Get single approval by ID with automatic retry
   * Returns: Approval
   */
  async getApproval(id: string, options: RequestOptions = {}) {
    const response = await this.executeWithRetry(
      () => this.client.get(`/approvals/${id}/`, { signal: options.signal }),
      'GET'
    );
    return response.data;
  }

  async approveRequest(id: string, comment?: string) {
    const response = await this.client.post(`/approvals/${id}/approve/`, { comment });
    return response.data;
  }

  async rejectRequest(id: string, reason: string) {
    const response = await this.client.post(`/approvals/${id}/reject/`, { reason });
    return response.data;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Audit Log Endpoints
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get paginated audit log entries with automatic retry
   * Returns: NormalizedListResult<AuditLogEntry>
   */
  async getAuditLog(
    query?: ListQueryParams,
    options: RequestOptions = {}
  ): Promise<NormalizedListResult<any>> {
    const params = {
      page: query?.page || 1,
      page_size: query?.pageSize || 15,
      ...(query?.search && { search: query.search }),
      ...(query?.sort && { ordering: query.sort }),
      ...(query?.filters && query.filters),
    };

    const response = await this.executeWithRetry(
      () => this.client.get('/audit/log/', { params, signal: options.signal }),
      'GET'
    );
    return this.normalizeListResponse(response.data, params.page_size);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Search Endpoints
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Search across all entities with automatic retry
   * Returns: NormalizedListResult<SearchResult>
   */
  async search(
    query: string,
    scope?: SearchScope,
    options: RequestOptions & {
      duplicates?: 'include' | 'exclude' | 'only';
      source?: string;
      className?: string;
      hashStatus?: 'present' | 'full' | 'missing' | '';
      plLinked?: 'linked' | 'unlinked' | '';
      status?: string[];
      dateRange?: 'any' | '7d' | '30d' | '90d' | '';
    } = {}
  ): Promise<SearchBucketsResponse> {
    const response = await this.executeWithRetry(
      () => this.client.get('/search/', {
        params: {
          q: query,
          scope,
          duplicates: options.duplicates,
          ...(options.source ? { source: options.source } : {}),
          ...(options.className ? { class: options.className } : {}),
          ...(options.hashStatus ? { hash_status: options.hashStatus } : {}),
          ...(options.plLinked ? { pl_linked: options.plLinked } : {}),
          ...(options.status && options.status.length > 0 ? { status: options.status.join(',') } : {}),
          ...(options.dateRange && options.dateRange !== 'any' ? { date_range: options.dateRange } : {}),
        },
        signal: options.signal,
      }),
      'GET'
    );
    return this.normalizeSearchResponse(response.data);
  }

  /**
   * Get search history for current user
   * Returns: SearchResult[]
   */
  async getSearchHistory() {
    const response = await this.client.get('/search/history/');
    return response.data;
  }

  async getInbox(options: RequestOptions = {}): Promise<{ items: AppInboxItem[] }> {
    const response = await this.executeWithRetry(
      () => this.client.get('/inbox/', { signal: options.signal }),
      'GET'
    );
    return {
      items: Array.isArray(response.data?.items) ? response.data.items : [],
    };
  }

  async actOnWorkflowItem(
    itemId: string,
    payload: {
      action: string;
      notes?: string;
      comment?: string;
      reason?: string;
      bypass_reason?: string;
      effectivity_date?: string;
    }
  ) {
    const response = await this.client.post(`/workflow-items/${encodeURIComponent(itemId)}/act/`, payload);
    return response.data;
  }

  async getDeduplicationGroups(
    params?: Record<string, string | number | boolean | undefined>,
    options: RequestOptions = {}
  ) {
    const response = await this.executeWithRetry(
      () => this.client.get('/deduplication/groups/', { params, signal: options.signal }),
      'GET'
    );
    return Array.isArray(response.data) ? response.data : [];
  }

  async applyDeduplicationDecision(groupKey: string, payload: { decision: 'MERGE' | 'IGNORE'; master_document_id?: string; notes?: string }) {
    const response = await this.client.post(`/deduplication/groups/${encodeURIComponent(groupKey)}/decision/`, payload);
    return response.data;
  }

  async ignoreDeduplicationGroup(groupKey: string, payload?: { notes?: string }) {
    const response = await this.client.post(`/deduplication/groups/${encodeURIComponent(groupKey)}/ignore/`, payload ?? {});
    return response.data;
  }

  async createHashBackfillJob(payload?: { source?: string; batch_size?: number; parameters?: Record<string, unknown> }) {
    const response = await this.client.post('/indexing/hash-backfill-jobs/', payload ?? {});
    return response.data;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Health & Status Endpoints
  // ─────────────────────────────────────────────────────────────────────────

  async getSystemHealth() {
    const response = await this.client.get('/health/status/');
    return response.data;
  }

  /**
   * Get dashboard statistics with automatic retry
   */
  async getDashboardStats() {
    try {
      const response = await this.executeWithRetry(
        () => this.client.get('/dashboard/stats/'),
        'GET'
      );
      return response.data;
    } catch (error) {
      if (import.meta.env.VITE_ENABLE_DEV_MOCK_API === 'true') {
        console.warn('Dashboard API unavailable after retries, using mock data:', error);
        const { MOCK_DOCUMENTS } = await import('../lib/mock');
        const { MOCK_APPROVALS, MOCK_OCR_JOBS } = await import('../lib/mockExtended');
        return {
          documents: {
            total: MOCK_DOCUMENTS.length,
            approved: MOCK_DOCUMENTS.filter(d => d.status === 'Approved').length,
            in_review: MOCK_DOCUMENTS.filter(d => d.status === 'In Review').length,
            draft: MOCK_DOCUMENTS.filter(d => d.status === 'Draft').length,
          },
          approvals: {
            pending: MOCK_APPROVALS.filter(a => a.status === 'Pending').length,
            approved: MOCK_APPROVALS.filter(a => a.status === 'Approved').length,
            rejected: MOCK_APPROVALS.filter(a => a.status === 'Rejected').length,
          },
          ocr_jobs: {
            completed: MOCK_OCR_JOBS.filter(j => j.status === 'Completed').length,
            processing: MOCK_OCR_JOBS.filter(j => j.status === 'Processing').length,
            failed: MOCK_OCR_JOBS.filter(j => j.status === 'Failed').length,
          }
        };
      }

      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Error Handling Utility
  // ─────────────────────────────────────────────────────────────────────────

  static getErrorMessage(error: AxiosError<any>): string {
    if (!error.response && error.message === 'Network Error') {
      return 'Cannot reach the backend. Verify the EDMS API server or preview proxy is running.';
    }
    if (error.response?.data?.detail) {
      return error.response.data.detail;
    }
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.message) {
      return error.message;
    }
    return 'An error occurred';
  }

  static getFieldErrors(error: AxiosError<any>): Record<string, string> {
    const errors: Record<string, string> = {};
    if (error.response?.data?.errors) {
      Object.entries(error.response.data.errors).forEach(([field, messages]) => {
        errors[field] = Array.isArray(messages) ? messages[0] : messages;
      });
    }
    return errors;
  }

  getErrorMessage(error: AxiosError<any>): string {
    return ApiClient.getErrorMessage(error);
  }

  getFieldErrors(error: AxiosError<any>): Record<string, string> {
    return ApiClient.getFieldErrors(error);
  }
}

export const apiClient = new ApiClient();
export default apiClient;
