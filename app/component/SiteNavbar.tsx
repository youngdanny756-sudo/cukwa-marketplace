'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { PlusCircle } from 'lucide-react';
import { InboxNotifications } from './InboxNotifications';
import { MobileNavMenu } from './MobileNavMenu';
import { supabase } from '../lib/supabase';

export function SiteNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  useEffect(() => {
    if (pathname === '/') return;
    let cancelled = false;
    const loadUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (cancelled) return;
      if (error) {
        setLogoutError(`Could not check your account: ${error.message}`);
        return;
      }
      setIsAuthenticated(Boolean(user));
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (profileError) {
        setLogoutError(`Could not load your account role: ${profileError.message}`);
        return;
      }
      setIsAdmin(profile?.role === 'admin');
    };
    void loadUser();
    return () => { cancelled = true; };
  }, [pathname]);

  if (pathname === '/') return null;

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setLogoutError(`Could not log out: ${error.message}`);
      return;
    }
    setIsAuthenticated(false);
    setIsAdmin(false);
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
      <nav className="relative mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-4 sm:px-6 sm:py-3" aria-label="Main navigation">
        <Link href="/" className="inline-flex shrink-0 items-center gap-1.5" aria-label="CUKWA marketplace home">
          <Image src="/cukwa-logo.png" alt="" width={40} height={43} className="h-9 w-auto sm:h-10" />
          <span className="text-sm font-black tracking-tight text-[#0F3460] sm:text-base">CUK<span className="text-[#F37021]">WA</span></span>
        </Link>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <InboxNotifications />
          <Link href="/" className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-[#F37021] sm:inline-flex">
            Browse
          </Link>
          <Link href="/favorites" className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-[#F37021] md:inline-flex">
            Saved
          </Link>
          <Link href="/dashboard" className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-[#F37021] md:inline-flex">
            My listings
          </Link>
          <Link href="/profile" className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-[#F37021] lg:inline-flex">
            Profile
          </Link>
          {isAdmin && <Link href="/admin" className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-[#F37021] lg:inline-flex">Admin</Link>}
          <Link href="/sell" aria-label="Post an ad" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#F37021] px-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#d95e14] sm:px-4">
            <PlusCircle className="h-4 w-4" />
            <span className="hidden md:inline">Post an ad</span>
          </Link>
          <MobileNavMenu isAdmin={isAdmin} isAuthenticated={isAuthenticated} onLogout={logout} />
        </div>
      </nav>
      {logoutError && <p role="alert" className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">{logoutError}</p>}
    </header>
  );
}
