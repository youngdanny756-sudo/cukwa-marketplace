'use client';

import { useEffect, useRef, useState } from 'react';
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

type SelectedPhoto = { file: File; previewUrl: string };

export default function SellPage() {
  const [user, setUser] = useState<User | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('Kampala');
  const [category, setCategory] = useState(categories[0]);
  const [images, setImages] = useState<SelectedPhoto[]>([]);
  const selectedPhotosRef = useRef<SelectedPhoto[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isDraft, setIsDraft] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState('');
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

  useEffect(() => () => {
    selectedPhotosRef.current.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedImages = Array.from(e.target.files || []).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    const nextImages = [...selectedPhotosRef.current, ...selectedImages];
    selectedPhotosRef.current = nextImages;
    setImages(nextImages);
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    const removedPhoto = selectedPhotosRef.current[index];
    if (removedPhoto) URL.revokeObjectURL(removedPhoto.previewUrl);
    const nextImages = selectedPhotosRef.current.filter((_, imageIndex) => imageIndex !== index);
    selectedPhotosRef.current = nextImages;
    setImages(nextImages);
    setPreviewIndex((currentIndex) => {
      if (index === currentIndex) return Math.max(0, currentIndex - 1);
      if (index < currentIndex) return currentIndex - 1;
      return currentIndex;
    });
  };

  const uploadImages = async (ownerId: string) => {
    if (!images.length) return [];

    setUploading(true);
    const urls: string[] = [];
    for (const { file: image } of images) {
      const fileExt = image.name.split('.').pop() ?? 'jpg';
      const filePath = `${ownerId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
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
    if (images.length === 0) {
      setSubmitError('Add at least one photo of the item before posting.');
      return;
    }

    setLoading(true);
    setSubmitError('');

    try {
      const imageUrls = await uploadImages(user.id);

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
      setSubmitError(error instanceof Error ? error.message : 'Failed to post ad. Please try again.');
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
            <p className="mt-2 text-xs text-slate-500">Add photos of the same item from different angles. The first photo is the cover image.</p>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Photos of this item</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="w-full text-black bg-white file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:text-black file:bg-orange-100"
            />
            <p className="mt-2 text-xs text-slate-500">Choose one or more photos. You can add more photos in another selection.</p>
            {images.length > 0 && (
              <div className="mt-4">
                <div className="overflow-hidden rounded-2xl bg-slate-100">
                  <img
                    src={images[previewIndex].previewUrl}
                    alt={`Preview of ${title || 'your item'}, photo ${previewIndex + 1}`}
                    className="h-64 w-full object-contain"
                  />
                </div>
                <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
                  {images.map((image, index) => (
                    <div key={`${image.file.name}-${index}`} className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => setPreviewIndex(index)}
                        aria-label={`Show photo ${index + 1}${index === 0 ? ', cover photo' : ''}`}
                        aria-pressed={previewIndex === index}
                        className={`overflow-hidden rounded-xl border-2 ${previewIndex === index ? 'border-orange-500' : 'border-transparent'}`}
                      >
                        <img src={image.previewUrl} alt="" className="h-20 w-20 object-cover" />
                      </button>
                      {index === 0 && <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">Cover</span>}
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        aria-label={`Remove photo ${index + 1}`}
                        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500">{images.length} {images.length === 1 ? 'photo' : 'photos'} selected. The cover photo appears first in the marketplace.</p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || uploading}
            className="w-full bg-orange-500 text-white py-4 rounded-2xl font-medium hover:bg-orange-600 transition disabled:opacity-70"
          >
            {loading || uploading ? 'Saving...' : isDraft ? 'Save Draft' : 'Submit for Approval'}
          </button>
          {submitError && <p role="alert" className="text-sm text-red-700">{submitError}</p>}
        </form>
      </div>
    </div>
  );
}