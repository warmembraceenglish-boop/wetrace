"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import AppShell from "./components/AppShell";
import Badge from "./components/Badge";
import {useWorkspace} from "./lib/useWorkspace";

export default function Dashboard(){
 const {supabase,organization,profile}=useWorkspace();
 const [cases,setCases]=useState<any[]>([]),[evidence,setEvidence]=useState<any[]>([]),[missing,setMissing]=useState<any[]>([]),[investigators,setInvestigators]=useState<any[]>([]),[requests,setRequests]=useState<any[]>([]);
 useEffect(()=>{if(!organization)return;(async()=>{const [c,e,m,i]=await Promise.all([
 supabase.from("cases").select("id,case_number,title,case_type,status,priority,updated_at").order("updated_at",{ascending:false}).limit(6),
 supabase.from("evidence").select("id,evidence_number,description,custody_status,created_at").order("created_at",{ascending:false}).limit(6),
 supabase.from("missing_person_records").select("id,status,updated_at"),
 supabase.from("investigator_profiles").select("user_id,availability").eq("organization_id",organization.id)
 ]);setCases(c.data||[]);setEvidence(e.data||[]);setMissing(m.data||[]);setInvestigators(i.data||[]);
 if(profile?.global_role==="platform_admin"){const {data:r}=await supabase.from("service_requests").select("id,status,submitted_at").order("submitted_at",{ascending:false}).limit(20);setRequests(r||[]);}})()},[organization?.id,profile?.global_role,supabase]);
 return <AppShell title="Dashboard" subtitle="Live data from your secured WETrace Supabase backend." actions={<Badge tone="green">LIVE</Badge>}>
   <section className="grid"><div className="card"><small>Active cases</small><b>{cases.filter(x=>!["closed","archived"].includes(x.status)).length}</b></div><div className="card"><small>Missing people</small><b>{missing.filter(x=>x.status==="missing").length}</b></div><div className="card"><small>Evidence items</small><b>{evidence.length}</b></div><div className="card"><small>Investigators</small><b>{investigators.length}</b></div></section>
   <section className="panel" style={{marginTop:14}}><div className="pageHead" style={{marginBottom:8}}><div><h1 style={{fontSize:18}}>Recent cases</h1><span>Cases visible to your account.</span></div><Link className="btn" href="/cases/new">＋ Open case</Link></div>{cases.length?<table className="table"><thead><tr><th>Case</th><th>Type</th><th>Priority</th><th>Status</th><th>Updated</th></tr></thead><tbody>{cases.map(c=><tr key={c.id}><td><Link href={"/cases"}>{c.case_number} · {c.title}</Link></td><td>{c.case_type}</td><td><Badge tone={c.priority==="high"||c.priority==="critical"?"red":"amber"}>{c.priority}</Badge></td><td><Badge tone="blue">{c.status}</Badge></td><td>{new Date(c.updated_at).toLocaleDateString()}</td></tr>)}</tbody></table>:<div className="empty">No real cases yet.</div>}</section>
   <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}><section className="panel"><h2>Recent evidence</h2>{evidence.length?<table className="table"><tbody>{evidence.map(e=><tr key={e.id}><td>{e.evidence_number}</td><td>{e.description||"Evidence"}</td><td><Badge tone="amber">{e.custody_status}</Badge></td></tr>)}</tbody></table>:<div className="empty">No evidence yet.</div>}</section><section className="panel"><h2>Service requests</h2>{profile?.global_role==="platform_admin"?<><p>{requests.filter(x=>x.status==="new").length} new request(s)</p><Link className="btn alt" href="/service-requests">Open intake inbox</Link></>:<div className="empty">Super Admin only.</div>}</section></div>
 </AppShell>;
}
