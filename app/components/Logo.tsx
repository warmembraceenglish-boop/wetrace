import Link from "next/link";

export default function Logo(){
 return <Link href="/" className="brand" aria-label="WETrace home">
   <div className="brandMark" aria-hidden="true"><span className="brandW">W</span><span className="brandOrbit"/><span className="brandLens"/></div>
   <div><div className="brandName"><strong>WE</strong><span>Trace</span></div><div className="brandSub">INVESTIGATE · TRACE · INTELLIGENCE</div></div>
 </Link>
}