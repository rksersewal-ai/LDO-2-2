import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { GlassCard, Badge, Button, Input } from '../components/ui/Shared';
import { MOCK_PL_RECORDS, MOCK_DOCUMENTS } from '../lib/mock';
import { getPLRecord, PL_DATABASE, findNode, INITIAL_BOM_TREE, type PLRecord } from '../lib/bomData';
import {
  ArrowLeft, Edit3, GitMerge, FileText, AlertCircle, CheckCircle,
  History, FileSearch, DatabaseBackup, Box, Layers, Cpu,
  Shield, ExternalLink, Package, Hash, Weight, Building2,
  User, Calendar, GitBranch, MapPin, Activity, Clock,
  FileImage, ArrowUpDown, Repeat, ChevronRight, Eye,
  FileCheck, Download, Printer, Link as LinkIcon, Tag,
  CircleDot, Zap, AlertTriangle,
} from 'lucide-react';

function nodeTypeColor(type: string) {
  if (type === 'assembly') return 'text-blue-400';
  if (type === 'sub-assembly') return 'text-indigo-400';
  return 'text-slate-400';
}

function nodeTypeBg(type: string) {
  if (type === 'assembly') return 'bg-blue-500/10 border-blue-500/20';
  if (type === 'sub-assembly') return 'bg-indigo-500/10 border-indigo-500/20';
  return 'bg-slate-800/30 border-slate-700/50';
}

function NodeIcon({ type, className = "w-5 h-5" }: { type: string; className?: string }) {
  if (type === 'assembly') return <Box className={`${className} text-blue-400`} />;
  if (type === 'sub-assembly') return <Layers className={`${className} text-indigo-400`} />;
  return <Cpu className={`${className} text-slate-400`} />;
}

function tagColor(tag: string) {
  const t = tag.toLowerCase();
  if (t.includes('safety')) return 'bg-rose-900/50 text-rose-300 border-rose-500/30';
  if (t.includes('high voltage')) return 'bg-amber-900/50 text-amber-300 border-amber-500/30';
  if (t.includes('electrical') || t.includes('electronics')) return 'bg-blue-900/50 text-blue-300 border-blue-500/30';
  if (t.includes('rotating') || t.includes('precision')) return 'bg-purple-900/50 text-purple-300 border-purple-500/30';
  if (t.includes('wear') || t.includes('consumable')) return 'bg-orange-900/50 text-orange-300 border-orange-500/30';
  if (t.includes('ndt')) return 'bg-rose-900/40 text-rose-400 border-rose-500/20';
  if (t.includes('rdso')) return 'bg-emerald-900/40 text-emerald-400 border-emerald-500/20';
  return 'bg-slate-800 text-slate-400 border-slate-700';
}

function statusBadgeVariant(status: string): "default" | "success" | "warning" | "danger" | "processing" {
  if (status === 'Approved' || status === 'Released' || status === 'Active' || status === 'Production' || status === 'Implemented') return 'success';
  if (status === 'In Review' || status === 'Preliminary' || status === 'In Development' || status === 'Prototyping' || status === 'Pending') return 'warning';
  if (status === 'Draft') return 'default';
  if (status === 'Obsolete' || status === 'Superseded' || status === 'End of Life' || status === 'Cancelled') return 'danger';
  return 'default';
}

export default function PLDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Try to find in new PL_DATABASE first, then fall back to legacy MOCK_PL_RECORDS
  const plRecord = id ? getPLRecord(id) : undefined;
  const legacyPL = !plRecord ? MOCK_PL_RECORDS.find(r => r.id === id) : undefined;

  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'drawings' | 'bom' | 'whereUsed' | 'changes' | 'effectivity'>('overview');

  // If we have the new PL record, render the full view
  if (plRecord) {
    return <FullPLDetail pl={plRecord} navigate={navigate} activeTab={activeTab} setActiveTab={setActiveTab} />;
  }

  // Legacy fallback for old PL records
  if (legacyPL) {
    return <LegacyPLDetail pl={legacyPL} navigate={navigate} activeTab={activeTab} setActiveTab={setActiveTab} />;
  }

  // Not found
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <GlassCard className="p-12 text-center max-w-md">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl text-white mb-2" style={{ fontWeight: 600 }}>PL Record Not Found</h2>
        <p className="text-sm text-slate-400 mb-6">No PL record exists with identifier "{id}".</p>
        <div className="flex gap-3 justify-center">
          <Button variant="secondary" onClick={() => navigate(-1 as any)}><ArrowLeft className="w-4 h-4" /> Go Back</Button>
          <Button onClick={() => navigate('/pl')}>Browse PL Hub</Button>
        </div>
      </GlassCard>
    </div>
  );
}

// ─── FULL PL DETAIL (New 8-digit PL system) ──────────────────────────────────

function FullPLDetail({ pl, navigate, activeTab, setActiveTab }: {
  pl: PLRecord; navigate: any; activeTab: string; setActiveTab: (tab: any) => void;
}) {
  const bomNode = useMemo(() => findNode(INITIAL_BOM_TREE, pl.plNumber), [pl.plNumber]);

  const tabs = [
    { id: 'overview', label: 'Overview & Properties' },
    { id: 'documents', label: `Documents (${pl.linkedDocuments.length})` },
    { id: 'drawings', label: `Drawings (${pl.linkedDrawings.length})` },
    { id: 'bom', label: `BOM Structure${bomNode ? ` (${bomNode.children.length})` : ''}` },
    { id: 'whereUsed', label: `Where Used (${pl.whereUsed.length})` },
    { id: 'changes', label: `Change History (${pl.changeHistory.length})` },
    { id: 'effectivity', label: 'Effectivity' },
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="px-2" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <NodeIcon type={pl.type} className="w-6 h-6" />
              <h1 className="text-2xl text-white" style={{ fontWeight: 700 }}>{pl.name}</h1>
              <Badge variant={statusBadgeVariant(pl.lifecycleState)}>{pl.lifecycleState}</Badge>
              {pl.safetyVital && <Badge variant="danger"><Shield className="w-3 h-3 mr-1" />Safety Vital</Badge>}
            </div>
            <div className="flex items-center gap-3 mt-1.5 pl-9 flex-wrap">
              <code className="text-sm text-teal-400 font-mono bg-teal-500/10 px-2.5 py-0.5 rounded-lg">PL {pl.plNumber}</code>
              <span className="text-xs text-slate-500">Rev {pl.revision}</span>
              <span className="text-xs text-slate-600">|</span>
              <span className="text-xs text-slate-500">{pl.classification}</span>
              <span className="text-xs text-slate-600">|</span>
              <span className="text-xs text-slate-500">Last Modified: {pl.lastModified}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button variant="ghost"><Printer className="w-4 h-4" /></Button>
          <Button variant="ghost"><Download className="w-4 h-4" /></Button>
          <Button variant="secondary"><Edit3 className="w-4 h-4" /> Edit Record</Button>
          <Button><GitMerge className="w-4 h-4" /> Link Entity</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-700/50 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`pb-3 px-4 text-sm border-b-2 transition-colors whitespace-nowrap
              ${activeTab === tab.id ? 'border-teal-400 text-teal-300' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'}`}
            style={{ fontWeight: activeTab === tab.id ? 600 : 400 }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <>
              <GlassCard className="p-6">
                <h2 className="text-lg text-white mb-4" style={{ fontWeight: 600 }}>Description</h2>
                <p className="text-slate-300 leading-relaxed">{pl.description}</p>
              </GlassCard>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Core Properties */}
                <GlassCard className="p-6">
                  <h3 className="text-sm text-white mb-4" style={{ fontWeight: 600 }}>Core Properties</h3>
                  <div className="space-y-3">
                    {[
                      { icon: Hash, label: 'PL Number', value: pl.plNumber, mono: true },
                      { icon: CircleDot, label: 'Type', value: pl.type === 'assembly' ? 'Assembly' : pl.type === 'sub-assembly' ? 'Sub-Assembly' : 'Part' },
                      { icon: GitBranch, label: 'Revision', value: pl.revision },
                      { icon: CircleDot, label: 'Lifecycle State', value: pl.lifecycleState },
                      { icon: MapPin, label: 'Source', value: pl.source },
                      { icon: Package, label: 'Unit of Measure', value: pl.unitOfMeasure },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <item.icon className="w-3.5 h-3.5" /> {item.label}
                        </div>
                        <span className={`text-xs text-slate-200 ${(item as any).mono ? 'font-mono text-teal-400' : ''}`}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>

                {/* Physical & Material */}
                <GlassCard className="p-6">
                  <h3 className="text-sm text-white mb-4" style={{ fontWeight: 600 }}>Physical Properties</h3>
                  <div className="space-y-3">
                    {[
                      { icon: Weight, label: 'Weight', value: pl.weight || '—' },
                      { icon: Zap, label: 'Material', value: pl.material || '—' },
                      { icon: Tag, label: 'Classification', value: pl.classification },
                      { icon: Shield, label: 'Safety Vital', value: pl.safetyVital ? 'Yes' : 'No' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <item.icon className="w-3.5 h-3.5" /> {item.label}
                        </div>
                        <span className="text-xs text-slate-200">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>

                {/* Ownership */}
                <GlassCard className="p-6">
                  <h3 className="text-sm text-white mb-4" style={{ fontWeight: 600 }}>Ownership & Dates</h3>
                  <div className="space-y-3">
                    {[
                      { icon: User, label: 'Owner', value: pl.owner },
                      { icon: Building2, label: 'Department', value: pl.department },
                      { icon: Calendar, label: 'Created', value: pl.createdDate },
                      { icon: Clock, label: 'Last Modified', value: pl.lastModified },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <item.icon className="w-3.5 h-3.5" /> {item.label}
                        </div>
                        <span className="text-xs text-slate-200">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>

                {/* Supplier */}
                <GlassCard className="p-6">
                  <h3 className="text-sm text-white mb-4" style={{ fontWeight: 600 }}>Supplier Information</h3>
                  {pl.supplier ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Supplier</span>
                        <span className="text-xs text-slate-200">{pl.supplier}</span>
                      </div>
                      {pl.supplierPartNo && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">Supplier Part No.</span>
                          <code className="text-xs text-teal-400 font-mono">{pl.supplierPartNo}</code>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Source Type</span>
                        <Badge variant={pl.source === 'Buy' ? 'warning' : 'success'}>{pl.source}</Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-xs text-slate-500">In-house manufactured part</p>
                      <Badge variant="success" className="mt-2">Source: {pl.source}</Badge>
                    </div>
                  )}
                </GlassCard>
              </div>

              {/* Tags */}
              <GlassCard className="p-6">
                <h3 className="text-sm text-white mb-3" style={{ fontWeight: 600 }}>Tags & Classification</h3>
                <div className="flex flex-wrap gap-2">
                  {pl.tags.map(tag => (
                    <span key={tag} className={`text-xs px-3 py-1 rounded-full border ${tagColor(tag)}`}>{tag}</span>
                  ))}
                </div>
              </GlassCard>

              {/* Alternates / Substitutes */}
              {(pl.alternates.length > 0 || pl.substitutes.length > 0) && (
                <GlassCard className="p-6">
                  <h3 className="text-sm text-white mb-4" style={{ fontWeight: 600 }}>Alternates & Substitutes</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pl.alternates.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-500 mb-2">Alternate Parts (same form-fit-function)</p>
                        {pl.alternates.map(alt => {
                          const altPL = getPLRecord(alt);
                          return (
                            <button key={alt} onClick={() => navigate(`/pl/${alt}`)}
                              className="w-full p-3 rounded-lg border border-purple-500/20 bg-purple-500/5 hover:border-purple-500/40 transition-colors text-left mb-2">
                              <div className="flex items-center gap-2">
                                <Repeat className="w-4 h-4 text-purple-400" />
                                <code className="text-xs text-purple-400 font-mono">PL {alt}</code>
                              </div>
                              {altPL && <p className="text-xs text-slate-400 mt-1 ml-6">{altPL.name}</p>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {pl.substitutes.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-500 mb-2">Substitute Parts (acceptable replacements)</p>
                        {pl.substitutes.map(sub => {
                          const subPL = getPLRecord(sub);
                          return (
                            <button key={sub} onClick={() => navigate(`/pl/${sub}`)}
                              className="w-full p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40 transition-colors text-left mb-2">
                              <div className="flex items-center gap-2">
                                <ArrowUpDown className="w-4 h-4 text-amber-400" />
                                <code className="text-xs text-amber-400 font-mono">PL {sub}</code>
                              </div>
                              {subPL && <p className="text-xs text-slate-400 mt-1 ml-6">{subPL.name}</p>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </GlassCard>
              )}
            </>
          )}

          {/* ── DOCUMENTS ── */}
          {activeTab === 'documents' && (
            <GlassCard className="p-0 overflow-hidden">
              {pl.linkedDocuments.length > 0 ? (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50 text-xs text-slate-500 bg-slate-900/50 uppercase tracking-wider">
                      <th className="py-3 pl-6">Document ID</th>
                      <th className="py-3">Title</th>
                      <th className="py-3">Type</th>
                      <th className="py-3">Rev</th>
                      <th className="py-3">Status</th>
                      <th className="py-3">Format</th>
                      <th className="py-3 pr-6">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-slate-300">
                    {pl.linkedDocuments.map(doc => (
                      <tr key={doc.docId} className="hover:bg-slate-800/30 cursor-pointer transition-colors">
                        <td className="py-4 pl-6 font-mono text-teal-400 text-xs">{doc.docId}</td>
                        <td className="py-4 text-xs">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                            <span>{doc.title}</span>
                          </div>
                        </td>
                        <td className="py-4 text-xs text-slate-500">{doc.type}</td>
                        <td className="py-4 text-xs text-slate-500">{doc.revision}</td>
                        <td className="py-4"><Badge variant={statusBadgeVariant(doc.status)} className="text-[10px]">{doc.status}</Badge></td>
                        <td className="py-4 text-xs text-slate-500">{doc.fileType} · {doc.size}</td>
                        <td className="py-4 pr-6 text-xs text-slate-600">{doc.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center text-slate-500">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No documents linked to this PL record.</p>
                </div>
              )}
            </GlassCard>
          )}

          {/* ── DRAWINGS ── */}
          {activeTab === 'drawings' && (
            <GlassCard className="p-0 overflow-hidden">
              {pl.linkedDrawings.length > 0 ? (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50 text-xs text-slate-500 bg-slate-900/50 uppercase tracking-wider">
                      <th className="py-3 pl-6">Drawing ID</th>
                      <th className="py-3">Title</th>
                      <th className="py-3">Sheet</th>
                      <th className="py-3">Rev</th>
                      <th className="py-3">Status</th>
                      <th className="py-3 pr-6">Format</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-slate-300">
                    {pl.linkedDrawings.map(dwg => (
                      <tr key={dwg.drawingId} className="hover:bg-slate-800/30 cursor-pointer transition-colors">
                        <td className="py-4 pl-6 font-mono text-indigo-400 text-xs">{dwg.drawingId}</td>
                        <td className="py-4 text-xs">
                          <div className="flex items-center gap-2">
                            <FileImage className="w-4 h-4 text-indigo-400 shrink-0" />
                            <span>{dwg.title}</span>
                          </div>
                        </td>
                        <td className="py-4 text-xs text-slate-500">{dwg.sheetNo}</td>
                        <td className="py-4 text-xs text-slate-500">{dwg.revision}</td>
                        <td className="py-4"><Badge variant={statusBadgeVariant(dwg.status)} className="text-[10px]">{dwg.status}</Badge></td>
                        <td className="py-4 pr-6 text-xs text-slate-500">{dwg.format}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center text-slate-500">
                  <FileImage className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No drawings linked to this PL record.</p>
                </div>
              )}
            </GlassCard>
          )}

          {/* ── BOM STRUCTURE ── */}
          {activeTab === 'bom' && (
            <GlassCard className="p-6">
              {bomNode && bomNode.children.length > 0 ? (
                <>
                  <h3 className="text-sm text-white mb-4" style={{ fontWeight: 600 }}>Direct Children in BOM</h3>
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-700/50 text-xs text-slate-500 uppercase tracking-wider">
                        <th className="py-2">Find #</th>
                        <th className="py-2">PL Number</th>
                        <th className="py-2">Name</th>
                        <th className="py-2">Type</th>
                        <th className="py-2">Qty</th>
                        <th className="py-2">UoM</th>
                        <th className="py-2">Rev</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-slate-300">
                      {bomNode.children.map(child => (
                        <tr key={child.id} onClick={() => navigate(`/pl/${child.id}`)}
                          className="hover:bg-slate-800/30 cursor-pointer transition-colors">
                          <td className="py-3 text-xs text-slate-500">{child.findNumber}</td>
                          <td className="py-3 font-mono text-teal-400 text-xs">{child.id}</td>
                          <td className="py-3 text-xs flex items-center gap-2">
                            <NodeIcon type={child.type} className="w-4 h-4" />
                            {child.name}
                          </td>
                          <td className="py-3 text-xs text-slate-500">{child.type}</td>
                          <td className="py-3 text-xs text-teal-400">{child.quantity}</td>
                          <td className="py-3 text-xs text-slate-500">{child.unitOfMeasure}</td>
                          <td className="py-3 text-xs text-slate-500">{child.revision}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-4 flex justify-end">
                    <Button variant="secondary" onClick={() => navigate('/bom')}>
                      <Box className="w-4 h-4" /> Open in BOM Explorer
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Box className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">{bomNode ? 'This is a leaf part with no children.' : 'BOM structure data not available.'}</p>
                  <Button variant="secondary" className="mt-4" onClick={() => navigate('/bom')}>
                    <Box className="w-4 h-4" /> Open BOM Explorer
                  </Button>
                </div>
              )}
            </GlassCard>
          )}

          {/* ── WHERE USED ── */}
          {activeTab === 'whereUsed' && (
            <GlassCard className="p-6">
              {pl.whereUsed.length > 0 ? (
                <>
                  <h3 className="text-sm text-white mb-4" style={{ fontWeight: 600 }}>Used In Assemblies</h3>
                  <div className="space-y-3">
                    {pl.whereUsed.map((wu, i) => (
                      <div key={i} onClick={() => navigate(`/pl/${wu.parentPL}`)}
                        className="p-4 rounded-xl border border-slate-700/40 bg-slate-800/20 hover:border-teal-500/30 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Layers className="w-5 h-5 text-indigo-400" />
                            <div>
                              <p className="text-sm text-slate-200" style={{ fontWeight: 500 }}>{wu.parentName}</p>
                              <code className="text-xs text-teal-400 font-mono">PL {wu.parentPL}</code>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>Qty: <span className="text-teal-400">{wu.quantity}</span></span>
                            <span>Find #: <span className="text-slate-300">{wu.findNumber}</span></span>
                            <ChevronRight className="w-4 h-4 text-slate-600" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <ArrowUpDown className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">This is a top-level assembly — not used in other structures.</p>
                </div>
              )}
            </GlassCard>
          )}

          {/* ── CHANGE HISTORY ── */}
          {activeTab === 'changes' && (
            <GlassCard className="p-6">
              {pl.changeHistory.length > 0 ? (
                <>
                  <h3 className="text-sm text-white mb-4" style={{ fontWeight: 600 }}>Engineering Change History</h3>
                  <div className="space-y-3">
                    {pl.changeHistory.map(ch => (
                      <div key={ch.changeId} className="p-4 rounded-xl border border-slate-700/40 bg-slate-800/20">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-amber-400" />
                            <code className="text-xs text-amber-400 font-mono">{ch.changeId}</code>
                            <Badge variant="default" className="text-[10px]">{ch.type}</Badge>
                          </div>
                          <Badge variant={statusBadgeVariant(ch.status)}>{ch.status}</Badge>
                        </div>
                        <p className="text-sm text-slate-300 mb-2">{ch.title}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{ch.date}</span>
                          <span className="flex items-center gap-1"><User className="w-3 h-3" />{ch.author}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Activity className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No engineering changes recorded for this part.</p>
                </div>
              )}
            </GlassCard>
          )}

          {/* ── EFFECTIVITY ── */}
          {activeTab === 'effectivity' && (
            <GlassCard className="p-6">
              <h3 className="text-sm text-white mb-4" style={{ fontWeight: 600 }}>Effectivity Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                  <h4 className="text-xs text-amber-400 mb-3 uppercase tracking-wider" style={{ fontWeight: 600 }}>Date Effectivity</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">Effective From</span>
                      <span className="text-xs text-slate-200">{pl.effectivity.dateFrom}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">Effective To</span>
                      <span className="text-xs text-slate-200">{pl.effectivity.dateTo || 'Open (Current)'}</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
                  <h4 className="text-xs text-blue-400 mb-3 uppercase tracking-wider" style={{ fontWeight: 600 }}>Serial Number Effectivity</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">Serial From</span>
                      <code className="text-xs text-slate-200 font-mono">{pl.effectivity.serialFrom || '—'}</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">Serial To</span>
                      <code className="text-xs text-slate-200 font-mono">{pl.effectivity.serialTo || 'Open'}</code>
                    </div>
                  </div>
                </div>
              </div>
              {pl.effectivity.lotNumbers && pl.effectivity.lotNumbers.length > 0 && (
                <div className="mt-4 p-4 rounded-xl border border-purple-500/20 bg-purple-500/5">
                  <h4 className="text-xs text-purple-400 mb-3 uppercase tracking-wider" style={{ fontWeight: 600 }}>Lot Effectivity</h4>
                  <div className="flex flex-wrap gap-2">
                    {pl.effectivity.lotNumbers.map(lot => (
                      <code key={lot} className="text-xs bg-purple-900/30 text-purple-300 px-3 py-1 rounded-lg border border-purple-500/20 font-mono">{lot}</code>
                    ))}
                  </div>
                </div>
              )}
            </GlassCard>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Quick Summary */}
          <GlassCard className="p-5">
            <h3 className="text-xs text-slate-500 uppercase tracking-widest mb-4" style={{ fontWeight: 700 }}>Quick Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Documents</span>
                <span className="text-sm text-white" style={{ fontWeight: 600 }}>{pl.linkedDocuments.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Drawings</span>
                <span className="text-sm text-white" style={{ fontWeight: 600 }}>{pl.linkedDrawings.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Where Used</span>
                <span className="text-sm text-white" style={{ fontWeight: 600 }}>{pl.whereUsed.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Changes</span>
                <span className="text-sm text-white" style={{ fontWeight: 600 }}>{pl.changeHistory.length}</span>
              </div>
              {bomNode && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">BOM Children</span>
                  <span className="text-sm text-white" style={{ fontWeight: 600 }}>{bomNode.children.length}</span>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Navigate to BOM */}
          <GlassCard className="p-5 bg-gradient-to-b from-slate-900/60 to-teal-950/20">
            <h3 className="text-xs text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2" style={{ fontWeight: 700 }}>
              <Box className="w-4 h-4 text-teal-400" /> BOM Navigation
            </h3>
            <p className="text-xs text-slate-400 mb-3">View this part in the interactive BOM structure editor.</p>
            <Button variant="secondary" className="w-full" onClick={() => navigate('/bom')}>
              <Box className="w-4 h-4" /> Open in BOM Explorer
            </Button>
          </GlassCard>

          {/* Safety Classification */}
          {pl.safetyVital && (
            <GlassCard className="p-5 border-rose-500/20">
              <h3 className="text-xs text-rose-400 uppercase tracking-widest mb-3 flex items-center gap-2" style={{ fontWeight: 700 }}>
                <Shield className="w-4 h-4" /> Safety Classification
              </h3>
              <p className="text-xs text-slate-400 mb-3">This item is classified as Safety Vital. All modifications require enhanced review and approval.</p>
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <p className="text-[10px] text-rose-300">Engineering Change Orders (ECO) are mandatory for any modification to this part.</p>
              </div>
            </GlassCard>
          )}

          {/* Recent Activity */}
          {pl.changeHistory.length > 0 && (
            <GlassCard className="p-5">
              <h3 className="text-xs text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2" style={{ fontWeight: 700 }}>
                <Activity className="w-4 h-4 text-amber-400" /> Latest Change
              </h3>
              {(() => {
                const latest = pl.changeHistory[pl.changeHistory.length - 1];
                return (
                  <div className="p-3 bg-slate-800/30 border border-slate-700/30 rounded-lg">
                    <code className="text-[10px] text-amber-400 font-mono">{latest.changeId}</code>
                    <p className="text-xs text-slate-300 mt-1">{latest.title}</p>
                    <p className="text-[10px] text-slate-500 mt-1">{latest.date} — {latest.author}</p>
                  </div>
                );
              })()}
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── LEGACY PL DETAIL (Fallback for old mock records) ────────────────────────

function LegacyPLDetail({ pl, navigate, activeTab, setActiveTab }: {
  pl: any; navigate: any; activeTab: string; setActiveTab: (tab: any) => void;
}) {
  const linkedDocsDetails = MOCK_DOCUMENTS.filter((d: any) => pl.linkedDocs.includes(d.id));

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="px-2" onClick={() => navigate('/pl')}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <div className="flex items-center gap-3">
              <DatabaseBackup className="w-6 h-6 text-teal-400" />
              <h1 className="text-2xl text-white" style={{ fontWeight: 700 }}>{pl.title}</h1>
              <Badge variant={pl.status === 'Active' ? 'success' : pl.status === 'Obsolete' ? 'danger' : 'warning'}>{pl.status}</Badge>
            </div>
            <p className="text-sm text-slate-400 mt-1 font-mono pl-9">{pl.id} • Last Updated: {pl.lastUpdated}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary"><Edit3 className="w-4 h-4" /> Edit Record</Button>
          <Button><GitMerge className="w-4 h-4" /> Link New Entity</Button>
        </div>
      </div>

      <div className="flex items-center gap-6 border-b border-slate-700/50 mb-6">
        {[
          { id: 'overview', label: 'Overview & Metadata' },
          { id: 'documents', label: `Linked Documents (${pl.linkedDocs.length})` },
          { id: 'bom', label: `BOM Usage (${pl.linkedBOMs.length})` },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-sm border-b-2 transition-colors ${activeTab === tab.id ? 'border-teal-400 text-teal-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            style={{ fontWeight: activeTab === tab.id ? 600 : 400 }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'overview' && (
            <GlassCard className="p-6">
              <h2 className="text-lg text-white mb-4" style={{ fontWeight: 600 }}>Record Context</h2>
              <p className="text-slate-300 leading-relaxed mb-8">{pl.description}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div><label className="text-xs text-slate-500 block mb-1">Lifecycle State</label><div className="text-sm text-slate-200">{pl.lifecycle}</div></div>
                <div><label className="text-xs text-slate-500 block mb-1">Owner</label><div className="text-sm text-slate-200">{pl.owner}</div></div>
                <div><label className="text-xs text-slate-500 block mb-1">Classification</label><div className="text-xs text-slate-200 border border-slate-700 px-2 py-0.5 rounded inline-block">Internal Restrict</div></div>
              </div>
            </GlassCard>
          )}
          {activeTab === 'documents' && (
            <GlassCard className="p-0 overflow-hidden">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-700/50 text-slate-400 bg-slate-900/50">
                    <th className="py-3 pl-6" style={{ fontWeight: 600 }}>Document ID</th>
                    <th className="py-3" style={{ fontWeight: 600 }}>Name</th>
                    <th className="py-3" style={{ fontWeight: 600 }}>Rev</th>
                    <th className="py-3" style={{ fontWeight: 600 }}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-slate-300">
                  {linkedDocsDetails.map((doc: any) => (
                    <tr key={doc.id} onClick={() => navigate(`/documents/${doc.id}`)} className="hover:bg-slate-800/50 cursor-pointer transition-colors">
                      <td className="py-4 pl-6 font-mono text-teal-400 hover:underline">{doc.id}</td>
                      <td className="py-4 flex items-center gap-2"><FileText className="w-4 h-4 text-slate-500" /> {doc.name}</td>
                      <td className="py-4">{doc.revision}</td>
                      <td className="py-4"><Badge variant={doc.status === 'Approved' ? 'success' : 'default'} className="text-[10px]">{doc.status}</Badge></td>
                    </tr>
                  ))}
                  {linkedDocsDetails.length === 0 && (
                    <tr><td colSpan={4} className="py-8 text-center text-slate-500">No documents linked.</td></tr>
                  )}
                </tbody>
              </table>
            </GlassCard>
          )}
          {activeTab === 'bom' && (
            <GlassCard className="p-12 flex flex-col items-center justify-center text-slate-500 text-center">
              <History className="w-12 h-12 mb-4 opacity-50 text-teal-500" />
              <h3 className="text-lg text-white mb-2" style={{ fontWeight: 600 }}>BOM Navigation</h3>
              <p className="max-w-md">View this record's BOM context in the interactive explorer.</p>
              <Button variant="secondary" className="mt-6" onClick={() => navigate('/bom')}>Open BOM Explorer</Button>
            </GlassCard>
          )}
        </div>
        <div className="space-y-6">
          <GlassCard className="p-5">
            <h3 className="text-xs text-slate-500 uppercase tracking-widest mb-4" style={{ fontWeight: 700 }}>Active Workflow Cases</h3>
            {pl.cases.length > 0 ? (
              <div className="space-y-3">
                {pl.cases.map((caseId: string) => (
                  <div key={caseId} className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 cursor-pointer transition-colors flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm text-amber-400" style={{ fontWeight: 600 }}>{caseId}</div>
                      <div className="text-xs text-amber-300/80 mt-1">Pending review on linked drawing discrepancies.</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-teal-500" /> No active cases.</div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
