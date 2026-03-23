import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useNavigate } from 'react-router';
import { GlassCard, Badge, Button, Input } from '../components/ui/Shared';
import { useAuth } from '../lib/auth';
import {
  INITIAL_BOM_TREE, cloneTree, findNode, findParent, moveNode,
  searchTree, countNodes, getAllIds, flattenBOM, getPLRecord,
  type BOMNode, type BOMVersion, type PLRecord,
} from '../lib/bomData';
import {
  ChevronRight, ChevronDown, Box, Cpu, Layers, Search,
  Save, Undo2, Redo2, ChevronsDown, ChevronsUp, GripVertical,
  MoreVertical, Eye, FileText, Edit3, Trash2,
  X, Check, Move, Shield, Zap, ChevronLeft,
  Tag, ExternalLink, ArrowRight, Package, Hash, Weight,
  Building2, User, Calendar, GitBranch, ArrowUpDown,
  List, LayoutGrid, Repeat, FileImage, CircleDot,
  MapPin, Activity, Clock, Database, Plus, Minus, RefreshCw,
  GitCompare, Filter, Train, Settings, Lock, History,
} from 'lucide-react';

const ITEM_TYPE = 'BOM_NODE';

// ─── TYPES & HELPERS ─────────────────────────────────────────────────────────

interface DragItem { id: string; name: string; parentId: string | null; }
interface MoveConfirmation { nodeId: string; nodeName: string; fromParentId: string | null; fromParentName: string; toParentId: string; toParentName: string; }

function tagColor(tag: string) {
  const t = tag.toLowerCase();
  if (t.includes('safety')) return 'bg-rose-900/50 text-rose-300 border-rose-500/30';
  if (t.includes('high voltage')) return 'bg-amber-900/50 text-amber-300 border-amber-500/30';
  if (t.includes('electrical') || t.includes('electronics')) return 'bg-blue-900/50 text-blue-300 border-blue-500/30';
  if (t.includes('rotating') || t.includes('precision')) return 'bg-purple-900/50 text-purple-300 border-purple-500/30';
  if (t.includes('wear') || t.includes('consumable')) return 'bg-orange-900/50 text-orange-300 border-orange-500/30';
  if (t.includes('structural') || t.includes('forged')) return 'bg-cyan-900/50 text-cyan-300 border-cyan-500/30';
  return 'bg-slate-800 text-slate-400 border-slate-700';
}

function nodeTypeColor(type: BOMNode['type']) {
  if (type === 'assembly') return 'text-blue-400';
  if (type === 'sub-assembly') return 'text-indigo-400';
  return 'text-slate-400';
}

function NodeIcon({ type, className = "w-4 h-4" }: { type: BOMNode['type']; className?: string }) {
  if (type === 'assembly') return <Box className={`${className} text-blue-400 shrink-0`} />;
  if (type === 'sub-assembly') return <Layers className={`${className} text-indigo-400 shrink-0`} />;
  return <Cpu className={`${className} text-slate-400 shrink-0`} />;
}

// ─── PRODUCT CARDS (BOM Landing) ─────────────────────────────────────────────

interface ProductBOM {
  id: string;
  name: string;
  code: string;
  description: string;
  status: 'Production' | 'Development' | 'Prototype' | 'Archived';
  version: string;
  totalParts: number;
  assemblies: number;
  lastModified: string;
  owner: string;
  icon: string;
}

const PRODUCT_BOMS: ProductBOM[] = [
  { id: 'wap7', name: 'WAP7 Locomotive', code: 'WAP-7', description: '25kV AC electric locomotive for mainline passenger service. 6120 HP, regenerative braking.', status: 'Production', version: 'D', totalParts: 35, assemblies: 10, lastModified: '2026-03-20', owner: 'R. Krishnamurthy', icon: '🚂' },
  { id: 'wag9hc', name: 'WAG-9HC Locomotive', code: 'WAG-9HC', description: 'High-capacity 25kV AC freight locomotive. 6350 HP, axle load 22.9t.', status: 'Production', version: 'C', totalParts: 42, assemblies: 12, lastModified: '2026-02-15', owner: 'P. Mehta', icon: '🚃' },
  { id: 'detc', name: 'DETC Coach', code: 'DETC', description: 'Diesel-Electric Trailer Coach for DEMUs. AC traction, 110 km/h design speed.', status: 'Production', version: 'B', totalParts: 28, assemblies: 8, lastModified: '2026-01-10', owner: 'S. Kumar', icon: '🚋' },
  { id: 'tm6fra', name: 'Traction Motor 6FRA', code: '6FRA-6068', description: '3-phase AC traction motor, 1020 kW continuous. Class H insulation, forced ventilation.', status: 'Production', version: 'B', totalParts: 18, assemblies: 4, lastModified: '2026-03-01', owner: 'A. Sharma', icon: '⚡' },
  { id: 'transformer', name: 'Main Transformer 25kV', code: 'TRF-25K', description: '25kV/2x1080V oil-cooled main power transformer. Core-type, ONAN/ONAF cooling.', status: 'Development', version: 'A', totalParts: 14, assemblies: 3, lastModified: '2025-12-20', owner: 'P. Gupta', icon: '🔌' },
  { id: 'pantograph', name: 'Pantograph Assembly', code: 'PAN-HI', description: 'High-speed single-arm pantograph for 25kV OHE current collection.', status: 'Prototype', version: 'A', totalParts: 8, assemblies: 2, lastModified: '2025-11-15', owner: 'M. Reddy', icon: '📡' },
];

const BOM_VERSIONS_HISTORY = [
  { version: 'D', date: '2026-03-20', author: 'R. Krishnamurthy', label: 'Rev D — Serial 30601+ batch' },
  { version: 'C', date: '2025-09-15', author: 'A. Sharma', label: 'Rev C — Traction motor insulation upgrade' },
  { version: 'B', date: '2025-03-01', author: 'D. Mukherjee', label: 'Rev B — Bogie gusset modification' },
  { version: 'A', date: '2024-08-01', author: 'R. Krishnamurthy', label: 'Rev A — Initial release' },
];

function ProductCardsLanding({ onSelectProduct, canCreate }: { onSelectProduct: (id: string) => void; canCreate: boolean }) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl text-white mb-1" style={{ fontWeight: 700 }}>BOM Explorer</h1>
          <p className="text-slate-400 text-sm">Select a product to explore its Bill of Materials structure.</p>
        </div>
        {canCreate && (
          <Button><Plus className="w-4 h-4" /> Create New BOM</Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {PRODUCT_BOMS.map(product => (
          <GlassCard key={product.id}
            className="p-5 hover:border-teal-500/40 cursor-pointer transition-all group"
            onClick={() => onSelectProduct(product.id)}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-teal-900/20 border border-teal-500/20 flex items-center justify-center text-2xl">
                {product.icon}
              </div>
              <Badge variant={product.status === 'Production' ? 'success' : product.status === 'Development' ? 'warning' : product.status === 'Prototype' ? 'processing' : 'default'}
                className="text-[9px]">{product.status}</Badge>
            </div>
            <h3 className="text-base text-white group-hover:text-teal-300 transition-colors mb-0.5" style={{ fontWeight: 600 }}>{product.name}</h3>
            <code className="text-[10px] text-teal-400 font-mono">{product.code}</code>
            <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">{product.description}</p>

            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800">
              <div>
                <p className="text-[9px] text-slate-600 uppercase">Version</p>
                <p className="text-xs text-slate-300">Rev {product.version}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-600 uppercase">Parts</p>
                <p className="text-xs text-slate-300">{product.totalParts}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-600 uppercase">Assemblies</p>
                <p className="text-xs text-slate-300">{product.assemblies}</p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3 text-[10px] text-slate-600">
              <span>{product.owner}</span>
              <span className="flex items-center gap-1 text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity">
                Open <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

// ─── CONTEXT MENU ────────────────────────────────────────────────────────────

function ContextMenu({ node, position, onClose, onAction }: {
  node: BOMNode; position: { x: number; y: number }; onClose: () => void;
  onAction: (action: string, nodeId: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Element)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  return (
    <div ref={ref} className="fixed z-50 bg-slate-900/95 backdrop-blur-xl border border-teal-500/20 rounded-xl shadow-2xl shadow-black/50 py-1.5 min-w-[200px]"
      style={{ left: Math.min(position.x, window.innerWidth - 220), top: Math.min(position.y, window.innerHeight - 250) }}>
      <div className="px-3 py-1.5 border-b border-slate-800 mb-1">
        <p className="text-xs text-teal-400 font-mono">{node.id}</p>
        <p className="text-xs text-slate-500 truncate">{node.name}</p>
      </div>
      {[
        { icon: Eye, label: 'View PL Record', action: 'viewPL' },
        { icon: FileText, label: 'Open Documents', action: 'openDocs' },
        { icon: ArrowUpDown, label: 'View Where Used', action: 'whereUsed' },
        { icon: Edit3, label: 'Edit Metadata', action: 'editMeta' },
        { icon: Trash2, label: 'Remove from Assembly', action: 'remove', danger: true },
      ].map(item => (
        <button key={item.action} onClick={() => { onAction(item.action, node.id); onClose(); }}
          className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-slate-800/60
            ${(item as any).danger ? 'text-rose-400 hover:text-rose-300' : 'text-slate-300 hover:text-white'}`}
          role="menuitem">
          <item.icon className="w-3.5 h-3.5" />{item.label}
        </button>
      ))}
    </div>
  );
}

// ─── MOVE CONFIRMATION ───────────────────────────────────────────────────────

function MoveDialog({ move, onConfirm, onCancel }: { move: MoveConfirmation; onConfirm: () => void; onCancel: () => void; }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel} role="dialog" aria-label="Confirm move">
      <GlassCard className="p-6 max-w-md w-full mx-4" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center"><Move className="w-5 h-5 text-amber-400" /></div>
          <div><h3 className="text-white" style={{ fontWeight: 600 }}>Confirm Move</h3><p className="text-xs text-slate-500">This will restructure the BOM hierarchy</p></div>
        </div>
        <div className="space-y-3 mb-6">
          <div className="p-3 rounded-lg bg-slate-800/50"><p className="text-xs text-slate-500 mb-1">Moving</p><p className="text-sm text-white" style={{ fontWeight: 500 }}>{move.nodeName}</p></div>
          <div className="flex items-center gap-3">
            <div className="flex-1 p-3 rounded-lg bg-slate-800/50"><p className="text-xs text-slate-500 mb-1">From</p><p className="text-xs text-rose-400">{move.fromParentName}</p></div>
            <ChevronRight className="w-4 h-4 text-teal-500 shrink-0" />
            <div className="flex-1 p-3 rounded-lg bg-teal-500/10 border border-teal-500/20"><p className="text-xs text-slate-500 mb-1">To</p><p className="text-xs text-teal-300">{move.toParentName}</p></div>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button onClick={onConfirm}><Check className="w-4 h-4" /> Confirm</Button>
        </div>
      </GlassCard>
    </div>
  );
}

// ─── TREE NODE ───────────────────────────────────────────────────────────────

function TreeNode({ node, depth, tree, expanded, selected, searchMatches, highlighted,
  onToggle, onSelect, onMultiSelect, onContextMenu, onRequestMove }: {
  node: BOMNode; depth: number; tree: BOMNode[];
  expanded: Set<string>; selected: Set<string>; searchMatches: Set<string>; highlighted: string | null;
  onToggle: (id: string) => void; onSelect: (id: string) => void; onMultiSelect: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, node: BOMNode) => void; onRequestMove: (nodeId: string, targetId: string) => void;
}) {
  const parentNode = findParent(tree, node.id);
  const [{ isDragging }, drag, preview] = useDrag({
    type: ITEM_TYPE, item: (): DragItem => ({ id: node.id, name: node.name, parentId: parentNode?.id || null }),
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ITEM_TYPE,
    canDrop: (item: DragItem) => node.type !== 'part' && item.id !== node.id && item.parentId !== node.id,
    drop: (item: DragItem) => { onRequestMove(item.id, node.id); },
    collect: (monitor) => ({ isOver: monitor.isOver({ shallow: true }), canDrop: monitor.canDrop() }),
  });
  const isExpanded = expanded.has(node.id);
  const isSelected = selected.has(node.id);
  const isMatch = searchMatches.size > 0 && searchMatches.has(node.id);
  const hasChildren = node.children.length > 0;
  const isSafetyVital = node.tags.some(t => t.toLowerCase().includes('safety'));
  const refCb = useCallback((el: HTMLDivElement | null) => { preview(el); drop(el); }, [preview, drop]);
  if (searchMatches.size > 0 && !isMatch) return null;

  return (
    <div style={{ opacity: isDragging ? 0.4 : 1 }}>
      <div ref={refCb}
        className={`group flex items-center gap-1 py-1 px-2 rounded-lg transition-all cursor-pointer select-none
          ${isSelected ? 'bg-teal-500/15 border border-teal-500/30' : 'border border-transparent hover:bg-slate-800/40'}
          ${isOver && canDrop ? 'bg-teal-500/20 border-teal-400/50 ring-1 ring-teal-400/30' : ''}
          ${isOver && !canDrop ? 'bg-rose-500/10 border-rose-500/30' : ''}
          ${highlighted === node.id ? 'ring-2 ring-teal-400/60' : ''}`}
        style={{ marginLeft: depth * 20 }}
        onClick={(e) => { if (e.shiftKey || e.ctrlKey || e.metaKey) onMultiSelect(node.id); else onSelect(node.id); }}
        onContextMenu={(e) => onContextMenu(e, node)} role="treeitem" aria-expanded={hasChildren ? isExpanded : undefined} aria-selected={isSelected}>
        <div ref={drag as unknown as React.Ref<HTMLDivElement>} className="opacity-0 group-hover:opacity-50 hover:!opacity-100 cursor-grab active:cursor-grabbing p-0.5">
          <GripVertical className="w-3 h-3 text-slate-600" />
        </div>
        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors cursor-pointer
          ${isSelected ? 'bg-teal-500/30 border-teal-400' : 'border-slate-700 hover:border-slate-500'}`}
          onClick={(e) => { e.stopPropagation(); onMultiSelect(node.id); }} role="checkbox" aria-checked={isSelected} aria-label={`Select ${node.name}`}>
          {isSelected && <Check className="w-3 h-3 text-teal-300" />}
        </div>
        {hasChildren ? (
          <button onClick={(e) => { e.stopPropagation(); onToggle(node.id); }} className="p-0.5 hover:bg-slate-700/50 rounded transition-colors shrink-0" aria-label={isExpanded ? 'Collapse' : 'Expand'}>
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-teal-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
          </button>
        ) : <div className="w-[18px] shrink-0" />}
        <NodeIcon type={node.type} />
        {isSafetyVital && <Shield className="w-3 h-3 text-rose-400 shrink-0" />}
        <code className={`text-[11px] shrink-0 font-mono ${nodeTypeColor(node.type)}`}>{node.id}</code>
        <span className="text-xs text-slate-200 truncate flex-1" style={{ fontWeight: hasChildren ? 500 : 400 }}>{node.name}</span>
        {node.quantity > 1 && <span className="text-[10px] bg-teal-900/30 text-teal-400 px-1.5 py-0.5 rounded border border-teal-500/20 shrink-0">x{node.quantity}</span>}
        <span className="text-[10px] text-slate-600 shrink-0 hidden xl:inline">Rev {node.revision}</span>
        {hasChildren && <span className="text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded shrink-0">{node.children.length}</span>}
        <button onClick={(e) => { e.stopPropagation(); onContextMenu(e, node); }}
          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-700/50 rounded transition-all shrink-0" aria-label="More options">
          <MoreVertical className="w-3.5 h-3.5 text-slate-500" />
        </button>
      </div>
      {hasChildren && isExpanded && (
        <div className="relative" role="group">
          <div className="absolute left-0 top-0 bottom-0 border-l border-slate-700/30" style={{ marginLeft: (depth + 1) * 20 + 12 }} />
          {node.children.map(child => (
            <TreeNode key={child.id} node={child} depth={depth + 1} tree={tree} expanded={expanded}
              selected={selected} searchMatches={searchMatches} highlighted={highlighted}
              onToggle={onToggle} onSelect={onSelect} onMultiSelect={onMultiSelect}
              onContextMenu={onContextMenu} onRequestMove={onRequestMove} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SIMPLIFIED DETAIL PANEL (Essential info only) ───────────────────────────

function SimpleDetailPanel({ node, plRecord, onClose, onNavigate }: {
  node: BOMNode | null; plRecord: PLRecord | undefined; onClose: () => void; onNavigate: (id: string) => void;
}) {
  const navigate = useNavigate();

  if (!node) return (
    <div className="flex items-center justify-center h-full text-slate-600">
      <div className="text-center px-4">
        <Database className="w-10 h-10 mx-auto mb-3 text-slate-700" />
        <p className="text-sm">Select a node</p>
        <p className="text-xs text-slate-700 mt-1">Click any item in the BOM tree</p>
      </div>
    </div>
  );

  const parent = findParent(INITIAL_BOM_TREE, node.id);
  const isSafety = node.tags.some(t => t.toLowerCase().includes('safety'));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/30">
        <div className="flex items-start justify-between mb-2">
          <NodeIcon type={node.type} className="w-5 h-5" />
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg" aria-label="Close panel"><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <h2 className="text-sm text-white mb-1" style={{ fontWeight: 600 }}>{node.name}</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <code className="text-[10px] text-teal-400 font-mono bg-teal-500/10 px-2 py-0.5 rounded">PL {node.id}</code>
          <span className="text-[10px] text-slate-500">Rev {node.revision}</span>
          {isSafety && <Badge variant="danger" className="text-[8px] px-1.5">Safety Vital</Badge>}
        </div>
      </div>

      {/* Essential Properties */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {plRecord?.description && (
          <p className="text-[10px] text-slate-500 leading-relaxed">{plRecord.description}</p>
        )}

        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Qty', value: `${node.quantity} ${node.unitOfMeasure}` },
            { label: 'Find #', value: node.findNumber },
            { label: 'Lifecycle', value: plRecord?.lifecycleState || '—' },
            { label: 'Source', value: plRecord?.source || '—' },
            { label: 'Weight', value: plRecord?.weight || '—' },
            { label: 'Owner', value: plRecord?.owner || '—' },
          ].map(item => (
            <div key={item.label} className="p-2 rounded-lg bg-slate-800/20 border border-slate-700/20">
              <p className="text-[8px] text-slate-600 uppercase">{item.label}</p>
              <p className="text-[10px] text-slate-300">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Material */}
        {plRecord?.material && (
          <div className="p-2 rounded-lg bg-slate-800/20 border border-slate-700/20">
            <p className="text-[8px] text-slate-600 uppercase">Material</p>
            <p className="text-[10px] text-slate-300">{plRecord.material}</p>
          </div>
        )}

        {/* Supplier */}
        {plRecord?.supplier && (
          <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/15">
            <p className="text-[8px] text-blue-400 uppercase">Supplier</p>
            <p className="text-[10px] text-slate-300">{plRecord.supplier}</p>
            {plRecord.supplierPartNo && <p className="text-[9px] text-slate-500 font-mono mt-0.5">{plRecord.supplierPartNo}</p>}
          </div>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {node.tags.map(tag => (
            <span key={tag} className={`text-[8px] px-1.5 py-0.5 rounded-full border ${tagColor(tag)}`}>{tag}</span>
          ))}
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-2 border-t border-slate-800">
          {plRecord && <span>{plRecord.linkedDocuments.length} docs</span>}
          {plRecord && <span>{plRecord.linkedDrawings.length} drawings</span>}
          {node.children.length > 0 && <span>{node.children.length} children</span>}
        </div>

        {/* Parent */}
        {parent && (
          <button onClick={() => onNavigate(parent.id)} className="w-full flex items-center gap-2 p-2 rounded-lg bg-slate-800/20 border border-slate-700/20 text-left hover:border-teal-500/30 transition-colors">
            <NodeIcon type={parent.type} className="w-3 h-3" />
            <div className="flex-1 min-w-0">
              <p className="text-[8px] text-slate-600 uppercase">Parent</p>
              <p className="text-[10px] text-slate-300 truncate">{parent.name}</p>
            </div>
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-700/30">
        <Button className="w-full text-xs" onClick={() => navigate(`/pl/${node.id}`)}>
          <ExternalLink className="w-3.5 h-3.5" /> View Complete PL Details
        </Button>
      </div>
    </div>
  );
}

// ─── BOM COMPARE ─────────────────────────────────────────────────────────────

function compareTrees(oldTree: BOMNode[], newTree: BOMNode[]) {
  const added = new Set<string>(); const removed = new Set<string>();
  const changed = new Map<string, { field: string; from: string; to: string }[]>();
  function collect(nodes: BOMNode[]): Map<string, BOMNode> {
    const m = new Map<string, BOMNode>();
    function w(a: BOMNode[]) { for (const n of a) { m.set(n.id, n); w(n.children); } }
    w(nodes); return m;
  }
  const oM = collect(oldTree), nM = collect(newTree);
  for (const [id] of nM) if (!oM.has(id)) added.add(id);
  for (const [id] of oM) if (!nM.has(id)) removed.add(id);
  for (const [id, nn] of nM) {
    const on = oM.get(id); if (!on) continue;
    const d: { field: string; from: string; to: string }[] = [];
    if (on.revision !== nn.revision) d.push({ field: 'Rev', from: on.revision, to: nn.revision });
    if (on.quantity !== nn.quantity) d.push({ field: 'Qty', from: String(on.quantity), to: String(nn.quantity) });
    const op = findParent(oldTree, id), np = findParent(newTree, id);
    if ((op?.id || '') !== (np?.id || '')) d.push({ field: 'Parent', from: op?.name || 'Root', to: np?.name || 'Root' });
    if (d.length > 0) changed.set(id, d);
  }
  return { added, removed, changed };
}

function BOMCompareView({ versions, currentTree, onClose }: { versions: BOMVersion[]; currentTree: BOMNode[]; onClose: () => void; }) {
  const [lv, setLv] = useState(0);
  const [rv, setRv] = useState(-1);
  const lt = lv >= 0 && lv < versions.length ? versions[lv].tree : currentTree;
  const rt = rv >= 0 && rv < versions.length ? versions[rv].tree : currentTree;
  const diff = useMemo(() => compareTrees(lt, rt), [lt, rt]);
  const allIds = useMemo(() => {
    const s = new Set<string>(); function c(n: BOMNode[]) { for (const x of n) { s.add(x.id); c(x.children); } } c(lt); c(rt); return [...s].sort();
  }, [lt, rt]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose} role="dialog" aria-label="BOM Compare">
      <GlassCard className="w-[900px] max-w-[95vw] h-[80vh] flex flex-col" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-700/30 flex items-center justify-between">
          <div className="flex items-center gap-3"><GitCompare className="w-5 h-5 text-teal-400" /><h2 className="text-white" style={{ fontWeight: 600 }}>BOM Compare</h2></div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-emerald-400"><Plus className="w-3 h-3" /> {diff.added.size}</span>
              <span className="flex items-center gap-1 text-rose-400"><Minus className="w-3 h-3" /> {diff.removed.size}</span>
              <span className="flex items-center gap-1 text-amber-400"><RefreshCw className="w-3 h-3" /> {diff.changed.size}</span>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg" aria-label="Close"><X className="w-4 h-4 text-slate-500" /></button>
          </div>
        </div>
        <div className="px-5 py-3 border-b border-slate-800 flex items-center gap-4">
          <div className="flex-1"><p className="text-[10px] text-slate-500 uppercase mb-1">Base</p>
            <select value={lv} onChange={e => setLv(Number(e.target.value))} aria-label="Base version"
              className="w-full bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 focus:border-teal-500 focus:outline-none">
              {versions.map((v, i) => <option key={i} value={i}>v{v.version} — {v.label}</option>)}
            </select></div>
          <ArrowRight className="w-5 h-5 text-teal-500 shrink-0 mt-4" />
          <div className="flex-1"><p className="text-[10px] text-slate-500 uppercase mb-1">Compare To</p>
            <select value={rv} onChange={e => setRv(Number(e.target.value))} aria-label="Compare version"
              className="w-full bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 focus:border-teal-500 focus:outline-none">
              <option value={-1}>Current (Working)</option>
              {versions.map((v, i) => <option key={i} value={i}>v{v.version} — {v.label}</option>)}
            </select></div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-1">
          {diff.added.size === 0 && diff.removed.size === 0 && diff.changed.size === 0 ? (
            <div className="flex items-center justify-center h-full"><div className="text-center"><Check className="w-10 h-10 mx-auto mb-3 text-teal-500" /><p className="text-sm text-teal-400">No differences</p></div></div>
          ) : allIds.map(id => {
            const ia = diff.added.has(id), ir = diff.removed.has(id), ch = diff.changed.get(id);
            if (!ia && !ir && !ch) return null;
            const n = findNode(rt, id) || findNode(lt, id); if (!n) return null;
            return (
              <div key={id} className={`px-3 py-2 rounded-lg border text-xs ${ia ? 'bg-emerald-500/10 border-emerald-500/20' : ir ? 'bg-rose-500/10 border-rose-500/20' : 'bg-amber-500/5 border-amber-500/15'}`}>
                <div className="flex items-center gap-2">
                  {ia && <Plus className="w-3.5 h-3.5 text-emerald-400" />}{ir && <Minus className="w-3.5 h-3.5 text-rose-400" />}{ch && <RefreshCw className="w-3.5 h-3.5 text-amber-400" />}
                  <NodeIcon type={n.type} className="w-3.5 h-3.5" /><code className="font-mono text-slate-400">{id}</code>
                  <span className={ia ? 'text-emerald-300' : ir ? 'text-rose-300' : 'text-amber-300'} style={{ fontWeight: 500 }}>{n.name}</span>
                  {ia && <Badge variant="success" className="text-[8px] px-1.5">ADDED</Badge>}
                  {ir && <Badge variant="danger" className="text-[8px] px-1.5">REMOVED</Badge>}
                  {ch && <Badge variant="warning" className="text-[8px] px-1.5">MODIFIED</Badge>}
                </div>
                {ch && <div className="ml-8 mt-1 space-y-0.5">{ch.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px]"><span className="text-slate-500 w-16">{c.field}:</span><span className="text-rose-400 line-through">{c.from}</span><ArrowRight className="w-3 h-3 text-slate-600" /><span className="text-emerald-400">{c.to}</span></div>
                ))}</div>}
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}

// ─── EFFECTIVITY FILTER ──────────────────────────────────────────────────────

function EffectivityFilter({ onClose, onApply }: { onClose: () => void; onApply: (f: { dateFrom?: string; dateTo?: string; serial?: string }) => void; }) {
  const [df, setDf] = useState(''); const [dt, setDt] = useState(''); const [s, setS] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose} role="dialog" aria-label="Effectivity filter">
      <GlassCard className="p-6 max-w-md w-full mx-4" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-5"><div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center"><Filter className="w-5 h-5 text-amber-400" /></div><div><h3 className="text-white" style={{ fontWeight: 600 }}>Effectivity Filter</h3></div></div>
        <div className="space-y-4 mb-6">
          <div><label className="text-xs text-slate-400 block mb-1">Date From</label><Input type="date" value={df} onChange={e => setDf(e.target.value)} className="w-full" aria-label="Effective date from" /></div>
          <div><label className="text-xs text-slate-400 block mb-1">Date To</label><Input type="date" value={dt} onChange={e => setDt(e.target.value)} className="w-full" aria-label="Effective date to" /></div>
          <div className="border-t border-slate-800 pt-4"><label className="text-xs text-slate-400 block mb-1">Serial Number</label><Input value={s} onChange={e => setS(e.target.value)} placeholder="e.g. WAP7-30625" className="w-full" aria-label="Serial number" /></div>
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => { setDf(''); setDt(''); setS(''); onApply({}); }}>Clear</Button>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onApply({ dateFrom: df || undefined, dateTo: dt || undefined, serial: s || undefined })}><Filter className="w-4 h-4" /> Apply</Button>
        </div>
      </GlassCard>
    </div>
  );
}

// ─── FLAT BOM VIEW ───────────────────────────────────────────────────────────

function FlatBOMView({ tree, onNavigate }: { tree: BOMNode[]; onNavigate: (id: string) => void }) {
  const flat = useMemo(() => flattenBOM(tree), [tree]);
  const partsOnly = flat.filter(f => f.type === 'part');
  return (
    <div className="overflow-auto">
      <table className="w-full text-left text-xs">
        <thead><tr className="border-b border-slate-700/50 text-[10px] text-slate-500 uppercase tracking-wider">
          <th className="py-2 px-3">PL Number</th><th className="py-2 px-3">Name</th><th className="py-2 px-3">Rev</th><th className="py-2 px-3">Qty</th><th className="py-2 px-3">Parent Path</th><th className="py-2 px-3">Tags</th>
        </tr></thead>
        <tbody className="divide-y divide-slate-800/40">
          {partsOnly.map(item => (
            <tr key={`${item.plNumber}-${item.parentPath}`} onClick={() => onNavigate(item.plNumber)}
              className="hover:bg-slate-800/30 cursor-pointer transition-colors" role="link" tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && onNavigate(item.plNumber)}>
              <td className="py-2 px-3 font-mono text-teal-400">{item.plNumber}</td>
              <td className="py-2 px-3 text-slate-300">{item.name}</td>
              <td className="py-2 px-3 text-slate-500">{item.revision}</td>
              <td className="py-2 px-3 text-teal-400">{item.totalQty}</td>
              <td className="py-2 px-3 text-slate-600 text-[10px] max-w-[200px] truncate">{item.parentPath}</td>
              <td className="py-2 px-3"><div className="flex gap-1">{item.tags.slice(0, 2).map(tag => <span key={tag} className={`text-[8px] px-1.5 py-0 rounded-full border ${tagColor(tag)}`}>{tag}</span>)}</div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────

export default function BOMExplorer() {
  const { user, hasPermission } = useAuth();
  const isAdmin = hasPermission(['admin']);
  const canEdit = hasPermission(['admin', 'supervisor']);
  const navigate = useNavigate();

  // Landing or tree view
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  // Tree state
  const [tree, setTree] = useState<BOMNode[]>(() => cloneTree(INITIAL_BOM_TREE));
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['38100000']));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [focusedNode, setFocusedNode] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchMatches = useMemo(() => searchTree(tree, searchQuery), [tree, searchQuery]);
  const [contextMenu, setContextMenu] = useState<{ node: BOMNode; x: number; y: number } | null>(null);
  const [pendingMove, setPendingMove] = useState<MoveConfirmation | null>(null);
  const [history, setHistory] = useState<BOMNode[][]>([cloneTree(INITIAL_BOM_TREE)]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [versions, setVersions] = useState<BOMVersion[]>([
    { version: 1, label: 'Original', timestamp: '2026-03-20 09:00', tree: cloneTree(INITIAL_BOM_TREE) }
  ]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDetail, setShowDetail] = useState(true);
  const [viewMode, setViewMode] = useState<'tree' | 'flat'>('tree');
  const [showCompare, setShowCompare] = useState(false);
  const [showEffectivity, setShowEffectivity] = useState(false);
  const [effectivityFilter, setEffectivityFilter] = useState<{ dateFrom?: string; dateTo?: string; serial?: string }>({});
  const hasEffectivity = !!(effectivityFilter.dateFrom || effectivityFilter.dateTo || effectivityFilter.serial);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  useEffect(() => { if (searchMatches.size > 0) setExpanded(prev => new Set([...prev, ...searchMatches])); }, [searchMatches]);

  const focusedNodeData = useMemo(() => focusedNode ? findNode(tree, focusedNode) : null, [tree, focusedNode]);
  const focusedPLRecord = useMemo(() => focusedNode ? getPLRecord(focusedNode) : undefined, [focusedNode]);
  const stats = useMemo(() => countNodes(tree), [tree]);

  const pushHistory = useCallback((newTree: BOMNode[]) => {
    const nh = history.slice(0, historyIndex + 1); nh.push(cloneTree(newTree));
    setHistory(nh); setHistoryIndex(nh.length - 1); setTree(newTree); setHasUnsavedChanges(true);
  }, [history, historyIndex]);

  const undo = useCallback(() => { if (historyIndex > 0) { const i = historyIndex - 1; setHistoryIndex(i); setTree(cloneTree(history[i])); setHasUnsavedChanges(true); } }, [historyIndex, history]);
  const redo = useCallback(() => { if (historyIndex < history.length - 1) { const i = historyIndex + 1; setHistoryIndex(i); setTree(cloneTree(history[i])); setHasUnsavedChanges(true); } }, [historyIndex, history]);
  const saveVersion = useCallback(() => {
    setVersions(prev => [...prev, { version: prev.length + 1, label: 'Modified Structure', timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16), tree: cloneTree(tree) }]);
    setHasUnsavedChanges(false);
  }, [tree]);

  const toggleExpand = useCallback((id: string) => { setExpanded(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }); }, []);
  const expandAll = useCallback(() => { setExpanded(new Set(getAllIds(tree))); }, [tree]);
  const collapseAll = useCallback(() => { setExpanded(new Set()); }, []);

  const handleSelect = useCallback((id: string) => { setSelected(new Set([id])); setFocusedNode(id); setHighlighted(id); setShowDetail(true); setTimeout(() => setHighlighted(null), 1500); }, []);
  const handleMultiSelect = useCallback((id: string) => { setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }); setFocusedNode(id); }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, node: BOMNode) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ node, x: e.clientX, y: e.clientY }); }, []);
  const handleContextAction = useCallback((action: string, nodeId: string) => {
    if (action === 'remove' && canEdit) {
      const t = cloneTree(tree);
      const rem = (arr: BOMNode[]): boolean => { for (let i = 0; i < arr.length; i++) { if (arr[i].id === nodeId) { arr.splice(i, 1); return true; } if (rem(arr[i].children)) return true; } return false; };
      rem(t); pushHistory(t); if (focusedNode === nodeId) setFocusedNode(null);
    } else if (action === 'viewPL') { setFocusedNode(nodeId); setShowDetail(true); }
  }, [tree, pushHistory, focusedNode, canEdit]);

  const handleRequestMove = useCallback((nodeId: string, targetId: string) => {
    if (!canEdit) return;
    const s = findNode(tree, nodeId); const sp = findParent(tree, nodeId); const t = findNode(tree, targetId);
    if (!s || !t) return;
    setPendingMove({ nodeId, nodeName: s.name, fromParentId: sp?.id || null, fromParentName: sp?.name || 'Root', toParentId: targetId, toParentName: t.name });
  }, [tree, canEdit]);

  const confirmMove = useCallback(() => {
    if (!pendingMove) return;
    const newTree = moveNode(tree, pendingMove.nodeId, pendingMove.toParentId);
    if (newTree) { pushHistory(newTree); setExpanded(prev => new Set([...prev, pendingMove.toParentId])); }
    setPendingMove(null);
  }, [pendingMove, tree, pushHistory]);

  const handleBulkRemove = useCallback(() => {
    if (!canEdit) return;
    const t = cloneTree(tree);
    for (const id of selected) { const rem = (arr: BOMNode[]): boolean => { for (let i = 0; i < arr.length; i++) { if (arr[i].id === id) { arr.splice(i, 1); return true; } if (rem(arr[i].children)) return true; } return false; }; rem(t); }
    pushHistory(t); setSelected(new Set()); setFocusedNode(null);
  }, [tree, selected, pushHistory, canEdit]);

  const handleNavigateToNode = useCallback((id: string) => {
    handleSelect(id);
    const path: string[] = [];
    const findPath = (nodes: BOMNode[], target: string, current: string[]): boolean => {
      for (const n of nodes) { if (n.id === target) { path.push(...current); return true; } if (findPath(n.children, target, [...current, n.id])) return true; } return false;
    };
    findPath(tree, id, []);
    setExpanded(prev => new Set([...prev, ...path, id]));
  }, [handleSelect, tree]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveVersion(); }
      if (e.key === 'Escape') { setSelected(new Set()); setContextMenu(null); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [undo, redo, saveVersion]);

  // ── LANDING PAGE (Product Cards) ──
  if (!selectedProduct) {
    return <ProductCardsLanding onSelectProduct={setSelectedProduct} canCreate={isAdmin} />;
  }

  // ── BOM WORKSPACE ──
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-[calc(100vh-8rem)] flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <button onClick={() => setSelectedProduct(null)} className="p-1.5 hover:bg-slate-800 rounded-lg" aria-label="Back to products">
                <ChevronLeft className="w-4 h-4 text-slate-400" />
              </button>
              <h1 className="text-2xl text-white" style={{ fontWeight: 700 }}>
                {PRODUCT_BOMS.find(p => p.id === selectedProduct)?.name || 'BOM Explorer'}
              </h1>
              {hasUnsavedChanges && <Badge variant="warning">Unsaved</Badge>}
              {!canEdit && <Badge variant="default" className="text-[9px]"><Lock className="w-3 h-3 mr-1" />View Only</Badge>}
            </div>
            <p className="text-slate-400 text-xs ml-10">
              {PRODUCT_BOMS.find(p => p.id === selectedProduct)?.code} — {stats.assemblies} assemblies, {stats.parts} parts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setShowVersionHistory(!showVersionHistory)} className="text-xs" aria-label="Version history" aria-expanded={showVersionHistory}>
              <History className="w-4 h-4" /> Versions
            </Button>
            <Badge variant="default">v{versions.length}</Badge>
          </div>
        </div>

        {/* Version History Dropdown */}
        {showVersionHistory && (
          <GlassCard className="p-4">
            <h3 className="text-xs text-white mb-3" style={{ fontWeight: 600 }}>BOM Version History</h3>
            <div className="space-y-2">
              {BOM_VERSIONS_HISTORY.map((v, i) => (
                <div key={v.version} className={`flex items-center gap-3 p-2 rounded-lg border transition-colors cursor-pointer
                  ${i === 0 ? 'border-teal-500/30 bg-teal-500/5' : 'border-slate-700/30 bg-slate-800/20 hover:border-slate-600'}`}
                  onClick={() => { setTree(cloneTree(INITIAL_BOM_TREE)); setHasUnsavedChanges(false); setShowVersionHistory(false); }}
                  role="button" tabIndex={0}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${i === 0 ? 'bg-teal-500/20 text-teal-300' : 'bg-slate-800 text-slate-500'}`} style={{ fontWeight: 600 }}>
                    {v.version}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-200">{v.label}</p>
                    <p className="text-[10px] text-slate-500">{v.date} — {v.author}</p>
                  </div>
                  {i === 0 && <Badge variant="success" className="text-[8px]">Current</Badge>}
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Toolbar */}
        <GlassCard className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search PL number, name, or tag..." className="pl-9 w-64" aria-label="Search BOM" />
              {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-700 rounded" aria-label="Clear search"><X className="w-3 h-3 text-slate-500" /></button>}
            </div>
            {searchMatches.size > 0 && <span className="text-xs text-teal-400">{searchMatches.size} matches</span>}
            <div className="w-px h-6 bg-slate-700 mx-1" />
            <div className="flex items-center rounded-lg border border-slate-700/50 overflow-hidden">
              <button onClick={() => setViewMode('tree')} aria-pressed={viewMode === 'tree'} aria-label="Tree view"
                className={`px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors ${viewMode === 'tree' ? 'bg-teal-500/15 text-teal-300' : 'text-slate-500 hover:text-slate-300'}`}>
                <LayoutGrid className="w-3.5 h-3.5" /> Tree
              </button>
              <button onClick={() => setViewMode('flat')} aria-pressed={viewMode === 'flat'} aria-label="Flat view"
                className={`px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors ${viewMode === 'flat' ? 'bg-teal-500/15 text-teal-300' : 'text-slate-500 hover:text-slate-300'}`}>
                <List className="w-3.5 h-3.5" /> Flat
              </button>
            </div>
            <Button variant="ghost" onClick={expandAll} className="px-2 py-1.5" aria-label="Expand all"><ChevronsDown className="w-4 h-4" /></Button>
            <Button variant="ghost" onClick={collapseAll} className="px-2 py-1.5" aria-label="Collapse all"><ChevronsUp className="w-4 h-4" /></Button>
            <div className="w-px h-6 bg-slate-700 mx-1" />
            <Button variant="ghost" onClick={() => setShowEffectivity(true)} className={`px-2 py-1.5 ${hasEffectivity ? 'text-amber-400' : ''}`} aria-label="Effectivity filter">
              <Filter className="w-4 h-4" /><span className="hidden lg:inline text-xs">{hasEffectivity ? 'Effectivity (Active)' : 'Effectivity'}</span>
            </Button>
            <Button variant="ghost" onClick={() => setShowCompare(true)} className="px-2 py-1.5" aria-label="Compare versions">
              <GitCompare className="w-4 h-4" /><span className="hidden lg:inline text-xs">Compare</span>
            </Button>
          </div>

          {selected.size > 1 && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-teal-500/10 border border-teal-500/20">
              <span className="text-xs text-teal-300">{selected.size} selected</span>
              <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setSelected(new Set())}><X className="w-3 h-3" /> Clear</Button>
              {canEdit && <Button variant="danger" className="px-2 py-1 text-xs" onClick={handleBulkRemove}><Trash2 className="w-3 h-3" /> Remove</Button>}
            </div>
          )}

          <Button variant="ghost" className="px-2 py-1.5" onClick={() => setShowDetail(!showDetail)} aria-label={showDetail ? 'Hide detail' : 'Show detail'}>
            {showDetail ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </GlassCard>

        {/* Main Content */}
        <div className="flex-1 flex gap-4 min-h-0">
          <GlassCard className={`flex flex-col min-h-0 ${showDetail ? 'flex-1' : 'w-full'}`}>
            <div className="px-4 py-3 border-b border-slate-700/30 flex items-center justify-between bg-slate-900/30">
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm text-white" style={{ fontWeight: 600 }}>{viewMode === 'tree' ? 'Assembly Structure' : 'Flat Parts List'}</h3>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-slate-600">
                <span className="flex items-center gap-1"><Box className="w-3 h-3 text-blue-400" /> Assembly</span>
                <span className="flex items-center gap-1"><Layers className="w-3 h-3 text-indigo-400" /> Sub-Assy</span>
                <span className="flex items-center gap-1"><Cpu className="w-3 h-3 text-slate-400" /> Part</span>
                <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-rose-400" /> Safety</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3" role="tree">
              {viewMode === 'tree' ? (
                <div className="space-y-0.5">
                  {tree.map(node => (
                    <TreeNode key={node.id} node={node} depth={0} tree={tree} expanded={expanded}
                      selected={selected} searchMatches={searchMatches} highlighted={highlighted}
                      onToggle={toggleExpand} onSelect={handleSelect} onMultiSelect={handleMultiSelect}
                      onContextMenu={handleContextMenu} onRequestMove={handleRequestMove} />
                  ))}
                </div>
              ) : (
                <FlatBOMView tree={tree} onNavigate={handleNavigateToNode} />
              )}
            </div>
          </GlassCard>

          {showDetail && (
            <GlassCard className="w-[300px] shrink-0 flex flex-col min-h-0">
              <SimpleDetailPanel node={focusedNodeData} plRecord={focusedPLRecord}
                onClose={() => setFocusedNode(null)} onNavigate={handleNavigateToNode} />
            </GlassCard>
          )}
        </div>

        {/* Bottom Bar */}
        <GlassCard className="px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {canEdit ? (
              <>
                <Button onClick={saveVersion} disabled={!hasUnsavedChanges}><Save className="w-4 h-4" /> Save</Button>
                <Button variant="secondary" onClick={undo} disabled={historyIndex <= 0}><Undo2 className="w-4 h-4" /></Button>
                <Button variant="secondary" onClick={redo} disabled={historyIndex >= history.length - 1}><Redo2 className="w-4 h-4" /></Button>
              </>
            ) : (
              <span className="text-xs text-slate-500 flex items-center gap-1"><Lock className="w-3 h-3" /> View-only mode — contact admin/supervisor to edit</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-600">
            <Zap className="w-3 h-3" /> Ctrl+Z Undo · Ctrl+S Save
          </div>
        </GlassCard>
      </div>

      {contextMenu && <ContextMenu node={contextMenu.node} position={{ x: contextMenu.x, y: contextMenu.y }} onClose={() => setContextMenu(null)} onAction={handleContextAction} />}
      {pendingMove && <MoveDialog move={pendingMove} onConfirm={confirmMove} onCancel={() => setPendingMove(null)} />}
      {showCompare && <BOMCompareView versions={versions} currentTree={tree} onClose={() => setShowCompare(false)} />}
      {showEffectivity && <EffectivityFilter onClose={() => setShowEffectivity(false)} onApply={(f) => { setEffectivityFilter(f); setShowEffectivity(false); }} />}
    </DndProvider>
  );
}
