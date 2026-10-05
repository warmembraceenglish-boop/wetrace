"use client";

import {useParams} from "next/navigation";
import {useEffect,useState} from "react";
import AppShell from "../../components/AppShell";
import Badge from "../../components/Badge";
import {useWorkspace} from "../../lib/useWorkspace";

type CredentialDocument={
  id:string;
  file_name:string;
  mime_type:string;
  file_data:string;
};

function byteaToObjectUrl(value:string,mime:string){
  if(!value)return null;

  try{
    if(value.startsWith("\\x")){
      const hex=value.slice(2);
      const bytes=new Uint8Array(Math.floor(hex.length/2));
      for(let i=0;i<bytes.length;i++){
        bytes[i]=parseInt(hex.slice(i*2,i*2+2),16);
      }
      return URL.createObjectURL(new Blob([bytes],{type:mime}));
    }

    const binary=atob(value);
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes],{type:mime}));
  }catch{
    return null;
  }
}

export default function CredentialViewer(){
 const {id}=useParams<{id:string}>();
 const {supabase}=useWorkspace();
 const [cred,setCred]=useState<any>(null);
 const [url,setUrl]=useState<string|null>(null);
 const [kind,setKind]=useState("other");
 const [documentName,setDocumentName]=useState<string|null>(null);
 const [error,setError]=useState<string|null>(null);

 useEffect(()=>{
   if(!id)return;

   let objectUrl:string|null=null;
   let cancelled=false;

   (async()=>{
     setError(null);

     const [{data,error},{data:documents,error:docError}]=await Promise.all([
       supabase.from("investigator_credentials").select("*").eq("id",id).maybeSingle(),
       supabase.from("investigator_credential_documents")
         .select("id,file_name,mime_type,file_data")
         .eq("credential_id",id)
         .order("created_at",{ascending:true})
     ]);

     if(cancelled)return;

     if(error||!data){
       setError(error?.message||"Credential not found or access denied.");
       return;
     }

     setCred(data);

     const doc=(documents?.[0] as CredentialDocument|undefined);

     if(docError){
       setError(docError.message);
     }else if(doc){
       objectUrl=byteaToObjectUrl(doc.file_data,doc.mime_type);
       if(objectUrl){
         setUrl(objectUrl);
         setDocumentName(doc.file_name);
         setKind(doc.mime_type.startsWith("image/")?"image":doc.mime_type==="application/pdf"?"pdf":"other");
         return;
       }
       setError("The credential record is available, but its attached document could not be rendered.");
     }

     if(data.document_path){
       const {data:s,error:sErr}=await supabase.storage
         .from("wetrace-credentials")
         .createSignedUrl(data.document_path,600);

       if(cancelled)return;

       if(sErr){
         setError(sErr.message);
       }else{
         setUrl(s?.signedUrl||null);
         setDocumentName(data.document_path.split("/").pop()||"Credential document");
         const ext=data.document_path.split(".").pop()?.toLowerCase();
         setKind(["jpg","jpeg","png"].includes(ext)?"image":ext==="pdf"?"pdf":"other");
       }
     }
   })();

   return ()=>{
     cancelled=true;
     if(objectUrl)URL.revokeObjectURL(objectUrl);
   };
 },[id,supabase]);

 return <AppShell title={cred?.credential_name||"Credential Viewer"} subtitle="Private in-platform credential viewer.">
   {error&&<div className="inlineAlert error">{error}</div>}

   {cred&&<div className="viewerLayout">
     <section className="panel inPlatformViewer">
       <div className="viewerTop">
         <div>
           <strong>{cred.credential_name}</strong>
           <small>{documentName||cred.issuing_authority||"Credential document"}</small>
         </div>
         <Badge tone={cred.verification_status==="verified"?"green":"amber"}>{cred.verification_status}</Badge>
       </div>

       <div className="viewerStage">
         {url
           ?kind==="image"
             ?<img src={url} alt={cred.credential_name}/>
             :<iframe src={url} title={cred.credential_name}/>
           :<div className="emptyState"><strong>No document attached</strong><p>This credential contains metadata only.</p></div>}
       </div>
     </section>

     <aside className="panel evidenceMeta">
       <h2>Credential details</h2>
       <div className="profileDetail"><small>Type</small><strong>{cred.credential_type}</strong></div>
       <div className="profileDetail"><small>Number</small><strong>{cred.credential_number||"—"}</strong></div>
       <div className="profileDetail"><small>Issuer</small><strong>{cred.issuing_authority||"—"}</strong></div>
       <div className="profileDetail"><small>Jurisdiction printed on credential</small><strong>{cred.jurisdiction||"—"}</strong></div>
       <div className="profileDetail"><small>Issued</small><strong>{cred.issued_on||"—"}</strong></div>
       <div className="profileDetail"><small>Expires</small><strong>{cred.expires_on||"No date recorded"}</strong></div>
       <div className="profileDetail"><small>Verification</small><strong>{cred.verification_status}</strong></div>
       {cred.credential_notes&&<div className="formNotice"><strong>Verification note</strong><p>{cred.credential_notes}</p></div>}
     </aside>
   </div>}
 </AppShell>;
}