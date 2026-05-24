/**
 * patch-multi-role.js
 * ─────────────────────────────────────────────────────────────────
 * รันด้วย: node patch-multi-role.js
 * (รันในโฟลเดอร์ root ของโปรเจกต์ ที่มี src/App.jsx)
 *
 * สิ่งที่ script นี้แก้:
 *  1. เพิ่ม helper: hasRole / getRoles / getPrimaryRole / getRoleLabel
 *  2. UserModal  → checkbox หลายบทบาท (roles[])
 *  3. UsersTab   → filter/save/display ใช้ roles[]
 *                  inline dropdown → checkboxes
 *  4. LoginPage  → approved & register ใช้ roles[]
 *  5. handleLogin → redirect ตาม roles[]
 *  6. getNav     → ตรวจ roles[]  (teacher+admin ได้เมนูรวม)
 *  7. Header     → แสดงทุก role label
 *  8. page render → ตรวจ roles[]
 *  9. DashboardPage / BookingPage / SummaryPage / EvaluateTab
 * ─────────────────────────────────────────────────────────────────
 */

const fs   = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "src", "App.jsx");

if (!fs.existsSync(FILE)) {
  console.error("❌  ไม่พบ src/App.jsx — กรุณารันในโฟลเดอร์ root");
  process.exit(1);
}

let src = fs.readFileSync(FILE, "utf8");
fs.writeFileSync(FILE + ".bak", src);
console.log("✅  backup → src/App.jsx.bak\n");

let ok = 0, skip = 0;

function rep(label, from, to) {
  if (!src.includes(from)) { console.warn(`⚠   [${label}] — pattern ไม่พบ (ข้าม)`); skip++; return; }
  src = src.split(from).join(to);
  console.log(`✔   [${label}]`);
  ok++;
}

// ════════════════════════════════════════════════════════════════
// 1. Helper functions — แทรกหลัง ROLE_COLOR
// ════════════════════════════════════════════════════════════════
rep("1. add helpers",
`const ROLE_COLOR  = { sysadmin:"#be0e0e", admin:"#1E3A8A", teacher:"#166634" };`,
`const ROLE_COLOR  = { sysadmin:"#be0e0e", admin:"#1E3A8A", teacher:"#166634" };

// ── multi-role helpers ───────────────────────────────────────────
// รองรับทั้ง format เก่า { role:"teacher" } และใหม่ { roles:["teacher","admin"] }
const getRoles       = (u) => { if(!u) return []; if(Array.isArray(u.roles)&&u.roles.length) return u.roles; if(u.role) return [u.role]; return []; };
const hasRole        = (u, r) => getRoles(u).includes(r);
const ROLE_PRIORITY  = ["sysadmin","admin","teacher"];
const getPrimaryRole = (u) => { const rs=getRoles(u); return ROLE_PRIORITY.find(r=>rs.includes(r))||rs[0]||"teacher"; };
const getRoleLabel   = (u) => getRoles(u).map(r=>ROLES[r]||r).join(" / ");
// ────────────────────────────────────────────────────────────────`
);

// ════════════════════════════════════════════════════════════════
// 2. UserModal — form state + toggle + checkboxes
// ════════════════════════════════════════════════════════════════
rep("2a. UserModal form init",
`  const [form, setForm] = useState({
    displayName: user?.displayName||"",
    email:       user?.email||"",
    role:        user?.role||"teacher",
    password:    "",
  });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));

  const handleSave = async () => {
    if(!form.displayName.trim()||!form.email.trim()) { alert("กรุณากรอกชื่อและอีเมล"); return; }
    setLoading(true);
    await onSave({...form, id:user?.id});
    setLoading(false);
    onClose();
  };`,
`  const initRoles = Array.isArray(user?.roles)&&user.roles.length ? user.roles : user?.role ? [user.role] : ["teacher"];
  const [form, setForm] = useState({
    displayName: user?.displayName||"",
    email:       user?.email||"",
    roles:       initRoles,
    password:    "",
  });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));
  const toggleRole = (role) => setForm(f => {
    const has = f.roles.includes(role);
    if (has && f.roles.length === 1) return f; // ต้องมีอย่างน้อย 1
    return { ...f, roles: has ? f.roles.filter(r=>r!==role) : [...f.roles, role] };
  });

  const handleSave = async () => {
    if(!form.displayName.trim()||!form.email.trim()) { alert("กรุณากรอกชื่อและอีเมล"); return; }
    setLoading(true);
    await onSave({...form, id:user?.id});
    setLoading(false);
    onClose();
  };`
);

rep("2b. UserModal checkboxes",
`          <div>
            <label style={lbl}>บทบาท</label>
            <select style={{...inp}} value={form.role} onChange={set("role")}>
              <option value="teacher">👩‍🏫 ครูผู้สอน</option>
              <option value="admin">👔 ผู้บริหาร</option>
              <option value="sysadmin">🔧 ผู้ดูแลระบบ</option>
            </select>
          </div>`,
`          <div>
            <label style={lbl}>บทบาท <span style={{fontWeight:400,color:"var(--TS)"}}>(เลือกได้หลายบทบาท)</span></label>
            <div style={{display:"flex",flexDirection:"column",gap:6,padding:"10px 12px",
              border:"1.5px solid var(--BD)",borderRadius:8,background:"var(--W)"}}>
              {[{v:"teacher",icon:"👩‍🏫",label:"ครูผู้สอน"},{v:"admin",icon:"👔",label:"ผู้บริหาร"},{v:"sysadmin",icon:"🔧",label:"ผู้ดูแลระบบ"}].map(({v,icon,label:rl})=>{
                const on=form.roles.includes(v);
                const meta=ROLE_META[v];
                return(
                  <label key={v} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",
                    padding:"7px 10px",borderRadius:7,transition:"all .15s",
                    background:on?meta.bg:"transparent",border:`1.5px solid ${on?meta.color:"var(--BD)"}`}}>
                    <input type="checkbox" checked={on} onChange={()=>toggleRole(v)}
                      style={{width:15,height:15,accentColor:meta.color,cursor:"pointer",flexShrink:0}}/>
                    <span style={{fontSize:16}}>{icon}</span>
                    <span style={{fontSize:14,fontWeight:on?700:400,color:on?meta.color:"inherit",fontFamily:"Sarabun,sans-serif"}}>{rl}</span>
                  </label>
                );
              })}
            </div>
          </div>`
);

// ════════════════════════════════════════════════════════════════
// 3. UsersTab
// ════════════════════════════════════════════════════════════════
rep("3a. UsersTab updateRole → updateRoles",
`  const updateStatus = id => updateDoc(userRef(id),{approved:true});
  const updateRole   = (id,role) => updateDoc(userRef(id),{role});`,
`  const updateStatus = id => updateDoc(userRef(id),{approved:true});
  const updateRoles  = (id,roles) => updateDoc(userRef(id),{roles, role:roles[0]});`
);

rep("3b. UsersTab handleSave → roles[]",
`  const handleSave = async ({ id, displayName, email, role, password }) => {
    if(id) {
      await updateDoc(userRef(id),{displayName, email, role});
    } else {
      const newId = uid();
      await setDoc(doc(db,"sv_users",newId),{
        email: email.trim().toLowerCase(),
        displayName: displayName.trim(),
        password: password||"school1234",
        role, approved:true,
        createdAt: new Date().toISOString(),
      });
    }
  };`,
`  const handleSave = async ({ id, displayName, email, roles, password }) => {
    const ra = Array.isArray(roles)&&roles.length ? roles : ["teacher"];
    if(id) {
      await updateDoc(userRef(id),{displayName, email, roles:ra, role:ra[0]});
    } else {
      const newId = uid();
      await setDoc(doc(db,"sv_users",newId),{
        email: email.trim().toLowerCase(),
        displayName: displayName.trim(),
        password: password||"school1234",
        roles:ra, role:ra[0], approved:true,
        createdAt: new Date().toISOString(),
      });
    }
  };`
);

rep("3c. UsersTab filter groups",
`  const pending  = users.filter(u=>!u.approved&&u.role!=="sysadmin");
  const admins   = users.filter(u=>u.approved&&u.role==="admin");
  const teachers = users.filter(u=>u.approved&&u.role==="teacher");
  const sysadms  = users.filter(u=>u.role==="sysadmin");`,
`  const pending  = users.filter(u=>!u.approved&&!hasRole(u,"sysadmin"));
  const admins   = users.filter(u=>u.approved&&hasRole(u,"admin")&&!hasRole(u,"sysadmin"));
  const teachers = users.filter(u=>u.approved&&hasRole(u,"teacher")&&!hasRole(u,"admin")&&!hasRole(u,"sysadmin"));
  const sysadms  = users.filter(u=>hasRole(u,"sysadmin"));`
);

rep("3d. UsersTab ROLE_META primary role",
`              const isSA = u.id==="u_sa1";
              const m = ROLE_META[u.role]||ROLE_META.teacher;`,
`              const isSA = u.id==="u_sa1";
              const m = ROLE_META[getPrimaryRole(u)]||ROLE_META.teacher;`
);

rep("3e. UsersTab UAvatar role prop",
`                  <UAvatar name={u.displayName} role={u.role} size={44}/>`,
`                  <UAvatar name={u.displayName} role={getPrimaryRole(u)} size={44}/>`
);

// แทนที่ <select> เดี่ยวใน user card → checkboxes
// ใช้ pattern ที่ชัดเจนกว่า โดยรวม closing brackets ของ select+conditional
rep("3f. UsersTab inline select → checkboxes",
`                  {!isSA&&(
                    <select value={u.role} onChange={e=>updateRole(u.id,e.target.value)}
                      style={{padding:"6px 8px",borderRadius:8,border:"1.5px solid var(--BD)",fontSize:12,
                        background:m.bg,color:m.color,fontWeight:700,cursor:"pointer",
                        outline:"none",flexShrink:0,fontFamily:"Sarabun,sans-serif"}}>
                      <option value="teacher">👩‍🏫 ครูผู้สอน</option>
                      <option value="admin">👔 ผู้บริหาร</option>
                      <option value="sysadmin">🔧 ผู้ดูแลระบบ</option>
                    </select>
                  )}`,
`                  {!isSA&&(
                    <div style={{display:"flex",flexDirection:"column",gap:3,flexShrink:0,minWidth:110}}>
                      {[{v:"teacher",i:"👩‍🏫"},{v:"admin",i:"👔"},{v:"sysadmin",i:"🔧"}].map(({v,i})=>{
                        const on=hasRole(u,v);
                        const meta=ROLE_META[v];
                        return(
                          <label key={v} style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",
                            padding:"3px 7px",borderRadius:5,fontSize:11,
                            background:on?meta.bg:"transparent",color:on?meta.color:"var(--TS)",
                            border:\`1px solid \${on?meta.color:"var(--BD)"}\`,transition:"all .15s",
                            fontFamily:"Sarabun,sans-serif",fontWeight:on?700:400}}>
                            <input type="checkbox" checked={on}
                              style={{width:11,height:11,accentColor:meta.color,cursor:"pointer"}}
                              onChange={()=>{
                                const cur=getRoles(u);
                                const next=on?(cur.length>1?cur.filter(r=>r!==v):cur):[...cur,v];
                                updateRoles(u.id,next);
                              }}/>
                            {i} {meta.label}
                          </label>
                        );
                      })}
                    </div>
                  )}`
);

// ════════════════════════════════════════════════════════════════
// 4. LoginPage
// ════════════════════════════════════════════════════════════════
rep("4a. LoginPage approved check",
`    if(!u.approved && u.role !== "sysadmin"){setErr("บัญชียังไม่ได้รับการอนุมัติ กรุณารอผู้ดูแลระบบ");return;}`,
`    if(!u.approved && !hasRole(u,"sysadmin")){setErr("บัญชียังไม่ได้รับการอนุมัติ กรุณารอผู้ดูแลระบบ");return;}`
);

rep("4b. LoginPage register roles[]",
`        role: "teacher", approved: false, createdAt: new Date().toISOString()`,
`        roles: ["teacher"], role: "teacher", approved: false, createdAt: new Date().toISOString()`
);

// ════════════════════════════════════════════════════════════════
// 5. Firebase initial sysadmin
// ════════════════════════════════════════════════════════════════
rep("5. initial sysadmin roles[]",
`setDoc(doc(db,"sv_users","u_sa1"),{email:"sysadmin@banmi.ac.th",displayName:"ผู้ดูแลระบบ",role:"sysadmin",password:"admin",approved:true,createdAt:new Date().toISOString()});`,
`setDoc(doc(db,"sv_users","u_sa1"),{email:"sysadmin@banmi.ac.th",displayName:"ผู้ดูแลระบบ",roles:["sysadmin"],role:"sysadmin",password:"admin",approved:true,createdAt:new Date().toISOString()});`
);

// ════════════════════════════════════════════════════════════════
// 6. handleLogin redirect
// ════════════════════════════════════════════════════════════════
rep("6. handleLogin",
`  const handleLogin  = u => { setCurrentUser(u); setPage(u.role==="teacher"?"booking":u.role==="sysadmin"?"dashboard":"summary"); };`,
`  const handleLogin  = u => {
    setCurrentUser(u);
    setPage(hasRole(u,"sysadmin")?"dashboard":hasRole(u,"admin")&&!hasRole(u,"teacher")?"summary":"booking");
  };`
);

// ════════════════════════════════════════════════════════════════
// 7. getNav
// ════════════════════════════════════════════════════════════════
rep("7. getNav",
`    if(currentUser.role==="sysadmin") return [
      ["dashboard","📊","Dashboard"],["summary","📋","สรุปผล"],["evaluate","📝","ประเมิน"],
      ["schedule","🗓️","ตาราง"],["users","👥","ผู้ใช้"],["settings","⚙️","ตั้งค่า"],["profile","👤","โปรไฟล์"]
    ];
    if(currentUser.role==="admin") return [
      ["dashboard","📊","Dashboard"],["summary","📋","สรุปผล"],["evaluate","📝","ประเมิน"],
      ["schedule","🗓️","ตาราง"],["profile","👤","โปรไฟล์"]
    ];
    const nav=[["booking","📅","จองเวลา"],["summary","📋","ผลของฉัน"],["profile","👤","โปรไฟล์"]];
    if(isEvaluator(currentUser.id,bookings)) nav.splice(2,0,["evaluate","📝","ประเมิน"]);
    return nav;`,
`    if(hasRole(currentUser,"sysadmin")) return [
      ["dashboard","📊","Dashboard"],["summary","📋","สรุปผล"],["evaluate","📝","ประเมิน"],
      ["schedule","🗓️","ตาราง"],["users","👥","ผู้ใช้"],["settings","⚙️","ตั้งค่า"],["profile","👤","โปรไฟล์"]
    ];
    // teacher-only
    if(hasRole(currentUser,"teacher")&&!hasRole(currentUser,"admin")) {
      const nav=[["booking","📅","จองเวลา"],["summary","📋","ผลของฉัน"],["profile","👤","โปรไฟล์"]];
      if(isEvaluator(currentUser.id,bookings)) nav.splice(2,0,["evaluate","📝","ประเมิน"]);
      return nav;
    }
    // admin-only
    if(hasRole(currentUser,"admin")&&!hasRole(currentUser,"teacher")) return [
      ["dashboard","📊","Dashboard"],["summary","📋","สรุปผล"],["evaluate","📝","ประเมิน"],
      ["schedule","🗓️","ตาราง"],["profile","👤","โปรไฟล์"]
    ];
    // teacher + admin (2 บทบาท) → ได้เมนูรวมทั้งสองฝั่ง
    const nav=[
      ["booking","📅","จองเวลา"],
      ["dashboard","📊","Dashboard"],
      ["summary","📋","สรุปผล / ผลของฉัน"],
      ["evaluate","📝","ประเมิน"],
      ["schedule","🗓️","ตาราง"],
      ["profile","👤","โปรไฟล์"],
    ];
    return nav;`
);

// ════════════════════════════════════════════════════════════════
// 8. Header role badge
// ════════════════════════════════════════════════════════════════
rep("8. header role label",
`{currentUser.displayName}&nbsp;<span style={{background:"rgba(255,255,255,.2)",padding:"1px 7px",borderRadius:20,fontSize:10}}>{ROLES[currentUser.role]}</span>`,
`{currentUser.displayName}&nbsp;<span style={{background:"rgba(255,255,255,.2)",padding:"1px 7px",borderRadius:20,fontSize:10}}>{getRoleLabel(currentUser)}</span>`
);

// ════════════════════════════════════════════════════════════════
// 9. Page render
// ════════════════════════════════════════════════════════════════
rep("9a. page booking teacher",
`{currentUser&&page==="booking"   &&currentUser.role==="teacher"   &&<BookingPage`,
`{currentUser&&page==="booking"   &&hasRole(currentUser,"teacher")  &&<BookingPage`
);
rep("9b. page users sysadmin",
`{currentUser&&page==="users"     &&currentUser.role==="sysadmin"  &&<UsersTab`,
`{currentUser&&page==="users"     &&hasRole(currentUser,"sysadmin")&&<UsersTab`
);
rep("9c. page settings sysadmin",
`{currentUser&&page==="settings"  &&currentUser.role==="sysadmin"  &&<SettingsPage`,
`{currentUser&&page==="settings"  &&hasRole(currentUser,"sysadmin")&&<SettingsPage`
);

// ════════════════════════════════════════════════════════════════
// 10. DashboardPage teachers filter
// ════════════════════════════════════════════════════════════════
rep("10. DashboardPage teachers",
`  const teachers = users.filter(u=>u.role==="teacher"&&u.approved);`,
`  const teachers = users.filter(u=>hasRole(u,"teacher")&&u.approved);`
);

// ════════════════════════════════════════════════════════════════
// 11. BookingPage admins + teachers filter
// ════════════════════════════════════════════════════════════════
rep("11. BookingPage filters",
`  const admins=users.filter(u=>u.role==="admin"&&u.approved);
  const teachers=users.filter(u=>u.role==="teacher"&&u.id!==currentUser.id&&u.approved);`,
`  const admins=users.filter(u=>hasRole(u,"admin")&&u.approved);
  const teachers=users.filter(u=>hasRole(u,"teacher")&&u.id!==currentUser.id&&u.approved);`
);

// ════════════════════════════════════════════════════════════════
// 12. SummaryPage visible
// ════════════════════════════════════════════════════════════════
rep("12. SummaryPage visible",
`  const visible = currentUser.role==="teacher"
    ? bookings.filter(b=>b.teacherId===currentUser.id)
    : bookings;`,
`  const visible = hasRole(currentUser,"teacher")&&!hasRole(currentUser,"admin")&&!hasRole(currentUser,"sysadmin")
    ? bookings.filter(b=>b.teacherId===currentUser.id)
    : bookings;`
);

// ════════════════════════════════════════════════════════════════
// 13. SummaryPage h2 role label (หัวข้อ)
// ════════════════════════════════════════════════════════════════
rep("13. SummaryPage h2",
`{currentUser.role==="teacher"?`,
`{hasRole(currentUser,"teacher")&&!hasRole(currentUser,"admin")?`
);

// ════════════════════════════════════════════════════════════════
// 14. EvaluateTab myQueue
// ════════════════════════════════════════════════════════════════
rep("14. EvaluateTab myQueue",
`  const myQueue = currentUser.role==="sysadmin"
    ? bookings
    : bookings.filter(b=>b.adminId===currentUser.id||b.teacher1Id===currentUser.id||b.teacher2Id===currentUser.id);`,
`  const myQueue = hasRole(currentUser,"sysadmin")
    ? bookings
    : bookings.filter(b=>b.adminId===currentUser.id||b.teacher1Id===currentUser.id||b.teacher2Id===currentUser.id);`
);

// ════════════════════════════════════════════════════════════════
// write
// ════════════════════════════════════════════════════════════════
fs.writeFileSync(FILE, src, "utf8");
console.log(`\n✅  เสร็จแล้ว! แก้ไขสำเร็จ ${ok} จุด | ข้าม ${skip} จุด`);
console.log("🚀  รัน: npm run dev  แล้วทดสอบ login ด้วย user ที่มีหลาย role ได้เลย");
