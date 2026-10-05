"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import AppShell from "../components/AppShell";
import Badge from "../components/Badge";
import {useWorkspace} from "../lib/useWorkspace";

export default function SkipTrace(){
 const {supabase}=useWorkspace();
 const [rows,setRows]=useState<any[]>([]);
 const [loading,setLoading]=useState(true);

 useEffect(()=>{
   (async()=>{
     const {data}=await supabase
       .from("cases")
       .select("id,case_number,title,priority,status,jurisdictions,updated_at")
       .eq("case_type","Skip Trace")
       .order("updated_at",{ascending:false});
     setRows(data||[]);
     setLoading(false);
   })();
 },[supabase]);

 return <AppShell
   title="Skip Trace"
   subtitle="Lawful identity-and-location research organized as auditable cases."
   actions={<Link href="/cases/new" className="primaryBtn inlineBtn">＋ Open case</Link>}
 >
   <section className="panel">
     <div className="panelHead"><div><h2>Skip-trace cases</h2><p>{loading?"Loading…":rows.length+" case"+(rows.length===1?"":"s")+" visible"}</p></div></div>
     {rows.length
       ?<div className="recordGrid">{rows.map(r=><Link href={"/cases/"+r.id} className="recordCard linkCard" key={r.id}>
         <div><strong>{r.case_number} · {r.title}</strong><small>{r.jurisdictions?.join(" / ")||"No jurisdiction"} · updated {new Date(r.updated_at).toLocaleString()}</small></div>
         <Badge tone={r.priority==="critical"||r.priority==="high"?"red":"blue"}>{r.status}</Badge>
       </Link>)}</div>
       :!loading&&<div className="emptyState"><strong>No skip-trace cases</strong><p>Open a case and choose “Skip Trace” as the case type.</p></div>}
   </section>
 </AppShell>;
}