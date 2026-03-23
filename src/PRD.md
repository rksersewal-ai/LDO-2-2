# Figma Product Design PRD: LDO-2 Enterprise Document Management System (EDMS)

## 1. Product Overview & Design Principles
**Product:** LDO-2 EDMS (Enterprise Document Management System)
**Environment:** LAN-based internal web application.
**Theme:** Dark teal and green gradient, glass-morphism effects, curved edges.

**Design Principles for Figma:**
*   **Enterprise-Grade:** Document-heavy, workflow-heavy usability. Optimized for dense data, tables, metadata, and filters. Not a marketing or portfolio site.
*   **Trust & Audit-Conscious:** Actions must feel deliberate. System health, processing statuses, and historical traceability must be visibly accessible.
*   **Role-Aware:** UI must adapt seamlessly to user permissions (e.g., hiding admin controls, showing read-only states).
*   **Long-Session Usability:** High contrast for readability, low eye strain, clear hierarchy.
*   **Scalability:** Layouts must accommodate future modules and deep, nested data (like BOMs).

---

## 2. Shared Enterprise Patterns & States (Figma Component Library Requirements)
Before designing modules, establish the following shared components and states:

### 2.1 UI Components
*   **Data Tables:** Sortable headers, sticky columns, inline actions, pagination, row expansion, multi-select.
*   **Filters & Search:** Complex query builders, collapsible filter panels, faceted search chips.
*   **Forms & Inputs:** Dense enterprise forms, inline validation, file dropzones, read-only data fields.
*   **Badges/Chips:** Status indicators (e.g., Draft, Approved, Obsolete, Processing, Failed), linked tags.
*   **Modals & Dialogs:** Confirmation dialogues, multi-step wizards, quick-preview overlays.

### 2.2 Global System States
Every interactive view must account for:
*   **Loading:** Skeleton loaders for dashboards/previews; subtle spinners for tables.
*   **Empty:** Clear "No documents found" or "No linked records" illustrations/text.
*   **Error / Failed:** OCR failure alerts, network disconnects, invalid file formats.
*   **Processing:** Async task indicators (e.g., "OCR Extraction in Progress").
*   **Completed / Success:** Toast notifications, green checkmarks.
*   **Restricted Access:** "Permission Denied" states for unauthorized module access.

---

## 3. Global App Shell & Navigation Model
The persistent layout wrapper for the entire application.

*   **Announcement/Banner Line:** Admin-managed, clickable running banner at the absolute top of the viewport for system-wide alerts.
*   **Floating Sidebar (Left):**
    *   Starts collapsed (circular icons only).
    *   Expands on icon click to show text labels (No hamburger menu).
    *   Contains the primary module navigation.
*   **Header (Top):**
    *   Dynamic Breadcrumbs.
    *   Global Omnisearch Bar (Searches docs, PLs, BOMs, Ledger).
    *   Notification Center (bell icon with unread badge, action-based alerts).
    *   Text-size accessibility controls.
    *   User Profile / Logout dropdown.

---

## 4. Module Inventory & Functional Requirements

### 4.1 Login / Session Flow
*   **Screens:** Login Auth, Forgot Password, Session Timeout / Locked Screen.
*   **Features:** Standard enterprise SSO/credential input.

### 4.2 Dashboard
*   **Screens:** Main User Dashboard.
*   **Features:** Personalized view. My recent documents, pending approvals, assigned cases, quick-link widgets.

### 4.3 Search Explorer
*   **Screens:** Full-page Advanced Search.
*   **Features:** Multi-parameter search (metadata, OCR text, dates, authors). Saved search queries. Visual results with hit-highlighting.

### 4.4 Documents List / Repository
*   **Screens:** Grid View, List View.
*   **Features:** Browse, filter, sort. Version visibility toggle (Latest vs. Obsolete). Batch actions (download, move, request approval).

### 4.5 Document Preview / Detail Workspace
*   **Screens:** Full-screen Document Workspace.
*   **Layout Requirements:**
    *   **Large Central Preview:** High-fidelity PDF/Image viewer with zoom/pan.
    *   **Left/Right Panels (Collapsible):**
        *   *Metadata Panel:* Author, dates, tags, revision history.
        *   *OCR / Intelligence Panel:* Extracted text, clickable matched references (hyperlinks to other docs).
        *   *Relationships Panel:* Linked PL numbers, "Used In" BOM references, linked Cases.
    *   **Header Actions:** Download, Edit Metadata, Route for Approval, **Rerun OCR** (if role allows).

### 4.6 PL Search / PL Knowledge Hub
*   **Screens:** Product Lifecycle (PL) Master List, PL Detail View.
*   **Features:** Search by PL number. Detail view shows all linked documents, technical drawings, and engineering changes associated with that PL.

### 4.7 BOM / Interactive BOM
*   **Screens:** BOM Explorer.
*   **Features:** Hierarchical tree structure. Selecting a sub-assembly node dynamically filters the adjacent pane to show tied PL records, drawings, and specs.

### 4.8 Work Ledger
*   **Screens:** Ledger Master Table, Entry Detail.
*   **Features:** Immutable tracking of document work, check-ins, check-outs, minor revisions, and daily operational notes.

### 4.9 Work Ledger Reports
*   **Screens:** Ledger Analytics.
*   **Features:** Productivity metrics, time-in-status tracking, exportable audit sheets.

### 4.10 Cases and Case Detail
*   **Screens:** Case Queue, Case Detail/Thread.
*   **Features:** Ticket-based discrepancy tracking linked to specific document IDs. Chat/comment thread, status progression (Open -> Investigating -> Resolved).

### 4.11 Approvals
*   **Screens:** My Approval Queue, Review Interface.
*   **Features:** Compare previous vs. current revision. Approve, Reject with comments, Delegate.

### 4.12 Reports
*   **Screens:** General Reporting Hub.
*   **Features:** System usage, storage growth, user activity, document ingest velocity.

### 4.13 Admin Workspace
*   **Screens:** Admin Hub, RBAC Management.
*   **Features:** Manage user roles, group permissions, folder-level access.

### 4.14 OCR Admin / OCR Monitor
*   **Screens:** OCR Health Dashboard, Processing Queue.
*   **Features:** Real-time visibility into the OCR engine. Queue management, error logs, manual retry triggers, success/fail metrics.

### 4.15 Audit Log
*   **Screens:** Global Event Log.
*   **Features:** Strict, non-editable table of all `READ`, `WRITE`, `UPDATE`, `DELETE` events. Filterable by user, IP, date, and document ID.

### 4.16 Settings / System Configuration
*   **Screens:** Global Settings.
*   **Features:** Data retention policies, metadata field configuration, integrations.

### 4.17 Announcement / Banner Management
*   **Screens:** Banner Editor.
*   **Features:** Admin UI to draft, schedule, and style the global announcement banner. Target specific roles or global broadcast.

---

## 5. Key User Journeys (For Figma Prototyping)

1.  **Ingest to Intelligence:** User uploads a scanned technical drawing -> File hits Documents List (Processing State) -> OCR extracts text & links PL numbers -> User opens Document Preview to verify OCR intelligence and relationships.
2.  **The Engineering Pivot (BOM to Doc):** Engineer searches a PL number -> Opens Interactive BOM -> Drills down to a specific part -> Clicks the linked technical drawing -> Opens directly into Document Preview Workspace.
3.  **Compliance Audit:** Admin opens Audit Log -> Filters by a specific obsolete document -> Traces the Approval history -> Exports the Work Ledger report for that specific lifecycle.
4.  **Discrepancy Resolution:** Reviewer rejects a document in the Approvals queue -> Automatically generates a Case -> Original author receives Notification -> Author updates document and links the resolved Case -> Reroutes for approval.