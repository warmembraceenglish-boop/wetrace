"use client";
import Link from "next/link";
import {FormEvent,useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import Logo from "../components/Logo";
import {getSupabaseBrowserClient} from "../lib/supabase";

export default function Login(){
 const router=useRouter(), supabase=useMemo(()=>getSupabaseBrowserClient(),[]);
 const [mode,setMode]=useState<"login"|"signup">("login"),[name,setName]=useState(""),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),[msg,setMsg]=useState<string|null>(null);
 useEffect(()=>{supabase.auth.getUser().then(({data})=>{if(data.user)router.replace("/")})},[router,supabase]);
 const submit=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setError(null);setMsg(null);
   if(mode==="login"){const {error}=await supabase.auth.signInWithPassword({email,password});if(error)setError(error.message);else router.replace("/");}
   else{const {data,error}=await supabase.auth.signUp({email,password,options:{data:{display_name:name.trim()||email.split("@")[0]},emailRedirectTo:"https://wetrace-oppa.vercel.app/setup"}});if(error)setError(error.message);else if(data.session)router.replace("/setup");else setMsg("Account created. Check your email to confirm it, then sign in.");}
   setBusy(false);
 };
 return <main className="auth"><section className="authBrand"><Logo/><div><p style={{color:"#29c3e8",fontSize:10,letterSpacing:2}}>INTERNATIONAL INVESTIGATION PLATFORM</p><h1>Investigate. Trace. Document. Defend the record.</h1><p>Cases, people, missing persons, evidence, records, specialists and auditable intelligence in one secure workspace.</p></div><small style={{color:"#6f8b9e"}}>WETrace · Oppa Productions</small></section><section className="authCard"><div className="authTabs"><button className={mode==="login"?"active":""} onClick={()=>setMode("login")}>Sign in</button><button className={mode==="signup"?"active":""} onClick={()=>setMode("signup")}>Create account</button></div><h2>{mode==="login"?"Welcome back":"Create account"}</h2>{error&&<div className="alert error">{error}</div>}{msg&&<div className="alert success">{msg}</div>}<form onSubmit={submit}>{mode==="signup"&&<label>Full name<input required value={name} onChange={e=>setName(e.target.value)}/></label>}<label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="btn" disabled={busy}>{busy?"Please wait…":mode==="login"?"Sign in securely":"Create secure account"}</button></form><p style={{fontSize:9,color:"#7793a5",marginTop:16}}>Need investigation services? <Link href="/request-services" style={{color:"#57cae6"}}>Submit a private request →</Link></p></section></main>;
}
