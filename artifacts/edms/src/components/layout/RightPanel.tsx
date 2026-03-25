import { X, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export interface RightPanelContent {
  title: string;
  icon?: React.ReactNode;
  sections: Array<{
    heading: string;
    content: React.ReactNode;
  }>;
}

interface RightPanelProps {
  content: RightPanelContent | null;
  onClose: () => void;
}

export function RightPanel({ content, onClose }: RightPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set([0])
  );

  if (!content) return null;

  const toggleSection = (index: number) => {
    const next = new Set(expandedSections);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setExpandedSections(next);
  };

  return (
    <aside className="w-96 border-l border-slate-700/50 bg-slate-900/40 backdrop-blur-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/30 shrink-0">
        <div className="flex items-center gap-3">
          {content.icon && <div className="text-teal-400">{content.icon}</div>}
          <h2 className="text-sm font-semibold text-white">{content.title}</h2>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="divide-y divide-slate-700/30">
          {content.sections.map((section, i) => (
            <div key={i} className="border-slate-700/30">
              <button
                onClick={() => toggleSection(i)}
                className="w-full flex items-center justify-between px-6 py-3 hover:bg-slate-800/30 transition-colors"
              >
                <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  {section.heading}
                </h3>
                <ChevronDown
                  className={`w-4 h-4 text-slate-600 transition-transform ${
                    expandedSections.has(i) ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {expandedSections.has(i) && (
                <div className="px-6 py-3 bg-slate-950/40 border-t border-slate-700/20 text-sm text-slate-300">
                  {section.content}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
