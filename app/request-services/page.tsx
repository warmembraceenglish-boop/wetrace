"use client";

import Link from "next/link";
import {FormEvent,useMemo,useState} from "react";
import Logo from "../components/Logo";
import {getSupabaseBrowserClient} from "../lib/supabase";

const services=[
  "Initial Consultation — $75 / 45 minutes",
  "Missing Person Investigation",
  "Skip Trace",
  "Insurance Fraud Investigation",
  "Corporate Investigation",
  "Background Check / Investigation",
  "Civil / Litigation Support",
  "Criminal Defense Support",
  "Genealogy / Heir Trace",
  "Forensic / Evidence Review",
  "Other / Custom Investigation"
];

export default function RequestServices(){
 const supabase=useMemo(()=>getSupabaseBrowserClient(),[]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const [requestNumber,setRequestNumber]=useState<string|null>(null);
 const [form,setForm]=useState({
   fullName:"",
   email:"",
   phone:"",
   country:"",
   jurisdiction:"",
   preferredContact:"email",
   serviceType:"Missing Person",
   summary:"",
   urgency:"normal",
   consent:false,
   lawful:false,
   privacy:false,
   website:""
 });

 const submit=async(e:FormEvent)=>{
   e.preventDefault();
   setBusy(true);setError(null);

   const {data,error}=await supabase.functions.invoke("submit-service-request",{
     body:{
       full_name:form.fullName,
       email:form.email,
       phone:form.phone,
       country:form.country,
       jurisdiction:form.jurisdiction,
       preferred_contact:form.preferredContact,
       service_type:form.serviceType,
       case_summary:form.summary,
       urgency:form.urgency,
       consent_to_contact:form.consent,
       lawful_purpose_ack:form.lawful,
       privacy_ack:form.privacy,
       website:form.website
     }
   });

   setBusy(false);

   if(error){
     setError(error.message);
     return;
   }

   if(data?.error){
     setError(data.error);
     return;
   }

   setRequestNumber(data?.request_number||"Submitted");
 };

 if(requestNumber){
   return <main className="publicIntakePage">
     <header className="publicIntakeHeader"><Logo/><Link href="/login" className="secondaryBtn inlineBtn">Investigator sign in</Link></header>
     <section className="publicSuccess">
       <div className="successIcon">✓</div>
       <p className="eyebrow">REQUEST RECEIVED</p>
       <h1>Your request has been submitted.</h1>
       <p>Reference: <strong>{requestNumber}</strong></p>
       <p>WETrace stores this request privately. An investigator or administrator can review it and contact you using the method you selected.</p>
       <div className="formNotice"><strong>Emergency situations</strong><p>If someone is in immediate danger, missing under suspicious circumstances, suicidal, abducted, medically vulnerable, or at risk of violence, contact local law enforcement or emergency services immediately. This form is not an emergency dispatch service.</p></div>
       <Link href="/" className="primaryBtn inlineBtn">Return to WETrace</Link>
     </section>
   </main>;
 }

 return <main className="publicIntakePage">
   <header className="publicIntakeHeader"><Logo/><Link href="/login" className="secondaryBtn inlineBtn">Investigator sign in</Link></header>

   <div className="publicIntakeHero">
     <p className="eyebrow">REQUEST INVESTIGATION SERVICES</p>
     <h1>Tell us what you need help with.</h1>
     <p>Submit a private service request for missing-person work, skip tracing, fraud investigations, records research, litigation support, genealogy, evidence review and other lawful investigative services.</p>
   </div>

   <section className="publicIntakeCard">
     {error&&<div className="inlineAlert error">{error}</div>}

     <form className="formGrid" onSubmit={submit}>
       <label>Full name<input required value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})}/></label>
       <label>Email<input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
       <label>Phone / WhatsApp (optional)<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label>
       <label>Preferred contact<select value={form.preferredContact} onChange={e=>setForm({...form,preferredContact:e.target.value})}><option value="email">Email</option><option value="phone">Phone / messaging</option></select></label>
       <label>Country<input value={form.country} onChange={e=>setForm({...form,country:e.target.value})}/></label>
       <label>Jurisdiction / city / region<input value={form.jurisdiction} onChange={e=>setForm({...form,jurisdiction:e.target.value})}/></label>
       <label>Service needed<select value={form.serviceType} onChange={e=>setForm({...form,serviceType:e.target.value})}>{services.map(s=><option key={s}>{s}</option>)}</select></label>
       <label>Urgency<select value={form.urgency} onChange={e=>setForm({...form,urgency:e.target.value})}><option value="normal">Normal</option><option value="urgent">Urgent</option><option value="emergency">Emergency / immediate risk</option></select></label>
       <label className="full">What happened / what do you need established?<textarea required minLength={20} rows={8} value={form.summary} onChange={e=>setForm({...form,summary:e.target.value})} placeholder="Describe the situation, known facts, relevant dates, locations, people involved, and the outcome you are seeking. Do not include passwords, financial account credentials, or information you are not authorized to share."/></label>

       {form.urgency==="emergency"&&<div className="formNotice full dangerNotice"><strong>Do not wait on this form for an emergency response.</strong><p>Contact local police or emergency services now if there is immediate danger, suspected abduction, violence, suicidal risk, or urgent medical vulnerability.</p></div>}

       <label className="checkboxLine full"><input type="checkbox" required checked={form.consent} onChange={e=>setForm({...form,consent:e.target.checked})}/><span>I consent to being contacted about this request.</span></label>
       <label className="checkboxLine full"><input type="checkbox" required checked={form.lawful} onChange={e=>setForm({...form,lawful:e.target.checked})}/><span>I am requesting services for a lawful purpose and will not use WETrace to stalk, harass, unlawfully track, impersonate, hack, or access restricted information without authorization.</span></label>
       <label className="checkboxLine full"><input type="checkbox" required checked={form.privacy} onChange={e=>setForm({...form,privacy:e.target.checked})}/><span>I understand the information I submit will be stored privately for intake and case-review purposes.</span></label>

       <label className="honeypot" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={e=>setForm({...form,website:e.target.value})}/></label>

       <div className="formActions full">
         <button className="primaryBtn inlineBtn" disabled={busy||!form.consent||!form.lawful||!form.privacy}>{busy?"Submitting securely…":"Submit service request"}</button>
       </div>
     </form>
   </section>
 </main>;
}