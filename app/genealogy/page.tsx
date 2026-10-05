"use client";
import {useEffect,useState} from "react";
import AppShell from "../components/AppShell";
import Badge from "../components/Badge";
import {useWorkspace} from "../lib/useWorkspace";

export default function Genealogy(){
 const {supabase}=useWorkspace();
 const [rows,setRows]=useState<any[]>([]);
 const [names,setNames]=useState<Record<string,string>>({});
 useEffect(()=>{(async()=>{
  const {data:r}=await supabase.from("family_relationships").select("*").order("created_at",{ascending:false});
  const rr=r||[];setRows(rr);
  const ids=[...new Set(rr.flatMap((x:any)=>[x.person_a,x.person_b]))];
  if(ids.length){const {data:p}=await supabase.from("people").select("id,display_name").in("id",ids);setNames(Object.fromEntries((p||[]).map((x:any)=>[x.id,x.display_name])))}
 })()},[supabase]);

 return <AppShell title="Genealogy" subtitle="Case-linked family relationships, heir tracing and kinship research.">
  <section className="panel">
   <div className="alert">Genetic genealogy findings should be recorded only when obtained through lawful, authorized sources or qualified providers.</div>
   {rows.length?<table className="table"><thead><tr><th>Person A</th><th>Relationship</th><th>Person B</th><th>Confidence</th><th>Source</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{names[r.person_a]||"Person"}</td><td>{r.relationship_type}</td><td>{names[r.person_b]||"Person"}</td><td><Badge tone={r.confidence>=80?"green":r.confidence>=50?"blue":"amber"}>{r.confidence??"—"}%</Badge></td><td>{r.source_reference||"—"}</td></tr>)}</tbody></table>:<div className="empty">No family relationships yet.</div>}
  </section>
 </AppShell>;
}
