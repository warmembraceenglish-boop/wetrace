"use client";
import {FormEvent,useEffect,useState} from "react";
import AppShell from "../components/AppShell";
import Badge from "../components/Badge";
import {useWorkspace} from "../lib/useWorkspace";

export default function FacialComparison(){
 const {supabase,user,organization}=useWorkspace();
 const [cases,setCases]=useState<any[]>([]),[evidence,setEvidence]=useState<any[]>([]),[rows,setRows]=useState<any[]>([]),[thumbs,setThumbs]=useState<Record<string,string>>({});
 const [busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);
 const [f,setF]=useState({caseId:"",probe:"",reference:"",provider:"",reviewer:"",notes:""});

 const loadCases=async()=>{const {data}=await supabase.from("cases").select("id,case_number,title").order("updated_at",{ascending:false});const c=data||[];setCases(c);if(!f.caseId&&c[0]?.id)setF(x=>({...x,caseId:c[0].id}))};
 const loadRows=async()=>{const {data,error}=await supabase.from("facial_comparisons").select("id,case_id,status,similarity_score,finding,provider_name,reviewer_name,created_at,cases(case_number,title)").order("created_at",{ascending:false});if(error)setError(error.message);else setRows(data||[])};
 const loadEvidence=async(caseId:string)=>{if(!caseId)return;const {data}=await supabase.from("evidence").select("id,evidence_number,description,storage_path").eq("case_id",caseId).eq("evidence_type","image").order("created_at",{ascending:false});const e=data||[];setEvidence(e);const u:Record<string,string>={};for(const item of e){if(item.storage_path){const {data:s}=await supabase.storage.from("wetrace-evidence").createSignedUrl(item.storage_path,900);if(s?.signedUrl)u[item.id]=s.signedUrl}}setThumbs(u);setF(x=>({...x,probe:e[0]?.id||"",reference:e[1]?.id||""}))};
 useEffect(()=>{loadCases();loadRows()},[supabase]);
 useEffect(()=>{if(f.caseId)loadEvidence(f.caseId)},[f.caseId]);

 const submit=async(e:FormEvent)=>{e.preventDefault();if(!user||!organization)return;if(!f.probe||!f.reference||f.probe===f.reference){setError("Choose two different case images.");return}setBusy(true);setError(null);
 const {error}=await supabase.from("facial_comparisons").insert({organization_id:organization.id,case_id:f.caseId,probe_evidence_id:f.probe,reference_evidence_id:f.reference,provider_name:f.provider||null,reviewer_name:f.reviewer||null,method:"human_or_authorized_provider_review",status:"requested",notes:f.notes||null,restricted:true,created_by:user.id});
 setBusy(false);if(error)setError(error.message);else{setF(x=>({...x,provider:"",reviewer:"",notes:""}));loadRows()}};

 return <AppShell title="Facial Comparison" subtitle="Restricted comparison of authorized case images. Similarity is an investigative lead, not proof of identity." actions={<Badge tone="red">RESTRICTED</Badge>}>
  {error&&<div className="alert error">{error}</div>}
  <section className="panel"><h2>Create comparison request</h2><p>Both images must already exist as image evidence in the same case.</p>
   {cases.length?<form className="form" onSubmit={submit}><label className="full">Case<select value={f.caseId} onChange={e=>setF({...f,caseId:e.target.value})}>{cases.map(c=><option value={c.id} key={c.id}>{c.case_number} · {c.title}</option>)}</select></label><label>Probe image<select value={f.probe} onChange={e=>setF({...f,probe:e.target.value})}><option value="">Choose image</option>{evidence.map(x=><option value={x.id} key={x.id}>{x.evidence_number} · {x.description||"Image"}</option>)}</select></label><label>Reference image<select value={f.reference} onChange={e=>setF({...f,reference:e.target.value})}><option value="">Choose image</option>{evidence.map(x=><option value={x.id} key={x.id}>{x.evidence_number} · {x.description||"Image"}</option>)}</select></label><div className="full" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><div className="card">{f.probe&&thumbs[f.probe]?<img src={thumbs[f.probe]} alt="Probe" style={{width:"100%",height:260,objectFit:"contain",background:"#04131f"}}/>:<div className="empty">Probe image</div>}</div><div className="card">{f.reference&&thumbs[f.reference]?<img src={thumbs[f.reference]} alt="Reference" style={{width:"100%",height:260,objectFit:"contain",background:"#04131f"}}/>:<div className="empty">Reference image</div>}</div></div><label>Provider / examiner<input value={f.provider} onChange={e=>setF({...f,provider:e.target.value})}/></label><label>Reviewer<input value={f.reviewer} onChange={e=>setF({...f,reviewer:e.target.value})}/></label><label className="full">Notes<textarea rows={4} value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/></label><div className="full"><button className="btn" disabled={busy||evidence.length<2}>{busy?"Creating…":"Create comparison request"}</button></div></form>:<div className="empty">Create a case first.</div>}
  </section>
  <section className="panel"><h2>Comparison register</h2>{rows.length?<table className="table"><thead><tr><th>Case</th><th>Provider</th><th>Reviewer</th><th>Status</th><th>Score</th><th>Finding</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.cases?.case_number||"Case"}</td><td>{r.provider_name||"—"}</td><td>{r.reviewer_name||"—"}</td><td><Badge tone={r.status==="completed"?"green":r.status==="inconclusive"?"amber":"red"}>{r.status}</Badge></td><td>{r.similarity_score==null?"—":r.similarity_score+"%"}</td><td>{r.finding||"—"}</td></tr>)}</tbody></table>:<div className="empty">No facial comparisons yet.</div>}</section>
 </AppShell>;
}
