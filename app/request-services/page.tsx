"use client";
import Link from "next/link";
import {FormEvent,useMemo,useState} from "react";
import Logo from "../components/Logo";
import {getSupabaseBrowserClient} from "../lib/supabase";

export default function RequestServices(){
 const supabase=useMemo(()=>getSupabaseBrowserClient(),[]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const [ref,setRef]=useState<string|null>(null);
 const [f,setF]=useState({name:"",email:"",country:"",jurisdiction:"",service:"Missing Person",summary:"",urgency:"normal",consent:false,lawful:false,privacy:false});

 const submit=async(e:FormEvent)=>{
  e.preventDefault();setBusy(true);setError(null);
  const {data,error}=await supabase.functions.invoke("submit-service-request",{body:{
   full_name:f.name,email:f.email,country:f.country,jurisdiction:f.jurisdiction,
   service_type:f.service,case_summary:f.summary,urgency:f.urgency,
   consent_to_contact:f.consent,lawful_purpose_ack:f.lawful,privacy_ack:f.privacy
  }});
  setBusy(false);
  if(error){setError(error.message);return}
  if(data?.error){setError(data.error);return}
  setRef(data?.request_number||"Submitted");
 };

 if(ref)return <main className="public"><header className="publicHead"><Logo/><Link className="btn alt" href="/login">Investigator sign in</Link></header><section className="publicCard panel" style={{marginTop:70,textAlign:"center"}}><h2>Request received</h2><p>Reference: <b>{ref}</b></p><p>Your request is stored privately for review.</p></section></main>;

 return <main className="public">
  <header className="publicHead"><Logo/><Link className="btn alt" href="/login">Investigator sign in</Link></header>
  <div className="publicHero"><p style={{fontSize:9,letterSpacing:2,color:"#29c3e8"}}>REQUEST INVESTIGATION SERVICES</p><h1>Tell us what you need help with.</h1><p>Submit a private request for lawful investigative services.</p></div>
  <section className="publicCard panel">
   {error&&<div className="alert error">{error}</div>}
   <form className="form" onSubmit={submit}>
    <label>Full name<input required value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></label>
    <label>Email<input type="email" required value={f.email} onChange={e=>setF({...f,email:e.target.value})}/></label>
    <label>Country<input value={f.country} onChange={e=>setF({...f,country:e.target.value})}/></label>
    <label>Jurisdiction / city<input value={f.jurisdiction} onChange={e=>setF({...f,jurisdiction:e.target.value})}/></label>
    <label>Service<select value={f.service} onChange={e=>setF({...f,service:e.target.value})}><option>Missing Person</option><option>Skip Trace</option><option>Insurance Fraud</option><option>Corporate Investigation</option><option>Background Investigation</option><option>Civil / Litigation Support</option><option>Genealogy / Heir Trace</option><option>Forensic / Evidence Review</option><option>Other</option></select></label>
    <label>Urgency<select value={f.urgency} onChange={e=>setF({...f,urgency:e.target.value})}><option value="normal">Normal</option><option value="urgent">Urgent</option><option value="emergency">Emergency / immediate risk</option></select></label>
    <label className="full">Summary<textarea required minLength={20} rows={8} value={f.summary} onChange={e=>setF({...f,summary:e.target.value})}/></label>
    {f.urgency==="emergency"&&<div className="alert error full">If anyone is in immediate danger, contact local emergency services or law enforcement now.</div>}
    <label className="full" style={{flexDirection:"row",alignItems:"center"}}><input style={{width:18}} type="checkbox" required checked={f.consent} onChange={e=>setF({...f,consent:e.target.checked})}/> I consent to being contacted.</label>
    <label className="full" style={{flexDirection:"row",alignItems:"center"}}><input style={{width:18}} type="checkbox" required checked={f.lawful} onChange={e=>setF({...f,lawful:e.target.checked})}/> I am requesting services for a lawful purpose.</label>
    <label className="full" style={{flexDirection:"row",alignItems:"center"}}><input style={{width:18}} type="checkbox" required checked={f.privacy} onChange={e=>setF({...f,privacy:e.target.checked})}/> I understand the information will be stored privately for intake review.</label>
    <div className="full"><button className="btn" disabled={busy||!f.consent||!f.lawful||!f.privacy}>{busy?"Submitting…":"Submit service request"}</button></div>
   </form>
  </section>
 </main>;
}
