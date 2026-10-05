"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import AppShell from "./components/AppShell";
import Badge from "./components/Badge";
import {useWorkspace} from "./lib/useWorkspace";

type CaseRow={
  id:string;
  case_number:string;
  title:string;
  case_type:string;
  jurisdictions:string[];
  priority:string;
  status:string;
  updated_at:string;
  client_reference:string|null;
};

type LeadRow={
  id:string;
  case_id:string;
  title:string;
  confidence:number|null;
  status:string;
  description:string|null;
};

type EvidenceRow={
  id:string;
  case_id:string;
  evidence_number:string;
  evidence_type:string;
  description:string|null;
  custody_status:string;
  sensitivity:string;
  created_at:string;
};

type InvestigatorRow={
  user_id:string;
  availability:string;
  specialties:string[];
};

export default function Dashboard(){
 const {supabase,organization}=useWorkspace();
 const [cases,setCases]=useState<CaseRow[]>([]);
 const [leads,setLeads]=useState<LeadRow[]>([]);
 const [evidence,setEvidence]=useState<EvidenceRow[]>([]);
 const [investigators,setInvestigators]=useState<InvestigatorRow[]>([]);
 const [loading,setLoading]=useState(true);

 useEffect(()=>{
   if(!organization)return;

   (async()=>{
     setLoading(true);

     const [c,l,e,i]=await Promise.all([
       supabase
         .from("cases")
         .select("id,case_number,title,case_type,jurisdictions,priority,status,updated_at,client_reference")
         .order("updated_at",{ascending:false}),
       supabase
         .from("leads")
         .select("id,case_id,title,confidence,status,description")
         .in("status",["new","review","verified"])
         .order("confidence",{ascending:false}),
       supabase
         .from("evidence")
         .select("id,case_id,evidence_number,evidence_type,description,custody_status,sensitivity,created_at")
         .order("created_at",{ascending:false}),
       supabase
         .from("investigator_profiles")
         .select("user_id,availability,specialties")
         .eq("organization_id",organization.id)
     ]);

     setCases((c.data as CaseRow[])||[]);
     setLeads((l.data as LeadRow[])||[]);
     setEvidence((e.data as EvidenceRow[])||[]);
     setInvestigators((i.data as InvestigatorRow[])||[]);
     setLoading(false);
   })();
 },[organization,supabase]);

 const activeCases=cases.filter(c=>!["closed","archived"].includes(c.status)).length;
 const openLeads=leads.filter(l=>["new","review"].includes(l.status)).length;
 const evidenceReview=evidence.filter(e=>["received","review","lab"].includes(e.custody_status)).length;
 const available=investigators.filter(i=>i.availability==="available").length;
 const priorityLead=leads[0];

 return <AppShell
   title="Dashboard"
   subtitle="Live case, evidence and team data from the secured WETrace backend."
   actions={<div className="jurisdictionCard"><span className="globe">◎</span><div><small>Data mode</small><strong>Live Supabase</strong></div><Badge tone="green">LIVE</Badge></div>}
 >
   <section className="kpiGrid" aria-label="Investigation overview">
    <article className="kpi"><div className="kpiTop"><span>Active Cases</span><i>▣</i></div><strong>{loading?"—":activeCases}</strong><small>Visible to your account</small></article>
    <article className="kpi"><div className="kpiTop"><span>Open Leads</span><i>⌁</i></div><strong>{loading?"—":openLeads}</strong><small className="cyanText">Live case leads</small></article>
    <article className="kpi"><div className="kpiTop"><span>Evidence Review</span><i>◇</i></div><strong>{loading?"—":evidenceReview}</strong><small>Received / review / lab</small></article>
    <article className="kpi"><div className="kpiTop"><span>Investigators</span><i>◎</i></div><strong>{loading?"—":investigators.length}</strong><small><span className="dot greenDot"/> {available} available</small></article>
   </section>

   <div className="mainGrid">
    <section className="panel casesPanel">
     <div className="panelHead">
       <div><h2>Active investigations</h2><p>Real cases from your secured workspace.</p></div>
       <Link className="textBtn" href="/cases">View all →</Link>
     </div>

     {cases.length
       ?<div className="tableWrap"><table>
         <thead><tr><th>Case</th><th>Type</th><th>Jurisdiction</th><th>Priority</th><th>Status</th><th>Updated</th></tr></thead>
         <tbody>{cases.slice(0,6).map(c=><tr key={c.id}>
           <td><Link href={"/cases/"+c.id} className="caseLink"><span className="caseId">{c.case_number}</span><strong>{c.title}</strong></Link></td>
           <td>{c.case_type}</td>
           <td>{c.jurisdictions?.join(" / ")||"—"}</td>
           <td><Badge tone={c.priority==="critical"||c.priority==="high"?"red":c.priority==="medium"?"amber":"slate"}>{c.priority}</Badge></td>
           <td><Badge tone="blue">{c.status}</Badge></td>
           <td className="muted">{new Date(c.updated_at).toLocaleDateString()}</td>
         </tr>)}</tbody>
       </table></div>
       :<div className="emptyState"><strong>No real cases yet</strong><p>Open your first investigation and it will appear here immediately.</p><Link href="/cases/new" className="primaryBtn inlineBtn">＋ Open first case</Link></div>}
    </section>

    <section className="panel leadPanel">
     <div className="panelHead">
       <div><h2>Priority lead</h2><p>Highest-confidence visible lead.</p></div>
       {priorityLead&&<Badge tone="amber">{priorityLead.status.toUpperCase()}</Badge>}
     </div>

     {priorityLead
       ?<>
         <div className="leadContent">
           <div className="confidenceRing"><strong>{priorityLead.confidence??"—"}%</strong><span>confidence</span></div>
           <div><strong>{priorityLead.title}</strong><p>{priorityLead.description||"No description entered."}</p><small>Investigator verification required before treating this as confirmed.</small></div>
         </div>
         <Link className="primaryBtn inlineBtn fullBtn" href={"/cases/"+priorityLead.case_id}>Open case</Link>
       </>
       :<div className="emptyState compact"><strong>No leads yet</strong><p>Add a lead from a case workspace.</p></div>}
    </section>
   </div>

   <div className="lowerGrid">
    <section className="panel">
      <div className="panelHead"><div><h2>Evidence requiring action</h2><p>Live evidence records and custody state.</p></div><Link className="textBtn" href="/evidence">Evidence vault →</Link></div>
      {evidence.length
        ?<div className="evidenceList">{evidence.slice(0,5).map(e=><Link className="evidenceRow evidenceLink" key={e.id} href={"/evidence/"+e.id}>
          <span className="fileIcon">{e.evidence_type.slice(0,3).toUpperCase()}</span>
          <div><strong>{e.evidence_number} · {e.description||e.evidence_type}</strong><small>{new Date(e.created_at).toLocaleString()}</small></div>
          <Badge tone={e.sensitivity==="biometric"||e.sensitivity==="genetic"?"red":e.custody_status==="sealed"?"green":"amber"}>{e.custody_status}</Badge>
        </Link>)}</div>
        :<div className="emptyState compact"><strong>No evidence uploaded</strong><p>Evidence appears here after it is added to a case.</p></div>}
    </section>

    <section className="panel">
      <div className="panelHead"><div><h2>Investigator network</h2><p>Real profiles in this organization.</p></div><Link className="textBtn" href="/investigators">Directory →</Link></div>
      <div className="metricStack"><div><strong>{investigators.length}</strong><span>profiles</span></div><div><strong>{available}</strong><span>available</span></div></div>
    </section>

    <section className="panel compliancePanel">
      <div className="panelHead"><div><h2>Restricted search gate</h2><p>Sensitive data requires documented authority.</p></div><span className="shield">◆</span></div>
      <div className="gateLine"><span>Driver / motor records</span><Badge tone="amber">Authorization</Badge></div>
      <div className="gateLine"><span>Biometric / genetic reviews</span><Badge tone="red">Restricted</Badge></div>
      <div className="gateLine"><span>Criminal history requests</span><Badge tone="amber">Jurisdiction</Badge></div>
      <Link href="/records" className="secondaryBtn inlineBtn fullBtn">Review access policy</Link>
    </section>
   </div>
 </AppShell>;
}