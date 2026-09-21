'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) setMessage('This reset link is invalid or has expired. Request a new one.');
    };
    void Promise.resolve().then(checkSession);
  }, []);

  const updatePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 6) {
      setMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmation) {
      setMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setMessage(error ? error.message : 'Password updated. Redirecting to login...');
    setLoading(false);
    if (!error) setTimeout(() => router.push('/login'), 1200);
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0F3460] p-4">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.12]"><img src="/cukwa-logo.png" alt="" aria-hidden="true" className="w-[min(900px,90vw)]" /></div>
      <section className="relative z-10 w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl sm:p-10">
        <img src="/cukwa-logo.png" alt="CUKWA marketplace" className="mx-auto mb-6 h-14 w-auto" />
        <h1 className="text-2xl font-bold text-slate-900">Choose a new password</h1>
        <form onSubmit={updatePassword} className="mt-6 space-y-4">
          <div className="relative"><input type={showPassword ? 'text' : 'password'} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New password" className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-12 text-black focus:border-orange-500 focus:outline-none" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-3 text-slate-500" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div>
          <input type={showPassword ? 'text' : 'password'} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Confirm new password" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-black focus:border-orange-500 focus:outline-none" />
          <button disabled={loading} className="w-full rounded-xl bg-orange-500 py-3.5 font-semibold text-white hover:bg-orange-600 disabled:opacity-60">{loading ? 'Updating...' : 'Update password'}</button>
        </form>
        {message && <p className="mt-4 rounded-xl bg-orange-50 p-3 text-sm text-orange-800">{message}</p>}
      </section>
    </main>
  );
}
