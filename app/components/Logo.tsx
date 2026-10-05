import Link from "next/link";
export default function Logo(){
 return <Link className="brand" href="/">
   <span className="brandMark"><b>W</b><i/></span>
   <span><strong>WETrace</strong><small>INVESTIGATE · TRACE · INTELLIGENCE</small></span>
 </Link>;
}
