import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/v4/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7] px-4">
      <div className="w-full max-w-[380px]">
        <div className="text-center mb-8">
          <img src="/Luxury-listings-logo-CLR.png" alt="Luxury Listings" className="h-12 mx-auto mb-4" />
          <h1 className="text-[24px] font-bold text-[#1d1d1f]">Sign in</h1>
          <p className="text-[14px] text-[#86868b] mt-1">Luxury Listings Portal V4</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 text-red-600 text-[13px]">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[12px] font-medium text-[#86868b]">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-gray-200 text-[14px] text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] transition-colors"
              placeholder="you@company.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[12px] font-medium text-[#86868b]">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-gray-200 text-[14px] text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-xl bg-[#0071e3] text-white text-[14px] font-semibold hover:bg-[#0077ed] disabled:opacity-60 transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
