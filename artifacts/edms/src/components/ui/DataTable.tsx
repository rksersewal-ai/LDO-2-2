/**
 * DataTable — shared, reusable table component with sorting, filtering,
 * pagination, multi-select, and density toggle.
 *
 * Eliminates duplicated table patterns across WorkLedger, DocumentHub,
 * SearchExplorer, and AuditLog pages.
 */
import React, { useState, useCallback } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { Spinner } from "./spinner";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "./table";

// ─── Column Definition ────────────────────────────────────────────────────────

export type SortDirection = "asc" | "desc" | null;

export interface DataTableColumn<T> {
  key: string;
  header: string | React.ReactNode;
  cell: (row: T, index: number) => React.ReactNode;
  /** Enable sorting on this column */
  sortable?: boolean;
  /** Fixed column width */
  width?: string | number;
  /** Align cell content */
  align?: "left" | "center" | "right";
  /** Hide on smaller screens */
  hidden?: boolean;
}

export interface SortState {
  key: string;
  direction: SortDirection;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface DataTableProps<T extends { id: string }> {
  data: T[];
  columns: DataTableColumn<T>[];
  isLoading?: boolean;
  error?: string | null;
  emptyMessage?: string;

  // Sorting
  sort?: SortState;
  onSort?: (sort: SortState) => void;

  // Selection
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;

  // Pagination
  page?: number;
  pageSize?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;

  // Density
  density?: "dense" | "normal";

  // Row click
  onRowClick?: (row: T) => void;

  className?: string;
}

// ─── Sort Icon ────────────────────────────────────────────────────────────────

function SortIcon({ direction }: { direction: SortDirection }) {
  if (direction === "asc")
    return <ChevronUp className="h-3.5 w-3.5 ml-1 inline-block" />;
  if (direction === "desc")
    return <ChevronDown className="h-3.5 w-3.5 ml-1 inline-block" />;
  return (
    <ChevronsUpDown className="h-3.5 w-3.5 ml-1 inline-block opacity-40" />
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DataTable<T extends { id: string }>({
  data,
  columns,
  isLoading = false,
  error = null,
  emptyMessage = "No records found.",
  sort,
  onSort,
  selectable = false,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  page = 1,
  pageSize = 25,
  totalCount,
  onPageChange,
  density = "normal",
  onRowClick,
  className,
}: DataTableProps<T>) {
  const rowHeight = density === "dense" ? "h-9" : "h-11";
  const visibleCols = columns.filter((c) => !c.hidden);
  const totalPages =
    totalCount != null ? Math.ceil(totalCount / pageSize) : undefined;
  const isAllSelected =
    selectable && data.length > 0 && selectedIds?.size === data.length;
  const isPartial =
    selectable && (selectedIds?.size ?? 0) > 0 && !isAllSelected;

  const handleSort = useCallback(
    (col: DataTableColumn<T>) => {
      if (!col.sortable || !onSort) return;
      if (sort?.key === col.key) {
        const next: SortDirection =
          sort.direction === "asc"
            ? "desc"
            : sort.direction === "desc"
              ? null
              : "asc";
        onSort({ key: col.key, direction: next });
      } else {
        onSort({ key: col.key, direction: "asc" });
      }
    },
    [sort, onSort],
  );

  return (
    <div className={cn("flex flex-col gap-0", className)}>
      {/* Table */}
      <div className="relative w-full overflow-auto rounded-md border">
        <table className="w-full caption-bottom text-sm">
          {/* Sticky header */}
          <thead className="sticky top-0 z-10 bg-card border-b">
            <tr>
              {selectable && (
                <th className="w-10 px-3 py-2">
                  <Checkbox
                    checked={
                      isAllSelected ? true : isPartial ? "indeterminate" : false
                    }
                    onCheckedChange={onToggleSelectAll}
                    aria-label="Select all"
                  />
                </th>
              )}
              {visibleCols.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={cn(
                    "px-3 py-2 text-left text-xs font-medium text-muted-foreground tracking-wide select-none",
                    col.align === "center" && "text-center",
                    col.align === "right" && "text-right",
                    col.sortable &&
                      "cursor-pointer hover:text-foreground transition-colors",
                  )}
                  onClick={() => handleSort(col)}
                >
                  {col.header}
                  {col.sortable && (
                    <SortIcon
                      direction={
                        sort?.key === col.key ? (sort.direction ?? null) : null
                      }
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="[&_tr:last-child]:border-0">
            {isLoading ? (
              <tr>
                <td
                  colSpan={visibleCols.length + (selectable ? 1 : 0)}
                  className="py-16 text-center"
                >
                  <Spinner className="mx-auto h-6 w-6" />
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td
                  colSpan={visibleCols.length + (selectable ? 1 : 0)}
                  className="py-12 text-center text-sm text-destructive"
                >
                  {error}
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleCols.length + (selectable ? 1 : 0)}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => {
                const isRowSelected =
                  selectable && (selectedIds?.has(row.id) ?? false);
                return (
                  <tr
                    key={row.id}
                    data-state={isRowSelected ? "selected" : undefined}
                    className={cn(
                      "border-b transition-colors",
                      rowHeight,
                      isRowSelected ? "bg-accent/60" : "hover:bg-muted/40",
                      onRowClick && "cursor-pointer",
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <td className="w-10 px-3 py-0">
                        <Checkbox
                          checked={isRowSelected}
                          onCheckedChange={() => onToggleSelect?.(row.id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select row ${index + 1}`}
                        />
                      </td>
                    )}
                    {visibleCols.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-3 py-0 align-middle",
                          col.align === "center" && "text-center",
                          col.align === "right" && "text-right",
                        )}
                      >
                        {col.cell(row, index)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages != null && totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between px-2 py-2 text-sm text-muted-foreground">
          <span>
            {totalCount != null &&
              `${Math.min((page - 1) * pageSize + 1, totalCount)}–${Math.min(page * pageSize, totalCount)} of ${totalCount}`}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
