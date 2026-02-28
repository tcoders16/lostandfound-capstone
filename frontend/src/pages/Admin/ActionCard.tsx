import { Link } from "react-router-dom";

type Props = { title: string; desc: string; cta: string; to: string };
export default function ActionCard({ title, desc, cta, to }: Props) {
  return (
    <Link
      to={to}
      className="rounded-2xl bg-white border border-neutral-200 p-5 shadow-[0_22px_60px_-32px_rgba(0,0,0,.18)] hover:translate-y-[-2px] transition"
    >
      <div className="font-medium text-neutral-900">{title}</div>
      <p className="text-sm text-neutral-700 mt-1">{desc}</p>
      <div className="mt-3 inline-flex items-center text-[#006341] font-medium">
        {cta} →
      </div>
    </Link>
  );
}