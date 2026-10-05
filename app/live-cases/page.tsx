"use client";

import Link from "next/link";
import {FormEvent,useEffect,useState} from "react";
import AppShell from "../components/AppShell";
import Badge from "../components/Badge";
import {useWorkspace} from "../lib/useWorkspace";

type CaseRow={
  id:string;
  case_number:string;
  title:string;
  case_type:string;
  status:string;
  priority:string;
  jurisdictions:string[];
  source_agency:string|null;
  external_case_number:string|null;
  official_source_url:string|null;
  incident_date:string|null;
  last_verified_at:string|null;
  updated_at:string;
  public_case:boolean;
};

export default function LiveCases(){
  const {supabase,user,organization}=useWorkspace();
  const [rows,setRows]=useState<CaseRow[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [notice,setNotice]=useState<string|null>(null);
  const [form,setForm]=useState({
    title:"",
    caseType:"Missing Person",
    jurisdiction:"",
    sourceAgency:"",
    externalCaseNumber:"",
    sourceUrl:"",
    incidentDate:"",
    summary:""
  });

  const load=async()=>{
    if(!organization)return;
    setLoading(true);
    const {data,error}=await supabase
      .from("cases")
      .select("id,case_number,title,case_type,status,priority,jurisdictions,source_agency,external_case_number,official_source_url,incident_date,last_verified_at,updated_at,public_case")
      .eq("organization_id",organization.id)
      .eq("case_file_status","active_live")
      .order("updated_at",{ascending:false});
    if(error)setError(error.message); else setRows((data as CaseRow[])||[]);
    setLoading(false);
  };

  useEffect(()=>{load();},[organization?.id]);

  const submit=async(e:FormEvent)=>{
    e.preventDefault();
    if(!organization||!user)return;
    setBusy(true);setError(null);setNotice(null);

    const now=new Date().toISOString();
    const {data:c,error:cErr}=await supabase.from("cases").insert({
      organization_id:organization.id,
      title:form.title.trim(),
      case_type:form.caseType,
      status:"active",
      priority:"medium",
      jurisdictions:form.jurisdiction.trim()?[form.jurisdiction.trim()]:[],
      legal_basis:"Official/public-source case intake. Further investigative actions require separate lawful authority.",
      client_reference:"Public case intake",
      lead_investigator:user.id,
      created_by:user.id,
      objective:"Track and analyze a current public case using verifiable source records while separating source facts from investigator hypotheses.",
      summary:form.summary.trim()||null,
      case_file_status:"active_live",
      public_case:true,
      source_agency:form.sourceAgency.trim()||null,
      external_case_number:form.externalCaseNumber.trim()||null,
      official_source_url:form.sourceUrl.trim()||null,
      incident_date:form.incidentDate||null,
      last_verified_at:now
    }).select("id,case_number").single();

    if(cErr||!c){setError(cErr?.message||"Could not create live case.");setBusy(false);return;}

    await supabase.from("case_members").insert({
      case_id:c.id,organization_id:organization.id,user_id:user.id,case_role:"lead",can_view_restricted:false
    });

    if(form.sourceUrl.trim()||form.sourceAgency.trim()){
      const {data:source}=await supabase.from("case_data_sources").insert({
        organization_id:organization.id,
        name:form.sourceAgency.trim()||"Official/public source",
        jurisdiction:form.jurisdiction.trim()||null,
        source_type:"official_public_portal",
        homepage_url:form.sourceUrl.trim()||null,
        connection_status:"manual_reference",
        access_notes:"Imported manually from a public source. Not live-synchronized unless separately verified.",
        created_by:user.id
      }).select("id").maybeSingle();

      await supabase.from("case_source_records").insert({
        organization_id:organization.id,
        case_id:c.id,
        source_id:source?.id||null,
        source_type:"official_record",
        source_title:form.title.trim()+" — source intake",
        source_agency:form.sourceAgency.trim()||null,
        source_reference:form.externalCaseNumber.trim()||null,
        source_url:form.sourceUrl.trim()||null,
        published_on:form.incidentDate||null,
        reliability:"unverified",
        factual_summary:form.summary.trim()||"Initial public-source intake. Verification required.",
        raw_public_data:{entry_mode:"manual_public_case_intake"},
        created_by:user.id
      });
    }

    setNotice(c.case_number+" created as a live case. Source facts remain distinct from investigator conclusions.");
    setForm({title:"",caseType:"Missing Person",jurisdiction:"",sourceAgency:"",externalCaseNumber:"",sourceUrl:"",incidentDate:"",summary:""});
    setBusy(false);
    load();
  };

  return <AppShell title="Live Cases" subtitle="Current active investigations and official/public case intakes. No case is treated as verified merely because it was imported.">
    {error&&<div className="inlineAlert error">{error}</div>}
    {notice&&<div className="inlineAlert success">{notice}</div>}

    <div className="caseWorkspaceGrid">
      <section className="panel">
        <div className="panelHead"><div><h2>Add a real public case</h2><p>Use official/publicly available case information. Preserve the source URL and reference number.</p></div></div>
        <form className="formGrid" onSubmit={submit}>
          <label>Case title<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
          <label>Case type<select value={form.caseType} onChange={e=>setForm({...form,caseType:e.target.value})}><option>Missing Person</option><option>Homicide / Suspicious Death</option><option>Fraud</option><option>Unidentified Person</option><option>Criminal Investigation</option><option>Other</option></select></label>
          <label>Jurisdiction<input value={form.jurisdiction} onChange={e=>setForm({...form,jurisdiction:e.target.value})} placeholder="City / state / country"/></label>
          <label>Source agency<input value={form.sourceAgency} onChange={e=>setForm({...form,sourceAgency:e.target.value})} placeholder="Police, court, official registry…"/></label>
          <label>Official/reference case number<input value={form.externalCaseNumber} onChange={e=>setForm({...form,externalCaseNumber:e.target.value})}/></label>
          <label>Incident / missing date<input type="date" value={form.incidentDate} onChange={e=>setForm({...form,incidentDate:e.target.value})}/></label>
          <label className="full">Official/public source URL<input type="url" value={form.sourceUrl} onChange={e=>setForm({...form,sourceUrl:e.target.value})} placeholder="https://..."/></label>
          <label className="full">Public-source summary<textarea rows={5} value={form.summary} onChange={e=>setForm({...form,summary:e.target.value})} placeholder="Public facts only. Do not add rumors as fact."/></label>
          <div className="formNotice full"><strong>Live-case integrity</strong><p>Imported cases are not automatically synchronized. A “last verified” timestamp records when the WETrace entry was checked, not when an external agency last updated its file.</p></div>
          <div className="formActions full"><button className="primaryBtn inlineBtn" disabled={busy||!form.title.trim()}>{busy?"Creating…":"Create live case"}</button></div>
        </form>
      </section>

      <section className="panel">
        <div className="panelHead"><div><h2>Live case register</h2><p>{loading?"Loading…":rows.length+" active live case"+(rows.length===1?"":"s")}</p></div></div>
        {rows.length?<div className="recordGrid singleColumn">{rows.map(r=><Link key={r.id} href={"/cases/"+r.id} className="recordCard linkCard">
          <div>
            <strong>{r.case_number} · {r.title}</strong>
            <small>{r.case_type} · {r.jurisdictions?.join(" / ")||"No jurisdiction"} · {r.source_agency||"No source agency"}</small>
            <small>{r.external_case_number?"Ref "+r.external_case_number+" · ":""}{r.incident_date||"No incident date"} · checked {r.last_verified_at?new Date(r.last_verified_at).toLocaleString():"not yet"}</small>
          </div>
          <div className="credentialActions"><Badge tone="green">LIVE</Badge><Badge tone={r.priority==="high"||r.priority==="critical"?"red":"blue"}>{r.status}</Badge></div>
        </Link>)}</div>:!loading&&<div className="emptyState"><strong>No live cases yet</strong><p>Add a current official/public case above or create an internal investigation and classify it as Live.</p></div>}
      </section>
    </div>
  </AppShell>;
}