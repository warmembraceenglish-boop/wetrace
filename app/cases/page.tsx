"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import AppShell from "../components/AppShell";
import Badge from "../components/Badge";
import {useWorkspace} from "../lib/useWorkspace";

export default function Cases(){
 const {supabase}=useWorkspace();const [rows,setRows]=useState<any[]>([]);
 const load=async()=>{const {data}=await supabase.from("cases").select("*").order("updated_at",{ascending:false});setRows(data||[])};
 useEffect(()=>{load()},[supabase]);
 return <AppShell title="Cases" subtitle="Real investigations visible to your account." actions={<Link className="btn" href="/cases/new">＋ Open new case</Link>}><section className="panel">{rows.length?<table className="table"><thead><tr><th>Case</th><th>Type</th><th>Jurisdiction</th><th>Priority</th><th>Status</th><th>Updated</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.case_number} · <b>{r.title}</b></td><td>{r.case_type}</td><td>{r.jurisdictions?.join(" / ")||"—"}</td><td><Badge tone={r.priority==="critical"||r.priority==="high"?"red":"amber"}>{r.priority}</Badge></td><td><Badge tone="blue">{r.status}</Badge></td><td>{new Date(r.updated_at).toLocaleString()}</td></tr>)}</tbody></table>:<div className="empty">No cases yet.</div>}</section></AppShell>;
}
