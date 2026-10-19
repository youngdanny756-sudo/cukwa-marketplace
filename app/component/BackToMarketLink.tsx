import Link from 'next/link';

export function BackToMarketLink() {
  return (
    <Link
      href="/"
      className="inline-flex items-center rounded-xl border border-[#F37021] px-4 py-2 text-sm font-semibold text-[#F37021] transition-colors hover:bg-[#F37021] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F37021]"
    >
      Back to marketplace
    </Link>
  );
}
