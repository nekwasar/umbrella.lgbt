import Link from 'next/link';

const ITEM = '★ COMING 2026 ★ THE EVERYTHING QUEER APP ★ COMMUNITY · MEET · Q&A · FORUM ★ NO ALGORITHMS ★ NO DATA SOLD ';

export function Marquee() {
  const line = ITEM.repeat(4);
  return (
    <div className="marquee">
      <Link href="/waitlist" className="marquee-track">
        <span>{line}&nbsp;</span>
        <span>{line}&nbsp;</span>
      </Link>
    </div>
  );
}
