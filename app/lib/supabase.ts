import {createClient,type SupabaseClient} from "@supabase/supabase-js";

const URL=process.env.NEXT_PUBLIC_SUPABASE_URL||"https://hkexhylpdqfwjktawguh.supabase.co";
const KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||"sb_publishable_reCE-w2RPPDkmHKKTife4Q_02XGNUYM";
let client:SupabaseClient|undefined;

export function getSupabaseBrowserClient(){
  if(client)return client;
  client=createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  return client;
}
