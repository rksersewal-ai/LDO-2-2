import { useState } from 'react';
import { MOCK_NOTIFICATIONS } from '../../lib/mockExtended';
import { Bell, CheckSquare, FileSearch, ShieldAlert, ServerCog, Briefcase, X, Check } from 'lucide-react';

const typeIcon: Record<string, any> = {
  approval: CheckSquare,
  ocr: FileSearch,
  case: ShieldAlert,
  system: ServerCog,
  work: Briefcase,
};
const typeColor: Record<string, string> = {
  approval: 'text-amber-400 bg-amber-500/10',
  ocr: 'text-teal-400 bg-teal-500/10',
  case: 'text-rose-400 bg-rose-500/10',
  system: 'text-blue-400 bg-blue-500/10',
  work: 'text-slate-400 bg-slate-500/10',
};

export function NotificationPanel({ onClose }: { onClose: () => void }) {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const unread = notifications.filter(n => !n.read).length;

  const markAllRead = () => setNotifications(n => n.map(x => ({ ...x, read: true })));

  return (
    <div className="absolute top-full right-0 mt-2 w-96 bg-slate-900/95 backdrop-blur-xl border border-teal-500/20 rounded-2xl shadow-2xl shadow-teal-950/50 z-50 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
        <h3 className="text-sm text-white" style={{ fontWeight: 700 }}>Notifications {unread > 0 && <span className="text-xs text-teal-400 ml-1">({unread} new)</span>}</h3>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button onClick={markAllRead} className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1">
              <Check className="w-3 h-3" /> Mark all read
            </button>
          )}
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">No notifications</div>
        ) : (
          notifications.map(n => {
            const Icon = typeIcon[n.type] || Bell;
            return (
              <div key={n.id} className={`flex items-start gap-3 p-3 border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer transition-colors ${!n.read ? 'bg-slate-800/20' : ''}`}>
                <div className={`w-8 h-8 rounded-lg ${typeColor[n.type]} flex items-center justify-center shrink-0 mt-0.5`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-200" style={{ fontWeight: 600 }}>{n.title}</span>
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{n.message}</p>
                  <span className="text-[10px] text-slate-600 mt-1 block">{n.time}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
