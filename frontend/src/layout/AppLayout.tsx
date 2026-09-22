import { NavLink, Outlet } from "react-router-dom";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "rounded-md px-3 py-1.5 text-sm transition-colors",
    isActive
      ? "bg-white/10 text-white"
      : "text-mute hover:bg-white/5 hover:text-white",
  ].join(" ");

export function AppLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <NavLink to="/" className="flex items-center gap-3">
            <span className="inline-block size-2.5 rounded-full bg-charge shadow-[0_0_12px_#7dffa8]" />
            <div>
              <p className="font-medium tracking-tight text-white">GhostCharges</p>
              <p className="text-xs text-mute">Subscription leak detector</p>
            </div>
          </NavLink>
          <nav className="flex items-center gap-1">
            <NavLink to="/" className={linkClass} end>
              Home
            </NavLink>
            <NavLink to="/upload" className={linkClass}>
              Upload
            </NavLink>
            <NavLink to="/demo" className={linkClass}>
              Demo
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <Outlet />
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-5 text-xs text-mute sm:flex-row sm:justify-between">
          <p>Detection is SQL. AI, if added later, only narrates the totals.</p>
          <p>Uploads are stored so you can reopen a batch. Demo uses sample data only.</p>
        </div>
      </footer>
    </div>
  );
}
