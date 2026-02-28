import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-neutral-200/70">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between text-xs text-neutral-600">
        <div>© {new Date().getFullYear()} Transit Lost &amp; Found</div>
        <nav className="flex gap-4">
          <Link to="/privacy" className="hover:underline">Privacy</Link>
          <Link to="/accessibility" className="hover:underline">Accessibility</Link>
          <Link to="/terms" className="hover:underline">Terms</Link>
        </nav>
      </div>
    </footer>
  );
}