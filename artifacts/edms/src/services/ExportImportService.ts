import * as XLSX from 'xlsx';
import type { WorkRecord } from '../lib/types';
import { MOCK_DOCUMENTS } from '../lib/mock';

export class ExportImportService {
  // ─── Work Records ─────────────────────────────────────────────────────────

  static exportWorkRecordsCSV(records: WorkRecord[]): Blob {
    const headers = ['ID', 'Description', 'Category', 'Type', 'Status', 'Date', 'PL Number', 'eOffice Case', 'Drawing Number', 'Days Taken', 'Target Days', 'Assignee', 'Verified By', 'Remarks'];
    const rows = records.map(r => [r.id, r.description, r.workCategory, r.workType, r.status, r.date, r.plNumber || '', r.eOfficeNumber || '', r.drawingNumber || '', r.daysTaken ?? '', r.targetDays ?? '', r.userName, r.verifiedBy || '', r.remarks || '']);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const csv = XLSX.utils.sheet_to_csv(ws);
    return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  }

  static exportWorkRecordsExcel(records: WorkRecord[]) {
    const headers = ['ID', 'Description', 'Category', 'Type', 'Status', 'Date', 'PL Number', 'eOffice Case', 'Drawing Number', 'Days Taken', 'Target Days', 'Assignee', 'Verified By', 'Remarks'];
    const rows = records.map(r => [r.id, r.description, r.workCategory, r.workType, r.status, r.date, r.plNumber || '', r.eOfficeNumber || '', r.drawingNumber || '', r.daysTaken ?? '', r.targetDays ?? '', r.userName, r.verifiedBy || '', r.remarks || '']);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = headers.map((_, i) => ({ wch: i === 1 ? 40 : 18 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Work Records');
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `work-records-${date}.xlsx`);
  }

  // ─── Documents ────────────────────────────────────────────────────────────

  static exportDocumentsCSV(): Blob {
    const headers = ['ID', 'Name', 'Type', 'Status', 'Revision', 'Size', 'OCR Status', 'OCR Confidence'];
    const rows = MOCK_DOCUMENTS.map(d => [d.id, d.name, d.type, d.status, d.revision, d.size, d.ocrStatus || 'Pending', d.ocrConfidence ?? '']);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const csv = XLSX.utils.sheet_to_csv(ws);
    return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  }

  static exportDocumentsExcel() {
    const headers = ['ID', 'Name', 'Type', 'Status', 'Revision', 'Size', 'OCR Status', 'OCR Confidence'];
    const rows = MOCK_DOCUMENTS.map(d => [d.id, d.name, d.type, d.status, d.revision, d.size, d.ocrStatus || 'Pending', d.ocrConfidence ?? '']);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = headers.map((_, i) => ({ wch: i === 1 ? 45 : 16 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Documents');
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `documents-${date}.xlsx`);
  }

  // ─── Import ───────────────────────────────────────────────────────────────

  static async parseCSVFile(file: File): Promise<Record<string, string>[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });
          resolve(rows);
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  static mapRowToWorkRecord(row: Record<string, string>, userId: string, userName: string): Partial<WorkRecord> {
    return {
      description: row['Description'] || row['description'] || '',
      workCategory: (row['Category'] || row['category'] || 'MAINTENANCE') as WorkRecord['workCategory'],
      workType: row['Type'] || row['type'] || '',
      status: (row['Status'] || row['status'] || 'OPEN') as WorkRecord['status'],
      date: row['Date'] || row['date'] || new Date().toISOString().split('T')[0],
      plNumber: row['PL Number'] || row['plNumber'] || '',
      eOfficeNumber: row['eOffice Case'] || row['eOfficeNumber'] || '',
      drawingNumber: row['Drawing Number'] || row['drawingNumber'] || '',
      remarks: row['Remarks'] || row['remarks'] || '',
      userId,
      userName,
    };
  }

  // ─── Utility ──────────────────────────────────────────────────────────────

  static downloadBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  static downloadWorkRecordsCSV(records: WorkRecord[]) {
    const date = new Date().toISOString().split('T')[0];
    this.downloadBlob(this.exportWorkRecordsCSV(records), `work-records-${date}.csv`);
  }

  static downloadDocumentsCSV() {
    const date = new Date().toISOString().split('T')[0];
    this.downloadBlob(this.exportDocumentsCSV(), `documents-${date}.csv`);
  }

  static getImportTemplate(): Blob {
    const headers = ['Description', 'Category', 'Type', 'Status', 'Date', 'PL Number', 'eOffice Case', 'Drawing Number', 'Remarks'];
    const example = ['Replace traction motor brush gear', 'MAINTENANCE', 'Scheduled PM', 'OPEN', new Date().toISOString().split('T')[0], 'PL-2026-001', 'EOC-2026-001', 'DWG-2026-001', 'Routine maintenance'];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    ws['!cols'] = headers.map(() => ({ wch: 22 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
}
