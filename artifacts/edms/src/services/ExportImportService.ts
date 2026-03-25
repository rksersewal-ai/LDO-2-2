import type { WorkRecord } from '../lib/types';
import { MOCK_DOCUMENTS } from '../lib/mock';

export class ExportImportService {
  // ─── CSV Export ──────────────────────────────────────────────────────────
  
  static exportWorkRecordsCSV(records: WorkRecord[]): Blob {
    const headers = [
      'ID', 'Description', 'Category', 'Type', 'Status', 'Date', 
      'PL Number', 'eOffice Case', 'Drawing Number', 'Days Taken', 
      'Target Days', 'Assignee', 'Verified By', 'Remarks'
    ];
    
    const rows = records.map(r => [
      r.id,
      r.description,
      r.workCategory,
      r.workType,
      r.status,
      r.date,
      r.plNumber || '',
      r.eOfficeNumber || '',
      r.drawingNumber || '',
      r.daysTaken ?? '',
      r.targetDays ?? '',
      r.userName,
      r.verifiedBy || '',
      r.remarks || '',
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        const str = String(cell ?? '');
        return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(',')),
    ].join('\n');
    
    return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  }

  static exportDocumentsCSV(): Blob {
    const headers = ['ID', 'Name', 'Type', 'Status', 'Revision', 'Size', 'OCR Status', 'OCR Confidence'];
    
    const rows = MOCK_DOCUMENTS.map(d => [
      d.id,
      d.name,
      d.type,
      d.status,
      d.revision,
      d.size,
      d.ocrStatus || 'Pending',
      d.ocrConfidence ?? '',
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        const str = String(cell ?? '');
        return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(',')),
    ].join('\n');
    
    return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  }

  // ─── CSV Import ──────────────────────────────────────────────────────────
  
  static async parseCSV(file: File): Promise<Record<string, string>[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(l => l.trim());
          if (lines.length < 2) throw new Error('CSV must have header and at least one row');
          
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          const rows = lines.slice(1).map(line => {
            const values = this.parseCSVLine(line);
            const obj: Record<string, string> = {};
            headers.forEach((h, i) => { obj[h] = values[i] || ''; });
            return obj;
          });
          
          resolve(rows);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsText(file);
    });
  }

  private static parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  }

  // ─── Trigger Downloads ──────────────────────────────────────────────────
  
  static downloadFile(blob: Blob, filename: string) {
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
    const blob = this.exportWorkRecordsCSV(records);
    const date = new Date().toISOString().split('T')[0];
    this.downloadFile(blob, `work-records-${date}.csv`);
  }

  static downloadDocumentsCSV() {
    const blob = this.exportDocumentsCSV();
    const date = new Date().toISOString().split('T')[0];
    this.downloadFile(blob, `documents-${date}.csv`);
  }
}
