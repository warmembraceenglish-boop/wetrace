"use client";
import {useEffect,useState} from "react";
import AppShell from "../components/AppShell";
import Badge from "../components/Badge";
import {useWorkspace} from "../lib/useWorkspace";

export default function ServiceRequests(){
 const {supabase,profile}=useWorkspace();
 const [rows,setRows]=useState<any[]>([]);
 const [error,setError]=useState<string|null>(null);

 const load=async()=>{
  setError(null);
  const {data,error}=await supabase.from("service_requests").select("*").order("submitted_at",{ascending:false});
  if(error)setError(error.message);else setRows(data||[]);
 };

 useEffect(()=>{if(profile?.global_role==="platform_admin")load()},[profile?.global_role]);

 const setStatus=async(id:string,status:string)=>{
  const {error}=await supabase.from("service_requests").update({status,updated_at:new Date().toISOString()}).eq("id",id);
  if(error)setError(error.message);else load();
 };

 if(profile?.global_role!=="platform_admin")return <AppShell title="Service Requests" subtitle="Super Admin access required."><div className="alert error">This inbox is restricted to the WETrace Super Admin.</div></AppShell>;

 return <AppShell title="Service Requests" subtitle="Private service requests submitted from the public intake form.">
  {error&&<div className="alert error">{error}</div>}
  <section className="panel">
   {rows.length?rows.map(r=><article className="card" key={r.id} style={{marginBottom:10}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:12}}>
     <div><small>{r.request_number}</small><strong style={{fontSize:13}}>{r.full_name}</strong><p style={{fontSize:9,color:"#8ca4b4"}}>{r.service_type} · {r.jurisdiction||r.country||"No jurisdiction entered"}</p></div>
     <div className="actions"><Badge tone={r.urgency==="emergency"?"red":r.urgency==="urgent"?"amber":"blue"}>{r.urgency}</Badge><Badge tone={r.status==="accepted"?"green":r.status==="declined"?"slate":"amber"}>{r.status}</Badge></div>
    </div>
    <p style={{fontSize:9,lineHeight:1.6,color:"#a4b8c4"}}>{r.case_summary}</p>
    <div style={{fontSize:8,color:"#7b95a6"}}>{r.email} · {new Date(r.submitted_at).toLocaleString()}</div>
    <div className="actions" style={{marginTop:10}}><button className="btn alt" onClick={()=>setStatus(r.id,"reviewing")}>Reviewing</button><button className="btn" onClick={()=>setStatus(r.id,"accepted")}>Accept</button><button className="btn alt" onClick={()=>setStatus(r.id,"declined")}>Decline</button><button className="btn alt" onClick={()=>setStatus(r.id,"closed")}>Close</button></div>
   </article>):<div className="empty">No service requests yet.</div>}
  </section>
 </AppShell>;
}
