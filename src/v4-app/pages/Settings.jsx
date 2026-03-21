import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { User, Lock, Bell, CheckCircle2 } from 'lucide-react';

function Section({ title, children }) {
  return (
    <div className="bg-white border border-[#e5e5ea] rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#f5f5f7]">
        <p className="text-[14px] font-semibold text-[#1d1d1f]">{title}</p>
      </div>
      <div className="px-5 py-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-[#86868b] mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function Settings() {
  const { user, profile, updateProfile } = useAuth();

  // Profile form
  const [name, setName] = useState(profile?.full_name ?? '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  // Password form
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [savingPass, setSavingPass] = useState(false);
  const [passMsg, setPassMsg] = useState('');

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg('');
    try {
      await updateProfile({ full_name: name });
      setProfileMsg('Profile updated successfully.');
    } catch (err) {
      setProfileMsg('Error: ' + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPass !== confirmPass) { setPassMsg('Passwords do not match.'); return; }
    if (newPass.length < 8) { setPassMsg('Password must be at least 8 characters.'); return; }
    setSavingPass(true);
    setPassMsg('');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) throw error;
      setPassMsg('Password updated successfully.');
      setCurrentPass(''); setNewPass(''); setConfirmPass('');
    } catch (err) {
      setPassMsg('Error: ' + err.message);
    } finally {
      setSavingPass(false);
    }
  };

  const roleLabel = (profile?.role ?? 'team_member').replace(/_/g, ' ');

  return (
    <div className="space-y-5 max-w-lg">
      <h1 className="text-[22px] font-bold text-[#1d1d1f]">Settings</h1>

      {/* Profile info */}
      <Section title="Profile">
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-[20px] font-bold">
              {(name || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-[14px] font-semibold text-[#1d1d1f]">{name || '—'}</p>
              <p className="text-[12px] text-[#86868b] capitalize">{roleLabel}</p>
            </div>
          </div>
          <Field label="Full Name">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              className="w-full border border-[#d2d2d7] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>
          <Field label="Email">
            <input
              value={user?.email ?? ''}
              disabled
              className="w-full border border-[#d2d2d7] rounded-lg px-3 py-2 text-[14px] bg-[#f5f5f7] text-[#86868b] cursor-not-allowed"
            />
          </Field>
          <Field label="Role">
            <input
              value={roleLabel}
              disabled
              className="w-full border border-[#d2d2d7] rounded-lg px-3 py-2 text-[14px] bg-[#f5f5f7] text-[#86868b] capitalize cursor-not-allowed"
            />
          </Field>
          {profileMsg && (
            <div className={`flex items-center gap-2 text-[12px] px-3 py-2 rounded-lg ${profileMsg.startsWith('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
              {!profileMsg.startsWith('Error') && <CheckCircle2 size={13} />}
              {profileMsg}
            </div>
          )}
          <button
            type="submit"
            disabled={savingProfile}
            className="w-full py-2 rounded-lg bg-[#0071e3] text-white text-[14px] font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {savingProfile ? 'Saving…' : 'Save Profile'}
          </button>
        </form>
      </Section>

      {/* Password */}
      <Section title="Change Password">
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <Field label="New Password">
            <input
              type="password"
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full border border-[#d2d2d7] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>
          <Field label="Confirm New Password">
            <input
              type="password"
              value={confirmPass}
              onChange={e => setConfirmPass(e.target.value)}
              placeholder="Repeat new password"
              className="w-full border border-[#d2d2d7] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>
          {passMsg && (
            <div className={`flex items-center gap-2 text-[12px] px-3 py-2 rounded-lg ${passMsg.startsWith('Error') || passMsg.includes('match') || passMsg.includes('least') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
              {passMsg.startsWith('Password updated') && <CheckCircle2 size={13} />}
              {passMsg}
            </div>
          )}
          <button
            type="submit"
            disabled={savingPass}
            className="w-full py-2 rounded-lg bg-[#1d1d1f] text-white text-[14px] font-medium hover:bg-black disabled:opacity-50 transition-colors"
          >
            {savingPass ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </Section>

      {/* Account info */}
      <Section title="Account">
        <div className="space-y-2 text-[13px]">
          <div className="flex justify-between">
            <span className="text-[#86868b]">User ID</span>
            <span className="text-[#1d1d1f] font-mono text-[11px]">{user?.id?.slice(0, 8)}…</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#86868b]">Member since</span>
            <span className="text-[#1d1d1f]">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#86868b]">Last sign in</span>
            <span className="text-[#1d1d1f]">{user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : '—'}</span>
          </div>
        </div>
      </Section>
    </div>
  );
}
