"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import type {User} from "@supabase/supabase-js";
import {getSupabaseBrowserClient} from "./supabase";

export type WorkspaceProfile={
  id:string;
  display_name:string;
  email:string|null;
  global_role:string;
  preferred_language:string;
};

export type WorkspaceMembership={
  organization_id:string;
  organization_role:string;
  status:string;
};

export type WorkspaceOrganization={
  id:string;
  name:string;
  country_code:string|null;
  preferred_language:string;
  default_currency:string;
  created_by:string;
};

export function useWorkspace(){
  const supabase=useMemo(()=>getSupabaseBrowserClient(),[]);
  const [loading,setLoading]=useState(true);
  const [user,setUser]=useState<User|null>(null);
  const [profile,setProfile]=useState<WorkspaceProfile|null>(null);
  const [membership,setMembership]=useState<WorkspaceMembership|null>(null);
  const [organization,setOrganization]=useState<WorkspaceOrganization|null>(null);
  const [error,setError]=useState<string|null>(null);

  const refresh=useCallback(async()=>{
    setLoading(true);
    setError(null);

    const {data:{user:current},error:userError}=await supabase.auth.getUser();
    if(userError||!current){
      setUser(null);
      setProfile(null);
      setMembership(null);
      setOrganization(null);
      setLoading(false);
      return;
    }

    setUser(current);

    const [{data:p,error:pErr},{data:m,error:mErr}]=await Promise.all([
      supabase
        .from("profiles")
        .select("id,display_name,email,global_role,preferred_language")
        .eq("id",current.id)
        .maybeSingle(),
      supabase
        .from("organization_members")
        .select("organization_id,organization_role,status")
        .eq("user_id",current.id)
        .eq("status","active")
        .limit(1)
        .maybeSingle()
    ]);

    if(pErr)setError(pErr.message);
    if(mErr)setError(mErr.message);

    setProfile((p as WorkspaceProfile|null)||null);
    const mem=(m as WorkspaceMembership|null)||null;
    setMembership(mem);

    if(mem?.organization_id){
      const {data:o,error:oErr}=await supabase
        .from("organizations")
        .select("id,name,country_code,preferred_language,default_currency,created_by")
        .eq("id",mem.organization_id)
        .maybeSingle();

      if(oErr)setError(oErr.message);
      setOrganization((o as WorkspaceOrganization|null)||null);
    }else{
      setOrganization(null);
    }

    setLoading(false);
  },[supabase]);

  useEffect(()=>{
    refresh();
    const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>{refresh();});
    return ()=>subscription.unsubscribe();
  },[refresh,supabase]);

  return {supabase,loading,user,profile,membership,organization,error,refresh};
}