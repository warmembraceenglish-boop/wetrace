"use client";

import Link from "next/link";
import {FormEvent,useEffect,useState} from "react";
import {useParams} from "next/navigation";
import AppShell from "../../components/AppShell";
import Badge from "../../components/Badge";
import {useWorkspace} from "../../lib/useWorkspace";

export default function MissingPersonDetail(){
 const {id}=useParams<{id:string}>();
 const {supabase,user}=useWorkspace();
 const [record,setRecord]=useState<any>(null);
 const [person,setPerson]=useState<any>(null);
 const [caseRow,setCaseRow]=useState<any>(null);
 const [photos,setPhotos]=useState<any[]>([]);
 const [photoUrls,setPhotoUrls]=useState<Record<string,string>>({});
 const [sightings,setSightings]=useState<any[]>([]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const [form,setForm]=useState({when:"",location:"",description:"",reporter:"",contact:"",confidence:"50",source:""});

 const load=async()=>{
   if(!id)return;
   setError(null);

   const {data:r,error:rErr}=await supabase.from("missing_person_records").select("*").eq("id",id).maybeSingle();
   if(rErr||!r){setError(rErr?.message||"Missing-person record not found or access denied.");return;}
   setRecord(r);

   const [p,c,mp,si]=await Promise.all([
     supabase.from("people").select("*").eq("id",r.person_id).maybeSingle(),
     supabase.from("cases").select("id,case_number,title,jurisdictions,status").eq("id",r.case_id).maybeSingle(),
     supabase.from("missing_person_photos").select("*").eq("missing_person_id",id).order("created_at",{ascending:true}),
     supabase.from("missing_person_sightings").select("*").eq("missing_person_id",id).order("sighting_at",{ascending:false})
   ]);

   setPerson(p.data||null);
   setCaseRow(c.data||null);
   const photoRows=mp.data||[];
   setPhotos(photoRows);
   setSightings(si.data||[]);

   const eids=[...new Set(photoRows.map((x:any)=>x.evidence_id))];
   const urls:Record<string,string>={};

   if(eids.length){
     const {data:e}=await supabase.from("evidence").select("id,storage_path,description").in("id",eids);
     const evidenceMap=Object.fromEntries((e||[]).map((x:any)=>[x.id,x]));
     for(const row of photoRows){
       const ev=evidenceMap[row.evidence_id];
       if(!ev?.storage_path)continue;
       const {data:signed}=await supabase.storage.from("wetrace-evidence").createSignedUrl(ev.storage_path,900);
       if(signed?.signedUrl)urls[row.id]=signed.signedUrl;
     }
   }

   setPhotoUrls(urls);
 };

 useEffect(()=>{load();},[id]);

 const addSighting=async(e:FormEvent)=>{
   e.preventDefault();
   if(!record||!user)return;
   setBusy(true);setError(null);

   const {error}=await supabase.from("missing_person_sightings").insert({
     organization_id:record.organization_id,
     case_id:record.case_id,
     missing_person_id:record.id,
     sighting_at:form.when?new Date(form.when).toISOString():null,
     location_text:form.location.trim(),
     description:form.description.trim()||null,
     reporter_name:form.reporter.trim()||null,
     reporter_contact:form.contact.trim()||null,
     confidence:Number(form.confidence)||null,
     verification_status:"unverified",
     source_reference:form.source.trim()||null,
     created_by:user.id
   });

   setBusy(false);
   if(error){setError(error.message);return;}
   setForm({when:"",location:"",description:"",reporter:"",contact:"",confidence:"50",source:""});
   load();
 };

 const setStatus=async(status:string)=>{
   if(!record)return;
   setBusy(true);setError(null);
   const {error}=await supabase.from("missing_person_records").update({status,updated_at:new Date().toISOString()}).eq("id",record.id);
   setBusy(false);
   if(error)setError(error.message);else load();
 };

 return <AppShell
   title={person?.display_name||"Missing Person"}
   subtitle={caseRow?caseRow.case_number+" · "+caseRow.title:"Secure missing-person record"}
   actions={record?<div className="caseHeaderActions"><Badge tone={record.status==="located"?"green":record.status==="closed"?"slate":"red"}>{record.status}</Badge><Link href={"/cases/"+record.case_id} className="secondaryBtn inlineBtn">Open case</Link><Link href={"/facial-comparison?case="+record.case_id} className="primaryBtn inlineBtn">Facial comparison</Link></div>:undefined}
 >
   {error&&<div className="inlineAlert error">{error}</div>}

   {record&&<>
     <div className="missingDetailGrid">
       <section className="panel">
         <div className="panelHead"><div><h2>Photo gallery</h2><p>Private images tied to evidence records.</p></div></div>
         {photos.length?<div className="missingGallery">{photos.map((p:any)=><div className="missingGalleryItem" key={p.id}>{photoUrls[p.id]?<img src={photoUrls[p.id]} alt={p.caption||person?.display_name||"Missing person"}/>:<div className="missingPhotoPlaceholder">Image unavailable</div>}<small>{p.caption||"Case photo"}</small></div>)}</div>:<div className="emptyState compact"><strong>No photos attached</strong></div>}
       </section>

       <aside className="panel evidenceMeta">
         <h2>Missing-person details</h2>
         <div className="profileDetail"><small>Status</small><strong>{record.status}</strong></div>
         <div className="profileDetail"><small>Last seen</small><strong>{record.last_seen_at?new Date(record.last_seen_at).toLocaleString():"Unknown"}</strong></div>
         <div className="profileDetail"><small>Location</small><strong>{record.last_seen_location||"Unknown"}</strong></div>
         <div className="profileDetail"><small>Police/report ref</small><strong>{record.police_report_reference||"—"}</strong></div>
         <div className="profileDetail"><small>Source</small><strong>{record.external_source_name||"Internal case record"}</strong></div>
         <div className="credentialActions">
           {record.status!=="located"&&<button className="textBtn" disabled={busy} onClick={()=>setStatus("located")}>Mark located</button>}
           {record.status!=="closed"&&<button className="textBtn" disabled={busy} onClick={()=>setStatus("closed")}>Close record</button>}
         </div>
       </aside>
     </div>

     <section className="panel">
       <div className="panelHead"><div><h2>Case facts</h2><p>Recorded descriptive information. Verify before relying on it.</p></div></div>
       <div className="detailColumns">
         <div><small>Aliases</small><strong>{person?.aliases?.join(", ")||"—"}</strong></div>
         <div><small>Nationality</small><strong>{person?.nationality||"—"}</strong></div>
         <div><small>Physical description</small><strong>{record.physical_description||"—"}</strong></div>
         <div><small>Clothing</small><strong>{record.clothing_description||"—"}</strong></div>
         <div><small>Last-seen details</small><strong>{record.last_seen_details||"—"}</strong></div>
         <div><small>Medical / vulnerability notes</small><strong>{record.medical_or_vulnerability_notes||"—"}</strong></div>
       </div>
     </section>

     <div className="caseWorkspaceGrid">
       <section className="panel">
         <div className="panelHead"><div><h2>Add sighting</h2><p>Sightings start unverified and should be corroborated.</p></div></div>
         <form className="formGrid" onSubmit={addSighting}>
           <label>Date/time<input type="datetime-local" value={form.when} onChange={e=>setForm({...form,when:e.target.value})}/></label>
           <label>Location<input required value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></label>
           <label>Reporter<input value={form.reporter} onChange={e=>setForm({...form,reporter:e.target.value})}/></label>
           <label>Reporter contact<input value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})}/></label>
           <label>Confidence %<input type="number" min="0" max="100" value={form.confidence} onChange={e=>setForm({...form,confidence:e.target.value})}/></label>
           <label>Source reference<input value={form.source} onChange={e=>setForm({...form,source:e.target.value})}/></label>
           <label className="full">Description<textarea rows={4} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
           <div className="formActions full"><button className="primaryBtn inlineBtn" disabled={busy}>{busy?"Adding…":"Add unverified sighting"}</button></div>
         </form>
       </section>

       <section className="panel">
         <div className="panelHead"><div><h2>Sighting history</h2><p>{sightings.length} sighting{sightings.length===1?"":"s"}</p></div></div>
         {sightings.length?<div className="recordGrid singleColumn">{sightings.map((s:any)=><article className="recordCard" key={s.id}><div><strong>{s.location_text}</strong><small>{s.sighting_at?new Date(s.sighting_at).toLocaleString():"Time unknown"} · {s.description||"No description"}</small></div><Badge tone={s.verification_status==="verified"?"green":s.verification_status==="excluded"?"slate":"amber"}>{s.verification_status} · {s.confidence??"—"}%</Badge></article>)}</div>:<div className="emptyState compact"><strong>No sightings recorded</strong></div>}
       </section>
     </div>
   </>}
 </AppShell>;
}