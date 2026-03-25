import { useState } from 'react';
import { GlassCard, Badge, Button, Input } from '../components/ui/Shared';
import { DatePicker } from '../components/ui/DatePicker';
import { MOCK_BANNERS } from '../lib/mockExtended';
import { Megaphone, Plus, Edit3, Trash2, Eye, X, AlertCircle } from 'lucide-react';

export default function BannerManagement() {
  const [banners, setBanners] = useState(MOCK_BANNERS);
  const [showForm, setShowForm] = useState(false);
  const [editBanner, setEditBanner] = useState<typeof MOCK_BANNERS[0] | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newValidFrom, setNewValidFrom] = useState('');
  const [newValidTo, setNewValidTo] = useState('');

  const toggleActive = (id: string) => {
    setBanners(b => b.map(x => x.id === id ? { ...x, active: !x.active } : x));
  };

  const deleteBanner = (id: string) => {
    setBanners(b => b.filter(x => x.id !== id));
  };

  const handleCreate = () => {
    if (!newTitle || !newMessage) return;
    const nb = {
      id: `BNR-${Date.now()}`,
      title: newTitle,
      message: newMessage,
      link: null,
      active: true,
      validFrom: newValidFrom || new Date().toISOString().split('T')[0],
      validTo: newValidTo,
      order: banners.length + 1,
    };
    setBanners(b => [...b, nb]);
    setNewTitle('');
    setNewMessage('');
    setNewValidFrom('');
    setNewValidTo('');
    setShowForm(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Announcement Management</h1>
          <p className="text-slate-400 text-sm">Create and manage running banner announcements visible to all users.</p>
        </div>
        <Button onClick={() => { setEditBanner(null); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> New Announcement
        </Button>
      </div>

      <GlassCard className="p-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Live Preview</h3>
        <div className="bg-gradient-to-r from-teal-900 to-emerald-900 border border-teal-500/30 text-teal-100 text-xs px-4 py-2 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-teal-400" />
          <div className="flex-1 overflow-hidden">
            {banners.filter(b => b.active).length > 0 ? (
              <div className="flex gap-8 animate-pulse">
                {banners.filter(b => b.active).map(b => (
                  <span key={b.id}><span className="font-semibold">{b.title}:</span> {b.message}</span>
                ))}
              </div>
            ) : (
              <span className="text-teal-300/50">No active announcements</span>
            )}
          </div>
        </div>
      </GlassCard>

      <div className="space-y-3">
        {banners.map(banner => (
          <GlassCard key={banner.id} className={`p-4 ${!banner.active ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <Megaphone className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-sm font-semibold text-slate-200">{banner.title}</span>
                  <Badge variant={banner.active ? 'success' : 'default'}>{banner.active ? 'Active' : 'Inactive'}</Badge>
                  <span className="font-mono text-xs text-teal-400">{banner.id}</span>
                </div>
                <p className="text-sm text-slate-400 pl-7">{banner.message}</p>
                <div className="flex gap-4 text-xs text-slate-600 mt-1 pl-7">
                  <span>From: {banner.validFrom}</span>
                  {banner.validTo && <span>To: {banner.validTo}</span>}
                  {banner.link && <span>Link: {banner.link}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActive(banner.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    banner.active
                      ? 'bg-slate-800 border-slate-600 text-slate-400 hover:text-slate-200'
                      : 'bg-teal-500/10 border-teal-500/30 text-teal-400 hover:bg-teal-500/20'
                  }`}
                >
                  {banner.active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => { setEditBanner(banner); setNewTitle(banner.title); setNewMessage(banner.message); setShowForm(true); }}
                  className="p-1.5 rounded-lg bg-slate-800/50 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteBanner(banner.id)}
                  className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">{editBanner ? 'Edit Announcement' : 'New Announcement'}</h2>
              <button onClick={() => { setShowForm(false); setEditBanner(null); setNewTitle(''); setNewMessage(''); setNewValidFrom(''); setNewValidTo(''); }} className="text-slate-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Title</label>
                <Input className="w-full" placeholder="e.g. System Maintenance" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Message</label>
                <textarea
                  className="w-full bg-slate-950/50 border border-teal-500/20 text-slate-200 text-sm rounded-xl px-4 py-2 focus:outline-none focus:border-teal-400/50 resize-none placeholder:text-slate-500"
                  rows={3}
                  placeholder="Announcement message visible to all users..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Valid From</label>
                  <DatePicker value={newValidFrom} onChange={setNewValidFrom} placeholder="From date" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Valid To</label>
                  <DatePicker value={newValidTo} onChange={setNewValidTo} placeholder="To date" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button className="flex-1" onClick={handleCreate}>
                {editBanner ? 'Save Changes' : 'Create Announcement'}
              </Button>
              <Button variant="secondary" onClick={() => { setShowForm(false); setEditBanner(null); setNewTitle(''); setNewMessage(''); setNewValidFrom(''); setNewValidTo(''); }}>Cancel</Button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
