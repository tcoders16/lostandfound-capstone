export default function ThemeToggle(){
  function setTheme(t: "transit"|"midnight"|"amber"){
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("lnf-theme", t);
  }
  // load last choice
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("lnf-theme") as any;
    if (saved) document.documentElement.setAttribute("data-theme", saved);
  }
  return (
    <div className="flex gap-2 text-xs">
      <button className="btn btn-ghost" onClick={()=>setTheme("transit")}>Transit</button>
      <button className="btn btn-ghost" onClick={()=>setTheme("midnight")}>Midnight</button>
      <button className="btn btn-ghost" onClick={()=>setTheme("amber")}>Amber</button>
    </div>
  );
}