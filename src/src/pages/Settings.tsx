import { useState } from 'react';
import { GlassCard, Button, Input } from '../components/ui/Shared';
import { Settings as SettingsIcon, Save, RotateCcw, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react';

const settingGroups = [
  {
    label: 'UI & Display',
    settings: [
      { key: 'theme', label: 'Theme Mode', type: 'select', options: ['Dark (Default)', 'System'], value: 'Dark (Default)' },
      { key: 'density', label: 'Table Row Density', type: 'select', options: ['Comfortable', 'Compact', 'Spacious'], value: 'Comfortable' },
      { key: 'animations', label: 'Enable Animations', type: 'toggle', value: true },
    ]
  },
  {
    label: 'OCR Engine',
    settings: [
      { key: 'ocr_auto', label: 'Auto-run OCR on Upload', type: 'toggle', value: true },
      { key: 'ocr_confidence', label: 'Minimum Confidence Threshold (%)', type: 'input', value: '75' },
      { key: 'ocr_retries', label: 'Max Auto-Retries on Failure', type: 'select', options: ['0', '1', '2', '3'], value: '1' },
    ]
  },
  {
    label: 'Document Defaults',
    settings: [
      { key: 'default_status', label: 'Default New Document Status', type: 'select', options: ['Draft', 'Pending Review'], value: 'Draft' },
      { key: 'obsolete_visible', label: 'Show Obsolete Documents by Default', type: 'toggle', value: false },
      { key: 'revision_format', label: 'Revision Numbering Format', type: 'select', options: ['A.1, A.2, B.0...', '1.0, 1.1, 2.0...'], value: 'A.1, A.2, B.0...' },
    ]
  },
  {
    label: 'System & Operational',
    settings: [
      { key: 'session_timeout', label: 'Session Timeout (minutes)', type: 'input', value: '30' },
      { key: 'audit_retention', label: 'Audit Log Retention (days)', type: 'input', value: '365' },
      { key: 'max_upload', label: 'Max Upload Size (MB)', type: 'input', value: '50' },
    ]
  },
];

export default function Settings() {
  const [activeGroup, setActiveGroup] = useState(settingGroups[0].label);
  const [saved, setSaved] = useState(false);
  const [values, setValues] = useState<Record<string, any>>(() => {
    const v: Record<string, any> = {};
    settingGroups.forEach(g => g.settings.forEach(s => { v[s.key] = s.value; }));
    return v;
  });

  const group = settingGroups.find(g => g.label === activeGroup)!;

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl text-white mb-2" style={{ fontWeight: 700 }}>Settings</h1>
        <p className="text-slate-400 text-sm">Application configuration and system defaults.</p>
      </div>

      {saved && (
        <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-teal-400" />
          <span className="text-sm text-teal-300">Settings saved successfully.</span>
        </div>
      )}

      <div className="flex gap-6">
        {/* Left: Category Nav */}
        <div className="w-56 shrink-0 space-y-1">
          {settingGroups.map(g => (
            <button
              key={g.label}
              onClick={() => setActiveGroup(g.label)}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-colors flex items-center justify-between ${activeGroup === g.label ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'}`}
              style={{ fontWeight: activeGroup === g.label ? 600 : 400 }}
            >
              {g.label}
              <ChevronRight className={`w-4 h-4 ${activeGroup === g.label ? 'text-teal-400' : 'text-slate-600'}`} />
            </button>
          ))}
        </div>

        {/* Right: Settings Form */}
        <GlassCard className="flex-1 p-6">
          <h2 className="text-lg text-white mb-6" style={{ fontWeight: 700 }}>{group.label}</h2>
          <div className="space-y-6">
            {group.settings.map(s => (
              <div key={s.key} className="flex items-center justify-between gap-6">
                <label className="text-sm text-slate-300 shrink-0" style={{ fontWeight: 500 }}>{s.label}</label>
                {s.type === 'select' && (
                  <select
                    value={values[s.key]}
                    onChange={e => setValues(v => ({ ...v, [s.key]: e.target.value }))}
                    className="bg-slate-950/50 border border-teal-500/20 text-slate-200 text-sm rounded-xl px-4 py-2 focus:outline-none w-56"
                  >
                    {s.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                )}
                {s.type === 'input' && (
                  <Input
                    value={values[s.key]}
                    onChange={e => setValues(v => ({ ...v, [s.key]: e.target.value }))}
                    className="w-56"
                  />
                )}
                {s.type === 'toggle' && (
                  <button
                    onClick={() => setValues(v => ({ ...v, [s.key]: !v[s.key] }))}
                    className={`w-12 h-6 rounded-full transition-colors relative ${values[s.key] ? 'bg-teal-500' : 'bg-slate-700'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${values[s.key] ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-8 pt-6 border-t border-slate-700/50">
            <Button onClick={handleSave}><Save className="w-4 h-4" /> Save Changes</Button>
            <Button variant="ghost"><RotateCcw className="w-4 h-4" /> Reset Defaults</Button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
