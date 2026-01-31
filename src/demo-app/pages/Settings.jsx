import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { User, Bell, Palette, Globe, Camera, ChevronRight, Moon, Sun } from 'lucide-react';

/**
 * Demo Settings Page - Apple-style settings
 */
const DemoSettings = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState({ email: true, push: true, sms: false });
  const [darkMode, setDarkMode] = useState(false);

  const Toggle = ({ enabled, onChange }) => (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-[51px] h-[31px] rounded-full transition-colors duration-200 ${
        enabled ? 'bg-[#34c759]' : 'bg-[#e9e9eb] dark:bg-[#39393d]'
      }`}
    >
      <span className={`absolute top-[2px] w-[27px] h-[27px] rounded-full bg-white shadow-md transition-transform duration-200 ${
        enabled ? 'left-[22px]' : 'left-[2px]'
      }`} />
    </button>
  );

  const sections = [
    {
      title: 'Account',
      icon: User,
      items: [
        { label: 'Edit Profile', desc: 'Update your information' },
        { label: 'Change Password', desc: 'Update your credentials' },
        { label: 'Two-Factor Authentication', desc: 'Extra security' },
      ]
    },
    {
      title: 'Notifications',
      icon: Bell,
      items: [
        { label: 'Email Notifications', desc: 'Receive updates via email', toggle: 'email' },
        { label: 'Push Notifications', desc: 'Get alerts on your device', toggle: 'push' },
        { label: 'SMS Notifications', desc: 'Text message alerts', toggle: 'sms' },
      ]
    },
    {
      title: 'Appearance',
      icon: Palette,
      items: [
        { label: 'Dark Mode', desc: 'Switch between themes', toggle: 'darkMode' },
        { label: 'Language', desc: 'English (US)', action: true },
        { label: 'Timezone', desc: 'Pacific Time (PT)', action: true },
      ]
    },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[34px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em] mb-1">Settings</h1>
        <p className="text-[17px] text-[#86868b]">Manage your account preferences.</p>
      </div>

      {/* Profile Card */}
      <div className="p-6 rounded-2xl bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-xl border border-black/5 dark:border-white/5">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center text-white text-[28px] font-semibold shadow-xl">
              {currentUser?.displayName?.charAt(0) || 'U'}
            </div>
            <button className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white dark:bg-[#3d3d3d] border border-black/10 dark:border-white/10 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
              <Camera className="w-4 h-4 text-[#86868b]" strokeWidth={1.5} />
            </button>
          </div>
          <div className="flex-1">
            <h2 className="text-[20px] font-semibold text-[#1d1d1f] dark:text-white mb-1">
              {currentUser?.displayName || 'User Name'}
            </h2>
            <p className="text-[15px] text-[#86868b] mb-2">{currentUser?.email || 'user@example.com'}</p>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-gradient-to-r from-[#0071e3] to-[#5856d6] text-white">Admin</span>
              <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#34c759]/10 text-[#34c759]">Verified</span>
            </div>
          </div>
          <button className="h-9 px-4 rounded-lg bg-black/5 dark:bg-white/5 text-[13px] font-medium text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
            Edit Profile
          </button>
        </div>
      </div>

      {/* Settings Sections */}
      {sections.map((section, sIdx) => (
        <div key={sIdx} className="rounded-2xl bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-xl border border-black/5 dark:border-white/5 overflow-hidden">
          <div className="p-4 border-b border-black/5 dark:border-white/5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center">
              <section.icon className="w-4 h-4 text-white" strokeWidth={1.5} />
            </div>
            <h2 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">{section.title}</h2>
          </div>
          <div className="divide-y divide-black/5 dark:divide-white/5">
            {section.items.map((item, iIdx) => (
              <div key={iIdx} className="flex items-center justify-between p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer">
                <div>
                  <p className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">{item.label}</p>
                  <p className="text-[13px] text-[#86868b]">{item.desc}</p>
                </div>
                {item.toggle === 'darkMode' ? (
                  <Toggle enabled={darkMode} onChange={setDarkMode} />
                ) : item.toggle ? (
                  <Toggle enabled={notifications[item.toggle]} onChange={(v) => setNotifications({...notifications, [item.toggle]: v})} />
                ) : item.action ? (
                  <ChevronRight className="w-5 h-5 text-[#c7c7cc]" strokeWidth={1.5} />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Danger Zone */}
      <div className="rounded-2xl bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-xl border border-[#ff3b30]/20 overflow-hidden">
        <div className="p-4 border-b border-[#ff3b30]/10">
          <h2 className="text-[15px] font-semibold text-[#ff3b30]">Danger Zone</h2>
        </div>
        <div className="p-4 flex items-center justify-between">
          <div>
            <p className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">Delete Account</p>
            <p className="text-[13px] text-[#86868b]">Permanently delete your account</p>
          </div>
          <button className="h-9 px-4 rounded-lg bg-[#ff3b30]/10 text-[13px] font-medium text-[#ff3b30] hover:bg-[#ff3b30]/20 transition-colors">
            Delete Account
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pt-4">
        <a href="/dashboard" className="text-[13px] text-[#86868b] hover:text-[#0071e3] transition-colors">
          ← Back to classic version
        </a>
      </div>
    </div>
  );
};

export default DemoSettings;
