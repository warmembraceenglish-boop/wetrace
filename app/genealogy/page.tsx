"use client";

import Link from "next/link";
import {FormEvent,useEffect,useState} from "react";
import AppShell from "../components/AppShell";
import Badge from "../components/Badge";
import {useWorkspace} from "../lib/useWorkspace";

export default function Genealogy(){
 const {supabase,user,organization}=useWorkspace();
 const [rows,setRows]=useState<any[]>([]);
 const [cases,setCases]=useState<any[]>([]);
 const [people,setPeople]=useState<any[]>([]);
 const [names,setNames]=useState<Record<string,string>>({});
 const [form,setForm]=useState({caseId:"",personA:"",personB:"",relationship:"parent",confidence:"100",source:""});
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState<string|null>(null);

 const load=async()=>{
   if(!organization)return;
   const [{data:r},{data:c}]=await Promise.all([
     supabase.from("family_relationships").select("*").order("created_at",{ascending:false}),
     supabase.from("cases").select("id,case_number,title").order("updated_at",{ascending:false})
   ]);

   setRows(r||[]);
   setCases(c||[]);
   if(!form.caseId&&c?.[0]?.id)setForm(f=>({...f,caseId:c[0].id}));

   const ids=[...new Set((r||[]).flatMap((x:any)=>[x.person_a,x.person_b]))];
   if(ids.length){
     const {data:p}=await supabase.from("people").select("id,display_name").in("id",ids);
     setNames(Object.fromEntries((p||[]).map((x:any)=>[x.id,x.display_name])));
   }
 };

 const loadCasePeople=async(caseId:string)=>{
   if(!caseId){setPeople([]);return;}
   const {data:cp}=await supabase.from("case_people").select("person_id").eq("case_id",caseId);
   const ids=(cp||[]).map((x:any)=>x.person_id);
   if(!ids.length){setPeople([]);return;}
   const {data:p}=await supabase.from("people").select("id,display_name").in("id",ids);
   setPeople(p||[]);
   setForm(f=>({...f,personA:f.personA||p?.[0]?.id||"",personB:f.personB||p?.[1]?.id||""}));
 };

 useEffect(()=>{load();},[organization?.id]);
 useEffect(()=>{if(form.caseId)loadCasePeople(form.caseId);},[form.caseId]);

 const submit=async(e:FormEvent)=>{
   e.preventDefault();
   if(!user||!organization||!form.personA||!form.personB)return;
   if(form.personA===form.personB){setError("Choose two different people.");return;}

   setBusy(true);setError(null);

   const {error}=await supabase.from("family_relationships").insert({
     organization_id:organization.id,
     case_id:form.caseId,
     person_a:form.personA,
     person_b:form.personB,
     relationship_type:form.relationship,
     confidence:Number(form.confidence)||null,
     source_reference:form.source||null,
     created_by:user.id
   });

   setBusy(false);
   if(error){setError(error.message);return;}
   setForm(f=>({...f,source:""}));
   load();
 };

 return <AppShell title="Genealogy" subtitle="Case-linked family relationships, heir tracing and kinship research with source/confidence tracking.">
   <div className="caseWorkspaceGrid">
     <section className="panel">
       <div className="panelHead"><div><h2>Add family relationship</h2><p>People must already be linked to the same case.</p></div></div>
       {error&&<div className="inlineAlert error">{error}</div>}
       {cases.length?<form className="formGrid" onSubmit={submit}>
         <label className="full">Case<select value={form.caseId} onChange={e=>setForm({...form,caseId:e.target.value,personA:"",personB:""})}>{cases.map(c=><option key={c.id} value={c.id}>{c.case_number} · {c.title}</option>)}</select></label>
         <label>Person A<select value={form.personA} onChange={e=>setForm({...form,personA:e.target.value})}><option value="">Choose person</option>{people.map(p=><option key={p.id} value={p.id}>{p.display_name}</option>)}</select></label>
         <label>Person B<select value={form.personB} onChange={e=>setForm({...form,personB:e.target.value})}><option value="">Choose person</option>{people.map(p=><option key={p.id} value={p.id}>{p.display_name}</option>)}</select></label>
         <label>Relationship<select value={form.relationship} onChange={e=>setForm({...form,relationship:e.target.value})}><option value="parent">Parent / child</option><option value="sibling">Sibling</option><option value="spouse">Spouse / partner</option><option value="grandparent">Grandparent</option><option value="cousin">Cousin</option><option value="other">Other</option></select></label>
         <label>Confidence %<input type="number" min="0" max="100" value={form.confidence} onChange={e=>setForm({...form,confidence:e.target.value})}/></label>
         <label className="full">Source reference<input value={form.source} onChange={e=>setForm({...form,source:e.target.value})} placeholder="Birth record, probate file, interview, authorized lab result, etc."/></label>
         <div className="formNotice full"><strong>Genetic genealogy</strong><p>WETrace can record authorized external kinship findings, but raw genetic analysis remains with qualified/authorized providers.</p></div>
         <div className="formActions full"><button className="primaryBtn inlineBtn" disabled={busy||people.length<2}>{busy?"Adding…":"Add relationship"}</button></div>
       </form>:<div className="emptyState"><strong>Create a case first</strong><p>Family relationships remain case-scoped.</p><Link href="/cases/new" className="primaryBtn inlineBtn">Open case</Link></div>}
     </section>

     <section className="panel">
       <div className="panelHead"><div><h2>Relationship register</h2><p>{rows.length} relationship{rows.length===1?"":"s"} visible</p></div></div>
       {rows.length?<div className="recordGrid singleColumn">{rows.map(r=><Link href={"/cases/"+r.case_id+"?view=people"} className="recordCard linkCard" key={r.id}><div><strong>{names[r.person_a]||"Person"} ↔ {names[r.person_b]||"Person"}</strong><small>{r.relationship_type} · {r.source_reference||"No source reference entered"}</small></div><Badge tone={r.confidence>=80?"green":r.confidence>=50?"blue":"amber"}>{r.confidence??"—"}%</Badge></Link>)}</div>:<div className="emptyState compact"><strong>No family relationships yet</strong></div>}
     </section>
   </div>
 </AppShell>;
}