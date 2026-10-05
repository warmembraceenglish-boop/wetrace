"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import AppShell from "../components/AppShell";
import Badge from "../components/Badge";
import {useWorkspace} from "../lib/useWorkspace";

const roles=["admin","lead_investigator","investigator","researcher","forensic_examiner","billing","client"];

export default function Administration(){
 const {supabase,organization,membership}=useWorkspace();
 const [members,setMembers]=useState<any[]>([]);
 const [profiles,setProfiles]=useState<Record<string,any>>({});
 const [error,setError]=useState<string|null>(null);
 const canManage=["owner","admin"].includes(membership?.organization_role||"");

 const load=async()=>{
   if(!organization)return;

   const {data:m}=await supabase
     .from("organization_members")
     .select("user_id,organization_role,status,joined_at")
     .eq("organization_id",organization.id)
     .order("joined_at",{ascending:true});

   const ids=(m||[]).map((x:any)=>x.user_id);
   let map:Record<string,any>={};

   if(ids.length){
     const {data:p}=await supabase.from("profiles").select("id,display_name,email").in("id",ids);
     map=Object.fromEntries((p||[]).map((x:any)=>[x.id,x]));
   }

   setProfiles(map);
   setMembers(m||[]);
 };

 useEffect(()=>{load();},[organization?.id]);

 const setRole=async(userId:string,role:string)=>{
   if(!organization||!canManage)return;
   setError(null);

   const {error}=await supabase
     .from("organization_members")
     .update({organization_role:role})
     .eq("organization_id",organization.id)
     .eq("user_id",userId);

   if(error)setError(error.message);
   else load();
 };

 return <AppShell
   title="Administration"
   subtitle="Organization, team roles, security posture and live access controls."
   actions={canManage?<div className="caseHeaderActions"><Link href="/investigators" className="primaryBtn inlineBtn">＋ Invite team member</Link><Link href="/service-requests" className="secondaryBtn inlineBtn">Service requests</Link></div>:undefined}
 >
   {error&&<div className="inlineAlert error">{error}</div>}

   <div className="caseWorkspaceGrid">
     <section className="panel">
       <div className="panelHead"><div><h2>Organization</h2><p>Live workspace configuration.</p></div><Badge tone="green">SECURED</Badge></div>
       <div className="profileDetail"><small>Name</small><strong>{organization?.name}</strong></div>
       <div className="profileDetail"><small>Country</small><strong>{organization?.country_code||"—"}</strong></div>
       <div className="profileDetail"><small>Language</small><strong>{organization?.preferred_language||"en"}</strong></div>
       <div className="profileDetail"><small>Default currency</small><strong>{organization?.default_currency||"USD"}</strong></div>
     </section>

     <section className="panel">
       <div className="panelHead"><div><h2>Security posture</h2><p>Backend controls currently enforced.</p></div></div>
       <div className="gateLine"><span>Row Level Security</span><Badge tone="green">ENFORCED</Badge></div>
       <div className="gateLine"><span>Anonymous data access</span><Badge tone="green">Revoked</Badge></div>
       <div className="gateLine"><span>Evidence storage</span><Badge tone="green">Private</Badge></div>
       <div className="gateLine"><span>Credential storage</span><Badge tone="green">Private</Badge></div>
       <div className="gateLine"><span>Audit log</span><Badge tone="green">Append-only</Badge></div>
     </section>
   </div>

   <section className="panel">
     <div className="panelHead"><div><h2>Team & roles</h2><p>{members.length} member{members.length===1?"":"s"} in this organization.</p></div></div>

     {members.length?<div className="tableWrap"><table>
       <thead><tr><th>Member</th><th>Email</th><th>Status</th><th>Role</th><th>Joined</th></tr></thead>
       <tbody>{members.map(m=>{
         const p=profiles[m.user_id];
         return <tr key={m.user_id}>
           <td><Link className="caseLink" href={"/investigators/"+m.user_id}><strong>{p?.display_name||"Team member"}</strong></Link></td>
           <td>{p?.email||"—"}</td>
           <td><Badge tone={m.status==="active"?"green":"amber"}>{m.status}</Badge></td>
           <td>{canManage&&m.organization_role!=="owner"
             ?<select className="compactSelect" value={m.organization_role} onChange={e=>setRole(m.user_id,e.target.value)}>{roles.map(r=><option key={r} value={r}>{r.replaceAll("_"," ")}</option>)}</select>
             :m.organization_role.replaceAll("_"," ")}</td>
           <td className="muted">{new Date(m.joined_at).toLocaleDateString()}</td>
         </tr>;
       })}</tbody>
     </table></div>:<div className="emptyState compact"><strong>No team members yet</strong></div>}
   </section>
 </AppShell>;
}