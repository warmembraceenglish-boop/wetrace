"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import AppShell from "../components/AppShell";
import Badge from "../components/Badge";
import {useWorkspace} from "../lib/useWorkspace";

type Evidence={
  id:string;
  case_id:string;
  evidence_number:string;
  evidence_type:string;
  description:string|null;
  sensitivity:string;
  custody_status:string;
  created_at:string;
  cases?:{case_number:string;title:string}|null;
};

export default function EvidencePage(){
 const {supabase}=useWorkspace();
 const [rows,setRows]=useState<Evidence[]>([]);
 const [loading,setLoading]=useState(true);

 useEffect(()=>{
   (async()=>{
     const {data}=await supabase
       .from("evidence")
       .select("id,case_id,evidence_number,evidence_type,description,sensitivity,custody_status,created_at,cases(case_number,title)")
       .order("created_at",{ascending:false});

     setRows((data as unknown as Evidence[])||[]);
     setLoading(false);
   })();
 },[supabase]);

 return <AppShell title="Evidence Vault" subtitle="Private case evidence with integrity hashes and chain-of-custody history.">
  <section className="panel">
    <div className="panelHead">
      <div><h2>Evidence register</h2><p>{loading?"Loading secure vault…":rows.length+" item"+(rows.length===1?"":"s")+" visible to you"}</p></div>
    </div>

    {rows.length
      ?<div className="evidenceList">
        {rows.map(e=><Link href={"/evidence/"+e.id} className="evidenceRow evidenceLink" key={e.id}>
          <span className="fileIcon">{e.evidence_type.slice(0,3).toUpperCase()}</span>
          <div><strong>{e.evidence_number} · {e.description||e.evidence_type}</strong><small>{e.cases?.case_number||"Case"} · {new Date(e.created_at).toLocaleString()}</small></div>
          <Badge tone={e.sensitivity==="biometric"||e.sensitivity==="genetic"?"red":e.custody_status==="sealed"?"green":"amber"}>{e.custody_status}</Badge>
        </Link>)}
      </div>
      :!loading&&<div className="emptyState"><strong>No evidence yet</strong><p>Upload evidence from inside a case workspace. It will appear here automatically.</p><Link href="/cases" className="primaryBtn inlineBtn">Open cases</Link></div>}
  </section>
 </AppShell>;
}