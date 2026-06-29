import React, { useState, useEffect, useRef } from "react";

// Shared App.jsx values, passed in as props rather than imported directly
// to avoid a circular import (App.jsx -> WCNews.jsx -> App.jsx), since
// App.jsx itself needs to import this file to render it.
// C, DS, AFFILIATE, SHOP_CATEGORIES, timeAgo, useElemHeight, SkeletonNewsCard

export default function WCNewsTab({
  language="en", t=(key, fallback)=>fallback,
  tabTop=116,
  // Shared App.jsx values, passed as props to avoid a circular import
  C, DS, AFFILIATE, SHOP_CATEGORIES, timeAgo, useElemHeight, SkeletonNewsCard,
}) {
  const isPtBR = language === "pt-BR";
  const tx = (en, pt) => isPtBR ? pt : en;
  const localeLabel = (label) => {
    if (!isPtBR) return label;
    return ({ USA:"EUA", UK:"Reino Unido", Brazil:"Brasil", Argentina:"Argentina", Mexico:"México", Spain:"Espanha", Germany:"Alemanha", France:"França", Italy:"Itália", Japan:"Japão" })[label] || label;
  };
  const shopLabel = (label) => {
    if (!isPtBR) return label;
    return ({
      "Jerseys":"Camisas",
      "Soccer Balls":"Bolas de futebol",
      "Watch Party Decor":"Decoração para assistir aos jogos",
      "Streaming Devices":"Dispositivos de streaming",
      "WC Merchandise":"Produtos da Copa",
    })[label] || label;
  };
  const localTimeAgo = (value) => {
    const raw = timeAgo(value);
    if (!isPtBR) return raw;
    return String(raw)
      .replace("just now", "agora")
      .replace(/(\d+)m ago/, "$1 min atrás")
      .replace(/(\d+)h ago/, "$1 h atrás")
      .replace(/(\d+)d ago/, "$1 d atrás");
  };

  const _ref = useRef(null);
  const _h = useElemHeight(_ref);
  const NEWS_LOCALES = [
    { flag:"🇺🇸", label:"USA",       lang:"en", country:"us" },
    { flag:"🇬🇧", label:"UK",        lang:"en", country:"gb" },
    { flag:"🇧🇷", label:"Brazil",    lang:"pt", country:"br" },
    { flag:"🇦🇷", label:"Argentina", lang:"es", country:"ar" },
    { flag:"🇲🇽", label:"Mexico",    lang:"es", country:"mx" },
    { flag:"🇪🇸", label:"Spain",     lang:"es", country:"es" },
    { flag:"🇩🇪", label:"Germany",   lang:"de", country:"de" },
    { flag:"🇫🇷", label:"France",    lang:"fr", country:"fr" },
    { flag:"🇮🇹", label:"Italy",     lang:"it", country:"it" },
    { flag:"🇯🇵", label:"Japan",     lang:"ja", country:"jp" },
  ];

  const [selectedLocales, setSelectedLocales] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("wc2026_news_locales") || "null");
      return Array.isArray(saved) && saved.length ? saved : ["us"];
    } catch { return ["us"]; }
  });
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const fetchNews = async (countries = selectedLocales) => {
    setLoading(true); setError(null);
    try {
      // Fetch all selected countries in parallel
      const locales = NEWS_LOCALES.filter(l => countries.includes(l.country));
      const results = await Promise.all(
        locales.map(loc => fetch(`/api/news?lang=${loc.lang}&country=${loc.country}`)
          .then(r => r.json())
          .then(d => {
            if (d._quota === "exhausted") return [];
            return (d.articles || []).map(a => ({...a, _country: loc.country, _flag: loc.flag}));
          })
          .catch(() => [])
        )
      );
      // Interleave: zip articles from all sources round-robin
      const merged = [];
      const maxLen = Math.max(...results.map(r => r.length));
      for (let i = 0; i < maxLen; i++) {
        results.forEach(r => { if (r[i]) merged.push(r[i]); });
      }
      // Dedupe by url
      const seen = new Set();
      const deduped = merged.filter(a => { if (seen.has(a.url)) return false; seen.add(a.url); return true; });
      if (deduped.length) { setArticles(deduped); setLastFetch(Date.now()); }
      else setError(tx("No articles available — daily news quota may be reached. Cached articles refresh overnight.", "Nenhuma notícia disponível — a cota diária pode ter sido atingida. Notícias em cache atualizam durante a noite."));
    } catch(e) { setError(tx("Couldn't load news. Try again.", "Não foi possível carregar as notícias. Tente novamente.")); }
    setLoading(false);
  };

  const toggleLocale = (country) => {
    setSelectedLocales(prev => {
      const next = prev.includes(country)
        ? prev.length > 1 ? prev.filter(c => c !== country) : prev // keep at least 1
        : [...prev, country];
      try { localStorage.setItem("wc2026_news_locales", JSON.stringify(next)); } catch {}
      fetchNews(next);
      return next;
    });
  };

  useEffect(() => { fetchNews(); }, []);

  return (
    <div>
      {/* Sticky header */}
      <div ref={_ref} style={{position:"relative",top:0,left:"auto",transform:"none",width:"100%",maxWidth:700,zIndex:2,background:C.bg,borderBottom:`1px solid ${C.b2}`,boxShadow:DS.shadow.sticky,padding:"8px 13px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <span style={{fontSize:15,fontWeight:700,color:C.green}}>{tx("📰 World Cup 2026 News", "📰 Notícias da Copa 2026")}</span>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {lastFetch && <span style={{fontSize:11,color:C.dim}}>{tx("Updated", "Atualizado")} {localTimeAgo(new Date(lastFetch).toISOString())}</span>}
            <button onClick={()=>fetchNews()} disabled={loading} style={{padding:"4px 10px",borderRadius:8,border:`1px solid ${C.b2}`,background:C.s2,color:C.mid,fontSize:11,cursor:"pointer",opacity:loading?0.5:1}}>↻ {tx("Refresh", "Atualizar")}</button>
          </div>
        </div>
        {/* Source country picker */}
        <div style={{fontSize:10,color:C.dim,fontWeight:700,letterSpacing:"0.08em",marginBottom:5}}>{tx("NEWS SOURCE COUNTRY", "PAÍS DA FONTE DAS NOTÍCIAS")}</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {NEWS_LOCALES.map(loc=>{
            const active = selectedLocales.includes(loc.country);
            return (
              <button key={loc.country} onClick={()=>toggleLocale(loc.country)} style={{padding:"4px 10px",borderRadius:999,border:`1px solid ${active?C.green:C.b2}`,background:active?`${C.green}18`:C.s2,color:active?C.green:C.mid,fontSize:11,fontWeight:600,cursor:"pointer",flexShrink:0}}>
                {loc.flag} {localeLabel(loc.label)}
              </button>
            );
          })}
        </div>
      </div>
      

      <div style={{height:0}}/>
      <div style={{padding:"0 0 20px"}}>
        {/* News articles below */}

        {/* News feed */}
        <div style={{fontSize:12,fontWeight:700,color:C.mid,letterSpacing:"0.08em",marginBottom:10}}>{tx("🗞️ LATEST HEADLINES", "🗞️ PRINCIPAIS MANCHETES")}</div>

        {loading && (
          <div>
            {[1,2,3,4,5].map(i=><SkeletonNewsCard key={i}/>)}
          </div>
        )}

        {!loading && error && (
          <div style={{textAlign:"center",padding:"30px 0"}}>
            <div style={{fontSize:13,color:C.dim,marginBottom:12}}>{error}</div>
            <button onClick={fetchNews} style={{padding:"8px 20px",borderRadius:10,border:`1px solid ${C.green}`,background:`${C.green}15`,color:C.green,fontSize:13,cursor:"pointer"}}>{tx("Try again", "Tentar novamente")}</button>
          </div>
        )}

        {!loading && !error && articles.map((a, i) => (
          <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" style={{display:"block",textDecoration:"none",marginBottom:10}}>
            <div style={{background:C.s2,border:`1px solid ${C.b1}`,borderRadius:12,overflow:"hidden",display:"flex",gap:0,transition:"border-color .15s"}}
              onMouseEnter={e=>e.currentTarget.style.borderColor=C.green}
              onMouseLeave={e=>e.currentTarget.style.borderColor=C.b1}>
              {a.image && (
                <img src={a.image} alt="" style={{width:90,height:90,objectFit:"cover",flexShrink:0}}
                  onError={e=>{e.target.style.display="none";}}/>
              )}
              <div style={{padding:"10px 12px",flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:C.text,lineHeight:1.4,marginBottom:4,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{a.title}</div>
                {a.description && <div style={{fontSize:11,color:C.dim,lineHeight:1.4,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden",marginBottom:6}}>{a.description}</div>}
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  {a._flag && selectedLocales.length > 1 && <span style={{fontSize:12}}>{a._flag}</span>}
                  <span style={{fontSize:10,color:C.mid,fontWeight:600}}>{a.source}</span>
                  <span style={{fontSize:10,color:C.dim}}>·</span>
                  <span style={{fontSize:10,color:C.dim}}>{localTimeAgo(a.publishedAt)}</span>
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Fan Shop */}
      <div style={{marginTop:24,borderTop:`1px solid ${C.b2}`,paddingTop:16}}>
        <div style={{fontSize:11,color:C.dim,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:12}}>{tx("🛍️ Fan Shop", "🛍️ Loja do torcedor")}</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {SHOP_CATEGORIES.map(cat => (
            <a key={cat.id} href={AFFILIATE.amazon(cat.q)} target="_blank" rel="noopener noreferrer sponsored" style={{textDecoration:"none"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:C.s1,border:`1px solid ${C.b2}`,borderRadius:10,cursor:"pointer"}}>
                <span style={{fontSize:20}}>{cat.icon}</span>
                <span style={{fontSize:13,fontWeight:600,color:C.text,flex:1}}>{shopLabel(cat.label)}</span>
                <span style={{fontSize:11,color:C.gold}}>{tx("Shop →", "Comprar →")}</span>
              </div>
            </a>
          ))}
        </div>
        <div style={{fontSize:10,color:C.dim,marginTop:10,lineHeight:1.5}}>
          {tx("Affiliate links — we earn a small commission at no cost to you.", "Links de afiliado — podemos receber uma pequena comissão sem custo adicional para você.")}
        </div>
      </div>
    </div>
  );
}

