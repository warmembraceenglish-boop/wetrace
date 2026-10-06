"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import AppShell from "../components/AppShell";
import Badge from "../components/Badge";
import {useWorkspace} from "../lib/useWorkspace";

const scopeItems=[
  ["Identity verification","Names, aliases, date-of-birth and identity attributes from authorized or public sources."],
  ["Address history","Documented current and prior address research from lawful sources."],
  ["Criminal & court records","Jurisdiction-appropriate public court and criminal-record research; restricted databases remain permission-gated."],
  ["Civil records","Public civil litigation, judgments and related court records where lawfully available."],
  ["Professional & business history","Public corporate affiliations, licenses and professional registrations."],
  ["Education & employment verification","Verification only from authorized sources or with appropriate consent."],
  ["Sanctions & watchlists","Government-published sanctions, exclusions and watchlists where applicable."],
  ["Open-source review","Publicly available web and media research with source capture and verification."]
];

export default function BackgroundChecks(){
 const {supabase}=useWorkspace();
 const [rows,setRows]=useState<any[]>([]);
 const [loading,setLoading]=useState(true);

 useEffect(()=>{
   (async()=>{
     const {data}=await supabase
       .from("cases")
       .select("id,case_number,title,priority,status,jurisdictions,updated_at,case_type")
       .in("case_type",["Background Investigation","Background Check","Background Check / Investigation"])
       .order("updated_at",{ascending:false});
     setRows(data||[]);
     setLoading(false);
   })();
 },[supabase]);

 return <AppShell
   title="Background Checks"
   subtitle="Consent-aware, source-supported background research organized as auditable WETrace cases."
   actions={<Link href="/cases/new?type=Background%20Check" className="primaryBtn inlineBtn">＋ Start background check</Link>}
 >
   <div className="mainGrid">
     <section className="panel casesPanel">
       <div className="panelHead">
         <div><h2>Background-check cases</h2><p>{loading?"Loading…":rows.length+" case"+(rows.length===1?"":"s")+" visible"}</p></div>
         <Badge tone="green">LIVE</Badge>
       </div>
       {rows.length
         ?<div className="recordGrid">{rows.map(r=><Link href={"/cases/"+r.id} className="recordCard linkCard" key={r.id}>
           <div><strong>{r.case_number} · {r.title}</strong><small>{r.jurisdictions?.join(" / ")||"No jurisdiction"} · updated {new Date(r.updated_at).toLocaleString()}</small></div>
           <Badge tone={r.priority==="critical"||r.priority==="high"?"red":r.priority==="medium"?"amber":"blue"}>{r.status}</Badge>
         </Link>)}</div>
         :!loading&&<div className="emptyState"><strong>No background checks yet</strong><p>Open a new case and choose “Background Check” as the case type.</p><Link href="/cases/new?type=Background%20Check" className="primaryBtn inlineBtn">Open first check</Link></div>}
     </section>

     <section className="panel compliancePanel">
       <div className="panelHead"><div><h2>Authorization gate</h2><p>Record purpose and authority before restricted searches.</p></div><span className="shield">◆</span></div>
       <div className="gateLine"><span>Identity / public-source research</span><Badge tone="green">Document source</Badge></div>
       <div className="gateLine"><span>Criminal-history access</span><Badge tone="amber">Jurisdiction</Badge></div>
       <div className="gateLine"><span>Employment / housing / credit use</span><Badge tone="red">Compliance review</Badge></div>
       <div className="gateLine"><span>Restricted or non-public records</span><Badge tone="red">Authorization required</Badge></div>
     </section>
   </div>

   <section className="panel">
     <div className="panelHead"><div><h2>Background-check scope</h2><p>Use only the checks that match the case purpose, consent and jurisdiction.</p></div></div>
     <div className="moduleActionGrid">
       {scopeItems.map((x,i)=><article className="moduleAction" key={x[0]}>
         <div className="moduleActionIcon">{String(i+1).padStart(2,"0")}</div>
         <div><h3>{x[0]}</h3><p>{x[1]}</p></div>
       </article>)}
     </div>
     <div className="formNotice">
       <strong>Decision-use warning</strong>
       <p>Background information used for employment, housing, credit, insurance, licensing or other eligibility decisions may be regulated by consumer-reporting and anti-discrimination laws. WETrace should record consent, permissible purpose, jurisdiction and source provenance before those workflows are used.</p>
     </div>
   </section>
 </AppShell>;
}
