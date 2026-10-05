"use client";

import Link from "next/link";
import {FormEvent,useEffect,useState} from "react";
import AppShell from "../components/AppShell";
import Badge from "../components/Badge";
import {useWorkspace} from "../lib/useWorkspace";

export default function RecordsSearch(){
 const {supabase,user,organization}=useWorkspace();
 const [rows,setRows]=useState<any[]>([]);
 const [cases,setCases]=useState<any[]>([]);
 const [form,setForm]=useState({caseId:"",type:"Public records",jurisdiction:"Vietnam",purpose:"",provider:"",restricted:false});
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState<string|null>(null);

 const load=async()=>{
   if(!organization)return;
   const [{data:r},{data:c}]=await Promise.all([
     supabase.from("record_searches").select("*,cases(case_number,title)").order("created_at",{ascending:false}),
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

   const {error}=await supabase.from("record_searches").insert({
     organization_id:organization.id,
     case_id:form.caseId,
     search_type:form.type,
     jurisdiction:form.jurisdiction,
     lawful_purpose:form.purpose,
     provider:form.provider||null,
     status:"requested",
     restricted:form.restricted,
     requested_by:user.id
   });

   setBusy(false);
   if(error){setError(error.message);return;}
   setForm(f=>({...f,purpose:"",provider:"",restricted:false}));
   load();
 };

 return <AppShell title="Records Search" subtitle="Track lawful public or authorized records requests. WETrace does not bypass provider or jurisdiction restrictions.">
   <div className="caseWorkspaceGrid">
     <section className="panel">
       <div className="panelHead"><div><h2>Request a records search</h2><p>Requests remain tied to a case and documented lawful purpose.</p></div></div>
       {error&&<div className="inlineAlert error">{error}</div>}
       {cases.length?<form className="formGrid" onSubmit={submit}>
         <label>Case<select value={form.caseId} onChange={e=>setForm({...form,caseId:e.target.value})}>{cases.map(c=><option key={c.id} value={c.id}>{c.case_number} · {c.title}</option>)}</select></label>
         <label>Search type<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option>Public records</option><option>Civil court records</option><option>Criminal court records</option><option>Property records</option><option>Business records</option><option>Professional licenses</option><option>Driver / motor record request</option><option>Other authorized record</option></select></label>
         <label>Jurisdiction<input required value={form.jurisdiction} onChange={e=>setForm({...form,jurisdiction:e.target.value})}/></label>
         <label>Authorized provider<input value={form.provider} onChange={e=>setForm({...form,provider:e.target.value})} placeholder="Optional provider name"/></label>
         <label className="full">Lawful purpose<textarea required rows={4} value={form.purpose} onChange={e=>setForm({...form,purpose:e.target.value})} placeholder="Why is this request permitted for this case?"/></label>
         <label className="checkboxLine full"><input type="checkbox" checked={form.restricted} onChange={e=>setForm({...form,restricted:e.target.checked})}/><span>This request involves restricted/non-public data and requires enhanced case permission.</span></label>
         <div className="formActions full"><button className="primaryBtn inlineBtn" disabled={busy}>{busy?"Submitting…":"Submit request"}</button></div>
       </form>:<div className="emptyState"><strong>Create a case first</strong><p>Records requests must be connected to an investigation.</p><Link href="/cases/new" className="primaryBtn inlineBtn">Open case</Link></div>}
     </section>

     <section className="panel">
       <div className="panelHead"><div><h2>Request register</h2><p>{rows.length} request{rows.length===1?"":"s"} visible</p></div></div>
       {rows.length?<div className="recordGrid singleColumn">{rows.map(r=><Link href={"/cases/"+r.case_id} className="recordCard linkCard" key={r.id}><div><strong>{r.search_type}</strong><small>{r.cases?.case_number||"Case"} · {r.jurisdiction} · {r.provider||"No provider assigned"}</small></div><Badge tone={r.restricted?"red":r.status==="completed"?"green":"amber"}>{r.restricted?"restricted · ":""}{r.status}</Badge></Link>)}</div>:<div className="emptyState compact"><strong>No records requests yet</strong></div>}
     </section>
   </div>
 </AppShell>;
}