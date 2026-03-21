import { useEffect, useState } from 'react';
import { UserPlus, Mail, Shield, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const ROLE_LABELS = {
  admin:            { label: 'Admin',            color: 'bg-red-100 text-red-700' },
  director:         { label: 'Director',          color: 'bg-purple-100 text-purple-700' },
  manager:          { label: 'Manager',           color: 'bg-blue-100 text-blue-700' },
  content_manager:  { label: 'Content Manager',   color: 'bg-green-100 text-green-700' },
  graphic_designer: { label: 'Graphic Designer',  color: 'bg-yellow-100 text-yellow-700' },
  hr_manager:       { label: 'HR Manager',        color: 'bg-pink-100 text-pink-700' },
  sales_manager:    { label: 'Sales Manager',     color: 'bg-orange-100 text-orange-700' },
  team_member:      { label: 'Team Member',       color: 'bg-gray-100 text-gray-600' },
};

const ROLES = Object.keys(ROLE_LABELS);

function Avatar({ name, size = 40 }) {
  const initials = (name ?? 'U')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-[14px] shrink-0"
    >
      {initials}
    </div>
  );
}

function RoleBadge({ role }) {
  const r = ROLE_LABELS[role] ?? { label: role, color: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${r.color}`}>{r.label}</span>
  );
}

function InviteModal({ onClose, onInvited }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('team_member');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInvite = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error: invErr } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName, role },
      });
      if (invErr) throw invErr;
      onInvited();
      onClose();
    } catch (err) {
      // inviteUserByEmail requires service_role key — show informative message
      setError('Invite requires a server-side call. Ask your admin to use the Supabase dashboard to invite: ' + email);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-[18px] font-bold text-[#1d1d1f] mb-5">Invite Team Member</h2>
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[#86868b] mb-1">Full Name</label>
            <input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              placeholder="Jane Smith"
              className="w-full border border-[#d2d2d7] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#86868b] mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="jane@example.com"
              className="w-full border border-[#d2d2d7] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#86868b] mb-1">Role</label>
            <div className="relative">
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full appearance-none border border-[#d2d2d7] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white pr-8"
              >
                {ROLES.map(r => (
                  <option key={r} value={r}>{ROLE_LABELS[r].label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-3 text-[#86868b] pointer-events-none" />
            </div>
          </div>
          {error && <p className="text-[12px] text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-[#d2d2d7] text-[14px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7]">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2 rounded-lg bg-[#0071e3] text-white text-[14px] font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Sending…' : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RoleEditor({ member, onSave }) {
  const [role, setRole] = useState(member.role ?? 'team_member');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await supabase.from('profiles').update({ role }).eq('id', member.id);
    setSaving(false);
    onSave({ ...member, role });
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <select
          value={role}
          onChange={e => setRole(e.target.value)}
          className="appearance-none border border-[#d2d2d7] rounded-lg px-2 py-1 text-[12px] bg-white pr-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {ROLES.map(r => (
            <option key={r} value={r}>{ROLE_LABELS[r].label}</option>
          ))}
        </select>
        <ChevronDown size={12} className="absolute right-1.5 top-2 text-[#86868b] pointer-events-none" />
      </div>
      {role !== (member.role ?? 'team_member') && (
        <button onClick={save} disabled={saving} className="text-[11px] bg-[#0071e3] text-white px-2 py-1 rounded-md hover:bg-blue-700 disabled:opacity-50">
          {saving ? '…' : 'Save'}
        </button>
      )}
    </div>
  );
}

export default function Team() {
  const { profile } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [search, setSearch] = useState('');

  const isAdmin = ['admin', 'director'].includes(profile?.role);

  const load = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role, email, created_at, avatar_url')
      .order('full_name');
    setMembers(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = members.filter(m =>
    (m.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (m.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (m.role ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const updateMember = (updated) => {
    setMembers(prev => prev.map(m => m.id === updated.id ? updated : m));
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold text-[#1d1d1f]">Team</h1>
        {isAdmin && (
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 bg-[#0071e3] text-white px-4 py-2 rounded-xl text-[13px] font-medium hover:bg-blue-700 transition-colors"
          >
            <UserPlus size={15} /> Invite Member
          </button>
        )}
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name, email, or role…"
        className="w-full max-w-sm border border-[#d2d2d7] rounded-xl px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Stats row */}
      <div className="flex gap-3 flex-wrap">
        {Object.entries(ROLE_LABELS).map(([role, { label, color }]) => {
          const count = members.filter(m => (m.role ?? 'team_member') === role).length;
          if (!count) return null;
          return (
            <div key={role} className={`text-[12px] font-medium px-3 py-1 rounded-full ${color}`}>
              {label}: {count}
            </div>
          );
        })}
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-[14px] text-[#86868b]">Loading…</p>
      ) : (
        <div className="border border-[#e5e5ea] rounded-2xl overflow-hidden bg-white">
          <div className="grid grid-cols-[auto_1fr_auto_auto] gap-0 divide-y divide-[#f5f5f7]">
            {/* Header */}
            <div className="col-span-4 grid grid-cols-[auto_1fr_auto_auto] bg-[#f5f5f7] px-5 py-2.5 text-[11px] font-semibold text-[#86868b] uppercase tracking-wider gap-4">
              <span>Member</span>
              <span></span>
              <span className="text-right">Role</span>
              {isAdmin && <span className="text-right">Edit</span>}
            </div>
            {filtered.map(m => (
              <div key={m.id} className="col-span-4 grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-5 py-3.5 hover:bg-[#f5f5f7] transition-colors">
                <Avatar name={m.full_name} />
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-[#1d1d1f] truncate">{m.full_name ?? '—'}</p>
                  {m.email && (
                    <a href={`mailto:${m.email}`} className="flex items-center gap-1 text-[12px] text-[#86868b] hover:text-[#0071e3] mt-0.5">
                      <Mail size={11} /> {m.email}
                    </a>
                  )}
                </div>
                <RoleBadge role={m.role ?? 'team_member'} />
                {isAdmin && (
                  <RoleEditor member={m} onSave={updateMember} />
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-4 px-5 py-8 text-center text-[14px] text-[#86868b]">
                No team members found.
              </div>
            )}
          </div>
        </div>
      )}

      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onInvited={load}
        />
      )}
    </div>
  );
}
