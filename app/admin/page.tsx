"use client";
import {useEffect,useState} from "react";
import AppShell from "../components/AppShell";
import Badge from "../components/Badge";
import {useWorkspace} from "../lib/useWorkspace";

export default function Admin(){
 const {supabase,organization,profile,membership}=useWorkspace();
 const [members,setMembers]=useState<any[]>([]);
 const [profiles,setProfiles]=useState<Record<string,any>>({});
 const canManage=["owner","admin"].includes(membership?.organization_role||"")||profile?.global_role==="platform_admin";

 const load=async()=>{
  if(!organization)return;
  const {data:m}=await supabase.from("organization_members").select("*").eq("organization_id",organization.id).order("joined_at",{ascending:true});
  const ids=(m||[]).map((x:any)=>x.user_id);
  if(ids.length){
   const {data:p}=await supabase.from("profiles").select("id,display_name,email,global_role").in("id",ids);
   setProfiles(Object.fromEntries((p||[]).map((x:any)=>[x.id,x])));
  }
  setMembers(m||[]);
 };
 useEffect(()=>{load()},[organization?.id]);

 const setRole=async(id:string,role:string)=>{if(!organization||!canManage)return;await supabase.from("organization_members").update({organization_role:role}).eq("organization_id",organization.id).eq("user_id",id);load()};

 return <AppShell title="Administration" subtitle="Organization, team roles and security posture.">
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
   <section className="panel"><h2>Organization</h2><p>{organization?.name}</p><table className="table"><tbody><tr><td>Country</td><td>{organization?.country_code||"—"}</td></tr><tr><td>Language</td><td>{organization?.preferred_language||"en"}</td></tr><tr><td>Currency</td><td>{organization?.default_currency||"USD"}</td></tr></tbody></table></section>
   <section className="panel"><h2>Security posture</h2><table className="table"><tbody><tr><td>Row Level Security</td><td><Badge tone="green">ENFORCED</Badge></td></tr><tr><td>Evidence storage</td><td><Badge tone="green">PRIVATE</Badge></td></tr><tr><td>Super Admin</td><td><Badge tone="green">{profile?.global_role==="platform_admin"?"ACTIVE":"ROLE-GATED"}</Badge></td></tr></tbody></table></section>
  </div>
  <section className="panel"><h2>Team & roles</h2>{members.length?<table className="table"><thead><tr><th>Name</th><th>Email</th><th>Platform role</th><th>Organization role</th><th>Status</th></tr></thead><tbody>{members.map(m=>{const p=profiles[m.user_id];return <tr key={m.user_id}><td>{p?.display_name||"Team member"}</td><td>{p?.email||"—"}</td><td>{p?.global_role==="platform_admin"?"Super Admin":p?.global_role||"—"}</td><td>{canManage&&m.organization_role!=="owner"?<select value={m.organization_role} onChange={e=>setRole(m.user_id,e.target.value)}><option>admin</option><option>lead_investigator</option><option>investigator</option><option>researcher</option><option>forensic_examiner</option><option>billing</option><option>client</option></select>:m.organization_role}</td><td><Badge tone={m.status==="active"?"green":"amber"}>{m.status}</Badge></td></tr>})}</tbody></table>:<div className="empty">No team members.</div>}</section>
 </AppShell>;
}
