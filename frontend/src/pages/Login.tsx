import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Car, Eye, EyeOff, AlertCircle, Loader2, Lock, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'operator' | null>(null);

  const QUICK_CREDS = {
    admin: { email: 'admin@sih26127.gov.in', password: 'admin123' },
    operator: { email: 'operator@sih26127.gov.in', password: 'ops123' },
  };

  const handleQuickSelect = (role: 'admin' | 'operator') => {
    setSelectedRole(role);
    setEmail(QUICK_CREDS[role].email);
    setPassword(QUICK_CREDS[role].password);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your credentials.');
      return;
    }
    setLoading(true);
    setError('');
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      navigate('/');
    } else {
      setError(result.error || 'Login failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[#070c14] flex items-center justify-center relative overflow-hidden">
      {/* Ambient grid background */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(56,189,248,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.8) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 mb-4 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
            <Car className="w-8 h-8 text-cyan-400" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">SafeWatch</h1>
            <span className="bg-sky-500/20 text-sky-300 text-xs font-mono px-2 py-0.5 rounded border border-sky-500/40 font-bold">
              PS-26127
            </span>
          </div>
          <p className="text-sky-400 font-semibold text-sm font-mono mt-1 text-center">
            City Intelligence
          </p>
          <p className="text-slate-400 text-xs font-mono mt-1 text-center">
            AI Multi-Camera ANPR & Urban Traffic Surveillance Platform
          </p>
        </div>

        {/* Role Quick Select */}
        <div className="mb-6">
          <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-3 text-center">
            Quick Access
          </p>
          <div className="grid grid-cols-2 gap-3">
            {(['admin', 'operator'] as const).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => handleQuickSelect(role)}
                className={`p-3 rounded-xl border text-left transition-all duration-200 ${
                  selectedRole === role
                    ? 'border-sky-500/60 bg-sky-500/10 shadow-[0_0_15px_rgba(56,189,248,0.1)]'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      role === 'admin' ? 'bg-sky-400' : 'bg-emerald-400'
                    }`}
                  />
                  <span
                    className={`text-xs font-bold uppercase tracking-wider ${
                      role === 'admin' ? 'text-sky-400' : 'text-emerald-400'
                    }`}
                  >
                    {role}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono">{QUICK_CREDS[role].email}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 backdrop-blur-sm shadow-2xl">
          <h2 className="text-sm font-semibold text-slate-300 mb-5">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setSelectedRole(null); }}
                  placeholder="you@safewatch.io"
                  autoComplete="email"
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-2.5 pl-10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500/50 focus:bg-sky-500/5 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-2.5 pl-10 pr-10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500/50 focus:bg-sky-500/5 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(56,189,248,0.3)] hover:shadow-[0_0_30px_rgba(56,189,248,0.5)]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-6 font-mono">
          Smart India Hackathon 2024 · Problem Statement 26127 · AI Vehicle Intelligence
        </p>
      </div>
    </div>
  );
};

export default Login;
