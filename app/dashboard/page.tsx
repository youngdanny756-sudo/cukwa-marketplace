'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';
import { BackToMarketLink } from '../component/BackToMarketLink';

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [listingMetrics, setListingMetrics] = useState<Record<string, { views: number; inquiries: number }>>({});
  const [metricsError, setMetricsError] = useState('');
  const [message, setMessage] = useState('Loading your listings...');

  const loadListings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage('Please log in to manage listings.'); return; }
    const { data, error } = await supabase.from('products').select('id, title, category, price, description, image_url, image_urls, moderation_note, phone, location, seller_id, status, approval_status, expires_at, is_draft, created_at').eq('seller_id', user.id).order('created_at', { ascending: false });
    if (error) { setMessage(error.message); return; }
    setProducts(data || []);
    if (data?.length) {
      const productIds = data.map((product) => String(product.id));
      const [viewsResult, messagesResult] = await Promise.all([
        supabase.from('listing_views').select('product_id').in('product_id', productIds),
        supabase.from('chat_messages').select('product_id, sender_id').in('product_id', productIds),
      ]);
      const metricsQueryError = viewsResult.error || messagesResult.error;
      if (metricsQueryError) {
        setMetricsError(`Listing insights could not be loaded: ${metricsQueryError.message}`);
      } else {
        const nextMetrics: Record<string, { views: number; inquiries: number }> = {};
        for (const product of data) nextMetrics[String(product.id)] = { views: 0, inquiries: 0 };
        for (const view of viewsResult.data || []) {
          const metrics = nextMetrics[view.product_id];
          if (metrics) metrics.views += 1;
        }
        const uniqueInquiries = new Map<string, Set<string>>();
        for (const chat of messagesResult.data || []) {
          const product = data.find((item) => String(item.id) === chat.product_id);
          if (!product || chat.sender_id === product.seller_id) continue;
          if (!uniqueInquiries.has(chat.product_id)) uniqueInquiries.set(chat.product_id, new Set());
          uniqueInquiries.get(chat.product_id)?.add(chat.sender_id);
        }
        for (const [productId, buyers] of uniqueInquiries) {
          const metrics = nextMetrics[productId];
          if (metrics) metrics.inquiries = buyers.size;
        }
        setListingMetrics(nextMetrics);
        setMetricsError('');
      }
    } else {
      setListingMetrics({});
      setMetricsError('');
    }
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

  return <main className="min-h-screen bg-gray-50 px-4 py-5 sm:p-8"><div className="mx-auto max-w-5xl"><BackToMarketLink /><div className="mt-6 flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-bold text-slate-900">My listings</h1><div className="flex gap-2"><Link href="/inbox" className="rounded-xl border px-3 py-2 text-sm font-semibold sm:px-4">Inbox</Link><Link href="/profile" className="rounded-xl border px-3 py-2 text-sm font-semibold sm:px-4">Edit profile</Link><Link href="/sell" className="rounded-xl bg-orange-500 px-3 py-2 text-sm font-semibold text-white sm:px-4">Post an ad</Link></div></div>{message && <p className="mt-4 text-slate-500">{message}</p>}{metricsError && <p role="alert" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{metricsError}</p>}{!message && products.length === 0 && <p className="mt-6 rounded-2xl bg-white p-5 text-slate-600">You have not posted any ads yet.</p>}<div className="mt-6 space-y-3">{products.map((product) => <div key={product.id} className="flex flex-wrap items-center gap-4 rounded-2xl bg-white p-4 shadow-sm sm:p-5">{product.image_url ? <img src={product.image_url} alt={product.title} className="h-16 w-16 rounded-xl object-cover sm:h-20 sm:w-20" /> : <div className="h-16 w-16 rounded-xl bg-slate-100 sm:h-20 sm:w-20" />}<div className="min-w-40 flex-1"><h2 className="break-words font-semibold">{product.title}</h2><p className="mt-1 text-sm text-slate-500">UGX {product.price.toLocaleString()} · {product.status} · approval: {product.approval_status || 'approved'}</p><p className="mt-1 text-xs font-medium text-slate-600">Insights: {listingMetrics[String(product.id)]?.views ?? '—'} unique views · {listingMetrics[String(product.id)]?.inquiries ?? '—'} interested buyers</p>{product.approval_status === 'pending' && <p className="mt-1 text-sm text-amber-700">Waiting for an admin to approve this ad. It is not visible in the marketplace yet.</p>}{product.moderation_note && <p className="mt-1 text-sm text-red-700">{product.moderation_note}</p>}</div><div className="flex flex-wrap gap-2"><Link href={`/edit/${product.id}`} className="rounded-xl border px-3 py-2 text-sm font-semibold">Edit</Link>{product.status === 'active' && <button onClick={() => updateStatus(product.id, 'sold')} className="rounded-xl bg-green-600 px-3 py-2 text-sm font-semibold text-white">Mark sold</button>}{product.status === 'sold' && <button onClick={() => updateStatus(product.id, 'active', { approval_status: 'pending', expires_at: new Date(Date.now() + 30 * 86400000).toISOString(), renewed_at: new Date().toISOString() })} className="rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white">Renew</button>}<button onClick={() => removeListing(product.id)} className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white">Remove</button></div></div>)}</div></div></main>;
}
