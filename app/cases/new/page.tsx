"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import AppShell from "../../components/AppShell";
import {useWorkspace} from "../../lib/useWorkspace";

const types=[
  "Missing Person","Skip Trace","Insurance Fraud","Corporate Investigation",
  "Criminal Defense Support","Civil Litigation","Genealogy / Heir Trace",
  "Forensics","Background Investigation","Other"
];

type TeamMember={
  user_id:string;
  organization_role:string;
  profile?:{display_name:string};
};

export default function NewCase(){
 const {supabase,user,organization}=useWorkspace();
 const [step,setStep]=useState(1);
 const [created,setCreated]=useState<{id:string;case_number:string}|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState<string|null>(null);

 const [title,setTitle]=useState("");
 const [caseType,setCaseType]=useState(types[0]);
 const [client,setClient]=useState("");
 const [priority,setPriority]=useState("medium");
 const [objective,setObjective]=useState("");
 const [primaryJurisdiction,setPrimaryJurisdiction]=useState("Vietnam");
 const [secondaryJurisdiction,setSecondaryJurisdiction]=useState("");
 const [lawfulPurpose,setLawfulPurpose]=useState("Client-authorized private investigation");
 const [authorityNotes,setAuthorityNotes]=useState("");
 const [team,setTeam]=useState<TeamMember[]>([]);
 const [lead,setLead]=useState<string>("");

 useEffect(()=>{
   if(!organization)return;
   (async()=>{
     const {data:m}=await supabase
       .from("organization_members")
       .select("user_id,organization_role")
       .eq("organization_id",organization.id)
       .eq("status","active");

     const members=(m as TeamMember[])||[];
     const ids=members.map(x=>x.user_id);

     if(ids.length){
       const {data:p}=await supabase.from("profiles").select("id,display_name").in("id",ids);
       const map=Object.fromEntries((p||[]).map((x:any)=>[x.id,x]));
       members.forEach(x=>x.profile=map[x.user_id]);
     }

     setTeam(members);
     if(user&&!lead)setLead(user.id);
   })();
 },[organization,supabase,user,lead]);

 const createCase=async()=>{
   if(!organization||!user)return;

   setBusy(true);
   setError(null);

   const jurisdictions=[primaryJurisdiction.trim(),secondaryJurisdiction.trim()].filter(Boolean);

   const {data:c,error:cErr}=await supabase
     .from("cases")
     .insert({
       organization_id:organization.id,
       title:title.trim(),
       case_type:caseType,
       priority,
       status:"active",
       jurisdictions,
       legal_basis:lawfulPurpose,
       client_reference:client.trim()||null,
       lead_investigator:lead||user.id,
       created_by:user.id,
       objective:objective.trim()||null
     })
     .select("id,case_number")
     .single();

   if(cErr||!c){
     setError(cErr?.message||"Could not create case.");
     setBusy(false);
     return;
   }

   const {error:memberErr}=await supabase.from("case_members").insert({
     case_id:c.id,
     organization_id:organization.id,
     user_id:lead||user.id,
     case_role:"lead",
     can_view_restricted:true
   });

   if(memberErr){
     setError(memberErr.message);
     setBusy(false);
     return;
   }

   if(authorityNotes.trim()){
     const {error:aErr}=await supabase.from("legal_authorizations").insert({
       organization_id:organization.id,
       case_id:c.id,
       authorization_type:"initial_authority",
       jurisdiction:jurisdictions.join(" / ")||"Unspecified",
       lawful_purpose:lawfulPurpose,
       granted_by:authorityNotes.trim(),
       created_by:user.id
     });

     if(aErr){
       setError(aErr.message);
       setBusy(false);
       return;
     }
   }

   setCreated(c);
   setBusy(false);
 };

 if(created){
   return <AppShell title="Case created" subtitle="The real case record is stored in the secured WETrace backend.">
     <section className="successPanel">
       <div className="successIcon">✓</div>
       <h2>{created.case_number} opened successfully</h2>
       <p>The case, lead assignment and authority record are now live.</p>
       <div className="formActions">
         <Link className="primaryBtn inlineBtn" href={"/cases/"+created.id}>Open case workspace</Link>
         <Link className="secondaryBtn inlineBtn" href="/cases">Back to cases</Link>
       </div>
     </section>
   </AppShell>;
 }

 return <AppShell title="Open New Case" subtitle="Create a real investigation record with jurisdiction and lawful-purpose controls.">
   <div className="wizardSteps">
     {["Case basics","Jurisdiction & authority","Team & access","Review"].map((s,i)=>
       <div key={s} className={step===i+1?"wizardStep active":step>i+1?"wizardStep done":"wizardStep"}>
         <span>{step>i+1?"✓":i+1}</span>{s}
       </div>
     )}
   </div>

   <section className="panel formPanel">
    {error&&<div className="inlineAlert error">{error}</div>}

    {step===1&&<>
      <div className="formSectionHead"><h2>Case basics</h2><p>Enter only facts you are authorized to store.</p></div>
      <div className="formGrid">
        <label>Case title<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Investigation title"/></label>
        <label>Case type<select value={caseType} onChange={e=>setCaseType(e.target.value)}>{types.map(t=><option key={t}>{t}</option>)}</select></label>
        <label>Client / requesting party<input value={client} onChange={e=>setClient(e.target.value)} placeholder="Client, family, insurer, law firm…"/></label>
        <label>Priority<select value={priority} onChange={e=>setPriority(e.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
        <label className="full">Initial objective<textarea value={objective} onChange={e=>setObjective(e.target.value)} rows={4} placeholder="What are you being asked to establish, locate, verify or document?"/></label>
      </div>
    </>}

    {step===2&&<>
      <div className="formSectionHead"><h2>Jurisdiction & lawful authority</h2><p>Record why this investigation is permitted before restricted searches are requested.</p></div>
      <div className="formGrid">
        <label>Primary jurisdiction<input value={primaryJurisdiction} onChange={e=>setPrimaryJurisdiction(e.target.value)}/></label>
        <label>Additional jurisdiction<input value={secondaryJurisdiction} onChange={e=>setSecondaryJurisdiction(e.target.value)} placeholder="Optional"/></label>
        <label className="full">Lawful purpose
          <select value={lawfulPurpose} onChange={e=>setLawfulPurpose(e.target.value)}>
            <option>Client-authorized private investigation</option>
            <option>Attorney-directed investigation</option>
            <option>Insurance claim investigation</option>
            <option>Corporate internal investigation</option>
            <option>Missing-person search</option>
            <option>Other documented lawful purpose</option>
          </select>
        </label>
        <label className="full">Authority / consent notes<textarea rows={4} value={authorityNotes} onChange={e=>setAuthorityNotes(e.target.value)} placeholder="Consent, engagement letter, court authority, insurer assignment, family request, etc."/></label>
        <div className="formNotice full"><strong>Restricted data gate</strong><p>Restricted record requests and sensitive specialist reviews remain permission-gated.</p></div>
      </div>
    </>}

    {step===3&&<>
      <div className="formSectionHead"><h2>Assign lead investigator</h2><p>Only active members of this organization are shown.</p></div>
      <div className="assignList">
        {team.map(m=>{
          const display=m.profile?.display_name||"Team member";
          return <label className="assignCard" key={m.user_id}>
            <input type="radio" name="lead" checked={lead===m.user_id} onChange={()=>setLead(m.user_id)}/>
            <span className="personAvatar">{display.split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase()}</span>
            <div><strong>{display}</strong><small>{m.organization_role.replaceAll("_"," ")}</small></div>
            <span className="badge blue">Lead</span>
          </label>;
        })}
      </div>
    </>}

    {step===4&&<>
      <div className="formSectionHead"><h2>Review & open</h2><p>WETrace will create the live case record now.</p></div>
      <div className="reviewGrid">
        <div><small>Case</small><strong>{title||"Untitled"}</strong></div>
        <div><small>Type</small><strong>{caseType}</strong></div>
        <div><small>Jurisdiction</small><strong>{[primaryJurisdiction,secondaryJurisdiction].filter(Boolean).join(" / ")}</strong></div>
        <div><small>Priority</small><strong>{priority}</strong></div>
      </div>
      <div className="formNotice"><strong>Compliance reminder</strong><p>Investigative actions remain subject to local law, licensing, contractual authority and provider terms.</p></div>
    </>}

    <div className="formActions">
      <button className="secondaryBtn inlineBtn" disabled={step===1||busy} onClick={()=>setStep(s=>Math.max(1,s-1))}>← Back</button>
      {step<4
        ?<button className="primaryBtn inlineBtn" disabled={busy||(step===1&&!title.trim())} onClick={()=>setStep(s=>Math.min(4,s+1))}>Continue →</button>
        :<button className="primaryBtn inlineBtn" disabled={busy||!title.trim()} onClick={createCase}>{busy?"Opening…":"Open case"}</button>}
    </div>
   </section>
 </AppShell>;
}