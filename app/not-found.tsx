import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#071B2F",color:"#E8F6FC",fontFamily:"Inter, sans-serif"}}>
      <div style={{textAlign:"center",padding:32}}>
        <div style={{fontSize:12,letterSpacing:3,color:"#29C3E8",fontWeight:700}}>WETRACE</div>
        <h1 style={{fontSize:42,margin:"12px 0 8px"}}>Case page not found</h1>
        <p style={{color:"#9CB1C3",marginBottom:22}}>The requested workspace route does not exist.</p>
        <Link href="/" style={{color:"#fff",background:"#0B4F86",padding:"10px 16px",borderRadius:9,textDecoration:"none"}}>Return to dashboard</Link>
      </div>
    </main>
  );
}
