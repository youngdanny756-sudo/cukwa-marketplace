'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types';

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({ display_name: '', bio: '', location: '', phone: '', whatsapp_number: '' });
  const [avatar, setAvatar] = useState<File | null>(null);
  const [message, setMessage] = useState('Loading profile...');

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setMessage('Please log in first.'); return; }
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (error) { setMessage(error.message); return; }
      const nextProfile = data || { id: user.id, display_name: '', bio: '', location: '', phone: '', whatsapp_number: '', avatar_url: null, is_verified: false, verification_status: 'not_requested', role: 'user' };
      setProfile(nextProfile);
      setForm({ display_name: nextProfile.display_name || '', bio: nextProfile.bio || '', location: nextProfile.location || '', phone: nextProfile.phone || '', whatsapp_number: nextProfile.whatsapp_number || '' });
      setMessage('');
    };
    void Promise.resolve().then(loadProfile);
  }, []);

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile) return;
    let avatarUrl = profile.avatar_url;
    if (avatar) {
      const path = `${profile.id}/${Date.now()}-${avatar.name}`;
      const { error: uploadError } = await supabase.storage.from('profile-images').upload(path, avatar, { upsert: true });
      if (uploadError) { setMessage(uploadError.message); return; }
      avatarUrl = supabase.storage.from('profile-images').getPublicUrl(path).data.publicUrl;
    }
    const { data, error } = await supabase.from('profiles').upsert({ id: profile.id, ...form, avatar_url: avatarUrl }, { onConflict: 'id' }).select().single();
    if (error) setMessage(error.message);
    else { setProfile(data); setMessage('Profile saved.'); }
  };

  return <main className="min-h-screen bg-gray-50 p-8"><div className="mx-auto max-w-2xl"><Link href="/" className="text-sm font-semibold text-blue-700 hover:underline">Back to marketplace</Link><div className="mt-6 rounded-3xl bg-white p-8 shadow-sm"><h1 className="text-3xl font-bold text-slate-900">Seller profile</h1><p className="mt-2 text-sm text-slate-500">This information helps buyers know who they are dealing with.</p><form onSubmit={saveProfile} className="mt-6 space-y-4"><div className="flex items-center gap-4">{profile?.avatar_url ? <img src={profile.avatar_url} alt="Profile" className="h-20 w-20 rounded-full object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-100 text-2xl font-bold text-orange-600">{form.display_name.charAt(0).toUpperCase() || '?'}</div>}<input type="file" accept="image/*" onChange={(e) => setAvatar(e.target.files?.[0] || null)} className="text-sm text-slate-600" /></div><input required value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="Display name" className="w-full rounded-xl border p-3 text-black" /><textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Bio" rows={4} className="w-full rounded-xl border p-3 text-black" /><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Location" className="w-full rounded-xl border p-3 text-black" /><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone number" className="w-full rounded-xl border p-3 text-black" /><input value={form.whatsapp_number} onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })} placeholder="WhatsApp number" className="w-full rounded-xl border p-3 text-black" /><button className="rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white">Save profile</button></form>{message && <p className="mt-4 text-sm text-slate-600">{message}</p>}<Link href="/verification" className="mt-6 block font-semibold text-blue-700 hover:underline">Apply for seller verification</Link></div></div></main>;
}
