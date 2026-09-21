'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState('Loading your listings...');

  const loadListings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage('Please log in to manage listings.'); return; }
    const { data, error } = await supabase.from('products').select('id, title, category, price, description, image_url, image_urls, phone, location, seller_id, status, approval_status, expires_at, is_draft, created_at').eq('seller_id', user.id).order('created_at', { ascending: false });
    if (error) { setMessage(error.message); return; }
    setProducts(data || []);
    setMessage('');
  };

  useEffect(() => { void Promise.resolve().then(loadListings); }, []);

  const removeListing = async (id: string) => {
    const { error } = await supabase.from('products').update({ status: 'removed' }).eq('id', id);
    if (error) setMessage(error.message); else loadListings();
  };

  const updateStatus = async (id: string, status: string, values = {}) => {
    const { error } = await supabase.from('products').update({ status, ...values }).eq('id', id);
    if (error) setMessage(error.message); else void loadListings();
  };

  return <main className="min-h-screen bg-gray-50 p-8"><div className="mx-auto max-w-5xl"><Link href="/" className="text-sm font-semibold text-blue-700 hover:underline">Back to marketplace</Link><div className="mt-6 flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-bold text-slate-900">My listings</h1><div className="flex gap-2"><Link href="/profile" className="rounded-xl border px-4 py-2 font-semibold">Edit profile</Link><Link href="/sell" className="rounded-xl bg-orange-500 px-4 py-2 font-semibold text-white">Post an ad</Link></div></div>{message && <p className="mt-4 text-slate-500">{message}</p>}<div className="mt-6 space-y-3">{products.map((product) => <div key={product.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm"><div><h2 className="font-semibold">{product.title}</h2><p className="mt-1 text-sm text-slate-500">UGX {product.price.toLocaleString()} · {product.status} · approval: {product.approval_status || 'approved'}</p></div><div className="flex flex-wrap gap-2"><Link href={`/edit/${product.id}`} className="rounded-xl border px-3 py-2 text-sm font-semibold">Edit</Link>{product.status === 'active' && <button onClick={() => updateStatus(product.id, 'sold')} className="rounded-xl bg-green-600 px-3 py-2 text-sm font-semibold text-white">Mark sold</button>}{product.status === 'sold' && <button onClick={() => updateStatus(product.id, 'active', { approval_status: 'pending', expires_at: new Date(Date.now() + 30 * 86400000).toISOString(), renewed_at: new Date().toISOString() })} className="rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white">Renew</button>}<button onClick={() => removeListing(product.id)} className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white">Remove</button></div></div>)}</div></div></main>;
}
