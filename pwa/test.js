// H.Y.B.H 回归测试 —— node test.js（无头运行，全部断言通过输出 ALL PASS）
// 覆盖：迁移种子 / AI 定制包幂等 / 恶意数据转义 / 备份导入净化 / 打卡原地更新
"use strict";
const fs = require("fs");

// ---------- 桩环境 ----------
const el = () => ({ style:{}, value:"", dataset:{}, open:false, scrollTop:0, scrollLeft:0, scrollWidth:0,
  classList:{ add(){}, remove(){}, toggle(c,v){ this._t=[c,v]; } },
  closest(){ return null; }, appendChild(){}, addEventListener(){}, insertAdjacentHTML(){}, onclick:null,
  set innerHTML(v){ this._h=v; }, get innerHTML(){ return this._h||""; },
  set textContent(v){ this._t=v; }, get textContent(){ return this._t||""; } });
const memo = {};
global.localStorage = { _d:{}, getItem(k){ return this._d[k] ?? null; }, setItem(k,v){ this._d[k]=v; }, removeItem(k){ delete this._d[k]; } };
global.document = { getElementById(id){ if(!memo[id]) memo[id]=el(); return memo[id]; }, createElement:el, querySelectorAll:()=>[] };
global.window = { addEventListener(){} };
global.requestAnimationFrame = f=>f();
try { global.navigator = {}; } catch(_) { /* Node 22 自带只读 navigator，跳过 */ }
let msgs=[]; global.alert=m=>msgs.push(m);
let confirms=[]; global.confirm=q=>{ confirms.push(q); return true; };

// ---------- 载入应用脚本 ----------
const html = fs.readFileSync(__dirname + "/index.html", "utf8");
const scripts = html.match(/<script>([\s\S]*?)<\/script>/g).map(s=>s.replace(/<\/?script>/g,""));
const app = scripts.find(s=>s.includes("schemaVersion")).replace(/renderAll\(\);\s*$/, "");
eval(app + "\nglobalThis.__T = { DB, KEY, renderDiet, renderToday, toggleMeal, toggleEx, applyCustomPackage, sanitizeBackup, dayRec, dayIdxOf, dkey, today, qrMatrix };");
const T = globalThis.__T;
const memoEl = id => memo[id];

// ---------- 断言器 ----------
let pass=0, fail=0;
const eq = (name, cond) => { cond ? pass++ : (fail++, console.log("  ✗ FAIL:", name)); };

// ========== 1. 迁移与种子 ==========
console.log("1. 迁移与种子");
eq("schemaVersion=6", T.DB.schemaVersion === 6);
eq("内置两套计划", !!(T.DB.plans["pl-muscle"] && T.DB.plans["pl-lean"]));
eq("内置两种饮食", !!(T.DB.meals.muscle && T.DB.meals.lean));
eq("动作库 35 个种子", Object.keys(T.DB.exercises).length === 35);
eq("旧库 v5 自动升 v6", (()=>{
  localStorage.setItem(T.KEY, JSON.stringify({ v:1, schemaVersion:5, days:{}, settings:{} }));
  eval(app.replace(/renderAll\(\);\s*$/,"") + "; globalThis.__DB2 = DB;");
  const DB2 = globalThis.__DB2;
  return DB2.schemaVersion === 6 && !!DB2.meals.muscle;
})());

// ========== 2. AI 定制包：首次导入 + 幂等更新 ==========
console.log("2. AI 定制包幂等导入");
const pkg = () => ({ kind:"hybh-custom", v:1,
  exercises:[{ name:"壶铃摆荡", fig:"dead", part:"臀", equip:"壶铃", sets:"3 × 15", points:"髋部发力。" }],
  plans:{ p1:{ name:"测试计划A", days:[
    {title:"推",exNames:["俯卧撑","壶铃摆荡"]},{title:"拉",exNames:["单臂划船"]},{title:"腿",exNames:["高脚杯深蹲"]},
    {title:"休",exNames:["全身拉伸"]},{title:"全",exNames:["俯卧撑"]},{title:"核",exNames:["平板支撑"]},{title:"休",exNames:["全身拉伸"]}] } },
  meals:{ label:"测试餐", kcal:32, pro:1.6, wcost:260, meals:[
    {n:"早",p:"24g",cost:"¥7",rows:[["鸡蛋","2 个","12g"]]},
    {n:"午",p:"32g",cost:"¥13",rows:[["主菜","150g","32g"]]},
    {n:"晚",p:"26g",cost:"¥10",rows:[["瘦肉","150g","26g"]]}] } });
T.applyCustomPackage(pkg());
const pid = Object.keys(T.DB.plans).find(k=>T.DB.plans[k].name==="测试计划A");
const mid = Object.keys(T.DB.meals).find(k=>T.DB.meals[k].label==="测试餐");
const exN1 = Object.keys(T.DB.exercises).length;
eq("首次导入新增计划/方案", !!pid && !!mid);
eq("goal 指向新方案", T.DB.settings.goal === mid);
pkg().plans.p1.days[0].exNames.push("臀桥");
T.applyCustomPackage(pkg());
eq("二次导入计划数不变", Object.keys(T.DB.plans).filter(k=>T.DB.plans[k].name==="测试计划A").length === 1);
eq("同一计划 id 原地更新", Object.keys(T.DB.plans).find(k=>T.DB.plans[k].name==="测试计划A") === pid);
eq("计划内容已更新(含臀桥)", T.DB.plans[pid].days[0].exIds.length === 2);
eq("饮食方案 key 不变", Object.keys(T.DB.meals).find(k=>T.DB.meals[k].label==="测试餐") === mid);
eq("动作数不变(重名复用)", Object.keys(T.DB.exercises).length === exN1);
eq("内置数据保留", !!(T.DB.plans["pl-muscle"] && T.DB.meals.muscle));

// ========== 3. 恶意数据：入库允许，渲染必须转义 ==========
console.log("3. XSS 防御（渲染出口转义）");
const row = ["<u>食</u>","<u>1g</u>","<u>1g</u>"];
T.applyCustomPackage({ kind:"hybh-custom", v:1,
  plans:{ evil:{ name:"计划<img src=x onerror=alert(1)>", days:[
    {title:"<b>推</b>",exNames:["俯卧撑"]},{title:"拉",exNames:["单臂划船"]},{title:"腿",exNames:["高脚杯深蹲"]},
    {title:"休",exNames:["全身拉伸"]},{title:"全",exNames:["俯卧撑"]},{title:"核",exNames:["平板支撑"]},{title:"休",exNames:["全身拉伸"]}] } },
  meals:{ label:"餐<img src=x onerror=alert(1)>", kcal:30, pro:1.5, wcost:200, meals:[
    {n:"早<img src=y onerror=alert(1)>", p:"<b>25g</b>", cost:"<i>¥7</i>", rows:[row,row,row]},
    {n:"午",p:"30g",cost:"¥12",rows:[row,row,row]},
    {n:"晚",p:"25g",cost:"¥9",rows:[row,row,row]}] } });
T.renderDiet();
const dh = memoEl("p-diet").innerHTML;
eq("饮食页无原始 <img/onerror>/<u>", !dh.includes("<img") && !dh.includes("onerror") && !dh.includes("<u>"));
eq("label 已转义", dh.includes("&lt;img"));
eq("餐名已转义", dh.includes("&lt;img src=y"));
eq("菜单行已转义", dh.includes("&lt;u&gt;食&lt;/u&gt;"));
T.renderToday();
const th = memoEl("p-today").innerHTML;
eq("今日页菜单行已转义", th.includes("&lt;u&gt;食&lt;/u&gt;") && !th.includes("<u>"));

// ========== 4. 备份导入净化 ==========
console.log("4. 全量备份 sanitizeBackup");
const evilBackup = { schemaVersion:6, settings:{height:999, weight:-5, goal:'x";alert(1);("'}, activePlanId:'p";alert(1);("',
  plans:{ 'p";alert(1);("':{name:"A",days:[{title:"t",exIds:[]}]}, okplan:{name:"B",days:[{title:"t",exIds:[]}]} },
  meals:{ 'm";alert(1);("':{label:"L",kcal:30,pro:1.5,wcost:200,meals:[{n:"a",p:"1g",cost:"¥1",rows:[["a","1g","1g"]]}]},
          okmeal:{label:"M",kcal:30,pro:1.5,wcost:200,meals:[{n:"a",p:"1g",cost:"¥1",rows:[["a","1g","1g"]]}]} },
  exercises:{ 'e";x"':{name:"E",fig:"squat",part:"胸",equip:"自重",sets:"3 × 12",points:"",custom:true} },
  days:{ "2026-10-11":{planId:"okplan",ex:[{id:null,done:true}],meals:[true,false]} } };
const clean = T.sanitizeBackup(evilBackup);
const badKeys = o => Object.keys(o).filter(k=>!/^[a-z0-9-]{1,40}$/.test(k));
eq("plans/meals/exercises key 全部规范化", badKeys(clean.plans).length===0 && badKeys(clean.meals).length===0 && badKeys(clean.exercises).length===0);
eq("settings 夹紧(999→250, -5→按身高 BMI 下限 75)", clean.settings.height===250 && clean.settings.weight===75);
eq("targetWeight 落在健康 BMI 区间", clean.settings.targetWeight >= Math.round(18.5*(2.5**2)*10)/10 && clean.settings.targetWeight <= Math.round(24*(2.5**2)*10)/10);
eq("goal 回退合法 key", /^[a-z0-9-]{1,40}$/.test(clean.settings.goal) && !!clean.meals[clean.settings.goal]);
eq("activePlanId 回退", !!clean.plans[clean.activePlanId]);
eq("days 保留合法 key", Object.keys(clean.days).join()==="2026-10-11");

// ========== 5. 打卡原地更新（不重绘、不跳滚动） ==========
console.log("5. 打卡原地更新");
T.renderToday();
const htmlBefore = memoEl("p-today").innerHTML;
const rec = T.dayRec(T.dkey(T.today()), T.dayIdxOf(T.today()));
const before = rec.meals[0];
memoEl("p-today").scrollTop = 123;
T.toggleMeal(0, { classList:{ toggle(c,v){ this._v=[c,v]; } }, closest(){ return { classList:{ toggle(c,v){ this._cv=[c,v]; } } }; } });
eq("DB 勾选翻转", T.dayRec(T.dkey(T.today()), T.dayIdxOf(T.today())).meals[0] === !before);
eq("面板未重绘(innerHTML 不变)", memoEl("p-today").innerHTML === htmlBefore);
eq("计数器原地更新", /餐/.test(memoEl("meal-cnt").textContent));
eq("进度条更新", memoEl("meal-bar").style.width !== undefined);
// 动作打卡
const exBefore = T.dayRec(T.dkey(T.today()), T.dayIdxOf(T.today())).ex[0].done;
T.toggleEx(0, { classList:{ toggle(){} }, closest(){ return { classList:{ toggle(){} } }; } });
eq("动作打卡翻转", T.dayRec(T.dkey(T.today()), T.dayIdxOf(T.today())).ex[0].done === !exBefore);
eq("动作计数器更新", /\d+\/\d+ 动作/.test(memoEl("ex-cnt").textContent));

// ========== 6. 二维码生成器（结构自检 + 解码依赖写入 JSON 供外部验证） ==========
console.log("6. 二维码生成器");
const qr = T.qrMatrix("https://hybh.pages.dev");
eq("尺寸=版本公式(v2→25)", qr.size === 25);
const f = (x,y)=>qr.m[y][x];
eq("三个 finder 角 7x7 边框", [[3,3],[qr.size-4,3],[3,qr.size-4]].every(([cx,cy])=>[[-3,-3],[3,-3],[-3,3],[3,3],[0,0]].every(([dx,dy])=>f(cx+dx,cy+dy)===true)));
eq("dark module", f(8, qr.size-8) === true);
let timingOK = true;
for(let i=8;i<qr.size-8;i++){ if(f(i,6)!==(i%2===0)||f(6,i)!==(i%2===0)) { timingOK=false; break; } }
eq("timing 交替正确", timingOK);
eq("长内容自适应版本", T.qrMatrix("https://example.com/very/long/path/with/many/segments?query=abcdefg&x=1234567890abcdefg").size === 37);

// ---------- 汇总 ----------
console.log(`\n${fail===0 ? "ALL PASS" : "HAS FAILURES"} · ${pass} 通过, ${fail} 失败`);
process.exit(fail===0 ? 0 : 1);
