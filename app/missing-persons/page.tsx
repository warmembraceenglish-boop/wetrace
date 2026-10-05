"use client";
import {FormEvent,useEffect,useState} from "react";
import Link from "next/link";
import AppShell from "../components/AppShell";
import Badge from "../components/Badge";
import {useWorkspace} from "../lib/useWorkspace";

function safeName(s:string){return s.replace(/[^a-zA-Z0-9._-]+/g,"_").slice(-100)}
async function digest(file:File){const b=await file.arrayBuffer();const h=await crypto.subtle.digest("SHA-256",b);return Array.from(new Uint8Array(h)).map(x=>x.toString(16).padStart(2,"0")).join("")}

export default function MissingPersons(){
 const {supabase,user,organization}=useWorkspace();
 const [rows,setRows]=useState<any[]>([]),[cases,setCases]=useState<any[]>([]),[people,setPeople]=useState<Record<string,any>>({}),[caseMap,setCaseMap]=useState<Record<string,any>>({}),[urls,setUrls]=useState<Record<string,string>>({});
 const [busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),[photo,setPhoto]=useState<File|null>(null);
 const [f,setF]=useState({caseId:"",name:"",aliases:"",lastSeen:"",location:"",details:"",physical:"",police:""});

 const load=async()=>{if(!organization)return;setError(null);
  const [r,c]=await Promise.all([
   supabase.from("missing_person_records").select("*").eq("organization_id",organization.id).order("updated_at",{ascending:false}),
   supabase.from("cases").select("id,case_number,title").eq("case_type","Missing Person").order("updated_at",{ascending:false})
  ]);
  if(r.error)setError(r.error.message); if(c.error)setError(c.error.message);
  const rr=r.data||[],cc=c.data||[];setRows(rr);setCases(cc);if(!f.caseId&&cc[0]?.id)setF(x=>({...x,caseId:cc[0].id}));
  const pids=[...new Set(rr.map((x:any)=>x.person_id))],cids=[...new Set(rr.map((x:any)=>x.case_id))],eids=[...new Set(rr.map((x:any)=>x.primary_photo_evidence_id).filter(Boolean))];
  if(pids.length){const {data:p}=await supabase.from("people").select("id,display_name,aliases").in("id",pids);setPeople(Object.fromEntries((p||[]).map((x:any)=>[x.id,x])))}else setPeople({});
  if(cids.length){const {data:k}=await supabase.from("cases").select("id,case_number,title").in("id",cids);setCaseMap(Object.fromEntries((k||[]).map((x:any)=>[x.id,x])))}else setCaseMap({});
  const u:Record<string,string>={};if(eids.length){const {data:e}=await supabase.from("evidence").select("id,storage_path").in("id",eids);for(const item of e||[]){if(item.storage_path){const {data:s}=await supabase.storage.from("wetrace-evidence").createSignedUrl(item.storage_path,900);if(s?.signedUrl)u[item.id]=s.signedUrl}}}setUrls(u);
 };
 useEffect(()=>{load()},[organization?.id]);

 const submit=async(e:FormEvent)=>{e.preventDefault();if(!organization||!user||!f.caseId)return;setBusy(true);setError(null);
  const {data:p,error:pe}=await supabase.from("people").insert({organization_id:organization.id,display_name:f.name,aliases:f.aliases.split(",").map(x=>x.trim()).filter(Boolean),sensitivity:"restricted",created_by:user.id}).select("id").single();
  if(pe||!p){setError(pe?.message||"Could not create person");setBusy(false);return}
  await supabase.from("case_people").insert({case_id:f.caseId,organization_id:organization.id,person_id:p.id,relationship:"missing_person",confidence:100});
  let evidenceId:string|null=null;
  if(photo){const path=f.caseId+"/"+crypto.randomUUID()+"-"+safeName(photo.name);const hash=await digest(photo);const up=await supabase.storage.from("wetrace-evidence").upload(path,photo,{contentType:photo.type||undefined});if(up.error){setError(up.error.message);setBusy(false);return}
   const {data:ev,error:ee}=await supabase.from("evidence").insert({organization_id:organization.id,case_id:f.caseId,evidence_type:"image",description:"Missing person photo — "+f.name,sensitivity:"restricted",storage_path:path,sha256:hash,collected_at:new Date().toISOString(),collected_by:user.id,custody_status:"received"}).select("id").single();if(ee||!ev){setError(ee?.message||"Could not register photo");setBusy(false);return}evidenceId=ev.id}
  const {data:mp,error:me}=await supabase.from("missing_person_records").insert({organization_id:organization.id,case_id:f.caseId,person_id:p.id,status:"missing",last_seen_at:f.lastSeen?new Date(f.lastSeen).toISOString():null,last_seen_location:f.location||null,last_seen_details:f.details||null,physical_description:f.physical||null,police_report_reference:f.police||null,primary_photo_evidence_id:evidenceId,created_by:user.id}).select("id").single();
  if(me||!mp){setError(me?.message||"Could not create registry record");setBusy(false);return}
  if(evidenceId)await supabase.from("missing_person_photos").insert({organization_id:organization.id,case_id:f.caseId,missing_person_id:mp.id,evidence_id:evidenceId,caption:"Primary photo",is_primary:true,created_by:user.id});
  setF(x=>({...x,name:"",aliases:"",lastSeen:"",location:"",details:"",physical:"",police:""}));setPhoto(null);setBusy(false);load();
 };

 return <AppShell title="Missing Persons" subtitle="Real missing-person records, private photos and last-seen data." actions={<div className="actions"><Link className="btn alt" href="/facial-comparison">Facial comparison</Link><Link className="btn" href="/cases/new">＋ Missing-person case</Link></div>}>
  {error&&<div className="alert error">{error}</div>}
  <section className="panel"><h2>Missing-person registry</h2><p>No sample people are inserted. Every card below is a real record stored in your workspace.</p>
   {rows.length?<div className="photoGrid">{rows.map(r=>{const p=people[r.person_id],c=caseMap[r.case_id],url=r.primary_photo_evidence_id?urls[r.primary_photo_evidence_id]:null;return <article className="photoCard" key={r.id}>{url?<img src={url} alt={p?.display_name||"Missing person"}/>:<div className="photoPlaceholder">NO PHOTO</div>}<div><strong>{p?.display_name||"Missing person"}</strong><small>{c?.case_number||"Case"} · {r.last_seen_location||"Last location unknown"}</small><p style={{fontSize:9,color:"#8ba4b4"}}>{r.last_seen_at?new Date(r.last_seen_at).toLocaleString():"Last-seen time unknown"}</p><Badge tone={r.status==="located"?"green":"red"}>{r.status}</Badge></div></article>})}</div>:<div className="empty">No real missing-person records yet.</div>}
  </section>
  <section className="panel"><h2>Register a missing person</h2><p>Creates the person, case link, registry record and optional primary photo together.</p>
   {cases.length?<form className="form" onSubmit={submit}><label>Case<select value={f.caseId} onChange={e=>setF({...f,caseId:e.target.value})}>{cases.map(c=><option value={c.id} key={c.id}>{c.case_number} · {c.title}</option>)}</select></label><label>Full name<input required value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></label><label>Aliases<input value={f.aliases} onChange={e=>setF({...f,aliases:e.target.value})}/></label><label>Primary photo<input type="file" accept="image/*" onChange={e=>setPhoto(e.target.files?.[0]||null)}/></label><label>Last seen<input type="datetime-local" value={f.lastSeen} onChange={e=>setF({...f,lastSeen:e.target.value})}/></label><label>Location<input value={f.location} onChange={e=>setF({...f,location:e.target.value})}/></label><label>Police/report reference<input value={f.police} onChange={e=>setF({...f,police:e.target.value})}/></label><label className="full">Physical description<textarea rows={3} value={f.physical} onChange={e=>setF({...f,physical:e.target.value})}/></label><label className="full">Last-seen details<textarea rows={4} value={f.details} onChange={e=>setF({...f,details:e.target.value})}/></label><div className="full"><button className="btn" disabled={busy}>{busy?"Creating…":"Create missing-person record"}</button></div></form>:<div className="empty">Create a case with type “Missing Person” first.</div>}
  </section>
 </AppShell>;
}
