import React, { useState, useEffect } from 'react';
import { Users, Mail, Search, RefreshCw, Building } from 'lucide-react';
import { firestoreService } from '../services/firestoreService';
import EmployeeLink from '../components/ui/EmployeeLink';
import { getGmailComposeUrl } from '../utils/gmailCompose';

const ROLE_DISPLAY = {
  admin: 'Administrator',
  content_director: 'Content Director',
  social_media_manager: 'Social Media Manager',
  hr_manager: 'HR Manager',
  sales_manager: 'Sales Manager',
  graphic_designer: 'Graphic Designer',
};

const gradients = [
  'from-[#0071e3] to-[#5856d6]',
  'from-[#ff9500] to-[#ff3b30]',
  'from-[#34c759] to-[#30d158]',
  'from-[#af52de] to-[#ff2d55]',
  'from-[#5856d6] to-[#0071e3]',
  'from-[#ff2d55] to-[#ff9500]',
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
      const users = await firestoreService.getApprovedUsers();
      setTeam(users || []);
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
        <div className="h-10 bg-black/5 dark:bg-white/10 rounded-2xl w-64 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 rounded-2xl bg-black/5 dark:bg-white/10 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] sm:text-[34px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em]">
          Team Directory
        </h1>
        <p className="text-[15px] text-[#86868b] mt-1">Contact information for all team members</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
          <input
            type="text"
            placeholder="Search by name, email, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          />
        </div>
        <button
          type="button"
          onClick={loadTeam}
          className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[13px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-[#86868b]" />
          </div>
          <p className="text-[17px] font-medium text-[#1d1d1f] dark:text-white">
            {q ? 'No matches' : 'No team members yet'}
          </p>
          <p className="text-[13px] text-[#86868b] mt-1">
            {q ? 'Try a different search' : 'Team members will appear here once approved'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((member, idx) => (
            <div
              key={member.uid || member.id || member.email}
              className="p-5 rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 hover:shadow-md transition-all"
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
                  <p className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white truncate">
                    <EmployeeLink
                      user={member}
                      showId={true}
                      className="!text-[#1d1d1f] dark:!text-white hover:!underline font-semibold"
                    >
                      {member.displayName || member.firstName || member.email?.split('@')[0] || 'Team Member'}
                    </EmployeeLink>
                  </p>
                  {member.role === 'admin' && (member.email || '').toLowerCase() === 'jrsschroeder@gmail.com' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#5856d6]/10 text-[#5856d6]">
                      System Administrator
                    </span>
                  ) : (
                    <p className="text-[13px] text-[#86868b]">{getRoleDisplay(member.role)}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {(member.department || member.role) && (
                  <div className="flex items-center gap-2.5 text-[13px] text-[#86868b]">
                    <Building className="w-3.5 h-3.5 shrink-0" />
                    <span>{member.department || getRoleDisplay(member.role)}</span>
                  </div>
                )}
                {member.email && (
                  <div className="flex items-center gap-2.5 text-[13px] text-[#86868b]">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <a
                      href={getGmailComposeUrl(member.email)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-[#0071e3] hover:underline"
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
