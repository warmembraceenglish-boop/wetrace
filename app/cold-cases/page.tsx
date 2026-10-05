"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import AppShell from "../components/AppShell";
import Badge from "../components/Badge";
import {useWorkspace} from "../lib/useWorkspace";

type ColdCase={
  id:string;
  case_number:string;
  title:string;
  case_type:string;
  status:string;
  priority:string;
  jurisdictions:string[];
  source_agency:string|null;
  external_case_number:string|null;
  incident_date:string|null;
  cold_case_since:string|null;
  reward_amount:number|null;
  reward_currency:string|null;
  reward_notes:string|null;
  last_verified_at:string|null;
  updated_at:string;
};

function yearsSince(date:string|null){
  if(!date)return null;
  const d=new Date(date);
  const now=new Date();
  let y=now.getFullYear()-d.getFullYear();
  if(now.getMonth()<d.getMonth()||(now.getMonth()===d.getMonth()&&now.getDate()<d.getDate()))y--;
  return y;
}

export default function ColdCases(){
  const {supabase,organization}=useWorkspace();
  const [rows,setRows]=useState<ColdCase[]>([]);
  const [counts,setCounts]=useState<Record<string,number>>({});
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    if(!organization)return;
    (async()=>{
      setLoading(true);
      const {data}=await supabase
        .from("cases")
        .select("id,case_number,title,case_type,status,priority,jurisdictions,source_agency,external_case_number,incident_date,cold_case_since,reward_amount,reward_currency,reward_notes,last_verified_at,updated_at")
        .eq("organization_id",organization.id)
        .eq("case_file_status","cold_case")
        .order("incident_date",{ascending:true});

      const cases=(data as ColdCase[])||[];
      setRows(cases);

      const ids=cases.map(c=>c.id);
      if(ids.length){
        const [p,e,l,s]=await Promise.all([
          supabase.from("case_people").select("case_id").in("case_id",ids),
          supabase.from("evidence").select("case_id").in("case_id",ids),
          supabase.from("leads").select("case_id").in("case_id",ids),
          supabase.from("case_source_records").select("case_id").in("case_id",ids)
        ]);
        const map:Record<string,number>={};
        for(const id of ids)map[id]=0;
        for(const result of [p,e,l,s]){
          for(const item of result.data||[])map[(item as any).case_id]=(map[(item as any).case_id]||0)+1;
        }
        setCounts(map);
      }else setCounts({});

      setLoading(false);
    })();
  },[organization,supabase]);

  return <AppShell title="Cold Case Files" subtitle="Unresolved historical investigations organized for re-review, source comparison, forensic reassessment, and new-lead development.">
    <section className="panel">
      <div className="panelHead"><div><h2>Cold case file room</h2><p>{loading?"Loading…":rows.length+" cold case"+(rows.length===1?"":"s")+" on file"}</p></div></div>

      {rows.length?<div className="recordGrid">{rows.map(r=>{
        const age=yearsSince(r.incident_date||r.cold_case_since);
        return <Link key={r.id} href={"/cases/"+r.id} className="investigatorCard">
          <div className="investigatorHero">
            <div className="largeAvatar">❄</div>
            <div><h2>{r.title}</h2><p>{r.case_number} · {r.case_type}</p><span>{r.jurisdictions?.join(" / ")||"No jurisdiction"}</span></div>
            <Badge tone="amber">COLD CASE</Badge>
          </div>

          <div className="profileStats">
            <div><small>Incident</small><strong>{r.incident_date||"—"}</strong></div>
            <div><small>Case age</small><strong>{age!=null?age+" years":"—"}</strong></div>
            <div><small>Source agency</small><strong>{r.source_agency||"—"}</strong></div>
          </div>

          <div className="profileStats">
            <div><small>Source / file items</small><strong>{counts[r.id]||0}</strong></div>
            <div><small>External ref</small><strong>{r.external_case_number||"—"}</strong></div>
            <div><small>Last verified</small><strong>{r.last_verified_at?new Date(r.last_verified_at).toLocaleDateString():"—"}</strong></div>
          </div>

          {r.reward_amount!=null&&<div className="credentialPreview"><span>◉</span>Reward: {r.reward_currency||"USD"} {Number(r.reward_amount).toLocaleString()}{r.reward_notes?" · "+r.reward_notes:""}</div>}
        </Link>;
      })}</div>:!loading&&<div className="emptyState"><strong>No cold cases filed</strong><p>Change a case classification to Cold Case when it is an unresolved historical file suitable for re-review.</p></div>}
    </section>

    <section className="panel compliancePanel">
      <div className="panelHead"><div><h2>Cold-case review standard</h2><p>WETrace keeps source facts, investigator notes, and hypotheses separate.</p></div><span className="shield">◆</span></div>
      <div className="gateLine"><span>Original agency / official file number</span><Badge tone="blue">Provenance</Badge></div>
      <div className="gateLine"><span>Evidence & chain of custody</span><Badge tone="green">Preserve</Badge></div>
      <div className="gateLine"><span>DNA / fingerprint / document re-review</span><Badge tone="red">Qualified provider</Badge></div>
      <div className="gateLine"><span>Persons of interest</span><Badge tone="amber">No guilt inference</Badge></div>
      <div className="gateLine"><span>New leads / contradictions</span><Badge tone="blue">Confidence scored</Badge></div>
    </section>
  </AppShell>;
}