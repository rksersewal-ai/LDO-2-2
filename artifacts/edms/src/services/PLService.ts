import type { PLNumber, InspectionCategory, PLStatus } from '../lib/types';
import { PL_DATABASE } from '../lib/bomData';
import { MOCK_PL_RECORDS } from '../lib/mock';

function mapBomRecord(plNumber: string, r: typeof PL_DATABASE[string]): PLNumber {
  const catMap: Record<string, InspectionCategory> = {};
  const inspCat: InspectionCategory = r.safetyVital ? 'CAT-A' : 'CAT-C';

  const statusMap: Record<string, PLStatus> = {
    Production: 'ACTIVE',
    Active: 'ACTIVE',
    Prototyping: 'UNDER_REVIEW',
    'In Development': 'UNDER_REVIEW',
    'End of Life': 'OBSOLETE',
    Obsolete: 'OBSOLETE',
  };

  return {
    id: r.plNumber,
    plNumber: r.plNumber,
    name: r.name,
    description: r.description,
    category: inspCat,
    controllingAgency: 'CLW',
    status: statusMap[r.lifecycleState] ?? 'ACTIVE',
    safetyCritical: r.safetyVital,
    safetyClassification: r.safetyVital ? 'CRITICAL' : 'LOW',
    usedIn: r.whereUsed.map(w => w.parentPL),
    drawingNumbers: r.linkedDrawings.map(d => d.drawingId),
    specNumbers: [],
    designSupervisor: r.owner,
    engineeringChanges: r.changeHistory.map(c => ({
      id: c.changeId,
      ecNumber: c.changeId,
      status: c.status === 'Implemented' ? 'IMPLEMENTED' : c.status === 'Pending' ? 'IN_REVIEW' : 'OPEN',
      description: c.title,
      date: c.date,
      author: c.author,
    })),
    linkedDocumentIds: r.linkedDocuments.map(d => d.docId),
    linkedWorkIds: [],
    linkedCaseIds: [],
    recentActivity: r.changeHistory.slice(0, 3).map(c => `${c.type}: ${c.title} (${c.date})`),
    createdAt: r.createdDate,
    updatedAt: r.lastModified,
  };
}

function mapLegacyRecord(r: typeof MOCK_PL_RECORDS[0]): PLNumber {
  return {
    id: r.id,
    plNumber: r.id.replace('PL-', ''),
    name: r.title,
    description: r.description,
    category: 'CAT-C',
    controllingAgency: 'CLW',
    status: r.status === 'Active' ? 'ACTIVE' : r.status === 'Obsolete' ? 'OBSOLETE' : 'UNDER_REVIEW',
    safetyCritical: false,
    usedIn: [],
    drawingNumbers: [],
    specNumbers: [],
    designSupervisor: r.owner,
    engineeringChanges: [],
    linkedDocumentIds: r.linkedDocs ?? [],
    linkedWorkIds: [],
    linkedCaseIds: r.cases ?? [],
    createdAt: r.lastUpdated,
    updatedAt: r.lastUpdated,
  };
}

let _store: PLNumber[] = [
  ...Object.values(PL_DATABASE).map(r => mapBomRecord(r.plNumber, r)),
  ...MOCK_PL_RECORDS.map(mapLegacyRecord),
];

function generateId(): string {
  const seq = Math.floor(Math.random() * 90000000) + 10000000;
  return String(seq);
}

export const PLService = {
  getAll(): Promise<PLNumber[]> {
    return Promise.resolve([..._store]);
  },

  getById(id: string): Promise<PLNumber | null> {
    const normalized = id.replace('PL-', '');
    return Promise.resolve(
      _store.find(p => p.id === id || p.plNumber === normalized || p.plNumber === id) ?? null
    );
  },

  search(query: string): Promise<PLNumber[]> {
    const q = query.trim().toLowerCase();
    if (!q) return PLService.getAll();
    return Promise.resolve(
      _store.filter(p =>
        p.plNumber.includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.drawingNumbers.some(d => d.toLowerCase().includes(q)) ||
        p.specNumbers.some(s => s.toLowerCase().includes(q))
      )
    );
  },

  add(data: Omit<PLNumber, 'id' | 'createdAt' | 'updatedAt'>): Promise<PLNumber> {
    const now = new Date().toISOString().split('T')[0];
    const pl: PLNumber = {
      ...data,
      id: data.plNumber || generateId(),
      createdAt: now,
      updatedAt: now,
    };
    _store = [pl, ..._store];
    return Promise.resolve(pl);
  },

  update(id: string, patch: Partial<PLNumber>): Promise<PLNumber | null> {
    const normalized = id.replace('PL-', '');
    const idx = _store.findIndex(p => p.id === id || p.plNumber === normalized);
    if (idx < 0) return Promise.resolve(null);
    _store[idx] = { ..._store[idx], ...patch, updatedAt: new Date().toISOString().split('T')[0] };
    return Promise.resolve(_store[idx]);
  },

  delete(id: string): Promise<boolean> {
    const before = _store.length;
    _store = _store.filter(p => p.id !== id && p.plNumber !== id.replace('PL-', ''));
    return Promise.resolve(_store.length < before);
  },

  addEngineeringChange(plId: string, ec: { ecNumber: string; description: string; status: string; date: string; author?: string }): Promise<PLNumber | null> {
    return PLService.update(plId, {
      engineeringChanges: [
        ...((_store.find(p => p.id === plId || p.plNumber === plId.replace('PL-', ''))?.engineeringChanges) ?? []),
        {
          id: `EC-${Date.now()}`,
          ecNumber: ec.ecNumber,
          description: ec.description,
          status: ec.status as 'OPEN' | 'IN_REVIEW' | 'IMPLEMENTED' | 'RELEASED',
          date: ec.date,
          author: ec.author,
        },
      ],
    });
  },

  getLinkedDocuments(plId: string, allDocs: { id: string }[]): string[] {
    const pl = _store.find(p => p.id === plId || p.plNumber === plId.replace('PL-', ''));
    if (!pl) return [];
    return (pl.linkedDocumentIds ?? []).filter(docId => allDocs.some(d => d.id === docId));
  },
};
