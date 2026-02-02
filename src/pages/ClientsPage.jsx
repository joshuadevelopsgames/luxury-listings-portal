import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ClientProfilesList from '../components/client/ClientProfilesList';
import PendingClients from './PendingClients';
import { Users, Clock } from 'lucide-react';

const ClientsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam === 'pending' ? 'pending' : 'profiles');

  // Sync URL with tab (e.g. /clients?tab=pending)
  useEffect(() => {
    if (tabParam === 'pending' && activeTab !== 'pending') setActiveTab('pending');
    if (tabParam !== 'pending' && activeTab === 'pending' && !tabParam) setActiveTab('profiles');
  }, [tabParam]);

  const handleTabChange = (value) => {
    setActiveTab(value);
    if (value === 'pending') {
      setSearchParams({ tab: 'pending' });
    } else {
      setSearchParams({});
    }
  };

  // Listen for tab switch events
  useEffect(() => {
    const handleTabSwitch = (e) => {
      setActiveTab(e.detail);
    };
    window.addEventListener('switchTab', handleTabSwitch);
    return () => window.removeEventListener('switchTab', handleTabSwitch);
  }, []);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-[28px] sm:text-[34px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em] mb-1">
          Client Management
        </h1>
        <p className="text-[15px] sm:text-[17px] text-[#86868b]">
          Manage SMM client profiles and pending approvals
        </p>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex gap-2 p-1 bg-black/5 dark:bg-white/10 rounded-xl w-fit">
        <button
          onClick={() => handleTabChange('profiles')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[14px] font-medium transition-all ${
            activeTab === 'profiles'
              ? 'bg-white dark:bg-[#2d2d2d] text-[#1d1d1f] dark:text-white shadow-sm'
              : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          Client Profiles
        </button>
        <button
          onClick={() => handleTabChange('pending')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[14px] font-medium transition-all ${
            activeTab === 'pending'
              ? 'bg-white dark:bg-[#2d2d2d] text-[#1d1d1f] dark:text-white shadow-sm'
              : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          Pending Approvals
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'profiles' && <ClientProfilesList />}
      {activeTab === 'pending' && <PendingClients />}
    </div>
  );
};

export default ClientsPage;
