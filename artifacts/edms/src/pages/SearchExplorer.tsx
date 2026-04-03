import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Search, FileText, Database, Briefcase, AlertTriangle,
  ArrowRight, Layers, Hash, Clock, Sparkles, Command,
  ScanText, CheckCircle, AlertCircle, ChevronRight,
  Bookmark, BookmarkCheck, Trash2, SlidersHorizontal, X,
} from 'lucide-react';
import { GlassCard } from '../components/ui/Shared';
import { useAbortController } from '../hooks/useAbortOnNavigate';
import { useDebounce } from '../hooks/useOverloadProtection';
import { SearchService } from '../services/SearchService';
import type { CrossEntityResults, DuplicateSearchFilter, SearchResult } from '../services/SearchService';
import { SearchHistoryService } from '../services/SearchHistoryService';
import { LoadingState } from '../components/ui/LoadingState';
import { DocumentPreviewButton, getDocumentContextAttributes } from '../components/documents/DocumentPreviewActions';

const SAVED_KEY = 'edms_saved_searches';

const RECENT_KEY = 'edms_recent_searches';
const SCOPE_OPTIONS = ['ALL', 'DOCUMENTS', 'PL', 'WORK', 'CASES'] as const;
type Scope = typeof SCOPE_OPTIONS[number];

const SCOPE_LABELS: Record<Scope, string> = {
  ALL: 'All',
  DOCUMENTS: 'Documents',
  PL: 'PL Items',
  WORK: 'Work Records',
  CASES: 'Cases',
};

const EXAMPLE_QUERIES = [
  'traction motor insulation',
  'WAP7 bogie frame',
  '38110000',
  'pantograph DSA380',
  'wiring harness 25kV',
  'brake failure',
];

function highlightSnippet(text: string, query: string) {
  if (!text || !query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return text;
  const pre = text.slice(0, idx);
  const match = text.slice(idx, idx + query.length);
  const post = text.slice(idx + query.length);
  return (
    <span>
      {pre}
      <mark className="bg-teal-500/25 text-primary/90 rounded px-0.5">{match}</mark>
      {post}
    </span>
  );
}

function statusColor(status: string): string {
  const s = status?.toUpperCase();
  if (['ACTIVE', 'APPROVED', 'VERIFIED', 'CLOSED'].includes(s)) return 'text-emerald-400';
  if (['DRAFT', 'OPEN', 'UNDER_REVIEW', 'IN_PROGRESS', 'SUBMITTED'].includes(s)) return 'text-amber-400';
  if (['OBSOLETE', 'FAILED', 'OVERDUE'].includes(s)) return 'text-rose-400';
  return 'text-muted-foreground';
}

function statusDot(status: string): string {
  const s = status?.toUpperCase();
  if (['ACTIVE', 'APPROVED', 'VERIFIED', 'CLOSED'].includes(s)) return 'bg-emerald-500';
  if (['DRAFT', 'OPEN', 'UNDER_REVIEW', 'IN_PROGRESS', 'SUBMITTED'].includes(s)) return 'bg-amber-500';
  if (['OBSOLETE', 'FAILED', 'OVERDUE'].includes(s)) return 'bg-rose-500';
  return 'bg-slate-500';
}

function humanizeKey(value: string) {
  return value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function reasonLabel(reason: string) {
  switch (reason) {
    case 'approved_assertion':
      return 'Approved assertion';
    case 'extracted_entity':
      return 'Extracted entity';
    default:
      return humanizeKey(reason);
  }
}

function getEntityPath(result: SearchResult): string {
  switch (result.type) {
    case 'document': return `/documents/${result.id}`;
    case 'pl': return `/pl/${result.id}`;
    case 'work': return `/ledger`;
    case 'case': return `/cases`;
    default: return '/';
  }
}

interface ResultCardProps {
  result: SearchResult;
  query: string;
  onClick: () => void;
}

function ResultCard({ result, query, onClick }: ResultCardProps) {
  const icons: Record<string, React.ReactNode> = {
    document: <FileText className="w-4 h-4 text-blue-400" />,
    pl: <Database className="w-4 h-4 text-indigo-400" />,
    work: <Briefcase className="w-4 h-4 text-amber-400" />,
    case: <AlertTriangle className="w-4 h-4 text-rose-400" />,
  };

  const typeLabels: Record<string, string> = {
    document: 'Document',
    pl: 'PL Item',
    work: 'Work Record',
    case: 'Case',
  };

  const typeBg: Record<string, string> = {
    document: 'bg-blue-500/10 border-blue-500/20',
    pl: 'bg-indigo-500/10 border-indigo-500/20',
    work: 'bg-amber-500/10 border-amber-500/20',
    case: 'bg-rose-500/10 border-rose-500/20',
  };

  const duplicateMeta =
    result.type === 'document' && result.duplicateStatus
      ? result.duplicateStatus === 'DUPLICATE'
        ? { label: 'Duplicate', className: 'border-amber-500/30 bg-amber-500/10 text-amber-300' }
        : result.duplicateStatus === 'MASTER'
          ? { label: 'Master copy', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' }
          : null
      : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      {...(result.type === 'document' ? getDocumentContextAttributes(result.id, result.title) : {})}
      className="w-full text-left p-4 rounded-xl bg-secondary/30 border border-border/40 hover:border-teal-500/30 hover:bg-secondary/60 transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${typeBg[result.type]}`}>
          {icons[result.type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-sm font-semibold text-foreground group-hover:text-primary/90 transition-colors truncate">
              {highlightSnippet(result.title, query)}
            </span>
            {result.status && (
              <span className={`flex items-center gap-1 text-[10px] font-medium ${statusColor(result.status)}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusDot(result.status)}`} />
                {result.status}
              </span>
            )}
            {duplicateMeta && (
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${duplicateMeta.className}`}>
                {duplicateMeta.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span className="text-slate-600">{typeLabels[result.type]}</span>
            {result.subtitle && (
              <>
                <span className="text-slate-700">·</span>
                <span className="font-mono text-primary/70">{result.subtitle}</span>
              </>
            )}
            {result.matchField && (
              <>
                <span className="text-slate-700">·</span>
                <span className="flex items-center gap-0.5">
                  {result.matchField === 'OCR Text' && <ScanText className="w-3 h-3 text-violet-400" />}
                  <span className="text-muted-foreground">{result.matchField}</span>
                </span>
              </>
            )}
          </div>
          {result.snippet && (
            <p className="text-xs text-muted-foreground leading-relaxed bg-card/40 rounded-lg px-3 py-2 border border-border/30 font-mono mt-1">
              {highlightSnippet(result.snippet, query)}
            </p>
          )}
          {result.type === 'document' && ((result.matchedAssertions?.length ?? 0) > 0 || (result.matchedEntities?.length ?? 0) > 0 || (result.matchReasons?.length ?? 0) > 0) && (
            <div className="mt-2 space-y-2">
              {(result.matchReasons?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {result.matchReasons?.map((reason) => (
                    <span
                      key={reason}
                      className="rounded-full border border-teal-500/20 bg-teal-500/10 px-2 py-0.5 text-[10px] font-semibold text-teal-200"
                    >
                      {reasonLabel(reason)}
                    </span>
                  ))}
                </div>
              )}
              {(result.matchedAssertions?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {result.matchedAssertions?.slice(0, 3).map((assertion) => (
                    <span
                      key={`${assertion.field_key}-${assertion.normalized_value ?? assertion.value}`}
                      className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[10px] text-indigo-100"
                    >
                      <span className="font-semibold">{humanizeKey(assertion.field_key)}:</span> {assertion.value}
                    </span>
                  ))}
                </div>
              )}
              {(result.matchedEntities?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {result.matchedEntities?.slice(0, 3).map((entity) => (
                    <span
                      key={`${entity.entity_type}-${entity.normalized_value ?? entity.value}`}
                      className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-100"
                    >
                      <span className="font-semibold">{humanizeKey(entity.entity_type)}:</span> {entity.value}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="mt-1 flex items-center gap-1.5 shrink-0">
          {result.type === 'document' && (
            <DocumentPreviewButton
              documentId={result.id}
              title={result.title}
              iconOnly
              className="h-8 min-h-0 px-2 text-foreground/90 hover:text-teal-200"
            />
          )}
          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-primary transition-colors" />
        </div>
      </div>
    </div>
  );
}

interface ResultGroupProps {
  title: string;
  icon: React.ReactNode;
  results: SearchResult[];
  query: string;
  onNavigate: (path: string) => void;
}

function ResultGroup({ title, icon, results, query, onNavigate }: ResultGroupProps) {
  if (results.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        {icon}
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</span>
        <span className="text-xs text-slate-600 font-mono ml-1">{results.length}</span>
      </div>
      <div className="space-y-2">
        {results.map(r => (
          <ResultCard
            key={`${r.type}-${r.id}`}
            result={r}
            query={query}
            onClick={() => onNavigate(getEntityPath(r))}
          />
        ))}
      </div>
    </div>
  );
}

export default function SearchExplorer() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { reset: resetSearchAbort, abort: abortSearch } = useAbortController();

  const initialQuery = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebounce(query, 250);
  const [scope, setScope] = useState<Scope>('ALL');
  const [results, setResults] = useState<CrossEntityResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); } catch { return []; }
  });
  const [savedSearches, setSavedSearches] = useState<{ q: string; scope: Scope; label: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]'); } catch { return []; }
  });
  const [inputFocused, setInputFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set());
  const [dateFilter, setDateFilter] = useState<'any' | '7d' | '30d' | '90d'>('any');
  const [entityFilters, setEntityFilters] = useState<Set<string>>(new Set());
  const [duplicateFilter, setDuplicateFilter] = useState<DuplicateSearchFilter>('include');
  const [sourceFilter, setSourceFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [hashStatusFilter, setHashStatusFilter] = useState<'' | 'present' | 'full' | 'missing'>('');
  const [plLinkedFilter, setPlLinkedFilter] = useState<'' | 'linked' | 'unlinked'>('');

  const isSaved = savedSearches.some(s => s.q === debouncedQuery && s.scope === scope);

  const saveSearch = () => {
    if (!debouncedQuery.trim() || isSaved) return;
    const entry = { q: debouncedQuery, scope, label: `${debouncedQuery}${scope !== 'ALL' ? ` (${SCOPE_LABELS[scope]})` : ''}` };
    const updated = [entry, ...savedSearches].slice(0, 12);
    setSavedSearches(updated);
    localStorage.setItem(SAVED_KEY, JSON.stringify(updated));
  };

  const deleteSaved = (idx: number) => {
    const updated = savedSearches.filter((_, i) => i !== idx);
    setSavedSearches(updated);
    localStorage.setItem(SAVED_KEY, JSON.stringify(updated));
  };

  const inputRef = useRef<HTMLInputElement>(null);
  const prevUrlQ = useRef(initialQuery);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Sync query state when navigated externally (e.g., header Enter → /search?q=...)
  useEffect(() => {
    const urlQ = searchParams.get('q') ?? '';
    if (urlQ !== prevUrlQ.current) {
      prevUrlQ.current = urlQ;
      setQuery(urlQ);
    }
  }, [searchParams]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const signal = resetSearchAbort();
    const s = scope === 'ALL' ? 'ALL' : scope;
    SearchService.searchAll(debouncedQuery, s, signal, {
      duplicateFilter,
      source: sourceFilter || undefined,
      className: classFilter || undefined,
      hashStatus: hashStatusFilter || undefined,
      plLinked: plLinkedFilter || undefined,
      statusFilters: Array.from(statusFilters),
      dateRange: dateFilter,
    })
      .then(r => {
        setResults(r);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (
          (err instanceof DOMException && err.name === 'AbortError') ||
          (typeof err === 'object' && err !== null && 'code' in err && err.code === 'ERR_CANCELED')
        ) {
          return;
        }

        setResults(null);
        setLoading(false);
        setError(err instanceof Error ? err.message : 'Search request failed');
      });

    return () => abortSearch();
  }, [abortSearch, classFilter, dateFilter, debouncedQuery, duplicateFilter, hashStatusFilter, plLinkedFilter, resetSearchAbort, scope, sourceFilter, statusFilters]);
  

  useEffect(() => {
    const q = debouncedQuery.trim() ? debouncedQuery : '';
    prevUrlQ.current = q;
    if (q) {
      setSearchParams({ q }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [debouncedQuery, setSearchParams]);

  const handleNavigate = useCallback((path: string) => {
    const q = debouncedQuery.trim();
    if (q && !recentSearches.includes(q)) {
      const updated = [q, ...recentSearches].slice(0, 8);
      setRecentSearches(updated);
      localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    }
    if (q) SearchHistoryService.addSearch(q, scope, results?.total ?? 0);
    navigate(path);
  }, [navigate, debouncedQuery, recentSearches, scope, results]);

  const scopeCounts: Record<Scope, number> = {
    ALL: results?.total ?? 0,
    DOCUMENTS: results?.documents.length ?? 0,
    PL: results?.plItems.length ?? 0,
    WORK: results?.work.length ?? 0,
    CASES: results?.cases.length ?? 0,
  };

  // Entity type still filters locally because it only reshapes already-fetched buckets.
  const matchesFilters = (result: SearchResult) => {
    if (entityFilters.size > 0 && !entityFilters.has(result.type)) return false;
    return true;
  };

  // Filter results based on active filters
  const filteredResults = results ? {
    ...results,
    documents: results.documents.filter(matchesFilters),
    plItems: results.plItems.filter(matchesFilters),
    work: results.work.filter(matchesFilters),
    cases: results.cases.filter(matchesFilters),
    total: (results.documents.filter(matchesFilters).length + 
            results.plItems.filter(matchesFilters).length + 
            results.work.filter(matchesFilters).length + 
            results.cases.filter(matchesFilters).length),
  } : null;

  const duplicateFacetCounts = filteredResults
    ? filteredResults.documents.reduce(
        (accumulator, result) => {
          if (result.duplicateStatus === 'DUPLICATE') accumulator.duplicates += 1;
          if (result.duplicateStatus === 'MASTER') accumulator.masters += 1;
          if (!result.duplicateStatus || result.duplicateStatus === 'UNIQUE') accumulator.unique += 1;
          return accumulator;
        },
        { duplicates: 0, masters: 0, unique: 0 }
      )
    : { duplicates: 0, masters: 0, unique: 0 };

  const hasActiveFilters =
    statusFilters.size > 0 ||
    dateFilter !== 'any' ||
    entityFilters.size > 0 ||
    duplicateFilter !== 'include' ||
    Boolean(sourceFilter || classFilter || hashStatusFilter || plLinkedFilter);

  const documentFacets = results?.facets ?? {
    source_system: [],
    category: [],
    duplicate_status: [],
    ocr_status: [],
    hash_status: [],
    pl_linked: [],
  };

  const hasResults = results && results.total > 0;
  const hasQuery = debouncedQuery.trim().length > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-white">Search Explorer</h1>
        </div>
        <p className="text-muted-foreground text-sm pl-11">
          Full-text search across documents, PL records, work entries, and cases — including OCR-extracted text.
        </p>
      </div>

      {/* Filter Panel */}
      {showFilters && hasQuery && (
        <GlassCard className="p-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-white">Refine Results</h3>
            </div>
            <button onClick={() => setShowFilters(false)} className="text-muted-foreground hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          
          {/* Status Filter */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</p>
            <div className="flex flex-wrap gap-2">
              {['Approved', 'In Progress', 'Draft', 'Verified', 'Closed', 'Obsolete'].map(status => (
                <button
                  key={status}
                  onClick={() => {
                    const next = new Set(statusFilters);
                    if (next.has(status)) next.delete(status);
                    else next.add(status);
                    setStatusFilters(next);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    statusFilters.has(status)
                      ? 'bg-teal-500/20 border-teal-500/40 text-primary/90'
                      : 'bg-secondary/40 border-border/40 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Date Filter */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date Range</p>
            <div className="flex flex-wrap gap-2">
              {[
                { val: 'any' as const, label: 'Any Time' },
                { val: '7d' as const, label: 'Last 7 Days' },
                { val: '30d' as const, label: 'Last 30 Days' },
                { val: '90d' as const, label: 'Last 90 Days' },
              ].map(d => (
                <button
                  key={d.val}
                  onClick={() => setDateFilter(d.val)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    dateFilter === d.val
                      ? 'bg-teal-500/20 border-teal-500/40 text-primary/90'
                      : 'bg-secondary/40 border-border/40 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Entity Type Filter */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</p>
            <div className="flex flex-wrap gap-2">
              {[
                { val: 'document' as const, label: 'Documents' },
                { val: 'pl' as const, label: 'PL Items' },
                { val: 'work' as const, label: 'Work Records' },
                { val: 'case' as const, label: 'Cases' },
              ].map(type => (
                <button
                  key={type.val}
                  onClick={() => {
                    const next = new Set(entityFilters);
                    if (next.has(type.val)) next.delete(type.val);
                    else next.add(type.val);
                    setEntityFilters(next);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    entityFilters.has(type.val)
                      ? 'bg-teal-500/20 border-teal-500/40 text-primary/90'
                      : 'bg-secondary/40 border-border/40 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duplicate Filter */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Duplicate-Aware Documents</p>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'include' as const, label: 'Include all docs' },
                { value: 'exclude' as const, label: 'Hide duplicates' },
                { value: 'only' as const, label: 'Duplicates only' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setDuplicateFilter(option.value)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    duplicateFilter === option.value
                      ? 'bg-teal-500/20 border-teal-500/40 text-primary/90'
                      : 'bg-secondary/40 border-border/40 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Uses the backend duplicate index when available so duplicate-heavy searches stay local to PostgreSQL.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Source system</span>
              <select
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value)}
                className="w-full rounded-lg border border-border/40 bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-teal-500/40"
              >
                <option value="">All sources</option>
                {documentFacets.source_system.map((bucket) => {
                  const value = bucket.source_system ?? bucket.value ?? '';
                  if (!value) return null;
                  return (
                    <option key={value} value={value}>
                      {value} ({bucket.count})
                    </option>
                  );
                })}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Document class</span>
              <select
                value={classFilter}
                onChange={(event) => setClassFilter(event.target.value)}
                className="w-full rounded-lg border border-border/40 bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-teal-500/40"
              >
                <option value="">All classes</option>
                {documentFacets.category.map((bucket) => {
                  const value = bucket.category ?? bucket.value ?? '';
                  if (!value) return null;
                  return (
                    <option key={value} value={value}>
                      {value} ({bucket.count})
                    </option>
                  );
                })}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hash status</span>
              <select
                value={hashStatusFilter}
                onChange={(event) => setHashStatusFilter(event.target.value as '' | 'present' | 'full' | 'missing')}
                className="w-full rounded-lg border border-border/40 bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-teal-500/40"
              >
                <option value="">Any hash state</option>
                {documentFacets.hash_status.map((bucket) => {
                  const value = bucket.hash_state ?? bucket.value ?? '';
                  if (!value) return null;
                  return (
                    <option key={value} value={value}>
                      {value} ({bucket.count})
                    </option>
                  );
                })}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">PL linkage</span>
              <select
                value={plLinkedFilter}
                onChange={(event) => setPlLinkedFilter(event.target.value as '' | 'linked' | 'unlinked')}
                className="w-full rounded-lg border border-border/40 bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-teal-500/40"
              >
                <option value="">All linkage states</option>
                {documentFacets.pl_linked.map((bucket) => {
                  const value = bucket.value ?? '';
                  if (!value) return null;
                  return (
                    <option key={value} value={value}>
                      {value} ({bucket.count})
                    </option>
                  );
                })}
              </select>
            </label>
          </div>

          {hasActiveFilters && (
            <button
              onClick={() => {
                setStatusFilters(new Set());
                setDateFilter('any');
                setEntityFilters(new Set());
                setDuplicateFilter('include');
                setSourceFilter('');
                setClassFilter('');
                setHashStatusFilter('');
                setPlLinkedFilter('');
              }}
              className="text-xs text-primary hover:text-primary/90 mt-2"
            >
              Clear all filters
            </button>
          )}
        </GlassCard>
      )}

      {/* Search Input */}
      <GlassCard className="p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary pointer-events-none" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setTimeout(() => setInputFocused(false), 150)}
            placeholder="Search documents, PLs, OCR text, work records, cases..."
            className="w-full pl-12 pr-20 py-3.5 text-sm bg-card border border-border focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 rounded-xl text-foreground placeholder-slate-600 outline-none transition-all"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults(null); setSearchParams({}, { replace: true }); }}
              className="absolute right-14 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground/90 text-xs px-2 py-1 rounded-lg hover:bg-slate-700/50 transition-colors"
            >
              Clear
            </button>
          )}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-slate-600 text-xs border border-border rounded px-1.5 py-0.5 pointer-events-none">
            <Command className="w-3 h-3" />K
          </div>

          {/* Saved & Recent Searches Dropdown */}
          {inputFocused && !query && (savedSearches.length > 0 || recentSearches.length > 0) && (
            <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-card/95 backdrop-blur-xl border border-white/8 rounded-xl shadow-2xl shadow-black/60 overflow-hidden">
              {savedSearches.length > 0 && (
                <div className="p-2">
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">Saved</p>
                  {savedSearches.slice(0, 5).map((s, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg hover:bg-slate-700/50 group transition-colors">
                      <button
                        onMouseDown={() => { setQuery(s.q); setScope(s.scope); setInputFocused(false); }}
                        className="flex-1 flex items-center gap-2 px-2 py-2 text-left"
                      >
                        <BookmarkCheck className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <span className="text-sm text-foreground/90 truncate">{s.label}</span>
                      </button>
                      <button
                        onMouseDown={() => deleteSaved(i)}
                        className="mr-2 w-5 h-5 flex items-center justify-center text-slate-700 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {recentSearches.length > 0 && (
                <div className={`p-2 ${savedSearches.length > 0 ? 'border-t border-border' : ''}`}>
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">Recent</p>
                  {recentSearches.slice(0, 5).map((s, i) => (
                    <button
                      key={i}
                      onMouseDown={() => { setQuery(s); setInputFocused(false); }}
                      className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-700/50 text-left transition-colors"
                    >
                      <Clock className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{s}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Smart Autocomplete Suggestions while typing */}
          {inputFocused && query.length >= 2 && (() => {
            const suggestions = recentSearches.filter(s => s.toLowerCase().includes(query.toLowerCase()) && s !== query).slice(0, 5);
            const historySuggestions = SearchHistoryService.getSuggestions(query, scope).filter(h => !suggestions.includes(h.query)).slice(0, 3);
            if (suggestions.length === 0 && historySuggestions.length === 0) return null;
            return (
              <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-card/95 backdrop-blur-xl border border-white/8 rounded-xl shadow-2xl shadow-black/60 overflow-hidden">
                <div className="p-2">
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">Suggestions</p>
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onMouseDown={() => { setQuery(s); setInputFocused(false); }}
                      className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-700/50 text-left transition-colors"
                    >
                      <Search className="w-3.5 h-3.5 text-primary/60 flex-shrink-0" />
                      <span className="text-sm text-foreground/90">{s}</span>
                    </button>
                  ))}
                  {historySuggestions.map((h, i) => (
                    <button
                      key={`h-${i}`}
                      onMouseDown={() => { setQuery(h.query); setInputFocused(false); }}
                      className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-700/50 text-left transition-colors"
                    >
                      <Clock className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{h.query}</span>
                      {h.count != null && h.count > 0 && <span className="ml-auto text-[10px] text-slate-600">{h.count} results</span>}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Scope Tabs + Filter Button */}
        {hasQuery && (
          <div className="flex gap-1 mt-3 border-t border-border/40 pt-3 overflow-x-auto pb-0.5 items-center">
            {SCOPE_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  scope === s
                    ? 'bg-teal-500/15 text-primary/90 border border-teal-500/30'
                    : 'text-muted-foreground hover:text-foreground/90 hover:bg-slate-700/40'
                }`}
              >
                {SCOPE_LABELS[s]}
                {hasResults && scopeCounts[s] > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    scope === s ? 'bg-teal-500/20 text-primary/90' : 'bg-slate-700 text-muted-foreground'
                  }`}>
                    {scopeCounts[s]}
                  </span>
                )}
              </button>
            ))}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`ml-auto flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                showFilters || hasActiveFilters
                  ? 'bg-teal-500/15 text-primary/90 border border-teal-500/30'
                  : 'text-muted-foreground hover:text-foreground/90 hover:bg-slate-700/40'
              }`}
              title="Filters"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-teal-400" />
              )}
            </button>
          </div>
        )}
      </GlassCard>

      {/* Loading */}
      {loading && <LoadingState message="Searching all records..." size="sm" />}

      {!loading && error && (
        <GlassCard className="p-6 border border-rose-500/20 bg-rose-950/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-rose-300">Search unavailable</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Results */}
      {!loading && !error && hasResults && filteredResults && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="flex items-center gap-2 px-1">
            <CheckCircle className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground text-sm">
              Found <span className="text-primary/90 font-semibold">{filteredResults.total}</span> {hasActiveFilters && <span className="text-muted-foreground">filtered </span>}results for{' '}
              <span className="text-white font-semibold">"{debouncedQuery}"</span>
              {hasActiveFilters && <span className="text-muted-foreground ml-1">({results.total} total)</span>}
            </span>
            <button
              onClick={saveSearch}
              disabled={isSaved}
              title={isSaved ? 'Already saved' : 'Save this search'}
              className={`ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                isSaved
                  ? 'bg-teal-500/10 border-teal-500/30 text-primary cursor-default'
                  : 'bg-secondary/60 border-border text-muted-foreground hover:text-primary/90 hover:border-teal-500/30'
              }`}
            >
              {isSaved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
              {isSaved ? 'Saved' : 'Save Search'}
            </button>
          </div>

          {filteredResults.documents.length > 0 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <GlassCard className="p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Duplicate docs</p>
                <p className="mt-2 text-2xl font-bold text-amber-300">{duplicateFacetCounts.duplicates}</p>
                <p className="mt-1 text-xs text-muted-foreground">Candidates already marked as duplicate records.</p>
              </GlassCard>
              <GlassCard className="p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Master copies</p>
                <p className="mt-2 text-2xl font-bold text-emerald-300">{duplicateFacetCounts.masters}</p>
                <p className="mt-1 text-xs text-muted-foreground">Active masters currently backing duplicate families.</p>
              </GlassCard>
              <GlassCard className="p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Duplicate mode</p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {duplicateFilter === 'include'
                    ? 'All documents'
                    : duplicateFilter === 'exclude'
                      ? 'Duplicates hidden'
                      : 'Duplicates only'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Applied directly to backend document search requests.</p>
              </GlassCard>
            </div>
          )}

          {/* Document Results */}
          {(!scope || scope === 'ALL' || scope === 'DOCUMENTS') && (
            <ResultGroup
              title="Documents"
              icon={<FileText className="w-3.5 h-3.5 text-blue-400" />}
              results={filteredResults.documents.slice(0, 200)}
              query={debouncedQuery}
              onNavigate={handleNavigate}
            />
          )}

          {/* PL Results */}
          {(!scope || scope === 'ALL' || scope === 'PL') && (
            <ResultGroup
              title="PL Items"
              icon={<Database className="w-3.5 h-3.5 text-indigo-400" />}
              results={filteredResults.plItems.slice(0, 200)}
              query={debouncedQuery}
              onNavigate={handleNavigate}
            />
          )}

          {/* Work Results */}
          {(!scope || scope === 'ALL' || scope === 'WORK') && (
            <ResultGroup
              title="Work Records"
              icon={<Briefcase className="w-3.5 h-3.5 text-amber-400" />}
              results={filteredResults.work.slice(0, 200)}
              query={debouncedQuery}
              onNavigate={handleNavigate}
            />
          )}

          {/* Case Results */}
          {(!scope || scope === 'ALL' || scope === 'CASES') && (
            <ResultGroup
              title="Cases"
              icon={<AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
              results={filteredResults.cases.slice(0, 200)}
              query={debouncedQuery}
              onNavigate={handleNavigate}
            />
          )}
        </div>
      )}

      {/* No results */}
      {!loading && !error && hasQuery && results && results.total === 0 && (
        <GlassCard className="p-10 text-center">
          <Search className="w-12 h-12 mx-auto mb-4 text-slate-600" />
          <p className="text-foreground font-semibold text-lg mb-1">No results found</p>
          <p className="text-muted-foreground text-sm mb-4">
            No matches for "<span className="text-foreground/90">{debouncedQuery}</span>" across any entity type.
          </p>
          <div className="text-xs text-slate-600 space-y-1">
            <p>Try broadening your search or check spelling.</p>
            <p>OCR text, PL numbers, document IDs, and work records are all indexed.</p>
          </div>
        </GlassCard>
      )}

      {/* Empty state with suggestions */}
      {!hasQuery && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent Searches */}
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground/90">Recent Searches</h3>
            </div>
            {recentSearches.length > 0 ? (
              <div className="space-y-1">
                {recentSearches.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setQuery(s)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-700/40 text-left transition-colors group"
                  >
                    <Search className="w-3.5 h-3.5 text-slate-600 group-hover:text-primary transition-colors flex-shrink-0" />
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{s}</span>
                    <ArrowRight className="w-3 h-3 text-slate-700 group-hover:text-primary ml-auto transition-colors" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-slate-600 text-sm">No recent searches yet.</p>
            )}
          </GlassCard>

          {/* Saved Searches */}
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Bookmark className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground/90">Saved Searches</h3>
            </div>
            {savedSearches.length > 0 ? (
              <div className="space-y-1">
                {savedSearches.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 group px-3 py-2 rounded-lg hover:bg-slate-700/40 transition-colors">
                    <button
                      onClick={() => { setQuery(s.q); setScope(s.scope); }}
                      className="flex-1 flex items-center gap-2 text-left"
                    >
                      <BookmarkCheck className="w-3.5 h-3.5 text-primary/60 group-hover:text-primary transition-colors flex-shrink-0" />
                      <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors truncate">{s.label}</span>
                    </button>
                    <button
                      onClick={() => deleteSaved(i)}
                      className="w-5 h-5 flex items-center justify-center rounded text-slate-700 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-slate-600 text-sm">No saved searches yet.</p>
                <p className="text-xs text-slate-700">Run a search and click <span className="text-primary/70">Save Search</span> to bookmark it here.</p>
              </div>
            )}
          </GlassCard>

          {/* Search Tips & Examples */}
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground/90">Try searching for</h3>
            </div>
            <div className="space-y-2">
              {EXAMPLE_QUERIES.map((example, i) => (
                <button
                  key={i}
                  onClick={() => setQuery(example)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/40 hover:bg-teal-500/10 hover:border-teal-500/20 border border-transparent text-left w-full transition-all group"
                >
                  <Hash className="w-3.5 h-3.5 text-primary/60 group-hover:text-primary flex-shrink-0 transition-colors" />
                  <span className="text-sm text-muted-foreground group-hover:text-primary/90 font-mono transition-colors">{example}</span>
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Feature Summary */}
          <GlassCard className="p-5 md:col-span-2">
            <h3 className="text-sm font-semibold text-foreground/90 mb-3">What gets indexed?</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: <FileText className="w-4 h-4 text-blue-400" />, label: 'Documents', detail: 'IDs, titles, tags, OCR text' },
                { icon: <Layers className="w-4 h-4 text-indigo-400" />, label: 'PL Items', detail: '8-digit PL numbers, descriptions' },
                { icon: <Briefcase className="w-4 h-4 text-amber-400" />, label: 'Work Records', detail: 'IDs, type, e-Office refs' },
                { icon: <AlertCircle className="w-4 h-4 text-rose-400" />, label: 'Cases', detail: 'Case numbers, linked PL, vendors' },
              ].map(({ icon, label, detail }) => (
                <div key={label} className="p-3 rounded-xl bg-secondary/40 border border-border/30">
                  <div className="flex items-center gap-2 mb-1">{icon}<span className="text-sm font-medium text-foreground">{label}</span></div>
                  <p className="text-xs text-muted-foreground">{detail}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
