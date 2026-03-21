import { useEffect, useState, useCallback } from 'react';
import { Plus, ChevronDown, CalendarRange, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';

const STATUS_CFG = {
  pending:  { label: 'Pending',  color: 'bg-yellow-100 text-yellow-700', icon: <Clock size={13} /> },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700',  icon: <CheckCircle2 size={13} /> },
  denied:   { label: 'Denied',   color: 'bg-red-100 text-red-600',      icon: <XCircle size={13} /> },
};

const TYPE_LABELS = {
  vacation:    'Vacation',
  sick:        'Sick Leave',
  personal:    'Personal Day',
  bereavement: 'Bereavement',
  other:       'Other',
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.pending;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function RequestModal({ onClose, onSave }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ start_date: '', end_date: '', type: 'vacation', notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const days = form.start_date && form.end_date
    ? differenceInCalendarDays(parseISO(form.end_date), parseISO(form.start_date)) + 1
    : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (days < 1) { setError('End date must be on or after start date.'); return; }
    setLoading(true);
    setError('');
    try {
      const { data, error: err } = await supabase
        .from('time_off_requests')
        .insert({
          user_id: user.id,
          start_date: form.start_date,
          end_date: form.end_date,
          type: form.type,
          notes: form.notes || null,
          status: 'pending',
          created_at: new Date().toISOString(),
        })
        .select('*, profile:profiles(id, full_name)')
        .single();
      if (err) throw err;
      onSave(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-[18px] font-bold text-[#1d1d1f] mb-5">Request Time Off</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[#86868b] mb-1">Type</label>
            <div className="relative">
              <select
                value={form.type}
                onChange={e => set('type', e.target.value)}
                className="w-full appearance-none border border-[#d2d2d7] rounded-lg px-3 py-2 text-[14px] bg-white pr-7 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-3 text-[#86868b] pointer-events-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-[#86868b] mb-1">Start Date *</label>
              <input
                required
                type="date"
                value={form.start_date}
                onChange={e => set('start_date', e.target.value)}
                className="w-full border border-[#d2d2d7] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#86868b] mb-1">End Date *</label>
              <input
                required
                type="date"
                value={form.end_date}
                min={form.start_date}
                onChange={e => set('end_date', e.target.value)}
                className="w-full border border-[#d2d2d7] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {days > 0 && (
            <p className="text-[12px] text-[#0071e3] font-medium">{days} day{days !== 1 ? 's' : ''} requested</p>
          )}
          <div>
            <label className="block text-[12px] font-medium text-[#86868b] mb-1">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              placeholder="Any details for your manager…"
              className="w-full border border-[#d2d2d7] rounded-lg px-3 py-2 text-[14px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-[12px] text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-[#d2d2d7] text-[14px] font-medium hover:bg-[#f5f5f7]">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2 rounded-lg bg-[#0071e3] text-white text-[14px] font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TimeOff() {
  const { user, profile } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [view, setView] = useState('mine'); // mine | all

  const isManager = ['admin', 'director', 'manager', 'hr_manager'].includes(profile?.role);

  const load = useCallback(async () => {
    if (!user) return;
    let query = supabase
      .from('time_off_requests')
      .select('*, profile:profiles(id, full_name)')
      .order('created_at', { ascending: false });

    if (view === 'mine') query = query.eq('user_id', user.id);

    const { data } = await query;
    setRequests(data ?? []);
    setLoading(false);
  }, [user, view]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id, status) => {
    const { data, error } = await supabase
      .from('time_off_requests')
      .update({ status, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, profile:profiles(id, full_name)')
      .single();
    if (!error) {
      setRequests(prev => prev.map(r => r.id === id ? data : r));
    }
  };

  const addRequest = (req) => setRequests(prev => [req, ...prev]);

  const pending = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-[22px] font-bold text-[#1d1d1f]">Time Off</h1>
          {pending > 0 && isManager && view === 'all' && (
            <span className="bg-yellow-400 text-yellow-900 text-xs font-semibold px-2 py-0.5 rounded-full">{pending} pending</span>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#0071e3] text-white px-4 py-2 rounded-xl text-[13px] font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={15} /> Request Time Off
        </button>
      </div>

      {isManager && (
        <div className="flex gap-1 bg-[#f5f5f7] rounded-lg p-1 w-fit">
          {['mine', 'all'].map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-md text-[13px] font-medium capitalize transition-all ${
                view === v ? 'bg-white shadow-sm text-[#1d1d1f]' : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              {v === 'mine' ? 'My Requests' : 'All Team'}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-[14px] text-[#86868b]">Loading…</p>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <CalendarRange size={36} className="text-[#d1d1d6]" />
          <p className="text-[15px] font-medium text-[#1d1d1f]">No time off requests</p>
          <p className="text-[13px] text-[#86868b]">Submit a request using the button above.</p>
        </div>
      ) : (
        <div className="border border-[#e5e5ea] rounded-2xl overflow-hidden bg-white divide-y divide-[#f5f5f7]">
          {requests.map(r => {
            const days = differenceInCalendarDays(parseISO(r.end_date), parseISO(r.start_date)) + 1;
            return (
              <div key={r.id} className="flex items-center gap-4 px-5 py-4 hover:bg-[#f5f5f7] transition-colors">
                <CalendarRange size={18} className="text-[#86868b] shrink-0" />
                <div className="flex-1 min-w-0">
                  {view === 'all' && r.profile?.full_name && (
                    <p className="text-[11px] font-semibold text-[#86868b] mb-0.5">{r.profile.full_name}</p>
                  )}
                  <p className="text-[14px] font-medium text-[#1d1d1f]">
                    {TYPE_LABELS[r.type] ?? r.type}
                    <span className="text-[#86868b] font-normal ml-2">— {days} day{days !== 1 ? 's' : ''}</span>
                  </p>
                  <p className="text-[12px] text-[#86868b] mt-0.5">
                    {format(parseISO(r.start_date), 'MMM d')} – {format(parseISO(r.end_date), 'MMM d, yyyy')}
                  </p>
                  {r.notes && <p className="text-[12px] text-[#aeaeb2] mt-0.5 italic">{r.notes}</p>}
                </div>
                <StatusBadge status={r.status} />
                {isManager && r.status === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => updateStatus(r.id, 'approved')}
                      className="text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1 rounded-lg text-[12px] font-medium transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => updateStatus(r.id, 'denied')}
                      className="text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg text-[12px] font-medium transition-colors"
                    >
                      Deny
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && <RequestModal onClose={() => setShowModal(false)} onSave={addRequest} />}
    </div>
  );
}
