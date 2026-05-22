import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════
//  CONFIG & DEFAULT DATA
// ═══════════════════════════════════════════════
const DEFAULT_DOMAIN = "banmi.ac.th";
const TH_MONTHS   = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
const TH_MONTHS_S = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const WEEKDAYS    = ["อา","จ","อ","พ","พฤ","ศ","ส"];
const TIME_SLOTS  = ["08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30"];
const ROLES       = { sysadmin:"ผู้ดูแลระบบ", admin:"ผู้บริหาร", teacher:"ครูผู้สอน" };
const ROLE_COLOR  = { sysadmin:"#4C1D95", admin:"#1E3A8A", teacher:"#166634" };

const DEF_USERS = [
  { id:"u_sa1", email:"sysadmin@banmi.ac.th",  name:"ผู้ดูแลระบบ",             role:"sysadmin", password:"admin1234" },
  { id:"u_a1",  email:"principal@banmi.ac.th", name:"ผอ.สมชาย ใจดี",           role:"admin",    password:"admin1234" },
  { id:"u_a2",  email:"deputy1@banmi.ac.th",   name:"รองผอ.สมหญิง มีสุข",      role:"admin",    password:"admin1234" },
  { id:"u_a3",  email:"deputy2@banmi.ac.th",   name:"รองผอ.วิชัย รุ่งเรือง",   role:"admin",    password:"admin1234" },
  { id:"u_a4",  email:"head1@banmi.ac.th",     name:"หัวหน้าวิชาการ สุดา งาม", role:"admin",    password:"admin1234" },
  { id:"u_a5",  email:"head2@banmi.ac.th",     name:"หน.กลุ่มสาระ ประยุทธ์",   role:"admin",    password:"admin1234" },
  { id:"u_t1",  email:"napa@banmi.ac.th",      name:"ครูนภา สวัสดี",           role:"teacher",  password:"teacher1234" },
  { id:"u_t2",  email:"somsak@banmi.ac.th",    name:"ครูสมศักดิ์ พร้อม",       role:"teacher",  password:"teacher1234" },
  { id:"u_t3",  email:"wanpen@banmi.ac.th",    name:"ครูวันเพ็ญ ดีใจ",         role:"teacher",  password:"teacher1234" },
  { id:"u_t4",  email:"orathai@banmi.ac.th",   name:"ครูอรทัย มั่งมี",         role:"teacher",  password:"teacher1234" },
  { id:"u_t5",  email:"surachai@banmi.ac.th",  name:"ครูสุรชัย แข็งแรง",       role:"teacher",  password:"teacher1234" },
];

const DEF_SETTINGS = { schoolName:"โรงเรียนบ้านมิ", logo:null, domain:DEFAULT_DOMAIN };

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
//  STORAGE — localStorage
// ═══════════════════════════════════════════════
const DB = {
  get(k)   { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch { return null; } },
  set(k,v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// ═══════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════
const uid     = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const today   = () => new Date().toISOString().slice(0,10);
const fmtDate = d => { if (!d) return ""; const [y,m,day] = d.split("-"); return `${+day} ${TH_MONTHS_S[+m-1]} ${+y+543}`; };
const daysInM = (y,m) => new Date(y,m+1,0).getDate();
const firstD  = (y,m) => new Date(y,m,1).getDay();

const calcOneEval = (ev, str) => {
  if (!ev?.submitted) return null;
  let total=0, maxTotal=0;
  const dims = str.map(d => {
    let dt=0, dm=0;
    d.items.forEach(i => { dt += ev.scores[i.id]||0; dm += i.maxScore; });
    total+=dt; maxTotal+=dm;
    return { name:d.name, score:dt, max:dm };
  });
  return { total, maxTotal, pct: maxTotal>0 ? Math.round(total/maxTotal*100) : 0, dims };
};

const calcAvgScore = (b, str) => {
  const results = Object.values(b.evals||{}).map(ev=>calcOneEval(ev,str)).filter(Boolean);
  if (results.length===0) return null;
  const avgPct   = Math.round(results.reduce((a,r)=>a+r.pct,0)/results.length);
  const avgTotal = Math.round(results.reduce((a,r)=>a+r.total,0)/results.length);
  const maxTotal = results[0].maxTotal;
  const dims = str.map((d,i) => ({
    name:  d.name,
    max:   results[0].dims[i].max,
    score: Math.round(results.reduce((a,r)=>a+r.dims[i].score,0)/results.length),
  }));
  return { avgPct, avgTotal, maxTotal, dims, count:results.length };
};

const evalIds        = b => [b.adminId, b.teacher1Id, b.teacher2Id].filter(Boolean);
const submittedCount = b => evalIds(b).filter(id => b.evals?.[id]?.submitted).length;
const isFullyEval    = b => { const ids=evalIds(b); return ids.length>0 && ids.every(id=>b.evals?.[id]?.submitted); };
const gradeOf        = pct => pct>=80?{label:"ดีมาก",color:"#14532D"}:pct>=70?{label:"ดี",color:"#166634"}:pct>=60?{label:"พอใช้",color:"#78350F"}:{label:"ควรปรับปรุง",color:"#7F1D1D"};
const userBusy       = (uid2,date,time,bks,excId=null) => { if(!uid2) return false; return bks.some(b=>b.id!==excId&&b.date===date&&b.time===time&&(b.teacherId===uid2||b.adminId===uid2||b.teacher1Id===uid2||b.teacher2Id===uid2)); };
const isEvaluator    = (userId, bookings) => bookings.some(b=>b.adminId===userId||b.teacher1Id===userId||b.teacher2Id===userId);

// ═══════════════════════════════════════════════
//  CSS
// ═══════════════════════════════════════════════
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --P:#1E3A8A;--PD:#1E2F6B;--PL:#EEF2FF;
  --A:#F59E0B;--AD:#D97706;--G:#16A34A;--R:#DC2626;
  --T:#1F2937;--TS:#6B7280;--BD:#E5E7EB;--BG:#F1F5F9;--W:#FFFFFF;
}
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
@media(max-width:640px){.g2{grid-template-columns:1fr!important;}.g3{grid-template-columns:1fr 1fr!important;}.hsm{display:none!important;}}
@media print{.np{display:none!important;}body{background:white;}}
`;

// ═══════════════════════════════════════════════
//  MINI CALENDAR
// ═══════════════════════════════════════════════
function MiniCal({ year, month, onPrev, onNext, renderCell }) {
  const dim = daysInM(year,month), fd = firstD(year,month);
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <button onClick={onPrev} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:"var(--P)",padding:"2px 8px",lineHeight:1}}>‹</button>
        <span style={{fontWeight:700,fontSize:15}}>{TH_MONTHS[month]} {year+543}</span>
        <button onClick={onNext} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:"var(--P)",padding:"2px 8px",lineHeight:1}}>›</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
        {WEEKDAYS.map(d => <div key={d} style={{textAlign:"center",fontSize:11,fontWeight:700,color:"var(--TS)",paddingBottom:4}}>{d}</div>)}
        {Array.from({length:fd}, (_,i) => <div key={"e"+i} />)}
        {Array.from({length:dim}, (_,i) => {
          const day=i+1, ds=`${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          return renderCell(day, ds);
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  LOGIN — email + password + domain lock
// ═══════════════════════════════════════════════
function LoginPage({ users, settings, onLogin }) {
  const [email, setEmail] = useState("");
  const [pw,    setPw   ] = useState("");
  const [show,  setShow ] = useState(false);
  const [err,   setErr  ] = useState("");
  const domain = settings.domain || DEFAULT_DOMAIN;

  const doLogin = () => {
    const em = email.trim().toLowerCase();
    if (!em)                           { setErr("กรุณากรอกอีเมล"); return; }
    if (!em.endsWith("@"+domain))      { setErr(`อีเมลต้องเป็น @${domain} เท่านั้น`); return; }
    if (!pw)                           { setErr("กรุณากรอกรหัสผ่าน"); return; }
    const u = users.find(u => u.email.toLowerCase()===em);
    if (!u)                            { setErr("ไม่พบอีเมลนี้ในระบบ กรุณาติดต่อผู้ดูแลระบบ"); return; }
    if (u.password !== pw)             { setErr("รหัสผ่านไม่ถูกต้อง"); return; }
    onLogin(u);
  };

  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:20,background:"linear-gradient(135deg,#EEF2FF 0%,#F1F5F9 100%)"}}>
      <div style={{width:"100%",maxWidth:420}}>
        <div className="card" style={{padding:"44px 36px 36px",boxShadow:"0 8px 32px rgba(30,58,138,.15)"}}>
          <div style={{textAlign:"center",marginBottom:28}}>
            {settings.logo
              ? <img src={settings.logo} style={{width:70,height:70,borderRadius:12,objectFit:"cover",marginBottom:12}} />
              : <div style={{fontSize:52,marginBottom:10}}>🏫</div>}
            <h1 style={{fontWeight:800,fontSize:22,color:"var(--P)",marginBottom:4}}>{settings.schoolName}</h1>
            <p style={{color:"var(--TS)",fontSize:13,marginBottom:6}}>ระบบนิเทศการสอน</p>
            <span style={{display:"inline-block",background:"#EEF2FF",color:"var(--P)",padding:"3px 14px",borderRadius:20,fontSize:12,fontWeight:700}}>@{domain}</span>
          </div>

          {err && <div style={{background:"#FEE2E2",color:"#991B1B",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13,fontWeight:600,border:"1px solid #FECACA"}}>⚠️ {err}</div>}

          <div className="frow">
            <label className="flbl">อีเมลโรงเรียน</label>
            <input className="inp" type="email" value={email}
              onChange={e=>{setEmail(e.target.value);setErr("");}}
              onKeyDown={e=>e.key==="Enter"&&doLogin()}
              placeholder={`yourname@${domain}`} />
          </div>
          <div className="frow">
            <label className="flbl">รหัสผ่าน</label>
            <div style={{position:"relative"}}>
              <input className="inp" type={show?"text":"password"} value={pw}
                onChange={e=>{setPw(e.target.value);setErr("");}}
                onKeyDown={e=>e.key==="Enter"&&doLogin()}
                placeholder="กรอกรหัสผ่าน"
                style={{paddingRight:44}} />
              <button onClick={()=>setShow(!show)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"var(--TS)",fontSize:18,padding:0,lineHeight:1}}>
                {show ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <button onClick={doLogin} className="btn bp" style={{width:"100%",padding:"12px",fontSize:16,marginTop:4}}>🔐 เข้าสู่ระบบ</button>

          <div style={{marginTop:16,padding:"12px 14px",background:"#F9FAFB",borderRadius:8,fontSize:12,color:"var(--TS)",lineHeight:1.7,border:"0.5px solid var(--BD)"}}>
            <b style={{color:"var(--T)"}}>บัญชีทดสอบ:</b><br/>
            ผู้ดูแล: sysadmin@banmi.ac.th / <b>admin1234</b><br/>
            ผู้บริหาร: principal@banmi.ac.th / <b>admin1234</b><br/>
            ครู: napa@banmi.ac.th / <b>teacher1234</b>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  SCHEDULE SUMMARY — ตารางสรุป Real-time
// ═══════════════════════════════════════════════
function ScheduleSummary({ bookings, users }) {
  const [viewDate, setViewDate] = useState(today());
  const [calY, setCalY] = useState(new Date().getFullYear());
  const [calM, setCalM] = useState(new Date().getMonth());

  const admins   = users.filter(u=>u.role==="admin");
  const teachers = users.filter(u=>u.role==="teacher");
  const dayBks   = bookings.filter(b=>b.date===viewDate);

  const prevMon = () => { if(calM===0){setCalY(y=>y-1);setCalM(11);}else setCalM(m=>m-1); };
  const nextMon = () => { if(calM===11){setCalY(y=>y+1);setCalM(0);}else setCalM(m=>m+1); };
  const short = name => name.replace("ผอ.","").replace("รองผอ.","").replace("หัวหน้าวิชาการ ","").replace("หน.กลุ่มสาระ ","").replace("ครู","").trim().split(" ")[0];

  const cellStyle = (color,border) => ({
    background:color, border:`1px solid ${border}`, borderRadius:6,
    padding:"4px 6px", fontSize:11, color:"#333", lineHeight:1.4,
  });

  return (
    <div>
      <div style={{marginBottom:18}}>
        <h2 style={{fontWeight:800,fontSize:21,color:"var(--P)"}}>📋 ตารางนิเทศ Real-time</h2>
        <p style={{color:"var(--TS)",fontSize:13,marginTop:3}}>ดูว่าผู้บริหารและกรรมการแต่ละท่านถูกจองวันเวลาใดบ้าง</p>
      </div>

      <div className="g2" style={{alignItems:"start",marginBottom:20}}>
        {/* Calendar picker */}
        <div className="card">
          <h4 style={{fontWeight:700,fontSize:14,marginBottom:12}}>เลือกวันที่ดู</h4>
          <MiniCal year={calY} month={calM} onPrev={prevMon} onNext={nextMon}
            renderCell={(day,ds) => {
              const hasBk = bookings.some(b=>b.date===ds);
              const isSel = ds===viewDate;
              let bg="var(--W)",col="var(--T)",bc="var(--BD)";
              if (isSel)  { bg="var(--P)";col="#fff";bc="var(--P)"; }
              else if (hasBk) { bg="#EEF2FF";bc="#C7D2FE"; }
              return (
                <button key={ds} onClick={()=>setViewDate(ds)}
                  style={{width:"100%",aspectRatio:"1",border:`1.5px solid ${bc}`,background:bg,color:col,borderRadius:6,cursor:"pointer",fontSize:12,fontFamily:"Sarabun,sans-serif",fontWeight:isSel?700:400,position:"relative",transition:"all .15s"}}>
                  {day}
                  {hasBk && !isSel && <div style={{position:"absolute",bottom:2,left:"50%",transform:"translateX(-50%)",width:4,height:4,borderRadius:"50%",background:"var(--P)"}} />}
                </button>
              );
            }}
          />
          <div style={{marginTop:10,display:"flex",gap:10,fontSize:11,color:"var(--TS)"}}>
            <span>⬜ ว่าง</span><span style={{color:"var(--P)"}}>🟦 มีการจอง</span>
          </div>
        </div>

        {/* Day detail */}
        <div>
          <div className="card" style={{marginBottom:12,borderLeft:"4px solid var(--P)"}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>{fmtDate(viewDate)}</div>
            <div style={{fontSize:13,color:"var(--TS)"}}>มีการจอง <b style={{color:"var(--P)"}}>{dayBks.length}</b> รายการ</div>
          </div>
          {dayBks.length===0
            ? <div className="card" style={{textAlign:"center",color:"#D1D5DB",padding:24,fontSize:14}}>ไม่มีการจองในวันนี้</div>
            : <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {[...dayBks].sort((a,b)=>a.time.localeCompare(b.time)).map(b=>(
                  <div key={b.id} className="card" style={{padding:"12px 16px",borderLeft:"3px solid var(--A)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                      <div>
                        <div style={{fontWeight:700,fontSize:14}}>{b.time} — {b.teacherName}</div>
                        <div style={{fontSize:12,color:"var(--TS)",marginTop:2}}>{b.subject} · {b.classRoom}</div>
                        <div style={{fontSize:11,color:"#9CA3AF",marginTop:4,lineHeight:1.7}}>
                          👔 {b.adminName}<br/>👩‍🏫 {b.teacher1Name}, {b.teacher2Name}
                        </div>
                      </div>
                      <span className={isFullyEval(b)?"badge-d":"badge-part"}>
                        {isFullyEval(b) ? "✅ ครบ" : `⏳ ${submittedCount(b)}/${evalIds(b).length}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      {/* Admin schedule matrix */}
      <div className="card" style={{padding:0,overflow:"hidden",marginBottom:14}}>
        <div style={{background:"var(--P)",color:"#fff",padding:"12px 16px",fontWeight:700,fontSize:14}}>
          📊 ตารางผู้บริหาร — {fmtDate(viewDate)}
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:400}}>
            <thead>
              <tr style={{background:"#F8FAFF"}}>
                <th style={{padding:"9px 12px",textAlign:"left",fontWeight:700,color:"var(--TS)",borderBottom:"1px solid var(--BD)",width:65,fontSize:12}}>เวลา</th>
                {admins.map(a => (
                  <th key={a.id} style={{padding:"9px 8px",textAlign:"center",fontWeight:700,color:"var(--P)",borderBottom:"1px solid var(--BD)",fontSize:12,minWidth:100}}>{short(a.name)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((t,ti) => (
                <tr key={t} style={{background:ti%2?"#FAFAFA":"var(--W)"}}>
                  <td style={{padding:"7px 12px",fontWeight:600,color:"var(--TS)",borderBottom:"1px solid var(--BD)",fontSize:12,whiteSpace:"nowrap"}}>{t}</td>
                  {admins.map(a => {
                    const bk = dayBks.find(b=>b.time===t&&(b.adminId===a.id||b.teacher1Id===a.id||b.teacher2Id===a.id));
                    return (
                      <td key={a.id} style={{padding:"5px 8px",textAlign:"center",borderBottom:"1px solid var(--BD)"}}>
                        {bk
                          ? <div style={cellStyle("#FEF3C7","#FDE68A")}>
                              <div style={{fontWeight:700}}>{short(bk.teacherName)}</div>
                              <div style={{fontSize:10,opacity:.8}}>{bk.subject}</div>
                            </div>
                          : <span style={{color:"#D1D5DB",fontSize:16}}>—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Teacher schedule matrix */}
      <div className="card" style={{padding:0,overflow:"hidden"}}>
        <div style={{background:"#166634",color:"#fff",padding:"12px 16px",fontWeight:700,fontSize:14}}>
          📊 ตารางครูกรรมการ — {fmtDate(viewDate)}
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:400}}>
            <thead>
              <tr style={{background:"#F0FDF4"}}>
                <th style={{padding:"9px 12px",textAlign:"left",fontWeight:700,color:"var(--TS)",borderBottom:"1px solid var(--BD)",width:65,fontSize:12}}>เวลา</th>
                {teachers.map(t => (
                  <th key={t.id} style={{padding:"9px 8px",textAlign:"center",fontWeight:700,color:"#166634",borderBottom:"1px solid var(--BD)",fontSize:12,minWidth:90}}>{short(t.name)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((t,ti) => (
                <tr key={t} style={{background:ti%2?"#FAFAFA":"var(--W)"}}>
                  <td style={{padding:"7px 12px",fontWeight:600,color:"var(--TS)",borderBottom:"1px solid var(--BD)",fontSize:12,whiteSpace:"nowrap"}}>{t}</td>
                  {teachers.map(teacher => {
                    const bk = dayBks.find(b=>b.time===t&&(b.teacher1Id===teacher.id||b.teacher2Id===teacher.id||b.teacherId===teacher.id));
                    return (
                      <td key={teacher.id} style={{padding:"5px 8px",textAlign:"center",borderBottom:"1px solid var(--BD)"}}>
                        {bk
                          ? <div style={cellStyle("#DCFCE7","#BBF7D0")}>
                              <div style={{fontWeight:700}}>{short(bk.teacherName)}</div>
                              <div style={{fontSize:10,opacity:.8}}>{bk.subject}</div>
                            </div>
                          : <span style={{color:"#D1D5DB",fontSize:16}}>—</span>}
                      </td>
                    );
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
function BookingPage({ currentUser, users, bookings, blockedDates, onSave }) {
  const [step,      setStep     ] = useState(1);
  const [subject,   setSubject  ] = useState("");
  const [classRoom, setClassRoom] = useState("");
  const [adminId,   setAdminId  ] = useState("");
  const [t1Id,      setT1Id     ] = useState("");
  const [t2Id,      setT2Id     ] = useState("");
  const [selDate,   setSelDate  ] = useState("");
  const [selTime,   setSelTime  ] = useState("");
  const [calY,      setCalY     ] = useState(new Date().getFullYear());
  const [calM,      setCalM     ] = useState(new Date().getMonth());
  const [msg,       setMsg      ] = useState(null);

  const todayStr = today();
  const admins   = users.filter(u=>u.role==="admin");
  const teachers = users.filter(u=>u.role==="teacher"&&u.id!==currentUser.id);

  const blockedTimesFor = date => TIME_SLOTS.filter(t =>
    bookings.some(b=>b.teacherId===currentUser.id&&b.date===date&&b.time===t) ||
    userBusy(adminId,date,t,bookings) || userBusy(t1Id,date,t,bookings) || userBusy(t2Id,date,t,bookings)
  );

  const canStep2 = subject.trim()&&classRoom.trim()&&adminId&&t1Id&&t2Id&&t1Id!==t2Id;

  const pickT = tid => {
    if (t1Id===tid) { setT1Id(t2Id); setT2Id(""); return; }
    if (t2Id===tid) { setT2Id(""); return; }
    if (!t1Id) { setT1Id(tid); return; }
    if (!t2Id) { setT2Id(tid); return; }
  };

  const submit = () => {
    if (!selDate||!selTime) { setMsg({t:"e",s:"กรุณาเลือกวันที่และเวลา"}); return; }
    const au=users.find(u=>u.id===adminId), t1u=users.find(u=>u.id===t1Id), t2u=users.find(u=>u.id===t2Id);
    const nb = {
      id:uid(), teacherId:currentUser.id, teacherName:currentUser.name, teacherEmail:currentUser.email,
      subject:subject.trim(), classRoom:classRoom.trim(),
      adminId, adminName:au?.name||"", teacher1Id:t1Id, teacher1Name:t1u?.name||"",
      teacher2Id:t2Id, teacher2Name:t2u?.name||"",
      date:selDate, time:selTime, evals:{}, createdAt:new Date().toISOString()
    };
    onSave([...bookings,nb]);
    setMsg({t:"s",s:`✅ จองสำเร็จ! ${fmtDate(selDate)} ${selTime} น. | ${au?.name}, ${t1u?.name}, ${t2u?.name}`});
    setSubject(""); setClassRoom(""); setAdminId(""); setT1Id(""); setT2Id(""); setSelDate(""); setSelTime(""); setStep(1);
    setTimeout(()=>setMsg(null), 7000);
  };

  const prevMon = () => { if(calM===0){setCalY(y=>y-1);setCalM(11);}else setCalM(m=>m-1); };
  const nextMon = () => { if(calM===11){setCalY(y=>y+1);setCalM(0);}else setCalM(m=>m+1); };

  return (
    <div>
      <div style={{marginBottom:20}}>
        <h2 style={{fontWeight:800,fontSize:21,color:"var(--P)"}}>📅 จองเวลารับการนิเทศ</h2>
        <p style={{color:"var(--TS)",fontSize:13,marginTop:3}}>สวัสดี <b>{currentUser.name}</b> — เลือกกรรมการ 3 ท่าน และระบุวันเวลา</p>
      </div>

      {msg && (
        <div style={{padding:"12px 16px",borderRadius:9,marginBottom:18,fontWeight:600,fontSize:14,
          background:msg.t==="s"?"#D1FAE5":"#FEE2E2",color:msg.t==="s"?"#065F46":"#991B1B",
          border:`1.5px solid ${msg.t==="s"?"#A7F3D0":"#FECACA"}`}}>{msg.s}</div>
      )}

      {/* Step tabs */}
      <div style={{display:"flex",marginBottom:18,borderRadius:10,overflow:"hidden",border:"1.5px solid #C7D2FE"}}>
        {[["1","📝 ข้อมูลและกรรมการ"],["2","📅 วันและเวลา"]].map(([s,lb]) => {
          const active=step===+s, locked=s==="2"&&!canStep2;
          return <button key={s} onClick={()=>!locked&&setStep(+s)}
            style={{flex:1,padding:"11px",background:active?"var(--P)":"var(--W)",color:active?"#fff":locked?"#CBD5E1":"var(--P)",border:"none",fontFamily:"Sarabun,sans-serif",fontSize:13,fontWeight:active?700:500,cursor:locked?"not-allowed":"pointer"}}>{lb}</button>;
        })}
      </div>

      {step===1 && (
        <div className="card">
          <div className="g2">
            <div className="frow"><label className="flbl">รายวิชา *</label><input className="inp" value={subject} onChange={e=>setSubject(e.target.value)} placeholder="เช่น คณิตศาสตร์ ม.3"/></div>
            <div className="frow"><label className="flbl">ระดับชั้น / ห้อง *</label><input className="inp" value={classRoom} onChange={e=>setClassRoom(e.target.value)} placeholder="เช่น ม.3/1"/></div>
          </div>

          <div style={{background:"#EEF2FF",borderRadius:10,padding:"14px 16px",marginBottom:12}}>
            <div style={{fontWeight:700,color:"var(--P)",marginBottom:10,fontSize:14,display:"flex",alignItems:"center",gap:7}}>
              <span style={{background:"var(--P)",color:"#fff",borderRadius:"50%",width:22,height:22,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800}}>1</span>
              ผู้บริหารที่นิเทศ (1 คน)
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(185px,1fr))",gap:7}}>
              {admins.map(a => {
                const active = adminId===a.id;
                return <button key={a.id} onClick={()=>setAdminId(a.id===adminId?"":a.id)}
                  style={{padding:"10px 12px",borderRadius:8,border:`2px solid ${active?"var(--P)":"#C7D2FE"}`,background:active?"var(--P)":"var(--W)",color:active?"#fff":"var(--T)",cursor:"pointer",fontFamily:"Sarabun,sans-serif",textAlign:"left",transition:"all .15s"}}>
                  <div style={{fontWeight:600,fontSize:13}}>{active&&"✓ "}{a.name}</div>
                  <div style={{fontSize:11,opacity:.7,marginTop:2}}>{a.email}</div>
                </button>;
              })}
            </div>
          </div>

          <div style={{background:"#F0FDF4",borderRadius:10,padding:"14px 16px",marginBottom:18}}>
            <div style={{fontWeight:700,color:"#166634",marginBottom:10,fontSize:14,display:"flex",alignItems:"center",gap:7}}>
              <span style={{background:"var(--G)",color:"#fff",borderRadius:"50%",width:22,height:22,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800}}>2</span>
              ครูกรรมการ (2 คน) — เลือกแล้ว {[t1Id,t2Id].filter(Boolean).length}/2
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(185px,1fr))",gap:7}}>
              {teachers.map(t => {
                const sn=t1Id===t.id?1:t2Id===t.id?2:0, active=sn>0, full=!active&&t1Id&&t2Id;
                return <button key={t.id} disabled={!!full} onClick={()=>pickT(t.id)}
                  style={{padding:"10px 12px",borderRadius:8,border:`2px solid ${active?"var(--G)":"#BBF7D0"}`,background:active?"var(--G)":"var(--W)",color:active?"#fff":"var(--T)",cursor:full?"not-allowed":"pointer",fontFamily:"Sarabun,sans-serif",textAlign:"left",opacity:full?.4:1,transition:"all .15s"}}>
                  <div style={{fontWeight:600,fontSize:13}}>
                    {active && <span style={{background:"#fff",color:"var(--G)",borderRadius:"50%",width:17,height:17,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,marginRight:5}}>{sn}</span>}
                    {t.name}
                  </div>
                  <div style={{fontSize:11,opacity:.7,marginTop:2}}>{t.email}</div>
                </button>;
              })}
            </div>
          </div>

          <button onClick={()=>setStep(2)} disabled={!canStep2} className="btn bp" style={{width:"100%",padding:"12px",fontSize:15}}>ถัดไป: เลือกวันที่และเวลา →</button>
          {!canStep2 && <p style={{fontSize:12,color:"var(--AD)",marginTop:8,textAlign:"center"}}>⚠️ กรุณากรอกข้อมูลและเลือกกรรมการให้ครบ 3 คน</p>}
        </div>
      )}

      {step===2 && (
        <div className="g2" style={{alignItems:"start"}}>
          <div className="card">
            <h3 style={{fontWeight:700,fontSize:15,marginBottom:10}}>เลือกวันที่</h3>
            <div style={{background:"#EEF2FF",borderRadius:8,padding:"9px 12px",marginBottom:12,fontSize:12,color:"#374151",lineHeight:1.8}}>
              <b>กรรมการ 3 ท่าน:</b><br/>
              👔 {users.find(u=>u.id===adminId)?.name}<br/>
              👩‍🏫 {users.find(u=>u.id===t1Id)?.name}<br/>
              👩‍🏫 {users.find(u=>u.id===t2Id)?.name}
            </div>
            <MiniCal year={calY} month={calM} onPrev={prevMon} onNext={nextMon}
              renderCell={(day,ds) => {
                const isPast=ds<todayStr, isBlk=blockedDates.includes(ds), isSel=ds===selDate;
                let bg="var(--W)",col="var(--T)",bc="var(--BD)";
                if (isSel)  { bg="var(--P)";col="#fff";bc="var(--P)"; }
                else if (isBlk) { bg="#FEE2E2";col="#FECACA";bc="#FECACA"; }
                else if (isPast) { bg="#F9FAFB";col="#D1D5DB";bc="#F3F4F6"; }
                return <button key={ds} onClick={()=>{if(!isPast&&!isBlk){setSelDate(ds);setSelTime("");}}} disabled={isPast||isBlk}
                  style={{width:"100%",aspectRatio:"1",border:`1.5px solid ${bc}`,background:bg,color:col,borderRadius:6,cursor:(isPast||isBlk)?"not-allowed":"pointer",fontSize:12,fontFamily:"Sarabun,sans-serif",fontWeight:isSel?700:400,transition:"all .15s"}}>{day}</button>;
              }}
            />
          </div>
          <div className="card">
            <h3 style={{fontWeight:700,fontSize:15,marginBottom:8}}>เลือกเวลา</h3>
            {!selDate
              ? <p style={{color:"#D1D5DB",fontSize:14,marginTop:8}}>← กรุณาเลือกวันที่ก่อน</p>
              : <>
                  <p style={{fontSize:12,color:"var(--TS)",marginBottom:10}}>{fmtDate(selDate)} — 🟥 กรรมการไม่ว่าง</p>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
                    {TIME_SLOTS.map(t => {
                      const blocked=blockedTimesFor(selDate).includes(t), isSel=selTime===t;
                      return <button key={t} disabled={blocked} onClick={()=>setSelTime(t)}
                        style={{padding:"10px 2px",borderRadius:8,border:"1.5px solid",fontSize:13,fontFamily:"Sarabun,sans-serif",fontWeight:isSel?700:400,cursor:blocked?"not-allowed":"pointer",
                          borderColor:isSel?"var(--P)":blocked?"#FECACA":"var(--BD)",background:isSel?"var(--P)":blocked?"#FEF2F2":"var(--W)",color:isSel?"#fff":blocked?"#FECACA":"var(--T)",transition:"all .15s"}}>{t}</button>;
                    })}
                  </div>
                </>
            }
            {selDate && selTime && (
              <button onClick={submit} className="btn bg" style={{width:"100%",padding:"13px",fontSize:15,marginTop:16}}>📌 ยืนยันการจอง</button>
            )}
            <button onClick={()=>setStep(1)} className="btn bx" style={{width:"100%",marginTop:8,fontSize:13}}>← กลับแก้ไข</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
//  SUMMARY PAGE
// ═══════════════════════════════════════════════
function SummaryPage({ currentUser, bookings, structure }) {
  const [filter, setFilter] = useState("all");
  const [detail, setDetail] = useState(null);

  const visible  = currentUser.role==="teacher" ? bookings.filter(b=>b.teacherId===currentUser.id) : bookings;
  const sorted   = [...visible].sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
  const filtered = sorted.filter(b => filter==="all"?true:filter==="pending"?!isFullyEval(b):isFullyEval(b));
  const evaled   = visible.filter(isFullyEval);
  const allPcts  = evaled.map(b=>calcAvgScore(b,structure)?.avgPct).filter(n=>n!=null);
  const avgPct   = allPcts.length>0 ? Math.round(allPcts.reduce((a,n)=>a+n,0)/allPcts.length) : null;

  const statusBadge = b => {
    const total=evalIds(b).length, done=submittedCount(b);
    if (done===0)    return <span className="badge-p">⏳ รอประเมิน</span>;
    if (done<total)  return <span className="badge-part">🔵 {done}/{total} คน</span>;
    return                  <span className="badge-d">✅ ครบแล้ว</span>;
  };

  return (
    <div>
      <div style={{marginBottom:18}}>
        <h2 style={{fontWeight:800,fontSize:21,color:"var(--P)"}}>{currentUser.role==="teacher"?"📊 ผลการนิเทศของฉัน":"📊 สรุปผลการนิเทศทั้งหมด"}</h2>
      </div>
      <div className="g3" style={{marginBottom:18}}>
        {[{lb:"ทั้งหมด",n:visible.length,c:"var(--P)",ic:"📋"},{lb:"รอ/กำลัง",n:visible.filter(b=>!isFullyEval(b)).length,c:"#D97706",ic:"⏳"},{lb:"ครบแล้ว",n:evaled.length,c:"var(--G)",ic:"✅"}].map(s=>(
          <div key={s.lb} className="card" style={{textAlign:"center",borderTop:`3px solid ${s.c}`,padding:"14px 8px"}}>
            <div style={{fontSize:20}}>{s.ic}</div>
            <div style={{fontSize:26,fontWeight:800,color:s.c,lineHeight:1.1}}>{s.n}</div>
            <div style={{fontSize:12,color:"var(--TS)",marginTop:2}}>{s.lb}</div>
          </div>
        ))}
      </div>

      {avgPct!==null && (
        <div className="card" style={{marginBottom:18,background:"#EEF2FF",borderLeft:"4px solid var(--P)",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px"}}>
          <span style={{fontWeight:600}}>คะแนนเฉลี่ยภาพรวม</span>
          <span style={{fontWeight:800,fontSize:20,color:gradeOf(avgPct).color}}>{avgPct}% — {gradeOf(avgPct).label}</span>
        </div>
      )}

      <div style={{display:"flex",gap:7,marginBottom:12,flexWrap:"wrap"}}>
        {[["all","ทั้งหมด"],["pending","รอ/กำลัง"],["done","ครบแล้ว"]].map(([v,lb])=>(
          <button key={v} onClick={()=>setFilter(v)} className={`btn ${filter===v?"bp":"bx"}`}>{lb}</button>
        ))}
      </div>

      <div className="card" style={{padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{background:"var(--P)",color:"#fff"}}>
              {["#","ชื่อ-สกุล","วิชา","ชั้น","วันที่","เวลา","กรรมการ","สถานะ","คะแนนเฉลี่ย",""].map((h,i)=>(
                <th key={i} style={{padding:"10px",textAlign:"left",whiteSpace:"nowrap",fontWeight:700}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.length===0 && <tr><td colSpan={10} style={{padding:36,textAlign:"center",color:"#D1D5DB"}}>ไม่มีข้อมูล</td></tr>}
              {filtered.map((b,idx) => {
                const sc=calcAvgScore(b,structure);
                return (
                  <tr key={b.id} style={{background:idx%2?"#F9FAFB":"var(--W)",borderBottom:"1px solid var(--BD)"}}>
                    <td style={{padding:"9px 10px",color:"var(--TS)"}}>{idx+1}</td>
                    <td style={{padding:"9px 10px",fontWeight:600,whiteSpace:"nowrap"}}>{b.teacherName}</td>
                    <td style={{padding:"9px 10px"}}>{b.subject}</td>
                    <td style={{padding:"9px 10px"}}>{b.classRoom}</td>
                    <td style={{padding:"9px 10px",whiteSpace:"nowrap"}}>{fmtDate(b.date)}</td>
                    <td style={{padding:"9px 10px"}}>{b.time}</td>
                    <td style={{padding:"9px 10px",fontSize:11,color:"#555",minWidth:140,lineHeight:1.7}}>
                      <div>👔 {b.adminName} {b.evals?.[b.adminId]?.submitted?"✅":""}</div>
                      <div>👩‍🏫 {b.teacher1Name} {b.evals?.[b.teacher1Id]?.submitted?"✅":""}</div>
                      <div>👩‍🏫 {b.teacher2Name} {b.evals?.[b.teacher2Id]?.submitted?"✅":""}</div>
                    </td>
                    <td style={{padding:"9px 10px"}}>{statusBadge(b)}</td>
                    <td style={{padding:"9px 10px"}}>
                      {sc ? <span style={{fontWeight:700,color:gradeOf(sc.avgPct).color}}>{sc.avgTotal}/{sc.maxTotal} ({sc.avgPct}%)</span> : <span style={{color:"#D1D5DB"}}>—</span>}
                    </td>
                    <td style={{padding:"9px 10px"}}>
                      {sc && <button onClick={()=>setDetail(b)} className="btn bx" style={{padding:"4px 9px",fontSize:12}}>ดู</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {detail && (() => {
        const sc=calcAvgScore(detail,structure);
        return (
          <div onClick={()=>setDetail(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
            <div onClick={e=>e.stopPropagation()} style={{background:"var(--W)",borderRadius:14,maxWidth:520,width:"100%",maxHeight:"88vh",overflow:"auto"}}>
              <div style={{background:"var(--P)",color:"#fff",padding:"14px 18px",borderRadius:"14px 14px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontWeight:700,fontSize:16}}>{detail.teacherName}</div>
                  <div style={{fontSize:12,opacity:.8}}>{detail.subject} · {fmtDate(detail.date)} {detail.time}</div>
                </div>
                <button onClick={()=>setDetail(null)} style={{background:"none",border:"none",color:"#fff",fontSize:26,cursor:"pointer",lineHeight:1}}>×</button>
              </div>
              <div style={{padding:18}}>
                {evalIds(detail).map(eid => {
                  const ev=detail.evals?.[eid], nm=detail.adminId===eid?detail.adminName:detail.teacher1Id===eid?detail.teacher1Name:detail.teacher2Name;
                  const r=calcOneEval(ev,structure);
                  return (
                    <div key={eid} style={{marginBottom:12,padding:"12px 14px",background:r?"#F0FDF4":"#F9FAFB",borderRadius:9,border:`1px solid ${r?"#BBF7D0":"var(--BD)"}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:r?8:0}}>
                        <span style={{fontWeight:700,fontSize:13}}>{nm}</span>
                        {r ? <span style={{fontWeight:800,color:gradeOf(r.pct).color,fontSize:14}}>{r.total}/{r.maxTotal} ({r.pct}%)</span>
                           : <span style={{color:"#D1D5DB",fontSize:12}}>ยังไม่ได้ประเมิน</span>}
                      </div>
                      {r && r.dims.map((d,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                          <span style={{fontSize:11,color:"var(--TS)",flex:1}}>{d.name}</span>
                          <div style={{width:80,height:6,background:"#E5E7EB",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",background:"var(--G)",width:`${d.max>0?d.score/d.max*100:0}%`}}/></div>
                          <span style={{fontSize:11,fontWeight:700,minWidth:32,textAlign:"right",color:"var(--G)"}}>{d.score}/{d.max}</span>
                        </div>
                      ))}
                      {ev?.comments && <div style={{marginTop:6,fontSize:12,color:"#555",background:"#fff",padding:"6px 10px",borderRadius:6}}><b>ข้อเสนอแนะ:</b> {ev.comments}</div>}
                    </div>
                  );
                })}
                {sc && (
                  <div style={{background:"#EEF2FF",borderRadius:9,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
                    <span style={{fontWeight:700}}>คะแนนเฉลี่ยรวม ({sc.count} ท่าน)</span>
                    <span style={{fontWeight:800,fontSize:18,color:gradeOf(sc.avgPct).color}}>{sc.avgTotal}/{sc.maxTotal} ({sc.avgPct}%) — {gradeOf(sc.avgPct).label}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ═══════════════════════════════════════════════
//  EVALUATE TAB — รองรับ teacher ที่เป็นกรรมการ
// ═══════════════════════════════════════════════
function EvaluateTab({ currentUser, bookings, structure, onSave }) {
  const [sel,      setSel     ] = useState(null);
  const [scores,   setScores  ] = useState({});
  const [comments, setComments] = useState("");
  const [saved,    setSaved   ] = useState(false);

  // ★ FIX: ครูที่เป็นกรรมการเห็นแบบประเมินของตัวเองได้
  const myQueue = currentUser.role==="sysadmin"
    ? bookings
    : bookings.filter(b=>b.adminId===currentUser.id||b.teacher1Id===currentUser.id||b.teacher2Id===currentUser.id);

  const pending = [...myQueue].filter(b=>!b.evals?.[currentUser.id]?.submitted).sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
  const done    = [...myQueue].filter(b=>b.evals?.[currentUser.id]?.submitted).sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));

  const openEval = b => {
    setSel(b);
    setScores(b.evals?.[currentUser.id]?.scores||{});
    setComments(b.evals?.[currentUser.id]?.comments||"");
    setSaved(false);
  };

  const saveEval = () => {
    const updated = bookings.map(b => b.id!==sel.id ? b : {
      ...b, evals:{ ...b.evals, [currentUser.id]:{ scores, comments, submitted:true, evaluatorName:currentUser.name, submittedAt:new Date().toISOString() }}
    });
    onSave(updated); setSaved(true);
    setTimeout(()=>{ setSaved(false); setSel(null); }, 1200);
  };

  const totalItems = structure.reduce((a,d)=>a+d.items.length,0);
  const filled     = Object.values(scores).filter(v=>v>0).length;
  let lt=0,lm=0; structure.forEach(d=>d.items.forEach(i=>{ lt+=scores[i.id]||0; lm+=i.maxScore; }));
  const livePct = lm>0 ? Math.round(lt/lm*100) : 0;

  if (sel) return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <button onClick={()=>setSel(null)} className="btn bx" style={{padding:"7px 12px"}}>← กลับ</button>
        <div>
          <div style={{fontWeight:800,color:"var(--P)",fontSize:16}}>{sel.teacherName}</div>
          <div style={{fontSize:13,color:"var(--TS)"}}>{sel.subject} · {sel.classRoom} · {fmtDate(sel.date)} {sel.time}</div>
        </div>
      </div>

      {/* สถานะกรรมการทุกท่าน */}
      <div className="card" style={{marginBottom:12,padding:"12px 16px"}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>สถานะการประเมินกรรมการ 3 ท่าน</div>
        {[{id:sel.adminId,name:sel.adminName},{id:sel.teacher1Id,name:sel.teacher1Name},{id:sel.teacher2Id,name:sel.teacher2Name}].map(ev => {
          const isDone=sel.evals?.[ev.id]?.submitted, isMe=ev.id===currentUser.id;
          const r=calcOneEval(sel.evals?.[ev.id],structure);
          return (
            <div key={ev.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5,padding:"6px 10px",borderRadius:7,background:isMe?"#EEF2FF":"transparent"}}>
              <span style={{fontSize:14}}>{isDone?"✅":"⏳"}</span>
              <span style={{fontWeight:isMe?700:400,fontSize:13,color:isMe?"var(--P)":"var(--T)",flex:1}}>{ev.name}{isMe?" (ท่าน)":""}</span>
              {r && <span style={{fontSize:12,color:gradeOf(r.pct).color,fontWeight:700}}>{r.pct}%</span>}
            </div>
          );
        })}
      </div>

      {/* Progress */}
      <div className="card" style={{marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:6}}>
          <span style={{color:"var(--TS)"}}>ความคืบหน้า</span>
          <span style={{fontWeight:700,color:"var(--P)"}}>{filled}/{totalItems}</span>
        </div>
        <div style={{height:8,background:"#E5E7EB",borderRadius:4,overflow:"hidden"}}>
          <div style={{height:"100%",background:"var(--P)",width:`${totalItems>0?filled/totalItems*100:0}%`,transition:"width .3s",borderRadius:4}} />
        </div>
      </div>

      {/* Score form */}
      {structure.map((dim,di) => (
        <div key={dim.id} className="card" style={{marginBottom:12,borderLeft:"4px solid var(--P)"}}>
          <h4 style={{fontWeight:700,color:"var(--P)",marginBottom:14,fontSize:14}}>{di+1}. {dim.name}</h4>
          {dim.items.map((item,ii) => {
            const sc=scores[item.id]||0;
            return (
              <div key={item.id} style={{marginBottom:16}}>
                <div style={{fontSize:14,fontWeight:500,marginBottom:8}}>{di+1}.{ii+1} {item.name}</div>
                <div style={{display:"flex",gap:7,flexWrap:"wrap",alignItems:"center"}}>
                  {Array.from({length:item.maxScore},(_,si) => {
                    const v=si+1, active=sc===v;
                    return <button key={v} onClick={()=>setScores(p=>({...p,[item.id]:v}))}
                      style={{width:48,height:48,borderRadius:10,border:"2px solid",borderColor:active?"var(--P)":"var(--BD)",background:active?"var(--P)":"var(--W)",color:active?"#fff":"var(--TS)",cursor:"pointer",fontSize:18,fontWeight:active?800:400,fontFamily:"Sarabun,sans-serif",boxShadow:active?"0 4px 12px rgba(30,58,138,.25)":"none",transition:"all .15s"}}>{v}</button>;
                  })}
                  {sc>0 && <span style={{fontSize:12,color:"var(--TS)"}}>{sc===item.maxScore?"⭐ เต็ม":sc>=item.maxScore*.8?"👍 ดีมาก":sc>=item.maxScore*.6?"✓ ผ่าน":"⚠ ควรปรับ"}</span>}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      <div className="card" style={{marginBottom:12}}>
        <div className="frow" style={{marginBottom:0}}>
          <label className="flbl">ข้อเสนอแนะของท่าน</label>
          <textarea className="inp" value={comments} onChange={e=>setComments(e.target.value)} rows={4} style={{resize:"vertical"}} placeholder="เขียนข้อเสนอแนะ..." />
        </div>
      </div>

      <div className="card" style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#EEF2FF",border:"2px solid #C7D2FE"}}>
        <div>
          <div style={{fontSize:11,color:"var(--TS)"}}>คะแนนของท่าน</div>
          <div style={{fontSize:22,fontWeight:800,color:lm>0?gradeOf(livePct).color:"#ccc"}}>{lt}/{lm}{lm>0&&<span style={{fontSize:13,color:"var(--TS)",marginLeft:6}}>({livePct}%) {gradeOf(livePct).label}</span>}</div>
        </div>
        <button onClick={saveEval} className="btn bg" style={{padding:"12px 24px",fontSize:15}}>{saved?"✅ บันทึกแล้ว!":"💾 บันทึกผลประเมิน"}</button>
      </div>
    </div>
  );

  return (
    <div>
      <h3 style={{fontWeight:700,color:"var(--P)",marginBottom:5,fontSize:16}}>แบบประเมินที่ต้องกรอก ({pending.length})</h3>
      <p style={{fontSize:13,color:"var(--TS)",marginBottom:14}}>ท่านถูกเลือกเป็นกรรมการนิเทศ — กรุณากรอกแบบประเมินของท่านเอง</p>
      {pending.length===0 && <div className="card" style={{textAlign:"center",color:"#D1D5DB",padding:36,fontSize:16}}>ไม่มีแบบประเมินค้างอยู่ 🎉</div>}
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:24}}>
        {pending.map(b => {
          const done=submittedCount(b), total=evalIds(b).length;
          return (
            <div key={b.id} className="card" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 16px",gap:10,borderLeft:"4px solid var(--A)"}}>
              <div style={{minWidth:0}}>
                <div style={{fontWeight:700,fontSize:15}}>{b.teacherName}<span style={{fontWeight:400,color:"var(--TS)",fontSize:13,marginLeft:6}}>{b.subject} · {b.classRoom}</span></div>
                <div style={{fontSize:12,color:"var(--TS)",marginTop:2}}>{fmtDate(b.date)} เวลา {b.time}</div>
                <div style={{fontSize:11,color:"#9CA3AF",marginTop:2}}>กรรมการประเมินแล้ว {done}/{total} ท่าน</div>
              </div>
              <button onClick={()=>openEval(b)} className="btn bp" style={{padding:"9px 16px",flexShrink:0}}>📝 กรอกแบบประเมิน</button>
            </div>
          );
        })}
      </div>
      {done.length>0 && (
        <>
          <h3 style={{fontWeight:700,color:"var(--G)",marginBottom:10,fontSize:14}}>กรอกแล้ว ({done.length})</h3>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {done.map(b => {
              const r=calcOneEval(b.evals?.[currentUser.id],structure);
              return (
                <div key={b.id} className="card" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",opacity:.85}}>
                  <div>
                    <div style={{fontWeight:600,fontSize:14}}>{b.teacherName}<span style={{fontWeight:400,color:"var(--TS)"}}>— {b.subject}</span></div>
                    <div style={{fontSize:12,color:"#9CA3AF"}}>{fmtDate(b.date)} {b.time}</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    {r && <span style={{fontWeight:800,color:gradeOf(r.pct).color}}>{r.total}/{r.maxTotal} ({r.pct}%)</span>}
                    <button onClick={()=>openEval(b)} className="btn bx" style={{padding:"5px 11px",fontSize:12}}>แก้ไข</button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
//  CALENDAR TAB
// ═══════════════════════════════════════════════
function CalendarTab({ blockedDates, onSave }) {
  const [blocked, setBlocked] = useState([...blockedDates]);
  const [calY, setCalY] = useState(new Date().getFullYear());
  const [calM, setCalM] = useState(new Date().getMonth());
  const todayStr = today();
  const toggle = ds => { const nb=blocked.includes(ds)?blocked.filter(d=>d!==ds):[...blocked,ds]; setBlocked(nb); onSave(nb); };
  return (
    <div>
      <h3 style={{fontWeight:700,color:"var(--P)",marginBottom:5,fontSize:16}}>จัดการวันที่ปิดรับจอง</h3>
      <p style={{color:"var(--TS)",fontSize:13,marginBottom:16}}>คลิกวันที่เพื่อ <b>ปิด/เปิด</b> — สีแดง = ปิดรับจอง</p>
      <div style={{display:"flex",gap:18,flexWrap:"wrap",alignItems:"start"}}>
        <div className="card" style={{width:290,flexShrink:0}}>
          <MiniCal year={calY} month={calM}
            onPrev={()=>{ if(calM===0){setCalY(y=>y-1);setCalM(11);}else setCalM(m=>m-1); }}
            onNext={()=>{ if(calM===11){setCalY(y=>y+1);setCalM(0);}else setCalM(m=>m+1); }}
            renderCell={(d,ds) => {
              const isPast=ds<todayStr, isBlk=blocked.includes(ds);
              return <button key={ds} onClick={()=>!isPast&&toggle(ds)}
                style={{width:"100%",aspectRatio:"1",border:"1.5px solid",fontSize:12,fontFamily:"Sarabun,sans-serif",cursor:isPast?"default":"pointer",
                  borderColor:isBlk?"#FECACA":isPast?"#F3F4F6":"var(--BD)",background:isBlk?"#FEE2E2":isPast?"#F9FAFB":"var(--W)",
                  color:isBlk?"var(--R)":isPast?"#D1D5DB":"var(--T)",fontWeight:isBlk?700:400,borderRadius:6,transition:"all .15s"}}>{d}</button>;
            }} />
        </div>
        <div className="card" style={{flex:1,minWidth:200}}>
          <h4 style={{fontWeight:700,color:"var(--R)",marginBottom:12,fontSize:14}}>🔴 วันปิด ({blocked.length})</h4>
          {blocked.length===0
            ? <p style={{color:"#D1D5DB",fontSize:13}}>ไม่มี</p>
            : <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {blocked.sort().map(d => (
                  <div key={d} style={{display:"flex",alignItems:"center",gap:5,background:"#FEE2E2",borderRadius:20,padding:"4px 10px 4px 13px",fontSize:13}}>
                    <span style={{color:"var(--R)",fontWeight:600}}>{fmtDate(d)}</span>
                    <button onClick={()=>toggle(d)} style={{background:"none",border:"none",cursor:"pointer",color:"#FECACA",fontSize:18,lineHeight:1,padding:0}}>×</button>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  STRUCTURE TAB
// ═══════════════════════════════════════════════
function StructureTab({ structure, onSave }) {
  const [dims, setDims] = useState(()=>structure.map(d=>({...d,items:d.items.map(i=>({...i}))})));
  const [saved, setSaved] = useState(false);
  const save = () => { onSave(dims); setSaved(true); setTimeout(()=>setSaved(false),2000); };
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <h3 style={{fontWeight:700,color:"var(--P)",fontSize:16}}>📝 โครงสร้างแบบประเมิน</h3>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setDims(p=>[...p,{id:uid(),name:"ด้านใหม่",items:[{id:uid(),name:"หัวข้อใหม่",maxScore:5}]}])} className="btn ba">+ เพิ่มด้าน</button>
          <button onClick={save} className="btn bp">💾 {saved?"บันทึกแล้ว!":"บันทึก"}</button>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {dims.map((dim,di) => (
          <div key={dim.id} className="card" style={{borderLeft:"4px solid var(--P)",padding:16}}>
            <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12}}>
              <span style={{background:"var(--P)",color:"#fff",width:26,height:26,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,flexShrink:0}}>{di+1}</span>
              <input className="inp" value={dim.name} onChange={e=>setDims(p=>p.map(d=>d.id===dim.id?{...d,name:e.target.value}:d))} style={{flex:1}} />
              <button onClick={()=>setDims(p=>p.filter(d=>d.id!==dim.id))} className="btn br" style={{padding:"5px 10px",fontSize:12}}>ลบ</button>
            </div>
            <div style={{paddingLeft:34,display:"flex",flexDirection:"column",gap:5}}>
              {dim.items.map((item,ii) => (
                <div key={item.id} style={{display:"flex",gap:6,alignItems:"center"}}>
                  <span style={{fontSize:11,color:"#9CA3AF",minWidth:24}}>{di+1}.{ii+1}</span>
                  <input className="inp" value={item.name}
                    onChange={e=>setDims(p=>p.map(d=>d.id===dim.id?{...d,items:d.items.map(it=>it.id===item.id?{...it,name:e.target.value}:it)}:d))} style={{flex:1}} />
                  <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                    <span style={{fontSize:11,color:"var(--TS)"}}>เต็ม</span>
                    <input type="number" className="inp" value={item.maxScore} min={1} max={10}
                      onChange={e=>setDims(p=>p.map(d=>d.id===dim.id?{...d,items:d.items.map(it=>it.id===item.id?{...it,maxScore:Math.max(1,parseInt(e.target.value)||5)}:it)}:d))}
                      style={{width:54}} />
                  </div>
                  <button onClick={()=>setDims(p=>p.map(d=>d.id===dim.id?{...d,items:d.items.filter(it=>it.id!==item.id)}:d))}
                    style={{background:"none",border:"none",cursor:"pointer",color:"#FECACA",fontSize:20,lineHeight:1,padding:"0 2px"}}>×</button>
                </div>
              ))}
              <button onClick={()=>setDims(p=>p.map(d=>d.id===dim.id?{...d,items:[...d.items,{id:uid(),name:"หัวข้อใหม่",maxScore:5}]}:d))}
                style={{background:"none",border:"1.5px dashed #C7D2FE",borderRadius:7,padding:"6px 12px",cursor:"pointer",color:"var(--P)",fontSize:13,fontFamily:"Sarabun,sans-serif",marginTop:3,textAlign:"left"}}>
                + เพิ่มหัวข้อย่อย
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  USERS TAB — admin ตั้งรหัสผ่านได้
// ═══════════════════════════════════════════════
function UsersTab({ users, settings, onSave }) {
  const [list,  setList ] = useState([...users]);
  const [form,  setForm ] = useState({name:"",email:"",role:"teacher",password:""});
  const [err,   setErr  ] = useState("");
  const [saved, setSaved] = useState(false);
  const [showPw,setShowPw] = useState({});
  const domain = settings.domain || DEFAULT_DOMAIN;

  const addUser = () => {
    if (!form.name.trim()||!form.email.trim()) { setErr("กรุณากรอกชื่อและอีเมล"); return; }
    const em = form.email.trim().toLowerCase();
    if (!em.endsWith("@"+domain)) { setErr(`อีเมลต้องเป็น @${domain}`); return; }
    if (list.find(u=>u.email.toLowerCase()===em)) { setErr("อีเมลนี้มีอยู่แล้ว"); return; }
    if (!form.password||form.password.length<4) { setErr("รหัสผ่านต้องมีอย่างน้อย 4 ตัว"); return; }
    setList(p=>[...p,{id:uid(),name:form.name.trim(),email:em,role:form.role,password:form.password}]);
    setForm({name:"",email:"",role:"teacher",password:""}); setErr("");
  };

  const removeUser = id => setList(p=>p.filter(u=>u.id!==id));
  const updatePw   = (id,pw) => setList(p=>p.map(u=>u.id===id?{...u,password:pw}:u));
  const saveAll    = () => { onSave(list); setSaved(true); setTimeout(()=>setSaved(false),2000); };

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <h3 style={{fontWeight:700,color:"var(--P)",fontSize:16}}>👥 จัดการผู้ใช้งาน</h3>
        <button onClick={saveAll} className="btn bp">💾 {saved?"บันทึกแล้ว!":"บันทึกทั้งหมด"}</button>
      </div>

      <div className="card" style={{marginBottom:16,background:"#F0F4FF",border:"1.5px dashed #C7D2FE"}}>
        <h4 style={{fontWeight:700,color:"var(--P)",marginBottom:4,fontSize:14}}>+ เพิ่มผู้ใช้ใหม่</h4>
        <p style={{fontSize:12,color:"var(--TS)",marginBottom:12}}>อีเมลต้องลงท้ายด้วย <b>@{domain}</b></p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 130px auto",gap:8,alignItems:"end"}}>
          {[["ชื่อ-สกุล","name","text","ชื่อ-สกุล"],["อีเมล","email","email",`name@${domain}`],["รหัสผ่าน","password","password","รหัสผ่าน"]].map(([lb,k,type,ph])=>(
            <div key={k} style={{display:"flex",flexDirection:"column",gap:4}}>
              <label className="flbl">{lb}</label>
              <input className="inp" type={type} value={form[k]} placeholder={ph} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} />
            </div>
          ))}
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            <label className="flbl">บทบาท</label>
            <select className="inp" value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))}>
              <option value="teacher">ครูผู้สอน</option>
              <option value="admin">ผู้บริหาร</option>
              <option value="sysadmin">ผู้ดูแลระบบ</option>
            </select>
          </div>
          <button onClick={addUser} className="btn bg" style={{height:42}}>+ เพิ่ม</button>
        </div>
        {err && <p style={{color:"var(--R)",fontSize:13,marginTop:8,fontWeight:600}}>⚠️ {err}</p>}
      </div>

      {[["👔 ผู้บริหาร",list.filter(u=>u.role==="admin"),"admin"],["👩‍🏫 ครูผู้สอน",list.filter(u=>u.role==="teacher"),"teacher"],["🔧 ผู้ดูแลระบบ",list.filter(u=>u.role==="sysadmin"),"sysadmin"]].map(([title,grp,role])=>(
        <div key={role} style={{marginBottom:16}}>
          <h4 style={{fontWeight:700,color:ROLE_COLOR[role],marginBottom:8,fontSize:14}}>{title} ({grp.length})</h4>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {grp.map(u=>(
              <div key={u.id} style={{display:"flex",alignItems:"center",gap:10,background:"var(--W)",borderRadius:9,padding:"9px 14px",border:"1px solid var(--BD)",flexWrap:"wrap"}}>
                <div style={{width:36,height:36,borderRadius:"50%",background:ROLE_COLOR[u.role],display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:14,fontWeight:700,flexShrink:0}}>{u.name.slice(0,1)}</div>
                <div style={{flex:1,minWidth:100}}>
                  <div style={{fontWeight:600,fontSize:14}}>{u.name}</div>
                  <div style={{fontSize:12,color:"var(--TS)"}}>{u.email}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
                  <input type={showPw[u.id]?"text":"password"} defaultValue={u.password}
                    onBlur={e=>updatePw(u.id,e.target.value)}
                    style={{width:110,padding:"5px 8px",border:"1.5px solid var(--BD)",borderRadius:6,fontSize:12,fontFamily:"Sarabun,sans-serif"}}
                    placeholder="รหัสผ่าน" />
                  <button onClick={()=>setShowPw(p=>({...p,[u.id]:!p[u.id]}))} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,padding:0,color:"var(--TS)"}}>
                    {showPw[u.id]?"🙈":"👁️"}
                  </button>
                </div>
                {u.role!=="sysadmin" && <button onClick={()=>removeUser(u.id)} className="btn br" style={{padding:"4px 10px",fontSize:12,flexShrink:0}}>ลบ</button>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════
//  SETTINGS TAB
// ═══════════════════════════════════════════════
function SettingsTab({ settings, onSave }) {
  const [sn,     setSn    ] = useState(settings.schoolName);
  const [domain, setDomain] = useState(settings.domain||DEFAULT_DOMAIN);
  const [logo,   setLogo  ] = useState(settings.logo);
  const [msg,    setMsg   ] = useState("");
  const fileRef = useRef();
  const handleLogo = e => { const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=()=>setLogo(r.result); r.readAsDataURL(f); };
  const save = () => { onSave({...settings,schoolName:sn.trim()||settings.schoolName,domain:domain.trim()||settings.domain,logo}); setMsg("✅ บันทึกสำเร็จ"); setTimeout(()=>setMsg(""),2500); };
  return (
    <div className="card" style={{maxWidth:500}}>
      <h3 style={{fontWeight:700,color:"var(--P)",marginBottom:18,fontSize:16}}>⚙️ ข้อมูลสถานศึกษา</h3>
      <div className="frow"><label className="flbl">ชื่อสถานศึกษา</label><input className="inp" value={sn} onChange={e=>setSn(e.target.value)} /></div>
      <div className="frow">
        <label className="flbl">โดเมนอีเมล</label>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontWeight:600,color:"var(--TS)",fontSize:14}}>@</span>
          <input className="inp" value={domain} onChange={e=>setDomain(e.target.value)} placeholder="banmi.ac.th" />
        </div>
      </div>
      <div className="frow">
        <label className="flbl">โลโก้โรงเรียน</label>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          {logo ? <img src={logo} style={{width:60,height:60,borderRadius:9,objectFit:"cover",border:"1.5px solid var(--BD)"}} />
                : <div style={{width:60,height:60,borderRadius:9,background:"#EEF2FF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>🏫</div>}
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            <input type="file" ref={fileRef} onChange={handleLogo} accept="image/*" style={{display:"none"}} />
            <button onClick={()=>fileRef.current.click()} className="btn bx" style={{fontSize:13}}>📁 อัพโหลด</button>
            {logo && <button onClick={()=>setLogo(null)} className="btn br" style={{fontSize:12,padding:"5px 10px"}}>ลบรูป</button>}
          </div>
        </div>
      </div>
      {msg && <div style={{color:"var(--G)",fontWeight:700,fontSize:13,marginBottom:10}}>{msg}</div>}
      <button onClick={save} className="btn bp">💾 บันทึกการตั้งค่า</button>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  REPORTS TAB
// ═══════════════════════════════════════════════
function ReportsTab({ bookings, structure, settings }) {
  const [selId, setSelId] = useState("");
  const fullyEvaled = [...bookings].filter(isFullyEval).sort((a,b)=>a.date.localeCompare(b.date));
  const selB  = bookings.find(b=>b.id===selId);
  const selSC = selB ? calcAvgScore(selB,structure) : null;

  const printSummary = () => {
    const rows = [...bookings].sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)).map((b,i) => {
      const sc=calcAvgScore(b,structure);
      return `<tr><td>${i+1}</td><td>${b.teacherName}</td><td>${b.subject}</td><td>${b.classRoom}</td>
        <td>${fmtDate(b.date)}</td><td>${b.time}</td><td>${b.adminName}</td><td>${b.teacher1Name}, ${b.teacher2Name}</td>
        <td>${submittedCount(b)}/${evalIds(b).length} ท่าน</td>
        <td style="text-align:center;font-weight:700">${sc?`${sc.avgTotal}/${sc.maxTotal} (${sc.avgPct}%)`:"—"}</td>
        <td style="color:${sc?gradeOf(sc.avgPct).color:"#ccc"}">${sc?gradeOf(sc.avgPct).label:"—"}</td></tr>`;
    }).join("");
    const win = window.open("","_blank");
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>สรุปนิเทศ</title>
      <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap" rel="stylesheet">
      <style>body{font-family:'Sarabun',sans-serif;margin:15mm;font-size:12px}h1{color:#1E3A8A;font-size:18px;border-bottom:3px solid #1E3A8A;padding-bottom:5px}
      table{width:100%;border-collapse:collapse;margin-top:12px}th{background:#1E3A8A;color:white;padding:6px 8px;font-size:11px;text-align:left}
      td{padding:5px 8px;border-bottom:1px solid #eee}tr:nth-child(even){background:#f9f9f9}
      @media print{@page{margin:12mm;size:A4 landscape}}</style></head><body>
      ${settings.logo?`<img src="${settings.logo}" style="height:48px;margin-bottom:6px"/>`:""}
      <h1>${settings.schoolName}</h1><h2 style="font-size:14px;color:#555;margin:3px 0 10px">สรุปผลการนิเทศการสอน</h2>
      <table><thead><tr><th>#</th><th>ชื่อ-สกุล</th><th>วิชา</th><th>ชั้น</th><th>วันที่</th><th>เวลา</th><th>ผู้บริหาร</th><th>ครูกรรมการ</th><th>สถานะ</th><th>คะแนนเฉลี่ย</th><th>ระดับ</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <p style="margin-top:14px;font-size:10px;color:#999">พิมพ์เมื่อ ${new Date().toLocaleString("th-TH")}</p>
      <script>window.onload=()=>window.print();</script></body></html>`);
    win.document.close();
  };

  return (
    <div>
      <h3 style={{fontWeight:700,color:"var(--P)",marginBottom:18,fontSize:16}}>📄 พิมพ์รายงาน</h3>
      <div className="g2" style={{alignItems:"start"}}>
        <div className="card">
          <h4 style={{fontWeight:700,color:"var(--P)",marginBottom:8,fontSize:15}}>📊 สรุปภาพรวมทั้งหมด</h4>
          <p style={{fontSize:13,color:"var(--TS)",marginBottom:16,lineHeight:1.7}}>ทั้งหมด <b>{bookings.length}</b> ราย | ครบแล้ว <b>{fullyEvaled.length}</b> ราย</p>
          <button onClick={printSummary} className="btn bp" style={{width:"100%",padding:"12px"}}>🖨️ พิมพ์สรุปภาพรวม</button>
        </div>
        <div className="card">
          <h4 style={{fontWeight:700,color:"var(--P)",marginBottom:8,fontSize:15}}>👤 รายงานรายบุคคล</h4>
          <div className="frow">
            <label className="flbl">เลือกครู (ที่กรรมการครบแล้ว)</label>
            <select className="inp" value={selId} onChange={e=>setSelId(e.target.value)}>
              <option value="">— เลือกครู —</option>
              {fullyEvaled.map(b=><option key={b.id} value={b.id}>{b.teacherName} — {b.subject} ({fmtDate(b.date)})</option>)}
            </select>
          </div>
          {selSC && <div style={{background:"#F0FDF4",borderRadius:8,padding:"8px 12px",marginBottom:12,fontSize:13,border:"1px solid #BBF7D0"}}>
            <b style={{color:gradeOf(selSC.avgPct).color}}>{selSC.avgTotal}/{selSC.maxTotal} ({selSC.avgPct}%) — {gradeOf(selSC.avgPct).label}</b>
          </div>}
          <button disabled={!selId} className="btn ba" style={{width:"100%",padding:"12px"}}>🖨️ พิมพ์รายงานบุคคล</button>
        </div>
      </div>
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
  const [users,        setUsers       ] = useState(DEF_USERS);

  useEffect(()=>{
    const s  = DB.get("sv5_settings");
    const st = DB.get("sv5_structure");
    const bk = DB.get("sv5_bookings");
    const bd = DB.get("sv5_blocked");
    const us = DB.get("sv5_users");
    if(s)  setSettings(s);
    if(st) setStructure(st);
    if(bk) setBookings(bk);
    if(bd) setBlockedDates(bd);
    if(us) setUsers(us);
    setLoaded(true);
  },[]);

  const saveSettings     = v => { setSettings(v);     DB.set("sv5_settings",  v); };
  const saveStructure    = v => { setStructure(v);    DB.set("sv5_structure", v); };
  const saveBookings     = v => { setBookings(v);     DB.set("sv5_bookings",  v); };
  const saveBlockedDates = v => { setBlockedDates(v); DB.set("sv5_blocked",   v); };
  const saveUsers        = v => { setUsers(v);        DB.set("sv5_users",     v); };

  const handleLogin  = u => { setCurrentUser(u); setPage(u.role==="teacher"?"booking":"summary"); };
  const handleLogout = () => { setCurrentUser(null); setPage(""); };

  // Nav — ครูที่เป็นกรรมการเห็น tab ประเมินด้วย
  const getNav = useCallback(() => {
    if (!currentUser) return [];
    if (currentUser.role==="sysadmin") return [
      ["summary","📊","สรุปผล"],["evaluate","📝","ประเมิน"],["schedule","📋","ตารางนิเทศ"],
      ["calendar","📅","ปฏิทิน"],["reports","📄","รายงาน"],["structure","🗂","แบบประเมิน"],["users","👥","ผู้ใช้"],["settings","⚙️","ตั้งค่า"]
    ];
    if (currentUser.role==="admin") return [
      ["summary","📊","สรุปผล"],["evaluate","📝","ประเมิน"],["schedule","📋","ตารางนิเทศ"],
      ["calendar","📅","ปฏิทิน"],["reports","📄","รายงาน"]
    ];
    // teacher — เพิ่ม evaluate ถ้าเป็นกรรมการ
    const nav = [["booking","📅","จองเวลา"],["summary","📊","ผลของฉัน"]];
    if (isEvaluator(currentUser.id, bookings)) nav.push(["evaluate","📝","ประเมิน"]);
    return nav;
  }, [currentUser, bookings]);

  const navItems = getNav();
  const pendingCount = currentUser
    ? bookings.filter(b =>
        !b.evals?.[currentUser.id]?.submitted &&
        (currentUser.role==="sysadmin"||b.adminId===currentUser.id||b.teacher1Id===currentUser.id||b.teacher2Id===currentUser.id)
      ).length
    : 0;

  if (!loaded) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",flexDirection:"column",gap:12,fontFamily:"Sarabun,sans-serif"}}>
      <style>{CSS}</style>
      <div style={{fontSize:46}}>🏫</div>
      <div style={{fontSize:17,color:"#6B7280"}}>กำลังโหลดระบบ...</div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",fontFamily:"'Sarabun',sans-serif"}}>
      <style>{CSS}</style>

      {currentUser && (
        <header className="np" style={{background:"linear-gradient(135deg,#1E3A8A 0%,#1E40AF 100%)",color:"#fff",padding:"10px 16px",position:"sticky",top:0,zIndex:300,boxShadow:"0 3px 16px rgba(0,0,0,.22)"}}>
          <div style={{maxWidth:1040,margin:"0 auto",display:"flex",alignItems:"center",gap:10}}>
            {settings.logo
              ? <img src={settings.logo} style={{width:40,height:40,borderRadius:8,objectFit:"cover"}} />
              : <div style={{width:40,height:40,borderRadius:8,background:"rgba(255,255,255,.18)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🏫</div>}
            <div style={{minWidth:0,marginRight:4}}>
              <div style={{fontWeight:800,fontSize:14,lineHeight:1.2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:180}}>{settings.schoolName}</div>
              <div style={{fontSize:11,opacity:.75}}>{currentUser.name}<span style={{background:"rgba(255,255,255,.2)",padding:"1px 7px",borderRadius:20,fontSize:10,fontWeight:700,marginLeft:4}}>{ROLES[currentUser.role]}</span></div>
            </div>
            <nav style={{display:"flex",gap:3,flexWrap:"wrap",flex:1}}>
              {navItems.map(([id,icon,lb]) => {
                const active = page===id;
                return (
                  <button key={id} onClick={()=>setPage(id)}
                    style={{padding:"6px 11px",borderRadius:7,cursor:"pointer",fontFamily:"Sarabun,sans-serif",fontSize:13,fontWeight:active?700:500,
                      background:active?"rgba(255,255,255,.22)":"transparent",border:`1.5px solid ${active?"rgba(255,255,255,.45)":"transparent"}`,
                      color:active?"#fff":"rgba(255,255,255,.78)",display:"inline-flex",alignItems:"center",gap:4,transition:"all .18s"}}>
                    <span>{icon}</span><span className="hsm">{lb}</span>
                    {id==="evaluate" && pendingCount>0 && (
                      <span style={{background:"#F59E0B",color:"#1a0000",borderRadius:20,padding:"0 5px",fontSize:10,fontWeight:800}}>{pendingCount}</span>
                    )}
                  </button>
                );
              })}
            </nav>
            <button onClick={handleLogout} style={{padding:"6px 12px",borderRadius:7,cursor:"pointer",fontFamily:"Sarabun,sans-serif",fontSize:12,background:"transparent",border:"1.5px solid rgba(255,255,255,.35)",color:"rgba(255,255,255,.75)",fontWeight:500,flexShrink:0}}>ออก</button>
          </div>
        </header>
      )}

      <main style={{maxWidth:1040,margin:"0 auto",padding:currentUser?"22px 14px 56px":"0"}}>
        {!currentUser && <LoginPage users={users} settings={settings} onLogin={handleLogin} />}
        {currentUser && page==="booking"   && currentUser.role==="teacher"  && <BookingPage   currentUser={currentUser} users={users} bookings={bookings} blockedDates={blockedDates} onSave={saveBookings} />}
        {currentUser && page==="summary"                                     && <SummaryPage   currentUser={currentUser} bookings={bookings} structure={structure} />}
        {currentUser && page==="evaluate"                                    && <EvaluateTab   currentUser={currentUser} bookings={bookings} structure={structure} onSave={saveBookings} />}
        {currentUser && page==="schedule"                                    && <ScheduleSummary bookings={bookings} users={users} />}
        {currentUser && page==="calendar"  && currentUser.role!=="teacher"  && <CalendarTab   blockedDates={blockedDates} onSave={saveBlockedDates} />}
        {currentUser && page==="reports"   && currentUser.role!=="teacher"  && <ReportsTab    bookings={bookings} structure={structure} settings={settings} />}
        {currentUser && page==="structure" && currentUser.role==="sysadmin" && <StructureTab  structure={structure} onSave={saveStructure} />}
        {currentUser && page==="users"     && currentUser.role==="sysadmin" && <UsersTab      users={users} settings={settings} onSave={saveUsers} />}
        {currentUser && page==="settings"  && currentUser.role==="sysadmin" && <SettingsTab   settings={settings} onSave={saveSettings} />}
      </main>
    </div>
  );
}