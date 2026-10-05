"use client";

import Link from "next/link";
import {useParams} from "next/navigation";
import {useEffect,useState} from "react";
import AppShell from "../../components/AppShell";
import Badge from "../../components/Badge";
import {useWorkspace} from "../../lib/useWorkspace";

export default function ReportViewer(){
 const {id}=useParams<{id:string}>();
 const {supabase,user}=useWorkspace();
 const [report,setReport]=useState<any>(null);
 const [error,setError]=useState<string|null>(null);

 const load=async()=>{
   const {data,error}=await supabase.from("reports").select("*").eq("id",id).maybeSingle();
   if(error||!data){
     setError(error?.message||"Report not found or access denied.");
     return;
   }
   setReport(data);
 };

 useEffect(()=>{if(id)load();},[id]);

 const release=async()=>{
   if(!user||!report)return;
   const {error}=await supabase
     .from("reports")
     .update({status:"released",approved_by:user.id,updated_at:new Date().toISOString()})
     .eq("id",report.id);

   if(error)setError(error.message);
   else load();
 };

 return <AppShell
   title={report?.title||"Report Viewer"}
   subtitle="In-platform case report viewer."
   actions={report&&report.status!=="released"?<button className="primaryBtn inlineBtn" onClick={release}>Release report</button>:undefined}
 >
   {error&&<div className="inlineAlert error">{error}</div>}

   {report&&<div className="reportLayout">
     <section className="panel reportDocument">
       <div className="reportHeader">
         <div><p className="eyebrow">WETRACE INVESTIGATION REPORT</p><h2>{report.title}</h2></div>
         <Badge tone={report.status==="released"?"green":"amber"}>{report.status}</Badge>
       </div>

       <div className="reportBody">
         {typeof report.content?.body==="string"&&report.content.body.trim()
           ?report.content.body.split("\n").map((p:string,i:number)=><p key={i}>{p}</p>)
           :<p>No report body entered.</p>}
       </div>
     </section>

     <aside className="panel evidenceMeta">
       <h2>Report record</h2>
       <div className="profileDetail"><small>Type</small><strong>{report.report_type}</strong></div>
       <div className="profileDetail"><small>Status</small><strong>{report.status}</strong></div>
       <div className="profileDetail"><small>Created</small><strong>{new Date(report.created_at).toLocaleString()}</strong></div>
       <div className="profileDetail"><small>Updated</small><strong>{new Date(report.updated_at).toLocaleString()}</strong></div>
       <Link href={"/cases/"+report.case_id+"?view=reports"} className="secondaryBtn inlineBtn fullBtn">Return to case</Link>
     </aside>
   </div>}
 </AppShell>;
}