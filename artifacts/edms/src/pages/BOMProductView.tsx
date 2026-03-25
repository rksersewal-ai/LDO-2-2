import React, { useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box, Layers, Cpu, Shield, Search, ChevronRight, ChevronDown,
  GripVertical, X, ExternalLink, FileText, ArrowLeft,
  GitBranch, Eye, AlertCircle, Hash, ChevronUp,
  Plus, Package, CheckCircle, Info,
} from 'lucide-react';
import { PRODUCTS, BOM_TREES, PL_DATABASE, searchTree, countNodes, cloneTree, findNode } from '../lib/bomData';
import type { BOMNode } from '../lib/bomData';
import { GlassCard, Badge, Button, Input, Select, PageHeader } from '../components/ui/Shared';
import { DatePicker } from '../components/ui/DatePicker';

const BOM_ITEM_TYPE = 'BOM_NODE';

interface DragItem { id: string; parentId: string | null; index: number; }

function NodeIcon({ type }: { type: string }) {
  if (type === 'assembly') return <Box className="w-4 h-4 text-blue-400 shrink-0" />;
  if (type === 'sub-assembly') return <Layers className="w-4 h-4 text-indigo-400 shrink-0" />;
  return <Cpu className="w-4 h-4 text-slate-400 shrink-0" />;
}

function tagColor(tag: string) {
  const t = tag.toLowerCase();
  if (t.includes('safety vital')) return 'bg-rose-900/40 text-rose-300 border-rose-500/30';
  if (t.includes('high voltage')) return 'bg-amber-900/40 text-amber-300 border-amber-500/30';
  if (t.includes('electrical') || t.includes('electronics')) return 'bg-blue-900/40 text-blue-300 border-blue-500/30';
  if (t.includes('safety')) return 'bg-rose-900/30 text-rose-300 border-rose-500/20';
  return 'bg-slate-800/80 text-slate-400 border-slate-700/50';
}

function DraggableBOMRow({
  node, index, parentId, level, siblingCount, isExpanded, toggleExpand,
  selectedId, onSelect, searchMatches, onMove, children,
}: {
  node: BOMNode; index: number; parentId: string | null; level: number; siblingCount: number;
  isExpanded: boolean; toggleExpand: (id: string) => void;
  selectedId: string | null; onSelect: (node: BOMNode) => void;
  searchMatches: Set<string>; onMove: (parentId: string | null, from: number, to: number) => void;
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const plRecord = PL_DATABASE[node.id];
  const isSelected = selectedId === node.id;
  const isMatch = searchMatches.size > 0 && searchMatches.has(node.id);
  const hasChildren = node.children.length > 0;

  const [{ isDragging }, drag, preview] = useDrag<DragItem, void, { isDragging: boolean }>({
    type: BOM_ITEM_TYPE,
    item: { id: node.id, parentId, index },
    collect: monitor => ({ isDragging: monitor.isDragging() }),
  });

  const [{ isOver, canDrop }, drop] = useDrop<DragItem, void, { isOver: boolean; canDrop: boolean }>({
    accept: BOM_ITEM_TYPE,
    canDrop: item => item.parentId === parentId && item.id !== node.id,
    hover: (item, monitor) => {
      if (!ref.current || item.parentId !== parentId || item.index === index) return;
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;
      if (item.index < index && hoverClientY < hoverMiddleY) return;
      if (item.index > index && hoverClientY > hoverMiddleY) return;
      onMove(parentId, item.index, index);
      item.index = index;
    },
    collect: monitor => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  });

  preview(drop(ref));

  return (
    <div ref={ref} style={{ opacity: isDragging ? 0.4 : 1 }}>
      <div
        className={`flex items-center gap-1.5 px-2 py-2.5 rounded-xl cursor-pointer transition-all group min-h-[44px] ${
          isSelected ? 'bg-teal-500/15 border border-teal-500/25' : 'hover:bg-slate-800/50 border border-transparent'
        } ${isMatch ? 'ring-1 ring-teal-500/40' : ''} ${isOver && canDrop ? 'border-teal-400/50 bg-teal-500/8' : ''}`}
        onClick={() => onSelect(node)}
      >
        {/* Drag handle + keyboard up/down controls */}
        <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity -ml-1" onClick={e => e.stopPropagation()}>
          <div ref={drag as unknown as React.Ref<HTMLDivElement>} className="cursor-grab active:cursor-grabbing p-1 text-slate-500 hover:text-teal-400 transition-colors" title="Drag to reorder">
            <GripVertical className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col gap-px">
            <button
              disabled={index === 0}
              onClick={e => { e.stopPropagation(); onMove(parentId, index, index - 1); }}
              className="p-0.5 text-slate-600 hover:text-teal-400 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
              aria-label="Move up"
            >
              <ChevronUp className="w-2.5 h-2.5" />
            </button>
            <button
              disabled={index >= siblingCount - 1}
              onClick={e => { e.stopPropagation(); onMove(parentId, index, index + 1); }}
              className="p-0.5 text-slate-600 hover:text-teal-400 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
              aria-label="Move down"
            >
              <ChevronDown className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>

        {/* Expand toggle */}
        <div className="shrink-0 w-5">
          {hasChildren ? (
            <button onClick={e => { e.stopPropagation(); toggleExpand(node.id); }} className="text-slate-500 hover:text-teal-400 transition-colors">
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          ) : (
            <div className="w-2 h-2 mx-auto rounded-full border border-slate-700 bg-slate-800/60" />
          )}
        </div>

        <NodeIcon type={node.type} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-slate-200 truncate leading-tight">{node.name}</span>
            {plRecord?.safetyVital && <Shield className="w-3 h-3 text-rose-400 shrink-0" aria-label="Safety Vital" />}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
            <span className="font-mono text-teal-400">{node.id}</span>
            <span>·</span>
            <span>Rev {node.revision}</span>
            <span>·</span>
            <span>Qty: {node.quantity}</span>
          </div>
        </div>

        {node.tags.slice(0, 1).map(tag => (
          <span key={tag} className={`shrink-0 px-1.5 py-0.5 border rounded-md text-[9px] font-medium ${tagColor(tag)}`}>{tag}</span>
        ))}
      </div>

      {hasChildren && isExpanded && (
        <div className="ml-8 pl-3 border-l border-teal-500/15 mt-0.5 space-y-0.5">
          {children}
        </div>
      )}
    </div>
  );
}

function BOMTreeLevel({
  nodes, parentId, level, expanded, toggleExpand,
  selectedId, onSelect, searchMatches, onMove,
}: {
  nodes: BOMNode[]; parentId: string | null; level: number; expanded: Set<string>;
  toggleExpand: (id: string) => void; selectedId: string | null;
  onSelect: (node: BOMNode) => void; searchMatches: Set<string>;
  onMove: (parentId: string | null, from: number, to: number) => void;
}) {
  return (
    <>
      {nodes.map((node, index) => (
        <DraggableBOMRow
          key={node.id}
          node={node}
          index={index}
          parentId={parentId}
          level={level}
          siblingCount={nodes.length}
          isExpanded={expanded.has(node.id)}
          toggleExpand={toggleExpand}
          selectedId={selectedId}
          onSelect={onSelect}
          searchMatches={searchMatches}
          onMove={onMove}
        >
          {node.children.length > 0 && expanded.has(node.id) && (
            <BOMTreeLevel
              nodes={node.children}
              parentId={node.id}
              level={level + 1}
              expanded={expanded}
              toggleExpand={toggleExpand}
              selectedId={selectedId}
              onSelect={onSelect}
              searchMatches={searchMatches}
              onMove={onMove}
            />
          )}
        </DraggableBOMRow>
      ))}
    </>
  );
}

function DetailPanel({ node, onClose }: { node: BOMNode; onClose: () => void }) {
  const navigate = useNavigate();
  const plRecord = PL_DATABASE[node.id];

  return (
    <motion.div
      key="detail-panel"
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="w-80 flex-shrink-0 flex flex-col glass-card rounded-2xl overflow-hidden"
    >
      {/* Panel header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <div className="flex items-center gap-2 min-w-0">
          <NodeIcon type={node.type} />
          <h2 className="text-sm font-bold text-white truncate">{node.name}</h2>
        </div>
        <button onClick={onClose} className="shrink-0 text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700/50">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
        {/* PL identity */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">PL Identity</p>
          <div className="glass-card rounded-xl p-3 space-y-2.5">
            <div>
              <p className="text-[10px] text-slate-500">PL Number</p>
              <p className="font-mono text-sm font-semibold text-teal-400 flex items-center gap-1.5">
                <Hash className="w-3 h-3" />{node.id}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Type', value: node.type },
                { label: 'Revision', value: node.revision, mono: true },
                { label: 'Quantity', value: `${node.quantity} ${node.unitOfMeasure}` },
                { label: 'Find No.', value: node.findNumber, mono: true },
              ].map(f => (
                <div key={f.label}>
                  <p className="text-[10px] text-slate-500">{f.label}</p>
                  <p className={`text-xs font-medium text-slate-200 capitalize ${f.mono ? 'font-mono' : ''}`}>{f.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tags */}
        {node.tags.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {node.tags.map(tag => (
                <span key={tag} className={`px-2 py-0.5 border rounded-md text-[10px] font-medium ${tagColor(tag)}`}>{tag}</span>
              ))}
            </div>
          </div>
        )}

        {/* PL Record */}
        {plRecord && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">PL Record</p>
            <div className="glass-card rounded-xl p-3 space-y-2.5">
              {plRecord.safetyVital && (
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-rose-900/20 border border-rose-500/20 rounded-lg">
                  <Shield className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span className="text-xs text-rose-300 font-medium">Safety Vital Item</span>
                </div>
              )}
              {[
                { label: 'Owner', value: plRecord.owner },
                { label: 'Department', value: plRecord.department },
                { label: 'Lifecycle', value: plRecord.lifecycleState },
                ...(plRecord.weight ? [{ label: 'Weight', value: plRecord.weight }] : []),
                ...(plRecord.supplier ? [{ label: 'Supplier', value: plRecord.supplier }] : []),
                ...(plRecord.source ? [{ label: 'Source', value: plRecord.source }] : []),
              ].map(f => (
                <div key={f.label}>
                  <p className="text-[10px] text-slate-500">{f.label}</p>
                  <p className="text-xs text-slate-200">{f.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Linked docs */}
        {plRecord && plRecord.linkedDocuments.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">
              Linked Documents ({plRecord.linkedDocuments.length})
            </p>
            <div className="space-y-1.5">
              {plRecord.linkedDocuments.slice(0, 3).map(doc => (
                <div key={doc.docId} className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/40 border border-white/5">
                  <FileText className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-slate-300 truncate">{doc.title}</p>
                    <p className="text-[9px] text-slate-500">{doc.type} · Rev {doc.revision}</p>
                  </div>
                  <Badge variant={doc.status === 'Approved' ? 'success' : doc.status === 'In Review' ? 'warning' : 'default'}
                    className="text-[9px] px-1.5">
                    {doc.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Child nodes quick view */}
        {node.children.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">
              Children ({node.children.length})
            </p>
            <div className="space-y-1">
              {node.children.map(c => (
                <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/40 border border-white/5">
                  <NodeIcon type={c.type} />
                  <span className="text-xs text-slate-300 flex-1 truncate">{c.name}</span>
                  <span className="font-mono text-[10px] text-teal-400">{c.id}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CTA footer */}
      <div className="p-4 border-t border-white/5 space-y-2">
        {plRecord ? (
          <Button className="w-full" onClick={() => navigate(`/pl/${node.id}`)}>
            <ExternalLink className="w-4 h-4" /> View Complete PL Details
          </Button>
        ) : (
          <div className="flex items-center gap-2 p-3 bg-amber-900/20 border border-amber-500/20 rounded-xl">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="text-xs text-amber-300">No PL record found for this node</p>
          </div>
        )}
        <Button variant="secondary" className="w-full" onClick={() => navigate('/pl')}>
          <Eye className="w-3.5 h-3.5" /> Browse PL Hub
        </Button>
      </div>
    </motion.div>
  );
}

function getAllNodeIds(nodes: BOMNode[]): { id: string; name: string; type: string }[] {
  const result: { id: string; name: string; type: string }[] = [];
  function collect(arr: BOMNode[]) {
    for (const n of arr) {
      if (n.type !== 'part') result.push({ id: n.id, name: n.name, type: n.type });
      collect(n.children);
    }
  }
  collect(nodes);
  return result;
}

interface AddNodeForm {
  plNumber: string;
  name: string;
  nodeType: 'assembly' | 'sub-assembly' | 'part';
  parentId: string;
  quantity: number;
  findNumber: string;
  revision: string;
  effectiveDate: string;
  usedInProducts: string[];
}

function AddNodeModal({
  bom, products, onClose, onAdd,
}: {
  bom: BOMNode[];
  products: typeof PRODUCTS;
  onClose: () => void;
  onAdd: (node: BOMNode, parentId: string | null) => void;
}) {
  const [form, setForm] = useState<AddNodeForm>({
    plNumber: '',
    name: '',
    nodeType: 'part',
    parentId: 'ROOT',
    quantity: 1,
    findNumber: '10',
    revision: 'A',
    effectiveDate: '',
    usedInProducts: products.map(p => p.id),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [plLookupResult, setPlLookupResult] = useState<typeof PL_DATABASE[string] | null | 'not-found'>(null);

  const parentOptions = [{ id: 'ROOT', name: 'Top Level (no parent)', type: 'root' }, ...getAllNodeIds(bom)];

  const lookupPL = () => {
    if (!form.plNumber.trim()) return;
    const pl = PL_DATABASE[form.plNumber.trim()];
    if (pl) {
      setPlLookupResult(pl);
      setForm(f => ({
        ...f,
        name: pl.name,
        nodeType: pl.type === 'assembly' ? 'assembly' : pl.type === 'sub-assembly' ? 'sub-assembly' : 'part',
        revision: pl.revision,
      }));
    } else {
      setPlLookupResult('not-found');
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.plNumber.trim()) errs.plNumber = 'PL Number is required';
    if (!form.name.trim()) errs.name = 'Name is required';
    if (form.quantity < 1) errs.quantity = 'Quantity must be at least 1';
    return errs;
  };

  const handleSubmit = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    const newNode: BOMNode = {
      id: form.plNumber.trim(),
      name: form.name.trim(),
      type: form.nodeType,
      revision: form.revision || 'A',
      quantity: form.quantity,
      findNumber: form.findNumber || '10',
      unitOfMeasure: 'EA',
      tags: plLookupResult && plLookupResult !== 'not-found' ? plLookupResult.tags.slice(0, 2) : [],
      children: [],
    };
    onAdd(newNode, form.parentId === 'ROOT' ? null : form.parentId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <GlassCard className="w-full max-w-2xl p-6 shadow-2xl max-h-[92vh] overflow-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-white">Add BOM Node</h2>
            <p className="text-xs text-slate-500 mt-0.5">Look up a PL number to auto-fill details, then place it in the BOM tree</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* PL Lookup */}
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">PL Number * (8 digits)</label>
            <div className="flex gap-2">
              <Input
                value={form.plNumber}
                onChange={e => { setForm(f => ({ ...f, plNumber: e.target.value })); setPlLookupResult(null); }}
                placeholder="e.g. 38110000"
                className={`flex-1 font-mono ${errors.plNumber ? 'border-rose-500/50' : ''}`}
                maxLength={8}
              />
              <Button variant="secondary" onClick={lookupPL} size="sm">
                <Search className="w-3.5 h-3.5" /> Look Up PL
              </Button>
            </div>
            {errors.plNumber && <p className="text-[10px] text-rose-400 mt-1">{errors.plNumber}</p>}
          </div>

          {/* PL Lookup result */}
          {plLookupResult && plLookupResult !== 'not-found' && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-teal-900/20 border border-teal-500/20">
              <CheckCircle className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-teal-300">{plLookupResult.name}</p>
                <p className="text-xs text-slate-400">{plLookupResult.department} · Rev {plLookupResult.revision} · {plLookupResult.lifecycleState}</p>
                {plLookupResult.safetyVital && (
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-rose-900/30 border border-rose-500/30 rounded-full text-[10px] text-rose-300">
                    <Shield className="w-2.5 h-2.5" /> Safety Vital
                  </span>
                )}
              </div>
            </div>
          )}
          {plLookupResult === 'not-found' && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-900/20 border border-amber-500/20">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-xs text-amber-300">PL number not in database. You can still create the node manually — go to PL Hub to create the record first for full metadata.</p>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Component Name *</label>
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Bogie Frame Assembly"
              className={`w-full ${errors.name ? 'border-rose-500/50' : ''}`}
            />
            {errors.name && <p className="text-[10px] text-rose-400 mt-1">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Node Type</label>
              <Select value={form.nodeType} onChange={e => setForm(f => ({ ...f, nodeType: e.target.value as AddNodeForm['nodeType'] }))} className="w-full">
                <option value="assembly">Assembly</option>
                <option value="sub-assembly">Sub-Assembly</option>
                <option value="part">Part</option>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Revision</label>
              <Input value={form.revision} onChange={e => setForm(f => ({ ...f, revision: e.target.value }))} placeholder="e.g. A" className="w-full font-mono" />
            </div>
          </div>

          {/* Assembly level / Parent */}
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Place Under (Assembly Level)</label>
            <Select value={form.parentId} onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))} className="w-full">
              {parentOptions.map(p => (
                <option key={p.id} value={p.id}>
                  {p.type === 'root' ? '⊤ Top Level' : `↳ ${p.name} (${p.id})`}
                </option>
              ))}
            </Select>
            <p className="text-[10px] text-slate-600 mt-1">The system will automatically link PL details using the PL number provided.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Quantity</label>
              <Input type="number" min={1} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))} className={`w-full ${errors.quantity ? 'border-rose-500/50' : ''}`} />
              {errors.quantity && <p className="text-[10px] text-rose-400 mt-1">{errors.quantity}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Find Number</label>
              <Input value={form.findNumber} onChange={e => setForm(f => ({ ...f, findNumber: e.target.value }))} placeholder="e.g. 10" className="w-full font-mono" />
            </div>
          </div>

          <DatePicker
            label="Effective From Date"
            value={form.effectiveDate}
            onChange={v => setForm(f => ({ ...f, effectiveDate: v }))}
            placeholder="Optional"
          />

          {/* Used In Products */}
          <div>
            <label className="text-xs font-medium text-slate-400 mb-2 block">
              Used In Products
              <span className="text-slate-600 ml-1 font-normal">(node will be added to all selected product BOMs)</span>
            </label>
            <div className="space-y-1.5">
              {products.map(p => (
                <label key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/30 border border-slate-700/40 hover:border-teal-500/20 cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    checked={form.usedInProducts.includes(p.id)}
                    onChange={e => setForm(f => ({
                      ...f,
                      usedInProducts: e.target.checked
                        ? [...f.usedInProducts, p.id]
                        : f.usedInProducts.filter(x => x !== p.id),
                    }))}
                    className="accent-teal-500 w-4 h-4"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-200">{p.name}</p>
                    <p className="text-[10px] text-slate-500">{p.category} · {p.lifecycle}</p>
                  </div>
                  <Badge variant={p.lifecycle === 'Production' ? 'success' : p.lifecycle === 'In Development' ? 'info' : 'default'} className="text-[9px] px-1.5 shrink-0">
                    {p.lifecycle}
                  </Badge>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-5 border-t border-slate-700/50">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSubmit} className="flex-1">
            <Plus className="w-4 h-4" /> Add to BOM
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}

function BOMProductViewInner() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();

  const product = PRODUCTS.find(p => p.id === productId);
  const initialTree = productId ? (BOM_TREES[productId] ?? null) : null;

  const [bom, setBom] = useState<BOMNode[]>(initialTree ? cloneTree(initialTree) : []);
  const [selectedNode, setSelectedNode] = useState<BOMNode | null>(null);
  const [search, setSearch] = useState('');
  const [showAddNode, setShowAddNode] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const s = new Set<string>();
    if (initialTree?.[0]) s.add(initialTree[0].id);
    return s;
  });

  const searchMatches = search.trim() ? searchTree(bom, search) : new Set<string>();
  const stats = countNodes(bom);

  const toggleExpand = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const ids = new Set<string>();
    function collect(nodes: BOMNode[]) { for (const n of nodes) { ids.add(n.id); collect(n.children); } }
    collect(bom);
    setExpanded(ids);
  }, [bom]);

  const collapseAll = useCallback(() => {
    setExpanded(bom.length > 0 ? new Set([bom[0].id]) : new Set());
  }, [bom]);

  const handleAddNode = useCallback((node: BOMNode, parentId: string | null) => {
    setBom(prev => {
      const cloned = cloneTree(prev);
      if (parentId === null) {
        cloned.push(node);
      } else {
        const parent = findNode(cloned, parentId);
        if (parent) parent.children.push(node);
      }
      return cloned;
    });
    setExpanded(prev => {
      const next = new Set(prev);
      if (parentId) next.add(parentId);
      return next;
    });
  }, []);

  const onMove = useCallback((parentId: string | null, fromIndex: number, toIndex: number) => {
    setBom(prev => {
      const cloned = cloneTree(prev);
      if (parentId === null) {
        const [item] = cloned.splice(fromIndex, 1);
        cloned.splice(toIndex, 0, item);
        return cloned;
      }
      const parent = findNode(cloned, parentId);
      if (!parent) return prev;
      const [item] = parent.children.splice(fromIndex, 1);
      parent.children.splice(toIndex, 0, item);
      return cloned;
    });
  }, []);

  if (!product || !initialTree) {
    return (
      <div className="flex items-center justify-center h-64">
        <GlassCard className="p-12 text-center">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="text-slate-300 font-medium">Product not found</p>
          <p className="text-slate-500 text-sm mb-4">The BOM for "{productId}" does not exist</p>
          <Button onClick={() => navigate('/bom')}><ArrowLeft className="w-4 h-4" /> Back to Explorer</Button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto h-[calc(100vh-160px)] flex flex-col">
      <PageHeader
        title={`${product.name} — Bill of Materials`}
        subtitle={product.subtitle}
        breadcrumb={
          <nav className="flex items-center gap-1.5 text-xs text-slate-500">
            <button onClick={() => navigate('/bom')} className="hover:text-teal-400 transition-colors flex items-center gap-1">
              <GitBranch className="w-3 h-3" /> BOM Explorer
            </button>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-300">{product.name}</span>
          </nav>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => navigate('/bom')}>
              <ArrowLeft className="w-3.5 h-3.5" /> All Products
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/pl')}>
              <Eye className="w-3.5 h-3.5" /> PL Hub
            </Button>
            <Button size="sm" onClick={() => setShowAddNode(true)}>
              <Plus className="w-3.5 h-3.5" /> Add Node
            </Button>
          </div>
        }
      />

      {/* Stats bar */}
      <div className="flex gap-3 text-xs flex-wrap">
        {[
          { label: 'Root PL', value: product.rootPL, mono: true },
          { label: 'Revision', value: product.revision, mono: true },
          { label: 'Total Nodes', value: stats.total },
          { label: 'Assemblies', value: stats.assemblies },
          { label: 'Parts', value: stats.parts },
        ].map(s => (
          <GlassCard key={s.label} className="px-3 py-2 flex items-center gap-2">
            <span className="text-slate-500">{s.label}</span>
            <span className={`font-bold text-teal-400 ${s.mono ? 'font-mono' : ''}`}>{s.value}</span>
          </GlassCard>
        ))}
        <Badge variant={
          product.lifecycle === 'Production' ? 'success' :
          product.lifecycle === 'In Development' ? 'info' : 'warning'
        } className="self-center">{product.lifecycle}</Badge>
      </div>

      {/* Main layout: Tree + Detail */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Tree panel */}
        <GlassCard className="flex flex-col flex-1 min-w-0">
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <Input placeholder="Search by name, PL number, or tag..." className="pl-9 w-full py-2" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <button onClick={expandAll} className="px-2.5 py-2 text-xs text-slate-400 hover:text-teal-300 border border-slate-700/60 rounded-lg transition-colors whitespace-nowrap">Expand All</button>
              <button onClick={collapseAll} className="px-2.5 py-2 text-xs text-slate-400 hover:text-teal-300 border border-slate-700/60 rounded-lg transition-colors">Collapse</button>
            </div>
            {search && searchMatches.size > 0 && (
              <p className="text-xs text-teal-400 mt-2 flex items-center gap-1">
                <Search className="w-3 h-3" />{searchMatches.size} match{searchMatches.size !== 1 ? 'es' : ''} for "{search}"
              </p>
            )}
          </div>
          <div className="p-1.5 text-[10px] text-slate-500 border-b border-white/5 px-4 flex items-center gap-2">
            <GripVertical className="w-3 h-3" /> Drag nodes to reorder within their parent
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-0.5 custom-scrollbar">
            <BOMTreeLevel
              nodes={bom}
              parentId={null}
              level={0}
              expanded={expanded}
              toggleExpand={toggleExpand}
              selectedId={selectedNode?.id ?? null}
              onSelect={node => setSelectedNode(prev => prev?.id === node.id ? null : node)}
              searchMatches={searchMatches}
              onMove={onMove}
            />
          </div>
        </GlassCard>

        {/* Detail panel */}
        <AnimatePresence>
          {selectedNode && (
            <DetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
          )}
        </AnimatePresence>
      </div>

      {showAddNode && (
        <AddNodeModal
          bom={bom}
          products={PRODUCTS}
          onClose={() => setShowAddNode(false)}
          onAdd={handleAddNode}
        />
      )}
    </div>
  );
}

export default function BOMProductView() {
  return (
    <DndProvider backend={HTML5Backend}>
      <BOMProductViewInner />
    </DndProvider>
  );
}
