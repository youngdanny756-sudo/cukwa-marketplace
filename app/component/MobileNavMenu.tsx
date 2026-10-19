'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

type MobileNavMenuProps = {
  isAdmin?: boolean;
  isAuthenticated?: boolean;
  onLogout?: () => void;
};

const links = [
  { href: '/', label: 'Browse marketplace' },
  { href: '/inbox', label: 'Inbox and messages' },
  { href: '/favorites', label: 'Saved listings' },
  { href: '/dashboard', label: 'My listings and insights' },
  { href: '/profile', label: 'My profile' },
  { href: '/verification', label: 'Seller verification' },
];

export function MobileNavMenu({ isAdmin = false, isAuthenticated = true, onLogout }: MobileNavMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const visibleLinks = isAdmin
    ? [...links, { href: '/admin', label: 'Admin moderation' }]
    : links;

  return (
    <>
      <button
        type="button"
        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={isOpen}
        aria-controls="mobile-site-menu"
        onClick={() => setIsOpen((open) => !open)}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F37021] md:hidden"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {isOpen && (
        <nav
          id="mobile-site-menu"
          aria-label="Mobile navigation"
          className="absolute left-0 right-0 top-full z-50 max-h-[calc(100dvh-5rem)] overflow-y-auto border-t border-slate-200 bg-white px-4 pb-4 pt-2 shadow-xl md:hidden"
        >
          <div className="mx-auto grid max-w-7xl gap-1">
            {visibleLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-orange-50 hover:text-orange-700 focus-visible:outline-2 focus-visible:outline-[#F37021]"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/sell"
              onClick={() => setIsOpen(false)}
              className="mt-2 rounded-xl bg-[#F37021] px-3 py-3 text-center text-sm font-bold text-white transition-colors hover:bg-[#d95e14]"
            >
              Post a free ad
            </Link>
            {!isAuthenticated && (
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="rounded-xl px-3 py-3 text-left text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50"
              >
                Log in
              </Link>
            )}
            {isAuthenticated && onLogout && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
                className="rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"
              >
                Log out
              </button>
            )}
          </div>
        </nav>
      )}
    </>
  );
}
