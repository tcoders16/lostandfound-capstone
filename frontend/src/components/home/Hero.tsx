import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { IconSearch, IconUpload } from "./icons";

export default function Hero() {
  const nav = useNavigate();
  const [q, setQ] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    nav(`/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <header className="space-y-5">
      <h1 className="text-4xl md:text-[44px] font-semibold leading-tight tracking-tight">
        Find what you lost. <span className="grad-text">Fast.</span>
      </h1>

      <p className="text-neutral-700/90 leading-7 max-w-prose">
        Search items found across stations, buses and trains. Try a simple prompt like
        <span className="whitespace-nowrap"> “black Logitech mouse, Oakville GO”.</span>
      </p>

      {/* Search form with primary CTA */}
      <form onSubmit={onSubmit} className="max-w-xl">
        <label htmlFor="hero-search" className="sr-only">
          Describe your item
        </label>
        <div className="flex items-stretch gap-2">
          <div className="hidden sm:flex items-center px-3 rounded-2xl border border-neutral-300 bg-white text-neutral-600">
            <IconSearch />
          </div>
          <input
            id="hero-search"
            type="search"
            placeholder='e.g., "black over-ear headphones, Sony"'
            autoComplete="off"
            className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 focus:ring-2 focus:ring-[#006341] focus:outline-none"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-describedby="hero-help"
          />
          <button type="submit" className="btn btn-primary px-5">
            <IconSearch /> Search
          </button>
        </div>
        <p id="hero-help" className="mt-2 text-xs text-neutral-600">
          Use plain English. We’ll match your words to item photos and descriptions.
        </p>
      </form>

      {/* Secondary CTA for staff/admin */}
      <div>
        <Link to="/admin/login" className="btn btn-dark">
          <IconUpload /> I’m staff / admin
        </Link>
      </div>
    </header>
  );
}