import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Shield, Users, TrendingUp, Calendar, BarChart3, CheckSquare, Briefcase, Mail, Lock, Eye, EyeOff } from 'lucide-react';

const Login = () => {
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

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    
    try {
      setError('');
      setEmailLoading(true);
      console.log('🚀 Starting email sign-in...');
      
      await signInWithEmail(email, password);
      console.log('✅ Email sign-in successful');
      console.log('🔄 AuthContext will handle redirect...');
    } catch (error) {
      console.error('❌ Sign-in error:', error);
      setError(error.message || 'Failed to sign in. Please try again.');
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
    <div className="min-h-screen bg-surface-2 relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-soft/80 via-transparent to-brand-soft/50" />
      
      {/* Gradient shapes */}
      <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full bg-gradient-to-br from-brand/10 to-brand/10 blur-3xl" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-brand/10 to-[#ff2d55]/10 blur-3xl" />

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
              <h1 className="text-xl font-semibold text-ink tracking-[-0.02em]">
                Luxury Listings
              </h1>
              <p className="text-[13px] text-ink-muted">Professional Portal</p>
            </div>
          </div>

          {/* Hero Content */}
          <div className="max-w-lg">
            <h2 className="text-[56px] font-semibold text-ink leading-[1.05] tracking-[-0.03em] mb-6">
              Your team's workspace,
              <br />
              <span className="bg-gradient-to-r from-brand to-brand bg-clip-text text-transparent">
                all in one place.
              </span>
            </h2>
            <p className="text-[19px] text-ink-muted leading-relaxed font-normal mb-8">
              Manage clients, content calendars, tasks, and team operations from a single dashboard.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-3 gap-4">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-white/60 backdrop-blur-xl border border-black/5"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand to-brand flex items-center justify-center mb-3 shadow-lg shadow-brand/20">
                  <feature.icon className="w-4 h-4 text-white" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-[13px] text-ink mb-0.5">{feature.title}</h3>
                <p className="text-[12px] text-ink-muted">{feature.desc}</p>
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
                <h1 className="text-xl font-semibold text-ink tracking-[-0.02em]">
                  Luxury Listings
                </h1>
                <p className="text-[13px] text-ink-muted">Professional Portal</p>
              </div>
            </div>

            {/* Login Card */}
            <div className="bg-white/80 backdrop-blur-2xl rounded-xl p-10 border border-black/5 shadow-lg shadow-black/5">
              <div className="text-center mb-10">
                <h2 className="text-[28px] font-semibold text-ink tracking-[-0.02em] mb-2">
                  Welcome back
                </h2>
                <p className="text-[15px] text-ink-muted">
                  Sign in to access your dashboard
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-danger/10 text-danger text-[13px] text-center font-medium">
                  {error}
                </div>
              )}

              {/* Email/Password Form */}
              <form onSubmit={handleEmailSignIn} className="space-y-4 mb-6">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="
                      w-full h-[50px] pl-12 pr-4 rounded-xl
                      bg-surface-2 border border-black/5
                      text-[15px] text-ink
                      placeholder:text-ink-muted
                      focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand
                      transition-all duration-200
                    "
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-muted" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="
                      w-full h-[50px] pl-12 pr-12 rounded-xl
                      bg-surface-2 border border-black/5
                      text-[15px] text-ink
                      placeholder:text-ink-muted
                      focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand
                      transition-all duration-200
                    "
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={emailLoading || loading}
                  className="
                    w-full flex items-center justify-center gap-3
                    h-[50px] rounded-xl
                    bg-brand
                    text-white
                    text-[15px] font-medium
                    shadow-lg shadow-brand/20
                    hover:shadow-md hover:bg-brand-hover
                    active:scale-[0.98]
                    transition-all duration-200 ease-out
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
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
                <div className="flex-1 h-px bg-black/10" />
                <span className="text-[13px] text-ink-muted">or</span>
                <div className="flex-1 h-px bg-black/10" />
              </div>

              {/* Google Sign In */}
              <button
                onClick={handleGoogleSignIn}
                disabled={loading || emailLoading}
                className="
                  w-full flex items-center justify-center gap-3
                  h-[50px] rounded-xl
                  bg-white border border-black/10
                  text-ink
                  text-[15px] font-medium
                  shadow-sm
                  hover:shadow-md hover:border-black/20
                  active:scale-[0.98]
                  transition-all duration-200 ease-out
                  disabled:opacity-50 disabled:cursor-not-allowed
                  group
                "
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-ink/30 border-t-[#1d1d1f] rounded-full animate-spin" />
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

              <div className="mt-10 pt-8 border-t border-black/5">
                <p className="text-center text-[12px] text-ink-muted">
                  By signing in, you agree to our{' '}
                  <a href="#" className="text-brand hover:underline">Terms</a>
                  {' '}and{' '}
                  <a href="#" className="text-brand hover:underline">Privacy Policy</a>
                </p>
              </div>
            </div>

            {/* Security Badge */}
            <div className="mt-8 flex items-center justify-center gap-2 text-[12px] text-ink-muted">
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

