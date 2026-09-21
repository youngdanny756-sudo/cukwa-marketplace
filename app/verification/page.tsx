'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

export default function VerificationPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [document, setDocument] = useState<File | null>(null);
  const [status, setStatus] = useState('Loading verification status...');

  useEffect(() => {
    const loadStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStatus('Please log in first.'); return; }
      setUserId(user.id);
      const { data } = await supabase.from('verification_requests').select('status, admin_note, phone_number').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (data) { setPhoneNumber(data.phone_number); setStatus(`Verification status: ${data.status}${data.admin_note ? ` - ${data.admin_note}` : ''}`); } else setStatus('Verification status: not requested');
    };
    void Promise.resolve().then(loadStatus);
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!userId || !phoneNumber) return;
    let documentPath: string | null = null;
    if (document) {
      documentPath = `${userId}/${Date.now()}-${document.name}`;
      const { error: uploadError } = await supabase.storage.from('verification-documents').upload(documentPath, document, { upsert: false });
      if (uploadError) { setStatus(uploadError.message); return; }
    }
    const { error } = await supabase.from('verification_requests').insert({ user_id: userId, phone_number: phoneNumber, id_document_path: documentPath });
    setStatus(error ? error.message : 'Verification request submitted. An admin will review it.');
  };

  return <main className="min-h-screen bg-gray-50 p-8"><div className="mx-auto max-w-2xl"><Link href="/profile" className="text-sm font-semibold text-blue-700 hover:underline">Back to profile</Link><section className="mt-6 rounded-3xl bg-white p-8 shadow-sm"><h1 className="text-3xl font-bold">Seller verification</h1><p className="mt-2 text-sm text-slate-600">Verification builds trust. Do not upload sensitive documents until your storage policies are configured.</p><div className="mt-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">{status}</div><form onSubmit={submit} className="mt-6 space-y-4"><input required type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Phone number for verification" className="w-full rounded-xl border p-3 text-black" /><input type="file" accept="image/*,.pdf" onChange={(e) => setDocument(e.target.files?.[0] || null)} className="w-full text-sm text-slate-600" /><button className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white">Submit verification request</button></form></section></div></main>;
}
