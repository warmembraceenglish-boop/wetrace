import AppShell from "./AppShell";
import Badge from "./Badge";

export default function ModulePage({title,subtitle,items}:{title:string;subtitle:string;items:{title:string;detail:string;status?:string;tone?:string}[]}){
 return <AppShell title={title} subtitle={subtitle}><div className="moduleGrid">
  <section className="panel"><div className="panelHead"><div><h2>{title} workspace</h2><p>Initial module structure is active in the WETrace build.</p></div><Badge tone="blue">BUILDING</Badge></div>
   <div className="moduleActionGrid">{items.map((x,i)=><article key={i} className="moduleAction"><div className="moduleActionIcon">{String(i+1).padStart(2,"0")}</div><div><h3>{x.title}</h3><p>{x.detail}</p></div>{x.status&&<Badge tone={x.tone||"blue"}>{x.status}</Badge>}</article>)}</div>
  </section>
  <section className="panel roadmapPanel"><h2>Module controls</h2><p>All sensitive investigation modules will enforce case membership, lawful-purpose records, jurisdiction checks and audit logging before restricted actions are enabled.</p><div className="gateLine"><span>Case authorization</span><Badge tone="green">Required</Badge></div><div className="gateLine"><span>Audit history</span><Badge tone="green">Always on</Badge></div><div className="gateLine"><span>Restricted data</span><Badge tone="amber">Permission gated</Badge></div></section>
 </div></AppShell>
}