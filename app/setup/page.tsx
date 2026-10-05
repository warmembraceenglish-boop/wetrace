"use client";

import {useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import Logo from "../components/Logo";
import {getSupabaseBrowserClient} from "../lib/supabase";

export default function Setup(){
 const router=useRouter();
 const supabase=useMemo(()=>getSupabaseBrowserClient(),[]);
 const [step,setStep]=useState(1);
 const [userId,setUserId]=useState<string|null>(null);
 const [agency,setAgency]=useState("Oppa Productions Investigations");
 const [country,setCountry]=useState("VN");
 const [language,setLanguage]=useState("en");
 const [currency,setCurrency]=useState("USD");
 const [name,setName]=useState("");
 const [countries,setCountries]=useState("Vietnam");
 const [languages,setLanguages]=useState("English");
 const [bio,setBio]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState<string|null>(null);

 useEffect(()=>{
   (async()=>{
     const {data:{user}}=await supabase.auth.getUser();
     if(!user){
       router.replace("/login");
       return;
     }
     setUserId(user.id);
     setName((user.user_metadata?.display_name as string)||user.email?.split("@")[0]||"");

     const {data:m}=await supabase
       .from("organization_members")
       .select("organization_id,status")
       .eq("user_id",user.id)
       .limit(1)
       .maybeSingle();

     if(m?.organization_id&&m.status==="active"){
       router.replace("/");
       return;
     }

     if(m?.organization_id&&m.status==="invited"){
       const {error:acceptError}=await supabase.functions.invoke("accept-team-invite",{
         body:{organization_id:m.organization_id}
       });

       if(!acceptError){
         router.replace("/");
         return;
       }

       setError("Your invitation was found but could not be activated: "+acceptError.message);
     }
   })();
 },[router,supabase]);

 const finish=async()=>{
   if(!userId)return;
   setBusy(true);
   setError(null);

   const {data:{user}}=await supabase.auth.getUser();
   if(!user){
     router.replace("/login");
     return;
   }

   const email=user.email||null;

   const {error:pErr}=await supabase.from("profiles").upsert({
     id:userId,
     display_name:name.trim(),
     email,
     preferred_language:language
   },{onConflict:"id"});

   if(pErr){
     setError(pErr.message);
     setBusy(false);
     return;
   }

   const {data:org,error:oErr}=await supabase
     .from("organizations")
     .insert({
       name:agency.trim(),
       country_code:country,
       created_by:userId,
       preferred_language:language,
       default_currency:currency
     })
     .select("id")
     .single();

   if(oErr||!org){
     setError(oErr?.message||"Could not create organization.");
     setBusy(false);
     return;
   }

   const {error:mErr}=await supabase.from("organization_members").insert({
     organization_id:org.id,
     user_id:userId,
     organization_role:"owner",
     status:"active"
   });

   if(mErr){
     setError(mErr.message);
     setBusy(false);
     return;
   }

   const serviceCountries=countries.split(",").map(x=>x.trim()).filter(Boolean);
   const languageList=languages.split(",").map(x=>x.trim()).filter(Boolean);

   const {error:iErr}=await supabase.from("investigator_profiles").upsert({
     user_id:userId,
     organization_id:org.id,
     professional_bio:bio||null,
     specialties:[],
     languages:languageList,
     service_countries:serviceCountries,
     availability:"available",
     public_directory_enabled:false
   },{onConflict:"user_id"});

   if(iErr){
     setError(iErr.message);
     setBusy(false);
     return;
   }

   router.replace("/");
 };

 return <main className="setupPage">
   <div className="setupTop"><Logo/><span>Workspace setup · Step {step} of 3</span></div>
   <div className="setupBody">
    <div className="setupProgress"><i style={{width:(step/3*100)+"%"}}/></div>

    {error&&<div className="inlineAlert error">{error}</div>}

    {step===1&&<section>
      <p className="eyebrow">AGENCY</p>
      <h1>Create your investigation workspace</h1>
      <p className="lede">This creates your real WETrace organization in the dedicated database.</p>
      <div className="formGrid">
        <label>Agency / practice name<input value={agency} onChange={e=>setAgency(e.target.value)}/></label>
        <label>Primary country
          <select value={country} onChange={e=>setCountry(e.target.value)}>
            <option value="VN">Vietnam</option><option value="US">United States</option><option value="SG">Singapore</option><option value="GB">United Kingdom</option><option value="TH">Thailand</option><option value="OTHER">Other</option>
          </select>
        </label>
        <label>Primary language
          <select value={language} onChange={e=>setLanguage(e.target.value)}>
            <option value="en">English</option><option value="vi">Vietnamese</option><option value="fr">French</option><option value="es">Spanish</option>
          </select>
        </label>
        <label>Default currency
          <select value={currency} onChange={e=>setCurrency(e.target.value)}>
            <option>USD</option><option>VND</option><option>EUR</option><option>SGD</option><option>GBP</option>
          </select>
        </label>
      </div>
    </section>}

    {step===2&&<section>
      <p className="eyebrow">DIRECTOR PROFILE</p>
      <h1>Set up the agency director</h1>
      <p className="lede">Only information you enter here will be stored. No license or certificate is marked verified automatically.</p>
      <div className="formGrid">
        <label>Full name<input value={name} onChange={e=>setName(e.target.value)}/></label>
        <label>Service countries<input value={countries} onChange={e=>setCountries(e.target.value)} placeholder="Vietnam, Thailand…"/></label>
        <label>Languages<input value={languages} onChange={e=>setLanguages(e.target.value)} placeholder="English, Vietnamese"/></label>
        <label className="full">Professional bio<textarea rows={4} value={bio} onChange={e=>setBio(e.target.value)} placeholder="Professional background and specialties."/></label>
      </div>
    </section>}

    {step===3&&<section>
      <p className="eyebrow">SECURITY</p>
      <h1>Strict access is enabled</h1>
      <p className="lede">WETrace uses case membership, role-based permissions, private storage, audit logging and extra restricted-data controls.</p>
      <div className="choiceCards">
        <label><input type="radio" checked readOnly/><div><strong>Strict access policy</strong><p>Investigators only see assigned/authorized case data. Client accounts see only client-visible communications, released reports and scoped invoices.</p></div></label>
      </div>
    </section>}

    <div className="formActions">
      <button className="secondaryBtn inlineBtn" disabled={step===1||busy} onClick={()=>setStep(s=>s-1)}>← Back</button>
      {step<3
        ?<button className="primaryBtn inlineBtn" disabled={busy||!agency.trim()||!name.trim()} onClick={()=>setStep(s=>s+1)}>Continue →</button>
        :<button className="primaryBtn inlineBtn" disabled={busy} onClick={finish}>{busy?"Creating…":"Create workspace"}</button>}
    </div>
   </div>
 </main>;
}