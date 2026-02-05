import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Calendar, MoreHorizontal, RefreshCw, Users } from 'lucide-react';
import { firestoreService } from '../../services/firestoreService';
import { format } from 'date-fns';
import EmployeeLink from '../../components/ui/EmployeeLink';

/**
 * V3 Team - Real Data from Firestore (Approved Users)
 */
const V3Team = () => {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);

  const gradients = [
    'from-[#0071e3] to-[#5856d6]',
    'from-[#ff9500] to-[#ff3b30]',
    'from-[#34c759] to-[#30d158]',
    'from-[#af52de] to-[#ff2d55]',
    'from-[#5856d6] to-[#0071e3]',
    'from-[#ff2d55] to-[#ff9500]',
  ];

  // Load team members from Firestore
  useEffect(() => {
    loadTeam();
  }, []);

  const loadTeam = async () => {
    try {
      setLoading(true);
      const approvedUsers = await firestoreService.getApprovedUsers();
      setTeam(approvedUsers || []);
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
        <div className="h-12 bg-black/5 dark:bg-white/5 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-black/5 dark:bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-black/5 dark:bg-white/5 rounded-2xl animate-pulse" />
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
          <h1 className="text-[34px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em] mb-1">Team</h1>
          <p className="text-[17px] text-[#86868b]">View your team members.</p>
        </div>
        <button 
          onClick={loadTeam}
          className="h-10 px-4 rounded-full bg-black/5 dark:bg-white/5 text-[13px] font-medium text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-all flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" strokeWidth={2} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-xl border border-black/5 dark:border-white/5 text-center">
          <p className="text-[28px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em]">{stats.total}</p>
          <p className="text-[13px] text-[#86868b]">Total Members</p>
        </div>
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-xl border border-black/5 dark:border-white/5 text-center">
          <p className="text-[28px] font-semibold text-[#34c759] tracking-[-0.02em]">{stats.active}</p>
          <p className="text-[13px] text-[#86868b]">Active</p>
        </div>
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-xl border border-black/5 dark:border-white/5 text-center">
          <p className="text-[28px] font-semibold text-[#5856d6] tracking-[-0.02em]">{stats.admins}</p>
          <p className="text-[13px] text-[#86868b]">Administrators</p>
        </div>
      </div>

      {/* Empty State */}
      {team.length === 0 && (
        <div className="p-12 rounded-2xl bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-xl border border-black/5 dark:border-white/5 text-center">
          <div className="w-16 h-16 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-[#86868b]" />
          </div>
          <p className="text-[17px] font-medium text-[#1d1d1f] dark:text-white mb-1">No team members yet</p>
          <p className="text-[13px] text-[#86868b]">Team members will appear here once approved</p>
        </div>
      )}

      {/* Team Grid */}
      {team.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {team.map((member, idx) => (
            <div
              key={member.id || member.email}
              className="p-6 rounded-2xl bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-xl border border-black/5 dark:border-white/5 hover:shadow-lg transition-all group"
            >
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradients[idx % gradients.length]} flex items-center justify-center text-white text-[15px] font-semibold shadow-lg`}>
                    {getInitials(member)}
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold">
                      <EmployeeLink user={member} showId className="text-[#1d1d1f] dark:text-white">
                        {member.displayName || member.email?.split('@')[0] || 'Team Member'}
                      </EmployeeLink>
                    </h3>
                    <p className="text-[13px] text-[#86868b]">{getRoleDisplay(member.role)}</p>
                  </div>
                </div>
                <button className="w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                  <MoreHorizontal className="w-[18px] h-[18px] text-[#86868b]" strokeWidth={1.5} />
                </button>
              </div>

              <div className="space-y-2.5 mb-4">
                {member.email && (
                  <div className="flex items-center gap-3 text-[13px] text-[#86868b]">
                    <Mail className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                    <span className="truncate">{member.email}</span>
                  </div>
                )}
                {member.phone && (
                  <div className="flex items-center gap-3 text-[13px] text-[#86868b]">
                    <Phone className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                    <span>{member.phone}</span>
                  </div>
                )}
                {(member.location || member.city) && (
                  <div className="flex items-center gap-3 text-[13px] text-[#86868b]">
                    <MapPin className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                    <span>{member.location || member.city}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-[13px] text-[#86868b]">
                  <Calendar className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                  <span>Joined {formatJoinDate(member.approvedAt || member.createdAt)}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-black/5 dark:border-white/5">
                <span className={`inline-flex px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                  member.isApproved !== false ? 'bg-[#34c759]/10 text-[#34c759]' : 'bg-[#ff9500]/10 text-[#ff9500]'
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
