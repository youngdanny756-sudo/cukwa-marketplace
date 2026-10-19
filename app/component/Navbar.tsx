
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, MapPin, PlusCircle, LogOut, Sparkles, Heart } from 'lucide-react';
import { UGANDA_LOCATIONS } from '../locations';
import { InboxNotifications } from './InboxNotifications';
import { MobileNavMenu } from './MobileNavMenu';


interface NavbarProps {
  searchTerm: string;
  onSearchChange: (text: string) => void;
  selectedLocation: string;
  onLocationChange: (loc: string) => void;
  onOpenPostAd?: () => void;
  onOpenFavorites?: () => void;
  onLogout?: () => void;
  isAdmin?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchTerm,
  onSearchChange,
  selectedLocation,
  onLocationChange,
  onOpenPostAd,
  onOpenFavorites,
  onLogout,
  isAdmin = false,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
        
      {/* Top micro bar matching flyer contact */}
      <div className="bg-[#0F3460] text-white text-[11px] py-1.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>📞 WhatsApp: <strong>+256 766 240 810</strong></span>
            <span className="hidden sm:inline">📍 {selectedLocation}, Uganda</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-[#F37021]" />
            <span className="font-bold text-[#F37021]">100% Free Classifieds</span>
          </div>
        </div>
      </div>

      {/* Main Bar */}
      <div className="mx-auto max-w-7xl px-3 py-2.5 sm:px-6 sm:py-3">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand Logo */}
          <Link href="/" className="inline-flex shrink-0 items-center gap-1.5" aria-label="CUKWA marketplace home">
            <Image src="/cukwa-logo.png" alt="" width={40} height={43} className="h-9 w-auto sm:h-10" />
            <span className="text-sm font-black tracking-tight text-[#0F3460] sm:text-base">CUK<span className="text-[#F37021]">WA</span></span>
          </Link>

          {/* Search & Location Bar */}
          <div className="hidden md:flex flex-1 max-w-2xl items-center border-2 border-slate-200 rounded-2xl overflow-hidden focus-within:border-[#F37021] bg-slate-50">
            {/* Location selector */}
            <div className="flex items-center px-3 border-r border-slate-200 bg-white">
              <MapPin className="w-4 h-4 text-[#F37021] mr-1" />
              <select
                value={selectedLocation}
                onChange={(e) => onLocationChange(e.target.value)}
                className="text-xs font-bold text-slate-700 bg-transparent py-2.5 outline-hidden cursor-pointer"
              >
                {UGANDA_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Search text input */}
            <div className="flex-1 flex items-center px-3">
              <Search className="w-4 h-4 text-slate-400 mr-2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="What are you looking for today? (e.g. iPhone, Groceries, Laptop)"
                className="w-full text-xs font-semibold text-slate-800 bg-transparent py-2.5 outline-hidden"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {onLogout && (
              <button
                onClick={onLogout}
                aria-label="Log out"
                title="Log out"
                className="hidden shrink-0 items-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 sm:flex sm:px-3"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Log out</span>
              </button>
            )}
            {onOpenFavorites && (
              <button
                onClick={onOpenFavorites}
                className="hidden items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 sm:flex"
              >
                <Heart className="w-4 h-4" />
                <span>Saved</span>
              </button>
            )}
            <InboxNotifications />
            <button
              onClick={onOpenPostAd}
              aria-label="Post a free ad"
              className="flex h-10 items-center gap-1 rounded-xl bg-[#F37021] px-2.5 text-xs font-black text-white shadow-sm transition-all hover:bg-[#ff7b2b] sm:gap-1.5 sm:px-4"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden md:inline">Post Free Ad</span>
            </button>
            <MobileNavMenu isAdmin={isAdmin} onLogout={onLogout} />
          </div>
        </div>
      </div>
      <div className="border-t border-slate-100 px-3 py-2 md:hidden">
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search listings"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-slate-800 outline-none"
            aria-label="Search listings"
          />
        </label>
      </div>
    </header>
  );
};