'use client';

import { useEffect, useState } from 'react';
import { createClient, type User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { UGANDA_LOCATIONS } from '../locations';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const categories = [
  'Electronics & Phones',
  'Computers & Accessories',
  'Food Stuff & Groceries',
  'Kitchenware',
  'Clothing & Fashion',
  'Pharmacy & Health',
  'Online Food Store',
  'Other Goods & Services',
];

export default function SellPage() {
  const [user, setUser] = useState<User | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('Kampala');
  const [category, setCategory] = useState(categories[0]);
  const [images, setImages] = useState<File[]>([]);
  const [isDraft, setIsDraft] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setUser(user);
    };

    checkUser();
  }, [router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImages(Array.from(e.target.files || []));
  };

  const uploadImages = async () => {
    if (!images.length) return [];

    setUploading(true);
    const urls: string[] = [];
    for (const image of images) {
      const fileExt = image.name.split('.').pop() ?? 'jpg';
      const filePath = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const { error } = await supabase.storage.from('product-image').upload(filePath, image, { cacheControl: '3600', upsert: false });
      if (error) { setUploading(false); throw error; }
      urls.push(supabase.storage.from('product-image').getPublicUrl(filePath).data.publicUrl);
    }
    setUploading(false);
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      const imageUrls = await uploadImages();

      const { data: savedProduct, error } = await supabase.from('products').insert({
        seller_id: user.id,
        title,
        description,
        price: Number(price),
        category,
        image_url: imageUrls[0] || null,
        image_urls: imageUrls,
        phone,
        location,
        is_draft: isDraft,
        status: isDraft ? 'draft' : 'active',
        approval_status: isDraft ? 'approved' : 'pending',
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      }).select('id').single();

      if (error) throw error;

      const listingText = `${title} ${description}`.toLowerCase();
      const suspiciousTerms = ['send money', 'advance payment', 'western union', 'guaranteed profit', 'investment', 'bitcoin'];
      const reasons = suspiciousTerms.filter((term) => listingText.includes(term));
      const score = reasons.length * 25 + (Number(price) <= 0 ? 50 : 0);
      if (savedProduct?.id && score >= 25) {
        await supabase.from('suspicious_listing_flags').insert({ product_id: String(savedProduct.id), score, reasons });
      }

      alert('Ad posted successfully!');
      router.push('/');
    } catch (error) {
      console.error('Error posting ad:', error);
      alert('Failed to post ad. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-800">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-700 text-white p-6">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <div className="text-3xl font-bold">
            CUK<span className="text-orange-400">WA</span>
          </div>
          <button
            onClick={() => router.push('/')}
            className="bg-white text-blue-700 px-5 py-2 rounded-xl font-medium"
          >
            Back to Market
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Post an Ad</h1>
        <p className="text-gray-700 mb-8">Sell anything on CUK<span className="text-orange-400">WA</span></p>

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-lg space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">Product Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. iPhone 13 Pro Max 256GB"
              className="w-full px-4 py-3 text-black bg-white border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              required={!isDraft}
            />
            <p className="mt-2 text-xs text-slate-500">Select multiple photos. The first photo is the cover.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Listing expires</label>
            <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-black" />
          </div>

          <label className="flex items-center gap-3 text-sm font-medium text-gray-700">
            <input type="checkbox" checked={isDraft} onChange={(e) => setIsDraft(e.target.checked)} className="h-4 w-4" />
            Save as draft instead of submitting for approval
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 text-black bg-white border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Price (UGX)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-4 py-3 text-black bg-white border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0700 000 000"
              className="w-full px-4 py-3 text-black bg-white border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-3 text-black bg-white border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {UGANDA_LOCATIONS.filter((district) => district !== 'All Locations').map((district) => <option key={district}>{district}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 text-black bg-white border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload Photo</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full text-black bg-white file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:text-black file:bg-orange-100"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || uploading}
            className="w-full bg-orange-500 text-white py-4 rounded-2xl font-medium hover:bg-orange-600 transition disabled:opacity-70"
          >
            {loading || uploading ? 'Saving...' : isDraft ? 'Save Draft' : 'Submit for Approval'}
          </button>
        </form>
      </div>
    </div>
  );
}