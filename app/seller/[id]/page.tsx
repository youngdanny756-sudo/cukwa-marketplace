'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import type { Product, Profile } from '../../types';

export default function SellerPage() {
  const params = useParams<{ id: string }>();
  const [seller, setSeller] = useState<Profile | null>(null);
  const [listings, setListings] = useState<Product[]>([]);
  const [rating, setRating] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSeller = async () => {
      const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', params.id).maybeSingle();
      const { data: products, error: productsError } = await supabase.from('products').select('id, title, category, price, description, image_url, image_urls, phone, location, seller_id, status, approval_status, expires_at, created_at').eq('seller_id', params.id).eq('status', 'active').eq('approval_status', 'approved').order('created_at', { ascending: false });
      const { data: reviews } = await supabase.from('reviews').select('rating').eq('seller_id', params.id);

      if (profileError || productsError) {
        setError(profileError?.message || productsError?.message || 'Seller could not be loaded.');
        return;
      }

      setSeller(profile);
      setListings(products || []);
      if (reviews?.length) setRating(reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length);
    };
    loadSeller();
  }, [params.id]);

  if (error) return <main className="mx-auto max-w-5xl p-8 text-red-700">{error}</main>;

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="text-sm font-semibold text-blue-700 hover:underline">Back to marketplace</Link>
        <section className="mt-6 rounded-3xl bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="text-sm font-semibold uppercase tracking-wide text-orange-500">Seller profile</p><h1 className="mt-2 text-3xl font-bold text-slate-900">{seller?.display_name || 'CUKWA seller'}</h1><p className="mt-2 text-slate-600">{seller?.bio || 'This seller has not added a bio yet.'}</p><p className="mt-3 text-sm text-slate-500">{seller?.location || 'Location not provided'} · {listings.length} active listings</p></div>
            <div className="rounded-2xl bg-orange-50 px-5 py-4 text-center"><div className="text-2xl font-bold text-orange-500">{rating ? rating.toFixed(1) : 'New'}</div><div className="text-xs text-slate-500">seller rating</div>{seller?.is_verified && <div className="mt-2 text-xs font-bold text-green-700">Verified seller</div>}</div>
          </div>
        </section>
        <h2 className="mb-4 mt-8 text-2xl font-bold text-slate-900">Listings from this seller</h2>
        <div className="grid gap-6 md:grid-cols-3">{listings.map((product) => <Link key={product.id} href={`/product/${product.id}`} className="overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-md">{product.image_url ? <img src={product.image_url} alt={product.title} className="h-44 w-full object-cover" /> : <div className="h-44 bg-slate-100" />}<div className="p-5"><h3 className="font-semibold text-slate-900">{product.title}</h3><p className="mt-2 font-bold text-orange-500">UGX {product.price.toLocaleString()}</p><p className="mt-2 text-sm text-slate-500">{product.location || 'Location not provided'}</p></div></Link>)}</div>
      </div>
    </main>
  );
}
