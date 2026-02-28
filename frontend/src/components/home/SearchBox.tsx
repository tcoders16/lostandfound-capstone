import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";

export default function SearchBox() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [q, setQ] = useState("");

  // if we arrived with ?q= prefill input
  useEffect(() => { const v = sp.get("q"); if (v) setQ(v); }, [sp]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    nav(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <section>
      <div className="mx-auto max-w-6xl px-4 pb-14">
        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-neutral-200 shadow-[0_10px_50px_-30px_rgba(0,0,0,.4)] bg-white p-4 md:p-6"
          aria-labelledby="search-heading"
        >
          <h2 id="search-heading" className="sr-only">Search for a lost item</h2>
          <label htmlFor="q" className="block text-sm font-medium text-neutral-800">Describe your item</label>
          <div className="mt-1 flex gap-2">
            <input
              id="q"
              type="search"
              placeholder='e.g., "black over-ear headphones, Sony"'
              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2 focus:ring-2 focus:ring-[#006341] focus:outline-none"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-describedby="search-help"
            />
            <button className="rounded-xl px-4 py-2 bg-black text-white hover:bg-neutral-800">Search</button>
          </div>
          <p id="search-help" className="mt-2 text-xs text-neutral-600">
            Use natural language. We match your words to item photos and descriptions.
          </p>
        </form>
      </div>
    </section>
  );
}