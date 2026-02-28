export default function Collage({ count=12 }:{count?:number}){
  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-3" aria-hidden>
      {Array.from({length:count}).map((_,i)=>(
        <div key={i}
          className="h-20 md:h-24 rounded-2xl bg-neutral-100 shadow-inner animate-floaty"
          style={{animationDelay:`${(i%4)*.2}s`}}
        />
      ))}
    </div>
  );
}