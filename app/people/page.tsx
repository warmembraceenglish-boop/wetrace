"use client";

import {useEffect,useState} from "react";
import AppShell from "../components/AppShell";
import Badge from "../components/Badge";
import {useWorkspace} from "../lib/useWorkspace";

export default function People(){
 const {supabase,organization}=useWorkspace();
 const [rows,setRows]=useState<any[]>([]);
 const [loading,setLoading]=useState(true);

 useEffect(()=>{
   if(!organization)return;
   (async()=>{
     const {data}=await supabase
       .from("people")
       .select("id,display_name,aliases,nationality,sensitivity,created_at")
       .eq("organization_id",organization.id)
       .order("created_at",{ascending:false});
     setRows(data||[]);
     setLoading(false);
   })();
 },[organization,supabase]);

 return <AppShell title="People" subtitle="Real people records visible to your organization and case permissions.">
   <section className="panel">
     <div className="panelHead"><div><h2>People register</h2><p>{loading?"Loading…":rows.length+" record"+(rows.length===1?"":"s")+" visible"}</p></div></div>
     {rows.length
       ?<div className="recordGrid">
         {rows.map(p=><article className="recordCard" key={p.id}>
           <div className="personAvatar">{p.display_name.split(/\s+/).map((x:string)=>x[0]).join("").slice(0,2).toUpperCase()}</div>
           <div><strong>{p.display_name}</strong><small>{p.aliases?.length?"Aliases: "+p.aliases.join(", "):"No aliases"}{p.nationality?" · "+p.nationality:""}</small></div>
           <Badge tone={p.sensitivity==="biometric"||p.sensitivity==="genetic"?"red":p.sensitivity==="restricted"?"amber":"blue"}>{p.sensitivity}</Badge>
         </article>)}
       </div>
       :!loading&&<div className="emptyState"><strong>No people records yet</strong><p>Add people from the People tab inside a case workspace so they remain tied to an investigation.</p></div>}
   </section>
 </AppShell>;
}