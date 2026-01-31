import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Shield, Users, TrendingUp, Calendar, BarChart3, CheckSquare, Briefcase } from 'lucide-react';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setLoading(true);
      console.log('🚀 Starting Google sign-in...');
      
      await signInWithGoogle();
      console.log('✅ Google sign-in successful');
      console.log('🔄 AuthContext will handle redirect...');
    } catch (error) {
      console.error('❌ Sign-in error:', error);
      setError('Failed to sign in with Google. Please try again.');
    } finally {
      setLoading(false);
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
    <div className="min-h-screen bg-[#f5f5f7] relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-transparent to-purple-50/50" />
      
      {/* Animated gradient shapes */}
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
              <h1 className="text-xl font-semibold text-[#1d1d1f] tracking-[-0.02em]">
                Luxury Listings
              </h1>
              <p className="text-[13px] text-[#86868b]">Professional Portal</p>
            </div>
          </div>

          {/* Hero Content */}
          <div className="max-w-lg">
            <h2 className="text-[56px] font-semibold text-[#1d1d1f] leading-[1.05] tracking-[-0.03em] mb-6">
              Your team's workspace,{' '}
              <span className="bg-gradient-to-r from-[#0071e3] to-[#5856d6] bg-clip-text text-transparent">
                all in one place.
              </span>
            </h2>
            <p className="text-[19px] text-[#86868b] leading-relaxed font-normal mb-8">
              Manage clients, content calendars, tasks, and team operations from a single dashboard.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-3 gap-4">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-white/60 backdrop-blur-xl border border-black/5"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center mb-3 shadow-lg shadow-[#0071e3]/20">
                  <feature.icon className="w-4 h-4 text-white" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-[13px] text-[#1d1d1f] mb-0.5">{feature.title}</h3>
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
                <h1 className="text-xl font-semibold text-[#1d1d1f] tracking-[-0.02em]">
                  Luxury Listings
                </h1>
                <p className="text-[13px] text-[#86868b]">Professional Portal</p>
              </div>
            </div>

            {/* Login Card */}
            <div className="bg-white/80 backdrop-blur-2xl rounded-3xl p-10 border border-black/5 shadow-2xl shadow-black/5">
              <div className="text-center mb-10">
                <h2 className="text-[28px] font-semibold text-[#1d1d1f] tracking-[-0.02em] mb-2">
                  Welcome back
                </h2>
                <p className="text-[15px] text-[#86868b]">
                  Sign in to access your dashboard
                </p>
              </div>

              {error && (
                <div className="mb-8 p-4 rounded-xl bg-[#ff3b30]/10 text-[#ff3b30] text-[13px] text-center font-medium">
                  {error}
                </div>
              )}

              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="
                  w-full flex items-center justify-center gap-3
                  h-[50px] rounded-xl
                  bg-[#1d1d1f]
                  text-white
                  text-[15px] font-medium
                  shadow-lg shadow-black/10
                  hover:shadow-xl hover:scale-[1.02]
                  active:scale-[0.98]
                  transition-all duration-200 ease-out
                  disabled:opacity-50 disabled:cursor-not-allowed
                  group
                "
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>Continue with Google</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>

              <div className="mt-10 pt-8 border-t border-black/5">
                <p className="text-center text-[12px] text-[#86868b]">
                  By signing in, you agree to our{' '}
                  <a href="#" className="text-[#0071e3] hover:underline">Terms</a>
                  {' '}and{' '}
                  <a href="#" className="text-[#0071e3] hover:underline">Privacy Policy</a>
                </p>
              </div>
            </div>

            {/* Security Badge */}
            <div className="mt-8 flex items-center justify-center gap-2 text-[12px] text-[#86868b]">
              <Shield className="w-4 h-4" />
              <span>Secured with enterprise-grade encryption</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

