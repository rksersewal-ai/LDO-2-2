import { useState } from 'react';
import { GlassCard, Badge, Button, Input } from '../components/ui/Shared';
import {
  DESIGN_TOKENS,
  COMPONENT_INVENTORY,
  SCREEN_MAP,
  USER_FLOWS,
  STATE_MATRIX,
  NAMING_CONVENTIONS,
  FIGMA_FILE_STRUCTURE,
} from '../lib/designSystem';
import type { ComponentEntry } from '../lib/designSystem';
import {
  Palette, Layers, GitBranch, Shield, BookOpen,
  ChevronDown, ChevronRight, Search, CheckCircle, XCircle,
  FileText, Layout, Zap, FolderTree, ArrowRight, Map as MapIcon
} from 'lucide-react';

type Tab = 'tokens' | 'components' | 'screens' | 'flows' | 'states' | 'naming' | 'figma' | 'matrix';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'tokens', label: 'Design Tokens', icon: Palette },
  { id: 'components', label: 'Component Library', icon: Layers },
  { id: 'screens', label: 'Screen Map', icon: Layout },
  { id: 'flows', label: 'User Flows', icon: GitBranch },
  { id: 'states', label: 'State Matrix', icon: Zap },
  { id: 'matrix', label: 'Inventory Matrix', icon: Layers },
  { id: 'naming', label: 'Naming & Governance', icon: Shield },
  { id: 'figma', label: 'Figma Structure', icon: FolderTree },
];

function ColorSwatch({ name, value, tailwind, usage }: { name: string; value: string; tailwind: string; usage: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-10 h-10 rounded-lg border border-slate-700 shrink-0" style={{ background: value }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-200">{name}</span>
          <code className="text-[10px] bg-slate-800 text-teal-400 px-1.5 py-0.5 rounded">{tailwind}</code>
        </div>
        <p className="text-xs text-slate-500 truncate">{usage}</p>
      </div>
      <code className="text-[10px] text-slate-600 font-mono">{value}</code>
    </div>
  );
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-4">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 w-full text-left py-2 px-1 hover:bg-slate-800/30 rounded-lg transition-colors">
        {open ? <ChevronDown className="w-4 h-4 text-teal-400" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
        <span className="text-sm text-slate-200" style={{ fontWeight: 600 }}>{title}</span>
      </button>
      {open && <div className="pl-6 pt-1">{children}</div>}
    </div>
  );
}

function ComponentCard({ comp }: { comp: ComponentEntry }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <GlassCard className="p-4 mb-3">
      <button onClick={() => setExpanded(!expanded)} className="flex items-start justify-between w-full text-left">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <code className="text-[10px] bg-teal-900/40 text-teal-400 px-1.5 py-0.5 rounded">{comp.id}</code>
            <span className="text-sm text-white" style={{ fontWeight: 600 }}>{comp.name}</span>
            <Badge variant="default">{comp.category}</Badge>
          </div>
          <p className="text-xs text-slate-500">{comp.file}</p>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-teal-400 shrink-0 mt-1" /> : <ChevronRight className="w-4 h-4 text-slate-500 shrink-0 mt-1" />}
      </button>
      {expanded && (
        <div className="mt-4 space-y-4 border-t border-slate-800 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2">Variants</h4>
              <div className="space-y-1">
                {comp.variants.map((v, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                    {v}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2">States</h4>
              <div className="flex flex-wrap gap-1">
                {comp.states.map((s, i) => (
                  <span key={i} className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2">Used In Screens</h4>
            <div className="flex flex-wrap gap-1">
              {comp.usedIn.map((s, i) => (
                <span key={i} className="text-[10px] bg-teal-900/30 text-teal-400 px-2 py-0.5 rounded-full">{s}</span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2">UX Notes</h4>
            <p className="text-xs text-slate-400">{comp.uxNotes}</p>
          </div>
          <div>
            <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2">Developer Handoff</h4>
            <p className="text-xs text-slate-400 font-mono bg-slate-950/50 p-3 rounded-lg">{comp.handoffNotes}</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs text-teal-500 uppercase tracking-wider mb-2 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Do</h4>
              <div className="space-y-1">
                {comp.doGuidance.map((d, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
                    <span className="text-teal-500 mt-0.5">+</span> {d}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs text-rose-500 uppercase tracking-wider mb-2 flex items-center gap-1"><XCircle className="w-3 h-3" /> Do Not</h4>
              <div className="space-y-1">
                {comp.dontGuidance.map((d, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
                    <span className="text-rose-500 mt-0.5">-</span> {d}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2">Accessibility</h4>
            <p className="text-xs text-slate-400">{comp.accessibility}</p>
          </div>
          <div className="bg-slate-800/30 rounded-lg p-3">
            <h4 className="text-xs text-amber-500 uppercase tracking-wider mb-1">Future Considerations</h4>
            <p className="text-xs text-slate-500">{comp.futureConsiderations}</p>
          </div>
        </div>
      )}
    </GlassCard>
  );
}

function TokensTab() {
  const { colors, typography, spacing, radii, elevation, glassMorphism, accessibility } = DESIGN_TOKENS;
  return (
    <div className="space-y-2">
      <Section title="Brand Colors">
        {Object.entries(colors.brand).map(([name, token]) => (
          <ColorSwatch key={name} name={name} value={token.value} tailwind={token.tailwind} usage={token.usage} />
        ))}
      </Section>
      <Section title="Surface Colors">
        {Object.entries(colors.surface).map(([name, token]) => (
          <ColorSwatch key={name} name={name} value={token.value} tailwind={token.tailwind} usage={token.usage} />
        ))}
      </Section>
      <Section title="Text Colors">
        {Object.entries(colors.text).map(([name, token]) => (
          <ColorSwatch key={name} name={name} value={token.value} tailwind={token.tailwind} usage={token.usage} />
        ))}
      </Section>
      <Section title="Status Colors">
        {Object.entries(colors.status).map(([name, token]) => (
          <div key={name} className="flex items-center gap-3 py-2">
            <div className="w-10 h-10 rounded-lg border border-slate-700 shrink-0" style={{ background: token.value }} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-200">{name}</span>
                <code className="text-[10px] bg-slate-800 text-teal-400 px-1.5 py-0.5 rounded">bg: {token.bg}</code>
                <code className="text-[10px] bg-slate-800 text-teal-400 px-1.5 py-0.5 rounded">text: {token.text}</code>
              </div>
              <p className="text-xs text-slate-500">{token.usage}</p>
            </div>
          </div>
        ))}
      </Section>
      <Section title="Border Colors">
        {Object.entries(colors.border).map(([name, token]) => (
          <ColorSwatch key={name} name={name} value={token.value} tailwind={token.tailwind} usage={token.usage} />
        ))}
      </Section>
      <Section title="Typography Scale">
        <div className="space-y-2">
          {typography.scale.map((t) => (
            <div key={t.name} className="flex items-baseline gap-4 py-1.5 border-b border-slate-800/50">
              <code className="text-[10px] bg-slate-800 text-teal-400 px-1.5 py-0.5 rounded w-24 text-center shrink-0">{t.name}</code>
              <span className="text-slate-300" style={{ fontSize: t.size }}>{t.size}</span>
              <span className="text-xs text-slate-500 flex-1">{t.use}</span>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Font Weights">
        <div className="space-y-1">
          {Object.entries(typography.fontWeights).map(([name, fw]) => (
            <div key={name} className="flex items-center gap-3 py-1">
              <span className="text-sm text-slate-200 w-24" style={{ fontWeight: fw.value }}>{name}</span>
              <code className="text-[10px] bg-slate-800 text-teal-400 px-1.5 py-0.5 rounded">{fw.value}</code>
              <span className="text-xs text-slate-500">{fw.usage}</span>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Text Size Control">
        <div className="bg-slate-800/30 rounded-lg p-4 text-xs text-slate-400 space-y-1">
          <p>Range: {typography.textSizeControl.min}px - {typography.textSizeControl.max}px (default: {typography.textSizeControl.default}px)</p>
          <p>Step: {typography.textSizeControl.stepSize}px | CSS Variable: <code className="text-teal-400">{typography.textSizeControl.cssVariable}</code></p>
          <p className="text-slate-500 mt-2">{typography.textSizeControl.rationale}</p>
        </div>
      </Section>
      <Section title="Spacing Scale">
        <div className="space-y-1">
          {spacing.scale.map((s) => (
            <div key={s.token} className="flex items-center gap-3 py-1">
              <code className="text-[10px] bg-slate-800 text-teal-400 px-1.5 py-0.5 rounded w-20 text-center shrink-0">{s.token}</code>
              <div className="bg-teal-500/30 h-3 rounded" style={{ width: s.value }} />
              <span className="text-xs text-slate-400">{s.value}</span>
              <span className="text-xs text-slate-500">{s.use}</span>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Page Layout Dimensions">
        <div className="bg-slate-800/30 rounded-lg p-4 text-xs text-slate-400 space-y-1">
          {Object.entries(spacing.pageLayout).map(([key, val]) => (
            <div key={key} className="flex gap-2">
              <span className="text-slate-500 w-40">{key}:</span>
              <code className="text-teal-400">{val}</code>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Border Radius">
        <div className="flex flex-wrap gap-4">
          {Object.entries(radii).map(([name, r]) => (
            <div key={name} className="text-center">
              <div className="w-16 h-16 bg-teal-500/20 border border-teal-500/30 mx-auto mb-2" style={{ borderRadius: r.value }} />
              <code className="text-[10px] text-teal-400">{name}</code>
              <p className="text-[10px] text-slate-500">{r.value}</p>
              <p className="text-[10px] text-slate-600">{r.use}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Elevation">
        <div className="space-y-2">
          {Object.entries(elevation).map(([name, val]) => (
            <div key={name} className="flex items-center gap-3 py-1">
              <span className="text-sm text-slate-300 w-24">{name}</span>
              <code className="text-[10px] bg-slate-800 text-teal-400 px-2 py-0.5 rounded">{val}</code>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Glass-Morphism Specs">
        {Object.entries(glassMorphism).map(([variant, spec]) => (
          <div key={variant} className="mb-3">
            <h5 className="text-xs text-slate-400 mb-2" style={{ fontWeight: 600 }}>{variant}</h5>
            <div className="bg-slate-800/30 rounded-lg p-3 text-xs text-slate-500 space-y-1">
              {Object.entries(spec).map(([prop, val]) => (
                <div key={prop} className="flex gap-2">
                  <span className="text-slate-600 w-20">{prop}:</span>
                  <code className="text-teal-400">{String(val)}</code>
                </div>
              ))}
            </div>
          </div>
        ))}
      </Section>
      <Section title="Accessibility">
        <div className="space-y-3">
          <div>
            <h5 className="text-xs text-slate-400 mb-1" style={{ fontWeight: 600 }}>Focus Ring</h5>
            <code className="text-[10px] bg-slate-800 text-teal-400 px-2 py-1 rounded">{accessibility.focusRing}</code>
          </div>
          <div>
            <h5 className="text-xs text-slate-400 mb-1" style={{ fontWeight: 600 }}>Contrast Ratios</h5>
            {Object.entries(accessibility.contrastRatios).map(([name, ratio]) => (
              <div key={name} className="flex gap-2 text-xs text-slate-500 py-0.5">
                <span className="w-40">{name}:</span>
                <span className="text-teal-400">{ratio}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">{accessibility.motionPreference}</p>
          <p className="text-xs text-slate-500">{accessibility.keyboardNav}</p>
          <p className="text-xs text-slate-500">{accessibility.textScaling}</p>
        </div>
      </Section>
    </div>
  );
}

function ComponentsTab() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const categories = ['All', ...Array.from(new Set(COMPONENT_INVENTORY.map(c => c.category)))];
  const filtered = COMPONENT_INVENTORY.filter(c => {
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase());
    const matchesCat = category === 'All' || c.category === category;
    return matchesSearch && matchesCat;
  });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search components..." className="pl-9 w-full" />
        </div>
        <div className="flex flex-wrap gap-1">
          {categories.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-3 py-1 rounded-lg text-xs transition-colors ${category === c ? 'bg-teal-500/20 text-teal-300' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-slate-500 mb-4">{filtered.length} components</p>
      {filtered.map(comp => <ComponentCard key={comp.id} comp={comp} />)}
    </div>
  );
}

function ScreensTab() {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-1 space-y-2">
        <h3 className="text-sm text-slate-300 mb-3" style={{ fontWeight: 600 }}>All Screens ({SCREEN_MAP.length})</h3>
        {SCREEN_MAP.map(scr => (
          <button key={scr.id} onClick={() => setSelected(scr.id)}
            className={`w-full text-left p-3 rounded-xl transition-colors ${selected === scr.id ? 'bg-teal-500/10 border border-teal-500/30' : 'bg-slate-800/30 hover:bg-slate-800/50 border border-transparent'}`}>
            <div className="flex items-center gap-2 mb-1">
              <code className="text-[10px] bg-teal-900/40 text-teal-400 px-1.5 py-0.5 rounded">{scr.id}</code>
              <span className="text-sm text-slate-200">{scr.name}</span>
            </div>
            <code className="text-[10px] text-slate-600">{scr.path}</code>
          </button>
        ))}
      </div>
      <div className="lg:col-span-2">
        {selected ? (() => {
          const scr = SCREEN_MAP.find(s => s.id === selected)!;
          return (
            <GlassCard className="p-6 sticky top-0">
              <div className="flex items-center gap-2 mb-1">
                <code className="text-xs bg-teal-900/40 text-teal-400 px-2 py-0.5 rounded">{scr.id}</code>
                <h2 className="text-lg text-white" style={{ fontWeight: 600 }}>{scr.name}</h2>
              </div>
              <code className="text-xs text-slate-500 block mb-4">{scr.path} - {scr.file}</code>
              <p className="text-sm text-slate-400 mb-6">{scr.description}</p>

              <div className="space-y-5">
                <div>
                  <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2">Role Access</h4>
                  <div className="flex flex-wrap gap-1">
                    {scr.roleAccess.map(r => <Badge key={r} variant={r === 'admin' ? 'danger' : r === 'public' ? 'default' : 'success'}>{r}</Badge>)}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2">Components Used ({scr.components.length})</h4>
                  <div className="flex flex-wrap gap-1">
                    {scr.components.map(cid => {
                      const c = COMPONENT_INVENTORY.find(cc => cc.id === cid);
                      return (
                        <span key={cid} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
                          {cid}: {c?.name || 'Unknown'}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2">UX Decisions</h4>
                  <div className="space-y-2">
                    {scr.uxDecisions.map((d, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
                        <ArrowRight className="w-3 h-3 text-teal-500 shrink-0 mt-0.5" /> {d}
                      </div>
                    ))}
                  </div>
                </div>
                {scr.flows.length > 0 && (
                  <div>
                    <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2">Linked Flows</h4>
                    <div className="flex flex-wrap gap-1">
                      {scr.flows.map(fid => {
                        const f = USER_FLOWS.find(ff => ff.id === fid);
                        return <Badge key={fid} variant="processing">{fid}: {f?.name || 'Unknown'}</Badge>;
                      })}
                    </div>
                  </div>
                )}
                <div>
                  <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2">Edge Cases</h4>
                  <div className="space-y-1">
                    {scr.edgeCases.map((ec, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-500">
                        <span className="text-amber-500 shrink-0">!</span> {ec}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </GlassCard>
          );
        })() : (
          <div className="flex items-center justify-center h-64 text-slate-600 text-sm">
            <div className="text-center">
              <MapIcon className="w-8 h-8 mx-auto mb-2 text-slate-700" />
              <p>Select a screen to view its component map and UX documentation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FlowsTab() {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      {USER_FLOWS.map(flow => (
        <GlassCard key={flow.id} className="p-4">
          <button onClick={() => setSelected(selected === flow.id ? null : flow.id)} className="flex items-start justify-between w-full text-left">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <code className="text-[10px] bg-teal-900/40 text-teal-400 px-1.5 py-0.5 rounded">{flow.id}</code>
                <span className="text-sm text-white" style={{ fontWeight: 600 }}>{flow.name}</span>
              </div>
              <p className="text-xs text-slate-500">{flow.description}</p>
            </div>
            {selected === flow.id ? <ChevronDown className="w-4 h-4 text-teal-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />}
          </button>
          {selected === flow.id && (
            <div className="mt-4 space-y-4 border-t border-slate-800 pt-4">
              <div>
                <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2">Steps</h4>
                <div className="space-y-2 relative">
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-teal-500/20" />
                  {flow.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-3 text-xs text-slate-400 relative">
                      <div className="w-3.5 h-3.5 rounded-full bg-teal-500/20 border border-teal-500/40 shrink-0 mt-0.5 z-10" />
                      {step}
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2">Screens</h4>
                  <div className="space-y-1">
                    {flow.screens.map(sid => {
                      const s = SCREEN_MAP.find(ss => ss.id === sid);
                      return <div key={sid} className="text-xs text-slate-400">{sid}: {s?.name}</div>;
                    })}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2">Components</h4>
                  <div className="flex flex-wrap gap-1">
                    {flow.components.map(cid => (
                      <span key={cid} className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{cid}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2">Permissions</h4>
                  <div className="flex flex-wrap gap-1">
                    {flow.permissions.map(p => <Badge key={p} variant="success">{p}</Badge>)}
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2">Edge Cases</h4>
                <div className="space-y-1">
                  {flow.edgeCases.map((ec, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-500">
                      <span className="text-amber-500 shrink-0">!</span> {ec}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </GlassCard>
      ))}
    </div>
  );
}

function StatesTab() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-800">
            <th className="text-xs text-slate-500 uppercase tracking-wider py-3 px-4">State</th>
            <th className="text-xs text-slate-500 uppercase tracking-wider py-3 px-4">Description</th>
            <th className="text-xs text-slate-500 uppercase tracking-wider py-3 px-4">Visual Treatment</th>
            <th className="text-xs text-slate-500 uppercase tracking-wider py-3 px-4">Applies To</th>
            <th className="text-xs text-slate-500 uppercase tracking-wider py-3 px-4">Example</th>
          </tr>
        </thead>
        <tbody>
          {STATE_MATRIX.map((state, i) => (
            <tr key={state.name} className={`border-b border-slate-800/50 ${i % 2 === 0 ? 'bg-slate-900/20' : ''}`}>
              <td className="py-3 px-4">
                <span className="text-sm text-white" style={{ fontWeight: 600 }}>{state.name}</span>
              </td>
              <td className="py-3 px-4 text-xs text-slate-400">{state.description}</td>
              <td className="py-3 px-4">
                <code className="text-[10px] text-teal-400 bg-slate-800 px-2 py-0.5 rounded">{state.visualTreatment}</code>
              </td>
              <td className="py-3 px-4">
                <div className="flex flex-wrap gap-1">
                  {state.applicableTo.map(a => (
                    <span key={a} className="text-[10px] bg-slate-800/50 text-slate-500 px-1.5 py-0.5 rounded">{a}</span>
                  ))}
                </div>
              </td>
              <td className="py-3 px-4 text-xs text-slate-500">{state.example}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MatrixTab() {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-4">Full Component Inventory Matrix - maps every component to its variants, states, screens, and handoff notes.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[1000px]">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-[10px] text-slate-500 uppercase tracking-wider py-3 px-3 w-16">ID</th>
              <th className="text-[10px] text-slate-500 uppercase tracking-wider py-3 px-3 w-32">Component</th>
              <th className="text-[10px] text-slate-500 uppercase tracking-wider py-3 px-3 w-24">Category</th>
              <th className="text-[10px] text-slate-500 uppercase tracking-wider py-3 px-3">Variants</th>
              <th className="text-[10px] text-slate-500 uppercase tracking-wider py-3 px-3">States</th>
              <th className="text-[10px] text-slate-500 uppercase tracking-wider py-3 px-3">Screens</th>
              <th className="text-[10px] text-slate-500 uppercase tracking-wider py-3 px-3">Handoff</th>
            </tr>
          </thead>
          <tbody>
            {COMPONENT_INVENTORY.map((comp, i) => (
              <tr key={comp.id} className={`border-b border-slate-800/30 ${i % 2 === 0 ? 'bg-slate-900/20' : ''} hover:bg-slate-800/30`}>
                <td className="py-2 px-3"><code className="text-[10px] text-teal-400">{comp.id}</code></td>
                <td className="py-2 px-3 text-xs text-slate-200" style={{ fontWeight: 500 }}>{comp.name}</td>
                <td className="py-2 px-3"><Badge variant="default">{comp.category}</Badge></td>
                <td className="py-2 px-3">
                  <div className="space-y-0.5">
                    {comp.variants.slice(0, 3).map((v, vi) => (
                      <div key={vi} className="text-[10px] text-slate-400 truncate max-w-[160px]">{v}</div>
                    ))}
                    {comp.variants.length > 3 && <div className="text-[10px] text-slate-600">+{comp.variants.length - 3} more</div>}
                  </div>
                </td>
                <td className="py-2 px-3">
                  <div className="flex flex-wrap gap-0.5">
                    {comp.states.map((s, si) => (
                      <span key={si} className="text-[9px] bg-slate-800 text-slate-500 px-1 py-0.5 rounded">{s}</span>
                    ))}
                  </div>
                </td>
                <td className="py-2 px-3">
                  <div className="text-[10px] text-slate-500">
                    {comp.usedIn.length <= 3
                      ? comp.usedIn.join(', ')
                      : `${comp.usedIn.slice(0, 3).join(', ')} +${comp.usedIn.length - 3}`
                    }
                  </div>
                </td>
                <td className="py-2 px-3 max-w-[200px]">
                  <div className="text-[10px] text-slate-600 truncate">{comp.handoffNotes.substring(0, 80)}...</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NamingTab() {
  const nc = NAMING_CONVENTIONS;
  return (
    <div className="space-y-2">
      <Section title="File Naming">
        <div className="space-y-1">
          {Object.entries(nc.files).map(([key, val]) => (
            <div key={key} className="flex gap-3 text-xs py-1">
              <span className="text-slate-500 w-32 shrink-0">{key}:</span>
              <code className="text-teal-400">{val}</code>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Directory Structure">
        <div className="space-y-1">
          {Object.entries(nc.directories).map(([key, val]) => (
            <div key={key} className="flex gap-3 text-xs py-1">
              <span className="text-slate-500 w-32 shrink-0">{key}:</span>
              <code className="text-teal-400">{val}</code>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Component Naming">
        <div className="space-y-1">
          {Object.entries(nc.components).map(([key, val]) => (
            <div key={key} className="flex gap-3 text-xs py-1">
              <span className="text-slate-500 w-32 shrink-0">{key}:</span>
              <span className="text-slate-400">{val}</span>
            </div>
          ))}
        </div>
      </Section>
      <Section title="ID Conventions">
        <div className="space-y-1">
          <div className="flex gap-3 text-xs py-1">
            <span className="text-slate-500 w-32 shrink-0">Components:</span>
            <code className="text-teal-400">{nc.componentIds}</code>
          </div>
          <div className="flex gap-3 text-xs py-1">
            <span className="text-slate-500 w-32 shrink-0">Screens:</span>
            <code className="text-teal-400">{nc.screenIds}</code>
          </div>
          <div className="flex gap-3 text-xs py-1">
            <span className="text-slate-500 w-32 shrink-0">Flows:</span>
            <code className="text-teal-400">{nc.flowIds}</code>
          </div>
        </div>
      </Section>
      <Section title="CSS Conventions">
        <div className="space-y-1">
          {Object.entries(nc.cssClasses).map(([key, val]) => (
            <div key={key} className="flex gap-3 text-xs py-1">
              <span className="text-slate-500 w-40 shrink-0">{key}:</span>
              <span className="text-slate-400">{val}</span>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Governance Rules">
        <div className="space-y-3">
          {Object.entries(nc.governance).map(([key, val]) => (
            <div key={key}>
              <h5 className="text-xs text-slate-300 mb-1" style={{ fontWeight: 600 }}>{key}</h5>
              <p className="text-xs text-slate-500">{val}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function FigmaTab() {
  const fs = FIGMA_FILE_STRUCTURE;
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400 mb-4">{fs.description}</p>
      {fs.files.map((file, fi) => (
        <GlassCard key={fi} className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm text-white" style={{ fontWeight: 600 }}>{file.name}</h3>
            <Badge variant="default">{file.pages.length} pages</Badge>
          </div>
          <div className="space-y-1.5">
            {file.pages.map((page, pi) => (
              <div key={pi} className="flex items-start gap-3 py-1.5 px-3 rounded-lg hover:bg-slate-800/30 transition-colors">
                <div className="w-1 h-1 rounded-full bg-teal-500/60 mt-1.5 shrink-0" />
                <div className="flex-1">
                  <span className="text-xs text-slate-300">{page.name}</span>
                  <p className="text-[10px] text-slate-600">{page.purpose}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

export default function DesignSystem() {
  const [activeTab, setActiveTab] = useState<Tab>('tokens');

  const totalComponents = COMPONENT_INVENTORY.length;
  const totalScreens = SCREEN_MAP.length;
  const totalFlows = USER_FLOWS.length;
  const totalStates = STATE_MATRIX.length;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-end justify-between mb-2">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-6 h-6 text-teal-400" />
            <h1 className="text-3xl text-white" style={{ fontWeight: 700 }}>Design System</h1>
          </div>
          <p className="text-slate-400 text-sm">LDO-2 EDMS - Living design documentation, component inventory, and UX reference</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-4 text-center">
          <div className="text-2xl text-teal-400 mb-1" style={{ fontWeight: 700 }}>{totalComponents}</div>
          <div className="text-xs text-slate-500">Components</div>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <div className="text-2xl text-emerald-400 mb-1" style={{ fontWeight: 700 }}>{totalScreens}</div>
          <div className="text-xs text-slate-500">Screens</div>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <div className="text-2xl text-blue-400 mb-1" style={{ fontWeight: 700 }}>{totalFlows}</div>
          <div className="text-xs text-slate-500">User Flows</div>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <div className="text-2xl text-amber-400 mb-1" style={{ fontWeight: 700 }}>{totalStates}</div>
          <div className="text-xs text-slate-500">States Defined</div>
        </GlassCard>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-800 pb-0">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs transition-colors rounded-t-lg ${
                activeTab === tab.id
                  ? 'bg-teal-500/10 text-teal-300 border-b-2 border-teal-400'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
              }`}>
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'tokens' && <TokensTab />}
        {activeTab === 'components' && <ComponentsTab />}
        {activeTab === 'screens' && <ScreensTab />}
        {activeTab === 'flows' && <FlowsTab />}
        {activeTab === 'states' && <StatesTab />}
        {activeTab === 'matrix' && <MatrixTab />}
        {activeTab === 'naming' && <NamingTab />}
        {activeTab === 'figma' && <FigmaTab />}
      </div>
    </div>
  );
}
