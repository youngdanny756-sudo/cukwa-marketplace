'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

export default function EditListingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState({ title: '', price: '', category: '', description: '', phone: '', location: '' });
  const [message, setMessage] = useState('Loading listing...');

  useEffect(() => {
    const loadListing = async () => {
      const { data } = await supabase.from('products').select('title, price, category, description, phone, location').eq('id', params.id).single();
      if (!data) { setMessage('Listing not found.'); return; }
      setForm({ title: data.title || '', price: String(data.price || ''), category: data.category || '', description: data.description || '', phone: data.phone || '', location: data.location || '' });
      setMessage('');
    };
    loadListing();
  }, [params.id]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const { error } = await supabase.from('products').update({ ...form, price: Number(form.price), updated_at: new Date().toISOString() }).eq('id', params.id);
    if (error) setMessage(error.message); else router.push('/dashboard');
  };

  return <main className="min-h-screen bg-gray-50 p-8"><div className="mx-auto max-w-2xl"><Link href="/dashboard" className="text-sm font-semibold text-blue-700 hover:underline">Back to my listings</Link><h1 className="mt-6 text-3xl font-bold">Edit listing</h1>{message && <p className="mt-4 text-slate-500">{message}</p>}<form onSubmit={save} className="mt-6 space-y-4 rounded-2xl bg-white p-6 shadow-sm"><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-xl border p-3 text-black" placeholder="Title" /><input required type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full rounded-xl border p-3 text-black" placeholder="Price" /><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-xl border p-3 text-black" placeholder="Category" /><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full rounded-xl border p-3 text-black" placeholder="Location" /><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-xl border p-3 text-black" placeholder="Phone" /><textarea rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-xl border p-3 text-black" placeholder="Description" /><button className="rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white">Save changes</button></form></div></main>;
}
