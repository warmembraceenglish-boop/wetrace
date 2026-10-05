"use client";

import Link from "next/link";
import {FormEvent,useEffect,useState} from "react";
import AppShell from "../components/AppShell";
import Badge from "../components/Badge";
import {useWorkspace} from "../lib/useWorkspace";

type MissingRecord={
  id:string;
  case_id:string;
  person_id:string;
  status:string;
  date_reported:string;
  last_seen_at:string|null;
  last_seen_location:string|null;
  last_seen_details:string|null;
  physical_description:string|null;
  clothing_description:string|null;
  police_report_reference:string|null;
  external_source_name:string|null;
  external_source_url:string|null;
  primary_photo_evidence_id:string|null;
};

type CaseRow={id:string;case_number:string;title:string;jurisdictions:string[]};

function safeName(name:string){return name.replace(/[^a-zA-Z0-9._-]+/g,"_").slice(-120);}
async function sha256(file:File){
 const data=await file.arrayBuffer();
 const hash=await crypto.subtle.digest("SHA-256",data);
 return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

export default function MissingPersons(){
 const {supabase,user,organization}=useWorkspace();
 const [records,setRecords]=useState<MissingRecord[]>([]);
 const [cases,setCases]=useState<CaseRow[]>([]);
 const [people,setPeople]=useState<Record<string,any>>({});
 const [caseMap,setCaseMap]=useState<Record<string,any>>({});
 const [photoUrls,setPhotoUrls]=useState<Record<string,string>>({});
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const [notice,setNotice]=useState<string|null>(null);
 const [photo,setPhoto]=useState<File|null>(null);
 const [form,setForm]=useState({
   caseId:"",
   fullName:"",
   aliases:"",
   nationality:"",
   lastSeenAt:"",
   lastSeenLocation:"",
   lastSeenDetails:"",
   physicalDescription:"",
   clothingDescription:"",
   vulnerabilityNotes:"",
   policeReference:"",
   externalSourceName:"",
   externalSourceUrl:""
 });

 const load=async()=>{
   if(!organization)return;
   setLoading(true);setError(null);

   const [r,c]=await Promise.all([
     supabase.from("missing_person_records").select("*").eq("organization_id",organization.id).order("updated_at",{ascending:false}),
     supabase.from("cases").select("id,case_number,title,jurisdictions").eq("case_type","Missing Person").order("updated_at",{ascending:false})
   ]);

   if(r.error)setError(r.error.message);
   if(c.error)setError(c.error.message);

   const rows=(r.data as MissingRecord[])||[];
   const caseRows=(c.data as CaseRow[])||[];
   setRecords(rows);setCases(caseRows);

   const personIds=[...new Set(rows.map(x=>x.person_id))];
   const caseIds=[...new Set(rows.map(x=>x.case_id))];
   const evidenceIds=[...new Set(rows.map(x=>x.primary_photo_evidence_id).filter(Boolean))] as string[];

   if(personIds.length){
     const {data:p}=await supabase.from("people").select("id,display_name,aliases,nationality,sensitivity").in("id",personIds);
     setPeople(Object.fromEntries((p||[]).map((x:any)=>[x.id,x])));
   }else setPeople({});

   if(caseIds.length){
     const {data:cc}=await supabase.from("cases").select("id,case_number,title,jurisdictions").in("id",caseIds);
     setCaseMap(Object.fromEntries((cc||[]).map((x:any)=>[x.id,x])));
   }else setCaseMap({});

   const urls:Record<string,string>={};
   if(evidenceIds.length){
     const {data:e}=await supabase.from("evidence").select("id,storage_path").in("id",evidenceIds);
     for(const item of e||[]){
       if(!item.storage_path)continue;
       const {data:signed}=await supabase.storage.from("wetrace-evidence").createSignedUrl(item.storage_path,900);
       if(signed?.signedUrl)urls[item.id]=signed.signedUrl;
     }
   }
   setPhotoUrls(urls);

   if(!form.caseId&&caseRows[0]?.id)setForm(f=>({...f,caseId:caseRows[0].id}));
   setLoading(false);
 };

 useEffect(()=>{load();},[organization?.id]);

 const submit=async(e:FormEvent)=>{
   e.preventDefault();
   if(!organization||!user||!form.caseId)return;
   setBusy(true);setError(null);setNotice(null);

   const {data:person,error:pErr}=await supabase.from("people").insert({
     organization_id:organization.id,
     display_name:form.fullName.trim(),
     aliases:form.aliases.split(",").map(x=>x.trim()).filter(Boolean),
     nationality:form.nationality.trim()||null,
     sensitivity:"restricted",
     created_by:user.id
   }).select("id").single();

   if(pErr||!person){setError(pErr?.message||"Could not create person record.");setBusy(false);return;}

   const {error:cpErr}=await supabase.from("case_people").insert({
     case_id:form.caseId,
     organization_id:organization.id,
     person_id:person.id,
     relationship:"missing_person",
     confidence:100
   });

   if(cpErr){setError(cpErr.message);setBusy(false);return;}

   let evidenceId:string|null=null;

   if(photo){
     const path=form.caseId+"/"+crypto.randomUUID()+"-"+safeName(photo.name);
     const digest=await sha256(photo);
     const {error:upErr}=await supabase.storage.from("wetrace-evidence").upload(path,photo,{contentType:photo.type||undefined,upsert:false});
     if(upErr){setError(upErr.message);setBusy(false);return;}

     const {data:ev,error:evErr}=await supabase.from("evidence").insert({
       organization_id:organization.id,
       case_id:form.caseId,
       evidence_type:"image",
       description:"Missing person primary photo — "+form.fullName.trim(),
       sensitivity:"restricted",
       storage_path:path,
       sha256:digest,
       collected_at:new Date().toISOString(),
       collected_by:user.id,
       custody_status:"received"
     }).select("id").single();

     if(evErr||!ev){
       await supabase.storage.from("wetrace-evidence").remove([path]);
       setError(evErr?.message||"Could not register photo.");
       setBusy(false);
       return;
     }

     evidenceId=ev.id;

     await supabase.from("evidence_custody_events").insert({
       organization_id:organization.id,
       case_id:form.caseId,
       evidence_id:ev.id,
       event_type:"received",
       actor_user_id:user.id,
       from_party:"Missing-person intake",
       to_party:"WETrace Evidence Vault",
       location:"Private storage",
       notes:"Primary missing-person photo"
     });
   }

   const {data:record,error:rErr}=await supabase.from("missing_person_records").insert({
     organization_id:organization.id,
     case_id:form.caseId,
     person_id:person.id,
     status:"missing",
     last_seen_at:form.lastSeenAt?new Date(form.lastSeenAt).toISOString():null,
     last_seen_location:form.lastSeenLocation.trim()||null,
     last_seen_details:form.lastSeenDetails.trim()||null,
     physical_description:form.physicalDescription.trim()||null,
     clothing_description:form.clothingDescription.trim()||null,
     medical_or_vulnerability_notes:form.vulnerabilityNotes.trim()||null,
     police_report_reference:form.policeReference.trim()||null,
     external_source_name:form.externalSourceName.trim()||null,
     external_source_url:form.externalSourceUrl.trim()||null,
     primary_photo_evidence_id:evidenceId,
     created_by:user.id
   }).select("id").single();

   if(rErr||!record){setError(rErr?.message||"Could not create missing-person record.");setBusy(false);return;}

   if(evidenceId){
     await supabase.from("missing_person_photos").insert({
       organization_id:organization.id,
       case_id:form.caseId,
       missing_person_id:record.id,
       evidence_id:evidenceId,
       caption:"Primary photo",
       is_primary:true,
       created_by:user.id
     });
   }

   setNotice("Missing-person record created. The photo is stored privately inside WETrace.");
   setPhoto(null);
   setForm(f=>({...f,fullName:"",aliases:"",nationality:"",lastSeenAt:"",lastSeenLocation:"",lastSeenDetails:"",physicalDescription:"",clothingDescription:"",vulnerabilityNotes:"",policeReference:"",externalSourceName:"",externalSourceUrl:""}));
   setBusy(false);
   load();
 };

 return <AppShell
   title="Missing Persons"
   subtitle="Real missing-person records, private photos, last-seen data, sightings and source provenance."
   actions={<div className="caseHeaderActions"><Link href="/cases/new" className="primaryBtn inlineBtn">＋ Open missing-person case</Link><Link href="/facial-comparison" className="secondaryBtn inlineBtn">Facial comparison</Link></div>}
 >
   {error&&<div className="inlineAlert error">{error}</div>}
   {notice&&<div className="inlineAlert success">{notice}</div>}

   <section className="panel">
     <div className="panelHead"><div><h2>Missing-person registry</h2><p>{loading?"Loading secure records…":records.length+" real record"+(records.length===1?"":"s")+" in your workspace"}</p></div></div>

     {records.length
       ?<div className="missingPersonGrid">
         {records.map(r=>{
           const person=people[r.person_id];
           const c=caseMap[r.case_id];
           const photoUrl=r.primary_photo_evidence_id?photoUrls[r.primary_photo_evidence_id]:null;
           return <Link href={"/missing-persons/"+r.id} className="missingPersonCard" key={r.id}>
             <div className="missingPhoto">{photoUrl?<img src={photoUrl} alt={person?.display_name||"Missing person"}/>:<span>NO PHOTO</span>}</div>
             <div className="missingCardBody">
               <div className="missingCardTop"><div><strong>{person?.display_name||"Missing person"}</strong><small>{c?.case_number||"Case"} · {c?.title||"Investigation"}</small></div><Badge tone={r.status==="located"?"green":r.status==="closed"?"slate":"red"}>{r.status}</Badge></div>
               <div className="missingFacts"><span><small>Last seen</small><b>{r.last_seen_at?new Date(r.last_seen_at).toLocaleString():"Unknown"}</b></span><span><small>Location</small><b>{r.last_seen_location||"Unknown"}</b></span></div>
               <p>{r.last_seen_details||r.physical_description||"No additional summary entered."}</p>
             </div>
           </Link>;
         })}
       </div>
       :!loading&&<div className="emptyState"><strong>No missing-person records yet</strong><p>I have not inserted fake people. Create the first real record below or import an official/public source after verification.</p></div>}
   </section>

   <section className="panel">
     <div className="panelHead"><div><h2>Register a missing person</h2><p>Create the person, case link, primary photo and last-seen record together.</p></div></div>

     {cases.length?<form className="formGrid" onSubmit={submit}>
       <label>Missing-person case<select value={form.caseId} onChange={e=>setForm({...form,caseId:e.target.value})}>{cases.map(c=><option key={c.id} value={c.id}>{c.case_number} · {c.title}</option>)}</select></label>
       <label>Full name<input required value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})}/></label>
       <label>Aliases<input value={form.aliases} onChange={e=>setForm({...form,aliases:e.target.value})} placeholder="Comma-separated"/></label>
       <label>Nationality<input value={form.nationality} onChange={e=>setForm({...form,nationality:e.target.value})}/></label>
       <label>Last seen date/time<input type="datetime-local" value={form.lastSeenAt} onChange={e=>setForm({...form,lastSeenAt:e.target.value})}/></label>
       <label>Last seen location<input value={form.lastSeenLocation} onChange={e=>setForm({...form,lastSeenLocation:e.target.value})}/></label>
       <label>Primary photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setPhoto(e.target.files?.[0]||null)}/></label>
       <label>Police/report reference<input value={form.policeReference} onChange={e=>setForm({...form,policeReference:e.target.value})}/></label>
       <label className="full">Last seen details<textarea rows={3} value={form.lastSeenDetails} onChange={e=>setForm({...form,lastSeenDetails:e.target.value})}/></label>
       <label className="full">Physical description<textarea rows={3} value={form.physicalDescription} onChange={e=>setForm({...form,physicalDescription:e.target.value})}/></label>
       <label className="full">Clothing description<textarea rows={3} value={form.clothingDescription} onChange={e=>setForm({...form,clothingDescription:e.target.value})}/></label>
       <label className="full">Medical / vulnerability notes<textarea rows={3} value={form.vulnerabilityNotes} onChange={e=>setForm({...form,vulnerabilityNotes:e.target.value})}/></label>
       <label>External source name<input value={form.externalSourceName} onChange={e=>setForm({...form,externalSourceName:e.target.value})} placeholder="Police, NGO, registry…"/></label>
       <label>External source URL<input type="url" value={form.externalSourceUrl} onChange={e=>setForm({...form,externalSourceUrl:e.target.value})}/></label>
       <div className="formNotice full"><strong>Accuracy rule</strong><p>Only verified or clearly attributed information should be entered. A photo or sighting is not proof of identity until reviewed.</p></div>
       <div className="formActions full"><button className="primaryBtn inlineBtn" disabled={busy||!form.fullName.trim()}>{busy?"Creating secure record…":"Create missing-person record"}</button></div>
     </form>:<div className="emptyState"><strong>Create a Missing Person case first</strong><p>Every registry entry is tied to a case so evidence, sightings and audit history stay together.</p><Link href="/cases/new" className="primaryBtn inlineBtn">Open case</Link></div>}
   </section>
 </AppShell>;
}