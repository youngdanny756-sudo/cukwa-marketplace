'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import type { Profile, Product } from '../types';
import { BackToMarketLink } from '../component/BackToMarketLink';

type Verification = { id: string; user_id: string; phone_number: string; id_document_path: string | null; status: string; admin_note: string | null };
type Report = { id: string; product_id?: string; reporter_id: string; reported_id?: string; reason: string; details: string | null; status: string; admin_note: string | null; created_at: string };
type Flag = { id: string; product_id: string; score: number; reasons: string[]; status: string };
type ReportAction = { id: string; report_type: 'listing' | 'seller'; report_id: string; action: string; note: string | null; old_status: string | null; new_status: string | null; created_at: string };

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [sellerReports, setSellerReports] = useState<Report[]>([]);
  const [reportHistory, setReportHistory] = useState<ReportAction[]>([]);
  const [reportNotes, setReportNotes] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Flag[]>([]);
  const [message, setMessage] = useState('Loading admin data...');

  const loadAdminData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage('Please log in.'); return; }
    const { data: ownProfile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profileError) { setMessage(`Could not verify admin access: ${profileError.message}`); return; }
    if (ownProfile?.role !== 'admin') { setMessage('Admin access required.'); return; }
    const [productResult, profileResult, verificationResult, reportResult, sellerReportResult, flagResult, historyResult] = await Promise.all([
      supabase.from('products').select('id, title, category, price, description, image_url, image_urls, phone, location, seller_id, status, approval_status, created_at').eq('approval_status', 'pending').order('created_at', { ascending: true }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('verification_requests').select('*').eq('status', 'pending').order('created_at', { ascending: true }),
      supabase.from('listing_reports').select('*').order('created_at', { ascending: false }),
      supabase.from('user_reports').select('*').order('created_at', { ascending: false }),
      supabase.from('suspicious_listing_flags').select('*').eq('status', 'open').order('score', { ascending: false }),
      supabase.from('report_action_history').select('*').order('created_at', { ascending: false }),
    ]);
    const queryErrors = [productResult.error, profileResult.error, verificationResult.error, reportResult.error, sellerReportResult.error, flagResult.error, historyResult.error].filter((error) => error !== null);
    if (queryErrors.length) { setMessage(`Could not load all admin data: ${queryErrors.map((error) => error.message).join('; ')}`); return; }
    setProducts(productResult.data || []);
    setProfiles(profileResult.data || []);
    setVerifications(verificationResult.data || []);
    setReports(reportResult.data || []);
    setSellerReports(sellerReportResult.data || []);
    setFlags(flagResult.data || []);
    setReportHistory(historyResult.data || []);
    setReportNotes(Object.fromEntries([
      ...(reportResult.data || []).map((report) => [`listing:${report.id}`, report.admin_note || '']),
      ...(sellerReportResult.data || []).map((report) => [`seller:${report.id}`, report.admin_note || '']),
    ]));
    setMessage('');
  };

  useEffect(() => { void Promise.resolve().then(loadAdminData); }, []);

  const moderateListing = async (id: string, approval_status: string, moderation_note?: string) => {
    const { error } = await supabase.from('products').update({ approval_status, moderation_note }).eq('id', id);
    if (error) { setMessage(`Could not update listing: ${error.message}`); return; }
    void loadAdminData();
  };

  const reviewVerification = async (request: Verification, status: string) => {
    if (request.id) {
      const { error } = await supabase.from('verification_requests').update({ status, reviewed_at: new Date().toISOString() }).eq('id', request.id);
      if (error) { setMessage(`Could not update verification request: ${error.message}`); return; }
    }
    const { error } = await supabase.from('profiles').update({ is_verified: status === 'approved', verification_status: status }).eq('id', request.user_id);
    if (error) { setMessage(`Could not update seller verification: ${error.message}`); return; }
    void loadAdminData();
  };

  const updateModerationReport = async (type: 'listing' | 'seller', report: Report, status: string) => {
    const table = type === 'listing' ? 'listing_reports' : 'user_reports';
    const { error } = await supabase.from(table).update({
      status,
      admin_note: reportNotes[`${type}:${report.id}`] ?? report.admin_note ?? '',
    }).eq('id', report.id);
    if (error) { setMessage(`Could not update ${type} report: ${error.message}`); return; }
    void loadAdminData();
  };

  const updateFlag = async (id: string, status: string) => {
    const { error } = await supabase.from('suspicious_listing_flags').update({ status }).eq('id', id);
    if (error) { setMessage(`Could not update flag: ${error.message}`); return; }
    void loadAdminData();
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <BackToMarketLink />
        <h1 className="mt-6 text-3xl font-bold">Admin moderation dashboard</h1>
        <p className="mt-2 max-w-3xl text-slate-600">Listings are hidden from buyers until you approve them. Review photos, price, description, seller history, reports, and verification evidence before publishing.</p>
        {message && <p className="mt-4 text-slate-600">{message}</p>}

        <section className="mt-8">
          <h2 className="text-xl font-bold">Pending listing approval</h2>
          <div className="mt-3 space-y-3">
            {products.map((product) => (
              <div key={product.id} className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-4">{product.image_url ? <img src={product.image_url} alt={product.title} className="h-24 w-24 rounded-xl object-cover" /> : <div className="h-24 w-24 shrink-0 rounded-xl bg-slate-100" />}<div><p className="font-semibold">{product.title}</p><p className="text-sm text-slate-500">UGX {product.price.toLocaleString()} · {product.category} · seller {product.seller_id}</p><p className="mt-2 text-sm text-slate-600">{product.description}</p></div></div>
                  <div className="flex gap-2"><button onClick={() => moderateListing(product.id, 'approved')} className="rounded-xl bg-green-600 px-3 py-2 text-sm font-semibold text-white">Approve</button><button onClick={() => moderateListing(product.id, 'rejected', 'Listing needs changes before approval.')} className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white">Reject</button></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8"><h2 className="text-xl font-bold">Verification requests</h2><div className="mt-3 space-y-3">{verifications.map((request) => <div key={request.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm"><div><p className="font-semibold">Seller {request.user_id}</p><p className="text-sm text-slate-500">Phone: {request.phone_number} · ID file: {request.id_document_path ? 'uploaded' : 'not uploaded'}</p></div><div className="flex gap-2"><button onClick={() => reviewVerification(request, 'approved')} className="rounded-xl bg-green-600 px-3 py-2 text-sm font-semibold text-white">Approve</button><button onClick={() => reviewVerification(request, 'rejected')} className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white">Reject</button></div></div>)}</div></section>

        <section className="mt-8"><h2 className="text-xl font-bold">Suspicious listing flags</h2><div className="mt-3 space-y-3">{flags.map((flag) => <div key={flag.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-amber-50 p-4"><div><p className="font-semibold">Product {flag.product_id} · risk score {flag.score}</p><p className="text-sm text-slate-600">{flag.reasons.join(', ')}</p></div><div className="flex gap-2"><button onClick={() => updateFlag(flag.id, 'reviewed')} className="rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white">Reviewed</button><button onClick={() => updateFlag(flag.id, 'dismissed')} className="rounded-xl border px-3 py-2 text-sm font-semibold">Dismiss</button></div></div>)}</div></section>

        <section className="mt-8"><h2 className="text-xl font-bold">Seller verification badges</h2><div className="mt-3 space-y-3">{profiles.map((profile) => <div key={profile.id} className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm"><div><p className="font-semibold">{profile.display_name || profile.id}</p><p className="text-sm text-slate-500">{profile.verification_status || 'not_requested'}</p></div><button onClick={() => reviewVerification({ id: '', user_id: profile.id, phone_number: profile.phone || '', id_document_path: null, status: '', admin_note: null }, profile.is_verified ? 'rejected' : 'approved')} className="rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white">{profile.is_verified ? 'Unverify' : 'Verify seller'}</button></div>)}</div></section>

        <section className="mt-8">
          <h2 className="text-xl font-bold">Listing reports ({reports.filter((report) => report.status === 'open' || report.status === 'reviewing').length} open · {reports.length} total)</h2>
          <div className="mt-3 space-y-3">{reports.map((report) => (
            <article key={report.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="font-semibold">{report.reason}</p>
              <p className="mt-1 break-all text-sm text-slate-500">Product {report.product_id} · {report.status} · reported by {report.reporter_id}</p>
              {report.details && <p className="mt-2 text-sm text-slate-600">{report.details}</p>}
              <textarea aria-label="Moderator note for listing report" value={reportNotes[`listing:${report.id}`] ?? ''} onChange={(event) => setReportNotes((notes) => ({ ...notes, [`listing:${report.id}`]: event.target.value }))} placeholder="Internal moderator note" rows={2} className="mt-3 w-full rounded-xl border p-3 text-sm text-slate-800" />
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => void updateModerationReport('listing', report, report.status)} className="rounded-lg border px-3 py-2 text-sm font-semibold">Save note</button>
                <button onClick={() => void updateModerationReport('listing', report, 'reviewing')} className="rounded-lg border px-3 py-2 text-sm">Mark reviewing</button>
                <button onClick={() => void updateModerationReport('listing', report, 'resolved')} className="rounded-lg bg-green-600 px-3 py-2 text-sm text-white">Resolve</button>
                <button onClick={() => void updateModerationReport('listing', report, 'dismissed')} className="rounded-lg bg-slate-600 px-3 py-2 text-sm text-white">Dismiss</button>
              </div>
              <ReportHistory reportId={report.id} type="listing" history={reportHistory} />
            </article>
          ))}</div>
        </section>
        <section className="mt-8">
          <h2 className="text-xl font-bold">Seller reports ({sellerReports.filter((report) => report.status === 'open' || report.status === 'reviewing').length} open · {sellerReports.length} total)</h2>
          <div className="mt-3 space-y-3">{sellerReports.map((report) => (
            <article key={report.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="font-semibold">{report.reason}</p>
              <p className="mt-1 break-all text-sm text-slate-500">{report.status} · reported by {report.reporter_id}</p>
              <p className="mt-1 break-all text-sm text-slate-500">Seller: <Link href={`/seller/${report.reported_id}`} className="text-blue-700 hover:underline">{report.reported_id}</Link></p>
              {report.details && <p className="mt-2 text-sm text-slate-600">{report.details}</p>}
              <textarea aria-label="Moderator note for seller report" value={reportNotes[`seller:${report.id}`] ?? ''} onChange={(event) => setReportNotes((notes) => ({ ...notes, [`seller:${report.id}`]: event.target.value }))} placeholder="Internal moderator note" rows={2} className="mt-3 w-full rounded-xl border p-3 text-sm text-slate-800" />
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => void updateModerationReport('seller', report, report.status)} className="rounded-lg border px-3 py-2 text-sm font-semibold">Save note</button>
                <button onClick={() => void updateModerationReport('seller', report, 'reviewing')} className="rounded-lg border px-3 py-2 text-sm">Mark reviewing</button>
                <button onClick={() => void updateModerationReport('seller', report, 'resolved')} className="rounded-lg bg-green-600 px-3 py-2 text-sm text-white">Resolve</button>
                <button onClick={() => void updateModerationReport('seller', report, 'dismissed')} className="rounded-lg bg-slate-600 px-3 py-2 text-sm text-white">Dismiss</button>
              </div>
              <ReportHistory reportId={report.id} type="seller" history={reportHistory} />
            </article>
          ))}</div>
        </section>
      </div>
    </main>
  );
}

function ReportHistory({ reportId, type, history }: { reportId: string; type: 'listing' | 'seller'; history: ReportAction[] }) {
  const actions = history.filter((item) => item.report_id === reportId && item.report_type === type);
  return (
    <details className="mt-3 rounded-xl border border-slate-200 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-slate-700">Action history ({actions.length})</summary>
      {actions.length === 0 ? <p className="mt-2 text-xs text-slate-500">No moderator actions recorded yet.</p> : (
        <ul className="mt-2 space-y-2">
          {actions.map((action) => <li key={action.id} className="border-t pt-2 text-xs text-slate-600">
            <p className="font-semibold">{action.action.replaceAll('_', ' ')}{action.old_status !== action.new_status ? ` · ${action.old_status} → ${action.new_status}` : ''}</p>
            {action.note && <p className="mt-1 whitespace-pre-wrap">{action.note}</p>}
            <time dateTime={action.created_at}>{new Date(action.created_at).toLocaleString()}</time>
          </li>)}
        </ul>
      )}
    </details>
  );
}
