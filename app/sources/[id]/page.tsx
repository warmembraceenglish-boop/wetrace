"use client";

import Link from "next/link";
import {useParams} from "next/navigation";
import {useEffect,useState} from "react";
import AppShell from "../../components/AppShell";
import Badge from "../../components/Badge";
import {useWorkspace} from "../../lib/useWorkspace";

export default function SourceRecordPage(){
  const {id}=useParams<{id:string}>();
  const {supabase}=useWorkspace();
  const [row,setRow]=useState<any>(null);
  const [error,setError]=useState<string|null>(null);

  useEffect(()=>{
    if(!id)return;
    (async()=>{
      const {data,error}=await supabase
        .from("case_source_records")
        .select("*,cases(case_number,title)")
        .eq("id",id)
        .maybeSingle();

      if(error||!data){
        setError(error?.message||"Source record not found or access denied.");
        return;
      }
      setRow(data);
    })();
  },[id,supabase]);

  return <AppShell title={row?.source_title||"Source Record"} subtitle="Case-linked provenance and source review inside WETrace.">
    {error&&<div className="inlineAlert error">{error}</div>}

    {row&&<div className="viewerLayout">
      <section className="panel">
        <div className="panelHead">
          <div><h2>{row.source_title}</h2><p>{row.cases?.case_number||"Case"} · {row.cases?.title||""}</p></div>
          <Badge tone={row.reliability==="official_primary"||row.reliability==="investigator_verified"?"green":row.reliability==="disputed"?"red":"amber"}>{row.reliability.replaceAll("_"," ")}</Badge>
        </div>

        <div className="profileDetail"><small>Source type</small><strong>{row.source_type}</strong></div>
        <div className="profileDetail"><small>Agency / publisher</small><strong>{row.source_agency||"—"}</strong></div>
        <div className="profileDetail"><small>Reference</small><strong>{row.source_reference||"—"}</strong></div>
        <div className="profileDetail"><small>Published</small><strong>{row.published_on||"—"}</strong></div>
        <div className="profileDetail"><small>Retrieved</small><strong>{new Date(row.retrieved_at).toLocaleString()}</strong></div>
        <div className="profileDetail"><small>Source URL</small><strong className="hashText">{row.source_url||"—"}</strong></div>

        <div className="formNotice">
          <strong>Factual summary</strong>
          <p>{row.factual_summary||"No factual summary entered."}</p>
        </div>

        {row.source_url&&<div className="formNotice">
          <strong>External source access</strong>
          <p>WETrace keeps the source record, provenance and notes here. Some official websites block in-app embedding, so the URL is preserved even when the external page cannot be displayed inside WETrace.</p>
        </div>}
      </section>

      <aside className="panel evidenceMeta">
        <h2>Case link</h2>
        <div className="profileDetail"><small>Case number</small><strong>{row.cases?.case_number||"—"}</strong></div>
        <div className="profileDetail"><small>Reliability</small><strong>{row.reliability}</strong></div>
        <Link href={"/cases/"+row.case_id+"?view=sources"} className="secondaryBtn inlineBtn fullBtn">Return to case sources</Link>
      </aside>
    </div>}
  </AppShell>;
}