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
    <div className="min-h-svh bg-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-block size-2.5 rounded-full bg-charge shadow-[0_0_12px_#7dffa8]" />
            <div>
              <p className="font-medium tracking-tight text-white">GhostCharges</p>
              <p className="text-xs text-mute">Subscription leak detector</p>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            <NavLink to="/" className={linkClass} end>
              Status
            </NavLink>
            <NavLink to="/demo" className={linkClass}>
              Demo
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
