import { useState } from 'react';
import { useNavigate } from 'react-router';
import { AlertCircle, ArrowLeft, CheckCircle2, Layers, Plus, Search, Shield } from 'lucide-react';
import { GlassCard, Button, Input, PageHeader, Select, Badge } from '../components/ui/Shared';
import { PL_DATABASE, type BOMNode } from '../lib/bomData';
import { BomDraftService } from '../services/BomDraftService';

type LifecycleOption = 'In Development' | 'Production' | 'Prototyping';

interface CreateBomForm {
  productName: string;
  subtitle: string;
  category: string;
  description: string;
  lifecycle: LifecycleOption;
  rootPlNumber: string;
}

const DEFAULT_FORM: CreateBomForm = {
  productName: '',
  subtitle: '',
  category: 'Custom BOM',
  description: '',
  lifecycle: 'In Development',
  rootPlNumber: '',
};

function createRootNode(form: CreateBomForm) {
  const matchedPL = PL_DATABASE[form.rootPlNumber.trim()];

  const rootNode: BOMNode = {
    id: form.rootPlNumber.trim(),
    name: matchedPL?.name || form.productName.trim(),
    type: matchedPL?.type || 'assembly',
    revision: matchedPL?.revision || 'A',
    quantity: 1,
    findNumber: '1',
    unitOfMeasure: matchedPL?.unitOfMeasure || 'EA',
    tags: matchedPL?.tags?.slice(0, 3) ?? ['Draft'],
    children: [],
  };

  return { matchedPL, rootNode };
}

export default function BOMCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState<CreateBomForm>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lookupTouched, setLookupTouched] = useState(false);

  const matchedPL = form.rootPlNumber.trim() ? PL_DATABASE[form.rootPlNumber.trim()] : undefined;

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.productName.trim()) {
      nextErrors.productName = 'Product name is required.';
    }

    if (!/^\d{8}$/.test(form.rootPlNumber.trim())) {
      nextErrors.rootPlNumber = 'Enter at least one 8-digit root PL number.';
    }

    return nextErrors;
  };

  const handleCreate = () => {
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const { rootNode } = createRootNode(form);
    const draft = BomDraftService.create({
      product: {
        id: 'draft',
        name: form.productName.trim(),
        subtitle: form.subtitle.trim() || (matchedPL?.name ?? 'Draft BOM workspace'),
        category: form.category,
        description: form.description.trim() || matchedPL?.description || 'Custom BOM created in the frontend workspace.',
        rootPL: rootNode.id,
        revision: rootNode.revision,
        lifecycle: form.lifecycle,
        icon: 'Layers',
      },
      tree: [rootNode],
    });

    navigate(`/bom/${draft.id}`);
  };

  return (
    <div className="space-y-6 max-w-[1180px] mx-auto">
      <PageHeader
        title="Create New BOM"
        subtitle="Start with a product name and one root PL. The workspace will open with that PL as the first node, and you can continue building the hierarchy from there."
        actions={(
          <Button variant="secondary" size="sm" onClick={() => navigate('/bom')}>
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Explorer
          </Button>
        )}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_360px]">
        <GlassCard className="p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Product Name</label>
              <Input
                value={form.productName}
                onChange={(event) => setForm((current) => ({ ...current, productName: event.target.value }))}
                placeholder="e.g. High Capacity Traction Converter Pack"
                className={errors.productName ? 'border-rose-500/60' : ''}
              />
              {errors.productName && <p className="mt-1 text-[11px] text-rose-400">{errors.productName}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Subtitle</label>
              <Input
                value={form.subtitle}
                onChange={(event) => setForm((current) => ({ ...current, subtitle: event.target.value }))}
                placeholder="Optional operator-facing label"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Lifecycle</label>
              <Select
                value={form.lifecycle}
                onChange={(event) => setForm((current) => ({ ...current, lifecycle: event.target.value as LifecycleOption }))}
              >
                <option value="In Development">In Development</option>
                <option value="Production">Production</option>
                <option value="Prototyping">Prototyping</option>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Category</label>
              <Input
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                placeholder="e.g. Electrical Component"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Description</label>
              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Optional summary for the BOM workspace"
                className="min-h-28 w-full rounded-lg border border-slate-700/50 bg-slate-950/60 px-3 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/30"
              />
            </div>

            <div className="md:col-span-2">
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label className="block text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Root PL Number</label>
                <button
                  type="button"
                  onClick={() => setLookupTouched(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-400 transition-colors hover:text-teal-300"
                >
                  <Search className="w-3 h-3" /> Check PL
                </button>
              </div>
              <Input
                value={form.rootPlNumber}
                onChange={(event) => {
                  setLookupTouched(false);
                  setForm((current) => ({ ...current, rootPlNumber: event.target.value.replace(/\D/g, '').slice(0, 8) }));
                }}
                placeholder="8-digit PL number"
                className={`font-mono ${errors.rootPlNumber ? 'border-rose-500/60' : ''}`}
              />
              {errors.rootPlNumber && <p className="mt-1 text-[11px] text-rose-400">{errors.rootPlNumber}</p>}
              <p className="mt-2 text-[11px] text-slate-500">This PL becomes the first node in the BOM. Additional PLs can be added later from the editor.</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/6 pt-5">
            <Button variant="secondary" onClick={() => navigate('/bom')}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4" /> Create BOM Workspace
            </Button>
          </div>
        </GlassCard>

        <div className="space-y-4">
          <GlassCard className="overflow-hidden">
            <div className="border-b border-white/6 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Root PL Preview</p>
            </div>
            <div className="p-5">
              {matchedPL ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-white">{matchedPL.name}</p>
                      <p className="mt-1 text-xs text-slate-400">{matchedPL.description}</p>
                    </div>
                    <Badge variant="success">Matched</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-slate-500">PL Number</p>
                      <p className="font-mono text-teal-400">{matchedPL.plNumber}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Revision</p>
                      <p className="font-mono text-slate-200">{matchedPL.revision}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Type</p>
                      <p className="capitalize text-slate-200">{matchedPL.type}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Department</p>
                      <p className="text-slate-200">{matchedPL.department}</p>
                    </div>
                  </div>
                  {matchedPL.safetyVital && (
                    <div className="flex items-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                      <Shield className="w-3.5 h-3.5" /> Safety-vital root PL
                    </div>
                  )}
                </div>
              ) : form.rootPlNumber.length === 8 && lookupTouched ? (
                <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-4">
                  <AlertCircle className="mt-0.5 w-4 h-4 shrink-0 text-amber-400" />
                  <div>
                    <p className="text-sm font-medium text-amber-300">PL not found in the current frontend catalog</p>
                    <p className="mt-1 text-xs text-slate-400">You can still create the BOM draft with this PL number now and bind it to the real backend PL record later.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-xl border border-white/6 bg-slate-950/35 px-4 py-4">
                  <Layers className="mt-0.5 w-4 h-4 shrink-0 text-teal-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-200">Enter the first PL to seed the hierarchy</p>
                    <p className="mt-1 text-xs text-slate-500">The workspace will start with one top-level node, and the node editor will handle the rest of the assembly structure.</p>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">What happens next</p>
            <div className="mt-4 space-y-3">
              {[
                'The BOM opens with the chosen root PL already placed at the top level.',
                'Engineers can add more PLs from the node editor and drag them up or down the hierarchy.',
                'This stays frontend-local for now so the backend contract can be finalized after the interaction model settles.',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 text-sm text-slate-300">
                  <CheckCircle2 className="mt-0.5 w-4 h-4 shrink-0 text-teal-400" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
