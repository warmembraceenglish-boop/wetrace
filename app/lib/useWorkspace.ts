"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import type {User} from "@supabase/supabase-js";
import {getSupabaseBrowserClient} from "./supabase";

export function useWorkspace(){
 const supabase=useMemo(()=>getSupabaseBrowserClient(),[]);
 const [loading,setLoading]=useState(true);
 const [user,setUser]=useState<User|null>(null);
 const [profile,setProfile]=useState<any>(null);
 const [membership,setMembership]=useState<any>(null);
 const [organization,setOrganization]=useState<any>(null);
 const [error,setError]=useState<string|null>(null);

 const refresh=useCallback(async()=>{
   setLoading(true);setError(null);
   const {data:{user:u},error:ue}=await supabase.auth.getUser();
   if(ue||!u){setUser(null);setProfile(null);setMembership(null);setOrganization(null);setLoading(false);return;}
   setUser(u);
   const [{data:p,error:pe},{data:m,error:me}]=await Promise.all([
     supabase.from("profiles").select("*").eq("id",u.id).maybeSingle(),
     supabase.from("organization_members").select("*").eq("user_id",u.id).eq("status","active").limit(1).maybeSingle()
   ]);
   if(pe)setError(pe.message); if(me)setError(me.message);
   setProfile(p||null); setMembership(m||null);
   if(m?.organization_id){
     const {data:o,error:oe}=await supabase.from("organizations").select("*").eq("id",m.organization_id).maybeSingle();
     if(oe)setError(oe.message); setOrganization(o||null);
   }else setOrganization(null);
   setLoading(false);
 },[supabase]);

 useEffect(()=>{refresh();const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>refresh());return()=>subscription.unsubscribe();},[refresh,supabase]);
 return {supabase,loading,user,profile,membership,organization,error,refresh};
}
