import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  ArrowRight,
  Briefcase,
  Command,
  Component,
  FileSearch,
  Hash,
  RefreshCcw,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { CommandPalette } from './CommandPalette';

interface PaletteAction {
  id: string;
  label: string;
  description: string;
  path?: string;
  icon: ComponentType<{ className?: string }>;
  roles?: string[];
  action?: () => void;
}

interface PalettePosition {
  x: number;
  y: number;
}

const PALETTE_WIDTH = 320;
const PALETTE_MARGIN = 16;

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest(
      'input, textarea, select, option, [contenteditable="true"], [data-no-context-palette="true"]'
    )
  );
}

export function RightClickPalette() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = useAuth();
  const [open, setOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [position, setPosition] = useState<PalettePosition>({ x: 24, y: 96 });

  const actions = useMemo<PaletteAction[]>(() => [
    {
      id: 'search',
      label: 'Open search explorer',
      description: 'Jump into indexed document and PL search',
      path: '/search',
      icon: FileSearch,
    },
    {
      id: 'pl',
      label: 'Open PL knowledge hub',
      description: 'Browse and manage PL-controlled items',
      path: '/pl',
      icon: Hash,
      roles: ['admin', 'supervisor', 'engineer'],
    },
    {
      id: 'ledger',
      label: 'Log work activity',
      description: 'Go to the work ledger and create a new entry',
      path: '/ledger',
      icon: Briefcase,
      roles: ['admin', 'supervisor', 'engineer'],
    },
    {
      id: 'bom',
      label: 'Create BOM workspace',
      description: 'Start a new BOM draft from the guided creation page',
      path: '/bom/new',
      icon: Component,
      roles: ['admin', 'supervisor', 'engineer'],
    },
    {
      id: 'refresh',
      label: 'Refresh current view',
      description: 'Reload the active route and data surface',
      icon: RefreshCcw,
      action: () => window.location.reload(),
    },
    {
      id: 'command',
      label: 'Open full command palette',
      description: 'Use keyboard-style navigation from the mouse',
      icon: Command,
      action: () => setCommandOpen(true),
    },
  ].filter(action => !action.roles || hasPermission(action.roles as any)), [hasPermission]);

  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      if (event.shiftKey || isInteractiveTarget(event.target)) {
        return;
      }

      event.preventDefault();

      const maxX = Math.max(PALETTE_MARGIN, window.innerWidth - PALETTE_WIDTH - PALETTE_MARGIN);
      const nextX = Math.min(event.clientX, maxX);
      const nextY = Math.min(event.clientY, window.innerHeight - 280);

      setPosition({
        x: Math.max(PALETTE_MARGIN, nextX),
        y: Math.max(88, nextY),
      });
      setOpen(true);
    };

    const handleDismiss = () => setOpen(false);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('click', handleDismiss);
    window.addEventListener('scroll', handleDismiss, true);
    window.addEventListener('resize', handleDismiss);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('click', handleDismiss);
      window.removeEventListener('scroll', handleDismiss, true);
      window.removeEventListener('resize', handleDismiss);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const runAction = (action: PaletteAction) => {
    setOpen(false);

    if (action.action) {
      action.action();
      return;
    }

    if (action.path && action.path !== location.pathname) {
      navigate(action.path);
      return;
    }

    if (action.path) {
      navigate(action.path);
    }
  };

  return (
    <>
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />

      {open && (
        <div
          className="fixed z-[100000] w-80 rounded-2xl border border-cyan-400/18 bg-slate-950/94 shadow-[0_22px_70px_rgba(2,10,20,0.6)] backdrop-blur-xl"
          style={{ left: position.x, top: position.y }}
          onClick={event => event.stopPropagation()}
        >
          <div className="border-b border-white/6 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
              Mouse Palette
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Right-click anywhere on the workspace. Hold <span className="font-mono text-slate-300">Shift</span> for the browser menu.
            </p>
          </div>

          <div className="p-2">
            {actions.map(action => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => runAction(action)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-cyan-400/8"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/6 text-cyan-300">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-100">{action.label}</div>
                    <div className="truncate text-[11px] text-slate-500">{action.description}</div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-600" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
