import type { CaseRecord, CaseStatus, CaseSeverity } from '../lib/types';
import { MOCK_CASES } from '../lib/mockExtended';

function mapMockCase(c: typeof MOCK_CASES[0]): CaseRecord {
  const statusMap: Record<string, CaseStatus> = {
    Open: 'OPEN',
    'In Progress': 'IN_PROGRESS',
    Closed: 'CLOSED',
  };

  const severityMap: Record<string, CaseSeverity> = {
    High: 'HIGH',
    Medium: 'MEDIUM',
    Low: 'LOW',
    Critical: 'CRITICAL',
  };

  return {
    id: c.id,
    caseNumber: c.id,
    title: c.title,
    description: c.description ?? '',
    status: statusMap[c.status] ?? 'OPEN',
    severity: severityMap[c.severity] ?? 'MEDIUM',
    plNumber: c.linkedPL,
    linkedDocumentIds: c.linkedDocs ?? [],
    linkedWorkIds: [],
    assignee: c.assignee,
    type: 'Discrepancy',
    createdAt: c.created,
    updatedAt: c.updated,
  };
}

let _store: CaseRecord[] = MOCK_CASES.map(mapMockCase);

function generateId(): string {
  const seq = Math.floor(Math.random() * 9000) + 1000;
  return `CAS-${seq}`;
}

export const CaseService = {
  getAll(): Promise<CaseRecord[]> {
    return Promise.resolve([..._store]);
  },

  getById(id: string): Promise<CaseRecord | null> {
    return Promise.resolve(_store.find(c => c.id === id || c.caseNumber === id) ?? null);
  },

  add(data: Omit<CaseRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<CaseRecord> {
    const now = new Date().toISOString().split('T')[0];
    const newId = generateId();
    const c: CaseRecord = {
      ...data,
      id: newId,
      caseNumber: newId,
      createdAt: now,
      updatedAt: now,
    };
    _store = [c, ..._store];
    return Promise.resolve(c);
  },

  update(id: string, patch: Partial<CaseRecord>): Promise<CaseRecord | null> {
    const idx = _store.findIndex(c => c.id === id || c.caseNumber === id);
    if (idx < 0) return Promise.resolve(null);
    _store[idx] = { ..._store[idx], ...patch, updatedAt: new Date().toISOString().split('T')[0] };
    return Promise.resolve(_store[idx]);
  },

  delete(id: string): Promise<boolean> {
    const before = _store.length;
    _store = _store.filter(c => c.id !== id && c.caseNumber !== id);
    return Promise.resolve(_store.length < before);
  },

  search(query: string): Promise<CaseRecord[]> {
    const q = query.trim().toLowerCase();
    if (!q) return CaseService.getAll();
    return Promise.resolve(
      _store.filter(c =>
        c.caseNumber.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        (c.plNumber?.toLowerCase().includes(q) ?? false) ||
        (c.type?.toLowerCase().includes(q) ?? false) ||
        (c.vendorName?.toLowerCase().includes(q) ?? false) ||
        (c.tenderNumber?.toLowerCase().includes(q) ?? false) ||
        c.assignee.toLowerCase().includes(q)
      )
    );
  },
};
