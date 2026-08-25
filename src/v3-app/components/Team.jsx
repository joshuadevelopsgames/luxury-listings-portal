import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Calendar, MoreHorizontal, RefreshCw, Users } from 'lucide-react';
import { supabaseService } from '../../services/supabaseService';
import { format } from 'date-fns';
import EmployeeLink from '../../components/ui/EmployeeLink';
import { getSystemAdmins } from '../../utils/systemAdmins';

/**
 * V3 Team - Real Data from Firestore (Approved Users)
 */
const V3Team = () => {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);

  const gradients = [
    'from-brand to-brand',
    'from-warning to-danger',
    'from-positive to-positive',
    'from-brand to-[#ff2d55]',
    'from-brand to-brand',
    'from-[#ff2d55] to-warning',
  ];

  // Load team members from Firestore
  useEffect(() => {
    loadTeam();
  }, []);

  const loadTeam = async () => {
    try {
      setLoading(true);
      const raw = await supabaseService.getApprovedUsers();
      const adminSet = new Set(getSystemAdmins().map(e => e.toLowerCase()));
      const filtered = (raw || []).filter(u => !adminSet.has((u.email || u.id || '').toLowerCase()));
      setTeam(filtered);
    } catch (error) {
      console.error('Error loading team:', error);
      setTeam([]);
    } finally {
      setLoading(false);
    }
  };

  // Get initials from name or email
  const getInitials = (member) => {
    if (member.displayName) {
      return member.displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    }
    if (member.email) {
      return member.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  // Get role display name
  const getRoleDisplay = (role) => {
    const roleNames = {
      'content_director': 'Content Director',
      'social_media_manager': 'Social Media Manager',
      'hr_manager': 'HR Manager',
      'sales_manager': 'Sales Manager',
      'admin': 'Administrator',
    };
    return roleNames[role] || role || 'Team Member';
  };

  // Format join date
  const formatJoinDate = (date) => {
    if (!date) return 'Recently joined';
    try {
      const d = typeof date === 'string' ? new Date(date) : date.toDate ? date.toDate() : new Date(date);
      return format(d, 'MMM yyyy');
    } catch {
      return 'Recently joined';
    }
  };

  const stats = {
    total: team.length,
    active: team.filter(m => m.isApproved !== false).length,
    admins: team.filter(m => m.role === 'admin').length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-surface-3 rounded-xl animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-surface-3 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-surface-3 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[34px] font-semibold text-ink tracking-[-0.02em] mb-1">Team</h1>
          <p className="text-[17px] text-ink-muted">View your team members.</p>
        </div>
        <button 
          onClick={loadTeam}
          className="h-10 px-4 rounded-full bg-surface-3 text-[13px] font-medium text-ink hover:bg-black/10 dark:hover:bg-white/10 transition-all flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" strokeWidth={2} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white/80 dark:bg-surface backdrop-blur-xl border border-black/5 dark:border-white/5 text-center">
          <p className="text-[28px] font-semibold text-ink tracking-[-0.02em]">{stats.total}</p>
          <p className="text-[13px] text-ink-muted">Total Members</p>
        </div>
        <div className="p-4 rounded-xl bg-white/80 dark:bg-surface backdrop-blur-xl border border-black/5 dark:border-white/5 text-center">
          <p className="text-[28px] font-semibold text-positive tracking-[-0.02em]">{stats.active}</p>
          <p className="text-[13px] text-ink-muted">Active</p>
        </div>
        <div className="p-4 rounded-xl bg-white/80 dark:bg-surface backdrop-blur-xl border border-black/5 dark:border-white/5 text-center">
          <p className="text-[28px] font-semibold text-brand tracking-[-0.02em]">{stats.admins}</p>
          <p className="text-[13px] text-ink-muted">Administrators</p>
        </div>
      </div>

      {/* Empty State */}
      {team.length === 0 && (
        <div className="p-12 rounded-xl bg-white/80 dark:bg-surface backdrop-blur-xl border border-black/5 dark:border-white/5 text-center">
          <div className="w-16 h-16 rounded-full bg-surface-3 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-ink-muted" />
          </div>
          <p className="text-[17px] font-medium text-ink mb-1">No team members yet</p>
          <p className="text-[13px] text-ink-muted">Team members will appear here once approved</p>
        </div>
      )}

      {/* Team Grid */}
      {team.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {team.map((member, idx) => (
            <div
              key={member.id || member.email}
              className="p-6 rounded-xl bg-white/80 dark:bg-surface backdrop-blur-xl border border-black/5 dark:border-white/5 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradients[idx % gradients.length]} flex items-center justify-center text-white text-[15px] font-semibold shadow-lg`}>
                    {getInitials(member)}
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold">
                      <EmployeeLink user={member} showId className="text-ink">
                        {member.displayName || member.email?.split('@')[0] || 'Team Member'}
                      </EmployeeLink>
                    </h3>
                    <p className="text-[13px] text-ink-muted">{getRoleDisplay(member.role)}</p>
                  </div>
                </div>
                <button className="w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-surface-3 transition-all">
                  <MoreHorizontal className="w-[18px] h-[18px] text-ink-muted" strokeWidth={1.5} />
                </button>
              </div>

              <div className="space-y-2.5 mb-4">
                {member.email && (
                  <div className="flex items-center gap-3 text-[13px] text-ink-muted">
                    <Mail className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                    <span className="truncate">{member.email}</span>
                  </div>
                )}
                {member.phone && (
                  <div className="flex items-center gap-3 text-[13px] text-ink-muted">
                    <Phone className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                    <span>{member.phone}</span>
                  </div>
                )}
                {(member.location || member.city) && (
                  <div className="flex items-center gap-3 text-[13px] text-ink-muted">
                    <MapPin className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                    <span>{member.location || member.city}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-[13px] text-ink-muted">
                  <Calendar className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                  <span>Joined {formatJoinDate(member.approvedAt || member.createdAt)}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-black/5 dark:border-white/5">
                <span className={`inline-flex px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                  member.isApproved !== false ? 'bg-positive/10 text-positive' : 'bg-warning/10 text-warning'
                }`}>
                  {member.isApproved !== false ? 'Active' : 'Pending'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default V3Team;
