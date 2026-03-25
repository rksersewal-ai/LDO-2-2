import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Search, FileText, Database, Briefcase, AlertTriangle,
  ArrowRight, Layers, Hash, Clock, Sparkles, Command,
  ScanText, CheckCircle, AlertCircle, ChevronRight,
  Bookmark, BookmarkCheck, Trash2,
} from 'lucide-react';
import { GlassCard } from '../components/ui/Shared';
import { SearchService } from '../services/SearchService';
import type { CrossEntityResults, SearchResult } from '../services/SearchService';
import { LoadingState } from '../components/ui/LoadingState';

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
      <mark className="bg-teal-500/25 text-teal-300 rounded px-0.5">{match}</mark>
      {post}
    </span>
  );
}

function statusColor(status: string): string {
  const s = status?.toUpperCase();
  if (['ACTIVE', 'APPROVED', 'VERIFIED', 'CLOSED'].includes(s)) return 'text-emerald-400';
  if (['DRAFT', 'OPEN', 'UNDER_REVIEW', 'IN_PROGRESS', 'SUBMITTED'].includes(s)) return 'text-amber-400';
  if (['OBSOLETE', 'FAILED', 'OVERDUE'].includes(s)) return 'text-rose-400';
  return 'text-slate-400';
}

function statusDot(status: string): string {
  const s = status?.toUpperCase();
  if (['ACTIVE', 'APPROVED', 'VERIFIED', 'CLOSED'].includes(s)) return 'bg-emerald-500';
  if (['DRAFT', 'OPEN', 'UNDER_REVIEW', 'IN_PROGRESS', 'SUBMITTED'].includes(s)) return 'bg-amber-500';
  if (['OBSOLETE', 'FAILED', 'OVERDUE'].includes(s)) return 'bg-rose-500';
  return 'bg-slate-500';
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

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 rounded-xl bg-slate-800/30 border border-slate-700/40 hover:border-teal-500/30 hover:bg-slate-800/60 transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${typeBg[result.type]}`}>
          {icons[result.type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-sm font-semibold text-slate-100 group-hover:text-teal-300 transition-colors truncate">
              {highlightSnippet(result.title, query)}
            </span>
            {result.status && (
              <span className={`flex items-center gap-1 text-[10px] font-medium ${statusColor(result.status)}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusDot(result.status)}`} />
                {result.status}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span className="text-slate-600">{typeLabels[result.type]}</span>
            {result.subtitle && (
              <>
                <span className="text-slate-700">·</span>
                <span className="font-mono text-teal-500/70">{result.subtitle}</span>
              </>
            )}
            {result.matchField && (
              <>
                <span className="text-slate-700">·</span>
                <span className="flex items-center gap-0.5">
                  {result.matchField === 'OCR Text' && <ScanText className="w-3 h-3 text-violet-400" />}
                  <span className="text-slate-500">{result.matchField}</span>
                </span>
              </>
            )}
          </div>
          {result.snippet && (
            <p className="text-xs text-slate-400 leading-relaxed bg-slate-900/40 rounded-lg px-3 py-2 border border-slate-700/30 font-mono mt-1">
              {highlightSnippet(result.snippet, query)}
            </p>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-teal-400 shrink-0 mt-1 transition-colors" />
      </div>
    </button>
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
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{title}</span>
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

  const initialQuery = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [scope, setScope] = useState<Scope>('ALL');
  const [results, setResults] = useState<CrossEntityResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); } catch { return []; }
  });
  const [savedSearches, setSavedSearches] = useState<{ q: string; scope: Scope; label: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]'); } catch { return []; }
  });
  const [inputFocused, setInputFocused] = useState(false);

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

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
    const t = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const s = scope === 'ALL' ? 'ALL' : scope;
    SearchService.searchAll(debouncedQuery, s).then(r => {
      setResults(r);
      setLoading(false);
    });
  }, [debouncedQuery, scope]);

  useEffect(() => {
    if (debouncedQuery.trim()) {
      setSearchParams({ q: debouncedQuery }, { replace: true });
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
    navigate(path);
  }, [navigate, debouncedQuery, recentSearches]);

  const scopeCounts: Record<Scope, number> = {
    ALL: results?.total ?? 0,
    DOCUMENTS: results?.documents.length ?? 0,
    PL: results?.plItems.length ?? 0,
    WORK: results?.work.length ?? 0,
    CASES: results?.cases.length ?? 0,
  };

  const hasResults = results && results.total > 0;
  const hasQuery = debouncedQuery.trim().length > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-teal-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Search Explorer</h1>
        </div>
        <p className="text-slate-500 text-sm pl-11">
          Full-text search across documents, PL records, work entries, and cases — including OCR-extracted text.
        </p>
      </div>

      {/* Search Input */}
      <GlassCard className="p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-400 pointer-events-none" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setTimeout(() => setInputFocused(false), 150)}
            placeholder="Search documents, PL numbers, OCR text, work records..."
            className="w-full pl-12 pr-20 py-3.5 text-sm bg-slate-900/60 border border-slate-700/50 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 rounded-xl text-slate-200 placeholder-slate-600 outline-none transition-all"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults(null); setSearchParams({}, { replace: true }); }}
              className="absolute right-14 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs px-2 py-1 rounded-lg hover:bg-slate-700/50 transition-colors"
            >
              Clear
            </button>
          )}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-slate-600 text-xs border border-slate-700 rounded px-1.5 py-0.5 pointer-events-none">
            <Command className="w-3 h-3" />K
          </div>

          {/* Saved & Recent Searches Dropdown */}
          {inputFocused && !query && (savedSearches.length > 0 || recentSearches.length > 0) && (
            <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-slate-900/95 backdrop-blur-xl border border-white/8 rounded-xl shadow-2xl shadow-black/60 overflow-hidden">
              {savedSearches.length > 0 && (
                <div className="p-2">
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">Saved</p>
                  {savedSearches.slice(0, 5).map((s, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg hover:bg-slate-700/50 group transition-colors">
                      <button
                        onMouseDown={() => { setQuery(s.q); setScope(s.scope); setInputFocused(false); }}
                        className="flex-1 flex items-center gap-2 px-2 py-2 text-left"
                      >
                        <BookmarkCheck className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
                        <span className="text-sm text-slate-300 truncate">{s.label}</span>
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
                <div className={`p-2 ${savedSearches.length > 0 ? 'border-t border-slate-700/50' : ''}`}>
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">Recent</p>
                  {recentSearches.slice(0, 5).map((s, i) => (
                    <button
                      key={i}
                      onMouseDown={() => { setQuery(s); setInputFocused(false); }}
                      className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-700/50 text-left transition-colors"
                    >
                      <Clock className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                      <span className="text-sm text-slate-400">{s}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Scope Tabs */}
        {hasQuery && (
          <div className="flex gap-1 mt-3 border-t border-slate-700/40 pt-3 overflow-x-auto pb-0.5">
            {SCOPE_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  scope === s
                    ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/40'
                }`}
              >
                {SCOPE_LABELS[s]}
                {hasResults && scopeCounts[s] > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    scope === s ? 'bg-teal-500/20 text-teal-300' : 'bg-slate-700 text-slate-500'
                  }`}>
                    {scopeCounts[s]}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Loading */}
      {loading && <LoadingState message="Searching all records..." size="sm" />}

      {/* Results */}
      {!loading && hasResults && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="flex items-center gap-2 px-1">
            <CheckCircle className="w-4 h-4 text-teal-400" />
            <span className="text-slate-400 text-sm">
              Found <span className="text-teal-300 font-semibold">{results.total}</span> results for{' '}
              <span className="text-white font-semibold">"{debouncedQuery}"</span>
            </span>
            <button
              onClick={saveSearch}
              disabled={isSaved}
              title={isSaved ? 'Already saved' : 'Save this search'}
              className={`ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                isSaved
                  ? 'bg-teal-500/10 border-teal-500/30 text-teal-400 cursor-default'
                  : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-teal-300 hover:border-teal-500/30'
              }`}
            >
              {isSaved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
              {isSaved ? 'Saved' : 'Save Search'}
            </button>
          </div>

          {/* Document Results */}
          {(!scope || scope === 'ALL' || scope === 'DOCUMENTS') && (
            <ResultGroup
              title="Documents"
              icon={<FileText className="w-3.5 h-3.5 text-blue-400" />}
              results={results.documents}
              query={debouncedQuery}
              onNavigate={handleNavigate}
            />
          )}

          {/* PL Results */}
          {(!scope || scope === 'ALL' || scope === 'PL') && (
            <ResultGroup
              title="PL Items"
              icon={<Database className="w-3.5 h-3.5 text-indigo-400" />}
              results={results.plItems}
              query={debouncedQuery}
              onNavigate={handleNavigate}
            />
          )}

          {/* Work Results */}
          {(!scope || scope === 'ALL' || scope === 'WORK') && (
            <ResultGroup
              title="Work Records"
              icon={<Briefcase className="w-3.5 h-3.5 text-amber-400" />}
              results={results.work}
              query={debouncedQuery}
              onNavigate={handleNavigate}
            />
          )}

          {/* Case Results */}
          {(!scope || scope === 'ALL' || scope === 'CASES') && (
            <ResultGroup
              title="Cases"
              icon={<AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
              results={results.cases}
              query={debouncedQuery}
              onNavigate={handleNavigate}
            />
          )}
        </div>
      )}

      {/* No results */}
      {!loading && hasQuery && results && results.total === 0 && (
        <GlassCard className="p-10 text-center">
          <Search className="w-12 h-12 mx-auto mb-4 text-slate-600" />
          <p className="text-slate-200 font-semibold text-lg mb-1">No results found</p>
          <p className="text-slate-500 text-sm mb-4">
            No matches for "<span className="text-slate-300">{debouncedQuery}</span>" across any entity type.
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
              <Clock className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-300">Recent Searches</h3>
            </div>
            {recentSearches.length > 0 ? (
              <div className="space-y-1">
                {recentSearches.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setQuery(s)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-700/40 text-left transition-colors group"
                  >
                    <Search className="w-3.5 h-3.5 text-slate-600 group-hover:text-teal-400 transition-colors flex-shrink-0" />
                    <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors">{s}</span>
                    <ArrowRight className="w-3 h-3 text-slate-700 group-hover:text-teal-400 ml-auto transition-colors" />
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
              <Bookmark className="w-4 h-4 text-teal-400" />
              <h3 className="text-sm font-semibold text-slate-300">Saved Searches</h3>
            </div>
            {savedSearches.length > 0 ? (
              <div className="space-y-1">
                {savedSearches.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 group px-3 py-2 rounded-lg hover:bg-slate-700/40 transition-colors">
                    <button
                      onClick={() => { setQuery(s.q); setScope(s.scope); }}
                      className="flex-1 flex items-center gap-2 text-left"
                    >
                      <BookmarkCheck className="w-3.5 h-3.5 text-teal-500/60 group-hover:text-teal-400 transition-colors flex-shrink-0" />
                      <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors truncate">{s.label}</span>
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
                <p className="text-xs text-slate-700">Run a search and click <span className="text-teal-500/70">Save Search</span> to bookmark it here.</p>
              </div>
            )}
          </GlassCard>

          {/* Search Tips & Examples */}
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <h3 className="text-sm font-semibold text-slate-300">Try searching for</h3>
            </div>
            <div className="space-y-2">
              {EXAMPLE_QUERIES.map((example, i) => (
                <button
                  key={i}
                  onClick={() => setQuery(example)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/40 hover:bg-teal-500/10 hover:border-teal-500/20 border border-transparent text-left w-full transition-all group"
                >
                  <Hash className="w-3.5 h-3.5 text-teal-500/60 group-hover:text-teal-400 flex-shrink-0 transition-colors" />
                  <span className="text-sm text-slate-400 group-hover:text-teal-300 font-mono transition-colors">{example}</span>
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Feature Summary */}
          <GlassCard className="p-5 md:col-span-2">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">What gets indexed?</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: <FileText className="w-4 h-4 text-blue-400" />, label: 'Documents', detail: 'IDs, titles, tags, OCR text' },
                { icon: <Layers className="w-4 h-4 text-indigo-400" />, label: 'PL Items', detail: '8-digit PL numbers, descriptions' },
                { icon: <Briefcase className="w-4 h-4 text-amber-400" />, label: 'Work Records', detail: 'IDs, type, e-Office refs' },
                { icon: <AlertCircle className="w-4 h-4 text-rose-400" />, label: 'Cases', detail: 'Case numbers, linked PL, vendors' },
              ].map(({ icon, label, detail }) => (
                <div key={label} className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/30">
                  <div className="flex items-center gap-2 mb-1">{icon}<span className="text-sm font-medium text-slate-200">{label}</span></div>
                  <p className="text-xs text-slate-500">{detail}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
