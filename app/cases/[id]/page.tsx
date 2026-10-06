"use client";

import Link from "next/link";
import {FormEvent,useCallback,useEffect,useState} from "react";
import {useParams,useSearchParams} from "next/navigation";
import AppShell from "../../components/AppShell";
import Badge from "../../components/Badge";
import EvidenceUpload from "../../components/EvidenceUpload";
import CaseEvidenceCenter from "../../components/CaseEvidenceCenter";
import {useWorkspace} from "../../lib/useWorkspace";

const tabs=["overview","timeline","people","leads","media","evidence","downloads","sources","map","tasks","communications","reports","billing","audit"];

export default function CaseWorkspace(){
 const {id}=useParams<{id:string}>();
 const search=useSearchParams();
 const view=(search.get("view")||"overview").toLowerCase();
 const {supabase,organization}=useWorkspace();

 const [caseRow,setCaseRow]=useState<any>(null);
 const [timeline,setTimeline]=useState<any[]>([]);
 const [leads,setLeads]=useState<any[]>([]);
 const [evidence,setEvidence]=useState<any[]>([]);
 const [tasks,setTasks]=useState<any[]>([]);
 const [messages,setMessages]=useState<any[]>([]);
 const [reports,setReports]=useState<any[]>([]);
 const [members,setMembers]=useState<any[]>([]);
 const [people,setPeople]=useState<any[]>([]);
 const [authorities,setAuthorities]=useState<any[]>([]);
 const [audit,setAudit]=useState<any[]>([]);
 const [timeEntries,setTimeEntries]=useState<any[]>([]);
 const [expenses,setExpenses]=useState<any[]>([]);
 const [sourceRecords,setSourceRecords]=useState<any[]>([]);
 const [profiles,setProfiles]=useState<Record<string,string>>({});
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState<string|null>(null);

 const load=useCallback(async()=>{
   if(!id)return;

   setLoading(true);
   setError(null);

   const {data:c,error:caseErr}=await supabase.from("cases").select("*").eq("id",id).maybeSingle();

   if(caseErr||!c){
     setError(caseErr?.message||"Case not found or access denied.");
     setCaseRow(null);
     setLoading(false);
     return;
   }

   setCaseRow(c);

   const results=await Promise.all([
     supabase.from("case_timeline_events").select("*").eq("case_id",id).order("event_time",{ascending:false}),
     supabase.from("leads").select("*").eq("case_id",id).order("created_at",{ascending:false}),
     supabase.from("evidence").select("*").eq("case_id",id).order("created_at",{ascending:false}),
     supabase.from("tasks").select("*").eq("case_id",id).order("created_at",{ascending:false}),
     supabase.from("case_messages").select("*").eq("case_id",id).order("created_at",{ascending:false}),
     supabase.from("reports").select("*").eq("case_id",id).order("updated_at",{ascending:false}),
     supabase.from("case_members").select("*").eq("case_id",id),
     supabase.from("case_people").select("*").eq("case_id",id),
     supabase.from("legal_authorizations").select("*").eq("case_id",id).order("created_at",{ascending:false}),
     supabase.from("audit_events").select("*").eq("case_id",id).order("created_at",{ascending:false}).limit(100),
     supabase.from("time_entries").select("*").eq("case_id",id).order("worked_at",{ascending:false}),
     supabase.from("expenses").select("*").eq("case_id",id).order("incurred_at",{ascending:false}),
     supabase.from("case_source_records").select("*").eq("case_id",id).order("retrieved_at",{ascending:false})
   ]);

   setTimeline(results[0].data||[]);
   setLeads(results[1].data||[]);
   setEvidence(results[2].data||[]);
   setTasks(results[3].data||[]);
   setMessages(results[4].data||[]);
   setReports(results[5].data||[]);
   setMembers(results[6].data||[]);
   const casePeople=results[7].data||[];
   setAuthorities(results[8].data||[]);
   setAudit(results[9].data||[]);
   setTimeEntries(results[10].data||[]);
   setExpenses(results[11].data||[]);
   setSourceRecords(results[12].data||[]);

   const profileIds=[...new Set([
     c.lead_investigator,
     ...(results[6].data||[]).map((x:any)=>x.user_id),
     ...(results[4].data||[]).map((x:any)=>x.sender_user_id)
   ].filter(Boolean))] as string[];

   if(profileIds.length){
     const {data:p}=await supabase.from("profiles").select("id,display_name").in("id",profileIds);
     setProfiles(Object.fromEntries((p||[]).map((x:any)=>[x.id,x.display_name])));
   }

   const personIds=[...new Set(casePeople.map((x:any)=>x.person_id))] as string[];

   if(personIds.length){
     const {data:p}=await supabase.from("people").select("*").in("id",personIds);
     const map=Object.fromEntries((p||[]).map((x:any)=>[x.id,x]));
     setPeople(casePeople.map((cp:any)=>({...cp,person:map[cp.person_id]})).filter((x:any)=>x.person));
   }else{
     setPeople([]);
   }

   setLoading(false);
 },[id,supabase]);

 useEffect(()=>{load();},[load]);

 if(loading){
   return <AppShell title="Case Workspace" subtitle="Loading secure case data…"><section className="panel"><p>Loading…</p></section></AppShell>;
 }

 if(error||!caseRow){
   return <AppShell title="Case unavailable" subtitle="The case could not be opened.">
     <section className="panel"><div className="inlineAlert error">{error||"Access denied."}</div><Link href="/cases" className="secondaryBtn inlineBtn">Back to cases</Link></section>
   </AppShell>;
 }

 const priorityTone=caseRow.priority==="critical"||caseRow.priority==="high"?"red":caseRow.priority==="medium"?"amber":"slate";

 return <AppShell
   title={caseRow.title}
   subtitle={caseRow.case_number+" · "+caseRow.case_type+" · "+(caseRow.jurisdictions?.join(" / ")||"Unspecified")}
   actions={<div className="caseHeaderActions">
     <Badge tone={priorityTone}>{caseRow.priority} priority</Badge>
     <Badge tone="green">{caseRow.status}</Badge>
     <Link href={"/cases/"+id+"?view=evidence"} className="primaryBtn inlineBtn">＋ Add evidence</Link>
   </div>}
 >
   <div className="caseMetaBar">
     <div><small>Client</small><strong>{caseRow.client_reference||"—"}</strong></div>
     <div><small>Lead investigator</small><strong>{profiles[caseRow.lead_investigator]||"Assigned"}</strong></div>
     <div><small>Jurisdiction</small><strong>{caseRow.jurisdictions?.join(" / ")||"—"}</strong></div>
     <div><small>Opened</small><strong>{new Date(caseRow.opened_at).toLocaleString()}</strong></div>
   </div>

   <div className="caseTabs">
     {tabs.map(t=><Link key={t} href={t==="overview"?"/cases/"+id:"/cases/"+id+"?view="+t} className={view===t?"caseTab active":"caseTab"}>
       {t[0].toUpperCase()+t.slice(1)}
     </Link>)}
   </div>

   {view==="overview"&&<Overview c={caseRow} authorities={authorities} timeline={timeline} evidence={evidence} members={members} profiles={profiles} onReload={load}/>}
   {view==="timeline"&&<TimelineView rows={timeline} caseId={id} organizationId={caseRow.organization_id} onReload={load}/>}
   {view==="people"&&<PeopleView rows={people} caseId={id} organizationId={caseRow.organization_id} onReload={load}/>}
   {view==="leads"&&<LeadsView rows={leads} caseId={id} organizationId={caseRow.organization_id} onReload={load}/>}
   {view==="media"&&<CaseEvidenceCenter rows={evidence} caseId={id} organizationId={caseRow.organization_id} caseNumber={caseRow.case_number} caseTitle={caseRow.title} mode="media" onReload={load}/>}
   {view==="evidence"&&<EvidenceView rows={evidence} caseId={id} organizationId={caseRow.organization_id} onReload={load}/>}
   {view==="downloads"&&<CaseEvidenceCenter rows={evidence} caseId={id} organizationId={caseRow.organization_id} caseNumber={caseRow.case_number} caseTitle={caseRow.title} mode="downloads" onReload={load}/>}
   {view==="sources"&&<SourcesView rows={sourceRecords} caseId={id} organizationId={caseRow.organization_id} onReload={load}/>}
   {view==="map"&&<MapView rows={timeline}/>} 
   {view==="tasks"&&<TasksView rows={tasks} caseId={id} organizationId={caseRow.organization_id} profiles={profiles} onReload={load}/>}
   {view==="communications"&&<MessagesView rows={messages} caseId={id} organizationId={caseRow.organization_id} profiles={profiles} onReload={load}/>}
   {view==="reports"&&<ReportsView rows={reports} caseId={id} organizationId={caseRow.organization_id} onReload={load}/>}
   {view==="billing"&&<BillingView timeEntries={timeEntries} expenses={expenses} caseId={id} organizationId={caseRow.organization_id} currency={organization?.default_currency||"USD"} onReload={load}/>}
   {view==="audit"&&<AuditView rows={audit}/>}
 </AppShell>;
}

function Overview({
  c,authorities,timeline,evidence,members,profiles,onReload
}:{
  c:any;authorities:any[];timeline:any[];evidence:any[];members:any[];profiles:Record<string,string>;onReload:()=>void;
}){
 const {supabase}=useWorkspace();
 const [summary,setSummary]=useState(c.summary||"");
 const [classification,setClassification]=useState(c.case_file_status||"active_live");
 const [busy,setBusy]=useState(false);

 const save=async()=>{
   setBusy(true);
   await supabase.from("cases").update({
     summary:summary.trim()||null,
     case_file_status:classification,
     cold_case_since:classification==="cold_case"?(c.cold_case_since||c.incident_date||new Date().toISOString().slice(0,10)):null,
     updated_at:new Date().toISOString()
   }).eq("id",c.id);
   setBusy(false);
   onReload();
 };

 return <>
  <div className="caseWorkspaceGrid">
    <section className="panel">
      <div className="panelHead"><div><h2>Case synopsis</h2><p>Live objective and working summary.</p></div><button className="textBtn" disabled={busy} onClick={save}>{busy?"Saving…":"Save summary"}</button></div>
      <div className="synopsis">
        <p><strong>Objective:</strong> {c.objective||"No objective entered."}</p>
        <label className="fullInput">Case file classification
          <select value={classification} onChange={e=>setClassification(e.target.value)}>
            <option value="active_live">Live / Active</option>
            <option value="cold_case">Cold Case</option>
            <option value="historical_research">Historical Research</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        <label className="fullInput">Working summary<textarea rows={5} value={summary} onChange={e=>setSummary(e.target.value)} placeholder="Verified facts, current position and next investigative focus."/></label>
        <div className="factGrid">
          <div><small>Timeline events</small><strong>{timeline.length}</strong></div>
          <div><small>Evidence items</small><strong>{evidence.length}</strong></div>
          <div><small>Team members</small><strong>{members.length}</strong></div>
          <div><small>Status</small><strong>{c.status}</strong></div>
        </div>
      </div>
    </section>

    <section className="panel">
      <div className="panelHead"><div><h2>Authority & access</h2><p>Lawful-purpose and restricted-data controls.</p></div><Badge tone={authorities.length?"green":"amber"}>{authorities.length?"Documented":"Review"}</Badge></div>
      <div className="gateLine"><span>Lawful basis</span><strong>{c.legal_basis||"Not specified"}</strong></div>
      <div className="gateLine"><span>Authority records</span><Badge tone="blue">{authorities.length}</Badge></div>
      <div className="gateLine"><span>Restricted evidence</span><Badge tone="red">Permission gated</Badge></div>
      <div className="gateLine"><span>File classification</span><Badge tone={c.case_file_status==="cold_case"?"amber":"green"}>{(c.case_file_status||"active_live").replaceAll("_"," ")}</Badge></div>
      <div className="gateLine"><span>Source agency</span><strong>{c.source_agency||"—"}</strong></div>
      <div className="gateLine"><span>External case number</span><strong>{c.external_case_number||"—"}</strong></div>
      <div className="gateLine"><span>Incident date</span><strong>{c.incident_date||"—"}</strong></div>
    </section>
  </div>

  <div className="caseWorkspaceGrid">
    <section className="panel">
      <div className="panelHead"><div><h2>Recent timeline</h2><p>Latest case events.</p></div><Link className="textBtn" href={"/cases/"+c.id+"?view=timeline"}>Full timeline →</Link></div>
      {timeline.length?<div className="timelineList">{timeline.slice(0,4).map((e:any)=><TimelineRow key={e.id} e={e}/>)}</div>:<Empty text="No timeline events yet."/>}
    </section>

    <section className="panel">
      <div className="panelHead"><div><h2>Recent evidence</h2><p>Private case evidence.</p></div><Link className="textBtn" href={"/cases/"+c.id+"?view=evidence"}>Evidence →</Link></div>
      {evidence.length?<div className="evidenceList">{evidence.slice(0,4).map((e:any)=><EvidenceRow key={e.id} e={e}/>)}</div>:<Empty text="No evidence uploaded yet."/>}
    </section>
  </div>

  <section className="panel">
    <div className="panelHead"><div><h2>Assigned team</h2><p>Case membership and restricted-data permission.</p></div></div>
    {members.length
      ?<div className="teamCards">{members.map((m:any)=><div className="miniPerson" key={m.user_id}>
        <span className="personAvatar">{(profiles[m.user_id]||"WT").split(/\s+/).map((x:string)=>x[0]).join("").slice(0,2).toUpperCase()}</span>
        <div><strong>{profiles[m.user_id]||"Team member"}</strong><small>{m.case_role.replaceAll("_"," ")}</small></div>
        <Badge tone={m.can_view_restricted?"red":"blue"}>{m.can_view_restricted?"Restricted":"Standard"}</Badge>
      </div>)}</div>
      :<Empty text="No case members assigned."/>}
  </section>
 </>;
}

function TimelineRow({e}:{e:any}){
 return <div className="timelineItem">
   <div className="timelineMarker"/>
   <div className="timelineTime">{new Date(e.event_time).toLocaleString()}</div>
   <div className="timelineBody">
     <div className="timelineTitle"><strong>{e.title}</strong>{e.confidence!=null&&<Badge tone={e.confidence>=80?"green":e.confidence>=60?"blue":"amber"}>{e.confidence}%</Badge>}</div>
     <small>{e.event_type}</small>
     <p>{e.description||"No description."}{e.location_text?" · "+e.location_text:""}</p>
   </div>
 </div>;
}

function EvidenceRow({e}:{e:any}){
 return <Link href={"/evidence/"+e.id} className="evidenceRow evidenceLink">
   <span className="fileIcon">{e.evidence_type.slice(0,3).toUpperCase()}</span>
   <div><strong>{e.evidence_number} · {e.description||e.evidence_type}</strong><small>{new Date(e.created_at).toLocaleString()}</small></div>
   <Badge tone={e.sensitivity==="biometric"||e.sensitivity==="genetic"?"red":e.custody_status==="sealed"?"green":"amber"}>{e.custody_status}</Badge>
 </Link>;
}

function Empty({text}:{text:string}){
 return <div className="emptyState compact"><strong>{text}</strong></div>;
}

function TimelineView({rows,caseId,organizationId,onReload}:{rows:any[];caseId:string;organizationId:string;onReload:()=>void}){
 const {supabase,user}=useWorkspace();
 const [title,setTitle]=useState("");
 const [type,setType]=useState("observation");
 const [description,setDescription]=useState("");
 const [location,setLocation]=useState("");
 const [confidence,setConfidence]=useState("80");
 const [busy,setBusy]=useState(false);

 const add=async(e:FormEvent)=>{
   e.preventDefault();
   if(!user)return;
   setBusy(true);
   await supabase.from("case_timeline_events").insert({
     organization_id:organizationId,
     case_id:caseId,
     event_time:new Date().toISOString(),
     event_type:type,
     title,
     description:description||null,
     location_text:location||null,
     confidence:Number(confidence)||null,
     created_by:user.id
   });
   setTitle("");setDescription("");setLocation("");setBusy(false);onReload();
 };

 return <section className="panel">
   <div className="panelHead"><div><h2>Investigation timeline</h2><p>Chronological case events with confidence and source context.</p></div></div>
   <form className="inlineComposer" onSubmit={add}>
     <input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="Event title"/>
     <select value={type} onChange={e=>setType(e.target.value)}><option>observation</option><option>interview</option><option>sighting</option><option>record</option><option>contact</option><option>other</option></select>
     <input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Location (optional)"/>
     <input type="number" min="0" max="100" value={confidence} onChange={e=>setConfidence(e.target.value)} placeholder="Confidence"/>
     <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Description"/>
     <button className="primaryBtn inlineBtn" disabled={busy}>{busy?"Adding…":"＋ Add event"}</button>
   </form>
   {rows.length?<div className="timelineList">{rows.map(e=><TimelineRow key={e.id} e={e}/>)}</div>:<Empty text="No timeline events yet."/>}
 </section>;
}

function PeopleView({rows,caseId,organizationId,onReload}:{rows:any[];caseId:string;organizationId:string;onReload:()=>void}){
 const {supabase,user}=useWorkspace();
 const [name,setName]=useState("");
 const [relationship,setRelationship]=useState("witness");
 const [sensitivity,setSensitivity]=useState("standard");
 const [busy,setBusy]=useState(false);

 const add=async(e:FormEvent)=>{
   e.preventDefault();
   if(!user)return;
   setBusy(true);
   const {data:p,error}=await supabase.from("people").insert({
     organization_id:organizationId,
     display_name:name,
     sensitivity,
     created_by:user.id
   }).select("id").single();

   if(p&&!error){
     await supabase.from("case_people").insert({
       case_id:caseId,
       organization_id:organizationId,
       person_id:p.id,
       relationship,
       confidence:100
     });
   }

   setName("");
   setBusy(false);
   onReload();
 };

 return <section className="panel">
   <div className="panelHead"><div><h2>People</h2><p>Case-linked subjects, witnesses, clients, relatives and associates.</p></div></div>
   <form className="inlineComposer" onSubmit={add}>
     <input required value={name} onChange={e=>setName(e.target.value)} placeholder="Person name"/>
     <select value={relationship} onChange={e=>setRelationship(e.target.value)}>
       <option value="subject">Subject</option><option value="missing_person">Missing person</option><option value="victim">Victim</option><option value="witness">Witness</option><option value="client">Client</option><option value="associate">Associate</option><option value="relative">Relative</option><option value="person_of_interest">Person of interest</option><option value="other">Other</option>
     </select>
     <select value={sensitivity} onChange={e=>setSensitivity(e.target.value)}>
       <option value="standard">Standard</option><option value="restricted">Restricted</option><option value="biometric">Biometric</option><option value="genetic">Genetic</option>
     </select>
     <button className="primaryBtn inlineBtn" disabled={busy}>{busy?"Adding…":"＋ Add person"}</button>
   </form>
   {rows.length
     ?<div className="recordGrid">{rows.map((r:any)=><article className="recordCard" key={r.person_id}>
       <div className="personAvatar">{r.person.display_name.split(/\s+/).map((x:string)=>x[0]).join("").slice(0,2).toUpperCase()}</div>
       <div><strong>{r.person.display_name}</strong><small>{r.relationship.replaceAll("_"," ")} · {r.person.sensitivity}</small></div>
       <Badge tone={r.person.sensitivity==="biometric"||r.person.sensitivity==="genetic"?"red":"blue"}>{r.confidence??"—"}%</Badge>
     </article>)}</div>
     :<Empty text="No people linked to this case."/>}
 </section>;
}

function LeadsView({rows,caseId,organizationId,onReload}:{rows:any[];caseId:string;organizationId:string;onReload:()=>void}){
 const {supabase,user}=useWorkspace();
 const [title,setTitle]=useState("");
 const [description,setDescription]=useState("");
 const [confidence,setConfidence]=useState("50");
 const [busy,setBusy]=useState(false);

 const add=async(e:FormEvent)=>{
   e.preventDefault();
   if(!user)return;
   setBusy(true);
   await supabase.from("leads").insert({
     organization_id:organizationId,
     case_id:caseId,
     title,
     description:description||null,
     confidence:Number(confidence)||null,
     status:"new",
     created_by:user.id
   });
   setTitle("");setDescription("");setBusy(false);onReload();
 };

 return <section className="panel">
   <div className="panelHead"><div><h2>Leads</h2><p>Unverified and verified investigative leads with explicit confidence.</p></div></div>
   <form className="inlineComposer" onSubmit={add}>
     <input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="Lead title"/>
     <input type="number" min="0" max="100" value={confidence} onChange={e=>setConfidence(e.target.value)} placeholder="Confidence"/>
     <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Lead details"/>
     <button className="primaryBtn inlineBtn" disabled={busy}>{busy?"Adding…":"＋ Add lead"}</button>
   </form>
   {rows.length
     ?<div className="recordGrid">{rows.map((r:any)=><article className="recordCard" key={r.id}><div><strong>{r.title}</strong><small>{r.description||"No description."}</small></div><Badge tone={r.status==="verified"?"green":r.confidence>=70?"blue":"amber"}>{r.status} · {r.confidence??"—"}%</Badge></article>)}</div>
     :<Empty text="No leads yet."/>}
 </section>;
}

function EvidenceView({rows,caseId,organizationId,onReload}:{rows:any[];caseId:string;organizationId:string;onReload:()=>void}){
 return <div className="caseWorkspaceGrid">
   <section className="panel"><EvidenceUpload caseId={caseId} organizationId={organizationId} onUploaded={onReload}/></section>
   <section className="panel">
     <div className="panelHead"><div><h2>Evidence register</h2><p>{rows.length} item{rows.length===1?"":"s"} visible</p></div></div>
     {rows.length?<div className="evidenceList">{rows.map((e:any)=><EvidenceRow key={e.id} e={e}/>)}</div>:<Empty text="No evidence uploaded yet."/>}
   </section>
 </div>;
}

function SourcesView({rows,caseId,organizationId,onReload}:{rows:any[];caseId:string;organizationId:string;onReload:()=>void}){
 const {supabase,user}=useWorkspace();
 const [title,setTitle]=useState("");
 const [agency,setAgency]=useState("");
 const [reference,setReference]=useState("");
 const [url,setUrl]=useState("");
 const [reliability,setReliability]=useState("unverified");
 const [summary,setSummary]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState<string|null>(null);

 const add=async(e:FormEvent)=>{
   e.preventDefault();
   if(!user)return;
   setBusy(true);setError(null);
   const {error}=await supabase.from("case_source_records").insert({
     organization_id:organizationId,
     case_id:caseId,
     source_type:"official_record",
     source_title:title.trim(),
     source_agency:agency.trim()||null,
     source_reference:reference.trim()||null,
     source_url:url.trim()||null,
     reliability,
     factual_summary:summary.trim()||null,
     raw_public_data:{entry_mode:"manual_case_source_record"},
     created_by:user.id
   });
   setBusy(false);
   if(error){setError(error.message);return;}
   setTitle("");setAgency("");setReference("");setUrl("");setSummary("");setReliability("unverified");
   onReload();
 };

 return <section className="panel">
   <div className="panelHead"><div><h2>Source records</h2><p>Official records, public notices, archival material, and other source documents tied to this case.</p></div></div>
   {error&&<div className="inlineAlert error">{error}</div>}
   <form className="inlineComposer" onSubmit={add}>
     <input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="Source title"/>
     <input value={agency} onChange={e=>setAgency(e.target.value)} placeholder="Agency / publisher"/>
     <input value={reference} onChange={e=>setReference(e.target.value)} placeholder="Case / source reference"/>
     <select value={reliability} onChange={e=>setReliability(e.target.value)}>
       <option value="official_primary">Official primary</option>
       <option value="official_secondary">Official secondary</option>
       <option value="reputable_secondary">Reputable secondary</option>
       <option value="investigator_verified">Investigator verified</option>
       <option value="unverified">Unverified</option>
       <option value="disputed">Disputed</option>
     </select>
     <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="Source URL"/>
     <textarea value={summary} onChange={e=>setSummary(e.target.value)} placeholder="Factual summary. Preserve uncertainty and contradictions."/>
     <button className="primaryBtn inlineBtn" disabled={busy}>{busy?"Adding…":"＋ Add source"}</button>
   </form>

   {rows.length?<div className="recordGrid singleColumn">{rows.map(r=><article className="recordCard" key={r.id}>
     <div>
       <strong>{r.source_title}</strong>
       <small>{r.source_agency||"No agency"}{r.source_reference?" · Ref "+r.source_reference:""} · retrieved {new Date(r.retrieved_at).toLocaleString()}</small>
       <small>{r.factual_summary||"No summary entered."}</small>
     </div>
     <div className="credentialActions">
       <Badge tone={r.reliability==="official_primary"||r.reliability==="investigator_verified"?"green":r.reliability==="disputed"?"red":"amber"}>{r.reliability.replaceAll("_"," ")}</Badge>
       <Link className="textBtn" href={"/sources/"+r.id}>View source record</Link>
     </div>
   </article>)}</div>:<Empty text="No source records linked to this case yet."/>}
 </section>;
}

function MapView({rows}:{rows:any[]}){
 const located=rows.filter(x=>x.location_text);
 const unique=located.filter((row:any,index:number,all:any[])=>all.findIndex(x=>x.location_text===row.location_text)===index);
 const [active,setActive]=useState(0);
 const point=unique[active]||unique[0];
 const mapUrl=point?"https://www.google.com/maps?q="+encodeURIComponent(point.location_text)+"&output=embed":"";

 return <section className="panel">
   <div className="panelHead"><div><h2>Case map</h2><p>Open case locations directly inside WETrace. Select a location below to move the map.</p></div><Badge tone="blue">{unique.length+" location"+(unique.length===1?"":"s")}</Badge></div>

   {point?<>
     <div className="formNotice">
       <strong>Mapped location</strong>
       <p>{point.location_text} · {point.title}</p>
     </div>

     <div style={{width:"100%",height:480,borderRadius:16,overflow:"hidden",border:"1px solid rgba(255,255,255,.12)",marginBottom:18}}>
       <iframe
         src={mapUrl}
         title={"WETrace map — "+point.location_text}
         width="100%"
         height="100%"
         style={{border:0}}
         loading="lazy"
         referrerPolicy="no-referrer-when-downgrade"
       />
     </div>

     <div className="recordGrid">
       {unique.map((e:any,i:number)=><button type="button" className="recordCard linkCard" key={e.id} onClick={()=>setActive(i)} style={{textAlign:"left",width:"100%"}}>
         <div><strong>{e.location_text}</strong><small>{new Date(e.event_time).toLocaleString()} · {e.title}</small></div>
         <Badge tone={i===active?"green":"blue"}>{i===active?"On map":(e.confidence??"—")+"%"}</Badge>
       </button>)}
     </div>

     <div className="formNotice">
       <strong>Location accuracy</strong>
       <p>The map uses the location text recorded in the case timeline. It is a research aid, not proof of an exact event location. WETrace should preserve block-level or approximate locations when a precise modern private address is unnecessary.</p>
     </div>
   </>:<Empty text="No mapped locations yet."/>}
 </section>;
}

function TasksView({rows,caseId,organizationId,profiles,onReload}:{rows:any[];caseId:string;organizationId:string;profiles:Record<string,string>;onReload:()=>void}){
 const {supabase,user}=useWorkspace();
 const [title,setTitle]=useState("");
 const [priority,setPriority]=useState("medium");
 const [busy,setBusy]=useState(false);

 const add=async(e:FormEvent)=>{
   e.preventDefault();
   if(!user)return;
   setBusy(true);
   await supabase.from("tasks").insert({
     organization_id:organizationId,
     case_id:caseId,
     title,
     priority,
     status:"open",
     created_by:user.id,
     assigned_to:user.id
   });
   setTitle("");setBusy(false);onReload();
 };

 const done=async(taskId:string)=>{
   await supabase.from("tasks").update({status:"done"}).eq("id",taskId);
   onReload();
 };

 return <section className="panel">
   <div className="panelHead"><div><h2>Tasks</h2><p>Assigned investigative work and follow-ups.</p></div></div>
   <form className="inlineComposer" onSubmit={add}>
     <input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="Task title"/>
     <select value={priority} onChange={e=>setPriority(e.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select>
     <button className="primaryBtn inlineBtn" disabled={busy}>{busy?"Adding…":"＋ Add task"}</button>
   </form>
   {rows.length
     ?<div className="recordGrid">{rows.map((r:any)=><article className="recordCard" key={r.id}>
       <div><strong>{r.title}</strong><small>{profiles[r.assigned_to]||"Assigned"} · {r.status}</small></div>
       {r.status!=="done"?<button className="textBtn" onClick={()=>done(r.id)}>Mark done</button>:<Badge tone="green">Done</Badge>}
     </article>)}</div>
     :<Empty text="No tasks yet."/>}
 </section>;
}

function MessagesView({rows,caseId,organizationId,profiles,onReload}:{rows:any[];caseId:string;organizationId:string;profiles:Record<string,string>;onReload:()=>void}){
 const {supabase,user}=useWorkspace();
 const [body,setBody]=useState("");
 const [visibility,setVisibility]=useState("internal");
 const [busy,setBusy]=useState(false);

 const add=async(e:FormEvent)=>{
   e.preventDefault();
   if(!user)return;
   setBusy(true);
   await supabase.from("case_messages").insert({
     organization_id:organizationId,
     case_id:caseId,
     sender_user_id:user.id,
     body,
     visibility
   });
   setBody("");setBusy(false);onReload();
 };

 return <section className="panel">
   <div className="panelHead"><div><h2>Communications</h2><p>Internal notes and explicitly client-visible messages.</p></div></div>
   <form className="inlineComposer" onSubmit={add}>
     <textarea required value={body} onChange={e=>setBody(e.target.value)} placeholder="Message or internal note"/>
     <select value={visibility} onChange={e=>setVisibility(e.target.value)}><option value="internal">Internal only</option><option value="client">Client-visible</option></select>
     <button className="primaryBtn inlineBtn" disabled={busy}>{busy?"Posting…":"Post message"}</button>
   </form>
   {rows.length
     ?<div className="messageList">{rows.map((r:any)=><article className="messageCard" key={r.id}>
       <div><strong>{profiles[r.sender_user_id]||"Team member"}</strong><Badge tone={r.visibility==="client"?"green":"slate"}>{r.visibility}</Badge></div>
       <p>{r.body}</p><small>{new Date(r.created_at).toLocaleString()}</small>
     </article>)}</div>
     :<Empty text="No communications yet."/>}
 </section>;
}

function ReportsView({rows,caseId,organizationId,onReload}:{rows:any[];caseId:string;organizationId:string;onReload:()=>void}){
 const {supabase,user}=useWorkspace();
 const [title,setTitle]=useState("");
 const [body,setBody]=useState("");
 const [busy,setBusy]=useState(false);

 const add=async(e:FormEvent)=>{
   e.preventDefault();
   if(!user)return;
   setBusy(true);
   await supabase.from("reports").insert({
     organization_id:organizationId,
     case_id:caseId,
     title,
     report_type:"investigation",
     status:"draft",
     content:{body},
     generated_by:user.id
   });
   setTitle("");setBody("");setBusy(false);onReload();
 };

 return <section className="panel">
   <div className="panelHead"><div><h2>Reports</h2><p>Case reports tied to the live record. Only released reports can be shown to clients.</p></div></div>
   <form className="inlineComposer" onSubmit={add}>
     <input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="Report title"/>
     <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="Report body"/>
     <button className="primaryBtn inlineBtn" disabled={busy}>{busy?"Creating…":"＋ Create draft"}</button>
   </form>
   {rows.length
     ?<div className="recordGrid">{rows.map((r:any)=><Link href={"/reports/"+r.id} className="recordCard linkCard" key={r.id}><div><strong>{r.title}</strong><small>{r.report_type} · {new Date(r.updated_at).toLocaleString()}</small></div><Badge tone={r.status==="released"?"green":"amber"}>{r.status}</Badge></Link>)}</div>
     :<Empty text="No reports yet."/>}
 </section>;
}

function BillingView({timeEntries,expenses,caseId,organizationId,currency,onReload}:{timeEntries:any[];expenses:any[];caseId:string;organizationId:string;currency:string;onReload:()=>void}){
 const {supabase,user}=useWorkspace();
 const [minutes,setMinutes]=useState("60");
 const [rate,setRate]=useState("");
 const [work,setWork]=useState("");
 const [amount,setAmount]=useState("");
 const [category,setCategory]=useState("field");
 const [busy,setBusy]=useState(false);

 const addTime=async(e:FormEvent)=>{
   e.preventDefault();
   if(!user)return;
   setBusy(true);
   await supabase.from("time_entries").insert({
     organization_id:organizationId,
     case_id:caseId,
     user_id:user.id,
     minutes:Number(minutes),
     hourly_rate:rate?Number(rate):null,
     description:work||null
   });
   setWork("");setBusy(false);onReload();
 };

 const addExpense=async(e:FormEvent)=>{
   e.preventDefault();
   if(!user)return;
   setBusy(true);
   await supabase.from("expenses").insert({
     organization_id:organizationId,
     case_id:caseId,
     user_id:user.id,
     category,
     amount:Number(amount),
     currency,
     description:category
   });
   setAmount("");setBusy(false);onReload();
 };

 const totalMinutes=timeEntries.reduce((s,x)=>s+(x.minutes||0),0);
 const expenseTotal=expenses.reduce((s,x)=>s+Number(x.amount||0),0);

 return <div className="caseWorkspaceGrid">
   <section className="panel">
     <div className="panelHead"><div><h2>Time</h2><p>{Math.floor(totalMinutes/60)}h {totalMinutes%60}m recorded</p></div></div>
     <form className="inlineComposer" onSubmit={addTime}>
       <input type="number" min="1" required value={minutes} onChange={e=>setMinutes(e.target.value)} placeholder="Minutes"/>
       <input type="number" min="0" step="0.01" value={rate} onChange={e=>setRate(e.target.value)} placeholder={"Hourly rate "+currency}/>
       <input value={work} onChange={e=>setWork(e.target.value)} placeholder="Work performed"/>
       <button className="primaryBtn inlineBtn" disabled={busy}>Add time</button>
     </form>
   </section>

   <section className="panel">
     <div className="panelHead"><div><h2>Expenses</h2><p>{currency} {expenseTotal.toFixed(2)} recorded</p></div></div>
     <form className="inlineComposer" onSubmit={addExpense}>
       <input type="number" min="0" step="0.01" required value={amount} onChange={e=>setAmount(e.target.value)} placeholder={"Amount "+currency}/>
       <select value={category} onChange={e=>setCategory(e.target.value)}><option value="field">Field work</option><option value="travel">Travel</option><option value="records">Records</option><option value="lab">Lab/provider</option><option value="other">Other</option></select>
       <button className="primaryBtn inlineBtn" disabled={busy}>Add expense</button>
     </form>
   </section>
 </div>;
}

function AuditView({rows}:{rows:any[]}){
 return <section className="panel">
   <div className="panelHead"><div><h2>Audit history</h2><p>Append-only backend events visible to authorized owners/admins.</p></div></div>
   {rows.length
     ?<div className="tableWrap"><table>
       <thead><tr><th>Time</th><th>Action</th><th>Entity</th><th>ID</th></tr></thead>
       <tbody>{rows.map(r=><tr key={r.id}><td>{new Date(r.created_at).toLocaleString()}</td><td>{r.action}</td><td>{r.entity_type}</td><td className="muted">{r.entity_id||"—"}</td></tr>)}</tbody>
     </table></div>
     :<Empty text="No audit events visible to this account."/>}
 </section>;
}