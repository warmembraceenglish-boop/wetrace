"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import AppShell from "../components/AppShell";
import Badge from "../components/Badge";
import {useWorkspace} from "../lib/useWorkspace";

export default function ServiceRequests(){
 const {supabase,profile}=useWorkspace();
 const [rows,setRows]=useState<any[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState<string|null>(null);

 const load=async()=>{
   setLoading(true);setError(null);
   const {data,error}=await supabase.from("service_requests").select("*").order("submitted_at",{ascending:false});
   if(error)setError(error.message);
   else setRows(data||[]);
   setLoading(false);
 };

 useEffect(()=>{if(profile?.global_role==="platform_admin")load();},[profile?.global_role]);

 const updateStatus=async(id:string,status:string)=>{
   setError(null);
   const {error}=await supabase.from("service_requests").update({status,updated_at:new Date().toISOString()}).eq("id",id);
   if(error)setError(error.message);else load();
 };

 if(profile?.global_role!=="platform_admin"){
   return <AppShell title="Service Requests" subtitle="Super Admin access required."><section className="panel"><div className="inlineAlert error">This inbox is restricted to the WETrace Super Admin.</div></section></AppShell>;
 }

 return <AppShell
   title="Service Requests"
   subtitle="Private intake requests submitted through the public WETrace registration form."
   actions={<Link href="/request-services" className="secondaryBtn inlineBtn">Open public form</Link>}
 >
   {error&&<div className="inlineAlert error">{error}</div>}

   <section className="panel">
     <div className="panelHead"><div><h2>Intake inbox</h2><p>{loading?"Loading requests…":rows.length+" request"+(rows.length===1?"":"s")+" received"}</p></div></div>

     {rows.length?<div className="serviceRequestList">{rows.map(r=><article className="serviceRequestCard" key={r.id}>
       <div className="serviceRequestHead">
         <div><span className="caseId">{r.request_number}</span><strong>{r.full_name}</strong><small>{r.service_type} · {r.jurisdiction||r.country||"Jurisdiction not entered"} · {new Date(r.submitted_at).toLocaleString()}</small></div>
         <div className="credentialActions"><Badge tone={r.urgency==="emergency"?"red":r.urgency==="urgent"?"amber":"blue"}>{r.urgency}</Badge><Badge tone={r.status==="accepted"?"green":r.status==="declined"?"slate":"amber"}>{r.status}</Badge></div>
       </div>

       <p>{r.case_summary}</p>

       <div className="detailColumns">
         <div><small>Email</small><strong>{r.email}</strong></div>
         <div><small>Phone</small><strong>{r.phone||"—"}</strong></div>
         <div><small>Preferred contact</small><strong>{r.preferred_contact}</strong></div>
         <div><small>Country</small><strong>{r.country||"—"}</strong></div>
       </div>

       <div className="formActions">
         <button className="textBtn" onClick={()=>updateStatus(r.id,"reviewing")}>Mark reviewing</button>
         <button className="textBtn" onClick={()=>updateStatus(r.id,"accepted")}>Accept</button>
         <button className="textBtn" onClick={()=>updateStatus(r.id,"declined")}>Decline</button>
         <button className="textBtn" onClick={()=>updateStatus(r.id,"closed")}>Close</button>
       </div>
     </article>)}</div>:!loading&&<div className="emptyState"><strong>No service requests yet</strong><p>The public form is live at <Link href="/request-services">/request-services</Link>.</p></div>}
   </section>
 </AppShell>;
}