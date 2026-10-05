"use client";

import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {useEffect} from "react";
import Logo from "./Logo";
import {useWorkspace} from "../lib/useWorkspace";

const nav=[
["Dashboard","/","⌂"],["Cases","/cases","▣"],["Live Cases","/live-cases","◉"],["Cold Case Files","/cold-cases","❄"],["People","/people","◎"],["Evidence","/evidence","◇"],["Intelligence","/intelligence","⌘"],
["Missing Persons","/missing-persons","⌖"],["Facial Comparison","/facial-comparison","◈"],["Skip Trace","/skip-trace","↯"],["Records Search","/records","⌕"],["Forensics","/forensics","◫"],
["Genealogy","/genealogy","⌁"],["Investigators","/investigators","♟"],["Reports","/reports","▤"],["Billing","/billing","◉"],["Administration","/admin","⚙"]
];

export default function AppShell({
  children,
  title="Dashboard",
  subtitle="Lawful investigation, evidence and intelligence — one defensible case record.",
  actions
}:{
  children:React.ReactNode;
  title?:string;
  subtitle?:string;
  actions?:React.ReactNode;
}){
 const path=usePathname();
 const router=useRouter();
 const {supabase,loading,user,profile,membership,organization,error}=useWorkspace();

 useEffect(()=>{
   if(loading)return;
   if(!user){
     router.replace("/login");
     return;
   }
   if(!membership||!organization){
     router.replace("/setup");
   }
 },[loading,user,membership,organization,router]);

 if(loading||!user||!membership||!organization){
   return <main className="loadingScreen">
     <Logo/>
     <div className="loadingPulse"/>
     <p>Opening secure workspace…</p>
   </main>;
 }

 const initials=(profile?.display_name||user.email||"WT")
   .split(/\s+/)
   .map(x=>x[0])
   .join("")
   .slice(0,2)
   .toUpperCase();

 const signOut=async()=>{
   await supabase.auth.signOut();
   router.replace("/login");
 };

 return <main className="appShell">
   <aside className="sidebar">
     <Logo/>
     <nav aria-label="Primary">
       {nav.map(([label,href,icon])=>{
         const active=href==="/" ? path==="/" : path.startsWith(href);
         return <Link key={href} href={href} className={active?"navItem active":"navItem"}>
           <span className="navIcon">{icon}</span><span>{label}</span>
         </Link>;
       })}
       {profile?.global_role==="platform_admin"&&<Link href="/service-requests" className={path.startsWith("/service-requests")?"navItem active":"navItem"}>
         <span className="navIcon">✦</span><span>Service Requests</span>
       </Link>}
     </nav>
     <div className="sidebarFoot">
       <div className="securePulse"><span/> Secure workspace</div>
       <p>{organization.name} · {profile?.global_role==="platform_admin"?"Super Admin":membership.organization_role.replaceAll("_"," ")}</p>
     </div>
   </aside>

   <section className="workspace">
     <header className="topbar">
       <Link href="/cases" className="searchBox">
         <span>⌕</span>
         <span className="searchPlaceholder">Search cases, people, evidence, records…</span>
         <kbd>⌘ K</kbd>
       </Link>

       <div className="topActions">
         <Link href="/cases/new" className="quietBtn">＋ New Case</Link>
         <button className="iconBtn" aria-label="Notifications">◌</button>
         <Link href={"/investigators/"+user.id} className="profileChip">
           <div className="avatar">{initials}</div>
           <div><strong>{profile?.display_name||user.email}</strong><small>{organization.name}</small></div>
         </Link>
         <button className="quietBtn" onClick={signOut}>Sign out</button>
       </div>
     </header>

     <div className="content">
       {error&&<div className="inlineAlert error">{error}</div>}
       <div className="headingRow">
         <div><p className="eyebrow">GLOBAL OPERATIONS</p><h1>{title}</h1><p className="lede">{subtitle}</p></div>
         {actions}
       </div>
       {children}
     </div>
   </section>
 </main>;
}