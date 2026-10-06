import Link from "next/link";

const services = [
  {name:"Missing Person Investigation",start:"$500",hourly:"$65/hr",desc:"Structured missing-person case intake, timeline development, public-source research, lead organization and investigative follow-up."},
  {name:"Skip Trace",start:"$150",hourly:"$60/hr",desc:"Lawful location research using authorized records, public sources and documented investigative methods."},
  {name:"Insurance Fraud Investigation",start:"$750",hourly:"$85/hr",desc:"Claim review, timeline analysis, records organization, inconsistency review and evidence development."},
  {name:"Corporate Investigation",start:"$1,000",hourly:"$95/hr",desc:"Internal fact-finding, due diligence, misconduct review, asset and relationship research, and investigative reporting."},
  {name:"Background Investigation",start:"$175",hourly:"$65/hr",desc:"Lawful background research, identity verification, public-record review and risk-focused reporting."},
  {name:"Civil / Litigation Support",start:"$750",hourly:"$85/hr",desc:"Case research, witness and subject research, chronology building, evidence review and litigation-focused support."},
  {name:"Criminal Defense Support",start:"$750",hourly:"$85/hr",desc:"Defense-oriented investigative support, fact development, witness research, timeline review and evidence organization."},
  {name:"Genealogy / Heir Trace",start:"$350",hourly:"$70/hr",desc:"Family-line research, heir location, relationship mapping and source-supported genealogy research."},
  {name:"Forensic / Evidence Review",start:"$450",hourly:"$95/hr",desc:"Evidence inventory, metadata and document review, chronology development and investigative issue spotting."},
  {name:"Other / Custom Investigation",start:"Custom quote",hourly:"$75/hr",desc:"A scoped investigative engagement designed around a lawful need that does not fit a standard service category."},
];

export default function ServicesPage(){
  return <main className="salesPage">
    <header className="salesNav">
      <Link href="/services" className="salesBrand" aria-label="WETrace home">
        <span className="salesBrandMark">W</span>
        <span><strong>WE<span>Trace</span></strong><small>INVESTIGATE · TRACE · INTELLIGENCE</small></span>
      </Link>
      <nav>
        <a href="#services">Services</a>
        <a href="#consultation">Consultation</a>
        <a href="#process">How it works</a>
        <Link href="/login">Investigator sign in</Link>
      </nav>
      <Link className="salesNavCta" href="/request-services">Request investigation</Link>
    </header>

    <section className="salesHero">
      <div className="salesHeroCopy">
        <p className="salesEyebrow">WORLDWIDE INVESTIGATIVE SERVICES</p>
        <h1>When the facts matter, <span>WETrace.</span></h1>
        <p className="salesHeroLead">Professional investigative support for individuals, families, attorneys, insurers and organizations. Every matter begins with a defined purpose, clear scope and documented intake.</p>
        <div className="salesHeroActions">
          <Link className="salesPrimary" href="/request-services">Start a confidential request</Link>
          <a className="salesSecondary" href="#services">View services & pricing</a>
        </div>
        <div className="salesTrustRow">
          <span>✓ Worldwide case intake</span>
          <span>✓ Secure request process</span>
          <span>✓ Clear starting rates</span>
        </div>
      </div>
      <div className="salesHeroPanel">
        <p className="salesPanelLabel">PRIVATE CONSULTATION</p>
        <strong className="salesConsultPrice">$75</strong>
        <span className="salesConsultTime">up to 45 minutes</span>
        <p>Discuss the situation, available evidence, jurisdiction, likely next steps and the appropriate WETrace service.</p>
        <div className="salesCredit">Consultation fee credited toward the investigation when WETrace is retained within 7 days.</div>
        <Link className="salesPrimary salesFull" href="/request-services">Request consultation</Link>
        <small>Urgent or same-day consultation: $150, subject to availability.</small>
      </div>
    </section>

    <section className="salesSection salesIntro" id="services">
      <div>
        <p className="salesEyebrow">SERVICES & PRICING</p>
        <h2>Choose the investigation that fits the need.</h2>
      </div>
      <p>Starting fees cover initial case opening and scoped investigative work. Additional work is billed at the listed hourly rate unless a written flat-fee scope is agreed in advance.</p>
    </section>

    <section className="salesServiceGrid">
      {services.map((service,index)=><article className="salesServiceCard" key={service.name}>
        <div className="salesCardNumber">{String(index+1).padStart(2,"0")}</div>
        <h3>{service.name}</h3>
        <p>{service.desc}</p>
        <div className="salesPricing">
          <div><small>Starting at</small><strong>{service.start}</strong></div>
          <div><small>Additional work</small><strong>{service.hourly}</strong></div>
        </div>
        <Link href="/request-services">Request this service →</Link>
      </article>)}
    </section>

    <section className="salesConsultSection" id="consultation">
      <div>
        <p className="salesEyebrow">START WITH CLARITY</p>
        <h2>Initial consultation — $75</h2>
        <p>A focused 45-minute consultation helps identify the issue, available evidence, relevant jurisdictions, practical limits and the best investigative path before you commit to a larger engagement.</p>
      </div>
      <div className="salesConsultOptions">
        <div><strong>$75</strong><span>45-minute initial consultation</span></div>
        <div><strong>$125</strong><span>90-minute extended consultation</span></div>
        <div><strong>$150</strong><span>Urgent / same-day consultation</span></div>
      </div>
      <p className="salesFinePrint">The $75 initial consultation is credited toward the starting investigation fee when WETrace is retained within 7 days. Any additional fees, expenses, database charges or third-party costs are disclosed or authorized as part of the case scope.</p>
    </section>

    <section className="salesProcess" id="process">
      <div className="salesProcessHead">
        <p className="salesEyebrow">HOW IT WORKS</p>
        <h2>A clear path from question to investigation.</h2>
      </div>
      <div className="salesSteps">
        <article><span>1</span><h3>Submit your request</h3><p>Tell us what happened, where it happened, who is involved and what outcome you need.</p></article>
        <article><span>2</span><h3>Consult & scope</h3><p>WETrace reviews lawful purpose, urgency, jurisdiction, available evidence and the recommended service.</p></article>
        <article><span>3</span><h3>Authorize the case</h3><p>You receive the scope, starting fee and hourly rate before investigative work begins.</p></article>
        <article><span>4</span><h3>Investigate & report</h3><p>Case activity, evidence and findings are organized into a professional investigative record and report.</p></article>
      </div>
    </section>

    <section className="salesSafety">
      <div>
        <p className="salesEyebrow">RESPONSIBLE INVESTIGATIONS</p>
        <h2>Lawful purpose is required.</h2>
      </div>
      <p>WETrace services are not offered for stalking, harassment, unlawful surveillance, credential theft, impersonation, hacking, unauthorized access to restricted records, or other illegal activity. Sensitive records and investigative techniques are handled according to applicable authorization and jurisdictional requirements.</p>
    </section>

    <section className="salesCta">
      <div>
        <p className="salesEyebrow">READY TO START?</p>
        <h2>Tell WETrace what you need to know.</h2>
        <p>Submit a confidential intake request and choose the service that best matches your situation.</p>
      </div>
      <Link className="salesPrimary" href="/request-services">Request investigation</Link>
    </section>

    <footer className="salesFooter">
      <div className="salesBrand"><span className="salesBrandMark">W</span><span><strong>WE<span>Trace</span></strong><small>INVESTIGATE · TRACE · INTELLIGENCE</small></span></div>
      <p>Worldwide investigation and intelligence services. Availability and scope depend on jurisdiction, lawful authority and case facts.</p>
      <div><Link href="/request-services">Request services</Link><Link href="/login">Investigator sign in</Link></div>
    </footer>
  </main>;
}
