'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const requestReset = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    setMessage(error ? error.message : 'Check your email for a password reset link.');
    setLoading(false);
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0F3460] p-4">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.12]"><img src="/cukwa-logo.svg" alt="" aria-hidden="true" className="w-[min(900px,90vw)]" /></div>
      <section className="relative z-10 w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl sm:p-10">
        <img src="/cukwa-logo.svg" alt="CUKWA marketplace" className="mx-auto mb-6 h-14 w-auto" />
        <h1 className="text-2xl font-bold text-slate-900">Reset your password</h1>
        <p className="mt-2 text-sm text-slate-600">Enter your account email and we will send you a secure reset link.</p>
        <form onSubmit={requestReset} className="mt-6 space-y-4">
          <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-black focus:border-orange-500 focus:outline-none" />
          <button disabled={loading} className="w-full rounded-xl bg-orange-500 py-3.5 font-semibold text-white hover:bg-orange-600 disabled:opacity-60">{loading ? 'Sending...' : 'Send reset link'}</button>
        </form>
        {message && <p className="mt-4 rounded-xl bg-orange-50 p-3 text-sm text-orange-800">{message}</p>}
        <Link href="/login" className="mt-6 block text-center text-sm font-medium text-blue-700 hover:underline">Back to login</Link>
      </section>
    </main>
  );
}
