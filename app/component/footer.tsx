import React from 'react';
import Link from 'next/link';
import { Globe, Mail, MessageCircle, Phone, ShieldCheck } from 'lucide-react';

const supportLinks = [
  { label: 'WhatsApp support', href: 'https://wa.me/256766240810' },
  { label: 'Call the marketplace team', href: 'tel:+256766240810' },
  { label: 'Email support', href: 'mailto:info@cukwa.co.ug' },
];

export const Footer: React.FC = () => (
  <footer className="border-t border-slate-800 bg-[#0B1E36] text-white">
    <div className="bg-[#F37021] px-4 py-5 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-9 w-9 shrink-0 rounded-full bg-white p-2 text-[#F37021] shadow-md" />
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide">Need help with a listing?</p>
            <p className="text-lg font-black tracking-tight sm:text-xl">Talk to the CUKWA marketplace team.</p>
          </div>
        </div>
        <a href="https://wa.me/256766240810" target="_blank" rel="noreferrer" className="rounded-xl bg-white px-5 py-3 text-xs font-black text-emerald-700 shadow-md transition hover:bg-emerald-50">WhatsApp support</a>
      </div>
    </div>

    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-12">
      <div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link href="/" className="inline-flex items-center gap-2" aria-label="CUKWA marketplace home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F37021] text-lg font-black text-white">C</span>
            <span className="text-xl font-black tracking-tight"><span className="text-white">CUK </span><span className="text-[#F37021]">WA</span></span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-300">A trusted Ugandan marketplace for buying, selling, and connecting with people near you.</p>
          <p className="mt-4 text-xs font-extrabold tracking-wider text-[#F37021]">BUY · SELL · SAVE</p>
        </div>

        <div>
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#F37021]">Contact</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <a href="tel:+256766240810" className="flex items-center gap-3 hover:text-white"><Phone className="h-4 w-4 text-[#F37021]" /><span>+256 766 240 810</span></a>
            <a href="https://cukwa.co.ug" target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:text-white"><Globe className="h-4 w-4 text-[#F37021]" /><span>cukwa.co.ug</span></a>
            <a href="mailto:info@cukwa.co.ug" className="flex items-center gap-3 hover:text-white"><Mail className="h-4 w-4 text-[#F37021]" /><span>info@cukwa.co.ug</span></a>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#F37021]">Marketplace</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <Link href="/" className="block hover:text-white">Browse listings</Link>
            <Link href="/sell" className="block hover:text-white">Post an ad</Link>
            <Link href="/favorites" className="block hover:text-white">Saved listings</Link>
            {supportLinks.map((link) => <a key={link.label} href={link.href} className="block hover:text-white">{link.label}</a>)}
          </div>
        </div>

        <div>
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#F37021]">Safe trading</h2>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            <div className="flex items-center gap-2 font-bold text-emerald-400"><ShieldCheck className="h-4 w-4" /> Trade carefully</div>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">Never send money before seeing the item. Meet sellers in a public place and verify products before paying.</p>
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-2 border-t border-slate-800 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <span><strong className="text-white">CUKWA</strong> © {new Date().getFullYear()} All rights reserved.</span>
        <span className="font-extrabold tracking-wider text-[#F37021]">Your needs · Our market</span>
      </div>
    </div>
  </footer>
);
