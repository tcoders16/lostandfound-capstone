import { Link } from "react-router-dom";

export default function QuickActions() {
  const items = [
    { label: "Upload item", to: "/admin/upload" },
    { label: "Review requests", to: "/admin/review" },
    { label: "Search DB", to: "/search" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((x) => (
        <Link
          key={x.label}
          to={x.to}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm shadow-[0_10px_40px_-28px_rgba(0,0,0,.14)] hover:bg-neutral-50"
        >
          {x.label}
        </Link>
      ))}
    </div>
  );
}