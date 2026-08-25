import React, { useState, useEffect } from 'react';
import { Users, Mail, Search, RefreshCw, Building } from 'lucide-react';
import { supabaseService } from '../services/supabaseService';
import EmployeeLink from '../components/ui/EmployeeLink';
import { getGmailComposeUrl } from '../utils/gmailCompose';
import { getSystemAdmins, isSystemAdmin as checkIsSystemAdmin } from '../utils/systemAdmins';

const ROLE_DISPLAY = {
  admin: 'Administrator',
  content_director: 'Content Director',
  social_media_manager: 'Social Media Manager',
  hr_manager: 'HR Manager',
  sales_manager: 'Sales Manager',
  graphic_designer: 'Graphic Designer',
};

const gradients = [
  'from-brand to-brand',
  'from-warning to-danger',
  'from-positive to-positive',
  'from-brand to-[#ff2d55]',
  'from-brand to-brand',
  'from-[#ff2d55] to-warning',
];

function getInitials(member) {
  if (member.displayName) {
    return member.displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }
  if (member.email) return member.email.charAt(0).toUpperCase();
  return '?';
}

function getRoleDisplay(role) {
  return ROLE_DISPLAY[role] || (role ? String(role).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Team Member');
}

export default function TeamDirectoryPage() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadTeam = async () => {
    try {
      setLoading(true);
      const users = await supabaseService.getApprovedUsers();
      const adminSet = new Set(getSystemAdmins().map(e => e.toLowerCase()));
      const filtered = (users || []).filter(u => !adminSet.has((u.email || u.id || '').toLowerCase()));
      setTeam(filtered);
    } catch (err) {
      console.error('Error loading team directory:', err);
      setTeam([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeam();
  }, []);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? team.filter(
        (m) =>
          (m.displayName || '').toLowerCase().includes(q) ||
          (m.email || '').toLowerCase().includes(q) ||
          (m.department || '').toLowerCase().includes(q) ||
          (m.role || '').toLowerCase().includes(q) ||
          (m.firstName || '').toLowerCase().includes(q) ||
          (m.lastName || '').toLowerCase().includes(q)
      )
    : team;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-surface-3 rounded-xl w-64 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-surface-3 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] sm:text-[34px] font-semibold text-ink tracking-[-0.02em]">
          Team Directory
        </h1>
        <p className="text-[15px] text-ink-muted mt-1">Contact information for all team members</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <input
            type="text"
            placeholder="Search by name, email, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-surface border border-hairline-strong text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <button
          type="button"
          onClick={loadTeam}
          className="flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-surface-3 text-ink text-[13px] font-medium hover:bg-hairline-strong transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl bg-surface backdrop-blur-xl border border-hairline p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-surface-3 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-ink-muted" />
          </div>
          <p className="text-[17px] font-medium text-ink">
            {q ? 'No matches' : 'No team members yet'}
          </p>
          <p className="text-[13px] text-ink-muted mt-1">
            {q ? 'Try a different search' : 'Team members will appear here once approved'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((member, idx) => (
            <div
              key={member.uid || member.id || member.email}
              className="p-5 rounded-xl bg-surface backdrop-blur-xl border border-hairline hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-11 h-11 rounded-xl overflow-hidden bg-gradient-to-br ${gradients[idx % gradients.length]} flex items-center justify-center text-white text-[14px] font-semibold shrink-0`}
                >
                  {(member.avatar || member.photoURL) ? (
                    <img
                      src={member.avatar || member.photoURL}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getInitials(member)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-ink truncate">
                    <EmployeeLink
                      user={member}
                      showId={true}
                      className="!text-ink dark:!text-white hover:!underline font-semibold"
                    >
                      {member.displayName || member.firstName || member.email?.split('@')[0] || 'Team Member'}
                    </EmployeeLink>
                  </p>
                  {checkIsSystemAdmin((member.email || '').toLowerCase()) ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-brand/10 text-brand">
                      System Administrator
                    </span>
                  ) : (
                    <p className="text-[13px] text-ink-muted">{getRoleDisplay(member.role)}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {(member.department || member.role) && (
                  <div className="flex items-center gap-2.5 text-[13px] text-ink-muted">
                    <Building className="w-3.5 h-3.5 shrink-0" />
                    <span>{member.department || getRoleDisplay(member.role)}</span>
                  </div>
                )}
                {member.email && (
                  <div className="flex items-center gap-2.5 text-[13px] text-ink-muted">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <a
                      href={getGmailComposeUrl(member.email)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-brand hover:underline"
                    >
                      {member.email}
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
