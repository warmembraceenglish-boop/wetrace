"use client";

import Link from "next/link";
import {FormEvent,useEffect,useState} from "react";
import AppShell from "../components/AppShell";
import Badge from "../components/Badge";
import {useWorkspace} from "../lib/useWorkspace";

export default function Forensics(){
 const {supabase,user,organization}=useWorkspace();
 const [rows,setRows]=useState<any[]>([]);
 const [cases,setCases]=useState<any[]>([]);
 const [form,setForm]=useState({caseId:"",type:"Document examination",provider:"",reviewer:""});
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState<string|null>(null);

 const load=async()=>{
   if(!organization)return;
   const [{data:r},{data:c}]=await Promise.all([
     supabase.from("specialist_reviews").select("*,cases(case_number,title)").order("created_at",{ascending:false}),
     supabase.from("cases").select("id,case_number,title").order("updated_at",{ascending:false})
   ]);
   setRows(r||[]);
   setCases(c||[]);
   if(!form.caseId&&c?.[0]?.id)setForm(f=>({...f,caseId:c[0].id}));
 };

 useEffect(()=>{load();},[organization?.id]);

 const submit=async(e:FormEvent)=>{
   e.preventDefault();
   if(!user||!organization)return;
   setBusy(true);setError(null);

   const {error}=await supabase.from("specialist_reviews").insert({
     organization_id:organization.id,
     case_id:form.caseId,
     review_type:form.type,
     provider_name:form.provider||null,
     reviewer_name:form.reviewer||null,
     status:"submitted",
     restricted:true,
     created_by:user.id
   });

   setBusy(false);
   if(error){setError(error.message);return;}
   setForm(f=>({...f,provider:"",reviewer:""}));
   load();
 };

 return <AppShell title="Forensics" subtitle="Track authorized specialist examinations and external-provider results without turning WETrace into an unqualified laboratory.">
   <div className="caseWorkspaceGrid">
     <section className="panel">
       <div className="panelHead"><div><h2>Request specialist review</h2><p>Raw forensic processing remains with qualified external providers.</p></div></div>
       {error&&<div className="inlineAlert error">{error}</div>}
       {cases.length?<form className="formGrid" onSubmit={submit}>
         <label>Case<select value={form.caseId} onChange={e=>setForm({...form,caseId:e.target.value})}>{cases.map(c=><option key={c.id} value={c.id}>{c.case_number} · {c.title}</option>)}</select></label>
         <label>Review type<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option>Document examination</option><option>Digital forensics</option><option>Image / facial comparison review</option><option>Fingerprint examination</option><option>Toxicology review</option><option>DNA / kinship laboratory review</option><option>Other specialist review</option></select></label>
         <label>Provider / laboratory<input value={form.provider} onChange={e=>setForm({...form,provider:e.target.value})} placeholder="Qualified provider"/></label>
         <label>Reviewer / examiner<input value={form.reviewer} onChange={e=>setForm({...form,reviewer:e.target.value})} placeholder="If known"/></label>
         <div className="formNotice full"><strong>Restricted workflow</strong><p>Specialist reviews are permission-gated. WETrace stores workflow and result summaries; it does not perform raw DNA analysis or make automatic identity determinations.</p></div>
         <div className="formActions full"><button className="primaryBtn inlineBtn" disabled={busy}>{busy?"Submitting…":"Create review"}</button></div>
       </form>:<div className="emptyState"><strong>Create a case first</strong><p>Forensic reviews must remain connected to an authorized investigation.</p><Link href="/cases/new" className="primaryBtn inlineBtn">Open case</Link></div>}
     </section>

     <section className="panel">
       <div className="panelHead"><div><h2>Specialist review register</h2><p>{rows.length} review{rows.length===1?"":"s"} visible</p></div></div>
       {rows.length?<div className="recordGrid singleColumn">{rows.map(r=><Link href={"/cases/"+r.case_id} className="recordCard linkCard" key={r.id}><div><strong>{r.review_type}</strong><small>{r.cases?.case_number||"Case"} · {r.provider_name||"Provider unassigned"} · {r.reviewer_name||"Reviewer unassigned"}</small></div><Badge tone={r.status==="completed"?"green":"red"}>{r.status}</Badge></Link>)}</div>:<div className="emptyState compact"><strong>No specialist reviews yet</strong></div>}
     </section>
   </div>
 </AppShell>;
}