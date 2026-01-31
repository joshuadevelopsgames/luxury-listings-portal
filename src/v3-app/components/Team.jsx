import React from 'react';
import { Mail, Phone, MapPin, Calendar, MoreHorizontal } from 'lucide-react';

/**
 * V3 Team - Mock Data Demo
 */
const V3Team = () => {
  const team = [
    { id: 1, name: 'Sarah Johnson', role: 'Content Director', email: 'sarah@luxurylistings.com', phone: '(555) 123-4567', location: 'Los Angeles, CA', startDate: 'Jan 2023', status: 'Active' },
    { id: 2, name: 'Michael Chen', role: 'Social Media Manager', email: 'michael@luxurylistings.com', phone: '(555) 234-5678', location: 'San Francisco, CA', startDate: 'Mar 2023', status: 'Active' },
    { id: 3, name: 'Emily Rodriguez', role: 'Content Creator', email: 'emily@luxurylistings.com', phone: '(555) 345-6789', location: 'Miami, FL', startDate: 'Jun 2023', status: 'Active' },
    { id: 4, name: 'David Kim', role: 'Graphic Designer', email: 'david@luxurylistings.com', phone: '(555) 456-7890', location: 'New York, NY', startDate: 'Sep 2023', status: 'Active' },
    { id: 5, name: 'Jessica Brown', role: 'Account Manager', email: 'jessica@luxurylistings.com', phone: '(555) 567-8901', location: 'Denver, CO', startDate: 'Nov 2023', status: 'On Leave' },
    { id: 6, name: 'Alex Thompson', role: 'Video Producer', email: 'alex@luxurylistings.com', phone: '(555) 678-9012', location: 'Austin, TX', startDate: 'Jan 2024', status: 'Active' },
  ];

  const gradients = [
    'from-[#0071e3] to-[#5856d6]',
    'from-[#ff9500] to-[#ff3b30]',
    'from-[#34c759] to-[#30d158]',
    'from-[#af52de] to-[#ff2d55]',
    'from-[#5856d6] to-[#0071e3]',
    'from-[#ff2d55] to-[#ff9500]',
  ];

  const stats = {
    total: team.length,
    active: team.filter(m => m.status === 'Active').length,
    onLeave: team.filter(m => m.status === 'On Leave').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[34px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em] mb-1">Team</h1>
          <p className="text-[17px] text-[#86868b]">Manage your team members.</p>
        </div>
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
          <p className="text-[28px] font-semibold text-[#ff9500] tracking-[-0.02em]">{stats.onLeave}</p>
          <p className="text-[13px] text-[#86868b]">On Leave</p>
        </div>
      </div>

      {/* Team Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {team.map((member, idx) => (
          <div
            key={member.id}
            className="p-6 rounded-2xl bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-xl border border-black/5 dark:border-white/5 hover:shadow-lg transition-all group"
          >
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradients[idx % gradients.length]} flex items-center justify-center text-white text-[15px] font-semibold shadow-lg`}>
                  {member.name.split(' ').map(w => w[0]).join('')}
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">{member.name}</h3>
                  <p className="text-[13px] text-[#86868b]">{member.role}</p>
                </div>
              </div>
              <button className="w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                <MoreHorizontal className="w-[18px] h-[18px] text-[#86868b]" strokeWidth={1.5} />
              </button>
            </div>

            <div className="space-y-2.5 mb-4">
              <div className="flex items-center gap-3 text-[13px] text-[#86868b]">
                <Mail className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                <span className="truncate">{member.email}</span>
              </div>
              <div className="flex items-center gap-3 text-[13px] text-[#86868b]">
                <Phone className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                <span>{member.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-[13px] text-[#86868b]">
                <MapPin className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                <span>{member.location}</span>
              </div>
              <div className="flex items-center gap-3 text-[13px] text-[#86868b]">
                <Calendar className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                <span>Started {member.startDate}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-black/5 dark:border-white/5">
              <span className={`inline-flex px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                member.status === 'Active' ? 'bg-[#34c759]/10 text-[#34c759]' : 'bg-[#ff9500]/10 text-[#ff9500]'
              }`}>
                {member.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default V3Team;
