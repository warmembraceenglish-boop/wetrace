"use client";
import {useEffect,useState} from "react";
import AppShell from "../components/AppShell";
import Badge from "../components/Badge";
import {useWorkspace} from "../lib/useWorkspace";

export default function Billing(){
 const {supabase,organization}=useWorkspace();
 const [rows,setRows]=useState<any[]>([]);
 useEffect(()=>{if(!organization)return;supabase.from("invoices").select("id,invoice_number,amount,currency,status,due_at,created_at,cases(case_number,title)").eq("organization_id",organization.id).order("created_at",{ascending:false}).then(({data})=>setRows(data||[]))},[organization?.id,supabase]);
 const total=rows.reduce((s,r)=>s+Number(r.amount||0),0),paid=rows.filter(r=>r.status==="paid").reduce((s,r)=>s+Number(r.amount||0),0);
 return <AppShell title="Billing" subtitle="Live case-linked invoices and payment status.">
  <section className="grid"><div className="card"><small>Invoices</small><b>{rows.length}</b></div><div className="card"><small>Total billed</small><b>{organization?.default_currency||"USD"} {total.toFixed(2)}</b></div><div className="card"><small>Paid</small><b>{organization?.default_currency||"USD"} {paid.toFixed(2)}</b></div><div className="card"><small>Outstanding</small><b>{organization?.default_currency||"USD"} {(total-paid).toFixed(2)}</b></div></section>
  <section className="panel" style={{marginTop:14}}>{rows.length?<table className="table"><thead><tr><th>Invoice</th><th>Case</th><th>Amount</th><th>Status</th><th>Due</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.invoice_number}</td><td>{r.cases?.case_number||"—"}</td><td>{r.currency} {Number(r.amount).toFixed(2)}</td><td><Badge tone={r.status==="paid"?"green":r.status==="overdue"?"red":"amber"}>{r.status}</Badge></td><td>{r.due_at?new Date(r.due_at).toLocaleDateString():"—"}</td></tr>)}</tbody></table>:<div className="empty">No invoices yet.</div>}</section>
 </AppShell>;
}
