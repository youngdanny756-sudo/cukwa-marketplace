'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ChatModal from './component/ChatModal';
import { Navbar } from './component/Navbar';
import { supabase } from './lib/supabase';
import type { Product } from './types';

const categories = ['All Categories', 'Electronics & Phones', 'Computers & Accessories', 'Food Stuff & Groceries', 'Kitchenware', 'Clothing & Fashion', 'Pharmacy & Health', 'Online Food Store', 'Other Goods & Services'];
const locations = ['All Locations', 'Kampala Central', 'Nakawa & Bugolobi', 'Entebbe', 'Mukono', 'Mbarara', 'Jinja', 'Gulu'];

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadError, setLoadError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [blockedSellerIds, setBlockedSellerIds] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    const loadMarketplace = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setCurrentUserId(user.id);
      const { data, error } = await supabase.from('products').select('id, title, category, price, description, image_url, image_urls, phone, location, seller_id, status, approval_status, expires_at, created_at').eq('status', 'active').eq('approval_status', 'approved').eq('is_draft', false).order('created_at', { ascending: false });
      if (error) { setLoadError(error.message || 'Products could not be loaded.'); return; }
      setProducts(data || []);
      const { data: favorites } = await supabase.from('favorites').select('product_id').eq('user_id', user.id);
      setFavoriteIds((favorites || []).map((favorite) => favorite.product_id));
      const { data: blocks } = await supabase.from('user_blocks').select('blocked_id').eq('blocker_id', user.id);
      setBlockedSellerIds((blocks || []).map((block) => block.blocked_id));
    };
    loadMarketplace();
  }, [router]);

  const visibleProducts = products.filter((product) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesQuery = !query || [product.title, product.category, product.description].filter(Boolean).some((value) => value!.toLowerCase().includes(query));
    const matchesLocation = selectedLocation === 'All Locations' || product.location === selectedLocation;
    const matchesCategory = selectedCategory === 'All Categories' || product.category === selectedCategory;
    return matchesQuery && matchesLocation && matchesCategory && !blockedSellerIds.includes(product.seller_id);
  });

  const toggleFavorite = async (productId: string) => {
    if (!currentUserId) return;
    const isFavorite = favoriteIds.includes(productId);
    if (isFavorite) {
      await supabase.from('favorites').delete().eq('user_id', currentUserId).eq('product_id', productId);
      setFavoriteIds((ids) => ids.filter((id) => id !== productId));
      return;
    }
    const { error } = await supabase.from('favorites').insert({ user_id: currentUserId, product_id: productId });
    if (!error) setFavoriteIds((ids) => [...ids, productId]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar searchTerm={searchTerm} onSearchChange={setSearchTerm} selectedLocation={selectedLocation} onLocationChange={setSelectedLocation} onOpenPostAd={() => router.push('/sell')} onOpenFavorites={() => router.push('/favorites')} onLogout={async () => { await supabase.auth.signOut(); router.push('/login'); }} />
      <main className="mx-auto max-w-6xl p-8">
        <div className="mb-8 flex items-center justify-between"><div><h1 className="text-4xl font-bold text-gray-800">Marketplace</h1><p className="mt-1 text-sm text-slate-500">Find useful things from people near you.</p></div><Link href="/dashboard" className="hidden rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 sm:block">My listings</Link></div>
        <div className="mb-6 grid grid-cols-1 gap-3 rounded-2xl bg-white p-4 shadow-sm sm:grid-cols-2"><select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">{categories.map((category) => <option key={category}>{category}</option>)}</select><select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">{locations.map((location) => <option key={location}>{location}</option>)}</select></div>
        {loadError && <p className="mb-6 rounded-xl bg-red-100 p-4 text-red-700">{loadError}</p>}
        <p className="mb-4 text-sm text-gray-500">{visibleProducts.length} {visibleProducts.length === 1 ? 'listing' : 'listings'}</p>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {visibleProducts.map((product) => <article key={product.id} className="overflow-hidden rounded-3xl bg-white shadow"><Link href={`/product/${product.id}`}>{product.image_url ? <img src={product.image_url} alt={product.title} className="h-48 w-full object-cover" /> : <div className="h-48 bg-slate-100" />}</Link><div className="p-6"><div className="flex items-start justify-between gap-3"><Link href={`/product/${product.id}`} className="text-xl font-semibold hover:text-orange-500">{product.title}</Link><button onClick={() => toggleFavorite(product.id)} className="text-2xl text-orange-500" aria-label={favoriteIds.includes(product.id) ? 'Remove saved listing' : 'Save listing'}>{favoriteIds.includes(product.id) ? '♥' : '♡'}</button></div><p className="mt-2 text-2xl font-bold text-orange-500">UGX {product.price.toLocaleString()}</p><p className="mt-3 line-clamp-2 text-gray-600">{product.description}</p><p className="mt-2 text-sm text-slate-500">{product.category} · {product.location || 'Location not provided'}</p><div className="mt-4 border-t border-gray-100 pt-3"><p className="text-xs text-gray-500">Seller Contact</p><p className="font-semibold text-green-600">{product.phone || 'Not provided'}</p></div><Link href={`/seller/${product.seller_id}`} className="mt-3 block text-sm font-semibold text-blue-700 hover:underline">View seller profile</Link><button onClick={() => setSelectedProduct(product)} className="mt-3 w-full rounded-xl bg-green-600 py-2.5 font-semibold text-white hover:bg-green-700">Chat with Seller</button></div></article>)}
        </div>
        {!loadError && visibleProducts.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="text-lg font-bold text-slate-800">No listings found</h2><p className="mt-2 text-sm text-slate-500">Try another filter or post the first ad.</p></div>}
      </main>
      {selectedProduct && <ChatModal productId={selectedProduct.id} productTitle={selectedProduct.title} sellerId={selectedProduct.seller_id} onClose={() => setSelectedProduct(null)} />}
    </div>
  );
}
