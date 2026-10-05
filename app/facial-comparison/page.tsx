"use client";

import Link from "next/link";
import {FormEvent,useEffect,useState} from "react";
import AppShell from "../components/AppShell";
import Badge from "../components/Badge";
import {useWorkspace} from "../lib/useWorkspace";

export default function FacialComparison(){
 const {supabase,user,organization}=useWorkspace();
 const [cases,setCases]=useState<any[]>([]);
 const [evidence,setEvidence]=useState<any[]>([]);
 const [comparisons,setComparisons]=useState<any[]>([]);
 const [thumbs,setThumbs]=useState<Record<string,string>>({});
 const [form,setForm]=useState({caseId:"",probeId:"",referenceId:"",provider:"",reviewer:"",notes:""});
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const [resultDraft,setResultDraft]=useState<Record<string,{status:string;score:string;finding:string}>>({});

 const loadCases=async()=>{
   if(!organization)return;
   const {data}=await supabase.from("cases").select("id,case_number,title").order("updated_at",{ascending:false});
   const rows=data||[];
   setCases(rows);
   const requested=typeof window!=="undefined"?new URLSearchParams(window.location.search).get("case"):null;
   const initial=(requested&&rows.some((x:any)=>x.id===requested)?requested:rows[0]?.id)||"";
   setForm(f=>({...f,caseId:f.caseId||initial}));
 };

 const loadEvidence=async(caseId:string)=>{
   if(!caseId){setEvidence([]);return;}
   const {data}=await supabase.from("evidence").select("id,evidence_number,description,storage_path,sensitivity").eq("case_id",caseId).eq("evidence_type","image").order("created_at",{ascending:false});
   const rows=data||[];
   setEvidence(rows);

   const urls:Record<string,string>={};
   for(const item of rows){
     if(!item.storage_path)continue;
     const {data:signed}=await supabase.storage.from("wetrace-evidence").createSignedUrl(item.storage_path,900);
     if(signed?.signedUrl)urls[item.id]=signed.signedUrl;
   }
   setThumbs(urls);

   setForm(f=>({
     ...f,
     probeId:rows.some((x:any)=>x.id===f.probeId)?f.probeId:(rows[0]?.id||""),
     referenceId:rows.some((x:any)=>x.id===f.referenceId)?f.referenceId:(rows[1]?.id||"")
   }));
 };

 const loadComparisons=async()=>{
   const {data,error}=await supabase.from("facial_comparisons").select("*,cases(case_number,title)").order("created_at",{ascending:false});
   if(error){setError(error.message);return;}
   const rows=data||[];
   setComparisons(rows);
   setResultDraft(Object.fromEntries(rows.map((r:any)=>[r.id,{status:r.status,score:r.similarity_score?.toString()||"",finding:r.finding||""}])));
 };

 useEffect(()=>{loadCases();loadComparisons();},[organization?.id]);
 useEffect(()=>{if(form.caseId)loadEvidence(form.caseId);},[form.caseId]);

 const submit=async(e:FormEvent)=>{
   e.preventDefault();
   if(!user||!organization)return;
   if(!form.probeId||!form.referenceId){setError("Choose two case images.");return;}
   if(form.probeId===form.referenceId){setError("Choose two different images.");return;}

   setBusy(true);setError(null);

   const {error}=await supabase.from("facial_comparisons").insert({
     organization_id:organization.id,
     case_id:form.caseId,
     probe_evidence_id:form.probeId,
     reference_evidence_id:form.referenceId,
     provider_name:form.provider.trim()||null,
     reviewer_name:form.reviewer.trim()||null,
     method:"human_or_authorized_provider_review",
     status:"requested",
     notes:form.notes.trim()||null,
     restricted:true,
     created_by:user.id
   });

   setBusy(false);
   if(error){setError(error.message);return;}
   setForm(f=>({...f,provider:"",reviewer:"",notes:""}));
   loadComparisons();
 };

 const saveResult=async(id:string)=>{
   const draft=resultDraft[id];
   if(!draft)return;
   setBusy(true);setError(null);

   const score=draft.score.trim()===""?null:Number(draft.score);
   const {error}=await supabase.from("facial_comparisons").update({
     status:draft.status,
     similarity_score:Number.isFinite(score as number)?score:null,
     finding:draft.finding.trim()||null,
     reviewed_at:draft.status==="completed"||draft.status==="inconclusive"?new Date().toISOString():null,
     updated_at:new Date().toISOString()
   }).eq("id",id);

   setBusy(false);
   if(error)setError(error.message);else loadComparisons();
 };

 const evidenceLabel=(id:string)=>evidence.find((x:any)=>x.id===id)?.evidence_number||"Image";

 return <AppShell
   title="Facial Comparison"
   subtitle="Restricted comparison of authorized case images. WETrace records the review; it does not make autonomous identity determinations."
   actions={<Link href="/missing-persons" className="secondaryBtn inlineBtn">Missing-person registry</Link>}
 >
   {error&&<div className="inlineAlert error">{error}</div>}

   <section className="panel">
     <div className="panelHead"><div><h2>Create comparison request</h2><p>Both images must already be stored as evidence in the same authorized case.</p></div><Badge tone="red">RESTRICTED</Badge></div>

     {cases.length?<form className="formGrid" onSubmit={submit}>
       <label className="full">Case<select value={form.caseId} onChange={e=>setForm({...form,caseId:e.target.value,probeId:"",referenceId:""})}>{cases.map(c=><option key={c.id} value={c.id}>{c.case_number} · {c.title}</option>)}</select></label>

       <label>Probe image<select value={form.probeId} onChange={e=>setForm({...form,probeId:e.target.value})}><option value="">Choose image</option>{evidence.map(e=><option key={e.id} value={e.id}>{e.evidence_number} · {e.description||"Image"}</option>)}</select></label>
       <label>Reference image<select value={form.referenceId} onChange={e=>setForm({...form,referenceId:e.target.value})}><option value="">Choose image</option>{evidence.map(e=><option key={e.id} value={e.id}>{e.evidence_number} · {e.description||"Image"}</option>)}</select></label>

       <div className="faceComparePreview full">
         <div><small>Probe</small>{form.probeId&&thumbs[form.probeId]?<img src={thumbs[form.probeId]} alt="Probe evidence"/>:<span>No image selected</span>}</div>
         <div className="faceCompareArrow">⇄</div>
         <div><small>Reference</small>{form.referenceId&&thumbs[form.referenceId]?<img src={thumbs[form.referenceId]} alt="Reference evidence"/>:<span>No image selected</span>}</div>
       </div>

       <label>Provider / examiner<input value={form.provider} onChange={e=>setForm({...form,provider:e.target.value})} placeholder="Authorized provider or examiner"/></label>
       <label>Reviewer name<input value={form.reviewer} onChange={e=>setForm({...form,reviewer:e.target.value})}/></label>
       <label className="full">Review notes<textarea rows={4} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Purpose, image quality, source, limitations…"/></label>

       <div className="formNotice full"><strong>No automatic identification claim</strong><p>A similarity score or reviewer finding is only an investigative lead. Identity should be corroborated with independent evidence and lawful procedures.</p></div>
       <div className="formActions full">{evidence.length<2?<Link href={"/cases/"+form.caseId+"?view=evidence"} className="secondaryBtn inlineBtn">Upload at least two case images</Link>:<button className="primaryBtn inlineBtn" disabled={busy}>{busy?"Creating…":"Create comparison request"}</button>}</div>
     </form>:<div className="emptyState"><strong>Create a case first</strong><p>Facial comparison is case-scoped and permission-gated.</p><Link href="/cases/new" className="primaryBtn inlineBtn">Open case</Link></div>}
   </section>

   <section className="panel">
     <div className="panelHead"><div><h2>Comparison register</h2><p>{comparisons.length} restricted comparison{comparisons.length===1?"":"s"} visible to your account</p></div></div>

     {comparisons.length?<div className="comparisonList">{comparisons.map(r=>{
       const draft=resultDraft[r.id]||{status:r.status,score:r.similarity_score?.toString()||"",finding:r.finding||""};
       return <article className="comparisonCard" key={r.id}>
         <div className="comparisonHead"><div><strong>{r.cases?.case_number||"Case"} · {r.cases?.title||"Facial comparison"}</strong><small>{new Date(r.created_at).toLocaleString()} · {r.provider_name||"Provider unassigned"}</small></div><Badge tone={r.status==="completed"?"green":r.status==="inconclusive"?"amber":"red"}>{r.status}</Badge></div>
         <div className="comparisonPair"><span>{r.probe_evidence_id===form.probeId?evidenceLabel(r.probe_evidence_id):"Probe evidence"}</span><b>⇄</b><span>{r.reference_evidence_id===form.referenceId?evidenceLabel(r.reference_evidence_id):"Reference evidence"}</span></div>
         <div className="formGrid compactForm">
           <label>Status<select value={draft.status} onChange={e=>setResultDraft({...resultDraft,[r.id]:{...draft,status:e.target.value}})}><option value="requested">Requested</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="inconclusive">Inconclusive</option><option value="cancelled">Cancelled</option></select></label>
           <label>Similarity score %<input type="number" min="0" max="100" value={draft.score} onChange={e=>setResultDraft({...resultDraft,[r.id]:{...draft,score:e.target.value}})} placeholder="Provider/reviewer score"/></label>
           <label className="full">Finding<textarea rows={3} value={draft.finding} onChange={e=>setResultDraft({...resultDraft,[r.id]:{...draft,finding:e.target.value}})} placeholder="Reviewer finding and limitations"/></label>
         </div>
         <div className="formActions"><Link href={"/cases/"+r.case_id+"?view=evidence"} className="textBtn">Open case evidence</Link><button className="primaryBtn inlineBtn" disabled={busy} onClick={()=>saveResult(r.id)}>Save review result</button></div>
       </article>;
     })}</div>:<div className="emptyState"><strong>No facial comparisons yet</strong><p>Create a comparison request above when you have two authorized case images.</p></div>}
   </section>
 </AppShell>;
}