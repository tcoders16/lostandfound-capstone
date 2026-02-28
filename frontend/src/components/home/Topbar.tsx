import { Link } from "react-router-dom";

export default function Topbar() {
  return (
    <header className="border-b border-neutral-200/70 bg-white/80 backdrop-blur sticky top-0 z-20">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3" aria-label="Transit Lost & Found — Home">
          <div className="w-6 h-6 rounded-md bg-[#006341]" aria-hidden />
          <span className="text-[15px] font-semibold tracking-tight">Transit Lost &amp; Found</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link to="/help" className="hover:underline">Help</Link>
          <Link to="/admin/login" className="hover:underline">Ontario Service Admin</Link>
        </nav>
      </div>
    </header>
  );
}