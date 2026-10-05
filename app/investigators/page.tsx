"use client";
import {useEffect,useState} from "react";
import AppShell from "../components/AppShell";
import Badge from "../components/Badge";
import {useWorkspace} from "../lib/useWorkspace";

export default function Investigators(){
 const {supabase,organization}=useWorkspace();
 const [rows,setRows]=useState<any[]>([]);
 useEffect(()=>{
  if(!organization)return;
  (async()=>{
   const {data:m}=await supabase.from("organization_members").select("user_id,organization_role,status").eq("organization_id",organization.id).eq("status","active");
   const ids=(m||[]).map((x:any)=>x.user_id);
   if(!ids.length){setRows([]);return;}
   const [{data:p},{data:i},{data:c}]=await Promise.all([
    supabase.from("profiles").select("id,display_name,email,global_role").in("id",ids),
    supabase.from("investigator_profiles").select("*").in("user_id",ids),
    supabase.from("investigator_credentials").select("investigator_user_id,verification_status").in("investigator_user_id",ids)
   ]);
   const pm=Object.fromEntries((p||[]).map((x:any)=>[x.id,x]));
   const im=Object.fromEntries((i||[]).map((x:any)=>[x.user_id,x]));
   setRows((m||[]).map((x:any)=>({...x,profile:pm[x.user_id],inv:im[x.user_id],verified:(c||[]).filter((q:any)=>q.investigator_user_id===x.user_id&&q.verification_status==="verified").length})));
  })();
 },[organization?.id,supabase]);

 return <AppShell title="Investigators" subtitle="Real team profiles and credential verification state.">
  <div className="photoGrid">
   {rows.map(r=><article className="photoCard" key={r.user_id}><div>
    <strong>{r.profile?.display_name||r.profile?.email||"Team member"}</strong>
    <small>{r.profile?.global_role==="platform_admin"?"Super Admin":String(r.organization_role).replaceAll("_"," ")}</small>
    <p style={{fontSize:9,color:"#8ca4b4"}}>{r.inv?.specialties?.join(", ")||"No specialties entered"}</p>
    <p style={{fontSize:9,color:"#8ca4b4"}}>{r.inv?.service_countries?.join(", ")||"No service countries entered"}</p>
    <Badge tone={r.verified?"green":"amber"}>{r.verified?r.verified+" verified credential(s)":"Credentials unverified"}</Badge>
   </div></article>)}
  </div>
 </AppShell>;
}
