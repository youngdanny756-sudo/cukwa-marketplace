'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import type { Product, Profile } from '../../types';
import { BackToMarketLink } from '../../component/BackToMarketLink';
import { toWhatsAppNumber } from '../../lib/contacts';

type SellerReview = { id: string; rating: number; comment: string | null; reviewer_id: string; created_at: string };

export default function SellerPage() {
  const params = useParams<{ id: string }>();
  const [seller, setSeller] = useState<Profile | null>(null);
  const [listings, setListings] = useState<Product[]>([]);
  const [rating, setRating] = useState<number | null>(null);
  const [reviews, setReviews] = useState<SellerReview[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSeller = async () => {
      const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', params.id).maybeSingle();
      const { data: products, error: productsError } = await supabase.from('products').select('id, title, category, price, description, image_url, image_urls, phone, location, seller_id, status, approval_status, expires_at, created_at').eq('seller_id', params.id).eq('status', 'active').eq('approval_status', 'approved').order('created_at', { ascending: false });
      const { data: sellerReviews, error: reviewsError } = await supabase.from('reviews').select('id, rating, comment, reviewer_id, created_at').eq('seller_id', params.id).order('created_at', { ascending: false }).limit(50);

      if (profileError || productsError || reviewsError) {
        setError(profileError?.message || productsError?.message || reviewsError?.message || 'Seller could not be loaded.');
        return;
      }

      setSeller(profile);
      setListings(products || []);
      setReviews(sellerReviews || []);
      if (sellerReviews?.length) setRating(sellerReviews.reduce((sum, review) => sum + review.rating, 0) / sellerReviews.length);
    };
    loadSeller();
  }, [params.id]);

  if (error) return <main className="mx-auto max-w-5xl p-8 text-red-700">{error}</main>;

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-5xl">
        <BackToMarketLink />
        <section className="mt-6 rounded-3xl bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold uppercase tracking-wide text-orange-500">Seller profile</p><h1 className="mt-2 break-words text-2xl font-bold text-slate-900 sm:text-3xl">{seller?.display_name || 'CUKWA seller'}</h1><p className="mt-2 text-slate-600">{seller?.bio || 'This seller has not added a bio yet.'}</p><p className="mt-3 text-sm text-slate-500">{seller?.location || 'Location not provided'} · {listings.length} active listings</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {seller?.phone && <a href={`tel:${seller.phone}`} className="rounded-xl bg-green-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-800">Call seller</a>}
                {(seller?.whatsapp_number || seller?.phone) && <a href={`https://wa.me/${toWhatsAppNumber(seller.whatsapp_number || seller.phone || '')}`} target="_blank" rel="noreferrer" className="rounded-xl border border-green-700 px-4 py-2.5 text-sm font-bold text-green-800 hover:bg-green-50">WhatsApp seller</a>}
              </div>
            </div>
            <div className="rounded-2xl bg-orange-50 px-5 py-4 text-center"><div className="text-2xl font-bold text-orange-500">{rating ? rating.toFixed(1) : 'New'}</div><div className="text-xs text-slate-500">{reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</div>{seller?.is_verified && <div className="mt-2 text-xs font-bold text-green-700">Verified seller</div>}</div>
          </div>
          <details className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">
            <summary className="cursor-pointer font-semibold">What does seller verification mean?</summary>
            <p className="mt-2 leading-relaxed">A verified badge means the marketplace team reviewed the seller’s submitted verification information. Always inspect an item and agree on a safe public meeting place before paying.</p>
          </details>
        </section>
        <section className="mt-8">
          <h2 className="mb-4 text-xl font-bold text-slate-900 sm:text-2xl">Buyer reviews</h2>
          {reviews.filter((review) => review.comment?.trim()).length === 0 ? <p className="rounded-2xl bg-white p-5 text-sm text-slate-500">No written reviews yet.</p> : (
            <div className="grid gap-3 sm:grid-cols-2">
              {reviews.filter((review) => review.comment?.trim()).map((review) => (
                <article key={review.id} className="rounded-2xl bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3"><p className="font-semibold text-slate-800">Buyer review</p><p className="text-sm font-bold text-orange-600">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</p></div>
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">{review.comment}</p>
                  <time className="mt-3 block text-xs text-slate-400" dateTime={review.created_at}>{new Date(review.created_at).toLocaleDateString()}</time>
                </article>
              ))}
            </div>
          )}
        </section>
        <h2 className="mb-4 mt-8 text-xl font-bold text-slate-900 sm:text-2xl">Listings from this seller</h2>
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">{listings.map((product) => <Link key={product.id} href={`/product/${product.id}`} className="overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md">{product.image_url ? <img src={product.image_url} alt={product.title} className="h-44 w-full object-cover" /> : <div className="h-44 bg-slate-100" />}<div className="p-4 sm:p-5"><h3 className="font-semibold text-slate-900">{product.title}</h3><p className="mt-2 font-bold text-orange-500">UGX {product.price.toLocaleString()}</p><p className="mt-2 text-sm text-slate-500">{product.location || 'Location not provided'}</p></div></Link>)}</div>
      </div>
    </main>
  );
}
