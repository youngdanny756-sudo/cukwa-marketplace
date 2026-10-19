'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Share2 } from 'lucide-react';
import ChatModal from '../../component/ChatModal';
import { BackToMarketLink } from '../../component/BackToMarketLink';
import { supabase } from '../../lib/supabase';
import { toWhatsAppNumber } from '../../lib/contacts';
import type { Product } from '../../types';

type SellerContact = { display_name: string | null; phone: string | null; whatsapp_number: string | null };

export default function ProductPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [review, setReview] = useState({ rating: 5, comment: '' });
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [safetyMessage, setSafetyMessage] = useState('');
  const [sellerContact, setSellerContact] = useState<SellerContact | null>(null);

  useEffect(() => {
    const loadProduct = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) setMessage(`Could not check your account: ${authError.message}`);
      setUserId(user?.id || null);
      const { data, error } = await supabase.from('products').select('id, title, category, price, description, image_url, image_urls, phone, location, seller_id, status, approval_status, created_at').eq('id', params.id).single();
      if (error) { setMessage(`Could not load listing: ${error.message}`); return; }
      setSelectedImageUrl(null);
      setProduct(data);
      const { data: profile, error: profileError } = await supabase.from('profiles').select('display_name, phone, whatsapp_number').eq('id', data.seller_id).maybeSingle();
      if (profileError) setMessage(`Could not load seller contact details: ${profileError.message}`);
      setSellerContact(profile);
      if (user && user.id !== data.seller_id) {
        const { error: viewError } = await supabase.from('listing_views').upsert(
          { product_id: String(data.id), viewer_id: user.id },
          { onConflict: 'product_id,viewer_id', ignoreDuplicates: true },
        );
        if (viewError) setMessage(`Could not record listing view: ${viewError.message}`);
      }
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

  const shareListing = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: product?.title || 'CUKWA listing', url });
      } else {
        await navigator.clipboard.writeText(url);
        setMessage('Listing link copied. You can now share it.');
      }
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === 'AbortError') return;
      setMessage(shareError instanceof Error ? `Could not share listing: ${shareError.message}` : 'Could not share listing.');
    }
  };

  if (!product) return <main className="p-8">Loading listing...</main>;

  const productImages = Array.from(new Set([product.image_url, ...(product.image_urls || [])].filter((url): url is string => Boolean(url))));
  const activeImage = productImages.find((url) => url === selectedImageUrl) || productImages[0];

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-5 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <BackToMarketLink />
        <div className="mt-5 grid gap-5 rounded-2xl bg-white p-4 shadow-sm sm:mt-6 sm:gap-8 sm:rounded-3xl sm:p-6 md:grid-cols-2">
          <section aria-label="Product photos">
            <div className="flex h-64 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 sm:h-96">
              {activeImage ? <img src={activeImage} alt={`${product.title}, selected photo`} className="h-full w-full object-contain" /> : <span className="text-sm text-slate-500">No photo available</span>}
            </div>
            {productImages.length > 1 && (
              <div className="mt-3">
                <p className="mb-2 text-sm font-medium text-slate-600">Photos of this item ({productImages.length})</p>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {productImages.map((url, index) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setSelectedImageUrl(url)}
                      aria-label={`Show photo ${index + 1} of ${productImages.length}`}
                      aria-pressed={activeImage === url}
                      className={`shrink-0 overflow-hidden rounded-xl border-2 ${activeImage === url ? 'border-orange-500' : 'border-transparent'}`}
                    >
                      <img src={url} alt="" className="h-20 w-20 object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
          <div>
            <p className="text-sm font-semibold text-orange-500">{product.category}</p>
            <h1 className="mt-2 break-words text-2xl font-bold text-slate-900 sm:text-4xl">{product.title}</h1>
            <p className="mt-4 text-2xl font-bold text-orange-500 sm:text-3xl">UGX {product.price.toLocaleString()}</p>
            <p className="mt-5 whitespace-pre-wrap text-slate-600">{product.description || 'No description provided.'}</p>
            <p className="mt-5 text-sm text-slate-500">{product.location || 'Location not provided'}</p>
            <Link href={`/seller/${product.seller_id}`} className="mt-3 block font-semibold text-blue-700 hover:underline">View {sellerContact?.display_name || 'seller'} profile</Link>
            <div className="mt-4 flex flex-wrap gap-2">
              {(sellerContact?.phone || product.phone) && <a href={`tel:${sellerContact?.phone || product.phone}`} className="rounded-xl bg-green-700 px-4 py-3 text-sm font-bold text-white hover:bg-green-800">Call seller</a>}
              {(sellerContact?.whatsapp_number || sellerContact?.phone || product.phone) && <a href={`https://wa.me/${toWhatsAppNumber(sellerContact?.whatsapp_number || sellerContact?.phone || product.phone || '')}`} target="_blank" rel="noreferrer" className="rounded-xl border border-green-700 px-4 py-3 text-sm font-bold text-green-800 hover:bg-green-50">WhatsApp</a>}
              <button type="button" onClick={() => void shareListing()} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"><Share2 className="h-4 w-4" />Share listing</button>
            </div>
            {userId !== product.seller_id && <button onClick={() => setShowChat(true)} className="mt-4 w-full rounded-xl bg-purple-600 py-3 font-semibold text-white hover:bg-purple-700">Message seller</button>}
            {userId === product.seller_id && <button onClick={() => router.push(`/edit/${product.id}`)} className="mt-3 w-full rounded-xl border border-slate-200 py-3 font-semibold text-slate-700">Edit listing</button>}
          </div>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <form onSubmit={submitReview} className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Rate this seller</h2>
            <select value={review.rating} onChange={(e) => setReview({ ...review, rating: Number(e.target.value) })} className="mt-4 w-full rounded-xl border p-3 text-black">
              <option value="5">5 stars</option><option value="4">4 stars</option><option value="3">3 stars</option><option value="2">2 stars</option><option value="1">1 star</option>
            </select>
            <textarea value={review.comment} onChange={(e) => setReview({ ...review, comment: e.target.value })} placeholder="Share your experience" className="mt-3 w-full rounded-xl border p-3 text-black" rows={3} />
            <button className="mt-3 rounded-xl bg-blue-700 px-4 py-2 font-semibold text-white">Save review</button>
          </form>
          <form onSubmit={submitReport} className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Report this listing</h2>
            <select required value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="mt-4 w-full rounded-xl border p-3 text-black">
              <option value="">Choose a reason</option><option>Scam or fraud</option><option>Prohibited item</option><option>Wrong information</option><option>Duplicate listing</option>
            </select>
            <button className="mt-3 rounded-xl bg-red-600 px-4 py-2 font-semibold text-white">Submit report</button>
          </form>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={blockSeller} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Block seller</button>
          <button onClick={reportSeller} className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700">Report seller</button>
        </div>
        {message && <p className="mt-4 rounded-xl bg-blue-50 p-4 text-blue-800">{message}</p>}
        {safetyMessage && <p className="mt-4 rounded-xl bg-amber-50 p-4 text-amber-800">{safetyMessage}</p>}
      </div>
      {showChat && <ChatModal productId={product.id} productTitle={product.title} sellerId={product.seller_id} onClose={() => setShowChat(false)} />}
    </main>
  );
}
