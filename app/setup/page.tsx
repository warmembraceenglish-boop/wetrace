"use client";
import {FormEvent,useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import Logo from "../components/Logo";
import {getSupabaseBrowserClient} from "../lib/supabase";

export default function Setup(){
 const router=useRouter(),supabase=useMemo(()=>getSupabaseBrowserClient(),[]);
 const [uid,setUid]=useState<string|null>(null),[name,setName]=useState(""),[agency,setAgency]=useState("Oppa Investigations"),[country,setCountry]=useState("VN"),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);
 useEffect(()=>{(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user){router.replace("/login");return;}setUid(user.id);setName(user.user_metadata?.display_name||user.email?.split("@")[0]||"");
 const {data:m}=await supabase.from("organization_members").select("organization_id").eq("user_id",user.id).eq("status","active").limit(1).maybeSingle();if(m?.organization_id)router.replace("/");})()},[router,supabase]);
 const create=async(e:FormEvent)=>{e.preventDefault();if(!uid)return;setBusy(true);setError(null);const {data:{user}}=await supabase.auth.getUser();if(!user)return;
 await supabase.from("profiles").upsert({id:uid,display_name:name,email:user.email,preferred_language:"en"},{onConflict:"id"});
 const {data:o,error:oe}=await supabase.from("organizations").insert({name:agency,country_code:country,created_by:uid,preferred_language:"en",default_currency:"USD"}).select("id").single();if(oe||!o){setError(oe?.message||"Could not create workspace");setBusy(false);return;}
 const {error:me}=await supabase.from("organization_members").insert({organization_id:o.id,user_id:uid,organization_role:"owner",status:"active"});if(me){setError(me.message);setBusy(false);return;}router.replace("/");};
 return <main className="public"><div className="publicHead"><Logo/></div><section className="publicCard panel" style={{maxWidth:720,marginTop:70}}><h2>Workspace setup</h2><p>Your existing organization will open automatically. Use this only if your account does not already belong to a workspace.</p>{error&&<div className="alert error">{error}</div>}<form className="form" onSubmit={create}><label>Director name<input value={name} onChange={e=>setName(e.target.value)} required/></label><label>Agency name<input value={agency} onChange={e=>setAgency(e.target.value)} required/></label><label>Country<input value={country} onChange={e=>setCountry(e.target.value)} required/></label><div className="full"><button className="btn" disabled={busy}>{busy?"Creating…":"Create workspace"}</button></div></form></section></main>;
}
