import { useState } from 'react';
import { GlassCard, Badge, Button, Input, PageHeader } from '../components/ui/Shared';
import { BookOpen, FileText, Search, Plus, Star, StarOff, ArrowRight, Download, Tag, X } from 'lucide-react';
import { toast } from 'sonner';

interface DocumentTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  fields: { label: string; type: 'text' | 'select' | 'date'; required: boolean; options?: string[] }[];
  tags: string[];
  usageCount: number;
  starred: boolean;
  lastUsed?: string;
}

const TEMPLATES: DocumentTemplate[] = [
  {
    id: 'TPL-001', name: 'Maintenance Report', category: 'Maintenance', description: 'Standard maintenance activity report for traction equipment.',
    fields: [
      { label: 'Equipment ID', type: 'text', required: true },
      { label: 'Maintenance Type', type: 'select', required: true, options: ['Preventive', 'Corrective', 'Predictive'] },
      { label: 'Date of Work', type: 'date', required: true },
      { label: 'Technician Name', type: 'text', required: true },
      { label: 'Work Description', type: 'text', required: true },
      { label: 'Next Due Date', type: 'date', required: false },
    ],
    tags: ['maintenance', 'traction', 'report'], usageCount: 47, starred: true, lastUsed: '2026-03-22',
  },
  {
    id: 'TPL-002', name: 'Engineering Change Notice', category: 'Engineering', description: 'Document engineering design changes with impact analysis.',
    fields: [
      { label: 'ECN Number', type: 'text', required: true },
      { label: 'Drawing Number', type: 'text', required: true },
      { label: 'Change Description', type: 'text', required: true },
      { label: 'Reason for Change', type: 'text', required: true },
      { label: 'Effective Date', type: 'date', required: true },
      { label: 'Safety Impact', type: 'select', required: true, options: ['None', 'Low', 'Medium', 'High'] },
    ],
    tags: ['engineering', 'change', 'design'], usageCount: 32, starred: false, lastUsed: '2026-03-18',
  },
  {
    id: 'TPL-003', name: 'Inspection Report', category: 'Quality', description: 'Pre-departure / periodic inspection checklist.',
    fields: [
      { label: 'Loco Number', type: 'text', required: true },
      { label: 'Inspection Type', type: 'select', required: true, options: ['CAT-A', 'CAT-B', 'CAT-C', 'CAT-D', 'IA', 'AOH'] },
      { label: 'Inspector', type: 'text', required: true },
      { label: 'Inspection Date', type: 'date', required: true },
      { label: 'Defects Found', type: 'text', required: false },
      { label: 'Clearance Status', type: 'select', required: true, options: ['Cleared', 'Conditional', 'Failed'] },
    ],
    tags: ['inspection', 'quality', 'loco'], usageCount: 89, starred: true, lastUsed: '2026-03-24',
  },
  {
    id: 'TPL-004', name: 'Discrepancy Report (DR)', category: 'Cases', description: 'Report a component or process discrepancy for investigation.',
    fields: [
      { label: 'DR Number', type: 'text', required: true },
      { label: 'Defect Category', type: 'select', required: true, options: ['Mechanical', 'Electrical', 'Hydraulic', 'Software', 'Structural'] },
      { label: 'Reported By', type: 'text', required: true },
      { label: 'Date Found', type: 'date', required: true },
      { label: 'Root Cause (preliminary)', type: 'text', required: false },
      { label: 'Severity', type: 'select', required: true, options: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    ],
    tags: ['cases', 'discrepancy', 'quality'], usageCount: 21, starred: false, lastUsed: '2026-03-15',
  },
  {
    id: 'TPL-005', name: 'Technical Specification', category: 'Engineering', description: 'Define technical requirements for a component or system.',
    fields: [
      { label: 'Spec Number', type: 'text', required: true },
      { label: 'Part / System Name', type: 'text', required: true },
      { label: 'Standard Reference', type: 'text', required: false },
      { label: 'Safety Classification', type: 'select', required: true, options: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
      { label: 'Effective Date', type: 'date', required: true },
    ],
    tags: ['engineering', 'specification', 'technical'], usageCount: 15, starred: false,
  },
  {
    id: 'TPL-006', name: 'Work Order Form', category: 'Maintenance', description: 'Authorize and track a maintenance work order.',
    fields: [
      { label: 'WO Number', type: 'text', required: true },
      { label: 'Priority', type: 'select', required: true, options: ['Routine', 'Urgent', 'Emergency'] },
      { label: 'Assigned To', type: 'text', required: true },
      { label: 'Scheduled Date', type: 'date', required: true },
      { label: 'Estimated Hours', type: 'text', required: false },
    ],
    tags: ['work', 'maintenance', 'order'], usageCount: 63, starred: true, lastUsed: '2026-03-21',
  },
];

const CATEGORIES = ['All', ...Array.from(new Set(TEMPLATES.map(t => t.category)))];

export default function DocumentTemplates() {
  const [templates, setTemplates] = useState(TEMPLATES);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [previewTemplate, setPreviewTemplate] = useState<DocumentTemplate | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);

  const filtered = templates.filter(t => {
    const matchCat = activeCategory === 'All' || t.category === activeCategory;
    const matchQ = !query || t.name.toLowerCase().includes(query.toLowerCase()) || t.tags.some(tag => tag.includes(query.toLowerCase()));
    return matchCat && matchQ;
  });

  const starred = filtered.filter(t => t.starred);
  const unstarred = filtered.filter(t => !t.starred);

  const toggleStar = (id: string) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, starred: !t.starred } : t));
  };

  const useTemplate = (tpl: DocumentTemplate) => {
    setPreviewTemplate(tpl);
    setFormValues({});
    setShowForm(true);
    setTemplates(prev => prev.map(t => t.id === tpl.id ? { ...t, usageCount: t.usageCount + 1, lastUsed: new Date().toISOString().split('T')[0] } : t));
  };

  const submitForm = () => {
    toast.success(`Created document from "${previewTemplate?.name}" template`);
    setShowForm(false);
    setPreviewTemplate(null);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PageHeader title="Document Templates" subtitle="Start a document from a pre-filled template to ensure consistency.">
        <Button size="sm" className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Template
        </Button>
      </PageHeader>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search templates..." className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeCategory === cat ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'bg-slate-800/50 text-slate-400 border border-white/6 hover:border-white/12'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Template Use Form Modal */}
      {showForm && previewTemplate && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <GlassCard className="w-full max-w-lg p-6 relative">
            <button onClick={() => setShowForm(false)} className="absolute top-4 right-4"><X className="w-4 h-4 text-slate-500 hover:text-white" /></button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-teal-500/15 flex items-center justify-center"><BookOpen className="w-4 h-4 text-teal-400" /></div>
              <div>
                <h3 className="text-sm font-semibold text-white">{previewTemplate.name}</h3>
                <p className="text-xs text-slate-500">{previewTemplate.category}</p>
              </div>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {previewTemplate.fields.map(field => (
                <div key={field.label}>
                  <label className="text-xs text-slate-400 mb-1 block">{field.label} {field.required && <span className="text-rose-400">*</span>}</label>
                  {field.type === 'select' ? (
                    <select value={formValues[field.label] || ''} onChange={e => setFormValues(p => ({ ...p, [field.label]: e.target.value }))} className="w-full bg-slate-800/50 border border-white/8 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-teal-500/50">
                      <option value="">Select...</option>
                      {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <Input type={field.type === 'date' ? 'text' : 'text'} value={formValues[field.label] || ''} onChange={e => setFormValues(p => ({ ...p, [field.label]: e.target.value }))} placeholder={field.type === 'date' ? 'YYYY-MM-DD' : `Enter ${field.label.toLowerCase()}...`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <Button onClick={submitForm} className="flex-1">Create Document</Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Starred */}
      {starred.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Star className="w-3.5 h-3.5 text-amber-400" /> Starred Templates</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {starred.map(tpl => <TemplateCard key={tpl.id} tpl={tpl} onStar={toggleStar} onUse={useTemplate} />)}
          </div>
        </div>
      )}

      {/* All */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">All Templates</h2>
        {unstarred.length === 0 && starred.length === 0 ? (
          <GlassCard className="p-10 text-center text-slate-500 text-sm">No templates match your search.</GlassCard>
        ) : unstarred.length === 0 ? null : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {unstarred.map(tpl => <TemplateCard key={tpl.id} tpl={tpl} onStar={toggleStar} onUse={useTemplate} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function TemplateCard({ tpl, onStar, onUse }: { tpl: DocumentTemplate; onStar: (id: string) => void; onUse: (tpl: DocumentTemplate) => void }) {
  return (
    <GlassCard className="p-5 flex flex-col gap-3 hover:border-teal-500/30 transition-all group">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center"><FileText className="w-4 h-4 text-teal-400" /></div>
          <div>
            <div className="text-sm font-semibold text-white">{tpl.name}</div>
            <div className="text-xs text-slate-500">{tpl.category}</div>
          </div>
        </div>
        <button onClick={() => onStar(tpl.id)} className="text-slate-600 hover:text-amber-400 transition-colors">
          {tpl.starred ? <Star className="w-4 h-4 text-amber-400" /> : <StarOff className="w-4 h-4" />}
        </button>
      </div>
      <p className="text-xs text-slate-500 leading-relaxed">{tpl.description}</p>
      <div className="flex flex-wrap gap-1">
        {tpl.tags.map(tag => (
          <span key={tag} className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-slate-800/50 text-slate-400 rounded"><Tag className="w-2.5 h-2.5" /> {tag}</span>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-slate-600 mt-auto pt-2 border-t border-white/5">
        <span>Used {tpl.usageCount}×</span>
        {tpl.lastUsed && <span>Last: {tpl.lastUsed}</span>}
      </div>
      <Button onClick={() => onUse(tpl)} size="sm" className="w-full flex items-center justify-center gap-2 mt-1">
        Use Template <ArrowRight className="w-3.5 h-3.5" />
      </Button>
    </GlassCard>
  );
}
