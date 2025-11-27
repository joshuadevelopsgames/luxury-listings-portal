import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import ClientProfilesList from '../components/client/ClientProfilesList';
import PendingClients from './PendingClients';
import { Users, Clock } from 'lucide-react';

const ClientsPage = () => {
  const [activeTab, setActiveTab] = useState('profiles');

  // Listen for tab switch events
  useEffect(() => {
    const handleTabSwitch = (e) => {
      setActiveTab(e.detail);
    };
    window.addEventListener('switchTab', handleTabSwitch);
    return () => window.removeEventListener('switchTab', handleTabSwitch);
  }, []);

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b border-gray-200 bg-white px-6 pt-4">
          <TabsList className="bg-transparent">
            <TabsTrigger 
              value="profiles" 
              className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
            >
              <Users className="w-4 h-4" />
              Client Profiles
            </TabsTrigger>
            <TabsTrigger 
              value="pending" 
              className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
            >
              <Clock className="w-4 h-4" />
              Pending Approvals
              {/* Show badge if there are pending clients */}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profiles" className="mt-0">
          <ClientProfilesList />
        </TabsContent>

        <TabsContent value="pending" className="mt-0">
          <PendingClients />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientsPage;

