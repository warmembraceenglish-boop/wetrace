"use client";
import {useEffect,useState} from "react";
import AppShell from "../components/AppShell";
import Badge from "../components/Badge";
import {useWorkspace} from "../lib/useWorkspace";

export default function Evidence(){
 const {supabase}=useWorkspace();
 const [rows,setRows]=useState<any[]>([]);
 useEffect(()=>{supabase.from("evidence").select("id,evidence_number,evidence_type,description,sensitivity,custody_status,created_at,cases(case_number,title)").order("created_at",{ascending:false}).then(({data})=>setRows(data||[]))},[supabase]);
 return <AppShell title="Evidence Vault" subtitle="Private case evidence with custody status and sensitivity controls.">
  <section className="panel">
   {rows.length?<table className="table"><thead><tr><th>Evidence</th><th>Case</th><th>Type</th><th>Sensitivity</th><th>Custody</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.evidence_number} · {r.description||"Evidence"}</td><td>{r.cases?.case_number||"—"}</td><td>{r.evidence_type}</td><td><Badge tone={r.sensitivity==="biometric"||r.sensitivity==="genetic"?"red":"blue"}>{r.sensitivity}</Badge></td><td><Badge tone="amber">{r.custody_status}</Badge></td></tr>)}</tbody></table>:<div className="empty">No evidence uploaded yet. Add evidence from a case workflow.</div>}
  </section>
 </AppShell>;
}
