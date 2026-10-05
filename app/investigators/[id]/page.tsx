"use client";

import Link from "next/link";
import {FormEvent,useEffect,useState} from "react";
import {useParams} from "next/navigation";
import AppShell from "../../components/AppShell";
import Badge from "../../components/Badge";
import {useWorkspace} from "../../lib/useWorkspace";

function safeName(name:string){
  return name.replace(/[^a-zA-Z0-9._-]+/g,"_").slice(-120);
}

export default function InvestigatorProfile(){
 const {id}=useParams<{id:string}>();
 const {supabase,user,organization,membership}=useWorkspace();

 const [profile,setProfile]=useState<any>(null);
 const [inv,setInv]=useState<any>(null);
 const [credentials,setCredentials]=useState<any[]>([]);
 const [loading,setLoading]=useState(true);
 const [editing,setEditing]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState<string|null>(null);

 const [form,setForm]=useState({
   bio:"",
   experience:"",
   specialties:"",
   languages:"",
   countries:"",
   availability:"available"
 });

 const [cred,setCred]=useState({
   type:"certificate",
   name:"",
   issuer:"",
   number:"",
   jurisdiction:"",
   issued:"",
   expires:""
 });

 const [file,setFile]=useState<File|null>(null);

 const canEdit=user?.id===id||["owner","admin"].includes(membership?.organization_role||"");
 const canVerify=user?.id!==id&&["owner","admin"].includes(membership?.organization_role||"");

 const load=async()=>{
   if(!id)return;

   setLoading(true);

   const [{data:p,error:pErr},{data:i},{data:c}]=await Promise.all([
     supabase.from("profiles").select("id,display_name,email,global_role").eq("id",id).maybeSingle(),
     supabase.from("investigator_profiles").select("*").eq("user_id",id).maybeSingle(),
     supabase.from("investigator_credentials").select("*").eq("investigator_user_id",id).order("created_at",{ascending:false})
   ]);

   if(pErr||!p){
     setError(pErr?.message||"Profile not found or access denied.");
     setLoading(false);
     return;
   }

   setProfile(p);
   setInv(i||null);
   setCredentials(c||[]);
   setForm({
     bio:i?.professional_bio||"",
     experience:i?.years_experience?.toString()||"",
     specialties:(i?.specialties||[]).join(", "),
     languages:(i?.languages||[]).join(", "),
     countries:(i?.service_countries||[]).join(", "),
     availability:i?.availability||"available"
   });
   setLoading(false);
 };

 useEffect(()=>{load();},[id]);

 const saveProfile=async(e:FormEvent)=>{
   e.preventDefault();
   if(!organization||!id)return;

   setBusy(true);
   setError(null);

   const payload={
     user_id:id,
     organization_id:organization.id,
     professional_bio:form.bio||null,
     years_experience:form.experience?Number(form.experience):null,
     specialties:form.specialties.split(",").map(x=>x.trim()).filter(Boolean),
     languages:form.languages.split(",").map(x=>x.trim()).filter(Boolean),
     service_countries:form.countries.split(",").map(x=>x.trim()).filter(Boolean),
     availability:form.availability,
     public_directory_enabled:false,
     updated_at:new Date().toISOString()
   };

   const {error}=await supabase
     .from("investigator_profiles")
     .upsert(payload,{onConflict:"user_id"});

   setBusy(false);

   if(error){
     setError(error.message);
     return;
   }

   setEditing(false);
   load();
 };

 const addCredential=async(e:FormEvent)=>{
   e.preventDefault();
   if(!organization||!id)return;

   setBusy(true);
   setError(null);

   let path:string|null=null;

   if(file){
     path=id+"/"+crypto.randomUUID()+"-"+safeName(file.name);
     const {error:upErr}=await supabase.storage
       .from("wetrace-credentials")
       .upload(path,file,{contentType:file.type||undefined});

     if(upErr){
       setError(upErr.message);
       setBusy(false);
       return;
     }
   }

   const {error}=await supabase.from("investigator_credentials").insert({
     organization_id:organization.id,
     investigator_user_id:id,
     credential_type:cred.type,
     credential_name:cred.name,
     issuing_authority:cred.issuer||null,
     credential_number:cred.number||null,
     jurisdiction:cred.jurisdiction||null,
     issued_on:cred.issued||null,
     expires_on:cred.expires||null,
     verification_status:"pending",
     document_path:path
   });

   if(error){
     if(path)await supabase.storage.from("wetrace-credentials").remove([path]);
     setError(error.message);
     setBusy(false);
     return;
   }

   setCred({
     type:"certificate",
     name:"",
     issuer:"",
     number:"",
     jurisdiction:"",
     issued:"",
     expires:""
   });
   setFile(null);
   setBusy(false);
   load();
 };

 const verify=async(credentialId:string)=>{
   if(!user)return;

   const {error}=await supabase
     .from("investigator_credentials")
     .update({
       verification_status:"verified",
       verified_by:user.id,
       verified_at:new Date().toISOString()
     })
     .eq("id",credentialId);

   if(error)setError(error.message);
   else load();
 };

 if(loading){
   return <AppShell title="Investigator" subtitle="Loading real profile…"><section className="panel">Loading…</section></AppShell>;
 }

 if(error&&!profile){
   return <AppShell title="Investigator unavailable"><section className="panel"><div className="inlineAlert error">{error}</div></section></AppShell>;
 }

 const name=profile?.display_name||profile?.email||"Investigator";
 const initials=name.split(/\s+/).map((x:string)=>x[0]).join("").slice(0,2).toUpperCase();

 return <AppShell
   title={name}
   subtitle={(profile?.global_role||"investigator").replaceAll("_"," ")}
   actions={canEdit?<button className="primaryBtn inlineBtn" onClick={()=>setEditing(v=>!v)}>{editing?"Close editor":"Edit profile"}</button>:undefined}
 >
   {error&&<div className="inlineAlert error">{error}</div>}

   <div className="profileLayout">
    <section className="panel profileSummary">
      <div className="profilePortrait">{initials}</div>
      <h2>{name}</h2>
      <p>{profile?.email}</p>
      <Badge tone={inv?.availability==="available"?"green":"amber"}>{inv?.availability||"No profile"}</Badge>
      <div className="profileDetail"><small>Service region</small><strong>{inv?.service_countries?.join(" · ")||"—"}</strong></div>
      <div className="profileDetail"><small>Experience</small><strong>{inv?.years_experience??"—"} years</strong></div>
      <div className="profileDetail"><small>Languages</small><strong>{inv?.languages?.join(" · ")||"—"}</strong></div>
    </section>

    <div>
     {editing&&canEdit&&<section className="panel">
       <div className="panelHead"><div><h2>Edit professional profile</h2><p>Profile details are stored live in WETrace.</p></div></div>
       <form className="formGrid" onSubmit={saveProfile}>
         <label>Years experience<input type="number" min="0" value={form.experience} onChange={e=>setForm({...form,experience:e.target.value})}/></label>
         <label>Availability<select value={form.availability} onChange={e=>setForm({...form,availability:e.target.value})}><option value="available">Available</option><option value="limited">Limited</option><option value="unavailable">Unavailable</option></select></label>
         <label>Specialties<input value={form.specialties} onChange={e=>setForm({...form,specialties:e.target.value})} placeholder="Missing persons, fraud, records"/></label>
         <label>Languages<input value={form.languages} onChange={e=>setForm({...form,languages:e.target.value})}/></label>
         <label className="full">Service countries<input value={form.countries} onChange={e=>setForm({...form,countries:e.target.value})}/></label>
         <label className="full">Professional bio<textarea rows={4} value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})}/></label>
         <div className="formActions full"><button className="primaryBtn inlineBtn" disabled={busy}>{busy?"Saving…":"Save profile"}</button></div>
       </form>
     </section>}

     <section className="panel">
       <div className="panelHead"><div><h2>Professional specialties</h2><p>Self-entered profile information.</p></div></div>
       <div className="specialtyWrap">{inv?.specialties?.length?inv.specialties.map((s:string)=><span key={s}>{s}</span>):<span>No specialties entered</span>}</div>
       <p className="profileBio">{inv?.professional_bio||"No professional bio entered."}</p>
     </section>

     <section className="panel credentialPanel">
       <div className="panelHead"><div><h2>Licenses & certificates</h2><p>Credentials are not treated as verified until another authorized owner/admin verifies them.</p></div></div>

       {canEdit&&<form className="credentialForm" onSubmit={addCredential}>
         <div className="formGrid">
           <label>Type<select value={cred.type} onChange={e=>setCred({...cred,type:e.target.value})}><option value="license">License</option><option value="certificate">Certificate</option><option value="training">Training</option><option value="membership">Professional membership</option></select></label>
           <label>Name<input required value={cred.name} onChange={e=>setCred({...cred,name:e.target.value})}/></label>
           <label>Issuer<input value={cred.issuer} onChange={e=>setCred({...cred,issuer:e.target.value})}/></label>
           <label>Credential number<input value={cred.number} onChange={e=>setCred({...cred,number:e.target.value})}/></label>
           <label>Jurisdiction<input value={cred.jurisdiction} onChange={e=>setCred({...cred,jurisdiction:e.target.value})}/></label>
           <label>Document<input type="file" accept=".pdf,image/jpeg,image/png" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
           <label>Issued<input type="date" value={cred.issued} onChange={e=>setCred({...cred,issued:e.target.value})}/></label>
           <label>Expires<input type="date" value={cred.expires} onChange={e=>setCred({...cred,expires:e.target.value})}/></label>
         </div>
         <div className="formActions"><button className="primaryBtn inlineBtn" disabled={busy}>{busy?"Adding…":"＋ Add credential"}</button></div>
       </form>}

       {credentials.length
         ?<div className="credentialTable">{credentials.map(c=><div className="credentialRow" key={c.id}>
           <div className="credentialSeal">{c.verification_status==="verified"?"✓":"?"}</div>
           <div><strong>{c.credential_name}</strong><small>{c.issuing_authority||"Issuer not entered"} · {c.jurisdiction||"No jurisdiction"}{c.credential_notes?" · User-submitted documentation":""}</small></div>
           <div><small>Expires</small><strong>{c.expires_on||"—"}</strong></div>
           <div className="credentialActions">
             <Link href={"/credentials/"+c.id} className="textBtn">View inside WETrace</Link>
             <Badge tone={c.verification_status==="verified"?"green":"amber"}>{c.verification_status}</Badge>
             {canVerify&&c.verification_status!=="verified"&&<button className="textBtn" onClick={()=>verify(c.id)}>Verify</button>}
           </div>
         </div>)}</div>
         :<div className="emptyState"><strong>No credentials added yet</strong><p>Add only credentials you can document. WETrace does not auto-verify self-entered claims.</p></div>}
     </section>
    </div>
   </div>
 </AppShell>;
}