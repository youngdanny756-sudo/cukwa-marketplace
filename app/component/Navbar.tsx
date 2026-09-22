
'use client';

import React from 'react';
import Link from 'next/link';
import { Search, MapPin, PlusCircle, LogOut, Sparkles, Heart } from 'lucide-react';
import { UGANDA_LOCATIONS } from '../locations';


interface NavbarProps {
  searchTerm: string;
  onSearchChange: (text: string) => void;
  selectedLocation: string;
  onLocationChange: (loc: string) => void;
  onOpenPostAd?: () => void;
  onOpenFavorites?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchTerm,
  onSearchChange,
  selectedLocation,
  onLocationChange,
  onOpenPostAd,
  onOpenFavorites,
  onLogout,
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link href="/" className="shrink-0" aria-label="CUKWA marketplace home">
            <img src="/cukwa-logo.png" alt="CUKWA marketplace" className="h-10 w-auto" />
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
          <div className="flex items-center gap-3">
            {onLogout && (
              <button
                onClick={onLogout}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Log out</span>
              </button>
            )}
            {onOpenFavorites && (
              <button
                onClick={onOpenFavorites}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors"
              >
                <Heart className="w-4 h-4" />
                <span>Saved</span>
              </button>
            )}
            <button
              onClick={onOpenPostAd}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#F37021] hover:bg-[#ff7b2b] text-white text-xs font-black shadow-sm transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Post Free Ad</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};