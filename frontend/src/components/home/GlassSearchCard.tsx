import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconSearch } from "./icons";

export default function GlassSearchCard() {
  const nav = useNavigate();
  const [q, setQ] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    nav(`/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <form
      onSubmit={submit}
      className="bg-white border border-neutral-200 rounded-2xl shadow-[0_20px_60px_-30px_rgba(0,0,0,.18)] p-6"
    >
      <label
        htmlFor="search-box"
        className="block text-sm font-medium text-neutral-800"
      >
        Describe your item
      </label>

      <div className="mt-3 flex items-stretch gap-2">
        <div className="hidden sm:flex items-center px-3 rounded-2xl border border-neutral-300 bg-white text-neutral-500">
          <IconSearch />
        </div>

        <input
          id="search-box"
          type="search"
          autoComplete="off"
          placeholder='e.g., "black over-ear headphones, Sony"'
          className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 focus:ring-2 focus:ring-[#006341] focus:outline-none"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-describedby="search-help"
        />

        <button type="submit" className="btn btn-primary rounded-2xl px-5">
          <IconSearch /> Search
        </button>
      </div>

      <p
        id="search-help"
        className="mt-2 text-xs text-neutral-600 leading-relaxed"
      >
        Use plain English. We’ll match your words with item photos and
        descriptions.
      </p>
    </form>
  );
}