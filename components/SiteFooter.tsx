export default function SiteFooter() {
  return (
    <footer className="bg-surface-container-lowest mt-auto">
      <div className="w-full py-stack-md px-gutter flex flex-col md:flex-row justify-between items-center max-w-container-max mx-auto gap-stack-md">
        <span className="font-label-caps text-label-caps text-on-surface-variant">
          © 2026 NACOSS Department of Computer Science. All rights reserved.
        </span>
        <div className="flex gap-stack-lg">
          <a className="font-label-caps text-label-caps text-on-surface-variant hover:underline" href="#">
            Privacy Policy
          </a>
          <a className="font-label-caps text-label-caps text-on-surface-variant hover:underline" href="#">
            Terms of Service
          </a>
          <a className="font-label-caps text-label-caps text-on-surface-variant hover:underline" href="#">
            Election Guidelines
          </a>
        </div>
      </div>
    </footer>
  );
}
