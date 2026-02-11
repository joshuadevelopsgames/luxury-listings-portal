import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ClientProfilesList from '../components/client/ClientProfilesList';
import { Users, FolderOpen, Plus } from 'lucide-react';
import { usePermissions, FEATURE_PERMISSIONS } from '../contexts/PermissionsContext';

const ClientsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam === 'internal' ? 'internal' : 'profiles');
  const { hasFeaturePermission } = usePermissions();
  const canManageClients = hasFeaturePermission(FEATURE_PERMISSIONS.MANAGE_CLIENTS);

  // Sync URL with tab (e.g. /clients?tab=internal)
  useEffect(() => {
    if (tabParam === 'internal' && activeTab !== 'internal') setActiveTab('internal');
    if (tabParam !== 'internal' && activeTab === 'internal' && !tabParam) setActiveTab('profiles');
  }, [tabParam]);

  const handleTabChange = (value) => {
    setActiveTab(value);
    if (value === 'internal') {
      setSearchParams({ tab: 'internal' });
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
          Clients List
        </h1>
        <p className="text-[15px] sm:text-[17px] text-[#86868b]">
          Manage SMM client profiles and internal accounts
        </p>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2 p-1 bg-black/5 dark:bg-white/10 rounded-xl">
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
            onClick={() => handleTabChange('internal')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[14px] font-medium transition-all ${
              activeTab === 'internal'
                ? 'bg-white dark:bg-[#2d2d2d] text-[#1d1d1f] dark:text-white shadow-sm'
                : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            Internal Accounts
          </button>
        </div>

        {/* Add Client / Add Internal Account Button */}
        {canManageClients && activeTab === 'profiles' && (
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('openAddClientModal'))}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Client
          </button>
        )}
        {canManageClients && activeTab === 'internal' && (
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('openAddClientModal', { detail: { isInternal: true } }))}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Internal Account
          </button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'profiles' && <ClientProfilesList />}
      {activeTab === 'internal' && <ClientProfilesList internalOnly />}
    </div>
  );
};

export default ClientsPage;
