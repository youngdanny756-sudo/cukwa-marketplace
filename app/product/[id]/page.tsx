'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import ChatModal from '../../component/ChatModal';
import { supabase } from '../../lib/supabase';
import type { Product } from '../../types';

export default function ProductPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [review, setReview] = useState({ rating: 5, comment: '' });
  const [message, setMessage] = useState('');
  const [safetyMessage, setSafetyMessage] = useState('');

  useEffect(() => {
    const loadProduct = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
      const { data } = await supabase.from('products').select('id, title, category, price, description, image_url, image_urls, phone, location, seller_id, status, approval_status, created_at').eq('id', params.id).single();
      setProduct(data);
    };
    void Promise.resolve().then(loadProduct);
  }, [params.id]);

  const submitReport = async (event: FormEvent) => {
    event.preventDefault();
    if (!userId || !reportReason) return;
    const { error } = await supabase.from('listing_reports').insert({ product_id: params.id, reporter_id: userId, reason: reportReason });
    setMessage(error ? error.message : 'Report submitted. Our team will review this listing.');
    if (!error) setReportReason('');
  };

  const submitReview = async (event: FormEvent) => {
    event.preventDefault();
    if (!userId || !product) return;
    const { error } = await supabase.from('reviews').upsert({ product_id: product.id, seller_id: product.seller_id, reviewer_id: userId, rating: review.rating, comment: review.comment }, { onConflict: 'product_id,reviewer_id' });
    setMessage(error ? error.message : 'Review saved.');
  };

  const blockSeller = async () => {
    if (!userId || !product) return;
    const { error } = await supabase.from('user_blocks').insert({ blocker_id: userId, blocked_id: product.seller_id });
    setSafetyMessage(error ? error.message : 'Seller blocked.');
  };

  const reportSeller = async () => {
    if (!userId || !product) return;
    const { error } = await supabase.from('user_reports').insert({ reporter_id: userId, reported_id: product.seller_id, reason: 'Concern about seller', details: `Reported from listing ${product.id}` });
    setSafetyMessage(error ? error.message : 'Seller report submitted for admin review.');
  };

  if (!product) return <main className="p-8">Loading listing...</main>;

  return <main className="min-h-screen bg-gray-50 p-8"><div className="mx-auto max-w-5xl"><Link href="/" className="text-sm font-semibold text-blue-700 hover:underline">Back to marketplace</Link><div className="mt-6 grid gap-8 rounded-3xl bg-white p-6 shadow-sm md:grid-cols-2">{product.image_url ? <img src={product.image_url} alt={product.title} className="h-96 w-full rounded-2xl object-cover" /> : <div className="h-96 rounded-2xl bg-slate-100" />}<div><p className="text-sm font-semibold text-orange-500">{product.category}</p><h1 className="mt-2 text-4xl font-bold text-slate-900">{product.title}</h1><p className="mt-4 text-3xl font-bold text-orange-500">UGX {product.price.toLocaleString()}</p><p className="mt-5 whitespace-pre-wrap text-slate-600">{product.description || 'No description provided.'}</p><p className="mt-5 text-sm text-slate-500">{product.location || 'Location not provided'} · {product.phone || 'Phone not provided'}</p><Link href={`/seller/${product.seller_id}`} className="mt-4 block font-semibold text-blue-700 hover:underline">View seller profile</Link><button onClick={() => setShowChat(true)} className="mt-6 w-full rounded-xl bg-green-600 py-3 font-semibold text-white">Chat with Seller</button>{userId === product.seller_id && <button onClick={() => router.push(`/edit/${product.id}`)} className="mt-3 w-full rounded-xl border border-slate-200 py-3 font-semibold text-slate-700">Edit listing</button>}</div></div><div className="mt-8 grid gap-6 md:grid-cols-2"><form onSubmit={submitReview} className="rounded-2xl bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">Rate this seller</h2><select value={review.rating} onChange={(e) => setReview({ ...review, rating: Number(e.target.value) })} className="mt-4 w-full rounded-xl border p-3 text-black"><option value="5">5 stars</option><option value="4">4 stars</option><option value="3">3 stars</option><option value="2">2 stars</option><option value="1">1 star</option></select><textarea value={review.comment} onChange={(e) => setReview({ ...review, comment: e.target.value })} placeholder="Share your experience" className="mt-3 w-full rounded-xl border p-3 text-black" rows={3} /><button className="mt-3 rounded-xl bg-blue-700 px-4 py-2 font-semibold text-white">Save review</button></form><form onSubmit={submitReport} className="rounded-2xl bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">Report this listing</h2><select required value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="mt-4 w-full rounded-xl border p-3 text-black"><option value="">Choose a reason</option><option>Scam or fraud</option><option>Prohibited item</option><option>Wrong information</option><option>Duplicate listing</option></select><button className="mt-3 rounded-xl bg-red-600 px-4 py-2 font-semibold text-white">Submit report</button></form></div><div className="mt-6 flex flex-wrap gap-3"><button onClick={blockSeller} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Block seller</button><button onClick={reportSeller} className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700">Report seller</button></div>{message && <p className="mt-4 rounded-xl bg-blue-50 p-4 text-blue-800">{message}</p>}{safetyMessage && <p className="mt-4 rounded-xl bg-amber-50 p-4 text-amber-800">{safetyMessage}</p>}</div>{showChat && <ChatModal productId={product.id} productTitle={product.title} sellerId={product.seller_id} onClose={() => setShowChat(false)} />}</main>;
}
