import { useState } from 'react';
import { useNavigate } from 'react-router';
import { AlertCircle, ArrowLeft, CheckCircle2, Layers, Plus, Search, Shield } from 'lucide-react';
import { GlassCard, Button, Input, PageHeader, Select, Badge } from '../components/ui/Shared';
import { PLNumberSelect } from '../components/ui/PLNumberSelect';
import { PL_DATABASE, type BOMNode } from '../lib/bomData';
import type { PLNumber } from '../lib/types';
import { usePLItems } from '../hooks/usePLItems';
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

function createRootNode(form: CreateBomForm, selectedPl?: PLNumber) {
  const matchedPL = PL_DATABASE[form.rootPlNumber.trim()];

  const rootNode: BOMNode = {
    id: form.rootPlNumber.trim(),
    name: matchedPL?.name || selectedPl?.name || form.productName.trim(),
    type: matchedPL?.type || 'assembly',
    revision: matchedPL?.revision || 'A',
    quantity: 1,
    findNumber: '1',
    unitOfMeasure: matchedPL?.unitOfMeasure || 'EA',
    tags: matchedPL?.tags?.slice(0, 3) ?? [selectedPl?.category ?? 'Draft'],
    children: [],
  };

  return { matchedPL, rootNode };
}

export default function BOMCreate() {
  const navigate = useNavigate();
  const { data: plItems, loading: plItemsLoading } = usePLItems();
  const [form, setForm] = useState<CreateBomForm>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const matchedPL = form.rootPlNumber.trim() ? PL_DATABASE[form.rootPlNumber.trim()] : undefined;
  const selectedPl = form.rootPlNumber.trim()
    ? plItems.find((item) => item.plNumber === form.rootPlNumber.trim())
    : undefined;

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.productName.trim()) {
      nextErrors.productName = 'Product name is required.';
    }

    if (!form.rootPlNumber.trim()) {
      nextErrors.rootPlNumber = 'Select at least one root PL number.';
    }

    return nextErrors;
  };

  const handleCreate = () => {
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const { rootNode } = createRootNode(form, selectedPl);
    const draft = BomDraftService.create({
      product: {
        id: 'draft',
        name: form.productName.trim(),
        subtitle: form.subtitle.trim() || (matchedPL?.name ?? selectedPl?.name ?? 'Draft BOM workspace'),
        category: form.category,
        description: form.description.trim() || matchedPL?.description || selectedPl?.description || 'Custom BOM created in the frontend workspace.',
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
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Product Name</label>
              <Input
                value={form.productName}
                onChange={(event) => setForm((current) => ({ ...current, productName: event.target.value }))}
                placeholder="e.g. High Capacity Traction Converter Pack"
                className={errors.productName ? 'border-rose-500/60' : ''}
              />
              {errors.productName && <p className="mt-1 text-[11px] text-rose-400">{errors.productName}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Subtitle</label>
              <Input
                value={form.subtitle}
                onChange={(event) => setForm((current) => ({ ...current, subtitle: event.target.value }))}
                placeholder="Optional operator-facing label"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Lifecycle</label>
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
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Category</label>
              <Input
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                placeholder="e.g. Electrical Component"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Description</label>
              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Optional summary for the BOM workspace"
                className="min-h-28 w-full rounded-lg border border-border bg-slate-950/60 px-3 py-3 text-sm text-foreground placeholder:text-slate-600 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/30"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Root PL Number</label>
              <PLNumberSelect
                value={form.rootPlNumber}
                onChange={(rootPlNumber) => setForm((current) => ({ ...current, rootPlNumber }))}
                plItems={plItems}
                loading={plItemsLoading}
                placeholder="Search and select the root PL..."
                helperText="This PL becomes the first node in the BOM. Additional PLs can be added later from the editor."
              />
              {errors.rootPlNumber && <p className="mt-1 text-[11px] text-rose-400">{errors.rootPlNumber}</p>}
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
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Root PL Preview</p>
            </div>
            <div className="p-5">
              {matchedPL || selectedPl ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-white">{matchedPL?.name ?? selectedPl?.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{matchedPL?.description ?? selectedPl?.description}</p>
                    </div>
                    <Badge variant="success">Matched</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">PL Number</p>
                      <p className="font-mono text-primary">{matchedPL?.plNumber ?? selectedPl?.plNumber}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Revision</p>
                      <p className="font-mono text-foreground">{matchedPL?.revision ?? 'A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Type</p>
                      <p className="capitalize text-foreground">{matchedPL?.type ?? 'assembly'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{matchedPL ? 'Department' : 'Agency'}</p>
                      <p className="text-foreground">{matchedPL?.department ?? selectedPl?.controllingAgency ?? '—'}</p>
                    </div>
                  </div>
                  {(matchedPL?.safetyVital || selectedPl?.safetyCritical) && (
                    <div className="flex items-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                      <Shield className="w-3.5 h-3.5" /> Safety-vital root PL
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-xl border border-white/6 bg-slate-950/35 px-4 py-4">
                  <Layers className="mt-0.5 w-4 h-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Enter the first PL to seed the hierarchy</p>
                    <p className="mt-1 text-xs text-muted-foreground">The workspace will start with one top-level node, and the node editor will handle the rest of the assembly structure.</p>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">What happens next</p>
            <div className="mt-4 space-y-3">
              {[
                'The BOM opens with the chosen root PL already placed at the top level.',
                'Engineers can add more PLs from the node editor and drag them up or down the hierarchy.',
                'This stays frontend-local for now so the backend contract can be finalized after the interaction model settles.',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 text-sm text-foreground/90">
                  <CheckCircle2 className="mt-0.5 w-4 h-4 shrink-0 text-primary" />
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
