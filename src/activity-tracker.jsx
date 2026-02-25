import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";

// ─── Activity Tree ────────────────────────────────────────────────────────────
const DEFAULT_ACTIVITY_TREE = [
  {
    id: "ymca", label: "YMCA", icon: "🏋️", color: "#2563eb",
    sub: [
      { id: "ymca-class",     label: "Fitness Class",    icon: "🤸" },
      { id: "ymca-pickle",    label: "Pickleball",       icon: "🏓" },
      { id: "ymca-strength",  label: "Strength Training", icon: "🏋️" },
      { id: "ymca-treadmill", label: "Treadmill",        icon: "🏃" },
      { id: "ymca-bike",      label: "Stationary Bike",  icon: "🚴" },
      { id: "ymca-elliptical",label: "Elliptical",       icon: "🔄" },
    ]
  },
  {
    id: "climbing", label: "Rock Climbing", icon: "🧗", color: "#059669",
    sub: [
      { id: "climbing-gym",     label: "Gym",     icon: "🧗" },
      { id: "climbing-outdoor", label: "Outdoor", icon: "⛰️" },
    ]
  },
  { id: "running",  label: "Running",  icon: "🏃", color: "#d97706", sub: [] },
  { id: "cycling",  label: "Cycling",  icon: "🚴", color: "#7c3aed", sub: [] },
  { id: "swimming", label: "Swimming", icon: "🏊", color: "#0891b2", sub: [] },
  { id: "yoga",     label: "Yoga",     icon: "🧘", color: "#be185d", sub: [] },
  {
    id: "mobility-toolkit", label: "Mobility Toolkit", icon: "🔁", color: "#0d9488",
    sub: [
      // These get dynamically replaced by getNextMTSub() at log time — kept minimal as fallback
      { id: "mt-session", label: "Session", icon: "🔁" },
    ],
    note: "4-week Moves Method program"
  },
  {
    id: "foundation-training", label: "Foundation Training", icon: "🌿", color: "#65a30d",
    sub: [],
    note: "Lower back rehab & posterior chain"
  },
];

// ─── Smart auto-assign icon & color ──────────────────────────────────────────
const ICON_RULES = [
  // Sports & cardio
  [/pickle|ping.?pong/i,          "🏓", "#16a34a"],
  [/tennis/i,                      "🎾", "#65a30d"],
  [/basket|hoops/i,                "🏀", "#ea580c"],
  [/soccer|football/i,             "⚽", "#15803d"],
  [/swim/i,                        "🏊", "#0891b2"],
  [/run|jog|sprint/i,              "🏃", "#d97706"],
  [/walk|hike|trail/i,             "🚶", "#92400e"],
  [/bike|cycl|spin/i,              "🚴", "#7c3aed"],
  [/row/i,                         "🚣", "#0e7490"],
  [/ski|snowboard/i,               "⛷️", "#1d4ed8"],
  [/surf/i,                        "🏄", "#0891b2"],
  [/golf/i,                        "⛳", "#16a34a"],
  [/box|muay|martial|karate|judo/i,"🥊", "#dc2626"],
  [/climb/i,                       "🧗", "#059669"],
  // Gym & training
  [/strength|lift|weight|power/i,  "🏋️", "#4f46e5"],
  [/cardio|treadmill|elliptic/i,   "🏃", "#f59e0b"],
  [/cross.?fit/i,                  "🔥", "#ef4444"],
  [/circuit/i,                     "⚡", "#f59e0b"],
  [/hiit/i,                        "⚡", "#ef4444"],
  [/class|studio/i,                "🤸", "#8b5cf6"],
  // Mind-body & rehab
  [/yoga/i,                        "🧘", "#be185d"],
  [/pilates/i,                     "🧘", "#a21caf"],
  [/meditat/i,                     "🪷", "#7c3aed"],
  [/stretch|flexib|mobility/i,     "🔁", "#0d9488"],
  [/rehab|physical.?therap|pt\b/i, "🩺", "#0891b2"],
  [/foundation/i,                  "🌿", "#65a30d"],
  [/breath/i,                      "🌬️", "#38bdf8"],
  // Wellness
  [/dance/i,                       "💃", "#db2777"],
  [/martial|karate|kung|jiu/i,     "🥋", "#dc2626"],
  [/sport/i,                       "🏅", "#d97706"],
  [/outdoor|nature/i,              "🌲", "#16a34a"],
  [/water|aqua/i,                  "💧", "#0284c7"],
];

// Palette to cycle through so new activities always look distinct
const COLOR_PALETTE = [
  "#2563eb","#059669","#d97706","#7c3aed","#0891b2","#be185d",
  "#ef4444","#0d9488","#65a30d","#ea580c","#6366f1","#db2777",
  "#0369a1","#15803d","#b45309","#9333ea","#dc2626","#0f766e",
];

const ICON_POOL = ["⚡","🏅","💪","🎯","🏆","🌟","✨","🔥","🎪","🎠","🎡","🎢"];

function autoAssign(label, existingColors = []) {
  const lower = label.toLowerCase();
  // keyword match
  for (const [re, icon, color] of ICON_RULES) {
    if (re.test(lower)) return { icon, color };
  }
  // fallback: pick next unused color from palette
  const used = new Set(existingColors);
  const color = COLOR_PALETTE.find(c => !used.has(c)) || COLOR_PALETTE[existingColors.length % COLOR_PALETTE.length];
  const icon  = ICON_POOL[Math.floor(Math.random() * ICON_POOL.length)];
  return { icon, color };
}

function autoAssignSub(label, parentIcon) {
  const lower = label.toLowerCase();
  for (const [re, icon] of ICON_RULES) {
    if (re.test(lower)) return icon;
  }
  // number week detection
  const weekMatch = lower.match(/week\s*(\d)/);
  if (weekMatch) return ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣"][parseInt(weekMatch[1])-1] || parentIcon;
  if (/gym|indoor/i.test(lower)) return "🏢";
  if (/outdoor|outside|field/i.test(lower)) return "⛰️";
  if (/morning/i.test(lower)) return "🌅";
  if (/evening|night/i.test(lower)) return "🌙";
  if (/beginner|intro/i.test(lower)) return "🌱";
  if (/advanced|hard/i.test(lower)) return "🔥";
  return parentIcon;
}

const REST_TYPES = [
  { id: "injury", label: "Injury",   icon: "🤕", color: "#eab308" },
  { id: "sick",   label: "Sick",     icon: "🤒", color: "#f59e0b" },
  { id: "rest",   label: "Rest Day", icon: "😴", color: "#fbbf24" },
];

const DAY_LABELS  = ["S","M","T","W","T","F","S"];
const MONTHS      = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_S    = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const toDateStr = d => d.toISOString().split("T")[0];
const todayStr  = () => toDateStr(new Date());

function formatDate(ds) {
  const [y,m,d] = ds.split("-");
  return `${MONTHS_S[parseInt(m)-1]} ${parseInt(d)}, ${y}`;
}

function isRestId(id) { return REST_TYPES.some(r=>r.id===id); }

function resolveActivity(id, tree) {
  // MT day sessions stored as "w1d1", "w2d4" etc
  if (/^w\dd\d$/.test(id)) {
    const mt = resolveMTId(id);
    if (mt) return mt;
  }
  for (const a of tree) {
    if (a.id === id) return { ...a, parentLabel: null };
    for (const s of (a.sub||[])) {
      if (s.id === id) return { ...s, color: a.color, parentLabel: a.label };
    }
  }
  const rt = REST_TYPES.find(r=>r.id===id);
  if (rt) return { ...rt, parentLabel: "Recovery" };
  return { id, label: id, icon: "⚡", color: "#64748b", parentLabel: null };
}

function displayLabel(info) {
  return info.parentLabel ? `${info.parentLabel} · ${info.label}` : info.label;
}

// ─── Theme tokens ─────────────────────────────────────────────────────────────
function tokens(dark) {
  return dark ? {
    bg:       "#0c0c0e",
    surface:  "#141416",
    surface2: "#1c1c1f",
    border:   "#242428",
    border2:  "#2e2e33",
    text:     "#f5f5f5",
    textSub:  "#71717a",
    textMuted:"#3f3f46",
    accent:   "#2563eb",
    pill:     "#1c1c1f",
    pillBorder:"#2e2e33",
  } : {
    bg:       "#fafafa",
    surface:  "#ffffff",
    surface2: "#f4f4f5",
    border:   "#e4e4e7",
    border2:  "#d4d4d8",
    text:     "#09090b",
    textSub:  "#71717a",
    textMuted:"#a1a1aa",
    accent:   "#2563eb",
    pill:     "#f4f4f5",
    pillBorder:"#e4e4e7",
  };
}

// ─── Tiny components ──────────────────────────────────────────────────────────
function Label({ children, t }) {
  return <div style={{fontSize:"12px",letterSpacing:"2px",color:t.textSub,marginBottom:"10px",fontWeight:"500"}}>{children}</div>;
}

function Input({ t, ...props }) {
  return (
    <input {...props} style={{
      width:"100%", background:t.surface2, border:`1px solid ${t.border}`,
      color:t.text, padding:"11px 13px", borderRadius:"9px",
      fontSize:"14px", fontFamily:"inherit", boxSizing:"border-box",
      outline:"none",
      ...props.style,
    }}/>
  );
}

function Textarea({ t, ...props }) {
  return (
    <textarea {...props} style={{
      width:"100%", background:t.surface2, border:`1px solid ${t.border}`,
      color:t.text, padding:"11px 13px", borderRadius:"9px",
      fontSize:"14px", fontFamily:"inherit", boxSizing:"border-box",
      resize:"none", outline:"none",
      ...props.style,
    }}/>
  );
}

function Pill({ active, color, onClick, children, t }) {
  return (
    <button onClick={onClick} style={{
      background: active ? (color+"18") : t.pill,
      color:      active ? color : t.textSub,
      border:     `1px solid ${active ? color+"55" : t.pillBorder}`,
      padding:"10px 16px", borderRadius:"100px", cursor:"pointer",
      fontSize:"14px", fontWeight: active?"600":"400",
      fontFamily:"inherit", transition:"all 0.12s",
      display:"flex", alignItems:"center", gap:"5px",
      whiteSpace:"nowrap",
    }}>{children}</button>
  );
}

function Card({ t, children, style={} }) {
  return (
    <div style={{background:t.surface, border:`1px solid ${t.border}`, borderRadius:"12px", ...style}}>
      {children}
    </div>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ data, size=110, t }) {
  const total = data.reduce((s,d)=>s+d.value,0);
  if (!total) return null;
  const cx=size/2,cy=size/2,r=size*0.36;
  let cum=-Math.PI/2;
  const slices=data.map(d=>{
    const angle=(d.value/total)*2*Math.PI;
    const x1=cx+r*Math.cos(cum),y1=cy+r*Math.sin(cum);
    cum+=angle;
    const x2=cx+r*Math.cos(cum),y2=cy+r*Math.sin(cum);
    return {...d,path:`M${cx} ${cy}L${x1} ${y1}A${r} ${r} 0 ${angle>Math.PI?1:0} 1 ${x2} ${y2}Z`};
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((s,i)=><path key={i} d={s.path} fill={s.color} opacity={0.85}/>)}
      <circle cx={cx} cy={cy} r={r*0.6} fill={t.surface}/>
      <text x={cx} y={cy-4} textAnchor="middle" fill={t.text} fontSize="15" fontWeight="600">{total}</text>
      <text x={cx} y={cy+11} textAnchor="middle" fill={t.textSub} fontSize="8" letterSpacing="1">TOTAL</text>
    </svg>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────
function FreqChart({ logs, tree, t }) {
  const weeks=[];
  const now=new Date();
  for(let w=7;w>=0;w--){
    const s=new Date(now); s.setDate(now.getDate()-w*7-now.getDay()); s.setHours(0,0,0,0);
    const e=new Date(s); e.setDate(s.getDate()+6); e.setHours(23,59,59,999);
    const active=logs.filter(l=>{const d=new Date(l.date+"T12:00:00");return !isRestId(l.activity)&&d>=s&&d<=e;}).length;
    const rest=logs.filter(l=>{const d=new Date(l.date+"T12:00:00");return isRestId(l.activity)&&d>=s&&d<=e;}).length;
    weeks.push({label:String(s.getDate()),mon:MONTHS_S[s.getMonth()],active,rest,isFirst:w===7||s.getDate()<=7});
  }
  const mx=Math.max(...weeks.map(w=>w.active),1);
  const H=64,bW=22,gap=10;
  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${weeks.length*(bW+gap)-gap} ${H+26}`} preserveAspectRatio="xMidYMid meet">
        {weeks.map((w,i)=>{
          const bh=Math.max((w.active/mx)*H,w.active>0?4:0);
          const x=i*(bW+gap);
          return (
            <g key={i}>
              <rect x={x} y={H-bh} width={bW} height={bh||2} fill={w.active>0?t.accent:t.border} rx={4}/>
              {w.rest>0&&<rect x={x} y={H-3} width={bW} height={3} fill="#8b5cf6" rx={2}/>}
              {w.active>0&&<text x={x+bW/2} y={H-bh-4} textAnchor="middle" fill={t.textSub} fontSize="9">{w.active}</text>}
              <text x={x+bW/2} y={H+14} textAnchor="middle" fill={t.textMuted} fontSize="9">{w.label}</text>
              {w.isFirst&&<text x={x+bW/2} y={H+24} textAnchor="middle" fill={t.textMuted} fontSize="8">{w.mon}</text>}
            </g>
          );
        })}
      </svg>
      <div style={{display:"flex",gap:"14px",marginTop:"6px"}}>
        {[[t.accent,"Active"],["#8b5cf6","Rest/Recovery"]].map(([c,lbl])=>(
          <div key={lbl} style={{display:"flex",alignItems:"center",gap:"5px",fontSize:"12px",color:t.textSub}}>
            <div style={{width:"8px",height:"8px",borderRadius:"2px",background:c}}/>
            {lbl}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Oura Badge ───────────────────────────────────────────────────────────────
function OuraBadge({ data, t }) {
  if (!data) return null;
  const items=[
    data.readiness!=null&&{label:"Readiness",value:data.readiness,color:data.readiness>=85?"#059669":data.readiness>=70?"#d97706":"#ef4444"},
    data.sleep!=null&&{label:"Sleep",value:data.sleep,color:data.sleep>=85?"#059669":data.sleep>=70?"#d97706":"#ef4444"},
    data.hrv!=null&&{label:"HRV",value:Math.round(data.hrv)+"ms",color:t.textSub},
  ].filter(Boolean);
  return (
    <div style={{marginTop:"10px",padding:"12px 14px",background:t.surface2,borderRadius:"10px",border:`1px solid ${t.border}`}}>
      <div style={{fontSize:"12px",color:t.textSub,letterSpacing:"2px",marginBottom:"8px"}}>💍 OURA · {data.date}</div>
      <div style={{display:"flex",gap:"20px"}}>
        {items.map(it=>(
          <div key={it.label}>
            <div style={{fontSize:"12px",fontWeight:"600",color:it.color}}>{it.value}</div>
            <div style={{fontSize:"14px",color:t.textSub,letterSpacing:"1px"}}>{it.label.toUpperCase()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Calendar ─────────────────────────────────────────────────────────────────
function CalendarView({ logs, ouraData, tree, mtProgress, t }) {
  const [vd, setVd] = useState(new Date());
  const [sel, setSel] = useState(null);
  const yr=vd.getFullYear(), mo=vd.getMonth();
  const dim=new Date(yr,mo+1,0).getDate();
  const fd=new Date(yr,mo,1).getDay();
  const tStr=todayStr();

  const ds=d=>`${yr}-${String(mo+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const dl=d=>logs.filter(l=>l.date===ds(d));
  const od=d=>ouraData[ds(d)];
  const canNext=new Date(yr,mo+1,1)<=new Date();

  // Find all MT sessions completed on a given date string
  const mtOnDate = dateStr => {
    const sessions = [];
    for (const wk of MT_PROGRAM) {
      for (const day of wk.days) {
        const key = `w${wk.week}d${day.day}`;
        const prog = mtProgress[key];
        if (prog?.done && prog?.date === dateStr) {
          sessions.push({ key, week:wk.week, day:day.day, focus:day.focus, type:day.type,
            icon: day.type==="flow"?"🌊":"🔁" });
        }
      }
    }
    return sessions;
  };

  const cells=[]; for(let i=0;i<fd;i++)cells.push(null); for(let d=1;d<=dim;d++)cells.push(d);
  const isPast=d=>ds(d)<tStr, isToday=d=>ds(d)===tStr;
  const selLogs=sel?dl(sel):[], selOura=sel?od(sel):null;
  const selMT=sel?mtOnDate(ds(sel)):[];

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"20px"}}>
        <button onClick={()=>{setSel(null);setVd(new Date(yr,mo-1,1));}} style={{background:"none",border:"none",cursor:"pointer",color:t.textSub,fontSize:"12px",padding:"4px 8px"}}>‹</button>
        <span style={{fontSize:"16px",fontWeight:"600",color:t.text}}>{MONTHS[mo]} {yr}</span>
        <button onClick={()=>{setSel(null);setVd(new Date(yr,mo+1,1));}} disabled={!canNext} style={{background:"none",border:"none",cursor:canNext?"pointer":"default",color:canNext?t.textSub:t.border,fontSize:"12px",padding:"4px 8px"}}>›</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"3px",marginBottom:"3px"}}>
        {DAY_LABELS.map((d,i)=><div key={i} style={{textAlign:"center",fontSize:"12px",color:t.textMuted,padding:"3px 0"}}>{d}</div>)}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"3px"}}>
        {cells.map((d,i)=>{
          if(!d) return <div key={"e"+i}/>;
          const dls=dl(d);
          const mtSess=mtOnDate(ds(d));
          const hasMT=mtSess.length>0;
          const actDls=dls.filter(l=>!isRestId(l.activity));
          const rst=dls.find(l=>isRestId(l.activity));
          const todC=isToday(d), isSel=sel===d;
          const isPastDay=ds(d)<tStr;
          const hasO=!!od(d);

          // Determine fill color
          const hasActive = actDls.length > 0 || hasMT;
          const hasRest   = !!rst;
          const missed    = isPastDay && !hasActive && !hasRest && !todC;

          // Primary color: if multiple activities, use first one; rest=yellow; missed=red; future/today=surface
          let fillColor = null;
          if (hasActive) {
            // Use first activity's color (MT if present, else first log)
            if (actDls.length > 0) {
              const info = resolveActivity(actDls[0].activity, tree);
              fillColor = info.color;
            } else {
              fillColor = MT_COLOR;
            }
          } else if (hasRest) {
            fillColor = REST_TYPES.find(r=>r.id===rst.activity)?.color || "#eab308";
          } else if (missed) {
            fillColor = "#ef4444";
          }

          // Multiple activities → show as split halves
          const allColors = [
            ...actDls.map(l=>resolveActivity(l.activity,tree).color),
            ...(hasMT && !actDls.some(l=>/^w\dd\d$/.test(l.activity)) ? [MT_COLOR] : []),
            ...(hasRest ? [REST_TYPES.find(r=>r.id===rst.activity)?.color||"#eab308"] : []),
          ].filter(Boolean);
          const multiColor = allColors.length > 1;

          const textColor = fillColor ? "#fff" : todC ? t.accent : t.textSub;
          const textWeight = fillColor || todC ? "700" : "400";

          return (
            <div key={d} onClick={()=>setSel(isSel?null:d)} style={{
              aspectRatio:"1", minHeight:"38px", borderRadius:"7px",
              background: multiColor ? "transparent" : fillColor ? fillColor : t.surface2,
              border: isSel ? `2px solid ${t.text}` : todC && !fillColor ? `2px solid ${t.accent}` : `1px solid ${fillColor ? fillColor+"44" : t.border}`,
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              cursor:"pointer", position:"relative", overflow:"hidden", transition:"all 0.1s",
              opacity: missed ? 0.75 : 1,
            }}>
              {/* Multi-color split background */}
              {multiColor && (
                <div style={{position:"absolute",inset:0,display:"flex"}}>
                  {allColors.map((c,ci)=>(
                    <div key={ci} style={{flex:1,background:c}}/>
                  ))}
                </div>
              )}

              {/* Date number */}
              <span style={{
                fontSize:"14px", fontWeight:textWeight, zIndex:1, lineHeight:1,
                color: (fillColor || multiColor) ? "#fff" : todC ? t.accent : t.textSub,
                textShadow: (fillColor || multiColor) ? "0 1px 2px rgba(0,0,0,0.3)" : "none",
              }}>
                {d}
              </span>

              {/* Oura dot */}
              {hasO && <div style={{position:"absolute",top:"3px",right:"3px",width:"4px",height:"4px",borderRadius:"50%",background: fillColor?"rgba(255,255,255,0.8)":"#8b5cf6",zIndex:2}}/>}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{display:"flex",gap:"10px",marginTop:"12px",flexWrap:"wrap"}}>
        {[
          ["#2563eb","Active"],
          ["#ef4444","Missed"],
          ["#eab308","Rest/Recovery"],
          [t.surface2,"No data"],
        ].map(([bg,lbl])=>(
          <div key={lbl} style={{display:"flex",alignItems:"center",gap:"5px",fontSize:"12px",color:t.textSub}}>
            <div style={{width:"10px",height:"10px",borderRadius:"3px",background:bg,border:`1px solid ${bg==="transparent"||bg===t.surface2?t.border:bg+"44"}`}}/>
            {lbl}
          </div>
        ))}
      </div>

      {sel&&(
        <Card t={t} style={{marginTop:"14px",padding:"14px 16px"}}>
          <div style={{fontSize:"14px",color:t.textSub,marginBottom:"10px"}}>{formatDate(ds(sel))}</div>
          {!selLogs.length&&!selMT.length&&!selOura?(
            <div style={{fontSize:"14px",color:t.textMuted}}>Nothing logged.</div>
          ):(
            <>
              {/* Regular activity logs */}
              {selLogs.map(log=>{
                const info=resolveActivity(log.activity,tree);
                return (
                  <div key={log.id} style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"8px"}}>
                    <span style={{fontSize:"18px"}}>{info.icon}</span>
                    <div>
                      <div style={{fontSize:"14px",fontWeight:"600",color:info.color}}>{displayLabel(info)}{log.duration?" · "+log.duration+" min":""}</div>
                      {log.notes&&<div style={{fontSize:"14px",color:t.textSub,fontStyle:"italic"}}>{log.notes}</div>}
                    </div>
                  </div>
                );
              })}
              {/* MT sessions */}
              {selMT.map(sess=>(
                <div key={sess.key} style={{display:"flex",alignItems:"flex-start",gap:"10px",marginBottom:"8px",padding:"8px 10px",background:MT_COLOR+"10",borderRadius:"8px",border:`1px solid ${MT_COLOR}33`}}>
                  <span style={{fontSize:"12px",marginTop:"1px"}}>{sess.icon}</span>
                  <div>
                    <div style={{fontSize:"12px",fontWeight:"700",color:MT_COLOR}}>
                      Mobility Toolkit · Wk{sess.week} Day {sess.day}
                    </div>
                    <div style={{fontSize:"14px",color:t.textSub,marginTop:"2px"}}>{sess.focus}</div>
                  </div>
                </div>
              ))}
              {selOura&&<OuraBadge data={selOura} t={t}/>}
            </>
          )}
        </Card>
      )}
    </div>
  );
}

// ─── Activity Manager ─────────────────────────────────────────────────────────
function ActivityManager({ tree, setTree, t }) {
  const [newLabel,  setNewLabel]  = useState("");
  const [newSub,    setNewSub]    = useState({});  // parentId -> label string
  const [expanded,  setExpanded]  = useState({});
  const [preview,   setPreview]   = useState(null); // {icon,color} live preview
  const [msg,       setMsg]       = useState("");

  const flash = m => { setMsg(m); setTimeout(()=>setMsg(""),2500); };

  // Live preview as user types
  const handleLabelChange = val => {
    setNewLabel(val);
    if (val.trim().length > 1) {
      const existing = tree.map(a=>a.color);
      setPreview(autoAssign(val, existing));
    } else {
      setPreview(null);
    }
  };

  function addTop() {
    const label = newLabel.trim();
    if (!label) return;
    const existing = tree.map(a=>a.color);
    const { icon, color } = autoAssign(label, existing);
    const id = "custom-" + Date.now();
    setTree([...tree, { id, label, icon, color, sub:[], custom:true }]);
    setNewLabel(""); setPreview(null);
    flash(`${icon} "${label}" added`);
  }

  function removeTop(id) { setTree(tree.filter(a=>a.id!==id)); }

  function addSub(parentId) {
    const label = (newSub[parentId]||"").trim();
    if (!label) return;
    const parent = tree.find(a=>a.id===parentId);
    const icon   = autoAssignSub(label, parent?.icon||"⚡");
    const subId  = parentId + "-" + Date.now();
    setTree(tree.map(a => a.id===parentId
      ? { ...a, sub:[...(a.sub||[]), { id:subId, label, icon, custom:true }] }
      : a
    ));
    setNewSub(ns=>({...ns,[parentId]:""}));
    flash(`${icon} "${label}" added`);
  }

  function removeSub(parentId, subId) {
    setTree(tree.map(a => a.id===parentId
      ? { ...a, sub:(a.sub||[]).filter(s=>s.id!==subId) }
      : a
    ));
  }

  return (
    <div>
      <p style={{fontSize:"14px",color:t.textSub,marginTop:0,lineHeight:"1.6"}}>
        Type a name — icon and color are assigned automatically. Add sub-categories to any activity.
      </p>

      {/* Add activity */}
      <Card t={t} style={{padding:"16px",marginBottom:"16px"}}>
        <Label t={t}>NEW ACTIVITY</Label>
        <div style={{display:"flex",gap:"8px",alignItems:"center",marginBottom:"12px"}}>
          {/* Live preview badge */}
          <div style={{
            width:"44px",height:"44px",borderRadius:"10px",flexShrink:0,
            background: preview?preview.color+"22":t.surface2,
            border:`1px solid ${preview?preview.color+"55":t.border}`,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:"12px",transition:"all 0.2s",
          }}>
            {preview?.icon||"?"}
          </div>
          <Input t={t} placeholder="e.g. Pilates, Tennis, CrossFit…"
            value={newLabel}
            onChange={e=>handleLabelChange(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&addTop()}
            style={{flex:1}}
          />
        </div>
        {preview&&(
          <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"12px",padding:"8px 10px",background:t.surface2,borderRadius:"8px",border:`1px solid ${t.border}`}}>
            <div style={{width:"8px",height:"8px",borderRadius:"50%",background:preview.color}}/>
            <span style={{fontSize:"12px",color:t.textSub}}>Will be assigned {preview.icon} with this colour</span>
            <div style={{width:"16px",height:"16px",borderRadius:"4px",background:preview.color,marginLeft:"auto"}}/>
          </div>
        )}
        <button onClick={addTop} disabled={!newLabel.trim()} style={{
          background:newLabel.trim()?t.accent:"transparent",
          color:newLabel.trim()?"#fff":t.textMuted,
          border:`1px solid ${newLabel.trim()?t.accent:t.border}`,
          padding:"10px 20px",borderRadius:"8px",
          cursor:newLabel.trim()?"pointer":"default",
          fontSize:"14px",fontFamily:"inherit",fontWeight:"600",transition:"all 0.12s",
        }}>Add Activity</button>
      </Card>

      {msg&&(
        <div style={{padding:"10px 14px",background:t.surface2,borderRadius:"8px",fontSize:"12px",color:t.accent,marginBottom:"14px",border:`1px solid ${t.border}`}}>
          ✓ {msg}
        </div>
      )}

      {/* Activity list */}
      <Label t={t}>ALL ACTIVITIES</Label>
      <div style={{display:"flex",flexDirection:"column",gap:"7px"}}>
        {tree.map(a=>(
          <Card t={t} key={a.id} style={{overflow:"hidden"}}>
            {/* Row header */}
            <div
              onClick={()=>setExpanded(e=>({...e,[a.id]:!e[a.id]}))}
              style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:"10px",cursor:"pointer",
                borderBottom:expanded[a.id]?`1px solid ${t.border}`:"none"}}>
              <div style={{
                width:"32px",height:"32px",borderRadius:"8px",flexShrink:0,
                background:a.color+"20",border:`1px solid ${a.color}44`,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",
              }}>{a.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:"14px",fontWeight:"600",color:t.text}}>{a.label}</div>
                {a.note&&<div style={{fontSize:"12px",color:t.textSub,marginTop:"1px"}}>{a.note}</div>}
                {!a.note&&<div style={{fontSize:"12px",color:t.textMuted}}>{(a.sub||[]).length} sub-activities</div>}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                {a.custom&&(
                  <button onClick={e=>{e.stopPropagation();removeTop(a.id);}} style={{background:"none",border:"none",color:t.textMuted,cursor:"pointer",fontSize:"12px",lineHeight:1,padding:"2px 6px"}}>×</button>
                )}
                <span style={{color:t.textMuted,fontSize:"14px"}}>{expanded[a.id]?"▲":"▼"}</span>
              </div>
            </div>

            {/* Expanded: sub-list + add sub */}
            {expanded[a.id]&&(
              <div style={{padding:"10px 14px 14px"}}>
                {(a.sub||[]).map(s=>(
                  <div key={s.id} style={{display:"flex",alignItems:"center",gap:"8px",padding:"7px 0",borderBottom:`1px solid ${t.border}`}}>
                    <span style={{fontSize:"14px",width:"22px",textAlign:"center"}}>{s.icon}</span>
                    <span style={{flex:1,fontSize:"12px",color:t.text}}>{s.label}</span>
                    {s.custom&&<button onClick={()=>removeSub(a.id,s.id)} style={{background:"none",border:"none",color:t.textMuted,cursor:"pointer",fontSize:"12px",padding:"2px 5px"}}>×</button>}
                  </div>
                ))}
                <div style={{display:"flex",gap:"8px",marginTop:"10px",alignItems:"center"}}>
                  <Input t={t}
                    placeholder="Add sub-activity…"
                    value={newSub[a.id]||""}
                    onChange={e=>setNewSub(ns=>({...ns,[a.id]:e.target.value}))}
                    onKeyDown={e=>e.key==="Enter"&&addSub(a.id)}
                    style={{flex:1,fontSize:"14px",padding:"8px 10px"}}
                  />
                  <button onClick={()=>addSub(a.id)} style={{
                    background:t.accent,color:"#fff",border:"none",
                    padding:"8px 14px",borderRadius:"8px",cursor:"pointer",
                    fontSize:"14px",fontWeight:"600",fontFamily:"inherit",whiteSpace:"nowrap",
                  }}>+ Add</button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Mobility Toolkit Program ────────────────────────────────────────────────
const MT_PROGRAM = [
  {
    week: 1, days: [
      { day: 1, focus: "Shoulders, Spine, Hamstrings, Hips, Wrists", type: "training",  tags: ["shoulders","spine","hamstrings","hips","wrists"] },
      { day: 2, focus: "Shoulders, Ankles, Knees",                   type: "training",  tags: ["shoulders","ankles","knees"] },
      { day: 3, focus: "Flow 1",                                      type: "flow",      tags: ["flow"] },
      { day: 4, focus: "Shoulders, Spine, Hamstrings, Hips, Wrists", type: "training",  tags: ["shoulders","spine","hamstrings","hips","wrists"] },
      { day: 5, focus: "Shoulders, Ankles, Knees",                   type: "training",  tags: ["shoulders","ankles","knees"] },
      { day: 6, focus: "Shoulders, Spine, Hamstrings, Hips, Wrists", type: "training",  tags: ["shoulders","spine","hamstrings","hips","wrists"] },
    ]
  },
  {
    week: 2, days: [
      { day: 1, focus: "Shoulders, Spine, Hamstrings, Hips, Wrists", type: "training",  tags: ["shoulders","spine","hamstrings","hips","wrists"] },
      { day: 2, focus: "Shoulders, Ankles, Knees",                   type: "training",  tags: ["shoulders","ankles","knees"] },
      { day: 3, focus: "Flow 2",                                      type: "flow",      tags: ["flow"] },
      { day: 4, focus: "Shoulders, Spine, Hamstrings, Hips, Wrists", type: "training",  tags: ["shoulders","spine","hamstrings","hips","wrists"] },
      { day: 5, focus: "Shoulders, Ankles, Knees",                   type: "training",  tags: ["shoulders","ankles","knees"] },
      { day: 6, focus: "Shoulders, Spine, Hamstrings, Hips, Wrists", type: "training",  tags: ["shoulders","spine","hamstrings","hips","wrists"] },
    ]
  },
  {
    week: 3, days: [
      { day: 1, focus: "Shoulders, Spine, Hamstrings, Hips, Wrists", type: "training",  tags: ["shoulders","spine","hamstrings","hips","wrists"] },
      { day: 2, focus: "Shoulders, Ankles, Knees",                   type: "training",  tags: ["shoulders","ankles","knees"] },
      { day: 3, focus: "Flow 3",                                      type: "flow",      tags: ["flow"] },
      { day: 4, focus: "Shoulders, Spine, Hamstrings, Hips, Wrists", type: "training",  tags: ["shoulders","spine","hamstrings","hips","wrists"] },
      { day: 5, focus: "Shoulders, Ankles, Knees",                   type: "training",  tags: ["shoulders","ankles","knees"] },
      { day: 6, focus: "Shoulders, Spine, Hamstrings, Hips, Wrists", type: "training",  tags: ["shoulders","spine","hamstrings","hips","wrists"] },
    ]
  },
  {
    week: 4, days: [
      { day: 1, focus: "Shoulders, Spine, Hamstrings, Hips, Wrists", type: "training",  tags: ["shoulders","spine","hamstrings","hips","wrists"] },
      { day: 2, focus: "Flow 1",                                      type: "flow",      tags: ["flow"] },
      { day: 3, focus: "Shoulders, Ankles, Knees",                   type: "training",  tags: ["shoulders","ankles","knees"] },
      { day: 4, focus: "Flow 2",                                      type: "flow",      tags: ["flow"] },
      { day: 5, focus: "Shoulders, Spine, Hamstrings, Hips, Wrists", type: "training",  tags: ["shoulders","spine","hamstrings","hips","wrists"] },
      { day: 6, focus: "Flow 3",                                      type: "flow",      tags: ["flow"] },
    ]
  },
];

const MT_COLOR   = "#0d9488";
const MT_TOTAL   = MT_PROGRAM.reduce((s,w)=>s+w.days.length,0); // 24

// Returns the next incomplete session as { key, week, day, focus, type, icon, label }
function getNextMTSession(mtProgress) {
  for (const wk of MT_PROGRAM) {
    for (const d of wk.days) {
      const key = `w${wk.week}d${d.day}`;
      if (!mtProgress[key]?.done) {
        const flowNum = d.focus.match(/Flow (\d)/)?.[1];
        const icon = d.type === "flow" ? ["🌊","🌊","🌊","🌊"][parseInt(flowNum||1)-1] : "🔁";
        return {
          key, week: wk.week, day: d.day,
          focus: d.focus, type: d.type,
          icon,
          label: `Wk${wk.week} Day ${d.day} · ${d.focus}`,
          shortLabel: `Week ${wk.week}, Day ${d.day}`,
          activityId: key, // use the key as the activity id for logs
        };
      }
    }
  }
  return null; // all done
}

// Given a log activity id like "w2d4", resolve it to a rich display object
function resolveMTId(id) {
  const m = id.match(/^w(\d)d(\d)$/);
  if (!m) return null;
  const [,w,d] = m.map(Number);
  const wk = MT_PROGRAM[w-1];
  if (!wk) return null;
  const day = wk.days[d-1];
  if (!day) return null;
  const flowNum = day.focus.match(/Flow (\d)/)?.[1];
  return {
    id,
    label: `Day ${d} · ${day.focus}`,
    parentLabel: `Mobility Toolkit · Wk${w}`,
    icon: day.type==="flow" ? "🌊" : "🔁",
    color: MT_COLOR,
    week: w, day: d, focus: day.focus, type: day.type,
  };
}

const TAG_COLORS = {
  shoulders:  "#6366f1",
  spine:      "#0891b2",
  hamstrings: "#d97706",
  hips:       "#be185d",
  wrists:     "#059669",
  ankles:     "#f59e0b",
  knees:      "#7c3aed",
  flow:       "#0d9488",
};

function MobilityView({ mtProgress, setMtProgress, t }) {
  // mtProgress: { "w1d1": { done: bool, date: "YYYY-MM-DD", notes: "" }, ... }
  const [expandedWeek, setExpandedWeek] = useState(()=>{
    // Auto-open the current active week
    for (let wi=0; wi<MT_PROGRAM.length; wi++) {
      const w = MT_PROGRAM[wi];
      const allDone = w.days.every(d => mtProgress[`w${wi+1}d${d.day}`]?.done);
      if (!allDone) return wi+1;
    }
    return 4;
  });
  const [activeKey, setActiveKey] = useState(null); // key being noted
  const [noteText,  setNoteText]  = useState("");

  const totalDone = Object.values(mtProgress).filter(v=>v?.done).length;
  const pct       = Math.round(totalDone / MT_TOTAL * 100);

  // Find current day (first incomplete) - avoid labeled break for transpiler compatibility
  const currentKey = (() => {
    for (const wk of MT_PROGRAM) {
      for (const d of wk.days) {
        const k = `w${wk.week}d${d.day}`;
        if (!mtProgress[k]?.done) return k;
      }
    }
    return null;
  })();

  const [editingDate, setEditingDate] = useState(null); // key being date-edited

  function markDone(key, date) {
    const prev = mtProgress[key];
    setMtProgress({ ...mtProgress, [key]: { done:true, date, notes:prev?.notes||"" } });
    setEditingDate(null);
  }

  function markUndone(key) {
    const prev = mtProgress[key];
    setMtProgress({ ...mtProgress, [key]: { ...prev, done:false } });
  }

  function saveNote(key) {
    setMtProgress(prev => ({
      ...prev,
      [key]: { ...(prev[key]||{}), notes: noteText }
    }));
    setActiveKey(null);
    setNoteText("");
  }

  const weekDone  = w => w.days.filter(d=>mtProgress[`w${w.week}d${d.day}`]?.done).length;
  const weekTotal = w => w.days.length;

  return (
    <div>
      {/* Header card */}
      <Card t={t} style={{padding:"16px 18px",marginBottom:"18px",borderTop:`3px solid ${MT_COLOR}`}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:"14px"}}>
          <div>
            <div style={{fontSize:"12px",fontWeight:"700",color:t.text}}>Mobility Toolkit</div>
            <div style={{fontSize:"14px",color:t.textSub,marginTop:"2px"}}>by Moves Method · 4 weeks · 24 sessions</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:"12px",fontWeight:"700",color:MT_COLOR}}>{pct}%</div>
            <div style={{fontSize:"12px",color:t.textMuted}}>{totalDone}/{MT_TOTAL} done</div>
          </div>
        </div>

        {/* 4 segmented week progress bars */}
        <div style={{display:"flex",flexDirection:"column",gap:"7px"}}>
          {MT_PROGRAM.map(wk => {
            const done  = weekDone(wk);
            const total = weekTotal(wk);
            const wpct  = Math.round(done/total*100);
            const wDone = done === total;
            const isCurrent = !wDone && MT_PROGRAM.slice(0,wk.week-1).every(pw=>weekDone(pw)===weekTotal(pw));
            return (
              <div key={wk.week}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"4px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                    <span style={{fontSize:"14px",fontWeight:isCurrent?"700":"500",color:isCurrent?MT_COLOR:wDone?t.textSub:t.text}}>
                      Week {wk.week}
                    </span>
                    {isCurrent && <span style={{fontSize:"14px",background:MT_COLOR,color:"#fff",padding:"1px 5px",borderRadius:"6px",letterSpacing:"0.5px"}}>NOW</span>}
                    {wDone    && <span style={{fontSize:"12px",color:MT_COLOR}}>✓</span>}
                  </div>
                  <span style={{fontSize:"12px",color:t.textMuted}}>{done}/{total}</span>
                </div>
                <div style={{background:t.surface2,borderRadius:"4px",height:"5px",overflow:"hidden"}}>
                  <div style={{
                    height:"100%", width:wpct+"%",
                    background: wDone ? MT_COLOR : isCurrent ? MT_COLOR+"cc" : MT_COLOR+"55",
                    borderRadius:"4px", transition:"width 0.5s ease",
                  }}/>
                </div>
              </div>
            );
          })}
        </div>

        {totalDone===MT_TOTAL&&(
          <div style={{marginTop:"12px",fontSize:"14px",color:MT_COLOR,fontWeight:"600"}}>
            🎉 Program complete! Great work.
          </div>
        )}
      </Card>

      {/* Week accordions */}
      {MT_PROGRAM.map(wk=>{
        const done=weekDone(wk), total=weekTotal(wk);
        const wDone=done===total;
        const isOpen=expandedWeek===wk.week;
        return (
          <Card t={t} key={wk.week} style={{marginBottom:"10px",overflow:"hidden"}}>
            {/* Week header */}
            <div
              onClick={()=>setExpandedWeek(isOpen?null:wk.week)}
              style={{padding:"13px 16px",display:"flex",alignItems:"center",gap:"12px",cursor:"pointer",
                borderBottom:isOpen?`1px solid ${t.border}`:"none"}}>
              <div style={{
                width:"34px",height:"34px",borderRadius:"8px",flexShrink:0,
                background:wDone?MT_COLOR:t.surface2,
                border:`1px solid ${wDone?MT_COLOR:t.border}`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:wDone?"16px":"13px",fontWeight:"700",
                color:wDone?"#fff":t.textSub,
              }}>{wDone?"✓":wk.week}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:"12px",fontWeight:"600",color:t.text}}>Week {wk.week}</div>
                <div style={{fontSize:"14px",color:t.textSub,marginTop:"1px"}}>{done}/{total} sessions</div>
              </div>
              {/* Mini bar */}
              <div style={{width:"48px"}}>
                <div style={{background:t.surface2,borderRadius:"4px",height:"4px",overflow:"hidden"}}>
                  <div style={{height:"100%",width:(done/total*100)+"%",background:MT_COLOR,borderRadius:"4px",transition:"width 0.4s"}}/>
                </div>
              </div>
              <span style={{color:t.textMuted,fontSize:"14px",marginLeft:"4px"}}>{isOpen?"▲":"▼"}</span>
            </div>

            {/* Day list */}
            {isOpen&&(
              <div>
                {wk.days.map((d,di)=>{
                  const key=`w${wk.week}d${d.day}`;
                  const prog=mtProgress[key];
                  const isDone=prog?.done||false;
                  const isCurrent=key===currentKey;
                  const isNoting=activeKey===key;
                  const isEditingDate=editingDate===key;
                  const isFlow=d.type==="flow";

                  return (
                    <div key={key} style={{
                      borderBottom:di<wk.days.length-1?`1px solid ${t.border}`:"none",
                      background:isCurrent?MT_COLOR+"0a":"transparent",
                    }}>
                      <div style={{padding:"12px 16px",display:"flex",alignItems:"flex-start",gap:"12px"}}>

                        {/* Checkbox — tap to mark done today, or undo */}
                        <button
                          onClick={()=>{ if(isDone) markUndone(key); else setEditingDate(isEditingDate?null:key); }}
                          style={{
                            width:"24px",height:"24px",borderRadius:"6px",flexShrink:0,marginTop:"2px",
                            background:isDone?MT_COLOR:isEditingDate?MT_COLOR+"33":t.surface2,
                            border:`1.5px solid ${isDone||isEditingDate?MT_COLOR:isCurrent?MT_COLOR+"88":t.border}`,
                            cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
                            fontSize:"14px",color:"#fff",transition:"all 0.15s",
                          }}>
                          {isDone?"✓":isEditingDate?"…":""}
                        </button>

                        <div style={{flex:1}}>
                          {/* Title row */}
                          <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"4px",flexWrap:"wrap"}}>
                            <span style={{fontSize:"12px",fontWeight:"600",color:isDone?t.textSub:t.text}}>
                              Day {d.day}
                            </span>
                            {isCurrent&&!isDone&&<span style={{fontSize:"14px",background:MT_COLOR,color:"#fff",padding:"1px 6px",borderRadius:"10px",fontWeight:"600",letterSpacing:"0.5px"}}>NEXT</span>}
                            {isFlow&&<span style={{fontSize:"14px",background:t.surface2,color:t.textSub,padding:"1px 6px",borderRadius:"10px",border:`1px solid ${t.border}`}}>FLOW</span>}
                          </div>

                          {/* Focus tags */}
                          <div style={{display:"flex",flexWrap:"wrap",gap:"4px",marginBottom:"6px"}}>
                            {d.tags.map(tag=>(
                              <span key={tag} style={{
                                fontSize:"12px",padding:"2px 7px",borderRadius:"10px",
                                background:(TAG_COLORS[tag]||MT_COLOR)+"18",
                                color:isDone?t.textMuted:(TAG_COLORS[tag]||MT_COLOR),
                                border:`1px solid ${isDone?t.border:(TAG_COLORS[tag]||MT_COLOR)+"33"}`,
                                fontWeight:"500",textTransform:"capitalize",
                              }}>{tag}</span>
                            ))}
                          </div>

                          {/* Completed: show date (tappable to change) */}
                          {isDone&&prog?.date&&!isEditingDate&&(
                            <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                              <span style={{fontSize:"12px",color:MT_COLOR,fontWeight:"500"}}>
                                ✓ {formatDate(prog.date)}
                              </span>
                              <button onClick={()=>setEditingDate(key)} style={{
                                background:"none",border:`1px solid ${t.border}`,color:t.textMuted,
                                padding:"2px 7px",borderRadius:"5px",cursor:"pointer",fontSize:"12px",fontFamily:"inherit",
                              }}>change date</button>
                            </div>
                          )}

                          {/* Date picker: shown when editing or marking done */}
                          {isEditingDate&&(
                            <div style={{marginTop:"6px",background:t.surface2,borderRadius:"9px",padding:"10px 12px",border:`1px solid ${MT_COLOR}44`}}>
                              <div style={{fontSize:"12px",color:t.textSub,marginBottom:"8px",letterSpacing:"1px"}}>
                                {isDone?"CHANGE DATE":"WHEN DID YOU DO THIS?"}
                              </div>
                              {/* Quick date buttons — last 7 days */}
                              <div style={{display:"flex",gap:"5px",flexWrap:"wrap"}}>
                                {Array.from({length:7},(_,i)=>{
                                  const d = new Date(); d.setDate(d.getDate()-i); d.setHours(12,0,0,0);
                                  const ds = toDateStr(d);
                                  const lbl = i===0?"Today":i===1?"Yesterday":DAY_SHORT[d.getDay()]+" "+d.getDate();
                                  return (
                                    <button key={ds} onClick={()=>markDone(key,ds)} style={{
                                      padding:"6px 11px",borderRadius:"8px",cursor:"pointer",fontFamily:"inherit",
                                      fontSize:"12px",fontWeight:"500",
                                      background:t.surface,border:`1px solid ${MT_COLOR}55`,color:MT_COLOR,
                                    }}>{lbl}</button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Notes */}
                          {prog?.notes&&!isNoting&&(
                            <div style={{fontSize:"14px",color:t.textSub,fontStyle:"italic",marginTop:"6px",cursor:"pointer"}}
                              onClick={()=>{setActiveKey(key);setNoteText(prog.notes);}}>
                              "{prog.notes}"
                            </div>
                          )}
                          {isNoting&&(
                            <div style={{marginTop:"8px",display:"flex",gap:"6px"}}>
                              <input value={noteText} onChange={e=>setNoteText(e.target.value)}
                                onKeyDown={e=>e.key==="Enter"&&saveNote(key)}
                                placeholder="Add a note…" autoFocus
                                style={{flex:1,background:t.surface2,border:`1px solid ${t.border}`,color:t.text,padding:"6px 10px",borderRadius:"7px",fontSize:"12px",fontFamily:"inherit",outline:"none"}}/>
                              <button onClick={()=>saveNote(key)} style={{background:MT_COLOR,color:"#fff",border:"none",padding:"6px 12px",borderRadius:"7px",cursor:"pointer",fontSize:"12px",fontFamily:"inherit",fontWeight:"600"}}>Save</button>
                              <button onClick={()=>{setActiveKey(null);setNoteText("");}} style={{background:"none",border:`1px solid ${t.border}`,color:t.textSub,padding:"6px 10px",borderRadius:"7px",cursor:"pointer",fontSize:"12px",fontFamily:"inherit"}}>✕</button>
                            </div>
                          )}
                        </div>

                        {/* Note button */}
                        {!isNoting&&!isEditingDate&&(
                          <button onClick={()=>{setActiveKey(key);setNoteText(prog?.notes||"");}}
                            style={{background:"none",border:"none",cursor:"pointer",color:prog?.notes?t.accent:t.textMuted,fontSize:"12px",padding:"2px 4px",marginTop:"2px",flexShrink:0}}>
                            {prog?.notes?"📝":"✎"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}

      {/* Focus area legend */}
      <Card t={t} style={{padding:"14px 16px",marginTop:"6px"}}>
        <div style={{fontSize:"12px",letterSpacing:"2px",color:t.textMuted,marginBottom:"10px"}}>FOCUS AREAS</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
          {Object.entries(TAG_COLORS).map(([tag,color])=>(
            <span key={tag} style={{fontSize:"14px",padding:"3px 9px",borderRadius:"10px",background:color+"18",color,border:`1px solid ${color}33`,fontWeight:"500",textTransform:"capitalize"}}>
              {tag}
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Oura Panel ───────────────────────────────────────────────────────────────
function OuraPanel({ token,setToken,ouraData,fetchOura,fetching,ouraError,t }) {
  const [val,setVal]=useState(token||"");
  const cnt=Object.keys(ouraData).length;
  return (
    <div>
      <p style={{fontSize:"14px",color:t.textSub,marginTop:0,lineHeight:"1.6"}}>
        Connect your Oura Ring 4 to pull readiness, sleep, and HRV into your calendar and stats.
      </p>
      <Card t={t} style={{padding:"16px",marginBottom:"14px"}}>
        <Label t={t}>HOW TO GET YOUR TOKEN</Label>
        <ol style={{color:t.textSub,fontSize:"12px",lineHeight:"1.9",margin:0,paddingLeft:"16px"}}>
          <li>Go to <span style={{color:t.accent}}>cloud.ouraring.com</span></li>
          <li>Sign in → Personal Access Tokens</li>
          <li>Create New Token, copy it</li>
          <li>Paste below and tap Sync</li>
        </ol>
        <div style={{marginTop:"10px",fontSize:"14px",color:t.textSub,padding:"8px",background:t.surface2,borderRadius:"7px"}}>
          ⚠️ Requires an active Oura Membership for API access.
        </div>
      </Card>
      <Label t={t}>PERSONAL ACCESS TOKEN</Label>
      <Input t={t} type="password" placeholder="Paste token…" value={val} onChange={e=>setVal(e.target.value)} style={{marginBottom:"12px"}}/>
      <div style={{display:"flex",gap:"8px"}}>
        <button onClick={()=>{setToken(val);fetchOura(val);}} disabled={!val||fetching} style={{
          flex:1,background:val&&!fetching?t.accent:"transparent",
          color:val&&!fetching?"#fff":t.textMuted,
          border:`1px solid ${val&&!fetching?t.accent:t.border}`,
          padding:"12px",borderRadius:"9px",cursor:val&&!fetching?"pointer":"default",
          fontSize:"12px",fontFamily:"inherit",fontWeight:"600",transition:"all 0.12s",
        }}>{fetching?"Syncing…":"💍 Sync Oura"}</button>
        {token&&<button onClick={()=>{setToken("");setVal("");}} style={{background:"none",border:`1px solid ${t.border}`,color:t.textSub,padding:"12px 16px",borderRadius:"9px",cursor:"pointer",fontSize:"14px",fontFamily:"inherit"}}>Clear</button>}
      </div>
      {ouraError&&<div style={{marginTop:"12px",padding:"10px 12px",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:"8px",fontSize:"12px",color:"#ef4444"}}>{ouraError}</div>}
      {cnt>0&&!ouraError&&<div style={{marginTop:"10px",padding:"10px 12px",background:t.surface2,border:`1px solid ${t.border}`,borderRadius:"8px",fontSize:"12px",color:"#059669"}}>✓ {cnt} days synced. Purple dots on calendar = Oura data.</div>}
    </div>
  );
}

const QUOTES = [
  { text: "The only bad workout is the one that didn't happen.", author: "Unknown" },
  { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
  { text: "Movement is medicine.", author: "Unknown" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "Your body can stand almost anything. It's your mind you have to convince.", author: "Unknown" },
  { text: "A year from now you'll wish you had started today.", author: "Karen Lamb" },
  { text: "What seems impossible today will one day become your warm-up.", author: "Unknown" },
  { text: "Showing up is half the battle.", author: "Woody Allen" },
  { text: "The pain you feel today will be the strength you feel tomorrow.", author: "Unknown" },
  { text: "Progress, not perfection.", author: "Unknown" },
  { text: "Every rep, every step, every session — it all adds up.", author: "Unknown" },
  { text: "You are one workout away from a good mood.", author: "Unknown" },
  { text: "Small consistent actions create extraordinary results.", author: "Unknown" },
  { text: "The hardest part is starting. You've already done that.", author: "Unknown" },
  { text: "Strength doesn't come from what you can do. It comes from overcoming what you thought you couldn't.", author: "Rikki Rogers" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "Don't stop when you're tired. Stop when you're done.", author: "Unknown" },
  { text: "Your future self is watching you right now through your memories.", author: "Unknown" },
  { text: "Consistency over intensity — every single time.", author: "Unknown" },
];

function randomQuote() {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}
// ─── Mobile Date Picker ───────────────────────────────────────────────────────
const DAY_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function DatePicker({ value, onChange, t }) {
  const scrollRef = useRef(null);
  const [showGrid, setShowGrid] = useState(false);
  const [gridDate, setGridDate] = useState(() => {
    // Start grid on the month of the currently selected value
    const d = value ? new Date(value+"T12:00:00") : new Date();
    return { yr: d.getFullYear(), mo: d.getMonth() };
  });

  // Build last 7 days (oldest left, today right)
  const days = useMemo(() => {
    const arr = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(12, 0, 0, 0);
      arr.push({
        ds: toDateStr(d),
        day: DAY_SHORT[d.getDay()],
        num: d.getDate(),
        isToday: i === 0,
      });
    }
    return arr;
  }, []);

  // Scroll selected day into view
  useEffect(() => {
    if (!scrollRef.current || showGrid) return;
    const idx = days.findIndex(d => d.ds === value);
    const el = idx >= 0 ? scrollRef.current.children[idx] : scrollRef.current.lastChild;
    if (el) el.scrollIntoView({ behavior:"smooth", block:"nearest", inline:"center" });
  }, [showGrid]);

  // Grid calendar helpers
  const { yr, mo } = gridDate;
  const dim  = new Date(yr, mo+1, 0).getDate();
  const fd   = new Date(yr, mo, 1).getDay();
  const todStr = todayStr();
  const canFwdGrid = !(yr === new Date().getFullYear() && mo === new Date().getMonth());

  function pickGridDay(d) {
    const ds = `${yr}-${String(mo+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    if (ds > todStr) return; // no future dates
    onChange(ds);
    setShowGrid(false);
  }

  function prevMonth() { setGridDate(g => g.mo === 0 ? {yr:g.yr-1,mo:11} : {yr:g.yr,mo:g.mo-1}); }
  function nextMonth() {
    if (!canFwdGrid) return;
    setGridDate(g => g.mo === 11 ? {yr:g.yr+1,mo:0} : {yr:g.yr,mo:g.mo+1});
  }

  const selectedIsRecent = days.some(d => d.ds === value);

  return (
    <div>
      {/* 7-day grid */}
      {!showGrid && (
        <div style={{
          display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:"6px",
          padding:"2px 0 6px",
        }}>
          {days.map(d => {
            const sel = d.ds === value;
            return (
              <button key={d.ds} onClick={() => onChange(d.ds)} style={{
                minHeight:"56px",
                borderRadius:"12px", cursor:"pointer", fontFamily:"inherit",
                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"3px",
                transition:"all 0.12s",
                background: sel ? t.accent : d.isToday ? t.accent+"18" : t.surface2,
                border: `1.5px solid ${sel ? t.accent : d.isToday ? t.accent+"55" : t.border}`,
              }}>
                <span style={{fontSize:"11px",fontWeight:"500",letterSpacing:"0.3px",color:sel?"rgba(255,255,255,0.8)":t.textMuted}}>
                  {d.isToday ? "TODAY" : d.day.toUpperCase()}
                </span>
                <span style={{fontSize:"16px",fontWeight:"700",lineHeight:1,color:sel?"#fff":t.text}}>
                  {d.num}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* "Older date" toggle */}
      <button onClick={()=>setShowGrid(g=>!g)} style={{
        background:"none", border:"none", cursor:"pointer",
        color: showGrid ? t.accent : t.textMuted,
        fontSize:"12px", fontFamily:"inherit", fontWeight:"500",
        padding:"2px 0", marginTop: showGrid ? "0" : "2px",
        display:"flex", alignItems:"center", gap:"4px",
      }}>
        {showGrid ? "↑ Recent days" : "↓ Pick an older date"}
        {!selectedIsRecent && !showGrid && (
          <span style={{color:t.accent,fontWeight:"700"}}>· {formatDate(value)}</span>
        )}
      </button>

      {/* Month grid */}
      {showGrid && (
        <div style={{marginTop:"10px"}}>
          {/* Month nav */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"10px"}}>
            <button onClick={prevMonth} style={{background:"none",border:`1px solid ${t.border}`,color:t.textSub,padding:"6px 14px",borderRadius:"8px",cursor:"pointer",fontSize:"12px",fontFamily:"inherit"}}>‹</button>
            <span style={{fontSize:"12px",fontWeight:"700",color:t.text}}>{MONTHS[mo]} {yr}</span>
            <button onClick={nextMonth} disabled={!canFwdGrid} style={{background:"none",border:`1px solid ${canFwdGrid?t.border:t.surface2}`,color:canFwdGrid?t.textSub:t.textMuted,padding:"6px 14px",borderRadius:"8px",cursor:canFwdGrid?"pointer":"default",fontSize:"12px"}}>›</button>
          </div>
          {/* Day labels */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"3px",marginBottom:"4px"}}>
            {["S","M","T","W","T","F","S"].map((d,i)=>(
              <div key={i} style={{textAlign:"center",fontSize:"12px",color:t.textMuted,padding:"2px 0"}}>{d}</div>
            ))}
          </div>
          {/* Day cells */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"4px"}}>
            {Array(fd).fill(null).map((_,i)=><div key={"e"+i}/>)}
            {Array.from({length:dim},(_,i)=>i+1).map(d=>{
              const ds = `${yr}-${String(mo+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
              const isFuture = ds > todStr;
              const isSel    = ds === value;
              const isToday  = ds === todStr;
              return (
                <button key={d} onClick={()=>pickGridDay(d)} disabled={isFuture} style={{
                  aspectRatio:"1", borderRadius:"9px", cursor:isFuture?"default":"pointer",
                  fontFamily:"inherit", fontSize:"12px", fontWeight:isSel?"700":"400",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  transition:"all 0.1s",
                  background: isSel ? t.accent : isToday ? t.accent+"22" : t.surface2,
                  color: isSel ? "#fff" : isFuture ? t.textMuted : isToday ? t.accent : t.text,
                  border: `1.5px solid ${isSel ? t.accent : isToday ? t.accent+"55" : "transparent"}`,
                  opacity: isFuture ? 0.3 : 1,
                }}>
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


function CanvasConfetti({ active, onDone }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const COLORS = [
      "#f43f5e","#fb923c","#facc15","#4ade80",
      "#34d399","#60a5fa","#a78bfa","#f472b6",
      "#fff","#fde68a","#6ee7b7","#93c5fd",
    ];
    const SHAPES = ["rect","circle","ribbon"];

    function makeParticle(ox, oy) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 8 + Math.random() * 22;
      const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      const size  = shape === "ribbon" ? (2 + Math.random() * 3) : (5 + Math.random() * 9);
      const len   = shape === "ribbon" ? (18 + Math.random() * 22) : size;
      return {
        x: ox, y: oy,
        vx: Math.cos(angle) * speed * (0.6 + Math.random() * 0.8),
        vy: Math.sin(angle) * speed * (0.6 + Math.random() * 0.8) - (Math.random() * 6),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        shape, size, len,
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.3,
        alpha: 1,
        gravity: 0.35 + Math.random() * 0.2,
        drag: 0.97 + Math.random() * 0.015,
        wobble: Math.random() * Math.PI * 2,
        wobbleV: 0.06 + Math.random() * 0.08,
        decay: 0.008 + Math.random() * 0.006,
      };
    }

    const origins = [
      [canvas.width * 0.5,  canvas.height * 0.45],
      [canvas.width * 0.2,  canvas.height * 0.5 ],
      [canvas.width * 0.8,  canvas.height * 0.5 ],
      [canvas.width * 0.35, canvas.height * 0.35],
      [canvas.width * 0.65, canvas.height * 0.35],
    ];

    let particles = [];
    origins.forEach(([ox,oy], bi) => {
      const count = bi === 0 ? 120 : 60;
      setTimeout(() => {
        for (let i = 0; i < count; i++) particles.push(makeParticle(ox, oy));
      }, bi * 120);
    });

    let startTime = null;
    const DURATION = 4500;

    function draw(ts) {
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.vy += p.gravity;
        p.vx *= p.drag;
        p.vy *= p.drag;
        p.x  += p.vx;
        p.y  += p.vy;
        p.rot    += p.rotV;
        p.wobble += p.wobbleV;
        if (elapsed > DURATION * 0.5) p.alpha -= p.decay;
        p.alpha = Math.max(0, p.alpha);
        if (p.alpha <= 0) return;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;

        if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === "ribbon") {
          ctx.save();
          ctx.rotate(Math.sin(p.wobble) * 0.4);
          ctx.fillRect(-p.size / 2, -p.len / 2, p.size, p.len);
          ctx.restore();
        } else {
          const w = p.size * (0.6 + 0.8 * Math.abs(Math.cos(p.wobble)));
          const h = p.size * (0.6 + 0.8 * Math.abs(Math.sin(p.wobble)));
          ctx.fillRect(-w/2, -h/2, w, h);
        }
        ctx.restore();
      });

      particles = particles.filter(p => p.alpha > 0);

      if (elapsed < DURATION || particles.length > 0) {
        rafRef.current = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (onDone) onDone();
      }
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [active]);

  if (!active) return null;
  return (
    <canvas ref={canvasRef} style={{
      position:"fixed", inset:0, zIndex:999,
      pointerEvents:"none", width:"100%", height:"100%",
    }}/>
  );
}

function StatsView({ logs, actLogs, restLogs, tree, ouraData, hasOura, streak, activityCounts, t }) {
  const [period,       setPeriod]       = useState("month");
  const [periodOffset, setPeriodOffset] = useState(0);
  const [drillActivity,setDrillActivity]= useState(null);

  const now = new Date();

  function getPeriodWindow(p, offset) {
    const s = new Date(now), e = new Date(now);
    if (p === "month") {
      s.setMonth(now.getMonth()-offset, 1); s.setHours(0,0,0,0);
      e.setMonth(s.getMonth()+1, 0); e.setHours(23,59,59,999);
      return { start:s, end:e, label:`${MONTHS[s.getMonth()]} ${s.getFullYear()}`, days: e.getDate() };
    }
    // year
    s.setFullYear(now.getFullYear()-offset, 0, 1); s.setHours(0,0,0,0);
    e.setFullYear(s.getFullYear(), 11, 31); e.setHours(23,59,59,999);
    const daysInYear = (e.getFullYear()%4===0?366:365);
    return { start:s, end:e, label:String(s.getFullYear()), days: daysInYear };
  }

  const win    = getPeriodWindow(period, periodOffset);
  const canFwd = periodOffset > 0;

  const inWindow = l => {
    const d = new Date(l.date+"T12:00:00");
    return d >= win.start && d <= win.end;
  };

  const filteredAll  = logs.filter(inWindow);
  const filteredAct  = filteredAll.filter(l=>!isRestId(l.activity));
  const filteredRest = filteredAll.filter(l=>isRestId(l.activity));
  const filteredMin  = filteredAct.reduce((s,l)=>s+parseInt(l.duration||0),0);

  // Unique active dates and rest dates
  const activeDates  = new Set(filteredAct.map(l=>l.date));
  const restDates    = new Set(filteredRest.map(l=>l.date));

  // Days elapsed in the period (don't count future days)
  const periodEnd    = win.end < now ? win.end : now;
  const msPerDay     = 864e5;
  const elapsed      = Math.floor((periodEnd - win.start) / msPerDay) + 1;
  const activeDays   = activeDates.size;
  const restDays     = [...restDates].filter(d=>!activeDates.has(d)).length; // rest-only days
  const missedDays   = Math.max(0, elapsed - activeDays - restDays);
  const pctActive    = elapsed > 0 ? Math.round(activeDays / elapsed * 100) : 0;

  // Activity counts
  const filteredCounts = (() => {
    const map = {};
    filteredAct.forEach(l => {
      const isMT = /^w\dd\d$/.test(l.activity);
      const key  = isMT ? "mobility-toolkit" : l.activity;
      const info = isMT
        ? { id:"mobility-toolkit", label:"Mobility Toolkit", icon:"🔁", color:MT_COLOR }
        : resolveActivity(l.activity, tree);
      if (!map[key]) map[key] = { ...info, value:0, minutes:0, dates: new Set() };
      map[key].value++;
      map[key].minutes += parseInt(l.duration||0);
      map[key].dates.add(l.date);
    });
    return Object.values(map).filter(a=>a.value>0).sort((a,b)=>b.value-a.value);
  })();

  // Drill
  const drillLogs = drillActivity ? filteredAct.filter(l => {
    if (drillActivity === "mobility-toolkit") return /^w\dd\d$/.test(l.activity);
    return l.activity === drillActivity || l.activity.startsWith(drillActivity+"-");
  }) : [];
  const drillInfo = drillActivity ? filteredCounts.find(a=>a.id===drillActivity) : null;

  // Month heatmap: all days in the period month
  const monthDays = (() => {
    if (period !== "month") return [];
    const yr = win.start.getFullYear(), mo = win.start.getMonth();
    const dim = new Date(yr, mo+1, 0).getDate();
    const days = [];
    for (let d=1; d<=dim; d++) {
      const ds = `${yr}-${String(mo+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const isF = ds > todayStr();
      const act = activeDates.has(ds);
      const rst = restDates.has(ds) && !act;
      const mis = !isF && !act && !rst;
      // color: use first activity's color, or rest yellow, or missed red
      let color = null;
      if (act) {
        const first = filteredAct.find(l=>l.date===ds);
        const isMT  = first && /^w\dd\d$/.test(first.activity);
        color = isMT ? MT_COLOR : first ? resolveActivity(first.activity, tree).color : t.accent;
      } else if (rst) color = "#eab308";
      else if (mis)   color = "#ef4444";
      days.push({ d, ds, color, act, rst, mis, isF });
    }
    return days;
  })();

  // Year: monthly consistency bars
  const yearMonths = (() => {
    if (period !== "year") return [];
    const yr = win.start.getFullYear();
    const result = [];
    for (let mo=0; mo<12; mo++) {
      const s = new Date(yr, mo, 1);
      const e = new Date(yr, mo+1, 0);
      if (s > now) { result.push({ label:MONTHS_S[mo], activeDays:0, elapsed:0, future:true }); continue; }
      const eEff = e < now ? e : now;
      const elap = Math.floor((eEff - s) / msPerDay) + 1;
      const aDays = new Set(filteredAct.filter(l=>{
        const d=new Date(l.date+"T12:00:00"); return d>=s&&d<=e;
      }).map(l=>l.date)).size;
      const rDays = new Set(filteredRest.filter(l=>{
        const d=new Date(l.date+"T12:00:00"); return d>=s&&d<=e;
      }).map(l=>l.date)).size;
      result.push({ label:MONTHS_S[mo], activeDays:aDays, restDays:rDays, elapsed:elap, pct:Math.round(aDays/elap*100) });
    }
    return result;
  })();

  // Score color
  const scoreColor = pct => pct >= 80 ? "#22c55e" : pct >= 60 ? "#eab308" : "#ef4444";

  return (
    <div>
      {/* Period tabs */}
      <div style={{display:"flex",background:t.surface2,borderRadius:"9px",padding:"3px",marginBottom:"14px",border:`1px solid ${t.border}`}}>
        {[["month","Month"],["year","Year"]].map(([p,lbl])=>(
          <button key={p} onClick={()=>{setPeriod(p);setPeriodOffset(0);setDrillActivity(null);}} style={{
            flex:1,background:period===p?t.surface:"transparent",
            color:period===p?t.text:t.textSub,
            border:period===p?`1px solid ${t.border}`:"none",
            padding:"9px",borderRadius:"7px",cursor:"pointer",
            fontSize:"12px",fontFamily:"inherit",fontWeight:period===p?"600":"400",transition:"all 0.12s",
          }}>{lbl}</button>
        ))}
      </div>

      {/* Period navigation */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"16px"}}>
        <button onClick={()=>{setPeriodOffset(o=>o+1);setDrillActivity(null);}} style={{background:"none",border:`1px solid ${t.border}`,color:t.textSub,padding:"6px 14px",borderRadius:"8px",cursor:"pointer",fontSize:"12px",fontFamily:"inherit"}}>‹</button>
        <span style={{fontSize:"14px",fontWeight:"700",color:t.text}}>{win.label}</span>
        <button onClick={()=>{setPeriodOffset(o=>Math.max(0,o-1));setDrillActivity(null);}} disabled={!canFwd} style={{background:"none",border:`1px solid ${canFwd?t.border:t.surface2}`,color:canFwd?t.textSub:t.textMuted,padding:"6px 14px",borderRadius:"8px",cursor:canFwd?"pointer":"default",fontSize:"12px"}}>›</button>
      </div>

      {/* ── DRILL VIEW ── */}
      {drillActivity && drillInfo ? (
        <div>
          <button onClick={()=>setDrillActivity(null)} style={{background:"none",border:"none",color:t.textSub,cursor:"pointer",fontSize:"14px",fontFamily:"inherit",padding:"0",marginBottom:"16px",display:"flex",alignItems:"center",gap:"4px"}}>
            ← Back
          </button>
          <Card t={t} style={{padding:"16px 18px",marginBottom:"14px",borderLeft:`4px solid ${drillInfo.color}`}}>
            <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"14px"}}>
              <span style={{fontSize:"12px"}}>{drillInfo.icon}</span>
              <div>
                <div style={{fontSize:"12px",fontWeight:"700",color:t.text}}>{drillInfo.label}</div>
                <div style={{fontSize:"14px",color:t.textSub}}>{win.label}</div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px"}}>
              {[
                {label:"Days",    value:drillInfo.dates?.size||drillInfo.value},
                {label:"Hours",   value:(drillInfo.minutes/60).toFixed(1)+"h"},
                {label:"Avg",     value:drillInfo.value?Math.round(drillInfo.minutes/drillInfo.value)+"m/s":"—"},
              ].map(s=>(
                <div key={s.label} style={{textAlign:"center"}}>
                  <div style={{fontSize:"12px",fontWeight:"700",color:drillInfo.color}}>{s.value}</div>
                  <div style={{fontSize:"14px",color:t.textMuted,letterSpacing:"1px",marginTop:"2px"}}>{s.label.toUpperCase()}</div>
                </div>
              ))}
            </div>
          </Card>
          <Label t={t}>SESSIONS</Label>
          <div style={{display:"flex",flexDirection:"column",gap:"7px"}}>
            {[...drillLogs].sort((a,b)=>b.date.localeCompare(a.date)).map(log=>{
              const info = resolveActivity(log.activity, tree);
              return (
                <Card t={t} key={log.id} style={{padding:"11px 14px",borderLeft:`3px solid ${drillInfo.color}`}}>
                  <div style={{fontSize:"12px",fontWeight:"600",color:t.text}}>{formatDate(log.date)}</div>
                  {info.parentLabel && <div style={{fontSize:"14px",color:drillInfo.color,marginTop:"1px"}}>{info.label}</div>}
                  <div style={{fontSize:"14px",color:t.textSub,marginTop:"2px"}}>{log.duration?log.duration+" min":""}{log.notes?" · "+log.notes:""}</div>
                </Card>
              );
            })}
            {!drillLogs.length && <div style={{textAlign:"center",color:t.textMuted,padding:"20px 0",fontSize:"14px"}}>No sessions this period.</div>}
          </div>
        </div>

      ) : (
        /* ── OVERVIEW ── */
        <div>

          {/* ── PRIMARY: Consistency score ── */}
          <Card t={t} style={{padding:"20px 18px",marginBottom:"14px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"16px"}}>
              <div>
                <div style={{fontSize:"14px",color:t.textSub,marginBottom:"4px",letterSpacing:"1px"}}>ACTIVE DAYS</div>
                <div style={{display:"flex",alignItems:"baseline",gap:"6px"}}>
                  <span style={{fontSize:"42px",fontWeight:"800",color:scoreColor(pctActive),lineHeight:1}}>{activeDays}</span>
                  <span style={{fontSize:"12px",color:t.textMuted,fontWeight:"400"}}>/ {elapsed}</span>
                </div>
                <div style={{fontSize:"14px",color:t.textSub,marginTop:"4px"}}>
                  {streak > 0 && <span style={{color:"#f59e0b",fontWeight:"600"}}>🔥 {streak} day streak · </span>}
                  {missedDays > 0 ? `${missedDays} missed` : "No missed days!"}
                  {restDays > 0 && ` · ${restDays} rest`}
                </div>
              </div>
              {/* Circular score */}
              <div style={{position:"relative",width:"72px",height:"72px",flexShrink:0}}>
                <svg width="72" height="72" viewBox="0 0 72 72">
                  <circle cx="36" cy="36" r="30" fill="none" stroke={t.surface2} strokeWidth="7"/>
                  <circle cx="36" cy="36" r="30" fill="none"
                    stroke={scoreColor(pctActive)} strokeWidth="7"
                    strokeDasharray={`${pctActive*1.885} 188.5`}
                    strokeLinecap="round"
                    transform="rotate(-90 36 36)"
                    style={{transition:"stroke-dasharray 0.6s ease"}}
                  />
                </svg>
                <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:"12px",fontWeight:"800",color:scoreColor(pctActive)}}>{pctActive}%</span>
                </div>
              </div>
            </div>

            {/* Day breakdown pills */}
            <div style={{display:"flex",gap:"8px"}}>
              {[
                {label:"Active",  value:activeDays, color:t.accent},
                {label:"Rest",    value:restDays,   color:"#eab308"},
                {label:"Missed",  value:missedDays, color:"#ef4444"},
              ].map(item=>(
                <div key={item.label} style={{flex:1,textAlign:"center",padding:"8px 4px",background:item.color+"14",borderRadius:"8px",border:`1px solid ${item.color}33`}}>
                  <div style={{fontSize:"14px",fontWeight:"700",color:item.value>0?item.color:t.textMuted}}>{item.value}</div>
                  <div style={{fontSize:"14px",color:t.textMuted,letterSpacing:"1px",marginTop:"2px"}}>{item.label.toUpperCase()}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* ── MONTH: day heatmap ── */}
          {period === "month" && monthDays.length > 0 && (
            <>
              <Label t={t}>THIS MONTH</Label>
              <Card t={t} style={{padding:"12px 14px",marginBottom:"14px"}}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"3px",marginBottom:"4px"}}>
                  {["S","M","T","W","T","F","S"].map((d,i)=>(
                    <div key={i} style={{textAlign:"center",fontSize:"14px",color:t.textMuted,padding:"2px 0"}}>{d}</div>
                  ))}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"3px"}}>
                  {/* Empty cells for day offset */}
                  {Array(new Date(win.start.getFullYear(),win.start.getMonth(),1).getDay()).fill(null).map((_,i)=>(
                    <div key={"e"+i}/>
                  ))}
                  {monthDays.map(({d,color,isF})=>(
                    <div key={d} style={{
                      aspectRatio:"1",borderRadius:"5px",
                      background:color||(isF?"transparent":t.surface2),
                      border:`1px solid ${color?color+"44":t.border}`,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      opacity:isF?0.3:1,
                    }}>
                      <span style={{fontSize:"14px",fontWeight:color?"700":"400",color:color?"#fff":t.textMuted,textShadow:color?"0 1px 2px rgba(0,0,0,0.3)":"none"}}>{d}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}

          {/* ── YEAR: monthly bars ── */}
          {period === "year" && (
            <>
              <Label t={t}>MONTHLY CONSISTENCY</Label>
              <Card t={t} style={{padding:"14px 16px",marginBottom:"14px"}}>
                {yearMonths.map((m,i)=>{
                  if (m.future) return (
                    <div key={i} style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"8px",opacity:0.3}}>
                      <span style={{fontSize:"14px",color:t.textMuted,width:"28px"}}>{m.label}</span>
                      <div style={{flex:1,background:t.surface2,borderRadius:"4px",height:"8px"}}/>
                    </div>
                  );
                  const pct = m.elapsed>0?m.activeDays/m.elapsed:0;
                  const color = scoreColor(Math.round(pct*100));
                  return (
                    <div key={i} style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"8px"}}>
                      <span style={{fontSize:"14px",color:t.textSub,width:"28px",flexShrink:0}}>{m.label}</span>
                      <div style={{flex:1,background:t.surface2,borderRadius:"4px",height:"8px",overflow:"hidden"}}>
                        <div style={{height:"100%",width:(pct*100)+"%",background:color,borderRadius:"4px",transition:"width 0.5s"}}/>
                      </div>
                      <span style={{fontSize:"14px",color:t.textSub,width:"36px",textAlign:"right",flexShrink:0}}>
                        {m.activeDays}/{m.elapsed}
                      </span>
                    </div>
                  );
                })}
              </Card>
            </>
          )}

          {/* ── Activity mix ── */}
          {filteredAct.length > 0 && (
            <>
              <Label t={t}>WHAT YOU DID <span style={{color:t.textMuted,fontWeight:"400",letterSpacing:"0",fontSize:"12px"}}>— tap to drill in</span></Label>
              <Card t={t} style={{padding:"14px 16px",marginBottom:"14px"}}>
                {filteredCounts.map(a=>{
                  const pct = a.value/filteredAct.length*100;
                  return (
                    <div key={a.id} onClick={()=>setDrillActivity(a.id)}
                      style={{marginBottom:"12px",cursor:"pointer",borderRadius:"7px",padding:"6px 8px",transition:"background 0.1s"}}
                      onMouseEnter={e=>e.currentTarget.style.background=t.surface2}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"5px"}}>
                        <span style={{display:"flex",alignItems:"center",gap:"7px",fontSize:"14px",color:t.text}}>
                          <span style={{display:"inline-block",width:"9px",height:"9px",borderRadius:"3px",background:a.color,flexShrink:0}}/>
                          {a.icon} {a.label}
                        </span>
                        <span style={{display:"flex",alignItems:"center",gap:"8px",fontSize:"12px",color:t.textSub}}>
                          {a.dates?.size||a.value}d · {Math.round(a.minutes/60*10)/10}h
                          <span style={{color:t.textMuted}}>›</span>
                        </span>
                      </div>
                      <div style={{background:t.surface2,borderRadius:"4px",height:"4px",overflow:"hidden"}}>
                        <div style={{height:"100%",width:pct+"%",background:a.color,borderRadius:"4px",transition:"width 0.6s"}}/>
                      </div>
                    </div>
                  );
                })}
              </Card>
            </>
          )}

          {filteredAct.length === 0 && (
            <div style={{textAlign:"center",color:t.textMuted,padding:"40px 0",fontSize:"14px"}}>No activity logged this period.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Supplements View ─────────────────────────────────────────────────────────
function SupplementsView({ suppLogs, setSuppLogs, t }) {
  const today = todayStr();
  const [vd, setVd] = useState(new Date());
  const [sel, setSel] = useState(null); // selected day number

  const SUPP_COLOR = "#8b5cf6";
  const CREATINE_COLOR = "#06b6d4";

  // Toggle a supplement for a given date
  function toggle(date, key) {
    const prev = suppLogs[date] || { supplements: false, creatine: false };
    setSuppLogs({ ...suppLogs, [date]: { ...prev, [key]: !prev[key] } });
  }

  const todayEntry = suppLogs[today] || { supplements: false, creatine: false };

  // Calendar
  const yr = vd.getFullYear(), mo = vd.getMonth();
  const dim = new Date(yr, mo+1, 0).getDate();
  const fd = new Date(yr, mo, 1).getDay();
  const canNext = new Date(yr, mo+1, 1) <= new Date();
  const ds = d => `${yr}-${String(mo+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

  // Month stats
  const monthStats = useMemo(() => {
    const now = new Date();
    let totalDays = 0, suppDays = 0, creatineDays = 0, bothDays = 0;
    for (let d = 1; d <= dim; d++) {
      const dateStr = ds(d);
      if (dateStr > today) continue; // skip future
      totalDays++;
      const entry = suppLogs[dateStr];
      if (entry?.supplements) suppDays++;
      if (entry?.creatine) creatineDays++;
      if (entry?.supplements && entry?.creatine) bothDays++;
    }
    const suppMissed = totalDays - suppDays;
    const creatineMissed = totalDays - creatineDays;
    const suppMissedPct = totalDays > 0 ? Math.round(suppMissed / totalDays * 100) : 0;
    const creatineMissedPct = totalDays > 0 ? Math.round(creatineMissed / totalDays * 100) : 0;
    const suppTakenPct = totalDays > 0 ? Math.round(suppDays / totalDays * 100) : 0;
    const creatineTakenPct = totalDays > 0 ? Math.round(creatineDays / totalDays * 100) : 0;
    return { totalDays, suppDays, creatineDays, bothDays, suppMissed, creatineMissed, suppMissedPct, creatineMissedPct, suppTakenPct, creatineTakenPct };
  }, [suppLogs, yr, mo, dim, today]);

  // Streak
  const suppStreak = (() => {
    let s = 0; const c = new Date();
    while (true) {
      const d = toDateStr(c);
      const entry = suppLogs[d];
      if (entry?.supplements && entry?.creatine) { s++; c.setDate(c.getDate() - 1); }
      else break;
    }
    return s;
  })();

  const cells = [];
  for (let i = 0; i < fd; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);

  const selDateStr = sel ? ds(sel) : null;
  const selEntry = sel ? (suppLogs[ds(sel)] || { supplements: false, creatine: false }) : null;

  return (
    <div>
      {/* Today's check-in */}
      <Card t={t} style={{padding:"16px",marginBottom:"14px"}}>
        <Label t={t}>TODAY</Label>
        <div style={{display:"flex",gap:"10px"}}>
          {[
            { key: "supplements", label: "Supplements", icon: "💊", color: SUPP_COLOR, checked: todayEntry.supplements },
            { key: "creatine",    label: "Creatine",    icon: "⚡", color: CREATINE_COLOR, checked: todayEntry.creatine },
          ].map(item => (
            <button key={item.key} onClick={() => toggle(today, item.key)} style={{
              flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:"8px",
              padding:"14px 8px", borderRadius:"12px", cursor:"pointer",
              fontFamily:"inherit", transition:"all 0.15s",
              background: item.checked ? item.color+"18" : t.surface2,
              border: `1.5px solid ${item.checked ? item.color : t.border}`,
            }}>
              <div style={{
                width:"28px", height:"28px", borderRadius:"8px",
                background: item.checked ? item.color : t.surface2,
                border: `2px solid ${item.checked ? item.color : t.border}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:"14px", color:"#fff", transition:"all 0.15s",
              }}>
                {item.checked ? "✓" : ""}
              </div>
              <span style={{fontSize:"16px"}}>{item.icon}</span>
              <span style={{fontSize:"13px",fontWeight:"600",color: item.checked ? item.color : t.text}}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {/* Month stats with missed percentages */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"8px",marginBottom:"14px"}}>
        <Card t={t} style={{padding:"12px 8px",textAlign:"center"}}>
          <div style={{fontSize:"15px",fontWeight:"700",color:suppStreak > 0 ? "#f59e0b" : t.textMuted}}>{suppStreak}d</div>
          <div style={{fontSize:"11px",color:t.textMuted,letterSpacing:"0.5px",marginTop:"3px"}}>STREAK</div>
        </Card>
        <Card t={t} style={{padding:"12px 8px",textAlign:"center"}}>
          <div style={{fontSize:"15px",fontWeight:"700",color:monthStats.suppMissedPct > 20 ? "#ef4444" : "#22c55e"}}>{monthStats.suppMissedPct}%</div>
          <div style={{fontSize:"11px",color:t.textMuted,letterSpacing:"0.5px",marginTop:"3px"}}>💊 MISSED</div>
        </Card>
        <Card t={t} style={{padding:"12px 8px",textAlign:"center"}}>
          <div style={{fontSize:"15px",fontWeight:"700",color:monthStats.creatineMissedPct > 20 ? "#ef4444" : "#22c55e"}}>{monthStats.creatineMissedPct}%</div>
          <div style={{fontSize:"11px",color:t.textMuted,letterSpacing:"0.5px",marginTop:"3px"}}>⚡ MISSED</div>
        </Card>
      </div>

      {/* Adherence bars */}
      <Card t={t} style={{padding:"14px 16px",marginBottom:"14px"}}>
        {[
          { label:"Supplements", color:SUPP_COLOR, taken:monthStats.suppDays, total:monthStats.totalDays, pct:monthStats.suppTakenPct },
          { label:"Creatine", color:CREATINE_COLOR, taken:monthStats.creatineDays, total:monthStats.totalDays, pct:monthStats.creatineTakenPct },
        ].map(item => (
          <div key={item.label} style={{marginBottom:"10px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"5px"}}>
              <span style={{fontSize:"13px",color:t.text,fontWeight:"500"}}>{item.label}</span>
              <span style={{fontSize:"13px",color:t.textSub}}>{item.taken}/{item.total} days · {item.pct}%</span>
            </div>
            <div style={{background:t.surface2,borderRadius:"4px",height:"6px",overflow:"hidden"}}>
              <div style={{height:"100%",width:item.pct+"%",background:item.color,borderRadius:"4px",transition:"width 0.5s"}}/>
            </div>
          </div>
        ))}
      </Card>

      {/* Calendar */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"14px"}}>
        <button onClick={()=>{setSel(null);setVd(new Date(yr,mo-1,1));}} style={{background:"none",border:"none",cursor:"pointer",color:t.textSub,fontSize:"16px",padding:"4px 8px"}}>‹</button>
        <span style={{fontSize:"15px",fontWeight:"600",color:t.text}}>{MONTHS[mo]} {yr}</span>
        <button onClick={()=>{setSel(null);setVd(new Date(yr,mo+1,1));}} disabled={!canNext} style={{background:"none",border:"none",cursor:canNext?"pointer":"default",color:canNext?t.textSub:t.border,fontSize:"16px",padding:"4px 8px"}}>›</button>
      </div>

      <Card t={t} style={{padding:"12px 14px",marginBottom:"14px"}}>
        {/* Day labels */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"3px",marginBottom:"4px"}}>
          {DAY_LABELS.map((d,i)=><div key={i} style={{textAlign:"center",fontSize:"12px",color:t.textMuted,padding:"3px 0"}}>{d}</div>)}
        </div>

        {/* Day cells */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"3px"}}>
          {cells.map((d,i)=>{
            if (!d) return <div key={"e"+i}/>;
            const dateStr = ds(d);
            const isFuture = dateStr > today;
            const isToday = dateStr === today;
            const isSel = sel === d;
            const entry = suppLogs[dateStr] || { supplements: false, creatine: false };
            const both = entry.supplements && entry.creatine;
            const suppOnly = entry.supplements && !entry.creatine;
            const creatineOnly = !entry.supplements && entry.creatine;
            const missed = !isFuture && !entry.supplements && !entry.creatine;

            let bgColor = null;
            if (both) bgColor = SUPP_COLOR;
            else if (suppOnly) bgColor = SUPP_COLOR+"88";
            else if (creatineOnly) bgColor = CREATINE_COLOR+"88";
            else if (missed && !isToday) bgColor = "#ef4444";

            return (
              <div key={d} onClick={()=>!isFuture && setSel(isSel ? null : d)} style={{
                aspectRatio:"1", minHeight:"38px", borderRadius:"7px",
                background: bgColor || (isFuture ? "transparent" : t.surface2),
                border: isSel ? `2px solid ${t.text}` : isToday && !bgColor ? `2px solid ${t.accent}` : `1px solid ${bgColor ? bgColor+"44" : t.border}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                cursor: isFuture ? "default" : "pointer",
                opacity: isFuture ? 0.3 : missed ? 0.65 : 1,
                transition:"all 0.1s",
              }}>
                <span style={{
                  fontSize:"12px", fontWeight: bgColor || isToday ? "700" : "400",
                  color: bgColor ? "#fff" : isToday ? t.accent : t.textSub,
                  textShadow: bgColor ? "0 1px 2px rgba(0,0,0,0.3)" : "none",
                }}>
                  {d}
                </span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{display:"flex",gap:"8px",marginTop:"12px",flexWrap:"wrap"}}>
          {[
            [SUPP_COLOR,"Both"],
            [SUPP_COLOR+"88","💊 only"],
            [CREATINE_COLOR+"88","⚡ only"],
            ["#ef4444","Missed"],
          ].map(([bg,lbl])=>(
            <div key={lbl} style={{display:"flex",alignItems:"center",gap:"5px",fontSize:"12px",color:t.textSub}}>
              <div style={{width:"10px",height:"10px",borderRadius:"3px",background:bg}}/>
              {lbl}
            </div>
          ))}
        </div>
      </Card>

      {/* Selected day detail — tap to toggle */}
      {sel && !( ds(sel) > today ) && (
        <Card t={t} style={{padding:"14px 16px"}}>
          <div style={{fontSize:"13px",color:t.textSub,marginBottom:"10px"}}>{formatDate(ds(sel))}</div>
          <div style={{display:"flex",gap:"10px"}}>
            {[
              { key:"supplements", label:"Supplements", icon:"💊", color:SUPP_COLOR, checked:selEntry.supplements },
              { key:"creatine", label:"Creatine", icon:"⚡", color:CREATINE_COLOR, checked:selEntry.creatine },
            ].map(item => (
              <button key={item.key} onClick={()=>toggle(ds(sel), item.key)} style={{
                flex:1, display:"flex", alignItems:"center", gap:"10px",
                padding:"12px", borderRadius:"10px", cursor:"pointer",
                fontFamily:"inherit", transition:"all 0.15s",
                background: item.checked ? item.color+"18" : t.surface2,
                border: `1.5px solid ${item.checked ? item.color : t.border}`,
              }}>
                <div style={{
                  width:"22px", height:"22px", borderRadius:"6px",
                  background: item.checked ? item.color : "transparent",
                  border: `2px solid ${item.checked ? item.color : t.border}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:"12px", color:"#fff",
                }}>
                  {item.checked ? "✓" : ""}
                </div>
                <span style={{fontSize:"14px"}}>{item.icon}</span>
                <span style={{fontSize:"13px",fontWeight:"600",color:item.checked ? item.color : t.text}}>{item.label}</span>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function ActivityTracker() {
  const [dark,     setDark]     = useState(false);
  const [logs,     setLogs]     = useState([]);
  const [tree,     setTree]     = useState(DEFAULT_ACTIVITY_TREE);
  const [view,     setView]     = useState("log");
  const [logMode,  setLogMode]  = useState("activity");
  const [selTop,   setSelTop]   = useState(null);  // selected parent activity id
  const [selSub,   setSelSub]   = useState(null);  // selected sub id
  const [form,     setForm]     = useState({ date:todayStr(), duration:"", notes:"" });
  const [restForm, setRestForm] = useState({ date:todayStr(), activity:"injury", notes:"" });
  const [saved,    setSaved]    = useState(false);
  const [quote,    setQuote]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [ouraToken,  setOuraToken]  = useState("");
  const [ouraData,   setOuraData]   = useState({});
  const [fetching,   setFetching]   = useState(false);
  const [ouraError,  setOuraError]  = useState("");
  const [mtProgress, setMtProgressRaw] = useState({});
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [suppLogs, setSuppLogsRaw] = useState({}); // { "2026-02-24": { supplements: true, creatine: false }, ... }

  const t = tokens(dark);

  // ── Sorted activities: most-used first, show top 4 by default ───────────
  const MAX_QUICK = 4;
  const sortedTree = useMemo(() => {
    const counts = {};
    logs.forEach(l => {
      if (isRestId(l.activity)) return;
      // Roll up sub-activities and MT sessions to parent
      const isMT = /^w\dd\d$/.test(l.activity);
      if (isMT) { counts["mobility-toolkit"] = (counts["mobility-toolkit"]||0) + 1; return; }
      for (const a of tree) {
        if (a.id === l.activity) { counts[a.id] = (counts[a.id]||0) + 1; return; }
        for (const s of (a.sub||[])) {
          if (s.id === l.activity) { counts[a.id] = (counts[a.id]||0) + 1; return; }
        }
      }
    });
    return [...tree].sort((a,b) => (counts[b.id]||0) - (counts[a.id]||0));
  }, [tree, logs]);

  // ── localStorage helpers (works on Vercel / any browser) ─────────────────
  const store = {
    get: (key) => { const v = localStorage.getItem(key); return v !== null ? { value: v } : null; },
    set: (key, value) => { localStorage.setItem(key, value); },
  };

  // ── Persist tree to storage when it changes ──────────────────────────────
  useEffect(()=>{
    if(!loading) store.set("activity_tree", JSON.stringify(tree));
  },[tree]);

  // ── Load ─────────────────────────────────────────────────────────────────
  useEffect(()=>{
    setLoading(true);
    try {
      const r=store.get("activity_logs_v3"); if(r) setLogs(JSON.parse(r.value));
      const tr=store.get("activity_tree");   if(tr) setTree(JSON.parse(tr.value));
      const ot=store.get("oura_token");      if(ot) setOuraToken(ot.value);
      const od=store.get("oura_data");       if(od) setOuraData(JSON.parse(od.value));
      const dm=store.get("dark_mode");       if(dm) setDark(dm.value==="true");
      const mp=store.get("mt_progress");     if(mp) setMtProgressRaw(JSON.parse(mp.value));
      const sl=store.get("supp_logs");       if(sl) setSuppLogsRaw(JSON.parse(sl.value));
    } catch(e){}
    setLoading(false);
  },[]);

  const saveLogs = nl => { try { store.set("activity_logs_v3",JSON.stringify(nl)); } catch(e){} };
  const toggleDark = () => { const nd=!dark; setDark(nd); store.set("dark_mode",String(nd)); };
  const setTreeAndSave = updated => { setTree(updated); };
  const setMtProgress = updated => {
    setMtProgressRaw(updated);
    store.set("mt_progress", JSON.stringify(updated));
  };
  const setSuppLogs = updated => {
    setSuppLogsRaw(updated);
    store.set("supp_logs", JSON.stringify(updated));
  };

  // ── Oura fetch ────────────────────────────────────────────────────────────
  const fetchOura = useCallback(async tok => {
    if(!tok) return;
    setFetching(true); setOuraError("");
    try {
      store.set("oura_token",tok);
      const end=new Date(); end.setDate(end.getDate()+1);
      const start=new Date(); start.setDate(start.getDate()-90);
      const [s,e]=[toDateStr(start),toDateStr(end)];
      const h={Authorization:`Bearer ${tok}`};
      const [rr,sr]=await Promise.all([
        fetch(`https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${s}&end_date=${e}`,{headers:h}),
        fetch(`https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${s}&end_date=${e}`,{headers:h}),
      ]);
      if(rr.status===401){ setOuraError("Invalid token or no Oura Membership."); setFetching(false); return; }
      const rj=rr.ok?await rr.json():{data:[]};
      let sj={data:[]}; try{ if(sr.ok) sj=await sr.json(); }catch(e){}
      const merged={};
      (rj.data||[]).forEach(r=>{ merged[r.day]={date:r.day,readiness:r.score}; });
      (sj.data||[]).forEach(s=>{ if(!merged[s.day]) merged[s.day]={date:s.day}; merged[s.day].sleep=s.score; });
      setOuraData(merged);
      store.set("oura_data",JSON.stringify(merged));
    } catch(e){ setOuraError("Failed: "+e.message); }
    setFetching(false);
  },[]);

  // ── Resolve the active activity id ───────────────────────────────────────
  const isMTSelected = selTop === "mobility-toolkit";
  const nextMTSess   = getNextMTSession(mtProgress);
  const topNode      = tree.find(a=>a.id===selTop);
  const hasSubs      = topNode && (topNode.sub||[]).length > 0;
  const activeId     = isMTSelected
    ? (selSub || nextMTSess?.key || "mobility-toolkit")
    : (selSub || selTop);

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if(logMode==="activity"&&(!activeId||!form.duration)) return;
    const entry = logMode==="activity"
      ? { id:Date.now(), date:form.date, activity:activeId, duration:form.duration, notes:form.notes }
      : { id:Date.now(), date:form.date, activity:restForm.activity, notes:restForm.notes };
    const nl=[entry,...logs];
    setLogs(nl); await saveLogs(nl);

    // Cross-log: if this is an MT session, mark it done in mtProgress
    if (logMode==="activity" && /^w\dd\d$/.test(activeId)) {
      const updated = {
        ...mtProgress,
        [activeId]: { done:true, date:form.date, notes:form.notes }
      };
      setMtProgress(updated);
    }

    setSaved(true); setQuote(randomQuote());
    setTimeout(()=>{ setSaved(false); setQuote(null); }, 8000);
    setForm(f=>({...f,duration:"",notes:""}));
    setRestForm({date:todayStr(),activity:"injury",notes:""});
    setSelTop(null); setSelSub(null);
  }

  async function deleteLog(id) {
    const nl=logs.filter(l=>l.id!==id); setLogs(nl); await saveLogs(nl);
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  const actLogs   = logs.filter(l=>!isRestId(l.activity));
  const restLogs  = logs.filter(l=>isRestId(l.activity));
  const totalMin  = actLogs.reduce((s,l)=>s+parseInt(l.duration||0),0);
  const streak    = (()=>{
    const ds=new Set(actLogs.map(l=>l.date)); let s=0; const c=new Date();
    while(ds.has(toDateStr(c))){ s++; c.setDate(c.getDate()-1); } return s;
  })();

  // For donut: MT day ids roll up to parent "Mobility Toolkit", others use their own id
  const activityCounts = (() => {
    const map = {};
    actLogs.forEach(l => {
      const isMT = /^w\dd\d$/.test(l.activity);
      if (isMT) {
        const key = "mobility-toolkit";
        if (!map[key]) map[key] = { id:"mobility-toolkit", label:"Mobility Toolkit", icon:"🔁", color:MT_COLOR, parentLabel:null, value:0 };
        map[key].value++;
      } else {
        const info = resolveActivity(l.activity, tree);
        const key  = info.id;
        if(!map[key]) map[key] = { ...info, value:0 };
        map[key].value++;
      }
    });
    return Object.values(map).filter(a=>a.value>0);
  })();

  const hasOura   = Object.keys(ouraData).length>0;
  const ouraToday = ouraData[todayStr()];

  const TABS = [
    { id:"supps",    label:"Supps",    icon:"💊" },
    { id:"mobility", label:"Mobility", icon:"🔁" },
    { id:"calendar", label:"Calendar", icon:"▦"  },
    { id:"log",      label:"Log",      icon:"+" },
    { id:"history",  label:"History",  icon:"≡"  },
    { id:"stats",    label:"Stats",    icon:"↗"  },
    { id:"theme",    label:dark?"Light":"Dark", icon:dark?"☀️":"🌙" },
  ];

  return (
    <div style={{ minHeight:"100vh", maxWidth:"390px", margin:"0 auto",
      background:t.bg, color:t.text,
      fontFamily:"-apple-system,'SF Pro Text','Helvetica Neue',sans-serif",
      display:"flex", flexDirection:"column", position:"relative",
    }}>
      {/* Dynamic theme color + PWA icon setup */}
      {useEffect(()=>{
        const meta = document.querySelector('meta[name="theme-color"]') || (() => {
          const m = document.createElement('meta'); m.name='theme-color'; document.head.appendChild(m); return m;
        })();
        meta.content = dark ? '#0f0f14' : '#ffffff';
        const statusMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
        if (statusMeta) statusMeta.content = dark ? 'black-translucent' : 'default';

        // PWA icon setup (runs once)
        if (!document.querySelector('link[rel="apple-touch-icon"]')) {
          const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0f0f14"/><stop offset="100%" stop-color="#1a1a2e"/></linearGradient><linearGradient id="bolt" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0%" stop-color="#818cf8"/><stop offset="50%" stop-color="#6366f1"/><stop offset="100%" stop-color="#4f46e5"/></linearGradient><linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#8b5cf6"/></linearGradient></defs><rect width="512" height="512" rx="112" fill="url(#bg)"/><circle cx="256" cy="240" r="200" fill="#6366f1" opacity="0.04"/><circle cx="256" cy="256" r="155" fill="none" stroke="#1e1e3a" stroke-width="18"/><circle cx="256" cy="256" r="155" fill="none" stroke="url(#ring)" stroke-width="18" stroke-dasharray="730 974" stroke-linecap="round" transform="rotate(-90 256 256)" opacity="0.9"/><circle cx="256" cy="256" r="125" fill="none" stroke="#1e1e3a" stroke-width="12"/><circle cx="256" cy="256" r="125" fill="none" stroke="#06b6d4" stroke-width="12" stroke-dasharray="550 785" stroke-linecap="round" transform="rotate(-90 256 256)" opacity="0.7"/><path d="M248,204 L272,204 L260,246 L284,246 L244,308 L254,264 L228,264 Z" fill="url(#bolt)" opacity="0.95"/><circle cx="256" cy="82" r="6" fill="#818cf8" opacity="0.8"/><circle cx="383" cy="145" r="4" fill="#06b6d4" opacity="0.6"/></svg>`;
          const blob = new Blob([iconSvg], {type: 'image/svg+xml'});
          const url = URL.createObjectURL(blob);
          
          // Apple touch icon
          const apple = document.createElement('link');
          apple.rel = 'apple-touch-icon'; apple.href = url;
          document.head.appendChild(apple);
          
          // Favicon
          const fav = document.createElement('link');
          fav.rel = 'icon'; fav.type = 'image/svg+xml'; fav.href = url;
          document.head.appendChild(fav);
          
          // Web app capable
          const capable = document.createElement('meta');
          capable.name = 'apple-mobile-web-app-capable'; capable.content = 'yes';
          document.head.appendChild(capable);
          
          // App title
          const appTitle = document.createElement('meta');
          appTitle.name = 'apple-mobile-web-app-title'; appTitle.content = 'Activity';
          document.head.appendChild(appTitle);

          // Update page title
          document.title = 'Activity Tracker';
        }
      }, [dark])}
      {/* Content */}
      <div style={{flex:1,overflowY:"auto",padding:"12px 20px 96px"}}>

        {/* ── LOG ── */}
        {view==="log"&&(
          <div>
            {/* Mode toggle */}
            <div style={{display:"flex",background:t.surface2,borderRadius:"9px",padding:"3px",marginBottom:"20px",border:`1px solid ${t.border}`}}>
              {[["activity","🏃 Active Day"],["rest","🛌 Rest / Recovery"]].map(([m,lbl])=>(
                <button key={m} onClick={()=>setLogMode(m)} style={{
                  flex:1,background:logMode===m?t.surface:"transparent",
                  color:logMode===m?t.text:t.textSub,
                  border:logMode===m?`1px solid ${t.border}`:"none",
                  padding:"9px 6px",borderRadius:"7px",cursor:"pointer",
                  fontSize:"14px",fontFamily:"inherit",fontWeight:logMode===m?"600":"400",
                  transition:"all 0.12s",
                }}>{lbl}</button>
              ))}
            </div>

            {/* ── STEP 1: Date ── */}
            <Card t={t} style={{padding:"14px 16px",marginBottom:"12px"}}>
              <Label t={t}>WHEN</Label>
              <DatePicker value={form.date} onChange={v=>setForm(f=>({...f,date:v}))} t={t}/>
            </Card>

            {/* ── Activity form ── */}
            {logMode==="activity"&&(
              <>
                {/* STEP 2: Pick activity */}
                <Card t={t} style={{padding:"14px 16px",marginBottom:"12px"}}>
                  <Label t={t}>ACTIVITY</Label>
                  {(() => {
                    const visibleActivities = showAllActivities ? sortedTree : sortedTree.slice(0, MAX_QUICK);
                    const hiddenCount = sortedTree.length - MAX_QUICK;
                    // If the selected activity is hidden, always show it
                    const selectedInHidden = selTop && !showAllActivities && !visibleActivities.some(a=>a.id===selTop);
                    const displayList = selectedInHidden
                      ? [...visibleActivities, sortedTree.find(a=>a.id===selTop)].filter(Boolean)
                      : visibleActivities;

                    return (
                      <>
                        <div style={{display:"flex",flexWrap:"wrap",gap:"7px"}}>
                          {displayList.map(a=>(
                            <Pill key={a.id} active={selTop===a.id} color={a.color} t={t}
                              onClick={()=>{
                                setSelTop(a.id);
                                if (a.id==="mobility-toolkit" && nextMTSess) {
                                  setSelSub(nextMTSess.key);
                                } else {
                                  setSelSub(null);
                                }
                              }}>
                              {a.icon} {a.label}
                              {a.id==="mobility-toolkit" && nextMTSess && (
                                <span style={{fontSize:"12px",opacity:0.7,marginLeft:"2px"}}>Wk{nextMTSess.week}·D{nextMTSess.day}</span>
                              )}
                            </Pill>
                          ))}
                        </div>
                        {hiddenCount > 0 && (
                          <button onClick={()=>setShowAllActivities(s=>!s)} style={{
                            background:"none",border:"none",cursor:"pointer",
                            color:t.accent,fontSize:"13px",fontFamily:"inherit",fontWeight:"600",
                            padding:"8px 0 0",display:"flex",alignItems:"center",gap:"4px",
                          }}>
                            {showAllActivities ? "▲ Show less" : `▼ Show all (${hiddenCount} more)`}
                          </button>
                        )}
                      </>
                    );
                  })()}

                  {/* Sub-categories — MT gets special treatment */}
                  {selTop && hasSubs && !isMTSelected && (
                    <div style={{marginTop:"14px",paddingTop:"14px",borderTop:`1px solid ${t.border}`}}>
                      <Label t={t}>{topNode.label.toUpperCase()} · TYPE</Label>
                      <div style={{display:"flex",flexWrap:"wrap",gap:"7px"}}>
                        <Pill active={!selSub} color={topNode.color} t={t} onClick={()=>setSelSub(null)}>
                          General
                        </Pill>
                        {topNode.sub.map(s=>(
                          <Pill key={s.id} active={selSub===s.id} color={topNode.color} t={t}
                            onClick={()=>setSelSub(s.id)}>
                            {s.icon} {s.label}
                          </Pill>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* MT: show next session details inline */}
                  {isMTSelected && nextMTSess && (
                    <div style={{marginTop:"14px",paddingTop:"14px",borderTop:`1px solid ${t.border}`}}>
                      <Label t={t}>NEXT SESSION</Label>
                      <div style={{background:MT_COLOR+"12",border:`1px solid ${MT_COLOR}33`,borderRadius:"10px",padding:"12px 14px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"8px"}}>
                          <span style={{fontSize:"12px"}}>{nextMTSess.icon}</span>
                          <div>
                            <div style={{fontSize:"12px",fontWeight:"700",color:MT_COLOR}}>{nextMTSess.shortLabel}</div>
                            <div style={{fontSize:"14px",color:t.textSub,marginTop:"1px"}}>{nextMTSess.focus}</div>
                          </div>
                        </div>
                        {/* Allow picking a different session */}
                        <div style={{borderTop:`1px solid ${MT_COLOR}22`,paddingTop:"8px",marginTop:"4px"}}>
                          <div style={{fontSize:"12px",color:t.textMuted,marginBottom:"6px",letterSpacing:"1px"}}>OR PICK A DIFFERENT SESSION</div>
                          <div style={{display:"flex",flexWrap:"wrap",gap:"5px"}}>
                            {MT_PROGRAM.map(wk=>wk.days.map(d=>{
                              const k=`w${wk.week}d${d.day}`;
                              const done=mtProgress[k]?.done;
                              const isSel=selSub===k;
                              return (
                                <button key={k} onClick={()=>setSelSub(k)} style={{
                                  padding:"4px 9px",borderRadius:"8px",cursor:"pointer",fontFamily:"inherit",
                                  fontSize:"14px",fontWeight:isSel?"700":"400",transition:"all 0.1s",
                                  background:isSel?MT_COLOR:done?t.surface2:"transparent",
                                  color:isSel?"#fff":done?t.textMuted:t.textSub,
                                  border:`1px solid ${isSel?MT_COLOR:t.border}`,
                                  textDecoration:done&&!isSel?"line-through":"none",
                                }}>W{wk.week}D{d.day}</button>
                              );
                            }))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {isMTSelected && !nextMTSess && (
                    <div style={{marginTop:"14px",padding:"12px 14px",background:MT_COLOR+"12",borderRadius:"10px",border:`1px solid ${MT_COLOR}33`,fontSize:"14px",color:MT_COLOR,fontWeight:"600"}}>
                      🎉 All sessions complete!
                    </div>
                  )}
                </Card>

                {/* STEP 3: Duration */}
                <Card t={t} style={{padding:"14px 16px",marginBottom:"12px"}}>
                  <Label t={t}>DURATION</Label>
                  <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginBottom:"10px"}}>
                    {[15,30,45,60,90,120].map(min=>(
                      <button key={min} onClick={()=>setForm(f=>({...f,duration:String(min)}))} style={{
                        padding:"7px 13px",borderRadius:"8px",cursor:"pointer",fontFamily:"inherit",
                        fontSize:"14px",fontWeight:"500",transition:"all 0.12s",
                        background: form.duration===String(min) ? (topNode?.color||t.accent) : t.surface2,
                        color:      form.duration===String(min) ? "#fff" : t.textSub,
                        border:     `1px solid ${form.duration===String(min) ? (topNode?.color||t.accent) : t.border}`,
                      }}>{min}m</button>
                    ))}
                    <input
                      type="number" placeholder="Other…" min="1" max="600"
                      value={[15,30,45,60,90,120].includes(Number(form.duration)) ? "" : form.duration}
                      onChange={e=>setForm(f=>({...f,duration:e.target.value}))}
                      style={{
                        width:"80px", background:t.surface2, border:`1px solid ${t.border}`,
                        color:t.text, padding:"7px 10px", borderRadius:"8px",
                        fontSize:"14px", fontFamily:"inherit", outline:"none",
                      }}
                    />
                  </div>
                </Card>

                {/* STEP 4: Notes (optional) */}
                <Card t={t} style={{padding:"14px 16px",marginBottom:"16px"}}>
                  <Label t={t}>NOTES <span style={{color:t.textMuted,fontWeight:"400",letterSpacing:"0"}}>— optional</span></Label>
                  <Textarea t={t} rows={2} placeholder="How did it feel? Any PRs?" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/>
                </Card>
              </>
            )}

            {/* ── Rest form ── */}
            {logMode==="rest"&&(
              <>
                <Card t={t} style={{padding:"14px 16px",marginBottom:"12px"}}>
                  <Label t={t}>REASON</Label>
                  <div style={{display:"flex",gap:"8px"}}>
                    {REST_TYPES.map(r=>(
                      <button key={r.id} onClick={()=>setRestForm(f=>({...f,activity:r.id}))} style={{
                        flex:1, background:restForm.activity===r.id?r.color+"18":"transparent",
                        color:restForm.activity===r.id?r.color:t.textSub,
                        border:`1px solid ${restForm.activity===r.id?r.color+"66":t.border}`,
                        padding:"14px 6px",borderRadius:"10px",cursor:"pointer",
                        fontSize:"14px",display:"flex",flexDirection:"column",alignItems:"center",gap:"6px",
                        fontFamily:"inherit",fontWeight:"500",transition:"all 0.12s",
                      }}>
                        <span style={{fontSize:"18px"}}>{r.icon}</span>{r.label}
                      </button>
                    ))}
                  </div>
                </Card>
                <Card t={t} style={{padding:"14px 16px",marginBottom:"16px"}}>
                  <Label t={t}>NOTES <span style={{color:t.textMuted,fontWeight:"400",letterSpacing:"0"}}>— optional</span></Label>
                  <Textarea t={t} rows={2} placeholder="What happened?" value={restForm.notes} onChange={e=>setRestForm(f=>({...f,notes:e.target.value}))}/>
                </Card>
              </>
            )}

            {/* ── Submit ── always visible, clearly labeled ── */}
            {(()=>{
              const ready = logMode==="activity" ? (!!activeId && !!form.duration) : true;
              const color = logMode==="activity"
                ? (topNode?.color || t.accent)
                : REST_TYPES.find(r=>r.id===restForm.activity)?.color || t.accent;
              let label = "";
              if (logMode==="rest") {
                const r = REST_TYPES.find(r=>r.id===restForm.activity);
                label = `Log ${r.icon} ${r.label}`;
              } else if (!activeId) {
                label = "← Select an activity above";
              } else if (!form.duration) {
                label = "← Set duration above";
              } else {
                const info = resolveActivity(activeId, tree);
                label = `Save ${info.icon} ${displayLabel(info)} — ${form.duration} min`;
              }
              return (
                <button onClick={handleSubmit} disabled={!ready} style={{
                  width:"100%", padding:"16px",
                  background: ready ? color : t.surface2,
                  color: ready ? "#fff" : t.textMuted,
                  border: `1px solid ${ready ? color : t.border}`,
                  borderRadius:"12px", cursor: ready ? "pointer" : "default",
                  fontSize:"14px", fontFamily:"inherit", fontWeight:"700",
                  transition:"all 0.15s", marginBottom:"14px",
                  opacity: ready ? 1 : 0.7,
                }}>
                  {saved ? "✓ Saved!" : label}
                </button>
              );
            })()}

              );
            })()}

            {/* Canvas confetti explosion */}
            <CanvasConfetti active={!!quote} />

            {/* Celebratory quote overlay */}
            {quote && (
              <div style={{
                position:"fixed", inset:0, zIndex:1000,
                display:"flex", alignItems:"flex-end",
                justifyContent:"center",
                padding:"0 16px 110px",
                pointerEvents:"none",
              }}>
                <div style={{
                  width:"100%", maxWidth:"390px",
                  background: dark ? "rgba(12,12,16,0.97)" : "rgba(255,255,255,0.97)",
                  border:`1px solid ${t.accent}44`,
                  borderRadius:"20px",
                  padding:"26px 24px 22px",
                  boxShadow:"0 12px 60px rgba(0,0,0,0.4)",
                  pointerEvents:"auto",
                  animation:"quoteUp 0.55s cubic-bezier(0.34,1.5,0.64,1) forwards",
                }}>
                  <div style={{fontSize:"32px",textAlign:"center",marginBottom:"14px",display:"block",animation:"popIn 0.4s 0.15s cubic-bezier(0.34,1.6,0.64,1) both"}}>🎉</div>
                  <div style={{
                    fontSize:"14px",color:t.text,lineHeight:"1.65",
                    fontStyle:"italic",fontWeight:"500",textAlign:"center",marginBottom:"12px",
                  }}>"{quote.text}"</div>
                  {quote.author !== "Unknown" && (
                    <div style={{fontSize:"12px",color:t.textSub,textAlign:"center",fontWeight:"500"}}>— {quote.author}</div>
                  )}
                </div>
                <style>{`
                  @keyframes quoteUp {
                    from { transform: translateY(60px) scale(0.92); opacity: 0; }
                    to   { transform: translateY(0) scale(1); opacity: 1; }
                  }
                  @keyframes popIn {
                    from { transform: scale(0) rotate(-20deg); opacity: 0; }
                    to   { transform: scale(1) rotate(0deg);   opacity: 1; }
                  }
                `}</style>
              </div>
            )}

            {ouraToday&&<OuraBadge data={{...ouraToday,date:"Today"}} t={t}/>}

            {/* Quick stats */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"8px",marginTop:"8px"}}>
              {[
                {label:"Sessions",value:actLogs.length},
                {label:"Hours",value:(totalMin/60).toFixed(1)+"h"},
                {label:"Streak",value:streak+"d"},
              ].map(s=>(
                <Card t={t} key={s.label} style={{padding:"12px 8px",textAlign:"center"}}>
                  <div style={{fontSize:"12px",fontWeight:"700",color:t.text}}>{s.value}</div>
                  <div style={{fontSize:"12px",color:t.textMuted,letterSpacing:"1px",marginTop:"2px"}}>{s.label.toUpperCase()}</div>
                </Card>
              ))}
            </div>

            {/* Manage link */}
            <button onClick={()=>setView("manage")} style={{
              background:"none",border:`1px solid ${t.border}`,borderRadius:"10px",
              cursor:"pointer",color:t.textSub,fontSize:"13px",fontFamily:"inherit",
              fontWeight:"500",padding:"12px",marginTop:"14px",width:"100%",
              display:"flex",alignItems:"center",justifyContent:"center",gap:"6px",
            }}>
              ✎ Manage Activities & Oura
            </button>
          </div>
        )}

        {/* ── CALENDAR ── */}
        {view==="calendar"&&<CalendarView logs={logs} ouraData={ouraData} tree={tree} mtProgress={mtProgress} t={t}/>}

        {/* ── HISTORY ── */}
        {view==="history"&&(
          <div>
            <div style={{fontSize:"12px",color:t.textMuted,marginBottom:"14px"}}>{logs.length} entries</div>
            {!logs.length&&<div style={{textAlign:"center",padding:"50px 0",color:t.textMuted}}>Nothing logged yet.</div>}
            <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
              {logs.map(log=>{
                const info=resolveActivity(log.activity,tree);
                return (
                  <Card t={t} key={log.id} style={{padding:"13px 15px",display:"flex",alignItems:"center",gap:"11px",borderLeft:`3px solid ${info.color}`}}>
                    <span style={{fontSize:"18px"}}>{info.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:"14px",fontWeight:"600",color:t.text}}>{displayLabel(info)}</div>
                      <div style={{fontSize:"14px",color:t.textSub,marginTop:"1px"}}>{formatDate(log.date)}{log.duration?" · "+log.duration+" min":""}</div>
                      {log.notes&&<div style={{fontSize:"14px",color:t.textSub,fontStyle:"italic",marginTop:"2px"}}>{log.notes}</div>}
                    </div>
                    <button onClick={()=>deleteLog(log.id)} style={{background:"none",border:"none",color:t.textMuted,cursor:"pointer",fontSize:"12px",padding:"3px 6px"}}>×</button>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STATS ── */}
        {view==="stats"&&(()=>{
          // ── Period filter state (inline with IIFE to keep clean) ──────────
          // We lift these into the parent via a mini component trick using useState hooks at top level
          return <StatsView logs={logs} actLogs={actLogs} restLogs={restLogs} tree={tree} ouraData={ouraData} hasOura={hasOura} totalMin={totalMin} streak={streak} activityCounts={activityCounts} t={t}/>;
        })()}

        {/* ── MOBILITY ── */}
        {view==="mobility"&&<MobilityView mtProgress={mtProgress} setMtProgress={setMtProgress} t={t}/>}

        {/* ── SUPPS ── */}
        {view==="supps"&&(
          <SupplementsView suppLogs={suppLogs} setSuppLogs={setSuppLogs} t={t}/>
        )}

        {/* ── MANAGE (accessible from Log screen) ── */}
        {view==="manage"&&(
          <>
            <button onClick={()=>setView("log")} style={{background:"none",border:"none",color:t.accent,cursor:"pointer",fontSize:"14px",fontFamily:"inherit",padding:"4px 0",marginBottom:"16px",display:"flex",alignItems:"center",gap:"6px"}}>
              ‹ Back to Log
            </button>
            <ActivityManager tree={tree} setTree={setTreeAndSave} t={t}/>
            <div style={{marginTop:"24px"}}>
              <Label t={t}>OURA INTEGRATION</Label>
              <OuraPanel token={ouraToken} setToken={setOuraToken} ouraData={ouraData} fetchOura={fetchOura} fetching={fetching} ouraError={ouraError} t={t}/>
            </div>
          </>
        )}
      </div>

      {/* Bottom Tab Bar */}
      <div style={{
        position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
        width:"100%",maxWidth:"390px",
        background: dark ? "#2c2c2e" : "#e5e5ea",
        borderTop: dark ? "1px solid #3a3a3c" : "1px solid #c7c7cc",
        display:"grid",gridTemplateColumns:"repeat(7,1fr)",
        paddingBottom:"18px",paddingTop:"8px",zIndex:100,
      }}>
        {TABS.map(tab=>(
          <button key={tab.id} onClick={()=>tab.id==="theme"?toggleDark():setView(tab.id)} style={{
            background:"none",border:"none",cursor:"pointer",
            display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",padding:"5px 0",
          }}>
            <span style={{fontSize:"16px",fontWeight:"700",color:view===tab.id?t.accent: dark ? "#8e8e93" : "#8e8e93",fontFamily:"monospace"}}>{tab.icon}</span>
            <span style={{fontSize:"10px",letterSpacing:"0.3px",color:view===tab.id?t.accent: dark ? "#8e8e93" : "#8e8e93",fontWeight:view===tab.id?"700":"500"}}>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
