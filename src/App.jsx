import { useState, useEffect, useRef, useCallback } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, onSnapshot
} from "firebase/firestore";

// ═══════════════════════════════════════════════
//  FIREBASE CONFIG
// ═══════════════════════════════════════════════
const firebaseConfig = {
  apiKey: "AIzaSyCznDK8W_347IlLgvEWH4j5rOPKitHAHmo",
  authDomain: "supervisionbm-a4543.firebaseapp.com",
  projectId: "supervisionbm-a4543",
  storageBucket: "supervisionbm-a4543.firebasestorage.app",
  messagingSenderId: "1081927917450",
  appId: "1:1081927917450:web:f3cc08789bfc8806a4f273",
  measurementId: "G-4ZHDKWTB80"
};
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

const cfgRef   = (key) => doc(db, "sv_config", key);
const bkCol    = () => collection(db, "sv_bookings");
const bkRef    = (id) => doc(db, "sv_bookings", id);
const usersCol = () => collection(db, "sv_users");
const userRef  = (id) => doc(db, "sv_users", id);

const fsGet = async (key) => {
  try { const s = await getDoc(cfgRef(key)); return s.exists() ? s.data().value : null; }
  catch { return null; }
};
const fsSet = async (key, val) => {
  try { await setDoc(cfgRef(key), { value: val }); } catch(e) { console.error(e); }
};

// ═══════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════
const DEFAULT_DOMAIN = "banmi.ac.th";
const TH_MONTHS   = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
const TH_MONTHS_S = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const WEEKDAYS    = ["อา","จ","อ","พ","พฤ","ศ","ส"];
const TIME_SLOTS  = [
  "08:20 - 09:10 (คาบที่ 1)",
  "09:10 - 10:00 (คาบที่ 2)",
  "10:00 - 10:50 (คาบที่ 3)",
  "10:50 - 11:40 (คาบที่ 4)",
  "11:40 - 12:30 (คาบที่ 5)",
  "12:30 - 13:20 (คาบที่ 6)",
  "13:20 - 14:10 (คาบที่ 7)",
  "14:10 - 15:00 (คาบที่ 8)",
  "15:00 - 15:50 (คาบที่ 9)"
];
const ROLES       = { sysadmin:"ผู้ดูแลระบบ", admin:"ผู้บริหาร", teacher:"ครูผู้สอน" };
const ROLE_COLOR  = { sysadmin:"#4C1D95", admin:"#1E3A8A", teacher:"#166634" };

const DEF_SETTINGS = { schoolName:"โรงเรียนบ้านหมี่วิทยา", logo:null, domain:DEFAULT_DOMAIN };
const DEF_STRUCTURE = [
  { id:"ds1", name:"การวางแผนการจัดการเรียนรู้", items:[
    { id:"di1a", name:"การกำหนดจุดประสงค์การเรียนรู้",    maxScore:5 },
    { id:"di1b", name:"การออกแบบกิจกรรมการเรียนรู้",      maxScore:5 },
    { id:"di1c", name:"การจัดเตรียมสื่อและแหล่งเรียนรู้", maxScore:5 },
  ]},
  { id:"ds2", name:"การจัดกิจกรรมการเรียนรู้", items:[
    { id:"di2a", name:"การนำเข้าสู่บทเรียน",              maxScore:5 },
    { id:"di2b", name:"การดำเนินกิจกรรมการเรียนรู้",       maxScore:5 },
    { id:"di2c", name:"การใช้สื่อและเทคโนโลยี",           maxScore:5 },
    { id:"di2d", name:"การกระตุ้นและส่งเสริมผู้เรียน",    maxScore:5 },
    { id:"di2e", name:"การจัดการชั้นเรียน",               maxScore:5 },
  ]},
  { id:"ds3", name:"การวัดและประเมินผล", items:[
    { id:"di3a", name:"การวัดผลตามจุดประสงค์",            maxScore:5 },
    { id:"di3b", name:"เครื่องมือการวัดและประเมินผล",      maxScore:5 },
    { id:"di3c", name:"การนำผลไปพัฒนาผู้เรียน",           maxScore:5 },
  ]},
  { id:"ds4", name:"คุณลักษณะของผู้สอน", items:[
    { id:"di4a", name:"บุคลิกภาพและการแต่งกาย",           maxScore:5 },
    { id:"di4b", name:"ความรู้ในเนื้อหาวิชา",             maxScore:5 },
    { id:"di4c", name:"ความกระตือรือร้นและมุ่งมั่น",      maxScore:5 },
  ]},
];

// ═══════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════
const uid     = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const today   = () => new Date().toISOString().slice(0,10);
const fmtDate = d => { if(!d) return ""; const [y,m,day]=d.split("-"); return `${+day} ${TH_MONTHS_S[+m-1]} ${+y+543}`; };
const daysInM = (y,m) => new Date(y,m+1,0).getDate();
const firstD  = (y,m) => new Date(y,m,1).getDay();

const calcOneEval = (ev,str) => {
  if(!ev?.submitted) return null;
  let total=0, maxTotal=0;
  const dims = str.map(d => {
    let dt=0,dm=0;
    d.items.forEach(i=>{ dt+=ev.scores[i.id]||0; dm+=i.maxScore; });
    total+=dt; maxTotal+=dm;
    return {name:d.name,score:dt,max:dm};
  });
  return {total,maxTotal,pct:maxTotal>0?Math.round(total/maxTotal*100):0,dims};
};
const calcAvgScore = (b,str) => {
  const results = Object.values(b.evals||{}).map(ev=>calcOneEval(ev,str)).filter(Boolean);
  if(results.length===0) return null;
  const avgPct   = Math.round(results.reduce((a,r)=>a+r.pct,0)/results.length);
  const avgTotal = Math.round(results.reduce((a,r)=>a+r.total,0)/results.length);
  const dims = str.map((d,i)=>({name:d.name,max:results[0].dims[i].max,score:Math.round(results.reduce((a,r)=>a+r.dims[i].score,0)/results.length)}));
  return {avgPct,avgTotal,maxTotal:results[0].maxTotal,dims,count:results.length};
};
const evalIds        = b => [b.adminId,b.teacher1Id,b.teacher2Id].filter(Boolean);
const submittedCount = b => evalIds(b).filter(id=>b.evals?.[id]?.submitted).length;
const isFullyEval    = b => { const ids=evalIds(b); return ids.length>0&&ids.every(id=>b.evals?.[id]?.submitted); };
const gradeOf        = pct => pct>=80?{label:"ดีมาก",color:"#14532D",bg:"#D1FAE5"}:pct>=70?{label:"ดี",color:"#166634",bg:"#DCFCE7"}:pct>=60?{label:"พอใช้",color:"#78350F",bg:"#FEF3C7"}:{label:"ควรปรับปรุง",color:"#7F1D1D",bg:"#FEE2E2"};
const userBusy       = (uid2,date,time,bks,excId=null) => { if(!uid2) return false; return bks.some(b=>b.id!==excId&&b.date===date&&b.time===time&&(b.teacherId===uid2||b.adminId===uid2||b.teacher1Id===uid2||b.teacher2Id===uid2)); };
const isEvaluator    = (userId,bookings) => bookings.some(b=>b.adminId===userId||b.teacher1Id===userId||b.teacher2Id===userId);

// ═══════════════════════════════════════════════
//  CSS
// ═══════════════════════════════════════════════
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{--P:#1E3A8A;--PD:#1E2F6B;--PL:#EEF2FF;--A:#F59E0B;--AD:#D97706;--G:#16A34A;--R:#DC2626;--T:#1F2937;--TS:#6B7280;--BD:#E5E7EB;--BG:#F1F5F9;--W:#FFFFFF;}
body,#root{font-family:'Sarabun',sans-serif;background:var(--BG);color:var(--T);min-height:100vh;}
.inp{width:100%;padding:10px 13px;border:1.5px solid var(--BD);border-radius:8px;font-family:'Sarabun',sans-serif;font-size:14px;background:var(--W);outline:none;transition:border-color .2s;color:var(--T);}
.inp:focus{border-color:var(--P);}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:5px;padding:9px 18px;border-radius:8px;border:none;cursor:pointer;font-family:'Sarabun',sans-serif;font-size:14px;font-weight:600;transition:all .18s;white-space:nowrap;}
.btn:active{transform:scale(.97);}.btn:disabled{opacity:.45;cursor:not-allowed;}
.bp{background:var(--P);color:#fff;}.bp:hover:not(:disabled){background:var(--PD);}
.ba{background:var(--A);color:#1a0000;}.ba:hover:not(:disabled){background:var(--AD);}
.bg{background:var(--G);color:#fff;}.bg:hover:not(:disabled){background:#15803D;}
.br{background:var(--R);color:#fff;}.br:hover:not(:disabled){background:#B91C1C;}
.bx{background:var(--PL);color:var(--P);border:1.5px solid #C7D2FE;}.bx:hover:not(:disabled){background:#C7D2FE;}
.bo{background:var(--W);color:var(--T);border:1.5px solid var(--BD);}.bo:hover:not(:disabled){background:#F9FAFB;}
.card{background:var(--W);border-radius:10px;box-shadow:0 2px 12px rgba(0,0,0,.08);padding:20px;}
.frow{display:flex;flex-direction:column;gap:5px;margin-bottom:14px;}
.flbl{font-size:13px;font-weight:700;color:#374151;}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;}
.g4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;}
.badge-p{display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;background:#FEF3C7;color:#92400E;}
.badge-d{display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;background:#D1FAE5;color:#065F46;}
.badge-part{display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;background:#DBEAFE;color:#1E40AF;}
.rt-dot{width:8px;height:8px;border-radius:50%;background:#22c55e;display:inline-block;margin-right:5px;animation:pulse 2s infinite;}
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
.score-btn{width:38px;height:38px;border-radius:50%;border:2px solid var(--BD);background:var(--W);cursor:pointer;font-family:'Sarabun',sans-serif;font-size:14px;font-weight:700;transition:all .15s;color:var(--TS);}
.score-btn:hover{border-color:var(--P);color:var(--P);background:var(--PL);}
.score-btn.active{background:var(--P);color:#fff;border-color:var(--P);}
.progress-bar{height:8px;border-radius:4px;background:#E5E7EB;overflow:hidden;}
.progress-fill{height:100%;border-radius:4px;transition:width .5s ease;}
.stat-card{background:var(--W);border-radius:10px;padding:18px 20px;border:1px solid var(--BD);}
.tab-btn{padding:8px 16px;border:none;background:none;cursor:pointer;font-family:'Sarabun',sans-serif;font-size:14px;font-weight:600;color:var(--TS);border-bottom:2px solid transparent;transition:all .18s;}
.tab-btn.active{color:var(--P);border-bottom-color:var(--P);}
@media(max-width:640px){.g2{grid-template-columns:1fr!important;}.g3{grid-template-columns:1fr 1fr!important;}.g4{grid-template-columns:1fr 1fr!important;}.hsm{display:none!important;}}
@media print{
  .np{display:none!important;}
  body{background:white;font-size:12pt;}
  .card{box-shadow:none!important;border:1px solid #ddd!important;}
  .print-break{page-break-before:always;}
}
`;

// ═══════════════════════════════════════════════
//  MINI CALENDAR
// ═══════════════════════════════════════════════
function MiniCal({year,month,onPrev,onNext,renderCell}){
  const dim=daysInM(year,month),fd=firstD(year,month);
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <button onClick={onPrev} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:"var(--P)",padding:"2px 8px",lineHeight:1}}>‹</button>
        <span style={{fontWeight:700,fontSize:15}}>{TH_MONTHS[month]} {year+543}</span>
        <button onClick={onNext} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:"var(--P)",padding:"2px 8px",lineHeight:1}}>›</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
        {WEEKDAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:11,fontWeight:700,color:"var(--TS)",paddingBottom:4}}>{d}</div>)}
        {Array.from({length:fd},(_,i)=><div key={"e"+i}/>)}
        {Array.from({length:dim},(_,i)=>{
          const day=i+1,ds=`${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          return renderCell(day,ds);
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  LOGIN & REGISTER
// ═══════════════════════════════════════════════
function LoginPage({users,settings,onLogin}){
  const [isRegister, setIsRegister] = useState(false);
  const [email,setEmail] = useState("");
  const [pw,setPw] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [show,setShow] = useState(false);
  const [err,setErr] = useState("");
  const [msg,setMsg] = useState("");
  const domain=settings.domain||DEFAULT_DOMAIN;

  const doLogin=()=>{
    const em=email.trim().toLowerCase();
    if(!em){setErr("กรุณากรอกอีเมล");return;}
    if(!pw){setErr("กรุณากรอกรหัสผ่าน");return;}
    const u=users.find(u=>u.email.toLowerCase()===em);
    if(!u){setErr("ไม่พบอีเมลนี้ในระบบ กรุณาลงทะเบียน");return;}
    if(u.password!==pw){setErr("รหัสผ่านไม่ถูกต้อง");return;}
    if(!u.approved && u.role !== "sysadmin"){setErr("บัญชียังไม่ได้รับการอนุมัติ กรุณารอผู้ดูแลระบบ");return;}
    onLogin(u);
  };

  const doRegister=async()=>{
    const em=email.trim().toLowerCase();
    if(!displayName.trim()){setErr("กรุณากรอกชื่อ-สกุล");return;}
    if(!em){setErr("กรุณากรอกอีเมล");return;}
    if(!em.endsWith("@"+domain)){setErr(`อีเมลต้องเป็น @${domain} เท่านั้น`);return;}
    if(pw.length<4){setErr("รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร");return;}
    if(users.find(u=>u.email.toLowerCase()===em)){setErr("อีเมลนี้มีในระบบแล้ว");return;}
    try {
      const newId = uid();
      await setDoc(doc(getFirestore(), "sv_users", newId), {
        email: em, displayName: displayName.trim(), password: pw,
        role: "teacher", approved: false, createdAt: new Date().toISOString()
      });
      setMsg("ลงทะเบียนสำเร็จ! กรุณารอผู้ดูแลระบบอนุมัติบัญชี");
      setIsRegister(false); setErr(""); setPw("");
    } catch (error) { setErr("เกิดข้อผิดพลาดในการลงทะเบียน"); }
  };

  return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:20,background:"linear-gradient(135deg,#EEF2FF 0%,#F1F5F9 100%)"}}>
      <div style={{width:"100%",maxWidth:420}}>
        <div className="card" style={{padding:"44px 36px 36px",boxShadow:"0 8px 32px rgba(30,58,138,.15)"}}>
          <div style={{textAlign:"center",marginBottom:28}}>
            {settings.logo?<img src={settings.logo} style={{width:70,height:70,borderRadius:12,objectFit:"cover",marginBottom:12}}/>:<div style={{fontSize:52,marginBottom:10}}>🏫</div>}
            <h1 style={{fontWeight:800,fontSize:22,color:"var(--P)",marginBottom:4}}>{settings.schoolName}</h1>
            <p style={{color:"var(--TS)",fontSize:13,marginBottom:6}}>ระบบนิเทศการสอน</p>
            {!isRegister && <span style={{display:"inline-block",background:"#EEF2FF",color:"var(--P)",padding:"3px 14px",borderRadius:20,fontSize:12,fontWeight:700}}>@{domain}</span>}
          </div>
          {err&&<div style={{background:"#FEE2E2",color:"#991B1B",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13,fontWeight:600,border:"1px solid #FECACA"}}>⚠️ {err}</div>}
          {msg&&<div style={{background:"#D1FAE5",color:"#065F46",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13,fontWeight:600,border:"1px solid #A7F3D0"}}>✅ {msg}</div>}
          {isRegister && (<div className="frow"><label className="flbl">ชื่อ-สกุล</label><input className="inp" type="text" value={displayName} onChange={e=>{setDisplayName(e.target.value);setErr("");}} placeholder="เช่น ครูนภา สวัสดี"/></div>)}
          <div className="frow"><label className="flbl">อีเมลโรงเรียน</label><input className="inp" type="email" value={email} onChange={e=>{setEmail(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&(isRegister?doRegister():doLogin())} placeholder={`yourname@${domain}`}/></div>
          <div className="frow"><label className="flbl">รหัสผ่าน</label>
            <div style={{position:"relative"}}>
              <input className="inp" type={show?"text":"password"} value={pw} onChange={e=>{setPw(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&(isRegister?doRegister():doLogin())} placeholder="กรอกรหัสผ่าน" style={{paddingRight:44}}/>
              <button onClick={()=>setShow(!show)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:18,padding:0,lineHeight:1}}>{show?"🙈":"👁️"}</button>
            </div>
          </div>
          {isRegister?(<button onClick={doRegister} className="btn bg" style={{width:"100%",padding:"12px",fontSize:16,marginTop:4}}>📝 ลงทะเบียน</button>):(<button onClick={doLogin} className="btn bp" style={{width:"100%",padding:"12px",fontSize:16,marginTop:4}}>🔐 เข้าสู่ระบบ</button>)}
          <div style={{marginTop:20,textAlign:"center"}}>
            <button onClick={()=>{setIsRegister(!isRegister);setErr("");setMsg("");}} style={{background:"none",border:"none",color:"var(--P)",textDecoration:"underline",fontSize:13,cursor:"pointer",fontFamily:"Sarabun,sans-serif"}}>
              {isRegister?"มีบัญชีแล้ว? เข้าสู่ระบบ":"ยังไม่มีบัญชี? ลงทะเบียนที่นี่"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════
function DashboardPage({bookings,users,structure,settings}){
  const teachers = users.filter(u=>u.role==="teacher"&&u.approved);
  const total = bookings.length;
  const done = bookings.filter(isFullyEval).length;
  const pending = total - done;
  const thisMonth = new Date().toISOString().slice(0,7);
  const thisMonthBks = bookings.filter(b=>b.date.startsWith(thisMonth));

  // avg score across all done
  const doneScores = bookings.filter(isFullyEval).map(b=>calcAvgScore(b,structure)).filter(Boolean);
  const overallAvgPct = doneScores.length>0 ? Math.round(doneScores.reduce((a,r)=>a+r.avgPct,0)/doneScores.length) : null;

  // per-dimension avg
  const dimAvg = structure.map((d,di)=>{
    const vals = doneScores.map(s=>s.dims[di]).filter(Boolean);
    const avg = vals.length>0 ? Math.round(vals.reduce((a,v)=>a+(v.score/v.max*100),0)/vals.length) : 0;
    return {name:d.name, pct:avg};
  });

  // grade distribution
  const gradeCount = {ดีมาก:0,ดี:0,พอใช้:0,ควรปรับปรุง:0};
  doneScores.forEach(s=>{ gradeCount[gradeOf(s.avgPct).label]++; });

  // teacher leaderboard
  const teacherStats = teachers.map(t=>{
    const tBks = bookings.filter(b=>b.teacherId===t.id&&isFullyEval(b));
    const scores = tBks.map(b=>calcAvgScore(b,structure)).filter(Boolean);
    if(!scores.length) return {name:t.displayName,count:0,avg:null};
    return {name:t.displayName,count:scores.length,avg:Math.round(scores.reduce((a,s)=>a+s.avgPct,0)/scores.length)};
  }).filter(t=>t.count>0).sort((a,b)=>b.avg-a.avg);

  // monthly trend (last 6 months)
  const months = [];
  for(let i=5;i>=0;i--){
    const d=new Date(); d.setMonth(d.getMonth()-i);
    const key=d.toISOString().slice(0,7);
    const label=`${TH_MONTHS_S[d.getMonth()]}`;
    const mBks=bookings.filter(b=>b.date.startsWith(key));
    months.push({label,count:mBks.length,done:mBks.filter(isFullyEval).length});
  }
  const maxCount = Math.max(...months.map(m=>m.count),1);

  return(
    <div>
      <div style={{marginBottom:20}}>
        <h2 style={{fontWeight:800,fontSize:22,color:"var(--P)"}}>📊 Dashboard ภาพรวมการนิเทศ</h2>
        <p style={{color:"var(--TS)",fontSize:13,marginTop:3}}>{settings.schoolName} — ปีการศึกษา {new Date().getFullYear()+543}</p>
      </div>

      {/* Stats Row */}
      <div className="g4" style={{marginBottom:20}}>
        {[
          {label:"การนิเทศทั้งหมด",value:total,icon:"📋",color:"#EEF2FF",tc:"var(--P)"},
          {label:"ประเมินครบแล้ว",value:done,icon:"✅",color:"#D1FAE5",tc:"#065F46"},
          {label:"รอการประเมิน",value:pending,icon:"⏳",color:"#FEF3C7",tc:"#92400E"},
          {label:"เดือนนี้",value:thisMonthBks.length,icon:"📅",color:"#F0FDF4",tc:"#166634"},
        ].map(s=>(
          <div key={s.label} className="stat-card" style={{background:s.color,border:`1px solid ${s.color}`}}>
            <div style={{fontSize:26,marginBottom:4}}>{s.icon}</div>
            <div style={{fontSize:28,fontWeight:800,color:s.tc}}>{s.value}</div>
            <div style={{fontSize:12,color:s.tc,opacity:.8,fontWeight:600}}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="g2" style={{marginBottom:20,alignItems:"start"}}>
        {/* Trend Chart */}
        <div className="card">
          <h3 style={{fontWeight:700,fontSize:15,marginBottom:16,color:"var(--P)"}}>📈 แนวโน้มการนิเทศ 6 เดือนล่าสุด</h3>
          <div style={{display:"flex",alignItems:"flex-end",gap:8,height:120}}>
            {months.map((m,i)=>(
              <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <div style={{fontSize:10,fontWeight:700,color:"var(--P)"}}>{m.count||""}</div>
                <div style={{width:"100%",position:"relative",height:80,display:"flex",alignItems:"flex-end"}}>
                  <div style={{position:"absolute",bottom:0,width:"100%",background:"#EEF2FF",borderRadius:"4px 4px 0 0",height:`${(m.count/maxCount)*80}px`}}/>
                  <div style={{position:"absolute",bottom:0,width:"100%",background:"var(--P)",borderRadius:"4px 4px 0 0",height:`${(m.done/maxCount)*80}px`,opacity:.85}}/>
                </div>
                <div style={{fontSize:10,color:"var(--TS)"}}>{m.label}</div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:14,marginTop:10}}>
            <span style={{fontSize:11,color:"var(--TS)"}}><span style={{display:"inline-block",width:10,height:10,borderRadius:2,background:"#EEF2FF",border:"1px solid #C7D2FE",marginRight:4}}/>จอง</span>
            <span style={{fontSize:11,color:"var(--TS)"}}><span style={{display:"inline-block",width:10,height:10,borderRadius:2,background:"var(--P)",marginRight:4}}/>ประเมินครบ</span>
          </div>
        </div>

        {/* Grade Dist */}
        <div className="card">
          <h3 style={{fontWeight:700,fontSize:15,marginBottom:16,color:"var(--P)"}}>🏅 การกระจายระดับคุณภาพ</h3>
          {overallAvgPct!==null&&(
            <div style={{textAlign:"center",marginBottom:16,padding:"12px",background:"var(--PL)",borderRadius:8}}>
              <div style={{fontSize:36,fontWeight:800,color:"var(--P)"}}>{overallAvgPct}%</div>
              <div style={{fontSize:13,color:"var(--TS)"}}>คะแนนเฉลี่ยรวม</div>
              <span style={{display:"inline-block",marginTop:4,padding:"3px 12px",borderRadius:20,background:gradeOf(overallAvgPct).bg,color:gradeOf(overallAvgPct).color,fontWeight:700,fontSize:13}}>{gradeOf(overallAvgPct).label}</span>
            </div>
          )}
          {[
            {k:"ดีมาก",bg:"#D1FAE5",c:"#065F46"},
            {k:"ดี",bg:"#DCFCE7",c:"#166634"},
            {k:"พอใช้",bg:"#FEF3C7",c:"#92400E"},
            {k:"ควรปรับปรุง",bg:"#FEE2E2",c:"#991B1B"},
          ].map(g=>(
            <div key={g.k} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <span style={{minWidth:80,fontSize:12,fontWeight:700,color:g.c}}>{g.k}</span>
              <div style={{flex:1,background:"#F3F4F6",borderRadius:4,height:16,overflow:"hidden"}}>
                <div style={{width:`${doneScores.length?gradeCount[g.k]/doneScores.length*100:0}%`,height:"100%",background:g.bg,border:`1px solid ${g.c}20`,transition:"width .5s"}}/>
              </div>
              <span style={{minWidth:24,fontSize:12,fontWeight:700,color:g.c}}>{gradeCount[g.k]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dimension Breakdown */}
      <div className="card" style={{marginBottom:20}}>
        <h3 style={{fontWeight:700,fontSize:15,marginBottom:16,color:"var(--P)"}}>🎯 คะแนนเฉลี่ยรายด้าน</h3>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {dimAvg.map((d,i)=>(
            <div key={i}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:13,fontWeight:600}}>{d.name}</span>
                <span style={{fontSize:13,fontWeight:800,color:gradeOf(d.pct).color}}>{d.pct}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{width:`${d.pct}%`,background:d.pct>=80?"#16A34A":d.pct>=70?"#22C55E":d.pct>=60?"#F59E0B":"#DC2626"}}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Teacher Leaderboard */}
      {teacherStats.length>0&&(
        <div className="card">
          <h3 style={{fontWeight:700,fontSize:15,marginBottom:14,color:"var(--P)"}}>🏆 ผลการนิเทศครูรายบุคคล</h3>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {teacherStats.map((t,i)=>{
              const g=gradeOf(t.avg);
              return(
                <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:i===0?"#FFFBEB":"#F9FAFB",borderRadius:8,border:`1px solid ${i===0?"#FDE68A":"var(--BD)"}`}}>
                  <div style={{width:28,height:28,borderRadius:"50%",background:i===0?"#F59E0B":i===1?"#9CA3AF":i===2?"#C77D38":"var(--PL)",color:i<3?"#fff":"var(--P)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800}}>{i+1}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:14}}>{t.name}</div>
                    <div style={{fontSize:12,color:"var(--TS)"}}>นิเทศแล้ว {t.count} ครั้ง</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontWeight:800,fontSize:18,color:g.color}}>{t.avg}%</div>
                    <span style={{padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:700,background:g.bg,color:g.color}}>{g.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
//  FULL EVALUATE FORM
// ═══════════════════════════════════════════════
function EvaluateTab({currentUser,bookings,structure,onSaveBooking}){
  const [selected, setSelected] = useState(null);
  const [scores, setScores] = useState({});
  const [comments, setComments] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const myQueue = currentUser.role==="sysadmin"
    ? bookings
    : bookings.filter(b=>b.adminId===currentUser.id||b.teacher1Id===currentUser.id||b.teacher2Id===currentUser.id);

  const pending = [...myQueue].filter(b=>!b.evals?.[currentUser.id]?.submitted);
  const done    = [...myQueue].filter(b=> b.evals?.[currentUser.id]?.submitted);

  const openEval = (b) => {
    const existingEval = b.evals?.[currentUser.id];
    if(existingEval?.submitted){
      setScores(existingEval.scores||{});
      setComments(existingEval.comments||"");
    } else {
      const init={};
      structure.forEach(d=>d.items.forEach(i=>{ init[i.id]=0; }));
      setScores(init);
      setComments("");
    }
    setSelected(b);
    setMsg(null);
  };

  const setScore = (itemId, val) => setScores(prev=>({...prev,[itemId]:val}));

  const calcTotal = () => {
    let t=0,max=0;
    structure.forEach(d=>d.items.forEach(i=>{ t+=scores[i.id]||0; max+=i.maxScore; }));
    return {total:t,max,pct:max>0?Math.round(t/max*100):0};
  };

  const submitEval = async () => {
    const total = calcTotal();
    if(total.total===0){setMsg({t:"e",s:"กรุณากรอกคะแนนอย่างน้อย 1 รายการ"});return;}
    setSaving(true);
    try {
      const updated = {
        ...selected,
        evals:{
          ...selected.evals,
          [currentUser.id]:{
            scores,comments,submitted:true,
            evaluatorName:currentUser.displayName,
            submittedAt:new Date().toISOString()
          }
        }
      };
      await onSaveBooking(updated);
      setMsg({t:"s",s:"✅ บันทึกการประเมินเรียบร้อยแล้ว"});
      setSelected(null);
    } catch(e){setMsg({t:"e",s:"เกิดข้อผิดพลาด"});}
    setSaving(false);
  };

  if(selected){
    const already = selected.evals?.[currentUser.id]?.submitted;
    const tot = calcTotal();
    const g = gradeOf(tot.pct);
    return(
      <div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
          <button onClick={()=>setSelected(null)} className="btn bo" style={{padding:"8px 14px"}}>← กลับ</button>
          <div>
            <h2 style={{fontWeight:800,fontSize:18,color:"var(--P)"}}>📝 แบบประเมินการนิเทศ</h2>
            <p style={{color:"var(--TS)",fontSize:13}}>{selected.teacherName} — {selected.subject} ({selected.classRoom}) — {fmtDate(selected.date)} {selected.time} น.</p>
          </div>
        </div>

        {msg&&<div style={{padding:"12px 16px",borderRadius:8,marginBottom:14,fontWeight:600,fontSize:14,background:msg.t==="s"?"#D1FAE5":"#FEE2E2",color:msg.t==="s"?"#065F46":"#991B1B"}}>{msg.s}</div>}

        {/* Running score */}
        <div className="card" style={{marginBottom:16,background:"linear-gradient(135deg,#EEF2FF,#F0FDF4)",border:"1px solid #C7D2FE"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
            <div>
              <div style={{fontSize:13,color:"var(--TS)",marginBottom:2}}>คะแนนรวมปัจจุบัน</div>
              <div style={{fontSize:32,fontWeight:800,color:"var(--P)"}}>{tot.total}<span style={{fontSize:16,color:"var(--TS)"}}>/{tot.max}</span></div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:28,fontWeight:800,color:g.color}}>{tot.pct}%</div>
              <span style={{padding:"4px 14px",borderRadius:20,background:g.bg,color:g.color,fontWeight:700,fontSize:14}}>{g.label}</span>
            </div>
            <div style={{flex:1,minWidth:160}}>
              <div className="progress-bar" style={{height:12}}>
                <div className="progress-fill" style={{width:`${tot.pct}%`,background:tot.pct>=80?"#16A34A":tot.pct>=70?"#22C55E":tot.pct>=60?"#F59E0B":"#DC2626"}}/>
              </div>
            </div>
          </div>
        </div>

        {structure.map(domain=>(
          <div key={domain.id} className="card" style={{marginBottom:14}}>
            <h3 style={{fontWeight:700,fontSize:15,color:"var(--P)",marginBottom:14,paddingBottom:10,borderBottom:"1px solid var(--BD)"}}>{domain.name}</h3>
            {domain.items.map(item=>(
              <div key={item.id} style={{marginBottom:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:8}}>
                  <span style={{fontSize:14,fontWeight:600,flex:1}}>{item.name}</span>
                  <span style={{fontSize:12,color:"var(--TS)",whiteSpace:"nowrap"}}>(เต็ม {item.maxScore} คะแนน)</span>
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {Array.from({length:item.maxScore+1},(_,v)=>(
                    <button key={v} className={`score-btn${scores[item.id]===v?" active":""}`} onClick={()=>setScore(item.id,v)} disabled={already}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}

        <div className="card" style={{marginBottom:16}}>
          <h3 style={{fontWeight:700,fontSize:14,marginBottom:10,color:"var(--P)"}}>💬 ข้อเสนอแนะ / ความคิดเห็น</h3>
          <textarea className="inp" rows={4} value={comments} onChange={e=>setComments(e.target.value)} disabled={already}
            placeholder="กรอกข้อเสนอแนะสำหรับครูผู้สอน เช่น จุดเด่น จุดที่ควรพัฒนา..."
            style={{resize:"vertical"}}/>
        </div>

        {!already&&<button onClick={submitEval} disabled={saving} className="btn bg" style={{width:"100%",padding:"13px",fontSize:15}}>
          {saving?"กำลังบันทึก...":"💾 ยืนยันส่งผลการประเมิน"}
        </button>}
        {already&&<div style={{textAlign:"center",padding:12,color:"#065F46",fontWeight:700,fontSize:14,background:"#D1FAE5",borderRadius:8}}>✅ ส่งผลการประเมินแล้ว (ไม่สามารถแก้ไขได้)</div>}
      </div>
    );
  }

  return(
    <div>
      <div style={{marginBottom:18}}>
        <h2 style={{fontWeight:800,fontSize:21,color:"var(--P)"}}>📝 แบบประเมินการนิเทศ</h2>
        <p style={{color:"var(--TS)",fontSize:13,marginTop:3}}>กรอกคะแนนรายด้านพร้อมข้อเสนอแนะ</p>
      </div>

      {pending.length>0&&(
        <div style={{marginBottom:24}}>
          <h3 style={{fontWeight:700,color:"#92400E",marginBottom:10,fontSize:15}}>⏳ รอการประเมิน ({pending.length})</h3>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {pending.map(b=>(
              <div key={b.id} className="card" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"14px 16px",borderLeft:"4px solid var(--A)"}}>
                <div>
                  <div style={{fontWeight:700,fontSize:15}}>{b.teacherName}</div>
                  <div style={{fontSize:12,color:"var(--TS)",marginTop:2}}>{b.subject} · {b.classRoom} · {fmtDate(b.date)} {b.time} น.</div>
                  <div style={{fontSize:11,color:"#9CA3AF",marginTop:4}}>👔 {b.adminName} · 👩‍🏫 {b.teacher1Name}, {b.teacher2Name}</div>
                </div>
                <button onClick={()=>openEval(b)} className="btn bp" style={{padding:"10px 18px",whiteSpace:"nowrap"}}>กรอกประเมิน →</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {done.length>0&&(
        <div>
          <h3 style={{fontWeight:700,color:"#065F46",marginBottom:10,fontSize:15}}>✅ ประเมินแล้ว ({done.length})</h3>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {done.map(b=>{
              const myEval=b.evals?.[currentUser.id];
              const res=calcOneEval(myEval,structure);
              return(
                <div key={b.id} className="card" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"12px 16px",opacity:.85}}>
                  <div>
                    <div style={{fontWeight:600,fontSize:14}}>{b.teacherName} — {b.subject}</div>
                    <div style={{fontSize:12,color:"var(--TS)"}}>{fmtDate(b.date)} {b.time} น.</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    {res&&<span style={{fontWeight:800,color:gradeOf(res.pct).color}}>{res.total}/{res.maxTotal} ({res.pct}%)</span>}
                    <button onClick={()=>openEval(b)} className="btn bx" style={{padding:"7px 12px",fontSize:12}}>ดูผล</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pending.length===0&&done.length===0&&(
        <div className="card" style={{textAlign:"center",padding:40,color:"#D1D5DB"}}>
          <div style={{fontSize:40,marginBottom:10}}>📋</div>
          <div>ไม่มีแบบประเมินที่ต้องกรอกในขณะนี้</div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
//  SCHEDULE SUMMARY
// ═══════════════════════════════════════════════
function ScheduleSummary({bookings,users}){
  const [viewDate,setViewDate]=useState(today());
  const [calY,setCalY]=useState(new Date().getFullYear());
  const [calM,setCalM]=useState(new Date().getMonth());
  const admins=users.filter(u=>u.role==="admin"&&u.approved);
  const dayBks=bookings.filter(b=>b.date===viewDate);
  const prevMon=()=>{if(calM===0){setCalY(y=>y-1);setCalM(11);}else setCalM(m=>m-1);};
  const nextMon=()=>{if(calM===11){setCalY(y=>y+1);setCalM(0);}else setCalM(m=>m+1);};
  const short=name=>name.replace("ผอ.","").replace("รองผอ.","").replace("หัวหน้าวิชาการ ","").replace("หน.กลุ่มสาระ ","").replace("ครู","").trim().split(" ")[0];

  return(
    <div>
      <div style={{marginBottom:18}}>
        <h2 style={{fontWeight:800,fontSize:21,color:"var(--P)"}}>
          <span className="rt-dot"/>ตารางนิเทศ Real-time
        </h2>
        <p style={{color:"var(--TS)",fontSize:13,marginTop:3}}>ข้อมูลอัปเดตทันทีเมื่อมีการจองใหม่</p>
      </div>
      <div className="g2" style={{alignItems:"start",marginBottom:20}}>
        <div className="card">
          <h4 style={{fontWeight:700,fontSize:14,marginBottom:12}}>เลือกวันที่</h4>
          <MiniCal year={calY} month={calM} onPrev={prevMon} onNext={nextMon}
            renderCell={(day,ds)=>{
              const hasBk=bookings.some(b=>b.date===ds),isSel=ds===viewDate;
              let bg="var(--W)",col="var(--T)",bc="var(--BD)";
              if(isSel){bg="var(--P)";col="#fff";bc="var(--P)";} else if(hasBk){bg="#EEF2FF";bc="#C7D2FE";}
              return <button key={ds} onClick={()=>setViewDate(ds)}
                style={{width:"100%",aspectRatio:"1",border:`1.5px solid ${bc}`,background:bg,color:col,borderRadius:6,cursor:"pointer",fontSize:12,fontFamily:"Sarabun,sans-serif",fontWeight:isSel?700:400,position:"relative",transition:"all .15s"}}>
                {day}{hasBk&&!isSel&&<div style={{position:"absolute",bottom:2,left:"50%",transform:"translateX(-50%)",width:4,height:4,borderRadius:"50%",background:"var(--P)"}}/>}
              </button>;
            }}/>
        </div>
        <div>
          <div className="card" style={{marginBottom:12,borderLeft:"4px solid var(--P)"}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>{fmtDate(viewDate)}</div>
            <div style={{fontSize:13,color:"var(--TS)"}}>มีการจอง <b style={{color:"var(--P)"}}>{dayBks.length}</b> รายการ</div>
          </div>
          {dayBks.length===0
            ?<div className="card" style={{textAlign:"center",color:"#D1D5DB",padding:24,fontSize:14}}>ไม่มีการจองในวันนี้</div>
            :<div style={{display:"flex",flexDirection:"column",gap:8}}>
              {[...dayBks].sort((a,b)=>a.time.localeCompare(b.time)).map(b=>(
                <div key={b.id} className="card" style={{padding:"12px 16px",borderLeft:"3px solid var(--A)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:14}}>{b.time} — {b.teacherName}</div>
                      <div style={{fontSize:12,color:"var(--TS)",marginTop:2}}>{b.subject} · {b.classRoom}</div>
                      <div style={{fontSize:11,color:"#9CA3AF",marginTop:4,lineHeight:1.7}}>👔 {b.adminName}<br/>👩‍🏫 {b.teacher1Name}, {b.teacher2Name}</div>
                    </div>
                    <span className={isFullyEval(b)?"badge-d":"badge-part"}>{isFullyEval(b)?"✅ ครบ":`⏳ ${submittedCount(b)}/${evalIds(b).length}`}</span>
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
      </div>

      <div className="card" style={{padding:0,overflow:"hidden",marginBottom:14}}>
        <div style={{background:"var(--P)",color:"#fff",padding:"12px 16px",fontWeight:700,fontSize:14}}>📊 ตารางผู้บริหาร — {fmtDate(viewDate)}</div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:400}}>
            <thead><tr style={{background:"#F8FAFF"}}>
              <th style={{padding:"9px 12px",textAlign:"left",fontWeight:700,color:"var(--TS)",borderBottom:"1px solid var(--BD)",width:65,fontSize:12}}>เวลา</th>
              {admins.map(a=><th key={a.id} style={{padding:"9px 8px",textAlign:"center",fontWeight:700,color:"var(--P)",borderBottom:"1px solid var(--BD)",fontSize:12,minWidth:100}}>{short(a.displayName)}</th>)}
            </tr></thead>
            <tbody>
              {TIME_SLOTS.map((t,ti)=>(
                <tr key={t} style={{background:ti%2?"#FAFAFA":"var(--W)"}}>
                  <td style={{padding:"7px 12px",fontWeight:600,color:"var(--TS)",borderBottom:"1px solid var(--BD)",fontSize:12,whiteSpace:"nowrap"}}>{t}</td>
                  {admins.map(a=>{
                    const bk=dayBks.find(b=>b.time===t&&(b.adminId===a.id||b.teacher1Id===a.id||b.teacher2Id===a.id));
                    return <td key={a.id} style={{padding:"5px 8px",textAlign:"center",borderBottom:"1px solid var(--BD)"}}>
                      {bk?<div style={{background:"#FEF3C7",border:"1px solid #FDE68A",borderRadius:6,padding:"4px 6px",fontSize:11,color:"#92400E",lineHeight:1.4}}>
                        <div style={{fontWeight:700}}>{short(bk.teacherName)}</div>
                        <div style={{fontSize:10,opacity:.8}}>{bk.subject}</div>
                      </div>:<span style={{color:"#D1D5DB"}}>—</span>}
                    </td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  BOOKING PAGE
// ═══════════════════════════════════════════════
function BookingPage({currentUser,users,bookings,blockedDates,onSave,onDelete}){
  const [step,setStep]=useState(1);
  const [subject,setSubject]=useState("");
  
  // 1. เพิ่ม State สำหรับแยกเก็บข้อมูล ระดับชั้น, ห้องเรียน, และสถานที่สอน
  const [grade, setGrade] = useState("");
  const [roomNum, setRoomNum] = useState("");
  const [physRoom, setPhysRoom] = useState("");

  const [adminId,setAdminId]=useState("");
  const [t1Id,setT1Id]=useState("");
  const [t2Id,setT2Id]=useState("");
  const [selDate,setSelDate]=useState("");
  const [selTime,setSelTime]=useState("");
  const [calY,setCalY]=useState(new Date().getFullYear());
  const [calM,setCalM]=useState(new Date().getMonth());
  const [msg,setMsg]=useState(null);
  const [saving,setSaving]=useState(false);

  const todayStr=today();
  const admins=users.filter(u=>u.role==="admin"&&u.approved);
  const teachers=users.filter(u=>u.role==="teacher"&&u.id!==currentUser.id&&u.approved);
  const blockedTimesFor=date=>TIME_SLOTS.filter(t=>
    bookings.some(b=>b.teacherId===currentUser.id&&b.date===date&&b.time===t)||
    userBusy(adminId,date,t,bookings)||userBusy(t1Id,date,t,bookings)||userBusy(t2Id,date,t,bookings)
  );

  // 2. ตรวจสอบว่ากรอกข้อมูลครบถ้วนก่อนให้กดปุ่ม 'ถัดไป' (บังคับเลือกชั้น, ห้อง, และกรอกสถานที่สอน)
  const canStep2=subject.trim()&&grade&&roomNum&&physRoom.trim()&&adminId&&t1Id&&t2Id&&t1Id!==t2Id;
  
  const pickT=tid=>{
    if(t1Id===tid){setT1Id(t2Id);setT2Id("");return;}
    if(t2Id===tid){setT2Id("");return;}
    if(!t1Id){setT1Id(tid);return;}
    if(!t2Id){setT2Id(tid);return;}
  };

  const submit=async()=>{
    if(!selDate||!selTime){setMsg({t:"e",s:"กรุณาเลือกวันที่และเวลา"});return;}
    setSaving(true);
    try {
      const au=users.find(u=>u.id===adminId),t1u=users.find(u=>u.id===t1Id),t2u=users.find(u=>u.id===t2Id);
      
      // 3. รวมค่าให้เป็นรูปแบบเดียว เช่น "ม.3/1 (ห้อง 324)" ก่อนบันทึก
      const fullClassRoom = `${grade}/${roomNum} (ห้อง ${physRoom.trim()})`;

      const nb={
        id:uid(),teacherId:currentUser.id,teacherName:currentUser.displayName,teacherEmail:currentUser.email,
        subject:subject.trim(),
        classRoom:fullClassRoom,
        adminId,adminName:au?.displayName||"",teacher1Id:t1Id,teacher1Name:t1u?.displayName||"",
        teacher2Id:t2Id,teacher2Name:t2u?.displayName||"",
        date:selDate,time:selTime,evals:{},createdAt:new Date().toISOString()
      };
      await onSave(nb);
      setMsg({t:"s",s:`✅ จองสำเร็จ! ${fmtDate(selDate)} ${selTime} น.`});
      
      // เคลียร์ค่าฟอร์มทั้งหมดหลังจากบันทึกเสร็จ
      setSubject("");setGrade("");setRoomNum("");setPhysRoom("");
      setAdminId("");setT1Id("");setT2Id("");setSelDate("");setSelTime("");setStep(1);
      setTimeout(()=>setMsg(null),7000);
    } catch(e){setMsg({t:"e",s:"เกิดข้อผิดพลาด กรุณาลองใหม่"});}
    setSaving(false);
  };
  
  const prevMon=()=>{if(calM===0){setCalY(y=>y-1);setCalM(11);}else setCalM(m=>m-1);};
  const nextMon=()=>{if(calM===11){setCalY(y=>y+1);setCalM(0);}else setCalM(m=>m+1);};

  // ดึงรายการจองของฉันที่ยังประเมินไม่เสร็จ
  const myBookings = bookings.filter(b => b.teacherId === currentUser.id && !isFullyEval(b));

  return(
    <div>
      <div style={{marginBottom:20}}>
        <h2 style={{fontWeight:800,fontSize:21,color:"var(--P)"}}>📅 จองเวลารับการนิเทศ</h2>
        <p style={{color:"var(--TS)",fontSize:13,marginTop:3}}>สวัสดี <b>{currentUser.displayName}</b> — เลือกกรรมการ 3 ท่าน และระบุวันเวลา</p>
      </div>
      {msg&&<div style={{padding:"12px 16px",borderRadius:9,marginBottom:18,fontWeight:600,fontSize:14,background:msg.t==="s"?"#D1FAE5":"#FEE2E2",color:msg.t==="s"?"#065F46":"#991B1B",border:`1.5px solid ${msg.t==="s"?"#A7F3D0":"#FECACA"}`}}>{msg.s}</div>}
      
      {step===1&&<div className="card">
        <div className="frow" style={{marginBottom:10}}>
          <label className="flbl">รายวิชา *</label>
          <input className="inp" value={subject} onChange={e=>setSubject(e.target.value)} placeholder="เช่น คณิตศาสตร์พื้นฐาน"/>
        </div>
        
        {/* 4. ปรับเปลี่ยน Layout ของฟอร์มกรอกชั้น/ห้อง ให้เป็นแบบ Dropdown 3 คอลัมน์ */}
        <div className="g3" style={{marginBottom:16}}>
          <div className="frow">
             <label className="flbl">ระดับชั้น *</label>
             <select className="inp" value={grade} onChange={e=>setGrade(e.target.value)}>
                <option value="">- เลือกระดับชั้น -</option>
                {[1,2,3,4,5,6].map(m=><option key={m} value={`ม.${m}`}>ม.{m}</option>)}
             </select>
          </div>
          <div className="frow">
             <label className="flbl">ห้องเรียน *</label>
             <select className="inp" value={roomNum} onChange={e=>setRoomNum(e.target.value)} disabled={!grade}>
                <option value="">- เลือกห้อง -</option>
                {[1,2,3,4,5,6,7,8,9].map(r=><option key={r} value={r}>/{r}</option>)}
             </select>
          </div>
          <div className="frow">
             <label className="flbl">ห้องที่สอน (สถานที่) *</label>
             <input className="inp" value={physRoom} onChange={e=>setPhysRoom(e.target.value)} placeholder="เช่น 324, อาคาร 4"/>
          </div>
        </div>

        <div style={{background:"#EEF2FF",borderRadius:10,padding:"14px 16px",marginBottom:12}}>
          <div style={{fontWeight:700,color:"var(--P)",marginBottom:10,fontSize:14}}>① ผู้บริหารที่นิเทศ (1 คน)</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(185px,1fr))",gap:7}}>
            {admins.map(a=>{const active=adminId===a.id;return <button key={a.id} onClick={()=>setAdminId(a.id===adminId?"":a.id)}
              style={{padding:"10px 12px",borderRadius:8,border:`2px solid ${active?"var(--P)":"#C7D2FE"}`,background:active?"var(--P)":"var(--W)",color:active?"#fff":"var(--T)",cursor:"pointer",fontFamily:"Sarabun,sans-serif",textAlign:"left",transition:"all .15s"}}>
              <div style={{fontWeight:600,fontSize:13}}>{active&&"✓ "}{a.displayName}</div>
            </button>;})}
          </div>
        </div>
        <div style={{background:"#F0FDF4",borderRadius:10,padding:"14px 16px",marginBottom:18}}>
          <div style={{fontWeight:700,color:"#166634",marginBottom:10,fontSize:14}}>② ครูกรรมการ (2 คน) {t1Id&&t2Id&&<span style={{fontWeight:500,fontSize:12,color:"#16A34A"}}>— เลือกครบแล้ว ✓</span>}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(185px,1fr))",gap:7}}>
            {teachers.map(t=>{const sn=t1Id===t.id?1:t2Id===t.id?2:0,active=sn>0,full=!active&&t1Id&&t2Id;
              return <button key={t.id} disabled={!!full} onClick={()=>pickT(t.id)}
                style={{padding:"10px 12px",borderRadius:8,border:`2px solid ${active?"var(--G)":"#BBF7D0"}`,background:active?"var(--G)":"var(--W)",color:active?"#fff":"var(--T)",cursor:full?"not-allowed":"pointer",fontFamily:"Sarabun,sans-serif",textAlign:"left",opacity:full?.4:1}}>
                <div style={{fontWeight:600,fontSize:13}}>{active&&`[${sn}] `}{t.displayName}</div>
              </button>;})}
          </div>
        </div>
        <button onClick={()=>setStep(2)} disabled={!canStep2} className="btn bp" style={{width:"100%",padding:"12px",fontSize:15}}>ถัดไป: เลือกวันที่และเวลา →</button>
      </div>}
      
      {step===2&&<div className="g2" style={{alignItems:"start"}}>
        <div className="card">
          <h3 style={{fontWeight:700,fontSize:15,marginBottom:10}}>เลือกวันที่</h3>
          <MiniCal year={calY} month={calM} onPrev={prevMon} onNext={nextMon}
            renderCell={(day,ds)=>{
              const isPast=ds<todayStr,isBlk=blockedDates.includes(ds),isSel=ds===selDate;
              let bg="var(--W)",col="var(--T)",bc="var(--BD)";
              if(isSel){bg="var(--P)";col="#fff";bc="var(--P)";} else if(isBlk){bg="#FEE2E2";col="#FECACA";bc="#FECACA";} else if(isPast){bg="#F9FAFB";col:"#D1D5DB";bc="#F3F4F6";}
              return <button key={ds} onClick={()=>{if(!isPast&&!isBlk){setSelDate(ds);setSelTime("");}}} disabled={isPast||isBlk}
                style={{width:"100%",aspectRatio:"1",border:`1.5px solid ${bc}`,background:bg,color:col,borderRadius:6,cursor:(isPast||isBlk)?"not-allowed":"pointer",fontSize:12,fontFamily:"Sarabun,sans-serif",fontWeight:isSel?700:400}}>{day}</button>;
            }}/>
        </div>
        <div className="card">
          <h3 style={{fontWeight:700,fontSize:15,marginBottom:8}}>เลือกเวลา</h3>
          {!selDate?<p style={{color:"#D1D5DB",fontSize:14,marginTop:8}}>← กรุณาเลือกวันที่ก่อน</p>:(<>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
              {TIME_SLOTS.map(t=>{const blocked=blockedTimesFor(selDate).includes(t),isSel=selTime===t;
                return <button key={t} disabled={blocked} onClick={()=>setSelTime(t)}
                  style={{padding:"10px 2px",borderRadius:8,border:"1.5px solid",fontSize:13,fontFamily:"Sarabun,sans-serif",fontWeight:isSel?700:400,cursor:blocked?"not-allowed":"pointer",
                    borderColor:isSel?"var(--P)":blocked?"#FECACA":"var(--BD)",background:isSel?"var(--P)":blocked?"#FEF2F2":"var(--W)",color:isSel?"#fff":blocked?"#FECACA":"var(--T)"}}>{t}</button>;})}
            </div>
          </>)}
          {selDate&&selTime&&<button onClick={submit} disabled={saving} className="btn bg" style={{width:"100%",padding:"13px",fontSize:15,marginTop:16}}>📌 ยืนยันการจอง</button>}
          <button onClick={()=>setStep(1)} className="btn bx" style={{width:"100%",marginTop:8,fontSize:13}}>← กลับแก้ไข</button>
        </div>
      </div>}

      {/* ส่วนแสดงรายการจองของฉันที่ยังรอการนิเทศ */}
      <div className="card" style={{marginTop:24}}>
        <h3 style={{fontWeight:700,fontSize:16,color:"var(--P)",marginBottom:12}}>📌 รายการจองของคุณ (เพื่อกันลืม)</h3>
        {myBookings.length === 0 ? (
           <p style={{color:"var(--TS)",fontSize:13}}>คุณยังไม่มีรายการจองที่รอการนิเทศ</p>
        ) : (
           <div style={{display:"flex",flexDirection:"column",gap:8}}>
             {myBookings.map(b => (
                <div key={b.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",background:"#F9FAFB",borderRadius:8,borderLeft:"4px solid var(--A)",flexWrap:"wrap"}}>
                   <div>
                     <div style={{fontWeight:700,fontSize:14,color:"var(--P)"}}>{fmtDate(b.date)} — เวลา {b.time} น.</div>
                     <div style={{fontSize:13,color:"var(--T)",marginTop:4}}>{b.subject} ({b.classRoom})</div>
                     <div style={{fontSize:12,color:"#6B7280",marginTop:4}}>กรรมการ: {b.adminName}, {b.teacher1Name}, {b.teacher2Name}</div>
                   </div>
                   {onDelete && (
                     <button onClick={() => {
                        if(window.confirm("คุณต้องการยกเลิกและลบรายการจองนี้ใช่หรือไม่?")) {
                           onDelete(b.id);
                        }
                     }} className="btn br" style={{padding:"8px 12px",fontSize:12,marginTop:8}}>🗑️ ลบและจองใหม่</button>
                   )}
                </div>
             ))}
           </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  SUMMARY + PDF EXPORT
// ═══════════════════════════════════════════════
function SummaryPage({currentUser,bookings,structure,users,settings}){
  const visible = currentUser.role==="teacher"
    ? bookings.filter(b=>b.teacherId===currentUser.id)
    : bookings;
  const sorted=[...visible].sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
  const [detail, setDetail] = useState(null);
  const printRef = useRef();

  const printReport = (b) => {
    const sc = calcAvgScore(b,structure);
    const win = window.open("","_blank");
    const evalRows = evalIds(b).map(eid=>{
      const ev=b.evals?.[eid];
      const u=users.find(u=>u.id===eid);
      const res=calcOneEval(ev,structure);
      return `<tr><td>${u?.displayName||eid}</td><td>${ROLES[u?.role]||""}</td><td>${res?res.total+"/"+res.maxTotal:"—"}</td><td>${res?res.pct+"%":"—"}</td><td>${ev?.comments||"—"}</td></tr>`;
    }).join("");
    const dimRows = sc ? sc.dims.map(d=>`<tr><td>${d.name}</td><td>${d.score}/${d.max}</td><td>${Math.round(d.score/d.max*100)}%</td></tr>`).join("") : "";

    win.document.write(`
      <!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <title>รายงานการนิเทศ - ${b.teacherName}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');
        body{font-family:'Sarabun',sans-serif;padding:30px 40px;color:#1F2937;font-size:13pt;}
        h1{font-size:18pt;color:#1E3A8A;margin-bottom:4px;}
        h2{font-size:14pt;color:#1E3A8A;margin:20px 0 8px;border-bottom:2px solid #1E3A8A;padding-bottom:4px;}
        h3{font-size:12pt;color:#374151;margin:16px 0 6px;}
        table{width:100%;border-collapse:collapse;margin-bottom:14px;}
        th{background:#1E3A8A;color:white;padding:8px 12px;text-align:left;font-size:12pt;}
        td{padding:7px 12px;border-bottom:1px solid #E5E7EB;font-size:12pt;}
        tr:nth-child(even) td{background:#F8FAFF;}
        .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;}
        .info-item{background:#F1F5F9;padding:8px 14px;border-radius:6px;}
        .info-label{font-size:10pt;color:#6B7280;}
        .info-value{font-weight:700;font-size:13pt;}
        .score-box{background:#EEF2FF;border:2px solid #1E3A8A;border-radius:10px;padding:16px;text-align:center;margin-bottom:20px;}
        .big-score{font-size:40pt;font-weight:800;color:#1E3A8A;}
        .grade{display:inline-block;padding:4px 16px;border-radius:20px;font-weight:700;font-size:13pt;}
        .footer{margin-top:40px;font-size:10pt;color:#9CA3AF;text-align:center;border-top:1px solid #E5E7EB;padding-top:12px;}
      </style>
      </head><body>
      <h1>📋 รายงานผลการนิเทศการสอน</h1>
      <p style="color:#6B7280;margin-bottom:20px;">${settings.schoolName} · พิมพ์วันที่ ${new Date().toLocaleDateString("th-TH",{year:"numeric",month:"long",day:"numeric"})}</p>
      
      <div class="info-grid">
        <div class="info-item"><div class="info-label">ชื่อ-สกุลครู</div><div class="info-value">${b.teacherName}</div></div>
        <div class="info-item"><div class="info-label">รายวิชา</div><div class="info-value">${b.subject}</div></div>
        <div class="info-item"><div class="info-label">ระดับชั้น/ห้อง</div><div class="info-value">${b.classRoom}</div></div>
        <div class="info-item"><div class="info-label">วันที่/เวลา</div><div class="info-value">${fmtDate(b.date)} เวลา ${b.time} น.</div></div>
        <div class="info-item"><div class="info-label">ผู้บริหาร</div><div class="info-value">${b.adminName}</div></div>
        <div class="info-item"><div class="info-label">ครูกรรมการ</div><div class="info-value">${b.teacher1Name}, ${b.teacher2Name}</div></div>
      </div>

      ${sc?`
      <div class="score-box">
        <div class="big-score">${sc.avgPct}%</div>
        <div style="font-size:16pt;margin:4px 0;">${sc.avgTotal}/${sc.maxTotal} คะแนน</div>
        <span class="grade" style="background:${gradeOf(sc.avgPct).bg};color:${gradeOf(sc.avgPct).color};">${gradeOf(sc.avgPct).label}</span>
        <div style="font-size:11pt;color:#6B7280;margin-top:8px;">เฉลี่ยจาก ${sc.count} คนที่ประเมิน</div>
      </div>
      `:""}

      <h2>ผลการประเมินรายด้าน</h2>
      <table>
        <thead><tr><th>ด้านการประเมิน</th><th>คะแนนเฉลี่ย</th><th>ร้อยละ</th></tr></thead>
        <tbody>${dimRows}</tbody>
      </table>

      <h2>ผลการประเมินรายกรรมการ</h2>
      <table>
        <thead><tr><th>ชื่อ-สกุล</th><th>ตำแหน่ง</th><th>คะแนน</th><th>ร้อยละ</th><th>ข้อเสนอแนะ</th></tr></thead>
        <tbody>${evalRows}</tbody>
      </table>

      <div class="footer">${settings.schoolName} · ระบบนิเทศการสอน · พิมพ์อัตโนมัติ</div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(()=>{win.print();},800);
  };

  return(
    <div>
      <div style={{marginBottom:18}}>
        <h2 style={{fontWeight:800,fontSize:21,color:"var(--P)"}}>{currentUser.role==="teacher"?"📊 ผลการนิเทศของฉัน":"📊 สรุปผลการนิเทศทั้งหมด"}</h2>
        <p style={{color:"var(--TS)",fontSize:13,marginTop:3}}>ทั้งหมด {sorted.length} รายการ | ประเมินครบ {sorted.filter(isFullyEval).length} รายการ</p>
      </div>
      <div className="card" style={{padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{background:"var(--P)",color:"#fff"}}>
              {["#","ชื่อ-สกุล","วิชา","ชั้น","วันที่","เวลา","สถานะ","คะแนน",""].map((h,i)=>(
                <th key={i} style={{padding:"10px",textAlign:"left",whiteSpace:"nowrap",fontWeight:700}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {sorted.length===0&&<tr><td colSpan={9} style={{padding:36,textAlign:"center",color:"#D1D5DB"}}>ไม่มีข้อมูล</td></tr>}
              {sorted.map((b,idx)=>{const sc=calcAvgScore(b,structure);return(
                <tr key={b.id} style={{background:idx%2?"#F9FAFB":"var(--W)",borderBottom:"1px solid var(--BD)"}}>
                  <td style={{padding:"9px 10px"}}>{idx+1}</td>
                  <td style={{padding:"9px 10px",fontWeight:600,whiteSpace:"nowrap"}}>{b.teacherName}</td>
                  <td style={{padding:"9px 10px"}}>{b.subject}</td>
                  <td style={{padding:"9px 10px"}}>{b.classRoom}</td>
                  <td style={{padding:"9px 10px",whiteSpace:"nowrap"}}>{fmtDate(b.date)}</td>
                  <td style={{padding:"9px 10px"}}>{b.time}</td>
                  <td style={{padding:"9px 10px"}}>{isFullyEval(b)?<span className="badge-d">✅ ครบ</span>:<span className="badge-part">⏳ {submittedCount(b)}/{evalIds(b).length}</span>}</td>
                  <td style={{padding:"9px 10px"}}>{sc?<span style={{fontWeight:700,color:gradeOf(sc.avgPct).color}}>{sc.avgTotal}/{sc.maxTotal} ({sc.avgPct}%)</span>:<span style={{color:"#D1D5DB"}}>—</span>}</td>
                  <td style={{padding:"9px 10px"}}>
                    {isFullyEval(b)&&<button onClick={()=>printReport(b)} className="btn bo" style={{padding:"5px 10px",fontSize:11,gap:3}}>🖨️ พิมพ์</button>}
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  SETTINGS PAGE (sysadmin)
// ═══════════════════════════════════════════════
function SettingsPage({settings,structure,blockedDates,onSaveSettings,onSaveStructure,onSaveBlocked}){
  const [tab, setTab] = useState("general");
  const [sName, setSName] = useState(settings.schoolName||"");
  const [sDomain, setSDomain] = useState(settings.domain||DEFAULT_DOMAIN);
  const [sLogo, setSLogo] = useState(settings.logo||"");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // โหลดโครงสร้างจาก Props มาทำเป็น State ภายในเพื่อรองรับการแก้ไข (เพิ่ม/ลบ)
  const [str, setStr] = useState(JSON.parse(JSON.stringify(structure)));
  const [strSaving, setStrSaving] = useState(false);
  const [strMsg, setStrMsg] = useState("");

  // Blocked dates
  const [bdCalY, setBDCalY] = useState(new Date().getFullYear());
  const [bdCalM, setBDCalM] = useState(new Date().getMonth());
  const [blocked, setBlocked] = useState([...blockedDates]);
  const [bdSaving, setBdSaving] = useState(false);

  const saveGeneral = async () => {
    setSaving(true);
    await onSaveSettings({schoolName:sName.trim(),domain:sDomain.trim(),logo:sLogo.trim()||null});
    setMsg("✅ บันทึกการตั้งค่าเรียบร้อยแล้ว");
    setTimeout(()=>setMsg(""),3000);
    setSaving(false);
  };

  // ฟังก์ชันเพิ่มรายการประเมินย่อยในหมวดนั้น ๆ
  const addDomain = (dim_id) => {
    setStr(prev=>prev.map(d=>d.id===dim_id?{...d,items:[...d.items,{id:"di_"+uid(),name:"รายการประเมินใหม่",maxScore:5}]}:d));
  };

  // ฟังก์ชันเพิ่มหมวดหมู่หลักอันใหม่
  const addDomain2 = () => {
    setStr(prev=>[...prev,{id:"ds_"+uid(),name:"หมวดใหม่",items:[{id:"di_"+uid(),name:"รายการประเมินเริ่มต้น",maxScore:5}]}]);
  };

  // ฟังก์ชันอัปเดตข้อมูลข้อความหรือคะแนนในรายการย่อย
  const updateItem = (did,iid,field,val) => {
    setStr(prev=>prev.map(d=>d.id===did?{...d,items:d.items.map(i=>i.id===iid?{...i,[field]:val}:i)}:d));
  };

  // ฟังก์ชันลบรายการประเมินย่อย
  const removeItem = (did,iid) => {
    setStr(prev=>prev.map(d=>d.id===did?{...d,items:d.items.filter(i=>i.id!==iid)}:d));
  };

  // ฟังก์ชันแก้ไขชื่อหมวดหมู่หลัก
  const updateDomain = (did,val) => {
    setStr(prev=>prev.map(d=>d.id===did?{...d,name:val}:d));
  };

  // ฟังก์ชันลบหมวดหมู่หลัก (ลบทั้งยวด)
  const removeDomain = (did) => {
    if(!confirm("คุณต้องการลบหมวดหมู่นี้และรายการย่อยทั้งหมดใช่หรือไม่?")) return;
    setStr(prev=>prev.filter(d=>d.id!==did));
  };

  // ฟังก์ชันบันทึกโครงสร้างทั้งหมดลง Firebase Firestore
  const saveStructure = async () => {
    setStrSaving(true);
    await onSaveStructure(str);
    setStrMsg("✅ บันทึกโครงสร้างการประเมินลงฐานข้อมูลเรียบร้อยแล้ว");
    setTimeout(()=>setStrMsg(""),3000);
    setStrSaving(false);
  };

  const toggleBlocked = (ds) => {
    setBlocked(prev=>prev.includes(ds)?prev.filter(d=>d!==ds):[...prev,ds]);
  };
  const saveBlocked = async () => {
    setBdSaving(true);
    await onSaveBlocked(blocked);
    setBdSaving(false);
  };

  return(
    <div>
      <div style={{marginBottom:18}}>
        <h2 style={{fontWeight:800,fontSize:21,color:"var(--P)"}}>⚙️ ตั้งค่าระบบ</h2>
      </div>

      <div style={{display:"flex",gap:0,borderBottom:"2px solid var(--BD)",marginBottom:20}}>
        {[["general","🏫 ทั่วไป"],["structure","📋 โครงสร้างการประเมิน"],["blocked","🗓️ วันหยุด/ปิดทำการ"]].map(([k,lb])=>(
          <button key={k} className={`tab-btn${tab===k?" active":""}`} onClick={()=>setTab(k)}>{lb}</button>
        ))}
      </div>

      {tab==="general"&&(
        <div className="card" style={{maxWidth:540}}>
          <h3 style={{fontWeight:700,color:"var(--P)",fontSize:16,marginBottom:18}}>ข้อมูลโรงเรียน</h3>
          <div className="frow">
            <label className="flbl">ชื่อโรงเรียน</label>
            <input className="inp" value={sName} onChange={e=>setSName(e.target.value)} placeholder="เช่น โรงเรียนบ้านหมี่วิทยา"/>
          </div>
          <div className="frow">
            <label className="flbl">Domain อีเมล (@...)</label>
            <input className="inp" value={sDomain} onChange={e=>setSDomain(e.target.value)} placeholder="เช่น banmi.ac.th"/>
          </div>
          <div className="frow">
            <label className="flbl">URL โลโก้ (ไม่บังคับ)</label>
            <input className="inp" value={sLogo} onChange={e=>setSLogo(e.target.value)} placeholder="https://..."/>
          </div>
          {sLogo&&<div style={{marginBottom:14}}><img src={sLogo} style={{width:80,height:80,borderRadius:12,objectFit:"cover",border:"2px solid var(--BD)"}} onError={e=>{e.target.style.display="none";}}/></div>}
          {msg&&<div style={{color:"var(--G)",fontWeight:700,fontSize:13,marginBottom:10}}>{msg}</div>}
          <button onClick={saveGeneral} disabled={saving} className="btn bp">💾 {saving?"กำลังบันทึก...":"บันทึกการตั้งค่า"}</button>
        </div>
      )}

      {tab==="structure"&&(
        <div>
          <p style={{color:"var(--TS)",fontSize:13,marginBottom:16}}>แก้ไขหัวข้อและคะแนนเต็มของแบบประเมินนิเทศการสอน (จัดการโดย sysadmin)</p>
          {str.map((d,di)=>(
            <div key={d.id} className="card" style={{marginBottom:14,borderLeft:"4px solid var(--P)"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                <input className="inp" value={d.name} onChange={e=>updateDomain(d.id,e.target.value)} style={{fontWeight:700,fontSize:15,flex:1}} placeholder="ชื่อหมวดหมู่หลัก"/>
                <button onClick={()=>removeDomain(d.id)} className="btn br" style={{padding:"7px 10px",fontSize:12}}>🗑️ ลบหมวด</button>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {d.items.map((item,ii)=>(
                  <div key={item.id} style={{display:"flex",gap:8,alignItems:"center",background:"#F9FAFB",borderRadius:8,padding:"8px 12px"}}>
                    <span style={{color:"var(--TS)",fontSize:12,minWidth:20}}>{ii+1}.</span>
                    <input className="inp" value={item.name} onChange={e=>updateItem(d.id,item.id,"name",e.target.value)} style={{flex:1}} placeholder="รายละเอียดเกณฑ์การประเมิน"/>
                    <div style={{display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap"}}>
                      <span style={{fontSize:12,color:"var(--TS)"}}>คะแนนเต็ม</span>
                      <input className="inp" type="number" min="1" max="100" value={item.maxScore} onChange={e=>updateItem(d.id,item.id,"maxScore",parseInt(e.target.value)||1)} style={{width:60,textAlign:"center"}}/>
                    </div>
                    <button onClick={()=>removeItem(d.id,item.id)} className="btn br" style={{padding:"6px 8px",fontSize:11}}>✕</button>
                  </div>
                ))}
              </div>
              <button onClick={()=>addDomain(d.id)} className="btn bx" style={{marginTop:10,fontSize:12}}>➕ เพิ่มรายการประเมินย่อย</button>
            </div>
          ))}
          <button onClick={addDomain2} className="btn bx" style={{marginBottom:16, width:"100%", padding:"12px", border:"2px dashed #C7D2FE"}}>➕ เพิ่มหมวดหมู่หลักใหม่</button>
          {strMsg&&<div style={{color:"var(--G)",fontWeight:700,fontSize:13,marginBottom:10}}>{strMsg}</div>}
          <button onClick={saveStructure} disabled={strSaving} className="btn bg" style={{display:"block", width:"100%", padding:"12px", fontSize:15}}>💾 {strSaving?"กำลังบันทึก...":"บันทึกโครงสร้างเกณฑ์ประเมินทั้งหมด"}</button>
        </div>
      )}

      {tab==="blocked"&&(
        <div>
          <p style={{color:"var(--TS)",fontSize:13,marginBottom:16}}>เลือกวันที่ไม่เปิดรับการจอง (วันหยุด, ปิดทำการ)</p>
          <div className="g2" style={{alignItems:"start"}}>
            <div className="card">
              <MiniCal year={bdCalY} month={bdCalM}
                onPrev={()=>{if(bdCalM===0){setBDCalY(y=>y-1);setBDCalM(11);}else setBDCalM(m=>m-1);}}
                onNext={()=>{if(bdCalM===11){setBDCalY(y=>y+1);setBDCalM(0);}else setBDCalM(m=>m+1);}}
                renderCell={(day,ds)=>{
                  const isBlk=blocked.includes(ds);
                  return <button key={ds} onClick={()=>toggleBlocked(ds)}
                    style={{width:"100%",aspectRatio:"1",border:`1.5px solid ${isBlk?"#EF4444":"var(--BD)"}`,background:isBlk?"#FEE2E2":"var(--W)",color:isBlk?"#991B1B":"var(--T)",borderRadius:6,cursor:"pointer",fontSize:12,fontFamily:"Sarabun,sans-serif",fontWeight:isBlk?700:400}}>{day}</button>;
                }}/>
            </div>
            <div className="card">
              <h4 style={{fontWeight:700,fontSize:14,marginBottom:10,color:"var(--R)"}}>🚫 วันที่ปิดทำการ ({blocked.length})</h4>
              {blocked.length===0?<p style={{color:"#D1D5DB",fontSize:13}}>ยังไม่มีวันที่กำหนด</p>:(
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {[...blocked].sort().map(d=>(
                    <div key={d} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#FEE2E2",borderRadius:6,padding:"8px 12px"}}>
                      <span style={{fontWeight:600,color:"#991B1B",fontSize:13}}>{fmtDate(d)}</span>
                      <button onClick={()=>toggleBlocked(d)} style={{background:"none",border:"none",cursor:"pointer",color:"#EF4444",fontSize:16}}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={saveBlocked} disabled={bdSaving} className="btn br" style={{marginTop:14,width:"100%"}}>
                {bdSaving?"กำลังบันทึก...":"💾 บันทึกวันหยุด"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
//  PROFILE TAB
// ═══════════════════════════════════════════════
function ProfileTab({currentUser}){
  const [displayName, setDisplayName] = useState(currentUser.displayName||"");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const saveProfile = async () => {
    if(!displayName.trim()) return;
    setSaving(true);
    try {
      await updateDoc(userRef(currentUser.id), { displayName: displayName.trim() });
      setMsg("✅ อัปเดตข้อมูลเรียบร้อยแล้ว");
      setTimeout(()=>setMsg(""),3000);
    } catch(e){ console.error(e); }
    setSaving(false);
  };

  return(
    <div className="card" style={{maxWidth:500}}>
      <h3 style={{fontWeight:700,color:"var(--P)",marginBottom:18,fontSize:16}}>👤 ข้อมูลส่วนตัว</h3>
      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20,padding:"14px 16px",background:"var(--PL)",borderRadius:8}}>
        <div style={{width:52,height:52,borderRadius:"50%",background:ROLE_COLOR[currentUser.role],display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:20,fontWeight:700}}>
          {currentUser.displayName?.slice(0,1)||"?"}
        </div>
        <div>
          <div style={{fontWeight:700,fontSize:16}}>{currentUser.displayName}</div>
          <div style={{fontSize:13,color:"var(--TS)"}}>{ROLES[currentUser.role]} · {currentUser.email}</div>
        </div>
      </div>
      <div className="frow">
        <label className="flbl">อีเมล (ไม่สามารถแก้ไขได้)</label>
        <input className="inp" value={currentUser.email} disabled style={{background:"#F3F4F6",color:"#9CA3AF"}}/>
      </div>
      <div className="frow">
        <label className="flbl">ชื่อ-นามสกุล</label>
        <input className="inp" value={displayName} onChange={e=>setDisplayName(e.target.value)}/>
      </div>
      {msg&&<div style={{color:"var(--G)",fontWeight:700,fontSize:13,marginBottom:10}}>{msg}</div>}
      <button onClick={saveProfile} disabled={saving} className="btn bp">💾 {saving?"กำลังบันทึก...":"บันทึกข้อมูล"}</button>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  USERS TAB
// ═══════════════════════════════════════════════
function UsersTab({users}){
  const updateStatus = async (id,status) => await updateDoc(userRef(id),{approved:status});
  const updateRole   = async (id,role)   => await updateDoc(userRef(id),{role});
  const removeUser   = async (id)        => { if(confirm("ยืนยันการลบผู้ใช้งานรายนี้?")) await deleteDoc(userRef(id)); };

  const pending = users.filter(u=>!u.approved&&u.role!=="sysadmin");
  const active  = users.filter(u=>u.approved||u.role==="sysadmin");

  return(
    <div>
      <h3 style={{fontWeight:700,color:"var(--P)",fontSize:16,marginBottom:14}}>👥 จัดการผู้ใช้งานระบบ</h3>
      {pending.length>0&&(
        <div style={{marginBottom:24}}>
          <h4 style={{fontWeight:700,color:"var(--A)",marginBottom:8,fontSize:14}}>⏳ รอการอนุมัติ ({pending.length})</h4>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {pending.map(u=>(
              <div key={u.id} className="card" style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderLeft:"4px solid var(--A)"}}>
                <div style={{flex:1}}><div style={{fontWeight:700}}>{u.displayName}</div><div style={{fontSize:12,color:"var(--TS)"}}>{u.email}</div></div>
                <button onClick={()=>updateStatus(u.id,true)} className="btn bg" style={{padding:"6px 12px"}}>อนุมัติ</button>
                <button onClick={()=>removeUser(u.id)} className="btn br" style={{padding:"6px 12px"}}>ลบ</button>
              </div>
            ))}
          </div>
        </div>
      )}
      {[["👔 ผู้บริหาร",active.filter(u=>u.role==="admin"),"admin"],["👩‍🏫 ครูผู้สอน",active.filter(u=>u.role==="teacher"),"teacher"],["🔧 ผู้ดูแลระบบ",active.filter(u=>u.role==="sysadmin"),"sysadmin"]].map(([title,grp,role])=>(
        <div key={role} style={{marginBottom:16}}>
          <h4 style={{fontWeight:700,color:ROLE_COLOR[role],marginBottom:8,fontSize:14}}>{title} ({grp.length})</h4>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {grp.map(u=>(
              <div key={u.id} style={{display:"flex",alignItems:"center",gap:10,background:"var(--W)",borderRadius:9,padding:"9px 14px",border:"1px solid var(--BD)",flexWrap:"wrap"}}>
                <div style={{width:36,height:36,borderRadius:"50%",background:ROLE_COLOR[u.role],display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:14,fontWeight:700}}>{u.displayName?.slice(0,1)||"?"}</div>
                <div style={{flex:1,minWidth:100}}>
                  <div style={{fontWeight:600,fontSize:14}}>{u.displayName}</div>
                  <div style={{fontSize:12,color:"var(--TS)"}}>{u.email}</div>
                </div>
                {u.id!=="u_sa1"&&(<select className="inp" value={u.role} onChange={e=>updateRole(u.id,e.target.value)} style={{width:130,padding:"6px",fontSize:13}}>
                  <option value="teacher">ครูผู้สอน</option>
                  <option value="admin">ผู้บริหาร</option>
                  <option value="sysadmin">ผู้ดูแลระบบ</option>
                </select>)}
                {u.id!=="u_sa1"&&<button onClick={()=>removeUser(u.id)} className="btn br" style={{padding:"6px 10px",fontSize:12}}>ลบ</button>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════
//  ROOT APP
// ═══════════════════════════════════════════════
export default function App() {
  const [loaded,       setLoaded      ] = useState(false);
  const [currentUser,  setCurrentUser ] = useState(null);
  const [page,         setPage        ] = useState("");
  const [settings,     setSettings    ] = useState(DEF_SETTINGS);
  const [structure,    setStructure   ] = useState(DEF_STRUCTURE);
  const [bookings,     setBookings    ] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [users,        setUsers       ] = useState([]);

  useEffect(()=>{
    (async()=>{
      try {
        const [s,st,bd] = await Promise.all([fsGet("settings"),fsGet("structure"),fsGet("blockedDates")]);
        if(s)  setSettings(s);
        if(st) setStructure(st);
        if(bd) setBlockedDates(bd);
      } catch(e){ console.error(e); }
      setLoaded(true);
    })();
  },[]);

  useEffect(()=>{
    const unsub = onSnapshot(bkCol(),(snap)=>{
      const bks=snap.docs.map(d=>({...d.data(),id:d.id}));
      bks.sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
      setBookings(bks);
    });
    return ()=>unsub();
  },[]);

  useEffect(()=>{
    const unsub = onSnapshot(usersCol(),(snap)=>{
      const us=snap.docs.map(d=>({id:d.id,...d.data()}));
      if(us.length===0&&loaded){
        setDoc(doc(db,"sv_users","u_sa1"),{email:"sysadmin@banmi.ac.th",displayName:"ผู้ดูแลระบบ",role:"sysadmin",password:"admin",approved:true,createdAt:new Date().toISOString()});
      } else { setUsers(us); }
      if(currentUser){ const me=us.find(u=>u.id===currentUser.id); if(me) setCurrentUser(me); }
    });
    return ()=>unsub();
  },[loaded,currentUser?.id]);

  const addBooking    = async (nb) => await setDoc(bkRef(nb.id),nb);
  const updateBooking = async (up) => await setDoc(bkRef(up.id),up);
  const deleteBooking = async (id) => await deleteDoc(bkRef(id));
  const saveSettings  = async (s)  => { setSettings(s); await fsSet("settings",s); };
  const saveStructure = async (st) => { setStructure(st); await fsSet("structure",st); };
  const saveBlocked   = async (bd) => { setBlockedDates(bd); await fsSet("blockedDates",bd); };

  const handleLogin  = u => { setCurrentUser(u); setPage(u.role==="teacher"?"booking":u.role==="sysadmin"?"dashboard":"summary"); };
  const handleLogout = () => { setCurrentUser(null); setPage(""); };

  const getNav = useCallback(()=>{
    if(!currentUser) return [];
    if(currentUser.role==="sysadmin") return [
      ["dashboard","📊","Dashboard"],["summary","📋","สรุปผล"],["evaluate","📝","ประเมิน"],
      ["schedule","🗓️","ตาราง"],["users","👥","ผู้ใช้"],["settings","⚙️","ตั้งค่า"],["profile","👤","โปรไฟล์"]
    ];
    if(currentUser.role==="admin") return [
      ["dashboard","📊","Dashboard"],["summary","📋","สรุปผล"],["evaluate","📝","ประเมิน"],
      ["schedule","🗓️","ตาราง"],["profile","👤","โปรไฟล์"]
    ];
    const nav=[["booking","📅","จองเวลา"],["summary","📋","ผลของฉัน"],["profile","👤","โปรไฟล์"]];
    if(isEvaluator(currentUser.id,bookings)) nav.splice(2,0,["evaluate","📝","ประเมิน"]);
    return nav;
  },[currentUser,bookings]);

  const navItems=getNav();
  const pendingCount=currentUser?bookings.filter(b=>
    !b.evals?.[currentUser.id]?.submitted&&
    (currentUser.role==="sysadmin"||b.adminId===currentUser.id||b.teacher1Id===currentUser.id||b.teacher2Id===currentUser.id)
  ).length:0;

  if(!loaded) return(<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontSize:17,fontFamily:"Sarabun,sans-serif"}}>⏳ กำลังเชื่อมต่อ Firebase...</div>);

  return(
    <div style={{minHeight:"100vh",fontFamily:"'Sarabun',sans-serif"}}>
      <style>{CSS}</style>
      {currentUser&&(
        <header className="np" style={{background:"linear-gradient(135deg,#1E3A8A 0%,#1E40AF 100%)",color:"#fff",padding:"10px 16px",position:"sticky",top:0,zIndex:300,boxShadow:"0 3px 16px rgba(0,0,0,.22)"}}>
          <div style={{maxWidth:1100,margin:"0 auto",display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:40,height:40,borderRadius:8,background:"rgba(255,255,255,.18)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
              {settings.logo?<img src={settings.logo} style={{width:36,height:36,borderRadius:6,objectFit:"cover"}} onError={e=>{e.target.style.display="none";}}/>:"🏫"}
            </div>
            <div style={{minWidth:0,marginRight:4,flexShrink:0}}>
              <div style={{fontWeight:800,fontSize:14}}>{settings.schoolName}</div>
              <div style={{fontSize:11,opacity:.75,display:"flex",alignItems:"center",gap:5}}>
                {currentUser.displayName}&nbsp;<span style={{background:"rgba(255,255,255,.2)",padding:"1px 7px",borderRadius:20,fontSize:10}}>{ROLES[currentUser.role]}</span>
              </div>
            </div>
            <nav style={{display:"flex",gap:2,flexWrap:"wrap",flex:1}}>
              {navItems.map(([id,icon,lb])=>{
                const active=page===id;
                return <button key={id} onClick={()=>setPage(id)}
                  style={{padding:"6px 10px",borderRadius:7,cursor:"pointer",fontFamily:"Sarabun,sans-serif",fontSize:13,fontWeight:active?700:500,
                    background:active?"rgba(255,255,255,.22)":"transparent",border:`1.5px solid ${active?"rgba(255,255,255,.45)":"transparent"}`,
                    color:active?"#fff":"rgba(255,255,255,.78)",display:"inline-flex",alignItems:"center",gap:4,transition:"all .18s"}}>
                  <span>{icon}</span><span className="hsm">{lb}</span>
                  {id==="evaluate"&&pendingCount>0&&<span style={{background:"#F59E0B",color:"#1a0000",borderRadius:20,padding:"0 5px",fontSize:10,fontWeight:800}}>{pendingCount}</span>}
                </button>;
              })}
            </nav>
            <button onClick={handleLogout} style={{padding:"6px 12px",borderRadius:7,cursor:"pointer",background:"transparent",border:"1.5px solid rgba(255,255,255,.35)",color:"#fff",fontFamily:"Sarabun,sans-serif",fontSize:13,flexShrink:0}}>ออก</button>
          </div>
        </header>
      )}
      <main style={{maxWidth:1100,margin:"0 auto",padding:currentUser?"22px 14px 56px":"0"}}>
        {!currentUser&&<LoginPage users={users} settings={settings} onLogin={handleLogin}/>}
        {currentUser&&page==="dashboard"                                  &&<DashboardPage bookings={bookings} users={users} structure={structure} settings={settings}/>}
        {currentUser&&page==="booking"   &&currentUser.role==="teacher"   &&<BookingPage currentUser={currentUser} users={users} bookings={bookings} blockedDates={blockedDates} onSave={addBooking} onDelete={deleteBooking}/>}
        {currentUser&&page==="summary"                                    &&<SummaryPage currentUser={currentUser} bookings={bookings} structure={structure} users={users} settings={settings} onDeleteBooking={deleteBooking}/>}        {currentUser&&page==="evaluate"                                   &&<EvaluateTab currentUser={currentUser} bookings={bookings} structure={structure} onSaveBooking={updateBooking}/>}
        {currentUser&&page==="schedule"                                   &&<ScheduleSummary bookings={bookings} users={users}/>}
        {currentUser&&page==="users"     &&currentUser.role==="sysadmin"  &&<UsersTab users={users}/>}
        {currentUser&&page==="settings"  &&currentUser.role==="sysadmin"  &&<SettingsPage settings={settings} structure={structure} blockedDates={blockedDates} onSaveSettings={saveSettings} onSaveStructure={saveStructure} onSaveBlocked={saveBlocked}/>}
        {currentUser&&page==="profile"                                    &&<ProfileTab currentUser={currentUser}/>}
      </main>
    </div>
  );
}