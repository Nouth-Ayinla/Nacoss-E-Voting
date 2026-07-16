export default function AdminHeader({ title }: { title: string }) {
  return (
    <header className="w-full top-0 sticky bg-surface z-30">
      <div className="flex justify-between items-center px-gutter py-stack-md w-full">
        <div className="flex items-center gap-4">
          <span className="font-headline-md text-primary tracking-tight font-bold md:hidden">NACOSS E-Voting</span>
          <span className="h-4 w-px bg-outline-variant md:hidden" />
          <span className="text-on-surface-variant font-body-md font-semibold">{title}</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-surface-container-low rounded-full transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-outline-variant bg-surface-container-lowest">
            <span className="material-symbols-outlined text-primary">account_circle</span>
            <span className="font-label-caps text-label-caps">Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
}
