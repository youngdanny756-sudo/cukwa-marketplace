'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ChatModal from './component/ChatModal';
import { Navbar } from './component/Navbar';
import { supabase } from './lib/supabase';
import { toWhatsAppNumber } from './lib/contacts';
import type { Product } from './types';
import { UGANDA_LOCATIONS } from './locations';

const categories = ['All Categories', 'Electronics & Phones', 'Computers & Accessories', 'Food Stuff & Groceries', 'Kitchenware', 'Clothing & Fashion', 'Pharmacy & Health', 'Online Food Store', 'Other Goods & Services'];
const PAGE_SIZE = 12;
type SortOrder = 'newest' | 'price_asc' | 'price_desc';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [minimumPrice, setMinimumPrice] = useState('');
  const [maximumPrice, setMaximumPrice] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [blockedSellerIds, setBlockedSellerIds] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchTerm.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    let cancelled = false;
    const loadUserData = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (cancelled) return;
      if (authError) {
        setLoadError(`Could not check your account: ${authError.message}`);
        return;
      }
      if (!user) {
        router.push('/login');
        return;
      }
      setCurrentUserId(user.id);

      const [profileResult, favoriteResult, blockResult] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
        supabase.from('favorites').select('product_id').eq('user_id', user.id),
        supabase.from('user_blocks').select('blocked_id').eq('blocker_id', user.id),
      ]);
      if (cancelled) return;
      const dataError = profileResult.error || favoriteResult.error || blockResult.error;
      if (dataError) setLoadError(`Could not load your marketplace preferences: ${dataError.message}`);
      setIsAdmin(profileResult.data?.role === 'admin');
      setFavoriteIds((favoriteResult.data || []).map((favorite) => favorite.product_id));
      setBlockedSellerIds((blockResult.data || []).map((block) => block.blocked_id));
      setIsReady(true);
    };
    void loadUserData();
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    if (!isReady) return;
    let cancelled = false;
    const loadProducts = async () => {
      setIsLoading(true);
      setLoadError('');
      if (minimumPrice && maximumPrice && Number(minimumPrice) > Number(maximumPrice)) {
        setProducts([]);
        setTotalCount(0);
        setIsLoading(false);
        return;
      }
      let query = supabase.from('products')
        .select('id, title, category, price, description, image_url, image_urls, phone, location, seller_id, status, approval_status, expires_at, created_at', { count: 'exact' })
        .eq('status', 'active')
        .eq('approval_status', 'approved')
        .eq('is_draft', false);

      if (selectedCategory !== 'All Categories') query = query.eq('category', selectedCategory);
      if (selectedLocation !== 'All Locations') query = query.eq('location', selectedLocation);
      if (minimumPrice) query = query.gte('price', Number(minimumPrice));
      if (maximumPrice) query = query.lte('price', Number(maximumPrice));
      if (debouncedSearch) {
        const safeSearch = debouncedSearch.replace(/[,%()]/g, ' ').trim();
        if (safeSearch) query = query.or(`title.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%,category.ilike.%${safeSearch}%`);
      }
      if (blockedSellerIds.length) query = query.not('seller_id', 'in', `(${blockedSellerIds.join(',')})`);

      const orderColumn = sortOrder === 'newest' ? 'created_at' : 'price';
      const { data, count, error } = await query
        .order(orderColumn, { ascending: sortOrder === 'price_asc' })
        .range(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE - 1);
      if (cancelled) return;
      if (error) {
        setLoadError(`Listings could not be loaded: ${error.message}`);
      } else {
        setProducts((current) => pageIndex === 0 ? data || [] : [...current, ...(data || [])]);
        setTotalCount(count || 0);
      }
      setIsLoading(false);
    };
    void loadProducts();
    return () => { cancelled = true; };
  }, [blockedSellerIds, debouncedSearch, isReady, maximumPrice, minimumPrice, pageIndex, selectedCategory, selectedLocation, sortOrder]);

  const resetPage = () => setPageIndex(0);

  const toggleFavorite = async (productId: string) => {
    if (!currentUserId) return;
    const isFavorite = favoriteIds.includes(productId);
    if (isFavorite) {
      const { error } = await supabase.from('favorites').delete().eq('user_id', currentUserId).eq('product_id', productId);
      if (error) {
        setLoadError(`Could not remove saved listing: ${error.message}`);
        return;
      }
      setFavoriteIds((ids) => ids.filter((id) => id !== productId));
      return;
    }
    const { error } = await supabase.from('favorites').insert({ user_id: currentUserId, product_id: productId });
    if (error) setLoadError(`Could not save listing: ${error.message}`);
    else setFavoriteIds((ids) => [...ids, productId]);
  };

  const hasMore = products.length < totalCount;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        searchTerm={searchTerm}
        onSearchChange={(value) => { setSearchTerm(value); resetPage(); }}
        selectedLocation={selectedLocation}
        onLocationChange={(value) => { setSelectedLocation(value); resetPage(); }}
        onOpenPostAd={() => router.push('/sell')}
        onOpenFavorites={() => router.push('/favorites')}
        onLogout={async () => { const { error } = await supabase.auth.signOut(); if (error) setLoadError(error.message); else router.push('/login'); }}
      />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 sm:mb-8">
          <div><h1 className="text-3xl font-bold text-gray-800 sm:text-4xl">Marketplace</h1><p className="mt-1 text-sm text-slate-500">Find useful things from people near you.</p></div>
          <div className="flex flex-wrap gap-2">
            <Link href="/inbox" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-orange-300 sm:px-4">Inbox</Link>
            <Link href="/dashboard" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 sm:px-4">My listings</Link>
            {isAdmin && <Link href="/admin" className="rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white sm:px-4">Admin</Link>}
          </div>
        </div>

        <section aria-label="Search filters" className="mb-6 grid grid-cols-1 gap-3 rounded-2xl bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-xs font-semibold text-slate-600">Category
            <select value={selectedCategory} onChange={(event) => { setSelectedCategory(event.target.value); resetPage(); }} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700">
              {categories.map((category) => <option key={category}>{category}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">Location
            <select value={selectedLocation} onChange={(event) => { setSelectedLocation(event.target.value); resetPage(); }} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700">
              {UGANDA_LOCATIONS.map((location) => <option key={location}>{location}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">Minimum price (UGX)
            <input type="number" min="0" inputMode="numeric" value={minimumPrice} onChange={(event) => { setMinimumPrice(event.target.value); resetPage(); }} placeholder="Any" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700" />
          </label>
          <label className="text-xs font-semibold text-slate-600">Maximum price (UGX)
            <input type="number" min="0" inputMode="numeric" value={maximumPrice} onChange={(event) => { setMaximumPrice(event.target.value); resetPage(); }} placeholder="Any" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700" />
          </label>
          <label className="text-xs font-semibold text-slate-600">Sort by
            <select value={sortOrder} onChange={(event) => { setSortOrder(event.target.value as SortOrder); resetPage(); }} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700">
              <option value="newest">Newest first</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option>
            </select>
          </label>
        </section>

        {loadError && <p role="alert" className="mb-6 rounded-xl bg-red-100 p-4 text-sm text-red-700">{loadError}</p>}
        {minimumPrice && maximumPrice && Number(minimumPrice) > Number(maximumPrice) && <p role="alert" className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Minimum price must not be higher than maximum price.</p>}
        <p className="mb-4 text-sm text-gray-500">{totalCount} {totalCount === 1 ? 'listing' : 'listings'} found</p>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <article key={product.id} className="overflow-hidden rounded-2xl bg-white shadow-sm sm:rounded-3xl sm:shadow">
              <Link href={`/product/${product.id}`} aria-label={`View ${product.title}`}>
                {product.image_url ? <img src={product.image_url} alt={product.title} className="h-48 w-full object-cover sm:h-52" /> : <div className="h-48 bg-slate-100 sm:h-52" />}
              </Link>
              <div className="p-4 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/product/${product.id}`} className="line-clamp-2 text-lg font-semibold hover:text-orange-500 sm:text-xl">{product.title}</Link>
                  <button type="button" onClick={() => void toggleFavorite(product.id)} className="shrink-0 rounded-full px-2 text-2xl leading-none text-orange-500 hover:bg-orange-50" aria-label={favoriteIds.includes(product.id) ? 'Remove saved listing' : 'Save listing'} aria-pressed={favoriteIds.includes(product.id)}>{favoriteIds.includes(product.id) ? '♥' : '♡'}</button>
                </div>
                <p className="mt-2 text-xl font-bold text-orange-500 sm:text-2xl">UGX {product.price.toLocaleString()}</p>
                <p className="mt-3 line-clamp-2 text-sm text-gray-600">{product.description}</p>
                <p className="mt-2 text-xs text-slate-500 sm:text-sm">{product.category} · {product.location || 'Location not provided'}</p>
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3">
                  {product.phone ? <a href={`tel:${product.phone}`} className="font-semibold text-green-700 hover:underline">Call seller</a> : <span className="text-sm text-slate-500">No phone provided</span>}
                  {product.phone && <a href={`https://wa.me/${toWhatsAppNumber(product.phone)}`} target="_blank" rel="noreferrer" className="font-semibold text-green-700 hover:underline">WhatsApp</a>}
                  <Link href={`/seller/${product.seller_id}`} className="ml-auto text-sm font-semibold text-blue-700 hover:underline">Seller profile</Link>
                </div>
                {currentUserId !== product.seller_id
                  ? <button type="button" onClick={() => setSelectedProduct(product)} className="mt-3 w-full rounded-xl bg-purple-600 py-3 font-semibold text-white transition-colors hover:bg-purple-700">Message seller</button>
                  : <Link href={`/edit/${product.id}`} className="mt-3 block w-full rounded-xl border border-slate-200 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50">Manage your listing</Link>}
              </div>
            </article>
          ))}
        </div>
        {!isLoading && !loadError && products.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center sm:p-10"><h2 className="text-lg font-bold text-slate-800">No listings found</h2><p className="mt-2 text-sm text-slate-500">Try another search or filter, or post the first ad.</p></div>}
        {hasMore && <div className="mt-8 text-center"><button type="button" onClick={() => setPageIndex((page) => page + 1)} disabled={isLoading} className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:border-orange-400 hover:text-orange-600 disabled:opacity-60">{isLoading ? 'Loading listings...' : 'Load more listings'}</button></div>}
        {isLoading && products.length === 0 && <p className="py-10 text-center text-sm text-slate-500">Loading listings...</p>}
      </main>
      {selectedProduct && <ChatModal productId={selectedProduct.id} productTitle={selectedProduct.title} sellerId={selectedProduct.seller_id} onClose={() => setSelectedProduct(null)} />}
    </div>
  );
}
