"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import AppShell from "../components/AppShell";
import Badge from "../components/Badge";
import {useWorkspace} from "../lib/useWorkspace";

type CaseRow={
  id:string;case_number:string;title:string;case_type:string;client_reference:string|null;
  jurisdictions:string[];priority:string;status:string;updated_at:string;lead_investigator:string|null;
};

export default function CasesPage(){
 const {supabase,organization}=useWorkspace();
 const [cases,setCases]=useState<CaseRow[]>([]);
 const [profiles,setProfiles]=useState<Record<string,string>>({});
 const [loading,setLoading]=useState(true);

 useEffect(()=>{
   if(!organization)return;
   (async()=>{
     setLoading(true);
     const {data}=await supabase
       .from("cases")
       .select("id,case_number,title,case_type,client_reference,jurisdictions,priority,status,updated_at,lead_investigator")
       .order("updated_at",{ascending:false});

     const rows=(data as CaseRow[])||[];
     setCases(rows);

     const ids=[...new Set(rows.map(x=>x.lead_investigator).filter(Boolean))] as string[];
     if(ids.length){
       const {data:p}=await supabase.from("profiles").select("id,display_name").in("id",ids);
       setProfiles(Object.fromEntries((p||[]).map((x:any)=>[x.id,x.display_name])));
     }
     setLoading(false);
   })();
 },[organization,supabase]);

 return <AppShell
   title="Cases"
   subtitle="Live investigations visible to your authenticated account."
   actions={<Link href="/cases/new" className="primaryBtn inlineBtn">＋ Open new case</Link>}
 >
   <section className="panel">
    <div className="panelHead">
      <div><h2>All investigations</h2><p>{loading?"Loading secure case records…":cases.length+" case"+(cases.length===1?"":"s")+" visible"}</p></div>
    </div>

    {cases.length
      ?<div className="tableWrap"><table>
        <thead><tr><th>Case</th><th>Type</th><th>Client</th><th>Jurisdiction</th><th>Lead</th><th>Priority</th><th>Status</th><th>Updated</th></tr></thead>
        <tbody>{cases.map(c=><tr key={c.id}>
          <td><Link href={"/cases/"+c.id} className="caseLink"><span className="caseId">{c.case_number}</span><strong>{c.title}</strong></Link></td>
          <td>{c.case_type}</td>
          <td>{c.client_reference||"—"}</td>
          <td>{c.jurisdictions?.join(" / ")||"—"}</td>
          <td>{c.lead_investigator?profiles[c.lead_investigator]||"Assigned":"—"}</td>
          <td><Badge tone={c.priority==="critical"||c.priority==="high"?"red":c.priority==="medium"?"amber":"slate"}>{c.priority}</Badge></td>
          <td><Badge tone="blue">{c.status}</Badge></td>
          <td className="muted">{new Date(c.updated_at).toLocaleString()}</td>
        </tr>)}</tbody>
      </table></div>
      :!loading&&<div className="emptyState"><strong>No investigations yet</strong><p>Create the first real case for this workspace.</p><Link href="/cases/new" className="primaryBtn inlineBtn">＋ Open first case</Link></div>}
   </section>
 </AppShell>;
}