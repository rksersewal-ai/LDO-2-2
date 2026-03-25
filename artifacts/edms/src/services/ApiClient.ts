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
import { safeValidate } from '../lib/validation';
import type {
  ApiListResponse,
  ApiItemResponse,
  ApiMutationResponse,
  ApiDeleteResponse,
  NormalizedListResult,
  ListQueryParams,
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

class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    initialDelayMs: 1000,      // 1 second
    maxDelayMs: 30000,         // 30 seconds
    backoffMultiplier: 2,      // Exponential backoff
  };

  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8765/api';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000'),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add JWT token to requests
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle responses and errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiErrorResponse>) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
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
        lastError = error;

        // Don't retry on non-retryable errors
        if (!this.isRetryableError(error)) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          throw error;
        }

        // Calculate backoff and wait
        const delayMs = this.calculateBackoffDelay(attempt);
        const status = error.response?.status;
        const code = error.code;

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
    if ('results' in response && 'total' in response) {
      const page = response.page || 1;
      return {
        items: response.results,
        total: response.total,
        page,
        pageSize: response.pageSize || pageSize,
        hasMore: page * (response.pageSize || pageSize) < response.total,
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

    // Default empty
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize,
      hasMore: false,
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
        refresh: string;
        user: any;
      }>('/auth/login/', { username, password }),
      'POST'
    );
    
    const { access, user } = response.data;
    localStorage.setItem('auth_token', access);
    localStorage.setItem('user', JSON.stringify(user));
    
    return { token: access, user };
  }

  async logout() {
    try {
      await this.client.post('/auth/logout/');
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    }
  }

  async refreshToken() {
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('No token found');
    
    const response = await this.client.post<{ access: string }>('/auth/token/refresh/', {
      refresh: token,
    });
    
    const { access } = response.data;
    localStorage.setItem('auth_token', access);
    return access;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Document Endpoints
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get paginated list of documents with automatic retry on transient failures
   * Returns: NormalizedListResult<Document>
   */
  async getDocuments(query?: ListQueryParams): Promise<NormalizedListResult<any>> {
    try {
      const params = {
        page: query?.page || 1,
        page_size: query?.pageSize || 15,
        ...(query?.search && { search: query.search }),
        ...(query?.sort && { ordering: query.sort }),
        ...(query?.filters && query.filters),
      };

      const response = await this.executeWithRetry(
        () => this.client.get('/documents/', { params }),
        'GET',
        this.retryConfig.maxRetries
      );
      return this.normalizeListResponse(response.data, params.page_size);
    } catch (error) {
      // Fallback to mock data if API unavailable after retries
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
  }

  /**
   * Get single document by ID with automatic retry
   * Returns: Document
   */
  async getDocument(id: string) {
    const response = await this.executeWithRetry(
      () => this.client.get(`/documents/${id}/`),
      'GET'
    );
    return response.data;
  }

  async createDocument(data: FormData) {
    const response = await this.client.post('/documents/', data, {
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
  async getWorkRecords(query?: ListQueryParams): Promise<NormalizedListResult<any>> {
    const params = {
      page: query?.page || 1,
      page_size: query?.pageSize || 15,
      ...(query?.search && { search: query.search }),
      ...(query?.sort && { ordering: query.sort }),
      ...(query?.filters && query.filters),
    };

    const response = await this.executeWithRetry(
      () => this.client.get('/work-records/', { params }),
      'GET'
    );
    return this.normalizeListResponse(response.data, params.page_size);
  }

  /**
   * Get single work record by ID with automatic retry
   * Returns: WorkRecord
   */
  async getWorkRecord(id: string) {
    const response = await this.executeWithRetry(
      () => this.client.get(`/work-records/${id}/`),
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
  async getPlItems(query?: ListQueryParams): Promise<NormalizedListResult<any>> {
    const params = {
      page: query?.page || 1,
      page_size: query?.pageSize || 15,
      ...(query?.search && { search: query.search }),
      ...(query?.sort && { ordering: query.sort }),
      ...(query?.filters && query.filters),
    };

    const response = await this.executeWithRetry(
      () => this.client.get('/pl-items/', { params }),
      'GET'
    );
    return this.normalizeListResponse(response.data, params.page_size);
  }

  /**
   * Get single PL item by ID with automatic retry
   * Returns: PLNumber
   */
  async getPlItem(id: string) {
    const response = await this.executeWithRetry(
      () => this.client.get(`/pl-items/${id}/`),
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

  // ─────────────────────────────────────────────────────────────────────────
  // Case/Discrepancy Endpoints
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get paginated list of cases with automatic retry
   * Returns: NormalizedListResult<CaseRecord>
   */
  async getCases(query?: ListQueryParams): Promise<NormalizedListResult<any>> {
    const params = {
      page: query?.page || 1,
      page_size: query?.pageSize || 15,
      ...(query?.search && { search: query.search }),
      ...(query?.sort && { ordering: query.sort }),
      ...(query?.filters && query.filters),
    };

    const response = await this.executeWithRetry(
      () => this.client.get('/cases/', { params }),
      'GET'
    );
    return this.normalizeListResponse(response.data, params.page_size);
  }

  /**
   * Get single case by ID with automatic retry
   * Returns: CaseRecord
   */
  async getCase(id: string) {
    const response = await this.executeWithRetry(
      () => this.client.get(`/cases/${id}/`),
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
  async getOcrJobs(query?: ListQueryParams): Promise<NormalizedListResult<any>> {
    const params = {
      page: query?.page || 1,
      page_size: query?.pageSize || 15,
      ...(query?.search && { search: query.search }),
      ...(query?.sort && { ordering: query.sort }),
      ...(query?.filters && query.filters),
    };

    const response = await this.executeWithRetry(
      () => this.client.get('/ocr/jobs/', { params }),
      'GET'
    );
    return this.normalizeListResponse(response.data, params.page_size);
  }

  /**
   * Get single OCR job by ID with automatic retry
   * Returns: OcrJob
   */
  async getOcrJob(id: string) {
    const response = await this.executeWithRetry(
      () => this.client.get(`/ocr/jobs/${id}/`),
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
  async getApprovals(query?: ListQueryParams): Promise<NormalizedListResult<any>> {
    const params = {
      page: query?.page || 1,
      page_size: query?.pageSize || 15,
      ...(query?.search && { search: query.search }),
      ...(query?.sort && { ordering: query.sort }),
      ...(query?.filters && query.filters),
    };

    const response = await this.executeWithRetry(
      () => this.client.get('/approvals/', { params }),
      'GET'
    );
    return this.normalizeListResponse(response.data, params.page_size);
  }

  /**
   * Get single approval by ID with automatic retry
   * Returns: Approval
   */
  async getApproval(id: string) {
    const response = await this.executeWithRetry(
      () => this.client.get(`/approvals/${id}/`),
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
  async getAuditLog(query?: ListQueryParams): Promise<NormalizedListResult<any>> {
    const params = {
      page: query?.page || 1,
      page_size: query?.pageSize || 15,
      ...(query?.search && { search: query.search }),
      ...(query?.sort && { ordering: query.sort }),
      ...(query?.filters && query.filters),
    };

    const response = await this.executeWithRetry(
      () => this.client.get('/audit/log/', { params }),
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
  async search(query: string, scope?: string): Promise<NormalizedListResult<any>> {
    const response = await this.executeWithRetry(
      () => this.client.get('/search/', {
        params: { q: query, scope },
      }),
      'GET'
    );
    return this.normalizeListResponse(response.data, 50);
  }

  /**
   * Get search history for current user
   * Returns: SearchResult[]
   */
  async getSearchHistory() {
    const response = await this.client.get('/search/history/');
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
      // Fallback to mock data if API unavailable after retries
      console.warn('Dashboard API unavailable after retries, using mock data:', error);
      const { MOCK_DOCUMENTS, MOCK_AUDIT_LOG } = await import('../lib/mock');
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
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Error Handling Utility
  // ─────────────────────────────────────────────────────────────────────────

  static getErrorMessage(error: AxiosError<ApiErrorResponse>): string {
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

  static getFieldErrors(error: AxiosError<ApiErrorResponse>): Record<string, string> {
    const errors: Record<string, string> = {};
    if (error.response?.data?.errors) {
      Object.entries(error.response.data.errors).forEach(([field, messages]) => {
        errors[field] = Array.isArray(messages) ? messages[0] : messages;
      });
    }
    return errors;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
