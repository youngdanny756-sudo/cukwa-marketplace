'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PlusCircle } from 'lucide-react';
import { InboxNotifications } from './InboxNotifications';

export function SiteNavbar() {
  const pathname = usePathname();

  if (pathname === '/') return null;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6" aria-label="Main navigation">
        <Link href="/" className="shrink-0" aria-label="CUKWA marketplace home">
          <img src="/cukwa-logo.png" alt="CUKWA marketplace" className="h-10 w-auto" />
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <InboxNotifications />
          <Link href="/" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-[#F37021]">
            Browse
          </Link>
          <Link href="/favorites" className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-[#F37021] sm:inline-flex">
            Saved
          </Link>
          <Link href="/dashboard" className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-[#F37021] sm:inline-flex">
            My listings
          </Link>
          <Link href="/sell" aria-label="Post an ad" className="inline-flex items-center gap-1.5 rounded-xl bg-[#F37021] px-2 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#d95e14] sm:px-4">
            <PlusCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Post an ad</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
