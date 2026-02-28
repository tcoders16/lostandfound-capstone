export default function HowItWorks(){
  const steps = [
    { t:"Search or report", d:"Type a simple description, or upload a found item with one photo." },
    { t:"Smart matching",  d:"We compare text, colours, logos & model numbers to find likely matches." },
    { t:"Connect",         d:"Verify ownership and get pickup instructions securely." },
  ];
  return (
    <section className="border-t border-neutral-200/70 bg-neutral-50/60" aria-labelledby="how-heading">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h2 id="how-heading" className="text-xl font-semibold">How it works</h2>
        <ol className="mt-4 grid md:grid-cols-3 gap-4 text-sm">
          {steps.map((x,i)=>(
            <li key={i} className="card p-5">
              <div className="text-xs uppercase tracking-wide text-[#006341]">Step {i+1}</div>
              <div className="mt-1 font-medium">{x.t}</div>
              <p className="mt-1 text-neutral-700">{x.d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}