"use client";

import {useState,type CSSProperties} from "react";

const officialHosts = new Set(["www.fbi.gov","fbi.gov","www.mshp.dps.missouri.gov","mshp.dps.missouri.gov","www.rcmp.ca","rcmp.ca","www.police.govt.nz","www.scotland.police.uk"]);

type Props = {src:string;alt:string;style?:CSSProperties;className?:string};

function candidates(src:string){
  // Public official photographs can load in the reader's browser even when
  // the publisher declines a server-side preview. Private signed URLs stay private.
  if(src.startsWith("/api/source-image?")){
    const original = new URLSearchParams(src.split("?")[1]).get("url");
    if(original){
      try{
        const url = new URL(original);
        if(url.protocol==="https:" && officialHosts.has(url.hostname) && !url.username && !url.password && !url.port){
          return [original,src];
        }
      }catch{}
    }
  }
  return [src];
}

function Photo({src,alt,style,className}:Props){
  const [attempt,setAttempt]=useState(0);
  const urls=candidates(src);
  if(attempt>=urls.length){
    return <div className={className} role="img" aria-label={alt+": photo unavailable"} style={{minHeight:80,display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",padding:12,fontSize:12,color:"#a9bdd0",background:"#0a2031",...style}}>
      Photo unavailable from source
    </div>;
  }
  return <img className={className} src={urls[attempt]} alt={alt} style={style} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>setAttempt(n=>n+1)}/>;
}

export default function CasePhoto(props:Props){
  return <Photo key={props.src} {...props}/>;
}
