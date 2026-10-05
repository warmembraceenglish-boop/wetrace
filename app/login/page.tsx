"use client";

import {FormEvent,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import Logo from "../components/Logo";
import {getSupabaseBrowserClient} from "../lib/supabase";

export default function Login(){
 const router=useRouter();
 const supabase=useMemo(()=>getSupabaseBrowserClient(),[]);
 const [mode,setMode]=useState<"login"|"signup">("login");
 const [name,setName]=useState("");
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState<string|null>(null);
 const [error,setError]=useState<string|null>(null);

 useEffect(()=>{
   supabase.auth.getUser().then(({data})=>{
     if(data.user)router.replace("/");
   });
 },[router,supabase]);

 const submit=async(e:FormEvent)=>{
   e.preventDefault();
   setBusy(true);
   setError(null);
   setMessage(null);

   if(mode==="login"){
     const {error}=await supabase.auth.signInWithPassword({email,password});
     if(error){
       setError(error.message);
       setBusy(false);
       return;
     }
     router.replace("/");
   }else{
     const {data,error}=await supabase.auth.signUp({
       email,
       password,
       options:{
         data:{display_name:name.trim()||email.split("@")[0]},
         emailRedirectTo:"https://wetrace-oppa.vercel.app/setup"
       }
     });

     if(error){
       setError(error.message);
       setBusy(false);
       return;
     }

     if(data.session&&data.user){
       await supabase.from("profiles").upsert({
         id:data.user.id,
         display_name:name.trim()||email.split("@")[0],
         email
       },{onConflict:"id"});
       router.replace("/setup");
     }else{
       setMessage("Account created. Check your email to confirm the address, then return here and sign in.");
     }
   }

   setBusy(false);
 };

 return <main className="authPage">
   <section className="authBrand">
     <Logo/>
     <div>
       <p className="eyebrow">INTERNATIONAL INVESTIGATION PLATFORM</p>
       <h1>One secure workspace for the entire investigation.</h1>
       <p>Cases, people, evidence, tracing, investigator credentials, reporting and jurisdiction-aware access controls.</p>
     </div>
     <div className="authTrust">
       <span>✓ Evidence chain of custody</span>
       <span>✓ Case-level permissions</span>
       <span>✓ Audit history</span>
       <span>✓ Restricted-data gates</span>
     </div>
   </section>

   <section className="authCard">
    <div className="authTabs">
      <button onClick={()=>{setMode("login");setError(null);setMessage(null)}} className={mode==="login"?"active":""}>Sign in</button>
      <button onClick={()=>{setMode("signup");setError(null);setMessage(null)}} className={mode==="signup"?"active":""}>Create account</button>
    </div>

    <h2>{mode==="login"?"Welcome back":"Create your WETrace account"}</h2>
    <p>{mode==="login"?"Sign in to your secure WETrace workspace.":"Create the first account for your agency or join later by invitation."}</p>

    {error&&<div className="inlineAlert error">{error}</div>}
    {message&&<div className="inlineAlert success">{message}</div>}

    <form onSubmit={submit}>
      {mode==="signup"&&<label>Full name<input value={name} onChange={e=>setName(e.target.value)} required placeholder="Your name"/></label>}
      <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com"/></label>
      <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} autoComplete={mode==="login"?"current-password":"new-password"} placeholder="Minimum 8 characters"/></label>
      <button disabled={busy} className="primaryBtn authSubmit">{busy?"Please wait…":mode==="login"?"Continue securely →":"Create secure account →"}</button>
    </form>

    <div className="authFoot">Authentication is provided by the dedicated Oppa Productions WETrace Supabase project.<br/><Link href="/request-services">Need investigation services? Submit a private request →</Link></div>
   </section>
 </main>;
}