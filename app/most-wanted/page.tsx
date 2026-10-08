import Link from "next/link";
import AppShell from "../components/AppShell";

type Wanted = {
  title?: string;
  description?: string;
  warning_message?: string;
  publication?: string;
  url?: string;
  details?: string;
  field_offenses?: string;
  field_reward_text?: string;
  images?: { original?: string; thumb?: string; caption?: string }[];
  status?: string;
};

async function getFbiWanted(): Promise<Wanted[]> {
  try {
    const r = await fetch("https://api.fbi.gov/wanted/v1/list?page=1&sort_on=modified&sort_order=desc&limit=24", {
      next: { revalidate: 900 }
    });
    if (!r.ok) return [];
    const j = await r.json();
    return Array.isArray(j?.items) ? j.items : [];
  } catch {
    return [];
  }
}

const officialSources = [
  {name:"FBI Ten Most Wanted Fugitives", country:"United States", type:"National Top List", url:"https://www.fbi.gov/wanted/topten", note:"Official FBI list."},
  {name:"INTERPOL Red Notices", country:"International", type:"International notice system", url:"https://www.interpol.int/How-we-work/Notices/Red-Notices/View-Red-Notices", note:"Public Red Notices; a Red Notice is not an international arrest warrant."},
  {name:"EU Most Wanted", country:"European Union", type:"Cross-border wanted list", url:"https://eumostwanted.eu/", note:"Europe's ENFAST public wanted-person portal."},
  {name:"U.S. Marshals 15 Most Wanted", country:"United States", type:"National Top List", url:"https://www.usmarshals.gov/what-we-do/fugitive-investigations/15-most-wanted-fugitive", note:"Official U.S. Marshals Service list."},
  {name:"DEA Fugitives", country:"United States", type:"Federal wanted list", url:"https://www.dea.gov/fugitives", note:"Official DEA fugitive information."},
  {name:"ATF Most Wanted", country:"United States", type:"Federal wanted list", url:"https://www.atf.gov/most-wanted", note:"Official ATF wanted-person information."},
  {name:"UK National Crime Agency", country:"United Kingdom", type:"National wanted information", url:"https://www.nationalcrimeagency.gov.uk/most-wanted", note:"Official NCA source; availability may vary by region."}
];

export default async function MostWanted(){
  const fbi = await getFbiWanted();
  return <AppShell title="Most Wanted" subtitle="Official wanted-person sources and verified public notices. WETrace does not create or rank criminal guilt.">
    <div className="panel" style={{marginBottom:16}}>
      <div className="panelHead">
        <div><h2>Worldwide wanted directory</h2><p>Records are attributed to the issuing authority. Status and availability can change; investigators should verify the original notice before acting.</p></div>
        <span className="statusBadge green">OFFICIAL SOURCES</span>
      </div>
      <div className="statGrid">
        <div className="statCard"><span>Live FBI records</span><strong>{fbi.length}</strong><small>Public FBI Wanted API snapshot</small></div>
        <div className="statCard"><span>International source</span><strong>INTERPOL</strong><small>Red Notice search</small></div>
        <div className="statCard"><span>European source</span><strong>EU Most Wanted</strong><small>ENFAST portal</small></div>
        <div className="statCard"><span>Evidence rule</span><strong>Source first</strong><small>Verify before use in a case</small></div>
      </div>
    </div>

    <section className="panel" style={{marginBottom:16}}>
      <div className="panelHead"><div><h2>Top / official wanted lists</h2><p>These are direct links to the publishing authorities, not third-party compilations.</p></div></div>
      <div className="recordGrid">
        {officialSources.map(s=><a key={s.name} href={s.url} target="_blank" rel="noreferrer" className="recordCard linkCard">
          <div><strong>{s.name}</strong><small>{s.country} · {s.type}</small><p>{s.note}</p></div>
          <span className="statusBadge blue">Official ↗</span>
        </a>)}
      </div>
    </section>

    <section className="panel">
      <div className="panelHead"><div><h2>FBI public wanted records</h2><p>{fbi.length ? "Live public records retrieved from the FBI source." : "The FBI feed is unavailable right now; use the official source link above."}</p></div><a className="quietBtn" href="https://www.fbi.gov/wanted" target="_blank" rel="noreferrer">Open FBI ↗</a></div>
      {fbi.length ? <div className="wantedGrid">
        {fbi.map((w,i)=><article className="wantedCard" key={w.url||w.title||i}>
          {w.images?.[0]?.original ? <img src={w.images[0].original} alt="" loading="lazy"/> : <div className="wantedPhoto">W</div>}
          <div className="wantedBody">
            <div className="wantedMeta"><span>FBI</span><span>{w.publication||"Public record"}</span></div>
            <h3>{w.title||"Unnamed FBI record"}</h3>
            {w.field_offenses && <p><strong>Offenses:</strong> {w.field_offenses}</p>}
            {w.field_reward_text && <p><strong>Reward:</strong> {w.field_reward_text}</p>}
            <p className="muted">{(w.description||w.warning_message||"Official FBI wanted-person record.").replace(/<[^>]+>/g," ").slice(0,260)}…</p>
            {w.url && <a href={w.url} target="_blank" rel="noreferrer" className="primaryBtn inlineBtn">View official record ↗</a>}
          </div>
        </article>)}
      </div> : <div className="emptyState"><strong>No live FBI records loaded.</strong><p>This does not mean there are no wanted records. The external FBI feed may be temporarily unavailable.</p></div>}
    </section>

    <div className="inlineAlert" style={{marginTop:16}}>
      <strong>Investigative safeguard:</strong> A wanted notice is not a finding by WETrace that a person is guilty. Preserve the issuing authority, notice URL, retrieval date, jurisdiction and exact wording when attaching a record to a case.
    </div>
  </AppShell>;
}
