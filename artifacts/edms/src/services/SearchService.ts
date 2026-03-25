import type { SearchResult } from '../lib/types';
export type { SearchResult };
import { DocumentService } from './DocumentService';
import { PLService } from './PLService';
import { WorkLedgerService } from './WorkLedgerService';
import { CaseService } from './CaseService';

export interface CrossEntityResults {
  documents: SearchResult[];
  plItems: SearchResult[];
  work: SearchResult[];
  cases: SearchResult[];
  total: number;
}

function contains(text: string | undefined | null, q: string): boolean {
  return Boolean(text?.toLowerCase().includes(q));
}

export const SearchService = {
  async searchAll(query: string, scope?: 'ALL' | 'DOCUMENTS' | 'PL' | 'WORK' | 'CASES'): Promise<CrossEntityResults> {
    const q = query.trim().toLowerCase();

    if (!q) {
      return { documents: [], plItems: [], work: [], cases: [], total: 0 };
    }

    const [docs, pls, works, cases] = await Promise.all([
      DocumentService.getAll(),
      PLService.getAll(),
      WorkLedgerService.getAll(),
      CaseService.getAll(),
    ]);

    const documents: SearchResult[] = (!scope || scope === 'ALL' || scope === 'DOCUMENTS')
      ? docs
          .filter(d =>
            contains(d.documentNumber, q) ||
            contains(d.title, q) ||
            d.tags.some(t => contains(t, q)) ||
            d.linkedPlNumbers.some(pl => contains(pl, q)) ||
            contains(d.ocrText, q) ||
            contains(d.agency, q)
          )
          .map(d => ({
            type: 'document' as const,
            id: d.id,
            title: d.title,
            subtitle: d.documentNumber,
            status: d.status,
            matchField: contains(d.ocrText, q) ? 'OCR Text' : contains(d.title, q) ? 'Title' : 'Metadata',
            snippet: d.ocrText?.includes(q)
              ? `...${d.ocrText.substring(Math.max(0, d.ocrText.toLowerCase().indexOf(q) - 40), d.ocrText.toLowerCase().indexOf(q) + 80)}...`
              : undefined,
          }))
      : [];

    const plItems: SearchResult[] = (!scope || scope === 'ALL' || scope === 'PL')
      ? pls
          .filter(p =>
            contains(p.plNumber, q) ||
            contains(p.name, q) ||
            contains(p.description, q) ||
            p.drawingNumbers.some(d => contains(d, q)) ||
            p.specNumbers.some(s => contains(s, q))
          )
          .map(p => ({
            type: 'pl' as const,
            id: p.id,
            title: p.name,
            subtitle: p.plNumber,
            status: p.status,
            matchField: contains(p.plNumber, q) ? 'PL Number' : 'Description',
          }))
      : [];

    const work: SearchResult[] = (!scope || scope === 'ALL' || scope === 'WORK')
      ? works
          .filter(w =>
            contains(w.id, q) ||
            contains(w.workType, q) ||
            contains(w.referenceNumber, q) ||
            contains(w.description, q) ||
            contains(w.plNumber, q) ||
            contains(w.eOfficeNumber, q) ||
            contains(w.userName, q)
          )
          .map(w => ({
            type: 'work' as const,
            id: w.id,
            title: w.description,
            subtitle: w.id,
            status: w.status,
            matchField: contains(w.id, q) ? 'Work ID' : contains(w.plNumber, q) ? 'PL Number' : 'Description',
          }))
      : [];

    const casesResults: SearchResult[] = (!scope || scope === 'ALL' || scope === 'CASES')
      ? cases
          .filter(c =>
            contains(c.caseNumber, q) ||
            contains(c.title, q) ||
            contains(c.plNumber, q) ||
            contains(c.type, q) ||
            contains(c.vendorName, q) ||
            contains(c.tenderNumber, q)
          )
          .map(c => ({
            type: 'case' as const,
            id: c.id,
            title: c.title,
            subtitle: c.caseNumber,
            status: c.status,
            matchField: contains(c.caseNumber, q) ? 'Case Number' : 'Title',
          }))
      : [];

    return {
      documents,
      plItems,
      work,
      cases: casesResults,
      total: documents.length + plItems.length + work.length + casesResults.length,
    };
  },
};
