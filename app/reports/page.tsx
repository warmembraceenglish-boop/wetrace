"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import AppShell from "../components/AppShell";
import Badge from "../components/Badge";
import {useWorkspace} from "../lib/useWorkspace";

export default function Reports(){
 const {supabase}=useWorkspace();
 const [rows,setRows]=useState<any[]>([]);
 const [loading,setLoading]=useState(true);

 useEffect(()=>{
   (async()=>{
     const {data}=await supabase
       .from("reports")
       .select("id,case_id,title,report_type,status,updated_at,cases(case_number,title)")
       .order("updated_at",{ascending:false});

     setRows(data||[]);
     setLoading(false);
   })();
 },[supabase]);

 return <AppShell title="Reports" subtitle="Live investigation reports tied to cases and release status.">
   <section className="panel">
     <div className="panelHead">
       <div><h2>Report library</h2><p>{loading?"Loading reports…":rows.length+" report"+(rows.length===1?"":"s")+" visible"}</p></div>
     </div>

     {rows.length
       ?<div className="recordGrid">
         {rows.map(r=><Link href={"/reports/"+r.id} className="recordCard linkCard" key={r.id}>
           <div><strong>{r.title}</strong><small>{r.cases?.case_number||"Case"} · {r.report_type} · {new Date(r.updated_at).toLocaleString()}</small></div>
           <Badge tone={r.status==="released"?"green":"amber"}>{r.status}</Badge>
         </Link>)}
       </div>
       :!loading&&<div className="emptyState"><strong>No reports yet</strong><p>Create a report from inside a case workspace.</p><Link href="/cases" className="primaryBtn inlineBtn">Open cases</Link></div>}
   </section>
 </AppShell>;
}