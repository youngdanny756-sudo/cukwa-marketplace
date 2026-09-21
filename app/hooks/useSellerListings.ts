'use client';
import { useState, useEffect, useCallback } from 'react';

import { supabase } from '@/app/lib/supabase';
import { Listing, Profile } from '@/app/types';

export function useSellerListings(sellerId: string | null) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [seller, setSeller] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSellerData = useCallback(async () => {
    if (!sellerId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get seller profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sellerId)
        .single();

      if (profileError) throw profileError;
      setSeller(profile);

      // Get seller's active listings
      const { data: sellerListings, error: listingsError } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', sellerId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (listingsError) throw listingsError;

      setListings(sellerListings || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load seller data');
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    void Promise.resolve().then(fetchSellerData);
  }, [fetchSellerData]);

  return { listings, seller, loading, error, refresh: fetchSellerData };
}