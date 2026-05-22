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

// Firestore helpers
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
//  CONSTANTS & DEFAULT DATA
// ═══════════════════════════════════════════════
const DEFAULT_DOMAIN = "banmi.ac.th";
const TH_MONTHS   = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
const TH_MONTHS_S = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const WEEKDAYS    = ["อา","จ","อ","พ","พฤ","ศ","ส"];
const TIME_SLOTS  = ["08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30"];
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
const gradeOf        = pct => pct>=80?{label:"ดีมาก",color:"#14532D"}:pct>=70?{label:"ดี",color:"#166634"}:pct>=60?{label:"พอใช้",color:"#78350F"}:{label:"ควรปรับปรุง",color:"#7F1D1D"};
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
.card{background:var(--W);border-radius:10px;box-shadow:0 2px 12px rgba(0,0,0,.08);padding:20px;}
.frow{display:flex;flex-direction:column;gap:5px;margin-bottom:14px;}
.flbl{font-size:13px;font-weight:700;color:#374151;}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;}
.badge-p{display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;background:#FEF3C7;color:#92400E;}
.badge-d{display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;background:#D1FAE5;color:#065F46;}
.badge-part{display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;background:#DBEAFE;color:#1E40AF;}
.rt-dot{width:8px;height:8px;border-radius:50%;background:#22c55e;display:inline-block;margin-right:5px;animation:pulse 2s infinite;}
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
@media(max-width:640px){.g2{grid-template-columns:1fr!important;}.g3{grid-template-columns:1fr 1fr!important;}.hsm{display:none!important;}}
@media print{.np{display:none!important;}body{background:white;}}
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
        email: em,
        displayName: displayName.trim(),
        password: pw,
        role: "teacher",
        approved: false,
        createdAt: new Date().toISOString()
      });
      setMsg("ลงทะเบียนสำเร็จ! กรุณารอผู้ดูแลระบบอนุมัติบัญชี");
      setIsRegister(false);
      setErr("");
      setPw("");
    } catch (error) {
      setErr("เกิดข้อผิดพลาดในการลงทะเบียน");
    }
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
          
          {isRegister && (
            <div className="frow">
              <label className="flbl">ชื่อ-สกุล</label>
              <input className="inp" type="text" value={displayName} onChange={e=>{setDisplayName(e.target.value);setErr("");}} placeholder="เช่น ครูนภา สวัสดี"/>
            </div>
          )}
          <div className="frow">
            <label className="flbl">อีเมลโรงเรียน</label>
            <input className="inp" type="email" value={email} onChange={e=>{setEmail(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&(isRegister?doRegister():doLogin())} placeholder={`yourname@${domain}`}/>
          </div>
          <div className="frow">
            <label className="flbl">รหัสผ่าน</label>
            <div style={{position:"relative"}}>
              <input className="inp" type={show?"text":"password"} value={pw} onChange={e=>{setPw(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&(isRegister?doRegister():doLogin())} placeholder="กรอกรหัสผ่าน" style={{paddingRight:44}}/>
              <button onClick={()=>setShow(!show)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:18,padding:0,lineHeight:1}}>{show?"🙈":"👁️"}</button>
            </div>
          </div>
          
          {isRegister ? (
            <button onClick={doRegister} className="btn bg" style={{width:"100%",padding:"12px",fontSize:16,marginTop:4}}>📝 ลงทะเบียน</button>
          ) : (
            <button onClick={doLogin} className="btn bp" style={{width:"100%",padding:"12px",fontSize:16,marginTop:4}}>🔐 เข้าสู่ระบบ</button>
          )}

          <div style={{marginTop:20,textAlign:"center"}}>
            <button onClick={()=>{setIsRegister(!isRegister); setErr(""); setMsg("");}} style={{background:"none",border:"none",color:"var(--P)",textDecoration:"underline",fontSize:13,cursor:"pointer",fontFamily:"Sarabun,sans-serif"}}>
              {isRegister ? "มีบัญชีแล้ว? เข้าสู่ระบบ" : "ยังไม่มีบัญชี? ลงทะเบียนที่นี่"}
            </button>
          </div>
        </div>
      </div>
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
  const admins=users.filter(u=>u.role==="admin" && u.approved);
  const teachers=users.filter(u=>u.role==="teacher" && u.approved);
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
              if(isSel){bg="var(--P)";col="#fff";bc="var(--P)";}
              else if(hasBk){bg="#EEF2FF";bc="#C7D2FE";}
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
function BookingPage({currentUser,users,bookings,blockedDates,onSave}){
  const [step,setStep]=useState(1);
  const [subject,setSubject]=useState("");
  const [classRoom,setClassRoom]=useState("");
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
  const admins=users.filter(u=>u.role==="admin" && u.approved);
  const teachers=users.filter(u=>u.role==="teacher"&&u.id!==currentUser.id && u.approved);
  const blockedTimesFor=date=>TIME_SLOTS.filter(t=>
    bookings.some(b=>b.teacherId===currentUser.id&&b.date===date&&b.time===t)||
    userBusy(adminId,date,t,bookings)||userBusy(t1Id,date,t,bookings)||userBusy(t2Id,date,t,bookings)
  );
  const canStep2=subject.trim()&&classRoom.trim()&&adminId&&t1Id&&t2Id&&t1Id!==t2Id;
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
      const nb={
        id:uid(),teacherId:currentUser.id,teacherName:currentUser.displayName,teacherEmail:currentUser.email,
        subject:subject.trim(),classRoom:classRoom.trim(),
        adminId,adminName:au?.displayName||"",teacher1Id:t1Id,teacher1Name:t1u?.displayName||"",
        teacher2Id:t2Id,teacher2Name:t2u?.displayName||"",
        date:selDate,time:selTime,evals:{},createdAt:new Date().toISOString()
      };
      await onSave(nb);
      setMsg({t:"s",s:`✅ จองสำเร็จ! ${fmtDate(selDate)} ${selTime} น. | ${au?.displayName}, ${t1u?.displayName}, ${t2u?.displayName}`});
      setSubject("");setClassRoom("");setAdminId("");setT1Id("");setT2Id("");setSelDate("");setSelTime("");setStep(1);
      setTimeout(()=>setMsg(null),7000);
    } catch(e) {
      setMsg({t:"e",s:"เกิดข้อผิดพลาด กรุณาลองใหม่"});
    }
    setSaving(false);
  };
  const prevMon=()=>{if(calM===0){setCalY(y=>y-1);setCalM(11);}else setCalM(m=>m-1);};
  const nextMon=()=>{if(calM===11){setCalY(y=>y+1);setCalM(0);}else setCalM(m=>m+1);};

  return(
    <div>
      <div style={{marginBottom:20}}>
        <h2 style={{fontWeight:800,fontSize:21,color:"var(--P)"}}>📅 จองเวลารับการนิเทศ</h2>
        <p style={{color:"var(--TS)",fontSize:13,marginTop:3}}>สวัสดี <b>{currentUser.displayName}</b> — เลือกกรรมการ 3 ท่าน และระบุวันเวลา</p>
      </div>
      {msg&&<div style={{padding:"12px 16px",borderRadius:9,marginBottom:18,fontWeight:600,fontSize:14,background:msg.t==="s"?"#D1FAE5":"#FEE2E2",color:msg.t==="s"?"#065F46":"#991B1B",border:`1.5px solid ${msg.t==="s"?"#A7F3D0":"#FECACA"}`}}>{msg.s}</div>}
      {step===1&&<div className="card">
        <div className="g2">
          <div className="frow"><label className="flbl">รายวิชา *</label><input className="inp" value={subject} onChange={e=>setSubject(e.target.value)} placeholder="เช่น คณิตศาสตร์ ม.3"/></div>
          <div className="frow"><label className="flbl">ระดับชั้น / ห้อง *</label><input className="inp" value={classRoom} onChange={e=>setClassRoom(e.target.value)} placeholder="เช่น ม.3/1"/></div>
        </div>
        <div style={{background:"#EEF2FF",borderRadius:10,padding:"14px 16px",marginBottom:12}}>
          <div style={{fontWeight:700,color:"var(--P)",marginBottom:10,fontSize:14,display:"flex",alignItems:"center",gap:7}}>
            <span style={{background:"var(--P)",color:"#fff",borderRadius:"50%",width:22,height:22,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800}}>1</span>ผู้บริหารที่นิเทศ (1 คน)
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(185px,1fr))",gap:7}}>
            {admins.map(a=>{const active=adminId===a.id;return <button key={a.id} onClick={()=>setAdminId(a.id===adminId?"":a.id)}
              style={{padding:"10px 12px",borderRadius:8,border:`2px solid ${active?"var(--P)":"#C7D2FE"}`,background:active?"var(--P)":"var(--W)",color:active?"#fff":"var(--T)",cursor:"pointer",fontFamily:"Sarabun,sans-serif",textAlign:"left",transition:"all .15s"}}>
              <div style={{fontWeight:600,fontSize:13}}>{active&&"✓ "}{a.displayName}</div>
            </button>;})}
          </div>
        </div>
        <div style={{background:"#F0FDF4",borderRadius:10,padding:"14px 16px",marginBottom:18}}>
          <div style={{fontWeight:700,color:"#166634",marginBottom:10,fontSize:14,display:"flex",alignItems:"center",gap:7}}>
            <span style={{background:"var(--G)",color:"#fff",borderRadius:"50%",width:22,height:22,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800}}>2</span>ครูกรรมการ (2 คน)
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(185px,1fr))",gap:7}}>
            {teachers.map(t=>{const sn=t1Id===t.id?1:t2Id===t.id?2:0,active=sn>0,full=!active&&t1Id&&t2Id;
              return <button key={t.id} disabled={!!full} onClick={()=>pickT(t.id)}
                style={{padding:"10px 12px",borderRadius:8,border:`2px solid ${active?"var(--G)":"#BBF7D0"}`,background:active?"var(--G)":"var(--W)",color:active?"#fff":"var(--T)",cursor:full?"not-allowed":"pointer",fontFamily:"Sarabun,sans-serif",textAlign:"left",opacity:full?.4:1}}>
                <div style={{fontWeight:600,fontSize:13}}>{t.displayName}</div>
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
              if(isSel){bg="var(--P)";col="#fff";bc="var(--P)";} else if(isBlk){bg="#FEE2E2";col="#FECACA";bc="#FECACA";} else if(isPast){bg="#F9FAFB";col="#D1D5DB";bc="#F3F4F6";}
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
    </div>
  );
}

// ═══════════════════════════════════════════════
//  SUMMARY PAGE
// ═══════════════════════════════════════════════
function SummaryPage({currentUser,bookings,structure}){
  const visible=currentUser.role==="teacher"?bookings.filter(b=>b.teacherId===currentUser.id):bookings;
  const sorted=[...visible].sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
  
  return(
    <div>
      <div style={{marginBottom:18}}>
        <h2 style={{fontWeight:800,fontSize:21,color:"var(--P)"}}>{currentUser.role==="teacher"?"📊 ผลการนิเทศของฉัน":"📊 สรุปผลการนิเทศทั้งหมด"}</h2>
      </div>
      <div className="card" style={{padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{background:"var(--P)",color:"#fff"}}>
              {["#","ชื่อ-สกุล","วิชา","ชั้น","วันที่","เวลา","สถานะ","คะแนน"].map((h,i)=>(
                <th key={i} style={{padding:"10px",textAlign:"left",whiteSpace:"nowrap",fontWeight:700}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {sorted.length===0&&<tr><td colSpan={10} style={{padding:36,textAlign:"center",color:"#D1D5DB"}}>ไม่มีข้อมูล</td></tr>}
              {sorted.map((b,idx)=>{const sc=calcAvgScore(b,structure);return(
                <tr key={b.id} style={{background:idx%2?"#F9FAFB":"var(--W)",borderBottom:"1px solid var(--BD)"}}>
                  <td style={{padding:"9px 10px"}}>{idx+1}</td>
                  <td style={{padding:"9px 10px",fontWeight:600,whiteSpace:"nowrap"}}>{b.teacherName}</td>
                  <td style={{padding:"9px 10px"}}>{b.subject}</td>
                  <td style={{padding:"9px 10px"}}>{b.classRoom}</td>
                  <td style={{padding:"9px 10px"}}>{fmtDate(b.date)}</td>
                  <td style={{padding:"9px 10px"}}>{b.time}</td>
                  <td style={{padding:"9px 10px"}}>{isFullyEval(b)?<span className="badge-d">✅ ครบ</span>:<span className="badge-part">⏳ {submittedCount(b)}/{evalIds(b).length}</span>}</td>
                  <td style={{padding:"9px 10px"}}>{sc?<span style={{fontWeight:700,color:gradeOf(sc.avgPct).color}}>{sc.avgTotal}/{sc.maxTotal} ({sc.avgPct}%)</span>:<span style={{color:"#D1D5DB"}}>—</span>}</td>
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
//  EVALUATE TAB (Simplified)
// ═══════════════════════════════════════════════
function EvaluateTab({currentUser,bookings,structure,onSaveBooking}){
  const myQueue=currentUser.role==="sysadmin"?bookings:bookings.filter(b=>b.adminId===currentUser.id||b.teacher1Id===currentUser.id||b.teacher2Id===currentUser.id);
  const pending=[...myQueue].filter(b=>!b.evals?.[currentUser.id]?.submitted);
  
  const autoEval = async (b) => {
    let scores = {};
    structure.forEach(d => d.items.forEach(i => scores[i.id] = i.maxScore)); // Auto full marks for demo
    const updated={...b,evals:{...b.evals,[currentUser.id]:{scores,comments:"ดีมาก",submitted:true,evaluatorName:currentUser.displayName,submittedAt:new Date().toISOString()}}};
    await onSaveBooking(updated);
  };

  return(<div>
    <h3 style={{fontWeight:700,color:"var(--P)",marginBottom:5,fontSize:16}}>แบบประเมินที่ต้องกรอก ({pending.length})</h3>
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {pending.map(b=>(
        <div key={b.id} className="card" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 16px"}}>
          <div>
            <div style={{fontWeight:700}}>{b.teacherName}</div>
            <div style={{fontSize:12,color:"var(--TS)"}}>{b.subject} · {fmtDate(b.date)} {b.time}</div>
          </div>
          <button onClick={() => autoEval(b)} className="btn bp" style={{padding:"9px 16px"}}>ประเมินไว (Demo)</button>
        </div>
      ))}
    </div>
  </div>);
}

// ═══════════════════════════════════════════════
//  PROFILE TAB (NEW)
// ═══════════════════════════════════════════════
function ProfileTab({currentUser}){
  const [displayName, setDisplayName] = useState(currentUser.displayName || "");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const saveProfile = async () => {
    if(!displayName.trim()) return;
    setSaving(true);
    try {
      await updateDoc(userRef(currentUser.id), { displayName: displayName.trim() });
      setMsg("✅ อัปเดตข้อมูลเรียบร้อยแล้ว");
      setTimeout(()=>setMsg(""), 3000);
    } catch(e) {
      console.error(e);
    }
    setSaving(false);
  };

  return(
    <div className="card" style={{maxWidth: 500}}>
      <h3 style={{fontWeight:700,color:"var(--P)",marginBottom:18,fontSize:16}}>👤 ข้อมูลส่วนตัว</h3>
      <div className="frow">
        <label className="flbl">อีเมล (ไม่สามารถแก้ไขได้)</label>
        <input className="inp" value={currentUser.email} disabled style={{background:"#F3F4F6",color:"#9CA3AF"}}/>
      </div>
      <div className="frow">
        <label className="flbl">ชื่อ-นามสกุล</label>
        <input className="inp" value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="เช่น ครูนภา สวัสดี"/>
      </div>
      {msg && <div style={{color:"var(--G)",fontWeight:700,fontSize:13,marginBottom:10}}>{msg}</div>}
      <button onClick={saveProfile} disabled={saving} className="btn bp">💾 {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}</button>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  USERS TAB (Firestore Version)
// ═══════════════════════════════════════════════
function UsersTab({users}){
  const updateStatus = async (id, status) => {
    await updateDoc(userRef(id), { approved: status });
  };
  
  const updateRole = async (id, role) => {
    await updateDoc(userRef(id), { role });
  };

  const removeUser = async (id) => {
    if(confirm("ยืนยันการลบผู้ใช้งานรายนี้?")) await deleteDoc(userRef(id));
  };

  const pending = users.filter(u => !u.approved && u.role !== "sysadmin");
  const active  = users.filter(u => u.approved || u.role === "sysadmin");

  return(<div>
    <h3 style={{fontWeight:700,color:"var(--P)",fontSize:16,marginBottom:14}}>👥 จัดการผู้ใช้งานระบบ</h3>
    
    {pending.length > 0 && (
      <div style={{marginBottom:24}}>
        <h4 style={{fontWeight:700,color:"var(--A)",marginBottom:8,fontSize:14}}>⏳ รอการอนุมัติ ({pending.length})</h4>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {pending.map(u => (
            <div key={u.id} className="card" style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderLeft:"4px solid var(--A)"}}>
               <div style={{flex:1}}><div style={{fontWeight:700}}>{u.displayName}</div><div style={{fontSize:12,color:"var(--TS)"}}>{u.email}</div></div>
               <button onClick={()=>updateStatus(u.id, true)} className="btn bg" style={{padding:"6px 12px"}}>อนุมัติ</button>
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
              <div style={{width:36,height:36,borderRadius:"50%",background:ROLE_COLOR[u.role],display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:14,fontWeight:700}}>{u.displayName?.slice(0,1) || "?"}</div>
              <div style={{flex:1,minWidth:100}}>
                <div style={{fontWeight:600,fontSize:14}}>{u.displayName} {u.id === "u_sa1" && <span className="badge-p" style={{marginLeft:6}}>ระบบ</span>}</div>
                <div style={{fontSize:12,color:"var(--TS)"}}>{u.email}</div>
              </div>
              {u.id !== "u_sa1" && (
                <select className="inp" value={u.role} onChange={e=>updateRole(u.id, e.target.value)} style={{width:130,padding:"6px",fontSize:13}}>
                  <option value="teacher">ครูผู้สอน</option>
                  <option value="admin">ผู้บริหาร</option>
                  <option value="sysadmin">ผู้ดูแลระบบ</option>
                </select>
              )}
              {u.id !== "u_sa1" && <button onClick={()=>removeUser(u.id)} className="btn br" style={{padding:"6px 10px",fontSize:12}}>ลบ</button>}
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>);
}

// ═══════════════════════════════════════════════
//  ROOT APP — Firebase Real-time
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
  const [syncStatus,   setSyncStatus  ] = useState("loading");

  useEffect(()=>{
    (async()=>{
      try {
        const [s,st,bd] = await Promise.all([fsGet("settings"), fsGet("structure"), fsGet("blockedDates")]);
        if(s)  setSettings(s);
        if(st) setStructure(st);
        if(bd) setBlockedDates(bd);
      } catch(e){ console.error(e); }
      setLoaded(true);
    })();
  },[]);

  // ── Real-time Bookings ──
  useEffect(()=>{
    const unsub = onSnapshot(bkCol(), (snap) => {
      const bks = snap.docs.map(d=>({...d.data(),id:d.id}));
      bks.sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
      setBookings(bks);
      setSyncStatus("ok");
    }, (err) => { setSyncStatus("error"); });
    return () => unsub();
  },[]);

  // ── Real-time Users (sv_users) ──
  useEffect(()=>{
    const unsub = onSnapshot(usersCol(), (snap) => {
      const us = snap.docs.map(d=>({id:d.id, ...d.data()}));
      
      // Auto-create default sysadmin if users collection is totally empty
      if(us.length === 0 && loaded) {
        setDoc(doc(db, "sv_users", "u_sa1"), {
          email: "sysadmin@banmi.ac.th",
          displayName: "ผู้ดูแลระบบ",
          role: "sysadmin",
          password: "admin",
          approved: true,
          createdAt: new Date().toISOString()
        });
      } else {
        setUsers(us);
      }
      
      // Sync currentUser context if it gets updated in DB
      if(currentUser) {
        const updatedMe = us.find(u => u.id === currentUser.id);
        if(updatedMe) setCurrentUser(updatedMe);
      }
    });
    return () => unsub();
  },[loaded, currentUser?.id]);

  const addBooking = async (nb) => await setDoc(bkRef(nb.id), nb);
  const updateBooking = async (up) => await setDoc(bkRef(up.id), up);

  const handleLogin  = u => { setCurrentUser(u); setPage(u.role==="teacher"?"booking":"summary"); };
  const handleLogout = () => { setCurrentUser(null); setPage(""); };

  const getNav = useCallback(()=>{
    if(!currentUser) return [];
    if(currentUser.role==="sysadmin") return [
      ["summary","📊","สรุปผล"],["evaluate","📝","ประเมิน"],["schedule","📋","ตาราง"],
      ["users","👥","ผู้ใช้"],["profile","👤","โปรไฟล์"]
    ];
    if(currentUser.role==="admin") return [
      ["summary","📊","สรุปผล"],["evaluate","📝","ประเมิน"],["schedule","📋","ตาราง"],["profile","👤","โปรไฟล์"]
    ];
    const nav=[["booking","📅","จองเวลา"],["summary","📊","ผลของฉัน"],["profile","👤","โปรไฟล์"]];
    if(isEvaluator(currentUser.id,bookings)) nav.splice(2,0,["evaluate","📝","ประเมิน"]);
    return nav;
  },[currentUser,bookings]);

  const navItems=getNav();
  const pendingCount=currentUser?bookings.filter(b=>!b.evals?.[currentUser.id]?.submitted&&
    (currentUser.role==="sysadmin"||b.adminId===currentUser.id||b.teacher1Id===currentUser.id||b.teacher2Id===currentUser.id)).length:0;

  if(!loaded) return(<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontSize:17}}>กำลังเชื่อมต่อ Firebase...</div>);

  return(
    <div style={{minHeight:"100vh",fontFamily:"'Sarabun',sans-serif"}}>
      <style>{CSS}</style>
      {currentUser&&(
        <header className="np" style={{background:"linear-gradient(135deg,#1E3A8A 0%,#1E40AF 100%)",color:"#fff",padding:"10px 16px",position:"sticky",top:0,zIndex:300,boxShadow:"0 3px 16px rgba(0,0,0,.22)"}}>
          <div style={{maxWidth:1040,margin:"0 auto",display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:40,height:40,borderRadius:8,background:"rgba(255,255,255,.18)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🏫</div>
            <div style={{minWidth:0,marginRight:4}}>
              <div style={{fontWeight:800,fontSize:14}}>{settings.schoolName}</div>
              <div style={{fontSize:11,opacity:.75,display:"flex",alignItems:"center",gap:5}}>
                {currentUser.displayName} <span style={{background:"rgba(255,255,255,.2)",padding:"1px 7px",borderRadius:20,fontSize:10}}>{ROLES[currentUser.role]}</span>
              </div>
            </div>
            <nav style={{display:"flex",gap:3,flexWrap:"wrap",flex:1}}>
              {navItems.map(([id,icon,lb])=>{
                const active=page===id;
                return <button key={id} onClick={()=>setPage(id)}
                  style={{padding:"6px 11px",borderRadius:7,cursor:"pointer",fontFamily:"Sarabun,sans-serif",fontSize:13,fontWeight:active?700:500,
                    background:active?"rgba(255,255,255,.22)":"transparent",border:`1.5px solid ${active?"rgba(255,255,255,.45)":"transparent"}`,
                    color:active?"#fff":"rgba(255,255,255,.78)",display:"inline-flex",alignItems:"center",gap:4,transition:"all .18s"}}>
                  <span>{icon}</span><span className="hsm">{lb}</span>
                  {id==="evaluate"&&pendingCount>0&&<span style={{background:"#F59E0B",color:"#1a0000",borderRadius:20,padding:"0 5px",fontSize:10,fontWeight:800}}>{pendingCount}</span>}
                </button>;
              })}
            </nav>
            <button onClick={handleLogout} style={{padding:"6px 12px",borderRadius:7,cursor:"pointer",background:"transparent",border:"1.5px solid rgba(255,255,255,.35)",color:"#fff"}}>ออก</button>
          </div>
        </header>
      )}
      <main style={{maxWidth:1040,margin:"0 auto",padding:currentUser?"22px 14px 56px":"0"}}>
        {!currentUser&&<LoginPage users={users} settings={settings} onLogin={handleLogin}/>}
        {currentUser&&page==="booking"   &&currentUser.role==="teacher" &&<BookingPage currentUser={currentUser} users={users} bookings={bookings} blockedDates={blockedDates} onSave={addBooking}/>}
        {currentUser&&page==="summary"                                  &&<SummaryPage currentUser={currentUser} bookings={bookings} structure={structure}/>}
        {currentUser&&page==="evaluate"                                 &&<EvaluateTab currentUser={currentUser} bookings={bookings} structure={structure} onSaveBooking={updateBooking}/>}
        {currentUser&&page==="schedule"                                 &&<ScheduleSummary bookings={bookings} users={users}/>}
        {currentUser&&page==="users"     &&currentUser.role==="sysadmin"&&<UsersTab users={users}/>}
        {currentUser&&page==="profile"                                  &&<ProfileTab currentUser={currentUser}/>}
      </main>
    </div>
  );
}