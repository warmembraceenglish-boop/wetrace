"use client";
import {useEffect,useState} from "react";
import AppShell from "../components/AppShell";
import Badge from "../components/Badge";
import {useWorkspace} from "../lib/useWorkspace";

export default function Records(){
 const {supabase}=useWorkspace();
 const [rows,setRows]=useState<any[]>([]);
 useEffect(()=>{supabase.from("record_searches").select("id,case_id,search_type,jurisdiction,provider,status,restricted,created_at,cases(case_number,title)").order("created_at",{ascending:false}).then(({data})=>setRows(data||[]))},[supabase]);
 return <AppShell title="Records Search" subtitle="Tracked public or authorized records requests.">
  <section className="panel">
   {rows.length?<table className="table"><thead><tr><th>Case</th><th>Type</th><th>Jurisdiction</th><th>Provider</th><th>Status</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.cases?.case_number||"—"}</td><td>{r.search_type}</td><td>{r.jurisdiction}</td><td>{r.provider||"—"}</td><td><Badge tone={r.restricted?"red":r.status==="completed"?"green":"amber"}>{r.restricted?"restricted · ":""}{r.status}</Badge></td></tr>)}</tbody></table>:<div className="empty">No records-search requests yet.</div>}
  </section>
 </AppShell>;
}
