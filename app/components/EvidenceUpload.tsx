"use client";

import {FormEvent,useState} from "react";
import {useWorkspace} from "../lib/useWorkspace";

function safeName(name:string){
  return name.replace(/[^a-zA-Z0-9._-]+/g,"_").slice(-120);
}

function inferType(file:File){
  if(file.type.startsWith("image/"))return "image";
  if(file.type.startsWith("video/"))return "video";
  if(file.type.startsWith("audio/"))return "audio";
  if(file.type==="application/pdf")return "document";
  return "digital";
}

async function sha256(file:File){
  const data=await file.arrayBuffer();
  const hash=await crypto.subtle.digest("SHA-256",data);
  return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

export default function EvidenceUpload({
  caseId,
  organizationId,
  onUploaded
}:{
  caseId:string;
  organizationId:string;
  onUploaded:()=>void;
}){
 const {supabase,user}=useWorkspace();
 const [file,setFile]=useState<File|null>(null);
 const [type,setType]=useState("document");
 const [description,setDescription]=useState("");
 const [caption,setCaption]=useState("");
 const [sourceUrl,setSourceUrl]=useState("");
 const [sourceAgency,setSourceAgency]=useState("");
 const [sourceReference,setSourceReference]=useState("");
 const [capturedAt,setCapturedAt]=useState("");
 const [isCover,setIsCover]=useState(false);
 const [sensitivity,setSensitivity]=useState("standard");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState<string|null>(null);

 const chooseFile=(next:File|null)=>{
   setFile(next);
   if(next)setType(inferType(next));
 };

 const submit=async(e:FormEvent)=>{
   e.preventDefault();
   if(!user)return;
   if(!file&&!sourceUrl.trim()){
     setError("Add a file or a lawful source URL.");
     return;
   }

   setBusy(true);
   setError(null);

   let path:string|null=null;
   let digest:string|null=null;

   if(file){
     path=caseId+"/"+crypto.randomUUID()+"-"+safeName(file.name);
     digest=await sha256(file);

     const {error:upErr}=await supabase.storage
       .from("wetrace-evidence")
       .upload(path,file,{upsert:false,contentType:file.type||undefined});

     if(upErr){
       setError(upErr.message);
       setBusy(false);
       return;
     }
   }

   if(isCover&&type==="image"){
     await supabase
       .from("evidence")
       .update({is_case_cover:false})
       .eq("case_id",caseId)
       .eq("is_case_cover",true);
   }

   const {data:ev,error:evErr}=await supabase
     .from("evidence")
     .insert({
       organization_id:organizationId,
       case_id:caseId,
       evidence_type:type,
       description:description.trim()||file?.name||caption.trim()||"Source evidence",
       media_caption:caption.trim()||null,
       sensitivity,
       storage_path:path,
       sha256:digest,
       original_file_name:file?.name||null,
       mime_type:file?.type||null,
       file_size_bytes:file?.size||null,
       source_url:sourceUrl.trim()||null,
       source_agency:sourceAgency.trim()||null,
       source_reference:sourceReference.trim()||null,
       captured_at:capturedAt?new Date(capturedAt).toISOString():null,
       is_case_cover:type==="image"&&isCover,
       downloadable:!!file,
       collected_at:new Date().toISOString(),
       collected_by:user.id,
       custody_status:"received"
     })
     .select("id")
     .single();

   if(evErr||!ev){
     if(path)await supabase.storage.from("wetrace-evidence").remove([path]);
     setError(evErr?.message||"Could not register evidence.");
     setBusy(false);
     return;
   }

   if(file){
     const {error:cErr}=await supabase
       .from("evidence_custody_events")
       .insert({
         organization_id:organizationId,
         case_id:caseId,
         evidence_id:ev.id,
         event_type:"received",
         actor_user_id:user.id,
         from_party:"Uploader",
         to_party:"WETrace Evidence Vault",
         location:"Private storage",
         notes:"Initial upload; SHA-256 recorded"
       });

     if(cErr){
       setError("Evidence uploaded, but custody event needs attention: "+cErr.message);
     }
   }

   setFile(null);
   setDescription("");
   setCaption("");
   setSourceUrl("");
   setSourceAgency("");
   setSourceReference("");
   setCapturedAt("");
   setIsCover(false);
   setSensitivity("standard");
   setType("document");
   setBusy(false);
   onUploaded();
 };

 return <form className="evidenceUploader" onSubmit={submit}>
   <div className="formSectionHead">
     <h3>Add evidence or media</h3>
     <p>Upload a file to the private evidence vault, or register a lawful external source when you do not yet possess the file.</p>
   </div>

   {error&&<div className="inlineAlert error">{error}</div>}

   <div className="formGrid">
    <label>Evidence file
      <input type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.csv,.zip" onChange={e=>chooseFile(e.target.files?.[0]||null)}/>
    </label>

    <label>Type
      <select value={type} onChange={e=>setType(e.target.value)}>
        <option value="document">Document</option>
        <option value="image">Photo / image</option>
        <option value="video">Video</option>
        <option value="audio">Audio</option>
        <option value="digital">Digital file</option>
        <option value="other">Other</option>
      </select>
    </label>

    <label>Description<input value={description} onChange={e=>setDescription(e.target.value)} placeholder="What is this item?"/></label>

    <label>Sensitivity
      <select value={sensitivity} onChange={e=>setSensitivity(e.target.value)}>
        <option value="standard">Standard</option>
        <option value="restricted">Restricted</option>
        <option value="biometric">Biometric — enhanced permission</option>
        <option value="genetic">Genetic — enhanced permission</option>
      </select>
    </label>

    <label className="full">Caption / investigative note<input value={caption} onChange={e=>setCaption(e.target.value)} placeholder="What is shown or heard? Keep interpretation separate from confirmed facts."/></label>

    <label>Captured / created time<input type="datetime-local" value={capturedAt} onChange={e=>setCapturedAt(e.target.value)}/></label>
    <label>Source agency / owner<input value={sourceAgency} onChange={e=>setSourceAgency(e.target.value)} placeholder="Police, court, witness, archive…"/></label>

    <label>Source reference<input value={sourceReference} onChange={e=>setSourceReference(e.target.value)} placeholder="Evidence ref, exhibit no., case ref…"/></label>
    <label>Source URL<input type="url" value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)} placeholder="https://official-source.example/..."/></label>

    {type==="image"&&<label className="checkboxLine full">
      <input type="checkbox" checked={isCover} onChange={e=>setIsCover(e.target.checked)}/>
      <span>Use this image as the case cover photo</span>
    </label>}
   </div>

   <div className="formNotice">
     <strong>Integrity</strong>
     <p>Uploaded files receive a SHA-256 hash and remain in the private case bucket. Source-only records are clearly marked as not yet stored in the vault.</p>
   </div>

   <div className="formActions">
     <button className="primaryBtn inlineBtn" disabled={busy||(!file&&!sourceUrl.trim())}>{busy?"Securing evidence…":"Add to case file"}</button>
   </div>
 </form>;
}