"use client";

import Link from "next/link";
import {useParams} from "next/navigation";
import {useEffect,useState} from "react";
import AppShell from "../../components/AppShell";
import Badge from "../../components/Badge";
import {useWorkspace} from "../../lib/useWorkspace";

type Evidence={
  id:string;
  case_id:string;
  evidence_number:string;
  evidence_type:string;
  description:string|null;
  sensitivity:string;
  custody_status:string;
  storage_path:string|null;
  source_url:string|null;
  source_agency:string|null;
  source_reference:string|null;
  original_file_name:string|null;
  mime_type:string|null;
  sha256:string|null;
  collected_at:string|null;
  created_at:string;
};

type Custody={
  id:string;
  event_type:string;
  occurred_at:string;
  from_party:string|null;
  to_party:string|null;
  location:string|null;
  notes:string|null;
};

export default function EvidenceViewer(){
 const {id}=useParams<{id:string}>();
 const {supabase}=useWorkspace();
 const [item,setItem]=useState<Evidence|null>(null);
 const [custody,setCustody]=useState<Custody[]>([]);
 const [url,setUrl]=useState<string|null>(null);
 const [kind,setKind]=useState<"image"|"pdf"|"video"|"audio"|"other">("other");
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState<string|null>(null);

 useEffect(()=>{
   if(!id)return;

   (async()=>{
     setLoading(true);

     const {data:e,error:eErr}=await supabase
       .from("evidence")
       .select("id,case_id,evidence_number,evidence_type,description,sensitivity,custody_status,storage_path,source_url,source_agency,source_reference,original_file_name,mime_type,sha256,collected_at,created_at")
       .eq("id",id)
       .maybeSingle();

     if(eErr||!e){
       setError(eErr?.message||"Evidence not found or access denied.");
       setLoading(false);
       return;
     }

     setItem(e as Evidence);

     const {data:c}=await supabase
       .from("evidence_custody_events")
       .select("id,event_type,occurred_at,from_party,to_party,location,notes")
       .eq("evidence_id",id)
       .order("occurred_at",{ascending:false});

     setCustody((c as Custody[])||[]);

     const detectKind=(name:string)=>{
       const ext=name.split(".").pop()?.toLowerCase()||"";
       if(["jpg","jpeg","png","gif","webp"].includes(ext))return "image" as const;
       if(ext==="pdf")return "pdf" as const;
       if(["mp4","webm","mov"].includes(ext))return "video" as const;
       if(["mp3","wav","m4a","ogg"].includes(ext))return "audio" as const;
       return "other" as const;
     };

     if(e.storage_path){
       const {data:signed,error:sErr}=await supabase.storage
         .from("wetrace-evidence")
         .createSignedUrl(e.storage_path,600);

       if(sErr){
         setError(sErr.message);
       }else if(signed?.signedUrl){
         setUrl(signed.signedUrl);
         setKind(detectKind(e.storage_path));
       }
     }else if(e.source_url){
       setUrl("/api/source-file?url="+encodeURIComponent(e.source_url));
       setKind(detectKind(e.original_file_name||e.source_url));
     }

     setLoading(false);
   })();
 },[id,supabase]);

 return <AppShell
   title={item?.evidence_number||"Evidence Viewer"}
   subtitle="Private in-platform evidence viewer. No external tab is required."
   actions={item?<div className="caseHeaderActions"><Badge tone={item.sensitivity==="biometric"||item.sensitivity==="genetic"?"red":"blue"}>{item.sensitivity}</Badge><Badge tone="green">{item.custody_status}</Badge></div>:undefined}
 >
   {loading
     ?<section className="panel"><p>Opening secure evidence…</p></section>
     :error&&!item
       ?<section className="panel"><div className="inlineAlert error">{error}</div><Link href="/evidence" className="secondaryBtn inlineBtn">Back to vault</Link></section>
       :item&&<>
         {error&&<div className="inlineAlert error">{error}</div>}

         <div className="viewerLayout">
           <section className="panel inPlatformViewer">
             <div className="viewerTop">
               <div><strong>{item.description||item.evidence_type}</strong><small>{item.evidence_number}</small></div>
               <span className="viewerLock">◆ PRIVATE</span>
             </div>

             <div className="viewerStage">
               {url
                 ?kind==="image"
                   ?<img src={url} alt={item.description||item.evidence_number}/>
                   :kind==="video"
                     ?<video src={url} controls playsInline/>
                     :kind==="audio"
                       ?<audio src={url} controls/>
                       :<iframe src={url} title={item.description||item.evidence_number}/>
                 :<div className="emptyState"><strong>No digital file attached</strong><p>This evidence record contains metadata only.</p></div>}
             </div>
           </section>

           <aside className="panel evidenceMeta">
             <h2>Evidence details</h2>
             <div className="profileDetail"><small>Type</small><strong>{item.evidence_type}</strong></div>
             <div className="profileDetail"><small>Collected</small><strong>{item.collected_at?new Date(item.collected_at).toLocaleString():"—"}</strong></div>
             <div className="profileDetail"><small>Source agency</small><strong>{item.source_agency||"—"}</strong></div><div className="profileDetail"><small>Source reference</small><strong>{item.source_reference||"—"}</strong></div><div className="profileDetail"><small>SHA-256</small><strong className="hashText">{item.sha256||"—"}</strong></div>{item.source_url&&<a href={item.source_url} target="_blank" rel="noreferrer" className="secondaryBtn inlineBtn fullBtn">Official source backup</a>}
             <div className="profileDetail"><small>Sensitivity</small><strong>{item.sensitivity}</strong></div>
             <Link href={"/cases/"+item.case_id+"?view=evidence"} className="secondaryBtn inlineBtn fullBtn">Return to case</Link>
           </aside>
         </div>

         <section className="panel">
           <div className="panelHead"><div><h2>Chain of custody</h2><p>Recorded custody events for this item.</p></div></div>
           {custody.length
             ?<div className="timelineList">
               {custody.map(c=><div className="timelineItem" key={c.id}>
                 <div className="timelineMarker"/>
                 <div className="timelineTime">{new Date(c.occurred_at).toLocaleString()}</div>
                 <div className="timelineBody"><strong>{c.event_type}</strong><p>{[c.from_party,c.to_party,c.location,c.notes].filter(Boolean).join(" · ")}</p></div>
               </div>)}
             </div>
             :<div className="emptyState compact"><strong>No custody events</strong></div>}
         </section>
       </>}
 </AppShell>;
}