// src/components/ui/Section.tsx
export default function Section({
  children,
  className = "",
  bordered = false,
}: { children: React.ReactNode; className?: string; bordered?: boolean }) {
  return (
    <section
      className={[
        bordered ? "border-t border-neutral-200/70 bg-white" : "",
        "py-12 md:py-16",
      ].join(" ")}
    >
      <div className={`mx-auto max-w-6xl px-4 ${className}`}>{children}</div>
    </section>
  );
}