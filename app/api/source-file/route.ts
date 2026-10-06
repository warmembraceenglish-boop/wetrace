import {NextRequest,NextResponse} from "next/server";

const ALLOWED_HOSTS=new Set([
  "www.mshp.dps.missouri.gov",
  "mshp.dps.missouri.gov",
  "www.fbi.gov",
  "fbi.gov"
]);

const MAX_BYTES=25*1024*1024;

async function fetchAllowed(url:URL,depth=0):Promise<Response>{
  if(depth>2)throw new Error("Too many redirects");
  if(url.protocol!=="https:"||!ALLOWED_HOSTS.has(url.hostname))throw new Error("Source host is not allowed");

  const response=await fetch(url.toString(),{
    redirect:"manual",
    cache:"no-store",
    headers:{
      "User-Agent":"WETrace/1.0 official-source-viewer",
      "Accept":"application/pdf,image/avif,image/webp,image/apng,image/svg+xml,image/*,text/plain,*/*;q=0.6"
    }
  });

  if(response.status>=300&&response.status<400){
    const location=response.headers.get("location");
    if(!location)throw new Error("Redirect missing location");
    return fetchAllowed(new URL(location,url),depth+1);
  }
  return response;
}

export async function GET(req:NextRequest){
  const raw=req.nextUrl.searchParams.get("url");
  if(!raw)return NextResponse.json({error:"Missing url"},{status:400});

  let url:URL;
  try{url=new URL(raw);}catch{return NextResponse.json({error:"Invalid url"},{status:400});}

  try{
    const upstream=await fetchAllowed(url);
    if(!upstream.ok)return NextResponse.json({error:"Source returned "+upstream.status},{status:502});

    const type=(upstream.headers.get("content-type")||"application/octet-stream").split(";")[0].toLowerCase();
    const allowed=type==="application/pdf"||type.startsWith("image/")||type==="text/plain";
    if(!allowed)return NextResponse.json({error:"This official source cannot be embedded safely."},{status:415});

    const body=await upstream.arrayBuffer();
    if(body.byteLength>MAX_BYTES)return NextResponse.json({error:"Source file is too large to preview."},{status:413});

    return new NextResponse(body,{
      status:200,
      headers:{
        "Content-Type":type,
        "Content-Disposition":"inline",
        "Cache-Control":"public, max-age=3600, s-maxage=86400",
        "X-Content-Type-Options":"nosniff"
      }
    });
  }catch(error:any){
    return NextResponse.json({error:error?.message||"Could not load official source file"},{status:502});
  }
}
