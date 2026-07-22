import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="bg-surface-container-lowest border-t border-outline-variant/30 mt-auto">
      <div className="w-full py-stack-md px-gutter flex flex-col md:flex-row justify-between items-center max-w-container-max mx-auto gap-stack-md">
        <span className="font-label-caps text-label-caps text-on-surface-variant text-center md:text-left">
          © 2026 NACOSS FUTA Chapter Department of Computer Science. All rights reserved.
        </span>
        <div className="hidden sm:flex flex-wrap gap-stack-lg justify-center">
          <Link className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors hover:underline" href="/privacy">
            Privacy Policy
          </Link>
          <Link className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors hover:underline" href="/terms">
            Terms of Service
          </Link>
          <Link className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors hover:underline" href="/guidelines">
            Election Guidelines
          </Link>
        </div>
      </div>
    </footer>
  );
}
