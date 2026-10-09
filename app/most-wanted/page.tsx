import AppShell from "../components/AppShell";

type Wanted = {
  title?: string; description?: string; warning_message?: string; publication?: string;
  url?: string; field_offenses?: string; field_reward_text?: string;
  images?: { original?: string; thumb?: string; caption?: string }[];
  status?: string; field_age?: string; field_sex?: string; field_race?: string;
  field_nationality?: string; field_date_of_birth_used?: string; field_height?: string;
  field_weight?: string; field_hair?: string; field_eyes?: string; field_caution?: string;
  modified?: string; path?: string;
};

async function getFbiWanted(): Promise<Wanted[]> {
  try {
    const pages = await Promise.all([1,2,3,4,5].map(async page => {
      const r = await fetch(`https://api.fbi.gov/wanted/v1/list?page=${page}&sort_on=modified&sort_order=desc&limit=20`, { next: { revalidate: 900 } });
      if (!r.ok) return [];
      const j = await r.json();
      return Array.isArray(j?.items) ? j.items as Wanted[] : [];
    }));
    const unique = new Map<string,Wanted>();
    for (const item of pages.flat()) unique.set(item.url || item.title || String(unique.size), item);
    return [...unique.values()];
  } catch { return []; }
}

const sources = [
  {name:"Vietnam — Ministry of Public Security", region:"Vietnam", type:"Official national authority", url:"https://bocongan.gov.vn/", note:"Use official MPS announcements and police bulletins. No unofficial names or photos are added as wanted records."},
  {name:"Vietnam — Ministry of Public Security news", region:"Vietnam", type:"Official announcements", url:"https://mps.gov.vn/", note:"Verify the original announcement and current status with the issuing police authority."},
  {name:"INTERPOL — Public Red Notices", region:"International", type:"International public notices", url:"https://www.interpol.int/How-we-work/Notices/Red-Notices/View-Red-Notices", note:"Only notices made public by INTERPOL are searchable here. A Red Notice is not an international arrest warrant."},
  {name:"FBI — Ten Most Wanted Fugitives", region:"United States", type:"Official top list", url:"https://www.fbi.gov/wanted/topten", note:"Official FBI bulletin pages with published photos and case information."},
  {name:"FBI — All Wanted", region:"United States", type:"Live official feed", url:"https://www.fbi.gov/wanted", note:"Records below are retrieved from the FBI public Wanted API."},
  {name:"U.S. Marshals — 15 Most Wanted", region:"United States", type:"Official top list", url:"https://www.usmarshals.gov/what-we-do/fugitive-investigations/15-most-wanted-fugitive", note:"Official U.S. Marshals fugitive bulletins."},
  {name:"DEA — Fugitives", region:"United States", type:"Official wanted records", url:"https://www.dea.gov/fugitives", note:"Drug Enforcement Administration official fugitive records."},
  {name:"ATF — Most Wanted", region:"United States", type:"Official wanted records", url:"https://www.atf.gov/most-wanted", note:"Bureau of Alcohol, Tobacco, Firearms and Explosives official notices."},
  {name:"EU Most Wanted — ENFAST", region:"European Union", type:"Cross-border wanted list", url:"https://eumostwanted.eu/", note:"Public wanted bulletins published through the European network."},
  {name:"UK National Crime Agency", region:"United Kingdom", type:"Official wanted information", url:"https://www.nationalcrimeagency.gov.uk/most-wanted", note:"Check current availability and issuing authority details on the official site."}
];

export default async function MostWanted() {
  const records = await getFbiWanted();
  return <AppShell title="Most Wanted Bulletins" subtitle="Official wanted-person bulletins with source-attributed photos and details. Records are allegations or active notices, not findings of guilt.">
    <section className="panel" style={{marginBottom:16}}>
      <div className="panelHead">
        <div><h2>Local, regional & worldwide bulletins</h2><p>Browse published notices and open the source bulletin for the latest status. We do not fabricate records or use unrelated photos.</p></div>
        <span className="statusBadge green">SOURCE-ATTRIBUTED</span>
      </div>
      <div className="statGrid">
        <div className="statCard"><span>FBI bulletin records loaded</span><strong>{records.length}</strong><small>Public FBI feed · refreshed every 15 minutes</small></div>
        <div className="statCard"><span>Vietnam</span><strong>Official links</strong><small>Published MPS/police notices</small></div>
        <div className="statCard"><span>International</span><strong>INTERPOL</strong><small>Public Red Notices only</small></div>
        <div className="statCard"><span>Verification</span><strong>Required</strong><small>Confirm status before action</small></div>
      </div>
    </section>

    <section className="panel" style={{marginBottom:16}}>
      <div className="panelHead"><div><h2>Official bulletin sources</h2><p>Open the source authority for full-resolution photos, contact details and current case instructions.</p></div></div>
      <div className="recordGrid">
        {sources.map(s=><a key={s.name} href={s.url} target="_blank" rel="noreferrer" className="recordCard linkCard">
          <div><strong>{s.name}</strong><small>{s.region} · {s.type}</small><p>{s.note}</p></div>
          <span className="statusBadge blue">Official ↗</span>
        </a>)}
      </div>
    </section>

    <section className="panel">
      <div className="panelHead"><div><h2>FBI public wanted bulletin records</h2><p>{records.length ? `Showing ${records.length} records returned by the FBI public feed, including official photos where provided.` : "Live FBI feed unavailable. Use the official FBI source link above."}</p></div><a className="quietBtn" href="https://www.fbi.gov/wanted" target="_blank" rel="noreferrer">Open FBI bulletins ↗</a></div>
      {records.length ? <div className="wantedGrid">
        {records.map((w,i)=><article className="wantedCard" key={w.url||w.title||i}>
          {w.images?.[0]?.original ? <img src={w.images[0].original} alt={w.images[0].caption||`Official published photo for ${w.title||"wanted bulletin"}`} loading="lazy"/> : <div className="wantedPhoto">NO OFFICIAL PHOTO</div>}
          <div className="wantedBody">
            <div className="wantedMeta"><span>FBI official feed</span><span>{w.publication||"Wanted bulletin"}</span></div>
            <h3>{w.title||"Untitled official record"}</h3>
            {w.field_offenses && <p><strong>Listed offenses:</strong> {w.field_offenses}</p>}
            {w.field_reward_text && <p><strong>Reward:</strong> {w.field_reward_text}</p>}
            {(w.field_age||w.field_sex||w.field_nationality) && <p><strong>Published description:</strong> {[w.field_age&&`Age: ${w.field_age}`,w.field_sex&&`Sex: ${w.field_sex}`,w.field_nationality&&`Nationality: ${w.field_nationality}`].filter(Boolean).join(" · ")}</p>}
            {w.field_date_of_birth_used && <p><strong>DOB listed:</strong> {w.field_date_of_birth_used}</p>}
            {w.field_height && <p><strong>Height listed:</strong> {w.field_height}</p>}
            <p className="muted">{(w.description||w.warning_message||"See the official source bulletin for details.").replace(/<[^>]+>/g," ").replace(/\s+/g," ").slice(0,280)}{(w.description||w.warning_message||"").length>280?"…":""}</p>
            {w.modified && <small>Source last modified: {w.modified}</small>}
            {w.url && <a href={w.url} target="_blank" rel="noreferrer" className="primaryBtn inlineBtn">Open full official bulletin ↗</a>}
          </div>
        </article>)}
      </div> : <div className="emptyState"><strong>FBI records did not load this time.</strong><p>This is a feed-availability issue, not an indication that no wanted records exist. Open the official FBI source above.</p></div>}
    </section>

    <div className="inlineAlert" style={{marginTop:16}}>
      <strong>Important:</strong> These are official-source bulletin links and a live FBI feed, not a complete global law-enforcement database. Some authorities restrict public records or images. A wanted notice is not proof of guilt; preserve source URL, retrieval time, jurisdiction and the authority’s exact wording.
    </div>
  </AppShell>;
}
