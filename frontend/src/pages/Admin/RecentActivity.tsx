import { useEffect, useState } from "react";
import type { ActivityItem, ID } from "../../lib/types";
import { Link } from "react-router-dom";

function RowSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-xl border border-neutral-200 p-3 animate-pulse bg-white">
      <div className="h-4 w-40 bg-neutral-200 rounded" />
      <div className="h-4 w-28 bg-neutral-200 rounded" />
    </div>
  );
}

export default function RecentActivity() {
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [error] = useState<string | null>(null);

  // Replace mock with real fetch later
  useEffect(() => {
    const t = setTimeout(() => {
      // simulate data
      setItems([
        { id: "act_123" as ID<"activity">, type: "upload", title: "Black Logitech Mouse", meta: "Oakville GO • Today 14:30" },
        { id: "act_124" as ID<"activity">, type: "match",  title: "Blue Backpack (JanSport)", meta: "Union Station • Today 13:10" },
        { id: "act_125" as ID<"activity">, type: "claim",  title: "iPhone 12 (blue) — claimed", meta: "Kipling • Yesterday 17:00" },
      ] as ActivityItem[]);
    }, 700);
    return () => clearTimeout(t);
  }, []);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Couldn’t load activity. Please refresh.
      </div>
    );
  }

  if (items === null) {
    return (
      <div className="space-y-2">
        <RowSkeleton />
        <RowSkeleton />
        <RowSkeleton />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-700">
        No recent activity yet. <Link to="/admin/upload" className="underline">Upload an item</Link> to get started.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((x) => (
        <div key={x.id} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3">
          <div className="min-w-0">
            <div className="truncate font-medium text-neutral-900">{x.title}</div>
            <div className="text-xs text-neutral-600">{x.meta}</div>
          </div>
          <div className="text-xs rounded-full border px-2 py-1 bg-neutral-50 text-neutral-700">
            {x.type}
          </div>
        </div>
      ))}
    </div>
  );
}