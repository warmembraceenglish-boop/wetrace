"use client";

import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import JSZip from "jszip";
import Badge from "./Badge";
import {useWorkspace} from "../lib/useWorkspace";

type EvidenceRow={
  id:string;
  case_id:string;
  evidence_number:string;
  evidence_type:string;
  description:string|null;
  media_caption:string|null;
  sensitivity:string;
  storage_path:string|null;
  sha256:string|null;
  original_file_name:string|null;
  mime_type:string|null;
  file_size_bytes:number|null;
  source_url:string|null;
  source_agency:string|null;
  source_reference:string|null;
  captured_at:string|null;
  collected_at:string|null;
  custody_status:string;
  is_case_cover:boolean;
  downloadable:boolean;
  created_at:string;
};

function safeName(name:string){
  return name.replace(/[^a-zA-Z0-9._-]+/g,"_").replace(/^_+|_+$/g,"").slice(0,120)||"wetrace-case";
}

function extFromPath(path:string|null){
  return path?.split(".").pop()?.toLowerCase()||"";
}

function mediaKind(e:EvidenceRow){
  if(e.evidence_type==="image"||e.mime_type?.startsWith("image/"))return "image";
  if(e.evidence_type==="video"||e.mime_type?.startsWith("video/"))return "video";
  if(e.evidence_type==="audio"||e.mime_type?.startsWith("audio/"))return "audio";
  const ext=extFromPath(e.storage_path);
  if(["jpg","jpeg","png","gif","webp","heic"].includes(ext))return "image";
  if(["mp4","webm","mov","m4v"].includes(ext))return "video";
  if(["mp3","wav","m4a","ogg"].includes(ext))return "audio";
  return "file";
}

function formatBytes(value:number|null){
  if(value==null)return "—";
  if(value<1024)return value+" B";
  if(value<1024*1024)return (value/1024).toFixed(1)+" KB";
  return (value/(1024*1024)).toFixed(1)+" MB";
}

function triggerBlobDownload(blob:Blob,fileName:string){
  const objectUrl=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=objectUrl;
  a.download=fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);
}

export default function CaseEvidenceCenter({
  rows,
  caseId,
  organizationId,
  caseNumber,
  caseTitle,
  mode,
  onReload
}:{
  rows:EvidenceRow[];
  caseId:string;
  organizationId:string;
  caseNumber:string;
  caseTitle:string;
  mode:"media"|"downloads";
  onReload:()=>void;
}){
 const {supabase,user}=useWorkspace();
 const [urls,setUrls]=useState<Record<string,string>>({});
 const [busyId,setBusyId]=useState<string|null>(null);
 const [packaging,setPackaging]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const [notice,setNotice]=useState<string|null>(null);

 const counts=useMemo(()=>({
   photos:rows.filter(r=>mediaKind(r)==="image").length,
   videos:rows.filter(r=>mediaKind(r)==="video").length,
   audio:rows.filter(r=>mediaKind(r)==="audio").length,
   stored:rows.filter(r=>!!r.storage_path).length,
   sourceOnly:rows.filter(r=>!r.storage_path&&!!r.source_url).length,
   hashed:rows.filter(r=>!!r.sha256).length
 }),[rows]);

 useEffect(()=>{
   let cancelled=false;
   (async()=>{
     const entries=await Promise.all(rows
       .filter(r=>r.storage_path&&["image","video","audio"].includes(mediaKind(r)))
       .map(async r=>{
         const {data,error}=await supabase.storage
           .from("wetrace-evidence")
           .createSignedUrl(r.storage_path!,900);
         return [r.id,error?null:data?.signedUrl||null] as const;
       }));

     if(cancelled)return;
     setUrls(Object.fromEntries(entries.filter(([,url])=>!!url)) as Record<string,string>);
   })();

   return ()=>{cancelled=true;};
 },[rows,supabase]);

 const logAccess=async(action:"view"|"download"|"export_package",evidenceId:string|null,details:Record<string,unknown>={})=>{
   if(!user)return;
   await supabase.from("evidence_access_events").insert({
     organization_id:organizationId,
     case_id:caseId,
     evidence_id:evidenceId,
     user_id:user.id,
     action,
     details
   });
 };

 const downloadOne=async(row:EvidenceRow)=>{
   if(!row.storage_path||!row.downloadable)return;
   setBusyId(row.id);setError(null);setNotice(null);

   const {data,error}=await supabase.storage
     .from("wetrace-evidence")
     .download(row.storage_path);

   if(error||!data){
     setError(error?.message||"Could not download evidence.");
     setBusyId(null);
     return;
   }

   const name=row.original_file_name||row.storage_path.split("/").pop()||row.evidence_number;
   triggerBlobDownload(data,name);
   await logAccess("download",row.id,{file_name:name,sha256:row.sha256});
   setBusyId(null);
 };

 const exportPackage=async()=>{
   const stored=rows.filter(r=>r.storage_path&&r.downloadable);
   if(!stored.length){
     setError("There are no stored evidence files available for export.");
     return;
   }

   setPackaging(true);setError(null);setNotice(null);

   try{
     const zip=new JSZip();
     const folder=zip.folder("evidence");
     const manifest={
       exported_at:new Date().toISOString(),
       case_id:caseId,
       case_number:caseNumber,
       case_title:caseTitle,
       evidence_count:rows.length,
       stored_file_count:stored.length,
       records:rows.map(r=>({
         evidence_number:r.evidence_number,
         type:r.evidence_type,
         description:r.description,
         caption:r.media_caption,
         sensitivity:r.sensitivity,
         original_file_name:r.original_file_name,
         mime_type:r.mime_type,
         file_size_bytes:r.file_size_bytes,
         sha256:r.sha256,
         source_agency:r.source_agency,
         source_reference:r.source_reference,
         source_url:r.source_url,
         captured_at:r.captured_at,
         collected_at:r.collected_at,
         custody_status:r.custody_status,
         is_case_cover:r.is_case_cover,
         stored_in_package:!!r.storage_path&&r.downloadable
       }))
     };

     zip.file("manifest.json",JSON.stringify(manifest,null,2));

     const ids=rows.map(r=>r.id);
     if(ids.length){
       const {data:custody}=await supabase
         .from("evidence_custody_events")
         .select("*")
         .in("evidence_id",ids)
         .order("occurred_at",{ascending:true});
       zip.file("chain-of-custody.json",JSON.stringify(custody||[],null,2));
     }

     const failures:string[]=[];

     for(const row of stored){
       const {data,error}=await supabase.storage
         .from("wetrace-evidence")
         .download(row.storage_path!);

       if(error||!data){
         failures.push(row.evidence_number);
         continue;
       }

       const fileName=safeName(row.evidence_number+"-"+(row.original_file_name||row.storage_path!.split("/").pop()||"evidence"));
       folder?.file(fileName,await data.arrayBuffer());
     }

     if(failures.length){
       zip.file("export-warnings.txt","The following evidence files could not be included:\n"+failures.join("\n"));
     }

     const blob=await zip.generateAsync({type:"blob",compression:"DEFLATE",compressionOptions:{level:6}});
     triggerBlobDownload(blob,safeName(caseNumber+"-"+caseTitle)+"-evidence.zip");
     await logAccess("export_package",null,{stored_file_count:stored.length,failed_files:failures});
     setNotice(failures.length
       ?"Evidence package created with "+failures.length+" file warning(s). See export-warnings.txt."
       :"Evidence package created with manifest and chain-of-custody export.");
   }catch(err:any){
     setError(err?.message||"Could not create the evidence package.");
   }finally{
     setPackaging(false);
   }
 };

 const setCover=async(row:EvidenceRow)=>{
   if(mediaKind(row)!=="image")return;
   setBusyId(row.id);setError(null);
   const first=await supabase.from("evidence").update({is_case_cover:false}).eq("case_id",caseId).eq("is_case_cover",true);
   if(first.error){setError(first.error.message);setBusyId(null);return;}
   const second=await supabase.from("evidence").update({is_case_cover:true}).eq("id",row.id);
   if(second.error)setError(second.error.message);
   else onReload();
   setBusyId(null);
 };

 if(mode==="downloads"){
   return <>
     {error&&<div className="inlineAlert error">{error}</div>}
     {notice&&<div className="inlineAlert success">{notice}</div>}

     <section className="kpiGrid evidenceKpis">
       <article className="kpi"><div className="kpiTop"><span>Stored files</span><i>⬇</i></div><strong>{counts.stored}</strong><small>Private vault files</small></article>
       <article className="kpi"><div className="kpiTop"><span>Hashed</span><i>#</i></div><strong>{counts.hashed}</strong><small>SHA-256 recorded</small></article>
       <article className="kpi"><div className="kpiTop"><span>Source only</span><i>↗</i></div><strong>{counts.sourceOnly}</strong><small>Reference without stored file</small></article>
       <article className="kpi"><div className="kpiTop"><span>Total records</span><i>▤</i></div><strong>{rows.length}</strong><small>Visible evidence entries</small></article>
     </section>

     <section className="panel">
       <div className="panelHead">
         <div><h2>Evidence Downloads</h2><p>Download individual authorized files or export the complete accessible vault package.</p></div>
         <button className="primaryBtn inlineBtn" disabled={packaging||counts.stored===0} onClick={exportPackage}>{packaging?"Building package…":"⬇ Download evidence package"}</button>
       </div>

       <div className="formNotice">
         <strong>Package contents</strong>
         <p>The ZIP includes accessible evidence files, a case manifest with SHA-256 hashes and provenance fields, plus exported chain-of-custody events. Restricted items remain subject to your case permissions.</p>
       </div>

       {rows.length?<div className="evidenceDownloadList">{rows.map(row=><article className="evidenceDownloadRow" key={row.id}>
         <div className="fileIcon">{row.evidence_type.slice(0,3).toUpperCase()}</div>
         <div className="evidenceDownloadMeta">
           <strong>{row.evidence_number} · {row.description||row.original_file_name||row.evidence_type}</strong>
           <small>{row.original_file_name||"Source record"} · {formatBytes(row.file_size_bytes)} · {row.sha256?"SHA-256 "+row.sha256.slice(0,16)+"…":"No stored hash"}</small>
         </div>
         <div className="credentialActions">
           <Link href={"/evidence/"+row.id} className="textBtn">View</Link>
           {row.storage_path&&row.downloadable
             ?<button className="textBtn" disabled={busyId===row.id} onClick={()=>downloadOne(row)}>{busyId===row.id?"Downloading…":"Download"}</button>
             :<Badge tone="blue">Source only</Badge>}
         </div>
       </article>)}</div>:<div className="emptyState"><strong>No evidence files yet</strong><p>Upload photos, videos, audio, documents, or digital evidence from the Evidence tab.</p></div>}
     </section>
   </>;
 }

 const media=rows.filter(r=>["image","video","audio"].includes(mediaKind(r)));
 const mediaReady=counts.photos>0&&counts.videos>0;

 return <>
   {error&&<div className="inlineAlert error">{error}</div>}

   <section className="kpiGrid evidenceKpis">
     <article className="kpi"><div className="kpiTop"><span>Photos</span><i>▧</i></div><strong>{counts.photos}</strong><small>Case images</small></article>
     <article className="kpi"><div className="kpiTop"><span>Videos</span><i>▶</i></div><strong>{counts.videos}</strong><small>Case video</small></article>
     <article className="kpi"><div className="kpiTop"><span>Audio</span><i>♫</i></div><strong>{counts.audio}</strong><small>Recorded audio</small></article>
     <article className="kpi"><div className="kpiTop"><span>Media readiness</span><i>◆</i></div><strong className="readinessText">{mediaReady?"READY":"INCOMPLETE"}</strong><small>{mediaReady?"Photo + video on file":"Add real photo and video evidence"}</small></article>
   </section>

   <section className="panel">
     <div className="panelHead"><div><h2>Case Media Gallery</h2><p>Photos, video and audio stored in the private evidence vault or registered as lawful source references.</p></div></div>

     {media.length?<div className="mediaGallery">{media.map(row=>{
       const kind=mediaKind(row);
       const src=urls[row.id]||(kind==="image"&&row.source_url?row.source_url:undefined);

       return <article className={row.is_case_cover?"mediaCard coverMedia":"mediaCard"} key={row.id}>
         <div className="mediaStage">
           {src&&kind==="image"&&<img src={src} alt={row.media_caption||row.description||row.evidence_number}/>}
           {src&&kind==="video"&&<video src={src} controls playsInline preload="metadata"/>}
           {src&&kind==="audio"&&<audio src={src} controls/>}
           {!src&&<div className="mediaPlaceholder"><strong>{row.storage_path?"Secured media":"SOURCE ONLY"}</strong><span>{row.source_agency||row.source_url||"File preview unavailable"}</span></div>}
           {row.is_case_cover&&<span className="coverFlag">CASE COVER</span>}
         </div>

         <div className="mediaCardBody">
           <strong>{row.evidence_number} · {row.description||row.evidence_type}</strong>
           <p>{row.media_caption||"No media caption entered."}</p>
           <small>{row.source_agency||"WETrace evidence vault"}{row.source_reference?" · "+row.source_reference:""}</small>
           <div className="mediaActions">
             <Link href={"/evidence/"+row.id} className="textBtn">Open evidence</Link>
             {kind==="image"&&!row.is_case_cover&&<button className="textBtn" disabled={busyId===row.id} onClick={()=>setCover(row)}>Set case cover</button>}
             {row.storage_path&&<button className="textBtn" disabled={busyId===row.id} onClick={()=>downloadOne(row)}>Download</button>}
           </div>
         </div>
       </article>;
     })}</div>:<div className="emptyState"><strong>No case media yet</strong><p>Upload real photos or videos from the Evidence tab. WETrace will not generate or substitute fake evidence imagery.</p></div>}
   </section>
 </>;
}