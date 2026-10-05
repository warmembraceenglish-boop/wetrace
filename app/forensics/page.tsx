"use client";
import {useEffect,useState} from "react";
import AppShell from "../components/AppShell";
import Badge from "../components/Badge";
import {useWorkspace} from "../lib/useWorkspace";

export default function Forensics(){
 const {supabase}=useWorkspace();
 const [rows,setRows]=useState<any[]>([]);
 useEffect(()=>{supabase.from("specialist_reviews").select("id,case_id,review_type,provider_name,reviewer_name,status,restricted,created_at,cases(case_number,title)").order("created_at",{ascending:false}).then(({data})=>setRows(data||[]))},[supabase]);
 return <AppShell title="Forensics" subtitle="Authorized specialist examinations and external-provider reviews.">
  <section className="panel">
   <div className="alert">WETrace records the workflow and findings. Raw DNA, fingerprint, toxicology, digital-forensic or facial analysis remains with qualified/authorized providers.</div>
   {rows.length?<table className="table"><thead><tr><th>Case</th><th>Review</th><th>Provider</th><th>Reviewer</th><th>Status</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.cases?.case_number||"—"}</td><td>{r.review_type}</td><td>{r.provider_name||"—"}</td><td>{r.reviewer_name||"—"}</td><td><Badge tone={r.status==="completed"?"green":"red"}>{r.status}</Badge></td></tr>)}</tbody></table>:<div className="empty">No specialist reviews yet.</div>}
  </section>
 </AppShell>;
}
