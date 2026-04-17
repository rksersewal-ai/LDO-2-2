import { useState } from "react";
import { GlassCard, Badge, Button, Input } from "../components/ui/Shared";
import { MOCK_BANNERS } from "../lib/mockExtended";
import {
  Megaphone,
  Plus,
  Edit3,
  Trash2,
  Eye,
  X,
  GripVertical,
  AlertCircle,
} from "lucide-react";

export default function BannerManagement() {
  const [banners, setBanners] = useState(MOCK_BANNERS);
  const [showForm, setShowForm] = useState(false);
  const [editBanner, setEditBanner] = useState<(typeof MOCK_BANNERS)[0] | null>(
    null,
  );

  const toggleActive = (id: string) => {
    setBanners((b) =>
      b.map((x) => (x.id === id ? { ...x, active: !x.active } : x)),
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl text-white mb-2" style={{ fontWeight: 700 }}>
            Announcement Management
          </h1>
          <p className="text-slate-400 text-sm">
            Create and manage running banner announcements visible to all users.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditBanner(null);
            setShowForm(true);
          }}
        >
          <Plus className="w-4 h-4" /> New Announcement
        </Button>
      </div>

      {/* Preview */}
      <GlassCard className="p-4">
        <h3
          className="text-xs text-slate-500 uppercase tracking-widest mb-3"
          style={{ fontWeight: 700 }}
        >
          Live Preview
        </h3>
        <div className="bg-gradient-to-r from-teal-900 to-emerald-900 border border-teal-500/30 text-teal-100 text-xs px-4 py-2 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <div className="flex-1 overflow-hidden">
            <div className="flex gap-8 animate-marquee">
              {banners
                .filter((b) => b.active)
                .map((b) => (
                  <span key={b.id}>
                    <span style={{ fontWeight: 600 }}>{b.title}:</span>{" "}
                    {b.message}
                  </span>
                ))}
              {banners.filter((b) => b.active).length === 0 && (
                <span className="text-teal-300/50">
                  No active announcements
                </span>
              )}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Banners List */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="divide-y divide-slate-800/50">
          {banners.map((b, i) => (
            <div
              key={b.id}
              className="flex items-center gap-4 p-4 hover:bg-slate-800/20 transition-colors"
            >
              <GripVertical className="w-4 h-4 text-slate-600 cursor-grab" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3
                    className="text-sm text-slate-200"
                    style={{ fontWeight: 600 }}
                  >
                    {b.title}
                  </h3>
                  <Badge variant={b.active ? "success" : "default"}>
                    {b.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 truncate">{b.message}</p>
                <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1">
                  <span>Order: {b.order}</span>
                  <span>
                    Valid: {b.validFrom} → {b.validTo}
                  </span>
                  {b.link && <span>Link: {b.link}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActive(b.id)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${b.active ? "bg-teal-500" : "bg-slate-700"}`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${b.active ? "translate-x-5" : "translate-x-0.5"}`}
                  />
                </button>
                <Button
                  variant="ghost"
                  className="px-2 py-1"
                  onClick={() => {
                    setEditBanner(b);
                    setShowForm(true);
                  }}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  className="px-2 py-1 text-rose-400 hover:bg-rose-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        {banners.length === 0 && (
          <div className="py-16 text-center text-slate-500">
            No announcements configured.
          </div>
        )}
      </GlassCard>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
          onClick={() => setShowForm(false)}
        >
          <GlassCard
            className="w-full max-w-lg p-6"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg text-white" style={{ fontWeight: 700 }}>
                {editBanner ? "Edit Announcement" : "New Announcement"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  Title
                </label>
                <Input
                  className="w-full"
                  defaultValue={editBanner?.title}
                  placeholder="Announcement title"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  Message
                </label>
                <textarea
                  className="w-full bg-slate-950/50 border border-teal-500/20 text-slate-200 text-sm rounded-xl px-4 py-2 focus:outline-none focus:border-teal-400/50 h-24 resize-none"
                  defaultValue={editBanner?.message}
                  placeholder="Announcement message..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">
                    Valid From
                  </label>
                  <Input
                    type="date"
                    className="w-full"
                    defaultValue={editBanner?.validFrom}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">
                    Valid To
                  </label>
                  <Input
                    type="date"
                    className="w-full"
                    defaultValue={editBanner?.validTo}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  Link Target (optional)
                </label>
                <Input
                  className="w-full"
                  defaultValue={editBanner?.link || ""}
                  placeholder="/documents or URL"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button className="flex-1" onClick={() => setShowForm(false)}>
                  {editBanner ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      <style>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { display: flex; gap: 2rem; /* animation: marquee 20s linear infinite; */ }
      `}</style>
    </div>
  );
}
