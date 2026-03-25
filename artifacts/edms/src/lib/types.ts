export type UserRole = 'admin' | 'supervisor' | 'engineer' | 'reviewer' | 'viewer';

export type DocumentCategory =
  | 'DRAWING'
  | 'SPECIFICATION'
  | 'ELIGIBILITY_CRITERIA'
  | 'SCOPE_OF_SUPPLY'
  | 'SMI'
  | 'STANDARD'
  | 'TENDER'
  | 'SDR'
  | 'TEST_REPORT'
  | 'CERTIFICATE'
  | 'PROCEDURE'
  | 'OTHER';

export type DocumentStatus = 'ACTIVE' | 'OBSOLETE' | 'UNDER_REVIEW' | 'DRAFT' | 'APPROVED';

export type OcrStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'FLAGGED'
  | 'SKIPPED'
  | 'NOT_REQUIRED';

export type InspectionCategory = 'CAT-A' | 'CAT-B' | 'CAT-C' | 'CAT-D';

export type WorkCategory =
  | 'GENERAL'
  | 'DRAWING'
  | 'SPECIFICATION'
  | 'TENDER'
  | 'SHOP'
  | 'IC'
  | 'AMENDMENT'
  | 'VENDOR'
  | 'EXTERNAL'
  | 'FAILURE'
  | 'INSPECTION';

export type PLStatus = 'ACTIVE' | 'UNDER_REVIEW' | 'OBSOLETE';

export type SafetyClassification = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type WorkRecordStatus = 'OPEN' | 'SUBMITTED' | 'VERIFIED' | 'CLOSED';

export type CaseStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED';

export type CaseSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Document {
  id: string;
  documentNumber: string;
  title: string;
  category: DocumentCategory;
  status: DocumentStatus;
  agency: string;
  revision: string;
  revisionDate: string;
  fileType: string;
  fileSize?: string;
  pages?: number;
  tags: string[];
  linkedPlNumbers: string[];
  filePath?: string;
  ocrStatus: OcrStatus;
  ocrConfidence?: number | null;
  ocrText?: string;
  ocrRetryCount?: number;
  ocrError?: string;
  extractedReferences?: string[];
  isLatest?: boolean;
  sha256?: string;
  uploadedBy?: string;
  owner?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EngineeringChange {
  id: string;
  ecNumber: string;
  status: 'OPEN' | 'IN_REVIEW' | 'IMPLEMENTED' | 'RELEASED';
  description: string;
  date: string;
  author?: string;
}

export interface PLNumber {
  id: string;
  plNumber: string;
  description: string;
  name: string;
  category: InspectionCategory;
  controllingAgency: string;
  status: PLStatus;
  safetyCritical: boolean;
  safetyClassification?: SafetyClassification;
  severityOfFailure?: string;
  consequences?: string;
  functionality?: string;
  applicationArea?: string;
  usedIn: string[];
  drawingNumbers: string[];
  specNumbers: string[];
  motherPart?: string;
  uvamId?: string;
  strNumber?: string;
  eligibilityCriteria?: string;
  designSupervisor?: string;
  concernedSupervisor?: string;
  eOfficeFile?: string;
  vendorType?: 'VD' | 'NVD';
  recentActivity?: string[];
  engineeringChanges?: EngineeringChange[];
  linkedDocumentIds: string[];
  linkedWorkIds: string[];
  linkedCaseIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkTypeDefinition {
  id?: string;
  code: string;
  label: string;
  category: WorkCategory;
  disposalDays: number;
  description?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isActive?: boolean;
  requiresDocument?: boolean;
  consentApplicable?: boolean;
}

export interface WorkRecord {
  id: string;
  userId: string;
  userName: string;
  userSection?: string;
  date: string;
  completionDate?: string;
  closedDate?: string | null;
  dispatchDate?: string;
  closingDate?: string;
  daysTaken?: number;
  workCategory: WorkCategory;
  workType: string;
  referenceNumber?: string;
  plNumber?: string;
  drawingNumber?: string;
  specificationNumber?: string;
  tenderNumber?: string;
  otherNumber?: string;
  description: string;
  remarks?: string;
  eOfficeNumber?: string;
  eOfficeFileNo?: string;
  concernedOfficer?: string;
  sectionType?: string;
  targetDays?: number;
  documentRef?: string;
  consentGiven?: string;
  status: WorkRecordStatus;
  isLocked?: boolean;
  verifiedBy?: string;
  verificationDate?: string;
  createdAt?: string;
}

export interface CaseRecord {
  id: string;
  caseNumber: string;
  title: string;
  description: string;
  status: CaseStatus;
  severity: CaseSeverity;
  plNumber?: string;
  vendorName?: string;
  tenderNumber?: string;
  linkedDocumentIds: string[];
  linkedWorkIds: string[];
  assignee: string;
  createdAt: string;
  updatedAt: string;
  type?: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  fullName?: string;
  email: string;
  role: UserRole;
  section: string;
  department?: string;
  designation: string;
  employeeId?: string;
  phone?: string;
  isActive?: boolean;
  lastLogin?: string;
}

export interface Section {
  id: string;
  name: string;
  code: string;
  description: string;
  isActive: boolean;
}

export interface Role {
  id: string;
  name: string;
  code: string;
  description: string;
  permissions: string[];
  isActive: boolean;
  isSystemRole?: boolean;
}

export interface DropdownSettings {
  workTypes: WorkTypeDefinition[];
  sectionTypes: string[];
  concernedOfficers: string[];
  agencies: string[];
  documentCategories: string[];
}

export interface SearchResult {
  type: 'document' | 'pl' | 'work' | 'case';
  id: string;
  title: string;
  subtitle?: string;
  status?: string;
  matchField?: string;
  snippet?: string;
}

export interface KPIStatus {
  label: string;
  color: string;
  isOnTime: boolean;
}

// ─────────────────────────────────────────────────────────────────────────
// Standardized API Response Shapes
// ─────────────────────────────────────────────────────────────────────────

/**
 * Standard paginated list response for all GET list operations
 * Ensures consistency across all endpoints
 */
export interface ApiListResponse<T> {
  results: T[];
  total: number;
  page?: number;
  pageSize?: number;
  hasMore?: boolean;
}

/**
 * Standard single item response for GET/:id operations
 */
export interface ApiItemResponse<T> {
  data: T;
}

/**
 * Standard response for POST/PATCH/PUT operations
 */
export interface ApiMutationResponse<T> {
  data: T;
  message?: string;
}

/**
 * Standard response for DELETE operations
 */
export interface ApiDeleteResponse {
  success: boolean;
  message?: string;
}

/**
 * Standard error response shape
 */
export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  details?: ApiErrorDetail[];
  errors?: Record<string, string[]>;
}

/**
 * Query parameters for list operations
 */
export interface ListQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  filters?: Record<string, any>;
}

/**
 * Normalized result from all list queries
 */
export interface NormalizedListResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
