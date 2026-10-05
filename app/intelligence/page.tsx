"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import AppShell from "../components/AppShell";
import Badge from "../components/Badge";
import {useWorkspace} from "../lib/useWorkspace";

export default function Intelligence(){
 const {supabase}=useWorkspace();
 const [rows,setRows]=useState<any[]>([]);
 const [loading,setLoading]=useState(true);

 useEffect(()=>{
   (async()=>{
     const {data}=await supabase
       .from("leads")
       .select("id,case_id,title,description,confidence,status,created_at,cases(case_number,title)")
       .order("confidence",{ascending:false});
     setRows(data||[]);
     setLoading(false);
   })();
 },[supabase]);

 return <AppShell title="Intelligence" subtitle="Live case leads with confidence, status and source context.">
   <section className="panel">
     <div className="panelHead"><div><h2>Lead intelligence</h2><p>{loading?"Loading…":rows.length+" lead"+(rows.length===1?"":"s")+" visible"}</p></div></div>
     {rows.length
       ?<div className="recordGrid">
         {rows.map(r=><Link href={"/cases/"+r.case_id+"?view=leads"} className="recordCard linkCard" key={r.id}>
           <div><strong>{r.title}</strong><small>{r.cases?.case_number||"Case"} · {r.description||"No description"}</small></div>
           <Badge tone={r.status==="verified"?"green":r.confidence>=70?"blue":"amber"}>{r.status} · {r.confidence??"—"}%</Badge>
         </Link>)}
       </div>
       :!loading&&<div className="emptyState"><strong>No intelligence leads yet</strong><p>Add leads from a case workspace.</p></div>}
   </section>
 </AppShell>;
}