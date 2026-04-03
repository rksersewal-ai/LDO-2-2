import { GlassCard, Badge, Button, Input } from '../components/ui/Shared';
import { Palette, Type, Box, Sparkles } from 'lucide-react';

export default function DesignSystem() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Design System</h1>
        <p className="text-muted-foreground text-sm">LDO-2 EDMS component library and design tokens reference.</p>
      </div>

      {/* Colors */}
      <GlassCard className="p-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Palette className="w-5 h-5 text-primary" /> Colors</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'Teal Primary', class: 'bg-teal-500', text: 'text-white' },
            { name: 'Emerald Accent', class: 'bg-emerald-500', text: 'text-white' },
            { name: 'Slate Base', class: 'bg-card', text: 'text-white' },
            { name: 'Rose Danger', class: 'bg-rose-500', text: 'text-white' },
            { name: 'Amber Warning', class: 'bg-amber-500', text: 'text-white' },
            { name: 'Blue Info', class: 'bg-blue-500', text: 'text-white' },
            { name: 'Slate 950 BG', class: 'bg-slate-950', text: 'text-white' },
            { name: 'Slate 400 Text', class: 'bg-slate-400', text: 'text-slate-950' },
          ].map(c => (
            <div key={c.name}>
              <div className={`w-full h-12 rounded-xl ${c.class} mb-2`} />
              <p className="text-xs text-muted-foreground">{c.name}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Badges */}
      <GlassCard className="p-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Box className="w-5 h-5 text-primary" /> Badges</h2>
        <div className="flex flex-wrap gap-3">
          <Badge>Default</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
          <Badge variant="processing">Processing</Badge>
        </div>
      </GlassCard>

      {/* Buttons */}
      <GlassCard className="p-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Primary Button</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost Button</Button>
          <Button variant="danger">Danger Button</Button>
        </div>
      </GlassCard>

      {/* Typography */}
      <GlassCard className="p-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Type className="w-5 h-5 text-primary" /> Typography</h2>
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-white">Heading 1 — Bold White</h1>
          <h2 className="text-2xl font-bold text-white">Heading 2 — Bold White</h2>
          <h3 className="text-lg font-semibold text-foreground">Heading 3 — Semibold Slate-200</h3>
          <p className="text-sm text-foreground/90">Body text — Slate-300 at 14px. Used for most paragraph content.</p>
          <p className="text-xs text-muted-foreground">Caption text — Slate-400 at 12px. Used for metadata and labels.</p>
          <p className="font-mono text-xs text-primary">Monospace — Teal-400. Used for IDs, codes, and technical values.</p>
        </div>
      </GlassCard>

      {/* Inputs */}
      <GlassCard className="p-6">
        <h2 className="text-lg font-bold text-white mb-4">Inputs</h2>
        <div className="space-y-3 max-w-md">
          <Input placeholder="Standard text input" className="w-full" />
          <Input placeholder="Disabled input" className="w-full" disabled />
          <select className="w-full bg-slate-950/50 border border-teal-500/20 text-foreground text-sm rounded-xl px-4 py-2 focus:outline-none">
            <option>Select option</option>
            <option>Option A</option>
            <option>Option B</option>
          </select>
        </div>
      </GlassCard>

      {/* Glass Card Variants */}
      <GlassCard className="p-6">
        <h2 className="text-lg font-bold text-white mb-4">GlassCard Component</h2>
        <div className="grid grid-cols-3 gap-4">
          <GlassCard className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Default Card</p>
          </GlassCard>
          <GlassCard className="p-4 text-center border-teal-500/40">
            <p className="text-xs text-muted-foreground">Highlighted Card</p>
          </GlassCard>
          <GlassCard className="p-4 text-center border-amber-500/30 bg-amber-950/10">
            <p className="text-xs text-muted-foreground">Warning Card</p>
          </GlassCard>
        </div>
      </GlassCard>
    </div>
  );
}
