type Props = { label: string; value: string; hint?: string };
export default function StatCard({ label, value, hint }: Props) {
  return (
    <div className="rounded-2xl bg-white border border-neutral-200 p-4 shadow-[0_22px_60px_-32px_rgba(0,0,0,.18)]">
      <div className="text-xs text-neutral-600">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {hint ? <div className="mt-1 text-xs text-neutral-500">{hint}</div> : null}
    </div>
  );
}