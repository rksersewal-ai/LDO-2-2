# Backend Changes Needed After Frontend Finalization

This note captures only the backend work required to support the new frontend behavior that is now present in the BOM and shell UX.

## Summary

The frontend now assumes:

- a dedicated `Create New BOM` flow
- local draft BOM workspaces
- arbitrary PL movement across BOM hierarchy levels
- magnetic drop suggestions for `before`, `inside`, `after`, and `promote to root`
- PL-first node creation from a BOM editor
- existing PL detail document search, link/unlink, and preview remaining intact
- a darker engineering-grid shell treatment with a right-click mouse palette
- header utility popovers that close on outside-click rather than idle timeout
- work ledger PL linking through a searchable PL dropdown with inline PL summary
- work ledger exports centered on start date, closing date, and total days taken

The backend should be changed after the interaction model is approved, not before.

## BOM Workspace APIs

Add a real BOM workspace model instead of relying on static product trees.

Recommended entities:

- `bom_workspace`
- `bom_workspace_revision`
- `bom_node`
- `bom_move_event`
- `bom_validation_result`

Recommended API surface:

- `GET /api/bom-workspaces/`
- `POST /api/bom-workspaces/`
- `GET /api/bom-workspaces/{id}/`
- `PATCH /api/bom-workspaces/{id}/`
- `DELETE /api/bom-workspaces/{id}/`
- `POST /api/bom-workspaces/{id}/nodes/`
- `PATCH /api/bom-workspaces/{id}/nodes/{node_id}/`
- `DELETE /api/bom-workspaces/{id}/nodes/{node_id}/`
- `POST /api/bom-workspaces/{id}/move-node/`

## Create BOM Flow Contract

The new frontend create page starts with:

- product name
- optional subtitle
- optional description
- lifecycle
- one mandatory root PL number

Backend create payload should accept:

```json
{
  "name": "High Capacity Converter Pack",
  "subtitle": "Electrical module",
  "category": "Electrical Component",
  "description": "Optional summary",
  "lifecycle": "IN_DEVELOPMENT",
  "root_pl_number": "38110000"
}
```

Backend create response should return:

- workspace id
- workspace metadata
- resolved root PL snapshot
- initial BOM tree with the root node already created

## Node Movement Contract

The frontend now supports moving a PL:

- above another node
- below another node
- inside another node
- back to top level

That means the backend move endpoint should not be limited to sibling reorder.

Recommended move payload:

```json
{
  "drag_node_id": "node-123",
  "target_node_id": "node-456",
  "placement": "inside"
}
```

Allow `target_node_id = null` with `placement = "root"` for promotion to top level.

## Validation Rules Needed On The Backend

The frontend does not enforce all structural safety rules permanently. The backend must.

Required server-side checks:

- prevent dropping a node into itself
- prevent dropping a node into its own descendant
- prevent cycle creation
- enforce maximum hierarchy depth of 50
- preserve ordered child sequence after move
- reject invalid PL references if strict mode is enabled
- keep quantity and find number valid after move

## Suggested Move Response

Return both outcome and fresh structure guidance:

```json
{
  "status": "ok",
  "tree_version": 14,
  "moved_node_id": "node-123",
  "target_node_id": "node-456",
  "placement": "inside",
  "tree": []
}
```

Returning the normalized tree is preferable to forcing the frontend to guess final order.

## PL Lookup For BOM Authoring

The add-node modal already assumes PL lookup by 8-digit PL number.

Provide:

- `GET /api/pl-items/{pl_number}/`
- optional `GET /api/pl-items/?search=3811`

Return enough data to populate:

- PL number
- name
- type
- revision
- lifecycle
- department
- safety-vital flag
- tags

## Draft Workspace Persistence

The frontend currently stores new BOMs in browser local storage only.

Backend replacement should support:

- draft save
- autosave versioning
- updated timestamp
- created by
- last edited by
- lock or optimistic concurrency token

Recommended fields:

- `status`: `DRAFT`, `IN_REVIEW`, `RELEASED`
- `version`
- `etag` or `updated_at`

## BOM Tree Query Shape

The frontend expects one tree payload, not a flat-only list.

Recommended response shape:

```json
{
  "workspace": {
    "id": "bom-001",
    "name": "WAP-7",
    "root_pl": "38100000",
    "revision": "D",
    "lifecycle": "PRODUCTION"
  },
  "tree": [
    {
      "id": "38100000",
      "name": "WAP7 Locomotive",
      "type": "assembly",
      "revision": "D",
      "quantity": 1,
      "find_number": "1",
      "unit_of_measure": "EA",
      "tags": ["Railway"],
      "children": []
    }
  ]
}
```

## PL Detail Document Behavior

Keep these capabilities unchanged when backend work starts:

- document search inside PL detail
- link document to PL
- unlink document from PL
- preview linked document

The frontend was intentionally left compatible with those behaviors.

## Work Ledger PL Lookup Contract

The frontend work-activity form now expects a live PL picker instead of a free-text PL input.

Provide:

- `GET /api/pl-items/?search={query}`
- or enough data on `GET /api/pl-items/` for client-side search in lower-volume mode

Minimum PL lookup response fields:

- `pl_number`
- `name`
- `description`
- `category`
- `controlling_agency`
- `status`
- `vendor_type`

The form now auto-renders a PL summary card and a "View PL Details" link after selection, so those fields need to be available without a second round-trip where possible.

## Work Ledger Payload Changes

The simplified work-log frontend now assumes:

- `referenceNumber`, `drawingNumber`, `specificationNumber`, `otherNumber`, and `dispatchDate` are not part of the create flow
- only one e-office identifier is used in the frontend form: `eOfficeNumber`
- `date` and `closingDate` are required at creation time
- newly created entries may be logged directly into a pending-verification state

Recommended create payload:

```json
{
  "workCategory": "DRAWING",
  "workType": "Drawing Amendment",
  "description": "Description of work",
  "remarks": "Optional notes",
  "plNumber": "38110000",
  "tenderNumber": "CLW/TENDER/2026/001",
  "eOfficeNumber": "CLW/DESIGN/2026/0001",
  "sectionType": "Design",
  "concernedOfficer": "SSE/Design",
  "consentGiven": "N/A",
  "date": "2026-03-26",
  "closingDate": "2026-03-29",
  "daysTaken": 3,
  "status": "SUBMITTED"
}
```

## Work Ledger Export Contract

The frontend export actions now expect these columns to exist consistently:

- `Start Date`
- `Closing Date`
- `Days Taken`
- `PL Number`
- `eOffice Case`

If backend-driven export endpoints replace client exports later, they should match the same header vocabulary to avoid user-visible drift.

## Shell Behavior Notes

These frontend changes do not require backend changes:

- patterned application background
- hover-expand sidebar
- header controls closing on outside-click
- right-click mouse palette

Only store shell preferences if product leadership later wants persistence again.

## Recommended Delivery Order

1. Add BOM workspace and tree read APIs.
2. Add create-BOM endpoint with root PL initialization.
3. Add node create and move endpoints with cycle protection.
4. Add draft persistence and optimistic concurrency.
5. Replace frontend local draft storage with backend workspaces.
6. Add release/baseline logic only after draft authoring is stable.
