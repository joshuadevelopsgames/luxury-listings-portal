import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowRight, Shield, Users, TrendingUp, Zap, Calendar, BarChart3, CheckSquare, Briefcase, Mail, Lock, Eye, EyeOff } from 'lucide-react';

/**
 * V3 Login - Apple Design with Full Feature Preview
 */
const V3Login = () => {
  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { signInWithGoogle, signInWithEmail } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setLoading(true);
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (error) {
      setError('Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    
    try {
      setError('');
      setEmailLoading(true);
      await signInWithEmail(email, password);
      navigate('/dashboard');
    } catch (error) {
      setError(error.message || 'Unable to sign in. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  const features = [
    { icon: Users, title: 'Client Management', desc: 'Full CRM & packages' },
    { icon: Calendar, title: 'Content Calendar', desc: 'Schedule & plan' },
    { icon: BarChart3, title: 'Analytics', desc: 'Deep insights' },
    { icon: CheckSquare, title: 'Task Management', desc: 'Stay organized' },
    { icon: Briefcase, title: 'Team Tools', desc: 'HR & management' },
    { icon: Shield, title: 'Admin Controls', desc: 'Full permissions' },
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#1d1d1f] relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-transparent to-purple-50/50 dark:from-blue-950/30 dark:via-transparent dark:to-purple-950/20" />
      
      {/* Animated shapes */}
      <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full bg-gradient-to-br from-[#0071e3]/10 to-[#5856d6]/10 blur-3xl" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#5856d6]/10 to-[#ff2d55]/10 blur-3xl" />

      <div className="min-h-screen flex relative z-10">
        {/* Left Side - Branding & Features */}
        <div className="hidden lg:flex lg:w-1/2 p-16 flex-col justify-between">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <img 
              src="/Luxury-listings-logo-CLR.png" 
              alt="Luxury Listings" 
              className="h-10 w-auto"
            />
            <div>
              <h1 className="text-xl font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em]">
                Luxury Listings
              </h1>
              <p className="text-[13px] text-[#86868b]">Team Portal</p>
            </div>
          </div>

          {/* Hero Content */}
          <div className="max-w-lg">
            <h2 className="text-[56px] font-semibold text-[#1d1d1f] dark:text-white leading-[1.05] tracking-[-0.03em] mb-6">
              Elevate your{' '}
              <span className="bg-gradient-to-r from-[#0071e3] to-[#5856d6] bg-clip-text text-transparent">
                luxury real estate marketing.
              </span>
            </h2>
            <p className="text-[19px] text-[#86868b] leading-relaxed font-normal">
              Manage clients, schedule content, track analytics, and grow your brand — all in one powerful platform.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-3 gap-4">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/10"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center mb-3 shadow-lg shadow-[#0071e3]/20">
                  <feature.icon className="w-4 h-4 text-white" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-[13px] text-[#1d1d1f] dark:text-white mb-0.5">{feature.title}</h3>
                <p className="text-[12px] text-[#86868b]">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-[400px]">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center gap-3 mb-16 justify-center">
              <img 
                src="/Luxury-listings-logo-CLR.png" 
                alt="Luxury Listings" 
                className="h-10 w-auto"
              />
              <div>
                <h1 className="text-xl font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em]">
                  Luxury Listings
                </h1>
                <p className="text-[13px] text-[#86868b]">Team Portal</p>
              </div>
            </div>

            {/* Login Card */}
            <div className="bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-2xl rounded-3xl p-10 border border-black/5 dark:border-white/10 shadow-2xl shadow-black/5">
              <div className="text-center mb-10">
                <h2 className="text-[28px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em] mb-2">
                  Welcome back
                </h2>
                <p className="text-[15px] text-[#86868b]">
                  Sign in to access all features
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-[#ff3b30]/10 text-[#ff3b30] text-[13px] text-center font-medium">
                  {error}
                </div>
              )}

              {/* Email/Password Form */}
              <form onSubmit={handleEmailSignIn} className="space-y-4 mb-6">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868b]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full h-[50px] pl-12 pr-4 rounded-xl bg-[#f5f5f7] dark:bg-white/5 border border-black/5 dark:border-white/10 text-[15px] text-[#1d1d1f] dark:text-white placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 focus:border-[#0071e3] transition-all duration-200"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868b]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full h-[50px] pl-12 pr-12 rounded-xl bg-[#f5f5f7] dark:bg-white/5 border border-black/5 dark:border-white/10 text-[15px] text-[#1d1d1f] dark:text-white placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 focus:border-[#0071e3] transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={emailLoading || loading}
                  className="w-full flex items-center justify-center gap-3 h-[50px] rounded-xl bg-[#0071e3] text-white text-[15px] font-medium shadow-lg shadow-[#0071e3]/20 hover:shadow-xl hover:bg-[#0077ed] active:scale-[0.98] transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {emailLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
                <span className="text-[13px] text-[#86868b]">or</span>
                <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
              </div>

              {/* Google Sign In */}
              <button
                onClick={handleGoogleSignIn}
                disabled={loading || emailLoading}
                className="w-full flex items-center justify-center gap-3 h-[50px] rounded-xl bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 text-[#1d1d1f] dark:text-white text-[15px] font-medium shadow-sm hover:shadow-md hover:border-black/20 dark:hover:border-white/20 active:scale-[0.98] transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-[#1d1d1f]/30 dark:border-white/30 border-t-[#1d1d1f] dark:border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              <div className="mt-10 pt-8 border-t border-black/5 dark:border-white/10">
                <p className="text-center text-[12px] text-[#86868b]">
                  By signing in, you agree to our{' '}
                  <a href="#" className="text-[#0071e3] hover:underline">Terms</a>
                  {' '}and{' '}
                  <a href="#" className="text-[#0071e3] hover:underline">Privacy Policy</a>
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default V3Login;
