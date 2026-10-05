"use client";

import Link from "next/link";
import {FormEvent,useEffect,useState} from "react";
import AppShell from "../components/AppShell";
import Badge from "../components/Badge";
import {useWorkspace} from "../lib/useWorkspace";

export default function Billing(){
 const {supabase,user,organization,membership}=useWorkspace();
 const [rows,setRows]=useState<any[]>([]);
 const [cases,setCases]=useState<any[]>([]);
 const [form,setForm]=useState({caseId:"",amount:"",currency:"USD",due:""});
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const canManage=["owner","admin","billing"].includes(membership?.organization_role||"");

 const load=async()=>{
   if(!organization)return;
   const [{data:i},{data:c}]=await Promise.all([
     supabase.from("invoices").select("*,cases(case_number,title)").eq("organization_id",organization.id).order("created_at",{ascending:false}),
     supabase.from("cases").select("id,case_number,title").order("updated_at",{ascending:false})
   ]);
   setRows(i||[]);
   setCases(c||[]);
   setForm(f=>({...f,currency:organization.default_currency||"USD",caseId:f.caseId||c?.[0]?.id||""}));
 };

 useEffect(()=>{load();},[organization?.id]);

 const submit=async(e:FormEvent)=>{
   e.preventDefault();
   if(!user||!organization||!canManage)return;

   setBusy(true);setError(null);

   const number="INV-"+Date.now().toString().slice(-8);
   const {error}=await supabase.from("invoices").insert({
     organization_id:organization.id,
     case_id:form.caseId||null,
     invoice_number:number,
     amount:Number(form.amount),
     currency:form.currency,
     status:"draft",
     due_at:form.due?new Date(form.due+"T12:00:00").toISOString():null,
     created_by:user.id
   });

   setBusy(false);
   if(error){setError(error.message);return;}
   setForm(f=>({...f,amount:"",due:""}));
   load();
 };

 const updateStatus=async(id:string,status:string)=>{
   const {error}=await supabase.from("invoices").update({status}).eq("id",id);
   if(error)setError(error.message);else load();
 };

 const total=rows.reduce((sum,r)=>sum+Number(r.amount||0),0);
 const paid=rows.filter(r=>r.status==="paid").reduce((sum,r)=>sum+Number(r.amount||0),0);

 return <AppShell title="Billing" subtitle="Case-linked invoices, time and expenses stored in the live WETrace backend.">
   <section className="kpiGrid">
     <article className="kpi"><div className="kpiTop"><span>Invoices</span><i>▤</i></div><strong>{rows.length}</strong><small>Visible to your role</small></article>
     <article className="kpi"><div className="kpiTop"><span>Total billed</span><i>◉</i></div><strong>{organization?.default_currency||"USD"} {total.toFixed(2)}</strong><small>All visible invoices</small></article>
     <article className="kpi"><div className="kpiTop"><span>Paid</span><i>✓</i></div><strong>{organization?.default_currency||"USD"} {paid.toFixed(2)}</strong><small>Recorded paid invoices</small></article>
     <article className="kpi"><div className="kpiTop"><span>Outstanding</span><i>◌</i></div><strong>{organization?.default_currency||"USD"} {(total-paid).toFixed(2)}</strong><small>Not yet paid</small></article>
   </section>

   <div className="caseWorkspaceGrid">
     <section className="panel">
       <div className="panelHead"><div><h2>Create invoice</h2><p>Invoices can be scoped to a case.</p></div></div>
       {error&&<div className="inlineAlert error">{error}</div>}
       {canManage&&cases.length?<form className="formGrid" onSubmit={submit}>
         <label>Case<select value={form.caseId} onChange={e=>setForm({...form,caseId:e.target.value})}>{cases.map(c=><option key={c.id} value={c.id}>{c.case_number} · {c.title}</option>)}</select></label>
         <label>Amount<input type="number" min="0" step="0.01" required value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label>
         <label>Currency<input value={form.currency} onChange={e=>setForm({...form,currency:e.target.value.toUpperCase()})}/></label>
         <label>Due date<input type="date" value={form.due} onChange={e=>setForm({...form,due:e.target.value})}/></label>
         <div className="formActions full"><button className="primaryBtn inlineBtn" disabled={busy}>{busy?"Creating…":"Create draft invoice"}</button></div>
       </form>:<div className="emptyState compact"><strong>{canManage?"Create a case before invoicing.":"Your role has read-only billing access."}</strong></div>}
     </section>

     <section className="panel">
       <div className="panelHead"><div><h2>Invoice register</h2><p>{rows.length} invoice{rows.length===1?"":"s"} visible</p></div></div>
       {rows.length?<div className="recordGrid singleColumn">{rows.map(r=><article className="recordCard" key={r.id}>
         <div><strong>{r.invoice_number} · {r.currency} {Number(r.amount).toFixed(2)}</strong><small>{r.cases?.case_number||"No case"} · due {r.due_at?new Date(r.due_at).toLocaleDateString():"not set"}</small></div>
         <div className="credentialActions"><Badge tone={r.status==="paid"?"green":r.status==="overdue"?"red":"amber"}>{r.status}</Badge>{canManage&&r.status!=="paid"&&<button className="textBtn" onClick={()=>updateStatus(r.id,"paid")}>Mark paid</button>}</div>
       </article>)}</div>:<div className="emptyState compact"><strong>No invoices yet</strong></div>}
     </section>
   </div>
 </AppShell>;
}