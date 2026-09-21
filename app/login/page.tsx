'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Eye, EyeOff } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      router.push('/');
    }

    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setResetMessage('Enter your email address first.');
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetMessage(error ? error.message : 'Check your email for a password reset link.');
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0F3460] p-4">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.12]">
        <img src="/cukwa-logo.svg" alt="" aria-hidden="true" className="w-[min(900px,90vw)]" />
      </div>

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-10 relative z-10">
        <div className="text-center mb-8">
          <img src="/cukwa-logo.svg" alt="CUKWA marketplace" className="mx-auto mb-5 h-14 w-auto" />
          <h1 className="text-3xl font-bold text-blue-900">Welcome back</h1>
          <p className="mt-1 font-semibold text-orange-600">Buy, sell, and connect locally</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 text-black bg-white border border-gray-300 rounded-xl focus:outline-none focus:border-orange-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-12 text-black focus:border-orange-500 focus:outline-none"
              required
            />
            <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="relative float-right -mt-10 mr-3 text-gray-500" aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          <div className="flex items-center justify-between text-sm">
            <button type="button" onClick={handleForgotPassword} className="font-medium text-orange-600 hover:underline">Forgot password?</button>
          </div>

          {resetMessage && <p className="rounded-xl bg-orange-50 p-3 text-sm text-orange-800">{resetMessage}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white py-3.5 rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-70"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-orange-600 font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}