// /api/og.js
// Generates a dynamic match card image for sharing
// Usage: /api/og?home=Brazil&away=France&hg=2&ag=1&group=C&date=Jun+13&venue=New+York
//
// Setup: npm install @vercel/og

import { ImageResponse } from "@vercel/og";

export const config = { runtime: "edge" };

const FLAG_CODES = {
  "Mexico":"mx","South Africa":"za","South Korea":"kr","Czechia":"cz",
  "Canada":"ca","Bosnia & Herz.":"ba","Qatar":"qa","Switzerland":"ch",
  "Brazil":"br","Morocco":"ma","Haiti":"ht","Scotland":"gb-sct",
  "United States":"us","Paraguay":"py","Australia":"au","Turkiye":"tr",
  "Germany":"de","Curacao":"cw","Ivory Coast":"ci","Ecuador":"ec",
  "Netherlands":"nl","Japan":"jp","Sweden":"se","Tunisia":"tn",
  "Belgium":"be","Egypt":"eg","Iran":"ir","New Zealand":"nz",
  "Spain":"es","Cape Verde":"cv","Saudi Arabia":"sa","Uruguay":"uy",
  "France":"fr","Senegal":"sn","Iraq":"iq","Norway":"no",
  "Argentina":"ar","Algeria":"dz","Austria":"at","Jordan":"jo",
  "Portugal":"pt","DR Congo":"cd","Uzbekistan":"uz","Colombia":"co",
  "England":"gb-eng","Croatia":"hr","Ghana":"gh","Panama":"pa",
};

function flagUrl(team) {
  const code = FLAG_CODES[team];
  return code ? `https://flagcdn.com/w160/${code}.png` : null;
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const home    = searchParams.get("home")   || "Team A";
  const away    = searchParams.get("away")   || "Team B";
  const hg      = searchParams.get("hg");
  const ag      = searchParams.get("ag");
  const group   = searchParams.get("group")  || "";
  const date    = searchParams.get("date")   || "";
  const venue   = searchParams.get("venue")  || "";
  const stage   = searchParams.get("stage")  || (group ? `Group ${group}` : "World Cup 2026");
  const hasScore = hg !== null && ag !== null;

  const homeFlagUrl = flagUrl(home);
  const awayFlagUrl = flagUrl(away);

  return new ImageResponse(
    <div
      style={{
        width: "1200px",
        height: "630px",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(135deg, #060e0a 0%, #0c1a12 50%, #060e0a 100%)",
        fontFamily: "system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background decoration */}
      <div style={{position:"absolute",top:-100,right:-100,width:400,height:400,borderRadius:"50%",background:"rgba(74,222,128,0.03)",display:"flex"}}/>
      <div style={{position:"absolute",bottom:-150,left:-100,width:500,height:500,borderRadius:"50%",background:"rgba(74,222,128,0.03)",display:"flex"}}/>

      {/* Top bar */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"32px 48px 0"}}>
        <div style={{display:"flex",flexDirection:"column"}}>
          <span style={{fontSize:13,color:"#3d6a4d",letterSpacing:"0.2em",fontWeight:700}}>FIFA</span>
          <span style={{fontSize:22,fontWeight:900,color:"#d4ead9",lineHeight:1}}>WORLD CUP</span>
          <span style={{fontSize:22,fontWeight:900,color:"#4ade80",lineHeight:1}}>2026™</span>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end"}}>
          <span style={{fontSize:16,color:"#4ade80",fontWeight:700,background:"rgba(74,222,128,0.15)",padding:"6px 16px",borderRadius:20,border:"1px solid rgba(74,222,128,0.3)"}}>{stage}</span>
          {date && <span style={{fontSize:14,color:"#3d6a4d",marginTop:8}}>{date}</span>}
        </div>
      </div>

      {/* Main match card */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",flex:1,padding:"0 48px",gap:0}}>

        {/* Home team */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",flex:1,gap:16}}>
          {homeFlagUrl
            ? <img src={homeFlagUrl} width={120} height={80} style={{objectFit:"cover",borderRadius:8,boxShadow:"0 4px 24px rgba(0,0,0,0.4)"}}/>
            : <div style={{width:120,height:80,background:"rgba(74,222,128,0.1)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:48}}>🏳️</div>
          }
          <span style={{fontSize:28,fontWeight:800,color:"#d4ead9",textAlign:"center",maxWidth:200}}>{home}</span>
        </div>

        {/* Score / VS */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",minWidth:220,gap:8}}>
          {hasScore ? (
            <>
              <div style={{display:"flex",alignItems:"center",gap:16}}>
                <span style={{fontSize:88,fontWeight:900,color:"#4ade80",fontFamily:"monospace",lineHeight:1}}>{hg}</span>
                <span style={{fontSize:48,color:"#1a3828",fontWeight:700,lineHeight:1}}>–</span>
                <span style={{fontSize:88,fontWeight:900,color:"#4ade80",fontFamily:"monospace",lineHeight:1}}>{ag}</span>
              </div>
              <span style={{fontSize:14,color:"#3d6a4d",fontWeight:700,letterSpacing:"0.15em"}}>FULL TIME</span>
            </>
          ) : (
            <>
              <span style={{fontSize:48,fontWeight:900,color:"#1a3828",letterSpacing:8}}>VS</span>
              <span style={{fontSize:14,color:"#3d6a4d",fontWeight:700,letterSpacing:"0.1em"}}>UPCOMING</span>
            </>
          )}
        </div>

        {/* Away team */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",flex:1,gap:16}}>
          {awayFlagUrl
            ? <img src={awayFlagUrl} width={120} height={80} style={{objectFit:"cover",borderRadius:8,boxShadow:"0 4px 24px rgba(0,0,0,0.4)"}}/>
            : <div style={{width:120,height:80,background:"rgba(74,222,128,0.1)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:48}}>🏳️</div>
          }
          <span style={{fontSize:28,fontWeight:800,color:"#d4ead9",textAlign:"center",maxWidth:200}}>{away}</span>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 48px 32px"}}>
        {venue
          ? <span style={{fontSize:13,color:"#3d6a4d"}}>📍 {venue}</span>
          : <span/>
        }
        <span style={{fontSize:13,color:"#3d6a4d",fontWeight:600}}>world-cup-app-iota.vercel.app</span>
      </div>

      {/* Green border accent */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:3,background:"linear-gradient(90deg,transparent,#4ade80,transparent)",display:"flex"}}/>
    </div>,
    {
      width: 1200,
      height: 630,
    }
  );
}
