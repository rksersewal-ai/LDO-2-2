"""
Export Service
Generates CSV, Excel (.xlsx), and JSON exports for documents, work records, and audit logs.
"""
import csv
import importlib.util
import io
import json
import logging
from typing import Any, Dict, Iterable, List, Optional

logger = logging.getLogger(__name__)

XLSX_AVAILABLE = importlib.util.find_spec("xlsxwriter") is not None or importlib.util.find_spec("openpyxl") is not None
if not XLSX_AVAILABLE:
    logger.warning("xlsxwriter/openpyxl not installed — Excel export disabled")


class ExportService:
    """Generate data exports in CSV, Excel, and JSON formats."""

    @staticmethod
    def to_csv(
        rows: Iterable[Dict[str, Any]],
        fields: Optional[List[str]] = None,
    ) -> bytes:
        """
        Convert queryset/dict rows to CSV bytes.

        Args:
            rows: Iterable of dicts (e.g. queryset.values() result)
            fields: Column order. If None, uses keys from first row.
        """
        rows_list = list(rows)
        if not rows_list:
            return b""

        if fields is None:
            fields = list(rows_list[0].keys())

        buf = io.StringIO()
        writer = csv.DictWriter(buf, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows_list)
        return buf.getvalue().encode("utf-8-sig")  # BOM for Excel compat

    @staticmethod
    def to_json(rows: Iterable[Dict[str, Any]]) -> bytes:
        """Convert rows to pretty-printed JSON bytes."""
        return json.dumps(list(rows), indent=2, default=str).encode("utf-8")

    @staticmethod
    def to_excel(
        rows: Iterable[Dict[str, Any]],
        fields: Optional[List[str]] = None,
        sheet_name: str = "Export",
    ) -> bytes:
        """Convert rows to Excel .xlsx bytes."""
        if not XLSX_AVAILABLE:
            raise RuntimeError(
                "Install xlsxwriter or openpyxl for Excel export: "
                "pip install xlsxwriter"
            )

        rows_list = list(rows)
        if fields is None:
            fields = list(rows_list[0].keys()) if rows_list else []

        buf = io.BytesIO()

        try:
            import xlsxwriter as xw
            wb = xw.Workbook(buf, {"in_memory": True})
            ws = wb.add_worksheet(sheet_name[:31])
            header_fmt = wb.add_format({"bold": True, "bg_color": "#1E293B", "font_color": "#FFFFFF"})

            for col_idx, field in enumerate(fields):
                ws.write(0, col_idx, field, header_fmt)

            for row_idx, row in enumerate(rows_list, start=1):
                for col_idx, field in enumerate(fields):
                    ws.write(row_idx, col_idx, row.get(field, ""))

            wb.close()
        except ImportError:
            import openpyxl
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = sheet_name[:31]
            ws.append(fields)
            for row in rows_list:
                ws.append([row.get(f, "") for f in fields])
            wb.save(buf)

        return buf.getvalue()

    @staticmethod
    def export_queryset(
        queryset,
        format: str,
        fields: Optional[List[str]] = None,
    ) -> bytes:
        """
        Helper to export a Django queryset directly.
        format: 'csv' | 'excel' | 'json'
        """
        rows = list(queryset.values(*fields) if fields else queryset.values())
        if format == "csv":
            return ExportService.to_csv(rows, fields)
        elif format in ("excel", "xlsx"):
            return ExportService.to_excel(rows, fields)
        elif format == "json":
            return ExportService.to_json(rows)
        else:
            raise ValueError(f"Unsupported export format: {format}")
