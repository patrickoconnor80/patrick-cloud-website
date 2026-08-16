import { useState, useMemo } from "react";
import { createRoot } from "react-dom/client";

// ═══════════════════════════════════════════════════════════════
// Base figures EXACT from Fundrise Innovation Fund audited Annual 
// Report (FYE Mar 31, 2026). Stale reference valuations corrected 
// to reflect what's ACTUALLY embedded in the NAV — anchored to 
// fresh 2026 tranches VCX bought at known round prices, not 
// outdated 2025 marks. Markups are dilution-adjusted (pre-money 
// to pre-money), per Financial Samurai's methodology.
// ═══════════════════════════════════════════════════════════════
const SHARES = 35.797138; // million, exact
const OFFICIAL_NAV = 18.97;
const VCX_PRICE = 34;

const CASH = 75717;
const OTHER_ASSETS = 10450 + 632 + 508;
const REPO_PAYABLE = 15879;
const DEFERRED_TAX_LIAB = 3850;
const OTHER_LIABS = 1529 + 1099 + 164 + 42 + 12;
const FIXED_INCOME_CMBS = 65751;
const SHORT_TERM_MMF = 38310;

// stale = valuation ALREADY reflected in the $18.97 NAV (evidence-anchored, dilution-adjusted where noted)
const PORTFOLIO = [
  {n:"Anthropic",s:"AI models",val:112418,stale:350,c:900,b:2000,
    cn:"Series H · $900B pre-money · May 28",bn:"FT: $2T+ Oct IPO target",sts:"📋 S-1 Filed",hl:"ipo",
    note:"Stale anchored to Feb 10 tranche bought at cost≈value, right at Series G ($350B pre-money)"},
  {n:"OpenAI",s:"AI models",val:84163,stale:715,c:852,b:1000,
    cn:"Apr round · $852B post-money",bn:"IPO target ~$1T",sts:"📋 S-1 Filed",hl:"ipo",
    note:"Stale per Fundrise's own Feb 27, 2026 asset summary (~$840B post / ~$715B pre)"},
  {n:"Databricks",s:"Data & AI infra",val:95736,stale:134,c:188,b:220,
    cn:"🆕 Coatue-led $3B round · $188B (WSJ)",bn:"IPO target est.",sts:"Pre-IPO",hl:"new",
    note:"Stale = Series L ($134B, Feb 9 2026, likely captured before Mar 31 NAV)"},
  {n:"Anduril",s:"Defense tech",val:37581,stale:30.5,c:61,b:100,
    cn:"Series H closed · $61B · May",bn:"🔄 Talks · $100B · Jul 24",sts:"🔄 Raising",hl:"new",
    note:"Stale anchored to Jan 6 tranche bought at cost≈value, pre-Series H"},
  {n:"Ramp",s:"Fintech",val:27741,stale:32,c:44,b:44,
    cn:"Series F · $44B · Jun 4",bn:"Series F · $44B · Jun 4",sts:"🆕 New round",hl:"new",
    note:""},
  {n:"SpaceX",s:"Aerospace / xAI",val:26856,stale:400,c:1500,b:1500,
    cn:"🚀 SPCX ~$114 · ~$1.5T",bn:"🚀 SPCX ~$114 · ~$1.5T",sts:"🚀 Public (SPCX)",hl:"spacex",
    note:"Stale = ~$400B secondary reference at Jul 2025 acquisition"},
  {n:"Flock Group",s:"Public safety tech",val:23416,stale:7,c:8.4,b:10,
    cn:"Apr 2026 mark · $8.4B",bn:"Near-term est.",sts:"Pre-IPO",hl:"",
    note:"Stale anchored to Mar 2 tranches bought at cost≈value"},
  {n:"Epic Games",s:"Gaming",val:19180,stale:22.5,c:22.5,b:30,
    cn:"Disney round · Feb 2024",bn:"Secondary est.",sts:"Private",hl:"",note:""},
  {n:"dbt Labs",s:"Data infra",val:15000,stale:4.2,c:5.5,b:8,
    cn:"Merger w/ Fivetran pending",bn:"Combined IPO est.",sts:"Pre-IPO",hl:"",note:""},
  {n:"Vanta",s:"Security / GRC",val:10116,stale:4.15,c:4.15,b:6,
    cn:"Series D · Jul 2025",bn:"IPO-ready est.",sts:"Pre-IPO",hl:"",note:""},
  {n:"Canva",s:"Design SaaS",val:9599,stale:39,c:42,b:55,
    cn:"Aug 2025 tender · $42B",bn:"H2 2026 IPO target",sts:"Pre-IPO",hl:"",note:""},
  {n:"Loyal Animal Health",s:"Veterinary biotech",val:9560,stale:null,c:null,b:null,
    cn:"Fresh Dec 2025 round · held flat",bn:"Fresh Dec 2025 round · held flat",sts:"Private",hl:"",note:""},
  {n:"Inspectify",s:"PropTech (affiliate)",val:6000,stale:null,c:null,b:null,
    cn:"Held flat",bn:"Held flat",sts:"Private",hl:"",note:""},
  {n:"Visual Layer",s:"AI / data labeling",val:5000,stale:null,c:null,b:null,
    cn:"SAFE · held flat",bn:"SAFE · held flat",sts:"Private",hl:"",note:""},
  {n:"Erebor Bank",s:"Digital banking",val:5000,stale:null,c:null,b:null,
    cn:"Fresh Feb 2026 round · held flat",bn:"Held flat",sts:"Private",hl:"",note:""},
  {n:"Theory Ventures",s:"Promissory note (10% debt)",val:4732,stale:null,c:null,b:null,
    cn:"10% note, matures 2033",bn:"10% note, matures 2033",sts:"Debt instrument",hl:"",note:""},
  {n:"Handshake",s:"HR / recruiting",val:3415,stale:null,c:null,b:null,
    cn:"Fresh Oct 2025 rounds · held flat",bn:"Held flat",sts:"Pre-IPO",hl:"",note:""},
  {n:"AI-LLM LLC",s:"AI (undisclosed)",val:3105,stale:1,c:2,b:5,
    cn:"~est.",bn:"~est.",sts:"Private",hl:"",note:""},
  {n:"Fin (Intercom)",s:"Customer AI",val:2802,stale:null,c:3.6,b:3.6,
    cn:"🤝 Salesforce · $3.6B",bn:"🤝 Salesforce · $3.6B",sts:"🤝 Acquired",hl:"acquired",
    note:"Fresh Oct 2025 tranche; marking to $3.6B acquisition price directly"},
  {n:"Anyscale",s:"AI infra (Ray)",val:2494,stale:1,c:1.65,b:1.65,
    cn:"🤝 Nscale · $1.65B",bn:"🤝 Nscale · $1.65B",sts:"🤝 Acquired",hl:"acquired",note:""},
  {n:"Rhino Labs",s:"PropTech / fintech",val:1414,stale:null,c:null,b:null,
    cn:"Fresh 2025 rounds, already marked down",bn:"Held flat",sts:"Private",hl:"",note:""},
  {n:"Immuta",s:"Data security",val:1022,stale:1.2,c:1.5,b:2.5,
    cn:"~Series E est.",bn:"~est.",sts:"Private",hl:"",note:""},
  {n:"Ditto",s:"Edge sync / IoT",val:1000,stale:null,c:null,b:null,
    cn:"Fresh Jan 2025 round · held flat",bn:"Held flat",sts:"Private",hl:"",note:""},
  {n:"Hightouch",s:"Data activation",val:683,stale:1,c:1.5,b:2.5,
    cn:"~Series B/C est.",bn:"~est.",sts:"Private",hl:"",note:""},
  {n:"Stripe",s:"Fintech / payments",val:618,stale:91.5,c:159,b:200,
    cn:"Feb 2026 secondary · $159B",bn:"Near IPO est.",sts:"Pre-IPO",hl:"",note:""},
  {n:"Omni Analytics",s:"BI / analytics",val:588,stale:0.25,c:0.4,b:0.8,
    cn:"~Series B est.",bn:"~est.",sts:"Private",hl:"",note:""},
  {n:"Risotto",s:"HR / IT automation",val:500,stale:null,c:null,b:null,
    cn:"Fresh 2025 rounds · held flat",bn:"Held flat",sts:"Private",hl:"",note:""},
  {n:"Luminos",s:"AI (undisclosed)",val:364,stale:0.1,c:0.2,b:0.5,
    cn:"~est.",bn:"~est.",sts:"Private",hl:"",note:""},
  {n:"Gumloop",s:"AI automation",val:22,stale:0.1,c:0.3,b:0.8,
    cn:"~Seed/A est.",bn:"~est.",sts:"Private",hl:"",note:""},
];

const HL = {
  ipo:     {row:"#eff6ff",val:"#1d4ed8",badge:{background:"#dbeafe",color:"#1e40af"}},
  new:     {row:"#f0fdf4",val:"#15803d",badge:{background:"#dcfce7",color:"#166534"}},
  spacex:  {row:"#fdf4ff",val:"#7c3aed",badge:{background:"#f3e8ff",color:"#6d28d9"}},
  acquired:{row:"#fff7ed",val:"#c2410c",badge:{background:"#ffedd5",color:"#9a3412"}},
  "":      {row:null,     val:"#374151",badge:{background:"#f3f4f6",color:"#6b7280"}},
};

function fmt(n){
  if(n===null||n===undefined)return"—";
  if(n>=1000)return"$"+(n/1000).toFixed(2)+"T";
  if(n>=1)return"$"+n.toFixed(1)+"B";
  return"$"+(n*1000).toFixed(0)+"M";
}
function fmtM(n){return"$"+(n/1000).toFixed(1)+"M";}

function VCXNav(){
  const[bull,setBull]=useState(false);
  const[query,setQuery]=useState("");
  const[sortK,setSortK]=useState("val");
  const[sortD,setSortD]=useState(-1);

  const computed=useMemo(()=>PORTFOLIO.map(h=>{
    const curr=bull?h.b:h.c;
    const pu=h.stale?h.val*(curr/h.stale):h.val;
    const uplift=pu-h.val;
    const navPerShare=uplift/(SHARES*1000);
    return{...h,curr,pu,uplift,navPerShare};
  }),[bull]);

  const equityUpdated=computed.reduce((s,h)=>s+h.pu,0);
  const netAssetsUpdated = equityUpdated + FIXED_INCOME_CMBS + SHORT_TERM_MMF + CASH + OTHER_ASSETS 
    - REPO_PAYABLE - DEFERRED_TAX_LIAB - OTHER_LIABS;
  
  const newNav=(netAssetsUpdated)/(SHARES*1000);
  const pctGain=Math.round(((newNav/OFFICIAL_NAV)-1)*100);
  const premium=((VCX_PRICE/newNav)-1)*100;
  const isDiscount=premium<0;

  const filtered=useMemo(()=>{
    const q=query.toLowerCase();
    let rows=q?computed.filter(h=>h.n.toLowerCase().includes(q)||h.s.toLowerCase().includes(q)):[...computed];
    rows.sort((a,b)=>{
      const va=a[sortK],vb=b[sortK];
      if(typeof va==="string")return sortD*va.localeCompare(vb);
      return sortD*((vb||0)-(va||0));
    });
    return rows;
  },[computed,query,sortK,sortD]);

  function sort(k){if(sortK===k)setSortD(d=>d*-1);else{setSortK(k);setSortD(-1);}}

  const TH=({k,label})=>(
    <th onClick={()=>sort(k)} style={{cursor:"pointer",textAlign:"left",fontSize:"10px",fontWeight:500,color:"#6b7280",padding:"6px 7px",borderBottom:"1px solid #e5e7eb",background:"white",whiteSpace:"nowrap",userSelect:"none"}}>
      {label} {sortK===k?(sortD>0?"▲":"▼"):<span style={{opacity:.3}}>▲</span>}
    </th>
  );

  return(
    <div style={{padding:"16px",fontFamily:"system-ui,sans-serif",maxWidth:"100%"}}>
      <div style={{marginBottom:"10px"}}>
        <h2 style={{fontSize:"16px",fontWeight:500,margin:"0 0 2px",color:"#111"}}>VCX NAV model — dilution-adjusted, evidence-anchored</h2>
        <p style={{fontSize:"11px",color:"#6b7280",margin:0}}>Base figures exact from audited annual report. Stale references corrected to what's already IN the NAV.</p>
      </div>

      <div style={{background:"#fef2f2",borderLeft:"3px solid #ef4444",padding:"9px 12px",borderRadius:"0 6px 6px 0",marginBottom:"10px",fontSize:"11px",color:"#991b1b",lineHeight:1.6}}>
        <strong>⚠️ Major correction from prior model:</strong> Previous versions used outdated stale references (e.g. Anthropic $183B, Sep 2025) that pre-dated fresh 2026 tranches VCX bought AT-COST right near NAV date — meaning growth had already happened and was already reflected. Anthropic's correct stale reference is ~$350B (Series G pre-money, per a Feb 10 2026 tranche bought at cost≈value). This roughly HALVES the Anthropic markup (2.57x vs. 5.3x used before) and similarly corrects several other positions. Positions with a fresh 2025-26 tranche priced at cost≈value are now held flat (no further uplift assumed) since there's no clear next-round evidence yet.
      </div>

      <div style={{background:isDiscount?"#f0fdf4":"#fef9c3",borderLeft:`3px solid ${isDiscount?"#16a34a":"#ca8a04"}`,padding:"8px 12px",borderRadius:"0 6px 6px 0",marginBottom:"12px",fontSize:"11px",color:isDiscount?"#14532d":"#713f12",lineHeight:1.6}}>
        <strong>VCX ${VCX_PRICE} · {isDiscount?`${Math.abs(premium).toFixed(0)}% DISCOUNT`:`${premium.toFixed(0)}% premium`} to corrected NAV (${newNav.toFixed(2)})</strong> · Official NAV: $18.97 (exact)
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(115px,1fr))",gap:"8px",marginBottom:"12px"}}>
        {[
          {l:"Official NAV/sh",v:"$18.97",s:"Exact · Mar 31, 2026",g:false},
          {l:"Corrected NAV/sh",v:"$"+newNav.toFixed(2),s:"+"+pctGain+"% vs. official",g:true},
          {l:`VCX $${VCX_PRICE}`,v:isDiscount?Math.abs(premium).toFixed(0)+"% disc.":premium.toFixed(0)+"% prem.",s:"vs. corrected NAV",g:isDiscount},
          {l:"Net assets",v:"$"+(netAssetsUpdated/1000).toFixed(0)+"M",s:"vs. $678.9M official",g:true},
        ].map(m=>(
          <div key={m.l} style={{background:m.g?"#f0fdf4":"#f9fafb",borderRadius:"8px",padding:"10px 12px",border:`1px solid ${m.g?"#bbf7d0":"#e5e7eb"}`}}>
            <div style={{fontSize:"9.5px",color:"#6b7280",textTransform:"uppercase",letterSpacing:".05em",marginBottom:"2px"}}>{m.l}</div>
            <div style={{fontSize:"18px",fontWeight:500,color:m.g?"#166534":"#4b5563"}}>{m.v}</div>
            <div style={{fontSize:"9.5px",color:"#9ca3af",marginTop:"1px"}}>{m.s}</div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",gap:"8px",marginBottom:"10px",flexWrap:"wrap",alignItems:"center"}}>
        <button onClick={()=>setBull(false)} style={{padding:"5px 12px",fontSize:"11px",borderRadius:"6px",border:`1px solid ${!bull?"#93c5fd":"#d1d5db"}`,background:!bull?"#dbeafe":"transparent",color:!bull?"#1d4ed8":"#6b7280",fontWeight:!bull?500:400,cursor:"pointer"}}>Conservative</button>
        <button onClick={()=>setBull(true)} style={{padding:"5px 12px",fontSize:"11px",borderRadius:"6px",border:`1px solid ${bull?"#93c5fd":"#d1d5db"}`,background:bull?"#dbeafe":"transparent",color:bull?"#1d4ed8":"#6b7280",fontWeight:bull?500:400,cursor:"pointer"}}>Bull case</button>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search…" style={{padding:"5px 9px",fontSize:"11px",border:"1px solid #d1d5db",borderRadius:"6px",outline:"none",width:"130px"}}/>
      </div>

      <div style={{overflowX:"auto",maxHeight:"480px",overflowY:"auto",border:"1px solid #e5e7eb",borderRadius:"8px"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"11px",tableLayout:"fixed",minWidth:"860px"}}>
          <colgroup>
            <col style={{width:"16%"}}/><col style={{width:"10%"}}/><col style={{width:"10%"}}/><col style={{width:"16%"}}/><col style={{width:"10%"}}/><col style={{width:"9%"}}/><col style={{width:"13%"}}/><col style={{width:"16%"}}/>
          </colgroup>
          <thead style={{position:"sticky",top:0,zIndex:10}}>
            <tr>
              <TH k="n" label="Company"/>
              <TH k="val" label="Value (exact)"/>
              <TH k="stale" label="Stale val."/>
              <TH k="curr" label="Current val."/>
              <TH k="pu" label="Updated value"/>
              <TH k="navPerShare" label="NAV/sh added"/>
              <TH k="sts" label="Status"/>
              <TH k="note" label="Note"/>
            </tr>
          </thead>
          <tbody>
            {filtered.map((h,i)=>{
              const hl=HL[h.hl]||HL[""];
              const rowBg=hl.row||(i%2===0?"white":"#f9fafb");
              return(
                <tr key={h.n} style={{background:rowBg}}>
                  <td style={{padding:"7px 7px",borderBottom:"1px solid #f3f4f6"}}>
                    <div style={{fontWeight:500,fontSize:"11.5px"}}>{h.n}</div>
                    <div style={{color:"#9ca3af",fontSize:"9.5px",marginTop:"1px"}}>{h.s}</div>
                  </td>
                  <td style={{padding:"7px 7px",borderBottom:"1px solid #f3f4f6",color:"#374151",fontWeight:500}}>{fmtM(h.val)}</td>
                  <td style={{padding:"7px 7px",borderBottom:"1px solid #f3f4f6",color:"#374151"}}>{fmt(h.stale)}</td>
                  <td style={{padding:"7px 7px",borderBottom:"1px solid #f3f4f6"}}>
                    <span style={{color:h.hl?hl.val:"#374151",fontWeight:h.hl?"500":"400"}}>{fmt(h.curr)}</span>
                    <div style={{color:h.hl?hl.val:"#9ca3af",fontSize:"9px",marginTop:"1px"}}>{bull?h.bn:h.cn}</div>
                  </td>
                  <td style={{padding:"7px 7px",borderBottom:"1px solid #f3f4f6",fontWeight:500}}>{fmtM(h.pu)}</td>
                  <td style={{padding:"7px 7px",borderBottom:"1px solid #f3f4f6",fontWeight:500,color:h.navPerShare>0.005?"#15803d":h.navPerShare<-0.005?"#b91c1c":"#6b7280"}}>
                    {h.stale?(h.navPerShare>=0?"+":"")+"$"+Math.abs(h.navPerShare).toFixed(2):"—"}
                  </td>
                  <td style={{padding:"7px 7px",borderBottom:"1px solid #f3f4f6"}}>
                    <span style={{...hl.badge,fontSize:"9.5px",fontWeight:500,padding:"2px 6px",borderRadius:"4px",display:"inline-block"}}>{h.sts}</span>
                  </td>
                  <td style={{padding:"7px 7px",borderBottom:"1px solid #f3f4f6",fontSize:"9px",color:"#9ca3af"}}>{h.note}</td>
                </tr>
              );
            })}
            <tr style={{background:"#eff6ff"}}>
              <td colSpan="5" style={{padding:"6px 7px",color:"#1e40af"}}>+ CMBS + MMF + Cash + Other assets</td>
              <td colSpan="3" style={{padding:"6px 7px",color:"#1e40af",fontWeight:500}}>${((FIXED_INCOME_CMBS+SHORT_TERM_MMF+CASH+OTHER_ASSETS)/1000).toFixed(1)}M</td>
            </tr>
            <tr style={{background:"#fef2f2"}}>
              <td colSpan="5" style={{padding:"6px 7px",color:"#991b1b"}}>− Repo, deferred tax, other liabilities</td>
              <td colSpan="3" style={{padding:"6px 7px",color:"#991b1b",fontWeight:500}}>−${((REPO_PAYABLE+DEFERRED_TAX_LIAB+OTHER_LIABS)/1000).toFixed(1)}M</td>
            </tr>
            <tr style={{background:"#f0fdf4",position:"sticky",bottom:0}}>
              <td colSpan="5" style={{padding:"8px 7px",fontWeight:600,color:"#166534",borderTop:"1px solid #bbf7d0"}}>Net assets · NAV/sh</td>
              <td colSpan="3" style={{padding:"8px 7px",fontWeight:600,color:"#166534",borderTop:"1px solid #bbf7d0"}}>${(netAssetsUpdated/1000).toFixed(0)}M · ${newNav.toFixed(2)}/sh</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{fontSize:"10px",color:"#9ca3af",marginTop:"10px",paddingTop:"8px",borderTop:"1px solid #f3f4f6",lineHeight:1.6}}>
        <strong>Methodology:</strong> Base values exact from FYE Mar 31, 2026 audited annual report. Stale reference valuations anchored to evidence of fresh 2026 tranches bought at cost≈value (implying no further markup vs. that round), or to the most recent primary/secondary round predating the NAV date. Positions with only fresh 2025-26 tranches and no confirmed newer round are held flat pending evidence. Databricks updated to $188B (WSJ, Coatue-led round). OpenAI stale anchored to Fundrise's own Feb 27, 2026 asset summary (~$715B pre-money). Cross-checked against Financial Samurai's independent dilution-adjusted estimate (~$29-31/sh at lockup, ~$33-45 year-end 2026). Not investment advice.
      </div>
    </div>
  );
}

// --- mount ---------------------------------------------------------
createRoot(document.getElementById("vcx-nav-root")).render(<VCXNav />);
