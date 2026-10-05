"use client";

import Link from "next/link";
import {FormEvent,useEffect,useState} from "react";
import AppShell from "../components/AppShell";
import Badge from "../components/Badge";
import {useWorkspace} from "../lib/useWorkspace";

export default function Investigators(){
 const {supabase,organization,membership}=useWorkspace();
 const [rows,setRows]=useState<any[]>([]);
 const [loading,setLoading]=useState(true);
 const [showInvite,setShowInvite]=useState(false);
 const [invite,setInvite]=useState({name:"",email:"",role:"investigator"});
 const [inviteMsg,setInviteMsg]=useState<string|null>(null);
 const [busy,setBusy]=useState(false);
 const canInvite=["owner","admin"].includes(membership?.organization_role||"");

 const load=async()=>{
   if(!organization)return;
   setLoading(true);

   const {data:m}=await supabase
     .from("organization_members")
     .select("user_id,organization_role,status")
     .eq("organization_id",organization.id)
     .eq("status","active");

   const ids=(m||[]).map((x:any)=>x.user_id);

   const [p,ip,cr]=await Promise.all([
     ids.length?supabase.from("profiles").select("id,display_name,email").in("id",ids):Promise.resolve({data:[]}),
     ids.length?supabase.from("investigator_profiles").select("*").in("user_id",ids):Promise.resolve({data:[]}),
     ids.length?supabase.from("investigator_credentials").select("id,investigator_user_id,verification_status").in("investigator_user_id",ids):Promise.resolve({data:[]})
   ] as any);

   const profileMap=Object.fromEntries((p.data||[]).map((x:any)=>[x.id,x]));
   const ipMap=Object.fromEntries((ip.data||[]).map((x:any)=>[x.user_id,x]));
   const creds=(cr.data||[]).reduce((a:any,x:any)=>{
     a[x.investigator_user_id]=a[x.investigator_user_id]||[];
     a[x.investigator_user_id].push(x);
     return a;
   },{});

   setRows((m||[]).map((x:any)=>({
     ...x,
     profile:profileMap[x.user_id],
     investigator:ipMap[x.user_id],
     credentials:creds[x.user_id]||[]
   })));

   setLoading(false);
 };

 useEffect(()=>{load();},[organization?.id]);

 const sendInvite=async(e:FormEvent)=>{
   e.preventDefault();
   if(!organization)return;

   setBusy(true);
   setInviteMsg(null);

   const {data,error}=await supabase.functions.invoke("invite-team-member",{
     body:{
       organization_id:organization.id,
       email:invite.email,
       role:invite.role,
       display_name:invite.name
     }
   });

   setBusy(false);

   if(error){
     setInviteMsg(error.message);
     return;
   }

   setInviteMsg(data?.status==="invited"?"Invitation sent.":"Existing user added.");
   setInvite({name:"",email:"",role:"investigator"});
   load();
 };

 return <AppShell
   title="Investigator Directory"
   subtitle="Real organization members, specialties and credential status."
   actions={canInvite?<button className="primaryBtn inlineBtn" onClick={()=>setShowInvite(v=>!v)}>＋ Invite team member</button>:undefined}
 >
   {showInvite&&canInvite&&<section className="panel invitePanel">
     <div className="panelHead"><div><h2>Invite team member</h2><p>The invitation is handled by the secured Supabase Edge Function.</p></div></div>
     {inviteMsg&&<div className="inlineAlert success">{inviteMsg}</div>}
     <form className="inlineComposer" onSubmit={sendInvite}>
       <input required value={invite.name} onChange={e=>setInvite({...invite,name:e.target.value})} placeholder="Full name"/>
       <input type="email" required value={invite.email} onChange={e=>setInvite({...invite,email:e.target.value})} placeholder="Email"/>
       <select value={invite.role} onChange={e=>setInvite({...invite,role:e.target.value})}>
         <option value="lead_investigator">Lead investigator</option>
         <option value="investigator">Investigator</option>
         <option value="researcher">Researcher</option>
         <option value="forensic_examiner">Forensic examiner</option>
         <option value="billing">Billing</option>
         <option value="client">Client</option>
         <option value="admin">Admin</option>
       </select>
       <button className="primaryBtn inlineBtn" disabled={busy}>{busy?"Sending…":"Send invite"}</button>
     </form>
   </section>}

   {rows.length
     ?<div className="investigatorGrid">{rows.map(p=>{
       const name=p.profile?.display_name||p.profile?.email||"Team member";
       const inv=p.investigator;
       const verified=p.credentials.filter((c:any)=>c.verification_status==="verified").length;

       return <Link key={p.user_id} href={"/investigators/"+p.user_id} className="investigatorCard">
         <div className="investigatorHero">
           <div className="largeAvatar">{name.split(/\s+/).map((x:string)=>x[0]).join("").slice(0,2).toUpperCase()}</div>
           <div><h2>{name}</h2><p>{p.organization_role.replaceAll("_"," ")}</p><span>{inv?.service_countries?.join(", ")||"No service region entered"}</span></div>
           <Badge tone={verified?"green":"amber"}>{verified?verified+" verified":"Unverified"}</Badge>
         </div>

         <div className="specialtyWrap">
           {(inv?.specialties||[]).length
             ?(inv.specialties||[]).map((s:string)=><span key={s}>{s}</span>)
             :<span>No specialties entered</span>}
         </div>

         <div className="profileStats">
           <div><small>Experience</small><strong>{inv?.years_experience??"—"} years</strong></div>
           <div><small>Languages</small><strong>{inv?.languages?.join(", ")||"—"}</strong></div>
           <div><small>Availability</small><strong>{inv?.availability||"—"}</strong></div>
         </div>

         <div className="credentialPreview"><span>✓</span>{p.credentials.length} credential{p.credentials.length===1?"":"s"} on file</div>
       </Link>;
     })}</div>
     :!loading&&<div className="emptyState"><strong>No team profiles yet</strong><p>Invite an investigator or complete your director profile.</p></div>}
 </AppShell>;
}