"use client";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {useEffect} from "react";
import Logo from "./Logo";
import {useWorkspace} from "../lib/useWorkspace";

const nav=[
["Dashboard","/","⌂"],["Cases","/cases","▣"],["Missing Persons","/missing-persons","⌖"],["Facial Comparison","/facial-comparison","◈"],
["Evidence","/evidence","◇"],["Investigators","/investigators","♟"],["Records","/records","⌕"],["Forensics","/forensics","◫"],
["Genealogy","/genealogy","⌁"],["Billing","/billing","◉"],["Administration","/admin","⚙"]
];

export default function AppShell({children,title="WETrace",subtitle="",actions}:{children:React.ReactNode;title?:string;subtitle?:string;actions?:React.ReactNode}){
 const path=usePathname(); const router=useRouter();
 const {supabase,loading,user,profile,membership,organization,error}=useWorkspace();

 useEffect(()=>{if(loading)return;if(!user){router.replace("/login");return;}if(!membership||!organization)router.replace("/setup");},[loading,user,membership,organization,router]);
 if(loading||!user||!membership||!organization)return <main className="loading"><Logo/><div className="spinner"/><p>Opening secure workspace…</p></main>;

 const display=profile?.display_name||user.email||"WETrace";
 const initials=display.split(/\s+/).map((x:string)=>x[0]).join("").slice(0,2).toUpperCase();
 const role=profile?.global_role==="platform_admin"?"Super Admin":String(membership.organization_role||"member").replaceAll("_"," ");

 return <main className="shell">
   <aside className="side"><Logo/><nav>{nav.map(([label,href,icon])=><Link key={href} className={(href==="/"?path==="/":path.startsWith(href))?"nav active":"nav"} href={href}><span>{icon}</span>{label}</Link>)}
   {profile?.global_role==="platform_admin"&&<Link className={path.startsWith("/service-requests")?"nav active":"nav"} href="/service-requests"><span>✦</span>Service Requests</Link>}</nav>
   <div className="sideFoot"><b>● Secure</b><small>{organization.name} · {role}</small></div></aside>
   <section className="work">
    <header className="top"><div className="search">⌕ Search cases, people, evidence…</div><div className="user"><span>{initials}</span><div><b>{display}</b><small>{role}</small></div><button onClick={async()=>{await supabase.auth.signOut();router.replace("/login")}}>Sign out</button></div></header>
    <div className="content">{error&&<div className="alert error">{error}</div>}<div className="pageHead"><div><p>GLOBAL OPERATIONS</p><h1>{title}</h1><span>{subtitle}</span></div>{actions}</div>{children}</div>
   </section>
 </main>;
}
