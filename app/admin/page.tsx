'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import type { Profile, Product } from '../types';

type Verification = { id: string; user_id: string; phone_number: string; id_document_path: string | null; status: string; admin_note: string | null };
type Report = { id: string; product_id: string; reason: string; details: string | null; status: string; created_at: string };
type Flag = { id: string; product_id: string; score: number; reasons: string[]; status: string };

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [message, setMessage] = useState('Loading admin data...');

  const loadAdminData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage('Please log in.'); return; }
    const { data: ownProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (ownProfile?.role !== 'admin') { setMessage('Admin access required.'); return; }
    const [productResult, profileResult, verificationResult, reportResult, flagResult] = await Promise.all([
      supabase.from('products').select('id, title, category, price, description, image_url, phone, location, seller_id, status, approval_status, created_at').eq('approval_status', 'pending').order('created_at', { ascending: true }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('verification_requests').select('*').eq('status', 'pending').order('created_at', { ascending: true }),
      supabase.from('listing_reports').select('*').neq('status', 'resolved').order('created_at', { ascending: false }),
      supabase.from('suspicious_listing_flags').select('*').eq('status', 'open').order('score', { ascending: false }),
    ]);
    setProducts(productResult.data || []);
    setProfiles(profileResult.data || []);
    setVerifications(verificationResult.data || []);
    setReports(reportResult.data || []);
    setFlags(flagResult.data || []);
    setMessage('');
  };

  useEffect(() => { void Promise.resolve().then(loadAdminData); }, []);

  const moderateListing = async (id: string, approval_status: string, moderation_note?: string) => {
    await supabase.from('products').update({ approval_status, moderation_note }).eq('id', id);
    void loadAdminData();
  };

  const reviewVerification = async (request: Verification, status: string) => {
    if (request.id) await supabase.from('verification_requests').update({ status, reviewed_at: new Date().toISOString() }).eq('id', request.id);
    await supabase.from('profiles').update({ is_verified: status === 'approved', verification_status: status }).eq('id', request.user_id);
    void loadAdminData();
  };

  const updateReport = async (id: string, status: string) => {
    await supabase.from('listing_reports').update({ status }).eq('id', id);
    void loadAdminData();
  };

  const updateFlag = async (id: string, status: string) => {
    await supabase.from('suspicious_listing_flags').update({ status }).eq('id', id);
    void loadAdminData();
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm font-semibold text-blue-700 hover:underline">Back to marketplace</Link>
        <h1 className="mt-6 text-3xl font-bold">Admin moderation dashboard</h1>
        <p className="mt-2 max-w-3xl text-slate-600">Listings are hidden from buyers until you approve them. Review photos, price, description, seller history, reports, and verification evidence before publishing.</p>
        {message && <p className="mt-4 text-slate-600">{message}</p>}

        <section className="mt-8">
          <h2 className="text-xl font-bold">Pending listing approval</h2>
          <div className="mt-3 space-y-3">
            {products.map((product) => (
              <div key={product.id} className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div><p className="font-semibold">{product.title}</p><p className="text-sm text-slate-500">UGX {product.price.toLocaleString()} · {product.category} · seller {product.seller_id}</p><p className="mt-2 text-sm text-slate-600">{product.description}</p></div>
                  <div className="flex gap-2"><button onClick={() => moderateListing(product.id, 'approved')} className="rounded-xl bg-green-600 px-3 py-2 text-sm font-semibold text-white">Approve</button><button onClick={() => moderateListing(product.id, 'rejected', 'Listing needs changes before approval.')} className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white">Reject</button></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8"><h2 className="text-xl font-bold">Verification requests</h2><div className="mt-3 space-y-3">{verifications.map((request) => <div key={request.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm"><div><p className="font-semibold">Seller {request.user_id}</p><p className="text-sm text-slate-500">Phone: {request.phone_number} · ID file: {request.id_document_path ? 'uploaded' : 'not uploaded'}</p></div><div className="flex gap-2"><button onClick={() => reviewVerification(request, 'approved')} className="rounded-xl bg-green-600 px-3 py-2 text-sm font-semibold text-white">Approve</button><button onClick={() => reviewVerification(request, 'rejected')} className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white">Reject</button></div></div>)}</div></section>

        <section className="mt-8"><h2 className="text-xl font-bold">Suspicious listing flags</h2><div className="mt-3 space-y-3">{flags.map((flag) => <div key={flag.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-amber-50 p-4"><div><p className="font-semibold">Product {flag.product_id} · risk score {flag.score}</p><p className="text-sm text-slate-600">{flag.reasons.join(', ')}</p></div><div className="flex gap-2"><button onClick={() => updateFlag(flag.id, 'reviewed')} className="rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white">Reviewed</button><button onClick={() => updateFlag(flag.id, 'dismissed')} className="rounded-xl border px-3 py-2 text-sm font-semibold">Dismiss</button></div></div>)}</div></section>

        <section className="mt-8"><h2 className="text-xl font-bold">Seller verification badges</h2><div className="mt-3 space-y-3">{profiles.map((profile) => <div key={profile.id} className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm"><div><p className="font-semibold">{profile.display_name || profile.id}</p><p className="text-sm text-slate-500">{profile.verification_status || 'not_requested'}</p></div><button onClick={() => reviewVerification({ id: '', user_id: profile.id, phone_number: profile.phone || '', id_document_path: null, status: '', admin_note: null }, profile.is_verified ? 'rejected' : 'approved')} className="rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white">{profile.is_verified ? 'Unverify' : 'Verify seller'}</button></div>)}</div></section>

        <section className="mt-8"><h2 className="text-xl font-bold">Listing reports</h2><div className="mt-3 space-y-3">{reports.map((report) => <div key={report.id} className="rounded-2xl bg-white p-4 shadow-sm"><p className="font-semibold">{report.reason}</p><p className="text-sm text-slate-500">Product {report.product_id} · {report.status}</p><div className="mt-3 flex gap-2"><button onClick={() => updateReport(report.id, 'reviewing')} className="rounded-lg border px-3 py-1 text-sm">Review</button><button onClick={() => updateReport(report.id, 'resolved')} className="rounded-lg bg-green-600 px-3 py-1 text-sm text-white">Resolve</button><button onClick={() => updateReport(report.id, 'dismissed')} className="rounded-lg bg-slate-600 px-3 py-1 text-sm text-white">Dismiss</button></div></div>)}</div></section>
      </div>
    </main>
  );
}
