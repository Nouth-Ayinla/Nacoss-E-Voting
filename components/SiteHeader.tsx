import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="bg-surface w-full h-16 fixed top-0 z-50 shadow-sm border-b border-outline-variant/40">
      <div className="flex justify-between items-center w-full px-gutter max-w-container-max mx-auto h-full">
        <Link href="/" className="flex items-center gap-4 hover:opacity-90 transition-opacity">
          <div className="w-10 h-10 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="NACOSS FUTA Chapter Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="font-headline-md text-headline-md font-bold text-primary">
              NACOSS FUTA Chapter E-Voting Portal
            </span>
            <span className="text-[10px] font-label-caps uppercase tracking-widest text-on-surface-variant">
              Dept. Computer Science
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
}
