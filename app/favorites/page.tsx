'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';

export default function FavoritesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState('Loading saved listings...');

  useEffect(() => {
    const loadFavorites = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setMessage('Please log in to view saved listings.'); return; }
      const { data, error } = await supabase.from('favorites').select('product_id').eq('user_id', user.id);
      if (error) { setMessage(error.message); return; }
      const ids = (data || []).map((item) => item.product_id);
      if (!ids.length) { setProducts([]); setMessage('You have no saved listings yet.'); return; }
      const { data: listings } = await supabase.from('products').select('id, title, category, price, description, image_url, phone, location, seller_id, status, created_at').in('id', ids);
      setProducts(listings || []);
      setMessage('');
    };
    loadFavorites();
  }, []);

  return <main className="min-h-screen bg-gray-50 p-8"><div className="mx-auto max-w-6xl"><Link href="/" className="text-sm font-semibold text-blue-700 hover:underline">Back to marketplace</Link><h1 className="mt-6 text-3xl font-bold text-slate-900">Saved listings</h1>{message && <p className="mt-4 text-slate-500">{message}</p>}<div className="mt-6 grid gap-6 md:grid-cols-3">{products.map((product) => <Link key={product.id} href={`/product/${product.id}`} className="overflow-hidden rounded-2xl bg-white shadow-sm">{product.image_url ? <img src={product.image_url} alt={product.title} className="h-44 w-full object-cover" /> : <div className="h-44 bg-slate-100" />}<div className="p-5"><h2 className="font-semibold">{product.title}</h2><p className="mt-2 font-bold text-orange-500">UGX {product.price.toLocaleString()}</p></div></Link>)}</div></div></main>;
}
