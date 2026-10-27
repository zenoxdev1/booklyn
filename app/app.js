/* Booklyn. Keep your lights on.
   Your degree is a city. A semester is a district, a module is a building, a teaching unit is a floor.
   Files are stored on this device only (IndexedDB). Progress is stored in localStorage with a schema version. */
(function(){
'use strict';

/* ================= constants ================= */
var SCHEMA = 1, KEY = 'booklyn:state';
var HUES = [20,215,165,45,270,330,95,0,190,300,120,240];
var ALIASES = {
  BSCM:'bpmn, supply chain, business model, e3 value, ecosystem, digital customer, operations management',
  CNB:'ipv4, ipv6, ethernet, router, switch, icmp, subnet, networking, transport layer, network layer, data link, physical layer, address resolution',
  IAE:'economics, gdp, bond, yield, treasury, inflation, eisenhut, checkup',
  IFA:'accounting, ledger, cherry, cash flow, accrual, bookkeeping, morales',
  PROFU:'programming, weekly_test, weekly test, bootcamp, circle',
  STCSB:'statistics, probability, bayes, midterm, covariance, distribution',
  ITPRB:'prototyping, teamwork, psychological safety, writing skills, documentation_h26'
};

/* demo semester: real module names and file names, illustrative week split */
var DEMO = [
 {code:'BSCM',name:'Business & Supply Chain Management',h:20,weeks:[
  ['Introduction & Operations Management',['SW01 - Introduction and Operations Management.pdf']],
  ['Digital Customer',['SW02 - Digital Customer.pdf']],
  ['Business Models & Innovation',['SW03 - Business Models and Innovation Management.pdf']],
  ['Digital Ecosystems & E3 Value',['SW04 - Digital Ecosystems, Platforms and E3 Value Modelling.pdf','E3 Value exercise.pdf']],
  ['BPMN 1',['SW05 - BPMN 1.pdf']],
  ['BPMN 2',['SW06 - BPMN 2.pdf']]]},
 {code:'CNB',name:'Computer Networks Basics',h:215,weeks:[
  ['Modules 1–2 · Networking today, switch setup',['Module 1 - Networking Today.pdf','Module 2 - Basic Switch and End Device Configuration.pdf']],
  ['Modules 3–4 · Protocols, physical layer',['Module 3 - Protocols and Models.pdf','Module 4 - Physical Layer.pdf']],
  ['Modules 5–6 · Number systems, data link',['Module 5 - Number Systems.pdf','Module 6 - Data Link Layer.pdf']],
  ['Modules 7–8 · Ethernet switching, network layer',['Module 7 - Ethernet Switching.pdf','Module 8 - Network Layer.pdf']],
  ['Modules 9–10 · Address resolution, router setup',['Module 9 - Address Resolution.pdf','Module 10 - Basic Router Configuration.pdf']],
  ['Modules 11–12 · IPv4 and IPv6 addressing',['Module 11 - IPv4 Addressing.pdf','Module 12 - IPv6 Addressing.pdf']]]},
 {code:'IAE',name:'International Affairs Economics',h:165,weeks:[
  ['Course introduction',['IAE course introduction.pdf']],
  ['Bond market fundamentals',['Bond Market Fundamentals.pdf']],
  ['Present value exercises',['PV exercises.pdf']],
  ['10-year Treasury yield spike',['Checkup 02 - 10-Year Treasury Yield Spike.pdf']],
  ['Alphabet bond, house prices',['Checkup - Alphabet Bond, Wall Street Alarms, House Prices.pdf']],
  ['GDP, potential & business cycle',['GDP Potential, Business Cycle and Country Analysis.pdf']]]},
 {code:'IFA',name:'International Financial Accounting',h:45,weeks:[
  ['Introduction to accounting',['SW01 - Introduction to Accounting.pdf']],
  ['Double-entry bookkeeping',['SW02 - Mike Morales Case.pdf']],
  ['Accrual accounting concepts',['Accrual Accounting Concepts.pdf']],
  ['Recording transactions & statements',['Recording Transactions and Financial Statements.pdf']],
  ['Statement of cash flows',['Statement of Cash Flows.pdf']],
  ['Weekly case studies',['Weekly Case Studies and Exercises.pdf']]]},
 {code:'PROFU',name:'Programming Fundamentals',h:270,weeks:[
  ['Setup & first program',['Semester Course Week 01.pdf']],
  ['Variables & data types',['Semester Course Week 02.pdf']],
  ['Conditions',['Semester Course Week 03.pdf']],
  ['Loops',['Semester Course Week 04.pdf','weekly_test_02.pdf']],
  ['Functions',['Semester Course Week 05.pdf']],
  ['Collections',['Semester Course Week 06.pdf','weekly_test_03.pdf']]]},
 {code:'STCSB',name:'Statistics for Computer Science Basics',h:330,weeks:[
  ['Data types, collection, cleaning',['Week 1 - Introductions, Data Types, Data Collection, Data Cleaning.pdf']],
  ['Organizing & visualizing data',['Week 2 - Organizing and Visualizing Data, Descriptive Measures.pdf']],
  ['Central tendency, spread, correlation',['Week 3 - Central Tendency, Spread, Covariance and Correlation.pdf']],
  ['Exercises & review',['Week 4 exercises.pdf']],
  ['Probability',['Week 5 - Probability.pdf']],
  ['Bayes, counting, discrete distributions',['Week 6 - Bayes, Counting Rules, Discrete Distributions.pdf','Mock Midterm HS26.docx']]]},
 {code:'ITPRB',name:'IT Projects Basics',h:95,weeks:[
  ['Course introduction',['ITPRB course outline.pdf']],
  ['Teamwork: science of team-building',['SW02 - Teamwork Skills - Science of Teambuilding.pdf']],
  ['Teamwork: psychological safety',['SW03 - Teamwork Skills - Psychological Safety.pdf']],
  ['Prototyping 1 · Ideation & research',['SW04 - Prototyping 1 - Ideation and Research.pdf']],
  ['Idea development',['Project brief H26.pdf']],
  ['Idea evaluation',['Idea evaluation canvas.pdf']]]}
];
var DEMO_LIT = {BSCM:[1,2,3,4,5],CNB:[1,2,3,4,5],IAE:[1,2,3,4,5],IFA:[1],PROFU:[1,2,3],STCSB:[1,2,3,4,5],ITPRB:[1,2,3]};
var DEMO_DEADLINES = [
 {date:'2026-10-30',code:'ITPRB',kind:'Project',title:'Task 5 · Develop and select an idea'},
 {date:'2026-11-03',code:'STCSB',kind:'Exam',title:'Midterm · 90 minutes'},
 {date:'2026-11-04',code:'BSCM',kind:'Exam',title:'BPMN exam · 5 tasks, 50 min, open book (printed only)'},
 {date:'2026-11-04',code:'IFA',kind:'Assignment',title:'Cherry case'},
 {date:'2026-11-18',code:'IFA',kind:'Test',title:'BAS test'},
 {date:'2026-12-14',code:'ITPRB',kind:'Project',title:'Final presentation, documentation and prototype video'},
 {date:'2026-12-15',code:'CNB',kind:'Test',title:'Final test'}
];
var QUIZ = {
 'bscm:6':[
  {q:'Which flow type may NOT connect elements in two different pools?',o:['Sequence flow','Message flow','Association'],a:0,e:'Sequence flows stay inside one pool. Pools talk to each other with message flows.'},
  {q:'A task needs 20 minutes of actual work but waits 40 minutes in a queue. How long does it take from arrival to completion?',o:['20 minutes','40 minutes','60 minutes'],a:2,e:'Elapsed time is processing time plus waiting time: 20 + 40 = 60.'},
  {q:'How is an intermediate event drawn in BPMN?',o:['Thin single circle','Double-lined circle','Thick single circle'],a:1,e:'Start events are thin, intermediate events have a double line, end events are thick.'}],
 'stcsb:6':[
  {q:'In how many different orders can 3 distinct books stand on a shelf?',o:['3','6','9'],a:1,e:'3! = 3 × 2 × 1 = 6.'},
  {q:'Which expression is Bayes’ theorem?',o:['P(A|B) = P(B|A)·P(A) / P(B)','P(A|B) = P(A)·P(B)','P(A|B) = P(B|A) + P(A)'],a:0,e:'Bayes turns P(B|A) into P(A|B) by weighting with the prior P(A) and dividing by P(B).'},
  {q:'A fair coin is tossed 3 times. What is P(exactly 2 heads)?',o:['0.25','0.375','0.5'],a:1,e:'Binomial: C(3,2) · 0.5² · 0.5¹ = 3 · 0.125 = 0.375.'}],
 'cnb:6':[
  {q:'How many bits does an IPv4 address have?',o:['32','48','128'],a:0,e:'IPv4 uses 32 bits, IPv6 uses 128 bits.'},
  {q:'Which subnet mask matches a /24 prefix?',o:['255.255.0.0','255.255.255.0','255.255.255.128'],a:1,e:'/24 means 24 network bits: three full octets of 255.'},
  {q:'How many usable host addresses does a /24 network have?',o:['256','255','254'],a:2,e:'256 addresses minus the network and broadcast addresses leaves 254.'}],
 'ifa:2':[
  {q:'A company pays rent in cash. Which entry is correct?',o:['Debit Rent expense, credit Cash','Debit Cash, credit Rent expense','Debit Rent expense, credit Revenue'],a:0,e:'The expense increases (debit) and cash decreases (credit).'},
  {q:'Which equation must always balance?',o:['Assets = Liabilities + Equity','Assets = Revenue − Expenses','Equity = Assets + Liabilities'],a:0,e:'Everything the company owns is financed by debt or by owners.'},
  {q:'On which side of a T-account is an increase in a liability recorded?',o:['Debit (left)','Credit (right)','Either, depending on the day'],a:1,e:'Liabilities, equity and revenue increase on the credit side.'}],
 'profu:4':[
  {q:'Which loop fits best when you know the number of repetitions in advance?',o:['A for loop','An if statement','A while loop that never changes its condition'],a:0,e:'A for loop counts for you. That is its job.'},
  {q:'In most languages, what does 7 % 3 evaluate to?',o:['2','1','2.33'],a:1,e:'% is the remainder after integer division: 7 = 2·3 + 1.'},
  {q:'What happens if a while loop’s condition never becomes false?',o:['It stops after 10 rounds','It runs forever (infinite loop)','The program skips it'],a:1,e:'Make sure something inside the loop eventually changes the condition.'}],
 'iae:6':[
  {q:'Which indicator is lagging, so it turns after the economy turns?',o:['Purchasing Managers’ Index','Unemployment rate','Stock market index'],a:1,e:'PMI and stock prices lead. Unemployment follows with a delay.'},
  {q:'Effective GDP is above potential GDP. What is the output gap?',o:['Positive: the economy runs hot','Negative: there is slack','Zero by definition'],a:0,e:'Effective minus potential: a positive gap often comes with rising inflation.'},
  {q:'Inflation is high and rising. What would a central bank typically do?',o:['Raise policy rates','Cut policy rates','Buy more bonds to push yields down'],a:0,e:'Higher rates make credit dearer and cool demand.'}],
 'itprb:4':[
  {q:'What is the main purpose of a low-fidelity prototype?',o:['To impress with polish','To test ideas early and cheaply','To replace the final product'],a:1,e:'Cheap and rough means you can change direction before building the real thing.'},
  {q:'In ideation, what should come first?',o:['Pick the single best idea','Generate many ideas without judging','Write the documentation'],a:1,e:'Diverge first, converge later.'},
  {q:'Which of Nielsen’s heuristics says users should always know what the system is doing?',o:['Visibility of system status','Aesthetic and minimalist design','Help and documentation'],a:0,e:'Loading states, confirmations and progress indicators serve this heuristic.'}]
};
var ICON = {
 campus:'<path d="M4 21V8l6-4v17M10 21V11h10v10M3 21h18M7 11h.01M7 15h.01M14 15h2"/>',
 port:'<path d="M3 13l3-8h12l3 8v6H3zM3 13h5l1 3h6l1-3h5"/>',
 dead:'<path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4"/>',
 set:'<path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6"/>',
 shop:'<path d="M5 8h14l-1 12H6zM9 8a3 3 0 0 1 6 0"/>'
};

/* ================= helpers ================= */
function $(s,r){return (r||document).querySelector(s);}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function uid(){return 'x'+Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4);}
function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
function ext(n){var m=/\.([a-z0-9]+)$/i.exec(n);return m?m[1].toUpperCase():'FILE';}
function size(n){return n>=1048576?(n/1048576).toFixed(1)+' MB':n>=1024?Math.round(n/1024)+' KB':n+' B';}
function dayStart(d){return new Date(d.getFullYear(),d.getMonth(),d.getDate());}
function pdate(s){var p=String(s||'').split('-');return new Date(+p[0],+p[1]-1,+p[2]);}
function daysTo(d){return Math.round((pdate(d.date)-dayStart(new Date()))/864e5);}
function rel(d){var n=daysTo(d);return n<0?'passed':n===0?'today':n===1?'tomorrow':'in '+n+' days';}
function fmt(d){return (d instanceof Date?d:pdate(d)).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});}
function toast(msg,sticky){
  var t=$('#toast'); t.textContent=msg; t.classList.add('show');
  clearTimeout(toast.t); if(!sticky) toast.t=setTimeout(function(){t.classList.remove('show');},2800);
}

/* ================= state ================= */
var state, readOnly=false, storageOK=true;
var MIGRATIONS = {
  /* One function per schema bump, e.g. 1: function(s){ s.newField = {}; s.schema = 2; return s; }
     Old data is copied to a backup key before migrating. */
};
function blank(){
  return {schema:SCHEMA,name:'',theme:'system',activeSem:null,sems:[],lit:{},seen:{},notes:{},tasksDone:{},deadlines:[],lastImport:[],lastBackup:0,snoozeBackup:0,coins:0,rentAt:0,lvl:{},pin:{},deco:{},paid:{},shields:0,iliasKnown:{},iliasDismissed:{},iliasHash:{},iliasImported:{},iliasLast:0,scenery:{},sceneOwn:{},aiOpt:false};
}
function fill(s){var d=blank();Object.keys(d).forEach(function(k){if(s[k]===undefined)s[k]=d[k];});return s;}
/* Untrusted data (backup files, the cloud copy) is cleaned before it is used: ids are checked because they end up in the page, text is trimmed, odd keys are dropped. */
var ID_OK=/^[A-Za-z0-9_-]{1,40}$/;
function scrub(v,d){
  if(d>10)return null;
  if(typeof v==='string')return v.length>20000?v.slice(0,20000):v;
  if(typeof v==='number')return isFinite(v)?v:0;
  if(v===null||typeof v==='boolean')return v;
  if(Array.isArray(v))return v.slice(0,5000).map(function(x){return scrub(x,d+1);});
  if(typeof v==='object'){var o={},n=0;Object.keys(v).forEach(function(k){if(k==='__proto__'||k==='constructor'||k==='prototype'||++n>20000)return;o[k]=scrub(v[k],d+1);});return o;}
  return null;
}
function clean(s){
  s=scrub(s,0);if(!s||typeof s!=='object'||Array.isArray(s))throw new Error('shape');
  fill(s);
  ['lit','seen','notes','tasksDone','lvl','pin','deco','paid','iliasKnown','iliasDismissed','iliasHash','iliasImported','scenery','sceneOwn'].forEach(function(k){if(!s[k]||typeof s[k]!=='object'||Array.isArray(s[k]))s[k]={};});
  if(!Array.isArray(s.sems)||!Array.isArray(s.deadlines)||!Array.isArray(s.lastImport))throw new Error('lists');
  s.name=String(s.name||'').slice(0,80);
  ['coins','shields','rentAt','lastBackup','snoozeBackup','iliasLast'].forEach(function(k){s[k]=Math.max(0,+s[k]||0);});
  s.lastImport=s.lastImport.map(String).slice(0,500);
  var used={};
  s.sems.forEach(function(sem){
    if(!sem||typeof sem!=='object'||!ID_OK.test(String(sem.id))||!Array.isArray(sem.modules))throw new Error('sem');
    sem.id=String(sem.id);sem.name=String(sem.name||'').slice(0,120);sem.start=/^\d{4}-\d{2}-\d{2}$/.test(String(sem.start))?sem.start:'';
    sem.demo=!!sem.demo;sem.finished=!!sem.finished;
    sem.modules.forEach(function(m){
      if(!m||typeof m!=='object'||!ID_OK.test(String(m.id))||used[m.id])throw new Error('mod');
      used[m.id]=1;m.id=String(m.id);m.code=String(m.code||'').slice(0,40);m.name=String(m.name||'').slice(0,200);m.kw=String(m.kw||'').slice(0,400);
      m.h=Math.min(360,Math.max(0,+m.h||0));m.units=Math.min(MAXU,Math.max(1,Math.floor(+m.units||1)));
      if(!Array.isArray(m.titles))m.titles=[];m.titles=m.titles.slice(0,MAXU).map(function(t){return String(t).slice(0,200);});
      if(!m.base||typeof m.base!=='object'||Array.isArray(m.base))m.base={};
    });
  });
  var dk=['Exam','Test','Assignment','Project','Other'],dids={};
  s.deadlines=s.deadlines.filter(function(d){return d&&typeof d==='object';}).slice(0,1000).map(function(d){
    var id=ID_OK.test(String(d.id))&&!dids[d.id]?String(d.id):uid();dids[id]=1;
    return {id:id,date:/^\d{4}-\d{2}-\d{2}$/.test(String(d.date))?d.date:'',mod:ID_OK.test(String(d.mod))?String(d.mod):'',kind:dk.indexOf(d.kind)>-1?d.kind:'Other',title:String(d.title||'').slice(0,200)};
  }).filter(function(d){return d.date;});
  if(s.activeSem!==null&&!ID_OK.test(String(s.activeSem)))s.activeSem=null;
  s.theme=['system','light','dark'].indexOf(s.theme)>-1?s.theme:'system';
  return s;
}
function load(){
  try{
    var raw=localStorage.getItem(KEY); if(!raw) return blank();
    var s=JSON.parse(raw); if(!s||typeof s.schema!=='number') return blank();
    if(s.schema>SCHEMA){readOnly=true;return blank();}
    while(s.schema<SCHEMA){
      try{localStorage.setItem(KEY+'.backup.v'+s.schema,raw);}catch(e){}
      var f=MIGRATIONS[s.schema]; if(!f) return blank(); s=f(s);
    }
    return fill(s);
  }catch(e){storageOK=false;return blank();}
}
function dlBackup(){
  try{
    state.lastBackup=Date.now();save();
    var blob=new Blob([JSON.stringify(state)],{type:'application/json'}),a=document.createElement('a'),d=new Date().toISOString().slice(0,10);
    a.href=URL.createObjectURL(blob);a.download='booklyn-backup-'+d+'.json';document.body.appendChild(a);a.click();
    setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},1000);
    return true;
  }catch(e){return false;}
}
function backupDue(){
  if(readOnly) return false;
  var real=state.sems.some(function(s){return !s.demo;});
  if(!real) return false;
  var now=Date.now(),week=7*864e5;
  if(state.snoozeBackup&&now<state.snoozeBackup) return false;
  return !state.lastBackup||now-state.lastBackup>week;
}
var saveT;
var SYNC={me:null,uid:'',kind:'',newCode:'',showCode:false,checked:false,na:false,base:0,last:0,dirty:false,known:'',busy:false,pushing:false,msg:'',link:'',conflict:null,timer:null,adopting:false};
try{var _sm=JSON.parse(localStorage.getItem('booklyn:sync')||'{}');SYNC.base=_sm.base||0;SYNC.last=_sm.last||0;SYNC.known=_sm.uid||_sm.email||'';SYNC.dirty=!!_sm.dirty;}catch(e){}
function syncMeta(){try{localStorage.setItem('booklyn:sync',JSON.stringify({base:SYNC.base,last:SYNC.last,uid:SYNC.uid||SYNC.known||'',dirty:SYNC.dirty}));}catch(e){}}
function save(){
  if(readOnly) return; clearTimeout(saveT);
  if(!SYNC.adopting){SYNC.dirty=true;syncMeta();if(SYNC.me)syncSchedule();}
  saveT=setTimeout(function(){try{localStorage.setItem(KEY,JSON.stringify(state));storageOK=true;}catch(e){storageOK=false;}},150);
}
state=load();

/* ================= file storage (IndexedDB) ================= */
var FILES=[], dbp, filesOK=true;
function idb(){
  if(dbp) return dbp;
  dbp=new Promise(function(res,rej){
    if(!window.indexedDB){rej(new Error('no indexedDB'));return;}
    var r=indexedDB.open('booklyn',1);
    r.onupgradeneeded=function(){var d=r.result;d.createObjectStore('meta',{keyPath:'id'});d.createObjectStore('blobs');};
    r.onsuccess=function(){res(r.result);}; r.onerror=function(){rej(r.error);};
  });
  return dbp;
}
function run(stores,mode,fn){
  return idb().then(function(d){return new Promise(function(res,rej){
    var t=d.transaction(stores,mode),out;
    try{out=fn(t);}catch(e){rej(e);return;}
    t.oncomplete=function(){res(out&&out.result!==undefined?out.result:undefined);};
    t.onerror=function(){rej(t.error);}; t.onabort=function(){rej(t.error||new Error('aborted'));};
  });});
}
function dbAll(){return run(['meta'],'readonly',function(t){return t.objectStore('meta').getAll();});}
function dbPut(m){return run(['meta'],'readwrite',function(t){t.objectStore('meta').put(m);});}
function dbAdd(m,b){return run(['meta','blobs'],'readwrite',function(t){t.objectStore('meta').put(m);t.objectStore('blobs').put(b,m.id);});}
function dbBlob(id){return run(['blobs'],'readonly',function(t){return t.objectStore('blobs').get(id);});}
function dbDel(id){return run(['meta','blobs'],'readwrite',function(t){t.objectStore('meta').delete(id);t.objectStore('blobs').delete(id);});}
async function sha(file){
  try{
    var b=await file.arrayBuffer(), h=await crypto.subtle.digest('SHA-256',b);
    return Array.prototype.map.call(new Uint8Array(h),function(x){return ('0'+x.toString(16)).slice(-2);}).join('');
  }catch(e){return null;}
}

/* ================= semesters, modules, units ================= */
function curSem(){return state.sems.filter(function(s){return s.id===state.activeSem;})[0]||null;}
function M(id){for(var i=0;i<state.sems.length;i++){var m=state.sems[i].modules.filter(function(x){return x.id===id;})[0];if(m)return m;}return null;}
function semOf(mid){return state.sems.filter(function(s){return s.modules.some(function(m){return m.id===mid;});})[0]||null;}
function weekNo(sem){
  if(!sem||!sem.start) return 1;
  return clamp(Math.floor((dayStart(new Date())-pdate(sem.start))/(7*864e5))+1,1,60);
}
function mats(m,u){
  var base=((m.base&&m.base[u])||[]).map(function(n,i){return {id:m.id+'-'+u+'-'+i,name:n,type:ext(n),size:0,blob:false};});
  var mine=FILES.filter(function(f){return f.status==='imported'&&f.mod===m.id&&f.unit===u;})
                .map(function(f){return {id:f.id,name:f.name,type:ext(f.name),size:f.size,blob:true};});
  return base.concat(mine);
}
function isSeen(x,m,u){return !!(state.seen[x.id]||state.lit[m.id+':'+u]);}
function uStatus(m,u){
  var li=litInfo(m.id+':'+u); if(li) return li.state;
  var ms=mats(m,u); if(!ms.length) return 'empty';
  if(ms.some(function(x){return state.seen[x.id];})) return 'progress';
  return 'ready';
}
/* ---- lights, rent and coins ---- */
var LV=[7,14,30], FADE=7, RENT_CAP=25, RENT_STORE=3, PRICE={tree:30,lamp:50,garden:80,paint:120,shield:40,pool:90,fountain:70,flowers:40,fence:35,roofpool:110,helipad:140,solar:90,scene:150};
var SCENES={park:'Evening park',autumn:'Autumn',blossom:'Cherry blossom',snow:'Snow',desert:'Desert'};
function sceneKey(){var sm=curSem();var k=sm&&state.scenery[sm.id];return SCENES[k]?k:'park';}
function roofOf(d){return (d&&(d.roof||(d.garden?'garden':'')))||'';}
var GUESTS=['Mira','Jonas','Ana','Lukas','Sofia','Elias','Lena','Marco','Nora','Tim','Chiara','Noah','Ida','Leo','Emma','Aron'];
function litTs(k){var t=state.lit[k];return t?(typeof t==='number'&&t>1e12?t:Date.now()):0;}
function natInfo(k){
  var t=litTs(k);if(!t)return null;
  var iv=LV[Math.min(state.lvl[k]||0,2)],age=(Date.now()-t)/864e5;
  if(age<iv)return {state:'lit',left:Math.max(1,Math.ceil(iv-age)),until:t+iv*864e5};
  if(age<iv+FADE)return {state:'fading',left:Math.max(1,Math.ceil(iv+FADE-age)),until:t+(iv+FADE)*864e5};
  return null;
}
function litInfo(k){
  if(state.pin&&state.pin[k])return {state:'lit',pinned:true};
  return natInfo(k);
}
function realOn(m,u){return !!natInfo(m.id+':'+u);}
function fmtLeft(ms,compact){
  var s=Math.max(0,Math.floor(ms/1000)),d=Math.floor(s/86400),h=Math.floor(s%86400/3600),mi=Math.floor(s%3600/60),sc=s%60;
  function p(n){return n<10?'0'+n:''+n;}
  if(compact){return d>0?d+'d '+h+'h':h>0?h+'h '+mi+'m':mi+'m '+p(sc)+'s';}
  return d>0?d+'d '+p(h)+'h '+p(mi)+'m '+p(sc)+'s':h>0?h+'h '+p(mi)+'m '+p(sc)+'s':mi+'m '+p(sc)+'s';
}
function cdSpan(until,compact){return '<span class="cd" data-until="'+(+until||0)+'"'+(compact?' data-compact="1"':'')+'>'+fmtLeft(until-Date.now(),compact)+'</span>';}
function isOn(st){return st==='lit'||st==='fading';}
function guestFor(k){return GUESTS[hashStr(k)%GUESTS.length];}
function rentPerDay(){
  var n=0;state.sems.forEach(function(sem){if(sem.finished)return;sem.modules.forEach(function(m){for(var u=1;u<=m.units;u++){var k=m.id+':'+u;if(isOn(uStatus(m,u))&&!(state.pin&&state.pin[k]))n++;}});});
  return Math.min(RENT_CAP,n);
}
function collectRent(){
  if(readOnly)return 0;
  var now=Date.now();
  if(!state.rentAt){state.rentAt=now;save();return 0;}
  var days=Math.floor((now-state.rentAt)/864e5);if(days<1)return 0;
  var pay=Math.min(days,RENT_STORE)*rentPerDay();
  state.rentAt=days>RENT_STORE?now:state.rentAt+days*864e5;
  state.coins+=pay;save();return pay;
}
var MAXU=30;
function ensureUnits(m,n){n=clamp(n,1,MAXU);if(n<=m.units)return false;for(var u=m.units+1;u<=n;u++)m.titles[u-1]=m.titles[u-1]||('Week '+u);m.units=n;save();return true;}
function litCount(m){var n=0;for(var u=1;u<=m.units;u++) if(isOn(uStatus(m,u))) n++;return n;}
function totals(sem){var l=0,t=0;sem.modules.forEach(function(m){l+=litCount(m);t+=m.units;});return {l:l,t:t};}
function pending(){var s=curSem();return FILES.filter(function(f){return f.status==='pending'&&(!s||f.sem===s.id);});}
function semDeadlines(sem){var ids={};sem.modules.forEach(function(m){ids[m.id]=1;});return state.deadlines.filter(function(d){return !d.mod||ids[d.mod];});}
function nextUp(sem){
  var up=semDeadlines(sem).filter(function(d){return d.mod&&!state.tasksDone[d.id]&&daysTo(d)>=0;}).sort(function(a,b){return pdate(a.date)-pdate(b.date);});
  for(var i=0;i<up.length;i++){var m=M(up[i].mod);if(!m)continue;
    for(var u=1;u<=m.units;u++) if(uStatus(m,u)!=='lit'&&mats(m,u).length) return {m:m,u:u,why:up[i].title+' · '+rel(up[i])};}
  for(var j=0;j<sem.modules.length;j++){var mm=sem.modules[j];
    for(var k=1;k<=mm.units;k++) if(uStatus(mm,k)!=='lit'&&mats(mm,k).length) return {m:mm,u:k,why:'The next dark floor in your district'};}
  return null;
}

/* ================= smart sorting (by file name) ================= */
function suggest(text,sem){
  var low=text.toLowerCase().replace(/\.[a-z0-9]+$/,''), best=null, second=0;
  sem.modules.forEach(function(m){
    var sc=0,hits=[],code=m.code.toLowerCase().replace(/[^a-z0-9]/g,'');
    if(code&&new RegExp('(^|[^a-z0-9])'+code+'([^a-z0-9]|$)').test(low)){sc+=5;hits.push(m.code);}
    String(m.kw||'').split(',').forEach(function(k){k=k.trim().toLowerCase();if(k.length>2&&low.indexOf(k)>-1){sc+=2;hits.push(k);}});
    if(!sc) return;
    if(!best||sc>best.sc){if(best)second=Math.max(second,best.sc);best={m:m,sc:sc,hits:hits};}
    else second=Math.max(second,sc);
  });
  var mod=best&&best.sc>second?best.m:null, unit=0;
  var mm=/(?:^|[^a-z])(?:sw|week|woche|wk|lecture|lec|session|chapter|ch|unit|module|kapitel)[ _.\-]?0*(\d{1,2})(?![0-9])/i.exec(text);
  if(mm) unit=+mm[1];
  if(mod&&(unit<1||unit>MAXU)) unit=0;
  if(mod&&unit>mod.units) ensureUnits(mod,unit);
  var why;
  if(mod&&unit) why='Matched '+best.hits.slice(0,2).join(', ')+' and unit '+unit;
  else if(mod) why='Matched '+best.hits.slice(0,2).join(', ')+', but no week number in the name';
  else if(best&&second===best.sc) why='Several modules match this name';
  else if(unit) why='Found week '+unit+' but no module';
  else why='No module or week found in the name';
  return {mod:mod?mod.id:'',unit:unit,sure:!!(mod&&unit),why:why};
}

/* ================= adding files ================= */
async function addFiles(list,preset,skipDups){
  var sem=curSem(); if(!sem){toast('Set up a semester first.');return;}
  var arr=Array.prototype.slice.call(list); if(!arr.length) return;
  try{if(navigator.storage&&navigator.storage.persist) navigator.storage.persist();}catch(e){}
  var added=0,dups=0,failed=0,ids=[],hashes=[];
  for(var i=0;i<arr.length;i++){
    var f=arr[i];
    toast('Adding '+(i+1)+' of '+arr.length+'…',true);
    var h=await sha(f), dup=h?FILES.filter(function(x){return x.hash===h;})[0]:null;if(h)hashes.push(h);
    var rec={id:uid(),name:f.name,path:f.webkitRelativePath||'',size:f.size,type:f.type,mtime:f.lastModified,hash:h,addedAt:Date.now(),sem:sem.id,dup:null};
    if(dup){dups++;continue;}
    if(preset){
      if(dup){dups++;continue;}
      rec.status='imported';rec.mod=preset.mod;rec.unit=preset.unit;rec.include=true;rec.confirmed=true;rec.flag=false;rec.why='';
    } else {
      var s=suggest(rec.path||rec.name,sem);
      var m=s.mod?M(s.mod):null;
      rec.status='pending';rec.mod=s.mod;rec.unit=s.unit||(m?clamp(weekNo(sem),1,m.units):1);
      rec.dup=dup?dup.id:null;rec.flag=!s.sure||!!dup;rec.include=!dup;rec.confirmed=false;
      rec.why=dup?('Same content as “'+dup.name+'”'):s.why;
    }
    try{await dbAdd(rec,f);FILES.push(rec);ids.push(rec.id);added++;}
    catch(e){failed++; if(e&&e.name==='QuotaExceededError'){toast('Not enough storage left on this device.');break;}}
  }
  $('#toast').classList.remove('show');
  var msg=added+' file'+(added===1?'':'s')+' added'+(dups?', '+dups+' duplicate'+(dups>1?'s':'')+' skipped':'')+(failed?', '+failed+' failed':'')+'.';
  if(!preset&&added&&route().name!=='port'){go('#/port');}
  render(); toast(msg);
  return {added:added,dups:dups,failed:failed,hashes:hashes};
}
async function openFile(id){
  var rec=FILES.filter(function(f){return f.id===id;})[0]; if(!rec) return;
  try{
    var b=await dbBlob(id); if(!b){toast('This file is missing from storage.');return;}
    var url=URL.createObjectURL(b), w=null;
    try{w=window.open(url,'_blank');}catch(e){}
    if(!w){var a=document.createElement('a');a.href=url;a.download=rec.name;document.body.appendChild(a);a.click();a.remove();}
    setTimeout(function(){URL.revokeObjectURL(url);},120000);
  }catch(e){toast('Could not open this file.');}
}

/* ================= building (svg) ================= */
function building(m,pop){
  var N=m.units,fh=Math.min(13,91/N),base=106,rb=base-N*fh,s='<svg class="bsvg" viewBox="0 0 48 109" style="--h:'+m.h+'" aria-hidden="true" focusable="false">';
  var rk=0;for(var ci=0;ci<m.code.length;ci++)rk+=m.code.charCodeAt(ci);rk=rk%3;
  if(rk===0) s+='<polygon class="roof" points="5,'+rb+' 24,'+(rb-11)+' 43,'+rb+'"/>';
  else if(rk===1) s+='<rect class="roof" x="19" y="'+(rb-14)+'" width="10" height="14" rx="1"/><rect class="roof" x="5" y="'+(rb-6)+'" width="38" height="6" rx="1"/>';
  else s+='<rect class="roof" x="5" y="'+(rb-6)+'" width="38" height="6" rx="1"/><rect class="roof" x="30" y="'+(rb-11)+'" width="6" height="5"/>';
  for(var u=N;u>=1;u--){
    var y=rb+(N-u)*fh,st=uStatus(m,u),wh=Math.max(1.2,fh*0.42),wy=y+(fh-1-wh)/2;
    s+='<g class="st-'+st+(pop===u?' pop':'')+'"><rect class="wall" x="5" y="'+y.toFixed(2)+'" width="38" height="'+(fh-1).toFixed(2)+'" rx="1"/>'
     +'<rect class="win" x="10" y="'+wy.toFixed(2)+'" width="7" height="'+wh.toFixed(2)+'" rx="1"/><rect class="win" x="20.5" y="'+wy.toFixed(2)+'" width="7" height="'+wh.toFixed(2)+'" rx="1"/><rect class="win" x="31" y="'+wy.toFixed(2)+'" width="7" height="'+wh.toFixed(2)+'" rx="1"/></g>';
  }
  return s+'</svg>';
}
function chip(st){var t={lit:'Lights on',fading:'Fading',progress:'In progress',ready:'Ready',empty:'Waiting for files'}[st];return '<span class="chip s-'+st+'">'+t+'</span>';}

/* ================= isometric city ================= */
var CITY={TW:32,TH:16,P:4.2,F:1.8,ZB:2.4};
function hashStr(s){var h=7;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return h;}
function iso(x,y,z){return [(x-y)*CITY.TW,(x+y)*CITY.TH-(z||0)];}
function pts(a){return a.map(function(p){return p[0].toFixed(1)+','+p[1].toFixed(1);}).join(' ');}
function cityLayout(n){
  var best=null;
  for(var c=1;c<=n;c++){var r=Math.ceil(n/c),sc=(c*r-n)*1.2+Math.abs(Math.log((c/r)/1.4))*2;if(!best||sc<best.sc)best={c:c,r:r,sc:sc};}
  return best;
}
function cityMods(sem){
  return sem.modules.map(function(m){
    var st=[];for(var u=1;u<=m.units;u++)st.push(uStatus(m,u));
    var dc=state.deco[m.id]||{};return {id:m.id,k:m.id,code:m.code,name:m.name,h:dc.hue!=null?dc.hue:m.h,N:m.units,st:st,link:'#/m/'+m.id,d:dc};
  });
}
function sampleMods(){
  function mk(code,N,h,l,p,r){var st=[];for(var i=0;i<N;i++)st.push(i<l?'lit':i<l+p?'progress':i<l+p+r?'ready':'empty');return {id:code,code:code,name:code,h:h,N:N,st:st,link:''};}
  return [mk('PROG',14,215,6,1,2),mk('NET',12,165,5,1,1),mk('DATA',10,20,3,2,1),mk('TEAM',8,270,8,0,0),mk('LAW',10,45,2,1,2),mk('MATH',12,330,4,1,2)];
}
function setupMods(){
  var out=[];
  ui.setup.mods.forEach(function(m,i){
    var code=String(m.code).trim().toUpperCase().slice(0,8);if(!code)return;
    var N=clamp(parseInt(m.units,10)||14,1,MAXU),st=[];for(var u=0;u<N;u++)st.push('ready');
    out.push({id:'s'+i,code:code,name:m.name,h:HUES[(state.sems.length*3+i)%HUES.length],N:N,st:st,link:'',nocount:true});
  });
  if(!out.length){var st=[];for(var u=0;u<6;u++)st.push('empty');out.push({id:'ghost',code:'Your first module',name:'',h:215,N:6,st:st,link:'',nocount:true});}
  return out;
}
function boxP(x0,y0,x1,y1,z0,z1,c){
  return '<polygon class="'+c[0]+'" points="'+pts([iso(x0,y1,z0),iso(x1,y1,z0),iso(x1,y1,z1),iso(x0,y1,z1)])+'"/>'
   +'<polygon class="'+c[1]+'" points="'+pts([iso(x1,y1,z0),iso(x1,y0,z0),iso(x1,y0,z1),iso(x1,y1,z1)])+'"/>'
   +'<polygon class="'+c[2]+'" points="'+pts([iso(x0,y0,z1),iso(x1,y0,z1),iso(x1,y1,z1),iso(x0,y1,z1)])+'"/>';
}
var SCENE='park';
function cactusSVG(x,y,s,z){
  var p=iso(x,y,z||0);
  return '<g transform="translate('+p[0].toFixed(1)+' '+p[1].toFixed(1)+')"><ellipse class="ts" cx="3" cy="1" rx="'+(6*s).toFixed(1)+'" ry="'+(2.8*s).toFixed(1)+'"/><rect class="cac" x="'+(-2*s).toFixed(1)+'" y="'+(-15*s).toFixed(1)+'" width="'+(4*s).toFixed(1)+'" height="'+(15*s).toFixed(1)+'" rx="'+(2*s).toFixed(1)+'"/><rect class="cac" x="'+(-6.5*s).toFixed(1)+'" y="'+(-11*s).toFixed(1)+'" width="'+(3*s).toFixed(1)+'" height="'+(6*s).toFixed(1)+'" rx="'+(1.5*s).toFixed(1)+'"/><rect class="cac" x="'+(-6.5*s).toFixed(1)+'" y="'+(-6.2*s).toFixed(1)+'" width="'+(5*s).toFixed(1)+'" height="'+(2.6*s).toFixed(1)+'"/><rect class="cac" x="'+(3.5*s).toFixed(1)+'" y="'+(-13*s).toFixed(1)+'" width="'+(3*s).toFixed(1)+'" height="'+(6*s).toFixed(1)+'" rx="'+(1.5*s).toFixed(1)+'"/><rect class="cac" x="'+(0.5*s).toFixed(1)+'" y="'+(-8.2*s).toFixed(1)+'" width="'+(5*s).toFixed(1)+'" height="'+(2.6*s).toFixed(1)+'"/></g>';
}
function pineSVG(x,y,s,z){
  var p=iso(x,y,z||0);
  function tri(w,y0,y1){return '<polygon class="tc1" points="'+(-w*s).toFixed(1)+','+(y0*s).toFixed(1)+' '+(w*s).toFixed(1)+','+(y0*s).toFixed(1)+' 0,'+(y1*s).toFixed(1)+'"/>';}
  return '<g transform="translate('+p[0].toFixed(1)+' '+p[1].toFixed(1)+')"><ellipse class="ts" cx="3" cy="1" rx="'+(7*s).toFixed(1)+'" ry="'+(3.2*s).toFixed(1)+'"/><rect class="tk" x="-1" y="'+(-5*s).toFixed(1)+'" width="2" height="'+(5*s).toFixed(1)+'"/>'+tri(7.5,-4,-15)+tri(5.6,-10,-21)+tri(3.6,-16,-26)+'<polygon class="snowcap" points="'+(-2.2*s).toFixed(1)+','+(-20.2*s).toFixed(1)+' '+(2.2*s).toFixed(1)+','+(-20.2*s).toFixed(1)+' 0,'+(-26*s).toFixed(1)+'"/></g>';
}
function treeSVG(x,y,s,z){
  if(SCENE==='desert')return cactusSVG(x,y,s,z);
  if(SCENE==='snow')return pineSVG(x,y,s,z);
  var p=iso(x,y,z||0);
  return '<g transform="translate('+p[0].toFixed(1)+' '+p[1].toFixed(1)+')"><ellipse class="ts" cx="3" cy="1" rx="'+(7*s).toFixed(1)+'" ry="'+(3.2*s).toFixed(1)+'"/><rect class="tk" x="-1" y="'+(-7*s).toFixed(1)+'" width="2" height="'+(7*s).toFixed(1)+'"/><circle class="tc1" cy="'+(-12*s).toFixed(1)+'" r="'+(7*s).toFixed(1)+'"/><circle class="tc2" cx="-1.6" cy="'+(-14.2*s).toFixed(1)+'" r="'+(4.6*s).toFixed(1)+'"/></g>';
}
function lampSVG(x,y){
  var p=iso(x,y,0);
  return '<g transform="translate('+p[0].toFixed(1)+' '+p[1].toFixed(1)+')"><line class="lp" x1="0" y1="0" x2="0" y2="-15"/><circle class="lamph" cy="-16" r="7"/><circle class="lamp" cy="-16" r="2.6" filter="url(#cglow)"/></g>';
}
function flatP(x0,y0,x1,y1,z,c){return '<polygon class="'+c+'" points="'+pts([iso(x0,y0,z),iso(x1,y0,z),iso(x1,y1,z),iso(x0,y1,z)])+'"/>';}
function poolSVG(x0,y0,x1,y1,z){
  var a=iso((x0+x1)/2-.1,(y0+y1)/2-.1,z+.4),b=iso((x0+x1)/2+.12,(y0+y1)/2+.12,z+.4);
  return boxP(x0,y0,x1,y1,z,z+.8,['pool-rl','pool-rr','pool-r'])+flatP(x0+.08,y0+.08,x1-.08,y1-.08,z+.85,'pool-w')+'<line class="pool-h" x1="'+a[0].toFixed(1)+'" y1="'+a[1].toFixed(1)+'" x2="'+b[0].toFixed(1)+'" y2="'+b[1].toFixed(1)+'"/>';
}
function fountainSVG(x,y){
  var t=iso(x,y,9),b=iso(x,y,3);
  return boxP(x-.4,y-.4,x+.4,y+.4,0,2.4,['pool-rl','pool-rr','pool-r'])+flatP(x-.32,y-.32,x+.32,y+.32,2.6,'pool-w')
   +'<line class="fnj" x1="'+b[0].toFixed(1)+'" y1="'+b[1].toFixed(1)+'" x2="'+t[0].toFixed(1)+'" y2="'+t[1].toFixed(1)+'"/><circle class="fnd" cx="'+(t[0]-3).toFixed(1)+'" cy="'+(t[1]+3).toFixed(1)+'" r="1.2"/><circle class="fnd" cx="'+(t[0]+3).toFixed(1)+'" cy="'+(t[1]+3).toFixed(1)+'" r="1.2"/><circle class="fnd" cx="'+t[0].toFixed(1)+'" cy="'+(t[1]-1).toFixed(1)+'" r="1.4"/>';
}
function flowersSVG(x0,y0,x1,y1,seed){
  var o=flatP(x0,y0,x1,y1,.3,'bed'),n=0;
  for(var i=0;i<9;i++){var fx=x0+(x1-x0)*(((seed>>(i%7))*7+i*37)%10)/10+.04,fy=y0+(y1-y0)*(((seed>>(i%5))*3+i*53)%10)/10+.04,p=iso(fx,fy,.8);o+='<circle class="fw fw'+((seed+i)%4)+'" cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="1.7"/>';}
  return o;
}
function fenceSVG(x0,y0,x1,y1){
  var o='',n=Math.max(2,Math.round(Math.hypot(x1-x0,y1-y0)/.38)),a=iso(x0,y0,5.5),b=iso(x1,y1,5.5);
  for(var i=0;i<=n;i++){var fx=x0+(x1-x0)*i/n,fy=y0+(y1-y0)*i/n,p=iso(fx,fy,0),q=iso(fx,fy,6);o+='<line class="fp" x1="'+p[0].toFixed(1)+'" y1="'+p[1].toFixed(1)+'" x2="'+q[0].toFixed(1)+'" y2="'+q[1].toFixed(1)+'"/>';}
  return o+'<line class="fr" x1="'+a[0].toFixed(1)+'" y1="'+a[1].toFixed(1)+'" x2="'+b[0].toFixed(1)+'" y2="'+b[1].toFixed(1)+'"/>';
}
function helipadSVG(cx,cy,z){
  var ring=[],i;for(i=0;i<24;i++){var an=i/24*Math.PI*2;ring.push(iso(cx+Math.cos(an)*.78,cy+Math.sin(an)*.78,z+.3));}
  function L(ax,ay,bx,by){var p=iso(ax,ay,z+.4),q=iso(bx,by,z+.4);return '<line class="hp-l" x1="'+p[0].toFixed(1)+'" y1="'+p[1].toFixed(1)+'" x2="'+q[0].toFixed(1)+'" y2="'+q[1].toFixed(1)+'"/>';}
  return '<polygon class="hp-c" points="'+pts(ring)+'"/>'+L(cx-.25,cy-.3,cx-.25,cy+.3)+L(cx+.25,cy-.3,cx+.25,cy+.3)+L(cx-.25,cy,cx+.25,cy);
}
function solarSVG(cx,cy,z){
  var o='';
  [[cx-.72,cx-.06],[cx+.06,cx+.72]].forEach(function(r){
    o+='<polygon class="sol" points="'+pts([iso(r[0],cy-.5,z+3.2),iso(r[1],cy-.5,z+3.2),iso(r[1],cy+.5,z+.6),iso(r[0],cy+.5,z+.6)])+'"/>';
    var m1=iso((r[0]+r[1])/2,cy-.5,z+3.2),m2=iso((r[0]+r[1])/2,cy+.5,z+.6),m3=iso(r[0],cy,z+1.9),m4=iso(r[1],cy,z+1.9);
    o+='<line class="sol-g" x1="'+m1[0].toFixed(1)+'" y1="'+m1[1].toFixed(1)+'" x2="'+m2[0].toFixed(1)+'" y2="'+m2[1].toFixed(1)+'"/><line class="sol-g" x1="'+m3[0].toFixed(1)+'" y1="'+m3[1].toFixed(1)+'" x2="'+m4[0].toFixed(1)+'" y2="'+m4[1].toFixed(1)+'"/>';
  });
  return o;
}
var GN=['Mara','Luca','Noah','Lena','Elias','Sofia','Jonas','Nina','Ben','Lia','Marco','Aylin','Dario','Yara','Tim','Alma','Finn','Elena','Omar','Mila','Leo','Anja','Samir','Clara','Nico','Ida','Tariq','Jana','Remo','Emma','Davide','Selin','Paul','Mia','Andri','Laura','Kian','Rosa','Fabio','Zoe','Milo','Nora','Aron','Lucia','Jari','Eva','Timo','Dina','Gian','Alba','Pablo','Irene','Hugo','Lotte','Enzo','Maya','Rafa','Tina','Yusuf','Carla'];
function guestName(modId,u){return GN[(hashStr(String(modId))+u*7)%GN.length];}
function personSVG(xc,y1,z,hp,v){
  var p=iso(xc,y1,z),b=hp*.3,r=hp*.17,o='<g class="guest" transform="matrix(1 .5 0 1 '+p[0].toFixed(2)+' '+p[1].toFixed(2)+')">';
  o+='<path d="M'+(-b).toFixed(2)+',0 L'+(-b).toFixed(2)+','+(-hp*.4).toFixed(2)+' Q'+(-b).toFixed(2)+','+(-hp*.6).toFixed(2)+' 0,'+(-hp*.62).toFixed(2)+' Q'+b.toFixed(2)+','+(-hp*.6).toFixed(2)+' '+b.toFixed(2)+','+(-hp*.4).toFixed(2)+' L'+b.toFixed(2)+',0 Z"/>';
  o+='<rect x="'+(-r*.45).toFixed(2)+'" y="'+(-hp*.7).toFixed(2)+'" width="'+(r*.9).toFixed(2)+'" height="'+(hp*.12).toFixed(2)+'"/>';
  o+='<ellipse cx="0" cy="'+(-hp*.8).toFixed(2)+'" rx="'+(r*.92).toFixed(2)+'" ry="'+(r*1.08).toFixed(2)+'"/>';
  if(v===1)o+='<path class="gh" d="M'+(-r).toFixed(2)+','+(-hp*.8).toFixed(2)+' Q'+(-r).toFixed(2)+','+(-hp*1.02).toFixed(2)+' 0,'+(-hp*1.0).toFixed(2)+' Q'+r.toFixed(2)+','+(-hp*1.02).toFixed(2)+' '+r.toFixed(2)+','+(-hp*.8).toFixed(2)+' Q'+(r*.4).toFixed(2)+','+(-hp*.9).toFixed(2)+' '+(-r).toFixed(2)+','+(-hp*.8).toFixed(2)+'Z"/>';
  if(v===2)o+='<path class="ga" d="M'+b.toFixed(2)+','+(-hp*.38).toFixed(2)+' L'+(b+hp*.22).toFixed(2)+','+(-hp*.78).toFixed(2)+'"/>';
  return o+'</g>';
}
function bldgSVG(m,x0,y0,x1,y1,idx,I){
  var N=m.N,fh=clamp(96/N,4,9),H=N*fh,zb=CITY.ZB,lit=0;
  m.st.forEach(function(s){if(isOn(s))lit++;});
  var s='<g class="bgrp" style="--h:'+m.h+';--i:'+idx+'"'+(I&&m.link?' data-a="go" data-to="'+m.link+'"':'')+'>';
  if(I&&m.link) s+='<title>'+esc(m.code+' · '+m.name+': '+lit+' of '+N+' lights on')+'</title>';
  s+='<polygon class="shadow" points="'+pts([iso(x0+.2,y0+.2,0),iso(x1+.55,y0+.2,0),iso(x1+.55,y1+.55,0),iso(x0+.2,y1+.55,0)])+'"/>';
  s+=boxP(x0-.2,y0-.2,x1+.2,y1+.2,0,zb,['pl-l','pl-r','pl-t']);
  var fl='',wl='',wo='',wg='',T=[[.14,.4],[.6,.86]];
  for(var u=1;u<=N;u++){
    var z0=zb+(u-1)*fh,z1=zb+u*fh,st=m.st[u-1];
    fl+='<polygon class="fl fl-l fl-'+st+'" points="'+pts([iso(x0,y1,z0),iso(x1,y1,z0),iso(x1,y1,z1),iso(x0,y1,z1)])+'">'+(I&&!m.nocount&&(st==='lit'||st==='fading')?'<title>'+esc(m.code+' · floor '+u+' · '+guestName(m.k||m.code,u)+(st==='fading'?' (leaving soon)':' lives here')+(function(){var q=natInfo((m.k||m.id||m.code)+':'+u);return q&&q.until&&!(state.pin&&state.pin[(m.k||m.id||m.code)+':'+u])?' · '+fmtLeft(q.until-Date.now(),true)+' left':'';})())+'</title>':'')+'</polygon>'
      +'<polygon class="fl fl-r fl-'+st+'" points="'+pts([iso(x1,y1,z0),iso(x1,y0,z0),iso(x1,y0,z1),iso(x1,y1,z1)])+'"/>';
    if(st!=='empty'){
      var za=z0+fh*.18,zc=z0+fh*.8,wc='w w-'+st,buf='';
      T.forEach(function(t){
        var xa=x0+(x1-x0)*t[0],xb=x0+(x1-x0)*t[1],ya=y0+(y1-y0)*t[0],yb=y0+(y1-y0)*t[1];
        buf+='<polygon class="'+wc+'" points="'+pts([iso(xa,y1,za),iso(xb,y1,za),iso(xb,y1,zc),iso(xa,y1,zc)])+'"/>'
          +'<polygon class="'+wc+'" points="'+pts([iso(x1,ya,za),iso(x1,yb,za),iso(x1,yb,zc),iso(x1,ya,zc)])+'"/>';
      });
      if(st==='lit'){wl+=buf;var gv=hashStr((m.k||m.code)+':'+u)%3,xc=x0+(x1-x0)*.27;wg+=personSVG(xc,y1,za,(zc-za)*.9,gv);
        if(!m.nocount){var tp=iso(x0+(x1-x0)*.46,y1,z0+fh*.34);wg+='<text class="gname" transform="matrix(1 .5 0 1 '+tp[0].toFixed(2)+' '+tp[1].toFixed(2)+')" font-size="'+(fh*.5).toFixed(2)+'">'+esc(guestName(m.k||m.code,u))+'</text>';}}
      else wo+=buf;
    }
  }
  var allEmpty=m.st.every(function(x){return x==='empty';});
  s+=fl+'<polygon class="door'+(allEmpty&&I?' door-new':'')+'" points="'+pts([iso(x0+(x1-x0)*.44,y1,zb),iso(x0+(x1-x0)*.56,y1,zb),iso(x0+(x1-x0)*.56,y1,zb+fh*.62),iso(x0+(x1-x0)*.44,y1,zb+fh*.62)])+'"/>'
   +'<g>'+wo+'</g><g class="lw" filter="url(#cglow)">'+wl+'</g><g>'+wg+'</g>';
  var HT=zb+H,cx=(x0+x1)/2,cy=(y0+y1)/2,v=hashStr(m.code)%3,top=HT;
  s+='<polygon class="roof" points="'+pts([iso(x0,y0,HT),iso(x1,y0,HT),iso(x1,y1,HT),iso(x0,y1,HT)])+'"/>';
  var rf=roofOf(m.d);
  if(rf==='garden'){s+=boxP(cx-.75,cy-.75,cx+.75,cy+.75,HT,HT+1.6,['gd-l','gd-r','gd-t'])+treeSVG(cx-.3,cy-.35,.5,HT+1.6)+treeSVG(cx+.35,cy+.1,.45,HT+1.6)+treeSVG(cx-.2,cy+.4,.4,HT+1.6);top=HT+10;}
  else if(rf==='roofpool'){s+=poolSVG(cx-.7,cy-.7,cx+.7,cy+.7,HT);top=HT+3;}
  else if(rf==='helipad'){s+=helipadSVG(cx,cy,HT);top=HT+3;}
  else if(rf==='solar'){s+=solarSVG(cx,cy,HT);top=HT+5;}
  else if(v===0){s+=boxP(cx-.3,cy-.3,cx+.3,cy+.3,HT,HT+7,['rb-l','rb-r','rb-t']);top=HT+7;}
  else if(v===1){var a=iso(cx,cy,HT),b=iso(cx,cy,HT+18);s+='<line class="ant" x1="'+a[0].toFixed(1)+'" y1="'+a[1].toFixed(1)+'" x2="'+b[0].toFixed(1)+'" y2="'+b[1].toFixed(1)+'"/><circle class="beacon" cx="'+b[0].toFixed(1)+'" cy="'+b[1].toFixed(1)+'" r="1.8"/>';top=HT+18;}
  else{s+=boxP(cx-.45,cy-.2,cx+.1,cy+.35,HT,HT+4,['rb-l','rb-r','rb-t']);s+=boxP(cx+.05,cy-.5,cx+.45,cy-.1,HT,HT+8,['rb-l','rb-r','rb-t']);top=HT+8;}
  if(lit===N&&N>0){var q=iso(cx,cy,top+4);s+='<circle class="star" cx="'+q[0].toFixed(1)+'" cy="'+q[1].toFixed(1)+'" r="4" filter="url(#cglow)"/>';top+=8;}
  var lp=iso(cx,cy,top),cnt=m.nocount?'':(lit+'/'+N),w=Math.max(34,m.code.length*7.4+(cnt?cnt.length*5.8+22:16));
  var LS=window.innerWidth<700?1.6:1;
  s+='<g class="clab" transform="translate('+lp[0].toFixed(1)+' '+(lp[1]-17*LS).toFixed(1)+') scale('+LS+')"><rect x="'+(-w/2).toFixed(1)+'" y="-10" width="'+w.toFixed(1)+'" height="20" rx="10"/><text y="3.6" text-anchor="middle"><tspan class="lc">'+esc(m.code)+'</tspan>'+(cnt?'<tspan class="ln" dx="6">'+cnt+'</tspan>':'')+'</text></g>';
  return s+'</g>';
}
function citySVG(mods,o){
  o=o||{};var I=!!o.interactive,n=mods.length||1,lay=cityLayout(n),C=lay.c,R=lay.r,P=CITY.P,F=CITY.F,items=[],ex=.35,minY=iso(-ex,-ex,0)[1];
  var occupied=mods.length;SCENE=o.scene||sceneKey();
  for(var slot=0;slot<C*R;slot++){
    var cx=slot%C,cy=Math.floor(slot/C),ox=cx*P,oy=cy*P;
    if(slot<occupied){
      var m=mods[slot],x0=ox+(P-F)/2,y0=oy+(P-F)/2,x1=x0+F,y1=y0+F,H=CITY.ZB+m.N*clamp(96/m.N,4,9);
      minY=Math.min(minY,iso(x0,y0,H)[1]-50);
      items.push({d:(x0+x1+y0+y1)/2-.01,html:bldgSVG(m,x0,y0,x1,y1,slot,I)});
      var dc=m.d||{};
      for(var q=0;q<(dc.tree||0)&&q<3;q++){var tp=[[P/2+.5,.7],[.7,P/2+.5],[P-.8,.9]][q];items.push({d:ox+tp[0]+oy+tp[1],html:treeSVG(ox+tp[0],oy+tp[1],1.05)});}
      if(dc.pool)items.push({d:ox+3.5+oy+2.2,html:poolSVG(ox+3.1,oy+1.5,ox+3.8,oy+2.9,0)});
      if(dc.fountain)items.push({d:ox+2.1+oy+3.5,html:fountainSVG(ox+2.1,oy+3.5)});
      if(dc.flowers){items.push({d:ox+.7+oy+1.7,html:flowersSVG(ox+.45,oy+1.2,ox+1.0,oy+2.2,hashStr(m.code))});items.push({d:ox+3.4+oy+3.2,html:flowersSVG(ox+2.6,oy+3.3,ox+3.4,oy+3.8,hashStr(m.code)>>3)});}
      if(dc.fence){items.push({d:ox+oy+P-.3+P-.3+.2,html:fenceSVG(ox+.3,oy+P-.3,ox+P-.3,oy+P-.3)});items.push({d:ox+oy+P-.3+P-.3+.1,html:fenceSVG(ox+P-.3,oy+.3,ox+P-.3,oy+P-.3)});}
      if(dc.lamp){[[x0-.2,y1+.4],[x1+.4,y1+.4]].forEach(function(lp){items.push({d:lp[0]+lp[1]+.05,html:lampSVG(lp[0],lp[1])});});}
      var hs=hashStr(m.code+slot);
      [[.7,.7],[P-.7,.7],[.7,P-.7],[P-.7,P-.7]].forEach(function(sp,j){
        if(j===3||((hs>>j)&1)) items.push({d:ox+sp[0]+oy+sp[1],html:treeSVG(ox+sp[0],oy+sp[1],.8+((hs>>(j+4))&3)*.12)});
      });
    } else {
      [[1.2,1.3],[3.0,1.0],[1.8,2.9],[3.2,3.1]].forEach(function(sp,j){items.push({d:ox+sp[0]+oy+sp[1],html:treeSVG(ox+sp[0],oy+sp[1],.9+(j%2)*.2)});});
    }
  }
  items.sort(function(a,b){return a.d-b.d;});
  var X0=-ex,Y0=-ex,X1=C*P+ex,Y1=R*P+ex,TH=10;
  var left=iso(X0,Y1,0)[0],right=iso(X1,Y0,0)[0],bottom=iso(X1,Y1,0)[1]+TH,pad=26;
  var vb=[left-pad,minY-pad,right-left+2*pad,bottom-minY+2*pad];
  ui.cityVB=vb;
  var T=I?ui.cityT:{x:0,y:0,k:1},g='';
  g+='<polygon class="slab-l" points="'+pts([iso(X0,Y1,0),iso(X1,Y1,0),iso(X1,Y1,-TH),iso(X0,Y1,-TH)])+'"/><polygon class="slab-r" points="'+pts([iso(X1,Y1,0),iso(X1,Y0,0),iso(X1,Y0,-TH),iso(X1,Y1,-TH)])+'"/><polygon class="slab-t" points="'+pts([iso(X0,Y0,0),iso(X1,Y0,0),iso(X1,Y1,0),iso(X0,Y1,0)])+'"/>';
  for(var i=1;i<C;i++) g+='<polyline class="road" points="'+pts([iso(P*i,0,0),iso(P*i,R*P,0)])+'"/>';
  for(var j=1;j<R;j++) g+='<polyline class="road" points="'+pts([iso(0,P*j,0),iso(C*P,P*j,0)])+'"/>';
  for(var s2=0;s2<C*R;s2++){var qx=(s2%C)*P,qy=Math.floor(s2/C)*P;g+='<polygon class="lawn" points="'+pts([iso(qx+.3,qy+.3,0),iso(qx+P-.3,qy+.3,0),iso(qx+P-.3,qy+P-.3,0),iso(qx+.3,qy+P-.3,0)])+'"/>';}
  items.forEach(function(it){g+=it.html;});
  if(SCENE==='snow'){for(var fk=0;fk<46;fk++){var fx=(hashStr('f'+fk)%1000)/1000*C*P,fy=(hashStr('g'+fk)%1000)/1000*R*P,fp=iso(fx,fy,(hashStr('h'+fk)%60)+4);g+='<circle class="flake" style="animation-delay:-'+((fk%9)*.7).toFixed(1)+'s" cx="'+fp[0].toFixed(1)+'" cy="'+fp[1].toFixed(1)+'" r="'+(1+(fk%3)*.5)+'"/>';}}
  var lit=0,tot=0;mods.forEach(function(m){tot+=m.N;m.st.forEach(function(s){if(isOn(s))lit++;});});
  return '<svg class="cityv sc-'+SCENE+(I&&T.k>=2.3?' zin':'')+'"'+(I?' id="citysvg"':'')+' viewBox="'+vb.map(function(v){return v.toFixed(1);}).join(' ')+'" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Your semester as a city: '+mods.length+' buildings, '+lit+' of '+tot+' floors have their lights on"><defs><filter id="cglow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g id="cityg" transform="translate('+T.x.toFixed(1)+' '+T.y.toFixed(1)+') scale('+T.k.toFixed(3)+')">'+g+'</g></svg>';
}
function cityBox(mods,o){
  o=o||{};var I=!!o.interactive,lit=0,tot=0;
  mods.forEach(function(m){tot+=m.N;m.st.forEach(function(s){if(isOn(s))lit++;});});
  var cls='city'+(o.full?' full':'')+(o.build?' build':'')+(I?'':' static');
  var h='<section class="'+cls+'" aria-label="'+esc(o.label||'Your district')+'"><div class="cityvp"'+(I?' data-pz="1"':'')+'>'+citySVG(mods,o)+'</div>';
  if(o.title) h+='<div class="cstat"><span>'+esc(o.title)+'</span><b>'+lit+' of '+tot+' floors lit</b><i class="cbar"><u style="width:'+(tot?Math.round(lit/tot*100):0)+'%"></u></i>'+(o.coins!==undefined?'<button class="ccoin" data-a="go" data-to="#/shop"><i class="cdot"></i>'+o.coins+' coins'+(o.rent?' · +'+o.rent+'/day · next in '+cdSpan((state.rentAt||Date.now())+864e5,true):'')+' · Shop</button>':'')+'</div>';
  if(I) h+='<div class="cctl"><button class="cbtn" data-a="czoom" data-d="1" aria-label="Zoom in">＋</button><button class="cbtn" data-a="czoom" data-d="-1" aria-label="Zoom out">−</button><button class="cbtn" data-a="creset" aria-label="Reset the view">⌖</button>'
    +(o.full?'<button class="cbtn" data-a="cclose" aria-label="Close the full screen view">✕</button>':'<button class="cbtn" data-a="cfull" aria-label="Open the city full screen">⛶</button>')+'</div>';
  if(o.legend!==false) h+='<div class="clegend"><span><i class="lg-lit"></i>Lights on</span><span><i class="lg-progress"></i>In progress</span><span><i class="lg-fading"></i>Fading</span><span><i class="lg-ready"></i>Ready</span><span><i class="lg-empty"></i>Waiting for files</span></div>';
  if(I) h+='<p class="chint">Tap a building to open it. Drag to look around.</p>';
  return h+'</section>';
}
function setupCityHTML(){return cityBox(setupMods(),{interactive:false,legend:false,scene:'park',label:'Preview of your district'});}
/* pan and zoom */
function vpoint(cx,cy){
  var svg=$('#citysvg');if(!svg||!svg.getScreenCTM)return [0,0];
  var pt=svg.createSVGPoint();pt.x=cx;pt.y=cy;var q=pt.matrixTransform(svg.getScreenCTM().inverse());return [q.x,q.y];
}
function clampT(T){
  var v=ui.cityVB;T.k=clamp(T.k,.8,5);if(!v)return T;
  var cx=v[0]+v[2]/2,cy=v[1]+v[3]/2,px=clamp((cx-T.x)/T.k,v[0],v[0]+v[2]),py=clamp((cy-T.y)/T.k,v[1],v[1]+v[3]);
  T.x=cx-px*T.k;T.y=cy-py*T.k;return T;
}
function applyCity(){var g=$('#cityg');if(g){var sv=$('#citysvg');if(sv)sv.classList.toggle('zin',ui.cityT.k>=2.3);var T=ui.cityT;g.setAttribute('transform','translate('+T.x.toFixed(1)+' '+T.y.toFixed(1)+') scale('+T.k.toFixed(3)+')');}}
function zoomAt(T,p,k2){k2=clamp(k2,.8,5);T.x=p[0]-(p[0]-T.x)*(k2/T.k);T.y=p[1]-(p[1]-T.y)*(k2/T.k);T.k=k2;return clampT(T);}
var cityPtrs={},cityGest=null,citySupp=0;
document.addEventListener('click',function(e){if(Date.now()-citySupp<400){e.stopPropagation();e.preventDefault();}},true);
document.addEventListener('pointerdown',function(e){
  var vp=e.target.closest&&e.target.closest('.cityvp[data-pz]');if(!vp)return;
  if(e.pointerType==='mouse'&&e.button!==0)return;
  cityPtrs[e.pointerId]={x:e.clientX,y:e.clientY};
  var ids=Object.keys(cityPtrs),T=ui.cityT;
  if(ids.length===1) cityGest={mode:'pan',sx:e.clientX,sy:e.clientY,p0:vpoint(e.clientX,e.clientY),T0:{x:T.x,y:T.y,k:T.k},moved:false};
  else if(ids.length===2){var a=cityPtrs[ids[0]],b=cityPtrs[ids[1]];cityGest={mode:'pinch',d0:Math.hypot(a.x-b.x,a.y-b.y)||1,T0:{x:T.x,y:T.y,k:T.k},mid:vpoint((a.x+b.x)/2,(a.y+b.y)/2),moved:true};}
});
document.addEventListener('pointermove',function(e){
  if(!cityGest||!cityPtrs[e.pointerId])return;
  cityPtrs[e.pointerId]={x:e.clientX,y:e.clientY};
  if(cityGest.mode==='pan'){
    if(!cityGest.moved&&Math.hypot(e.clientX-cityGest.sx,e.clientY-cityGest.sy)<6)return;
    cityGest.moved=true;
    var p=vpoint(e.clientX,e.clientY);
    ui.cityT=clampT({x:cityGest.T0.x+(p[0]-cityGest.p0[0]),y:cityGest.T0.y+(p[1]-cityGest.p0[1]),k:cityGest.T0.k});applyCity();
  } else {
    var ids=Object.keys(cityPtrs);if(ids.length<2)return;
    var a=cityPtrs[ids[0]],b=cityPtrs[ids[1]],d=Math.hypot(a.x-b.x,a.y-b.y)||1;
    ui.cityT=zoomAt({x:cityGest.T0.x,y:cityGest.T0.y,k:cityGest.T0.k},cityGest.mid,cityGest.T0.k*d/cityGest.d0);applyCity();
  }
});
function cityEnd(e){
  if(!cityPtrs[e.pointerId])return;
  var wasMoved=cityGest&&cityGest.moved;delete cityPtrs[e.pointerId];
  if(wasMoved) citySupp=Date.now();
  if(!Object.keys(cityPtrs).length) cityGest=null;
  else if(cityGest&&cityGest.mode==='pinch') cityGest=null;
}
document.addEventListener('pointerup',cityEnd);document.addEventListener('pointercancel',cityEnd);
document.addEventListener('wheel',function(e){
  var vp=e.target.closest&&e.target.closest('.cityvp[data-pz]');if(!vp)return;
  if(!ui.cityFull&&!(e.ctrlKey||e.metaKey))return;
  e.preventDefault();
  ui.cityT=zoomAt({x:ui.cityT.x,y:ui.cityT.y,k:ui.cityT.k},vpoint(e.clientX,e.clientY),ui.cityT.k*Math.exp(-e.deltaY*.0018));applyCity();
},{passive:false});
document.addEventListener('toggle',function(e){if(e.target&&e.target.id==='devtools')ui.devOpen=e.target.open;},true);
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&ui.cityFull){ui.cityFull=false;render();}});

/* ================= routing ================= */
var memHash='#/';try{memHash=location.hash||'#/';}catch(e){}
var lastRendered=null, study=null, ui={tab:'units',q:'',preset:null,setup:null,dl:null,confirm:null,cityT:{x:0,y:0,k:1},cityFull:false,cityBuild:false,cityVB:null,ilias:{busy:false,items:[],status:'',scanned:false,filter:'todo',skipped:[]}};
var iliasBridge=false, iliasVersion='', iliasRequests={}, CONNECTOR_LATEST='0.4.0', CONNECTOR_MIN_SCAN='0.4.0';
function verNum(v){var p=String(v||'0').split('.');return (+p[0]||0)*1e6+(+p[1]||0)*1e3+(+p[2]||0);}
var READABLE_RX=/\.(pdf|docx|pptx|txt|md|csv|tex|html?|py|java|js|json|sql)$/i,UNREADABLE_RX=/\.(mp4|m4v|mov|mkv|avi|webm|wmv|mpe?g|mp3|m4a|aac|wav|ogg|flac|png|jpe?g|gif|bmp|svg|webp|tiff?|zip|rar|7z|tar|gz|doc|ppt|pps|xls|xlsx|xlsm|ods|odp|odt|exe|dmg|iso|jar|pkt)$/i;
function isMobileDevice(){try{return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)||(window.matchMedia&&matchMedia('(pointer:coarse)').matches&&Math.min(screen.width,screen.height)<900);}catch(e){return false;}}
window.addEventListener('message',function(event){
  if(event.source!==window||event.origin!==location.origin||!event.data||event.data.source!=='booklyn-ilias-extension')return;
  var data=event.data;
  if(data.type==='ready'){iliasBridge=true;iliasVersion=String(data.version||'').slice(0,20);if(route().name==='port')render();return;}
  var request=iliasRequests[data.requestId];if(!request)return;
  clearTimeout(request.timer);delete iliasRequests[data.requestId];request.resolve(data.response||{ok:false,message:'No response from ILIAS.'});
});
function iliasRequest(type,details){
  if(!iliasBridge)return Promise.resolve({ok:false,message:'Install the Booklyn ILIAS Connector, reload Booklyn, then try again.'});
  return new Promise(function(resolve){
    var id=uid(),timer=setTimeout(function(){delete iliasRequests[id];resolve({ok:false,message:'ILIAS took too long to respond. Open ILIAS in a tab, wait for it to load, then try again.'});},type==='fetch'?30000:90000);
    iliasRequests[id]={resolve:resolve,timer:timer};
    window.postMessage(Object.assign({source:'booklyn-app',type:type,requestId:id},details||{}),location.origin);
  });
}
function iliasIn(file){
  var h=state.iliasHash[file.key];
  if(h&&FILES.some(function(f){return f.hash===h;}))return true;
  if(state.iliasImported[file.key]&&!h){var n=String(file.name||'').toLowerCase();return FILES.some(function(f){return String(f.name).toLowerCase()===n;});}
  return false;
}
function iliasCls(file){return iliasIn(file)?'in':state.iliasDismissed[file.key]?'dis':'todo';}
function iliasSuggest(file){
  var sem=curSem();if(!sem)return '';
  var c={modules:sem.modules.map(function(m){return {id:m.id,code:m.code,kw:m.kw,units:MAXU};})};
  var sg=suggest(String(file.name||'')+' '+String(file.context||''),c),m=sg.mod?M(sg.mod):null;
  return m?m.code+(sg.unit?' · week '+sg.unit:''):'';
}
function iliasCounts(){var c={todo:0,in:0,dis:0};ui.ilias.items.forEach(function(f){c[iliasCls(f)]++;});return c;}

/* ---- ILIAS crawl: runs in Booklyn, the connector only fetches pages with your own ILIAS sign-in ---- */
var IL_ORIGIN='https://elearning.hslu.ch', IL_BASE=IL_ORIGIN+'/ilias/';
var IL_SEEDS=[IL_BASE+'ilias.php?baseClass=ildashboardgui&cmd=show',IL_BASE+'ilias.php?baseClass=ilmembershipoverviewgui',IL_BASE+'ilias.php?baseClass=ildashboardgui&cmd=jumpToMemberships'];
var IL_LIM={pages:260,courses:14,perCourse:20,depth:3,conc:6,budget:100000};
var IL_READ=/^(pdf|docx|pptx|txt|md|csv|tex|html?|py|java|js|json|sql)$/i;
var IL_SKIP=/^(mp4|m4v|mov|mkv|avi|webm|wmv|flv|mpe?g|mp3|m4a|aac|wav|ogg|oga|flac|wma|png|jpe?g|gif|bmp|svg|webp|tiff?|zip|rar|7z|tar|gz|tgz|doc|ppt|pps|xls|xlsx|xlsm|ods|odp|odt|exe|dmg|iso|jar|pkt)$/i;
var IL_HINT=/(?:^|[^a-z])(pdf|docx|pptx|doc|ppt|xlsx|xls|zip|rar|mp4|mov|mkv|avi|webm|mp3|m4a|wav|png|jpe?g|gif|txt|csv)(?![a-z])/i;
var IL_CHROME='nav, header, footer, [role="navigation"], .breadcrumb_wrapper, .il-breadcrumbs, .il-maincontrols, #il_mainmenu, .il-layout-page-header, .ilMainMenu';
function ilExt(n){var m=/\.([a-z0-9]{2,5})$/i.exec(String(n||'').trim());return m?m[1].toLowerCase():'';}
function ilKind(e){return IL_READ.test(e)?'doc':IL_SKIP.test(e)?'skip':'unknown';}
function ilUrl(h,base){try{var u=new URL(h,base||IL_BASE);return u.origin===IL_ORIGIN&&u.pathname.indexOf('/ilias/')===0?u:null;}catch(e){return null;}}
function ilIsFile(u,name){
  var t=u.searchParams.get('target')||'',c=(u.searchParams.get('cmdClass')||'').toLowerCase(),m=(u.searchParams.get('cmd')||'').toLowerCase();
  return /^file_\d+/i.test(t)||c==='ilobjfilegui'||m==='sendfile'||/\.(pdf|docx?|pptx?|xlsx?|zip|txt|csv|png|jpe?g)(?:$|[?#])/i.test(u.href)||/\.(pdf|docx?|pptx?|xlsx?|zip|txt|csv)$/i.test(name);
}
/* A real course / folder / group link. Calendar, member, settings and tool links are NOT containers. */
function ilContainer(u){
  var q=u.searchParams,t=q.get('target')||'',c=(q.get('cmdClass')||'').toLowerCase(),b=(q.get('baseClass')||'').toLowerCase(),m=(q.get('cmd')||'').toLowerCase(),ref=q.get('ref_id')||'';
  var x=/^(crs|fold|grp|cat)_(\d+)$/i.exec(t)||/\/go\/(crs|fold|grp|cat)\/(\d+)\/?$/i.exec(u.pathname);
  if(x)return {type:x[1].toLowerCase(),id:x[2]};
  var okCmd=/^(|view|render|frameset)$/.test(m);
  x=/^ilobj(course|folder|group|category)gui$/.exec(c);
  if(x&&ref&&okCmd)return {type:{course:'crs',folder:'fold',group:'grp',category:'cat'}[x[1]],id:ref};
  if(b==='ilrepositorygui'&&ref&&(!c||c==='ilrepositorygui')&&okCmd)return {type:'ref',id:ref};
  if(m==='shownews')return {type:'news',id:''};
  return null;
}
function ilFileKey(u,name){
  var t=u.searchParams.get('target'),ref=u.searchParams.get('ref_id'),obj=u.searchParams.get('obj_id'),m=(u.searchParams.get('cmd')||'').toLowerCase();
  if(t&&/^file_\d+/i.test(t))return 'target:'+t.toLowerCase();
  if(ref&&m==='sendfile')return 'target:file_'+ref;
  if(ref)return 'ref:'+ref;
  if(obj)return 'obj:'+obj;
  var rest=[];u.searchParams.forEach(function(v,k){if(!/^(sess|token|auth|phpsessid)/i.test(k))rest.push(k+'='+v);});
  return 'url:'+u.pathname+'?'+rest.sort().join('&')+':'+name;
}
function ilHint(a){
  var box=a.closest('.il-item, .il-std-item, .ilContainerListItem, li, tr, [class*="ListItem"]'),tx=(box&&box.textContent||'').replace(/\s+/g,' ').trim();
  if(!tx||tx.length>500)return '';var m=IL_HINT.exec(tx);return m?m[1].toLowerCase():'';
}
function ilTitle(doc){return ((doc.querySelector('h1')&&doc.querySelector('h1').textContent)||doc.title||'').replace(/\s+/g,' ').trim().slice(0,120);}
function ilShort(h){try{var u=new URL(h);var keep=[];u.searchParams.forEach(function(v,k){if(!/^(sess|token|auth|phpsessid|client_id)/i.test(k))keep.push(k+'='+v);});return u.pathname.replace('/ilias/','')+(keep.length?'?'+keep.join('&'):'');}catch(e){return String(h).slice(0,80);}}
function ilCollect(doc,pageUrl,files,found,ctx,courseName){
  var anchors=doc.querySelectorAll('a[href]'),n=0;
  for(var i=0;i<anchors.length;i++){
    var a=anchors[i];if(a.closest(IL_CHROME))continue;
    var u=ilUrl(a.getAttribute('href'),pageUrl);if(!u)continue;n++;
    var name=(a.getAttribute('title')||a.getAttribute('aria-label')||a.textContent||'').replace(/\s+/g,' ').trim().slice(0,180);
    if(ilIsFile(u,name)){
      if(!name||/^(download|herunterladen|open|öffnen)$/i.test(name))continue;
      var key=ilFileKey(u,name);
      if(!files.has(key)){var ext=ilExt(name)||ilHint(a);files.set(key,{key:key,name:name,url:u.href,openUrl:u.href,context:ctx,course:courseName,ext:ext,kind:ilKind(ext)});}
    }else{var info=ilContainer(u);if(info)found.push({href:u.href,name:name,info:info});}
  }
  var btns=doc.querySelectorAll('[data-action]');
  for(var j=0;j<btns.length;j++){
    var bu=ilUrl(btns[j].getAttribute('data-action'),pageUrl);
    if(!bu||(bu.searchParams.get('cmd')||'').toLowerCase()!=='sendfile')continue;
    var f=files.get(ilFileKey(bu,''));if(f)f.url=bu.href;
  }
  return n;
}
async function iliasCrawl(){
  var files=new Map(),visited={},courses=[],byKey={},started=Date.now(),pages=0,login=false,blocked=null,timeUp=false,report=[];
  function note(s){if(report.length<500)report.push(s);}
  function progress(){ui.ilias.status='Checking ILIAS… '+pages+' pages · '+files.size+' files found so far';if(route().name==='port')render();}
  async function getPage(href){
    var r=await iliasRequest('fetch',{url:href});
    if(r&&r.login)login=true;
    if(r&&!r.ok&&r.code&&!blocked)blocked=r;
    if(!r||!r.ok||typeof r.html!=='string')return null;
    return {url:String(r.url||href),doc:new DOMParser().parseFromString(r.html,'text/html')};
  }
  function addCourse(f){
    var info=f.info;
    if(info.type==='news'){if(byKey.news)return;byKey.news=1;courses.push({key:'news',name:'ILIAS news',queue:[{url:f.href,depth:IL_LIM.depth}],taken:0,limit:3,pages:0,news:true});return;}
    if(info.type==='cat')return;
    var key=info.type+'_'+info.id,alt='ref_'+info.id;
    if(byKey[key]||byKey[alt]||courses.length>=IL_LIM.courses)return;
    byKey[key]=byKey[alt]=1;
    courses.push({key:key,name:f.name||key,queue:[{url:f.href,depth:0}],taken:0,limit:IL_LIM.perCourse,pages:0});
  }
  async function seeds(list){
    var got=await Promise.all(list.map(async function(h){var u=ilUrl(h);if(!u||visited[u.href])return null;visited[u.href]=1;var p=await getPage(u.href);return p?{h:u.href,p:p}:null;}));
    got.forEach(function(g){
      if(!g)return;pages++;var found=[],n=ilCollect(g.p.doc,g.p.url,files,found,ilTitle(g.p.doc)||'ILIAS','');
      note('SEED '+ilShort(g.h)+' -> '+ilShort(g.p.url)+' | "'+ilTitle(g.p.doc)+'" | links:'+n+' | containers: '+(found.slice(0,40).map(function(f){return f.info.type+'_'+f.info.id+' "'+f.name.slice(0,40)+'"';}).join(', ')||'none'));
      found.forEach(addCourse);
    });
    progress();
  }
  await seeds(IL_SEEDS);
  if(blocked&&!pages)return {ok:false,message:blocked.message||'Could not reach ILIAS.'};
  if(!courses.some(function(c){return !c.news;}))note('NO COURSES FOUND on the seed pages');
  var cursor=0;
  while(pages<IL_LIM.pages){
    if(Date.now()-started>IL_LIM.budget){timeUp=true;break;}
    var batch=[],idle=0;
    while(batch.length<IL_LIM.conc&&idle<courses.length&&pages+batch.length<IL_LIM.pages){
      var c=courses[cursor++%courses.length],next=c.queue.length&&c.taken<c.limit?c.queue.shift():null;
      if(!next){idle++;continue;}idle=0;
      var u=ilUrl(next.url);if(!u||visited[u.href])continue;visited[u.href]=1;c.taken++;batch.push({c:c,next:next,u:u});
    }
    if(!batch.length)break;
    var res=await Promise.all(batch.map(async function(b){b.p=await getPage(b.u.href);return b;}));
    res.forEach(function(b){
      if(!b.p)return;pages++;b.c.pages++;
      var title=ilTitle(b.p.doc);if(b.c.pages===1&&title&&!b.c.news)b.c.name=title;
      var ctx=(b.c.name+(title&&title!==b.c.name?' › '+title:'')).slice(0,160),found=[],before=files.size,n=ilCollect(b.p.doc,b.p.url,files,found,ctx,b.c.name);
      var follow=b.next.depth<IL_LIM.depth?found.filter(function(f){return f.info.type!=='news'&&!(f.info.type==='crs'&&'crs_'+f.info.id!==b.c.key&&'ref_'+f.info.id!==b.c.key);}).slice(0,20):[];
      follow.forEach(function(f){b.c.queue.push({url:f.href,depth:b.next.depth+1});});
      note('['+b.c.name.slice(0,30)+'] d'+b.next.depth+' '+ilShort(b.p.url)+' | "'+title+'" | links:'+n+' | +files:'+(files.size-before)+' | follow:'+follow.length);
    });
    progress();
  }
  if(login&&!pages)return {ok:false,code:'login',message:'Sign in to ILIAS, then scan again.'};
  var all=Array.from(files.values());
  var keep=all.filter(function(f){return f.kind!=='skip';}).slice(0,500);
  var skipped=all.filter(function(f){return f.kind==='skip';}).slice(0,300).map(function(f){return {key:f.key,name:f.name,ext:f.ext,openUrl:f.openUrl,context:f.context};});
  var summary=courses.filter(function(c){return !c.news;}).map(function(c){return {name:c.name,pages:c.pages,
    files:all.filter(function(f){return f.course===c.name&&f.kind!=='skip';}).length,skipped:all.filter(function(f){return f.course===c.name&&f.kind==='skip';}).length,more:c.queue.length>0&&c.taken>=c.limit};});
  return {ok:true,files:keep,skipped:skipped,pages:pages,courses:summary,report:report.join('\n').slice(0,40000),limited:timeUp||pages>=IL_LIM.pages||summary.some(function(c){return c.more;})};
}
async function scanIlias(){
  if(iliasBridge&&verNum(iliasVersion)<verNum(CONNECTOR_MIN_SCAN)){ui.ilias.status='Booklyn needs connector v'+CONNECTOR_MIN_SCAN+' or newer (yours is v'+(iliasVersion||'?')+'). Download it again from the Connector page, extract it over your old connector folder, then press the reload arrow on edge://extensions. After this version, scan improvements arrive with Booklyn itself, so you will rarely need to do it again.';render();return;}
  ui.ilias.busy=true;ui.ilias.status='Checking ILIAS…';render();
  var result=await iliasCrawl();
  ui.ilias.busy=false;ui.ilias.scanned=true;
  if(!result.ok){ui.ilias.status=result.message||'Could not check ILIAS.';render();return;}
  var discovered=0;
  var rawFiles=(result.files||[]).filter(function(f){return f&&f.key&&f.name;});
  ui.ilias.skipped=(result.skipped||[]).filter(function(f){return f&&f.key&&f.name;}).slice(0,200);
  rawFiles=rawFiles.filter(function(f){if(UNREADABLE_RX.test(String(f.name))&&!READABLE_RX.test(String(f.name))){ui.ilias.skipped.push({key:f.key,name:f.name,ext:'',openUrl:f.openUrl||f.url,context:f.context});return false;}return true;});
  ui.ilias.items=rawFiles.map(function(file){
    file.isNew=!state.iliasKnown[file.key];if(file.isNew)discovered++;
    state.iliasKnown[file.key]=Date.now();return file;
  });
  ui.ilias.report=String(result.report||'');
  ui.ilias.courses=(result.courses||[]).slice(0,30).map(function(x){return {name:String(x.name||'').slice(0,80),pages:+x.pages||0,files:+x.files||0,skipped:+x.skipped||0,more:!!x.more};});
  state.iliasLast=Date.now();save();
  var c=iliasCounts();
  ui.ilias.status=ui.ilias.items.length+' readable files found on ILIAS · '+c.todo+' to add · '+c.in+' already in Booklyn · '+c.dis+' dismissed'+(ui.ilias.skipped.length?' · '+ui.ilias.skipped.length+' skipped (video, audio, images, zips, old Office formats)':'')+'.';
  if(!ui.ilias.items.length)ui.ilias.status='No readable files found on the scanned ILIAS pages'+(ui.ilias.skipped.length?' ('+ui.ilias.skipped.length+' unreadable files were skipped).':'.');
  if(result.limited)ui.ilias.status+=' The scan stopped early (page or time limit), so some files may be missing.';
  ui.ilias.filter=c.todo?'todo':(c.in?'in':'all');
  render();
}
async function importIlias(key,batch){
  var file=ui.ilias.items.filter(function(item){return item.key===key;})[0];if(!file)return 'fail';
  if(!batch){ui.ilias.busy=true;ui.ilias.status='Downloading '+file.name+'…';render();}
  var result=await iliasRequest('download',{url:file.url,name:file.name}),out='fail';
  if(!result.ok){if(result.skipped){out='skip';state.iliasDismissed[key]=Date.now();save();}if(!batch)ui.ilias.status=result.message||'Could not download this file.';}
  else{
    try{
      var binary=atob(result.base64),bytes=new Uint8Array(binary.length);
      for(var i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
      var added=await addFiles([new File([bytes],result.name||file.name,{type:result.mime||'application/octet-stream'})],null,true);
      if(added&&(added.added||added.dups)){
        state.iliasImported[key]=Date.now();if(added.hashes&&added.hashes[0])state.iliasHash[key]=added.hashes[0];
        delete state.iliasDismissed[key];save();out=added.added?'added':'dup';
      }
      if(!batch)ui.ilias.status=out==='added'?'File added to the Port for review.':out==='dup'?'This content is already in Booklyn, so nothing was duplicated.':'Could not add the file.';
    }catch(error){if(!batch)ui.ilias.status='Could not read the downloaded file.';}
  }
  if(!batch){ui.ilias.busy=false;render();}
  return out;
}
async function importAllIlias(){
  var todo=ui.ilias.items.filter(function(f){return iliasCls(f)==='todo';});if(!todo.length)return;
  ui.ilias.busy=true;var n={added:0,dup:0,fail:0,skip:0};
  for(var i=0;i<todo.length;i++){
    ui.ilias.status='Adding '+(i+1)+' of '+todo.length+': '+todo[i].name;render();
    var r=await importIlias(todo[i].key,true);n[r]++;
  }
  ui.ilias.busy=false;
  ui.ilias.status=n.added+' added to the Port'+(n.dup?' · '+n.dup+' were identical to files you already have':'')+(n.skip?' · '+n.skip+' skipped because Booklyn cannot read them':'')+(n.fail?' · '+n.fail+' could not be downloaded (for example over 12 MB)':'')+'.';
  go('#/port');
}
function iliasCoursesHTML(){
  var cs=ui.ilias.courses||[],rb=ui.ilias.report?'<button class="btn ghost small" data-a="ilreport">Copy scan report</button>':'';
  if(!cs.length)return ui.ilias.scanned?'<div class="row"><span class="foot">No courses were found on your ILIAS dashboard.</span>'+rb+'</div>':'';
  return '<details class="foot"><summary>'+cs.length+' courses scanned</summary><div class="row">'+rb+'</div><ul class="list">'+cs.map(function(x){
    return '<li class="item"><div class="grow"><div class="t">'+esc(x.name||'Course')+'</div><div class="s">'+x.files+' readable file'+(x.files===1?'':'s')+(x.skipped?' · '+x.skipped+' skipped':'')+' · '+x.pages+' page'+(x.pages===1?'':'s')+' checked'+(x.more?' · more pages not checked':'')+(!x.files&&!x.skipped?' · nothing found here (the content may be in a learning module, wiki or video page)':'')+'</div></div></li>';
  }).join('')+'</ul></details>';
}
function iliasListHTML(){
  var c=iliasCounts(),f=ui.ilias.filter||'todo',LAB={todo:'To add',in:'Already in Booklyn',dis:'Dismissed',skip:'Not readable',all:'All readable'},CNT={todo:c.todo,in:c.in,dis:c.dis,skip:(ui.ilias.skipped||[]).length,all:ui.ilias.items.length};
  var h=iliasCoursesHTML()+'<div class="row tight" role="group" aria-label="Filter ILIAS files">'+['todo','in','dis','skip','all'].map(function(k){return '<button class="chip fchip" data-a="ilfilter" data-f="'+k+'" aria-pressed="'+(f===k)+'">'+LAB[k]+' · '+CNT[k]+'</button>';}).join('')+'</div>';
  if(c.todo)h+='<div class="row"><button class="btn small" data-a="iliasall" '+(ui.ilias.busy?'disabled':'')+'>Add all '+c.todo+' to the Port</button><span class="foot">Dismiss what you do not need first.</span></div>';
  if(f==='skip'){
    var sk=ui.ilias.skipped||[];
    if(!sk.length)return h+'<p class="foot">Nothing was skipped.</p>';
    return h+'<p class="foot">Booklyn cannot make questions from videos, audio, images, zips, spreadsheets or old Office files, so these are not offered for import.</p><ul class="list">'+sk.slice(0,150).map(function(file){return '<li class="item"><div class="grow"><div class="t">'+esc(file.name)+(file.ext?' <span class="chip">.'+esc(file.ext)+'</span>':'')+'</div><div class="s">'+esc(file.context||'ILIAS')+'</div></div><div class="row tight"><a class="btn ghost small" href="'+esc(safeUrl(file.openUrl||file.url))+'" target="_blank" rel="noopener noreferrer">Open ↗</a></div></li>';}).join('')+'</ul>';
  }
  var rows=ui.ilias.items.filter(function(x){return f==='all'||iliasCls(x)===f;});
  if(!rows.length)return h+'<p class="foot">Nothing in this list.</p>';
  h+='<ul class="list">'+rows.slice(0,150).map(function(file){
    var k=iliasCls(file),sg=iliasSuggest(file);
    return '<li class="item"><div class="grow"><div class="t">'+esc(file.name)+(file.isNew?' <span class="chip">New</span>':'')+(k==='in'?' <span class="chip s-lit">In Booklyn</span>':k==='dis'?' <span class="chip">Dismissed</span>':'')+'</div><div class="s">'+esc(file.context||'ILIAS')+(sg&&k!=='in'?' · looks like '+esc(sg):'')+'</div></div><div class="row tight">'
      +(k==='todo'?'<button class="btn small" data-a="iliasimport" data-key="'+esc(file.key)+'" '+(ui.ilias.busy?'disabled':'')+'>Add to Port</button><button class="btn ghost small" data-a="ildismiss" data-key="'+esc(file.key)+'">Dismiss</button>':'')
      +(k==='dis'?'<button class="btn ghost small" data-a="ilrestore" data-key="'+esc(file.key)+'">Restore</button>':'')
      +'<a class="btn ghost small" href="'+esc(safeUrl(file.openUrl||file.url))+'" target="_blank" rel="noopener noreferrer">Open ↗</a></div></li>';}).join('')+'</ul>'+(rows.length>150?'<p class="foot">Showing the first 150 of '+rows.length+'. Dismiss or add some to see the rest.</p>':'');
  return h;
}
function safeUrl(u){try{var x=new URL(String(u||''),location.href);return /^https:$/.test(x.protocol)&&/(^|\.)hslu\.ch$/.test(x.hostname)?x.href:'#';}catch(e){return '#';}}
function cur(){return memHash;}
function go(to){memHash=to;ui.cityFull=false;try{if(location.hash!==to)location.hash=to;}catch(e){}render(true);}
function route(){
  var p=cur().replace(/^#\/?/,'').split('/').filter(Boolean);
  if(!p.length) return {name:'campus'};
  if(p[0]==='port') return {name:'port'};
  if(p[0]==='deadlines') return {name:'deadlines'};
  if(p[0]==='settings') return {name:'settings'};
  if(p[0]==='shop') return {name:'shop'};
  if(p[0]==='setup') return {name:'setup'};
  if(p[0]==='m'){
    var m=M(p[1]); if(!m) return {name:'campus'};
    var u=+p[2];
    if(u>=1&&u<=m.units) return p[3]==='study'?{name:'study',m:m,u:u}:{name:'unit',m:m,u:u};
    return {name:'module',m:m};
  }
  return {name:'campus'};
}

/* ================= views ================= */
function foot(){return '<p class="disclaimer">Unofficial student project, not affiliated with HSLU. Your files stay on this device. Your progress stays here too unless you turn on sync. No ads, no tracking. <a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a> · <a href="/imprint/">Imprint</a> · <a href="/">About Booklyn</a></p>';}

function vWelcome(){
  return '<section class="hero"><p class="eyebrow">Welcome</p><h1 tabindex="-1" id="h1">Booklyn</h1><p class="motto">Keep your lights on.</p>'
   +cityBox(sampleMods(),{interactive:false,build:true,scene:'park',label:'A sample district'})+'<p class="foot">A sample district. Yours builds itself as you add your modules.</p>'
   +'<p class="lede">A study app for students that turns each week’s course material into a city you light up as you learn, so you always know what to study next.</p>'
   +'<div class="row"><button class="btn" data-a="newsem">Build my first semester</button><button class="btn ghost" data-a="demo">Try the demo</button></div></section>'
   +'<section class="card stack"><h3>How it works</h3><p class="lede">Your degree is a city. A semester is a district, a module is a building and each teaching unit is a floor. Add your files, study a unit, pass the short check, and the light goes on.</p></section>'+foot();
}

function vCampus(){
  var sem=curSem(); if(!sem) return vWelcome();
  var n=nextUp(sem),p=pending().length,t=totals(sem),pct=t.t?Math.round(t.l/t.t*100):0;
  var ups=semDeadlines(sem).filter(function(d){return !state.tasksDone[d.id]&&daysTo(d)>=0;}).sort(function(a,b){return pdate(a.date)-pdate(b.date);}).slice(0,3);
  var h=(SYNC.conflict?'<div class="notice warn stack"><p style="margin:0"><strong>Your cloud copy and this device differ.</strong> Open Settings to choose which one to keep.</p><div class="row"><button class="btn small" data-a="go" data-to="#/settings">Open Settings</button></div></div>':'')+(backupDue()?'<div class="notice stack"><p style="margin:0"><strong>Protect your work.</strong> '+(state.lastBackup?'Your last backup is more than a week old.':'You have no backup yet.')+' If you clear this browser’s data, your semesters and progress are gone.</p><div class="row"><button class="btn small" data-a="dlbackup">Download backup</button><button class="btn small ghost" data-a="snoozebk">Remind me in 3 days</button></div></div>':'')+'<header class="stack"><div class="sem"><p class="eyebrow">Week '+weekNo(sem)+' · '+fmt(new Date())+'</p></div>'
   +'<div class="sem"><label class="sr" for="semsel">Semester</label><select id="semsel" data-c="sem">'+state.sems.map(function(s){return '<option value="'+s.id+'"'+(s.id===sem.id?' selected':'')+'>'+esc(s.name)+(s.finished?' (finished)':'')+'</option>';}).join('')+'<option value="__new">＋ New semester…</option></select></div>'
   +'<h1 tabindex="-1" id="h1">'+(state.name?'Hello, '+esc(state.name):'Keep your lights on')+'</h1>'
   +'<p class="lede">Tap a building to open its weeks, or pick a module below.</p></header>';
  var bld=ui.cityBuild;if(bld)setTimeout(function(){ui.cityBuild=false;},4500);
  h+=cityBox(cityMods(sem),{interactive:true,build:bld,full:ui.cityFull,title:sem.name,coins:state.coins,rent:rentPerDay()});
  if(n) h+='<section class="card accent stack"><p class="eyebrow">Next up</p><h2>'+esc(n.m.code)+' · '+esc(n.m.titles[n.u-1])+'</h2><p class="lede">'+esc(n.why)+'</p><div class="row"><button class="btn light" data-a="go" data-to="#/m/'+n.m.id+'/'+n.u+'/study">Start block</button><button class="btn ghost" data-a="go" data-to="#/m/'+n.m.id+'/'+n.u+'">Open unit</button></div></section>';
  else if(!pending().length&&!FILES.some(function(f){return f.sem===sem.id;})&&!sem.demo) h+='<section class="card stack"><h3>Add your first files</h3><p class="lede">Drop your slides and scripts into the Port. Booklyn suggests where each one belongs.</p><div class="row"><button class="btn" data-a="go" data-to="#/port">Open the Port</button></div></section>';
  if(p) h+='<section class="card row between"><div><h3>'+p+' file'+(p>1?'s':'')+' waiting in the Port</h3><p class="lede">Review where they belong, then import.</p></div><button class="btn" data-a="go" data-to="#/port">Review</button></section>';
  if(ups.length) h+='<section class="stack"><div class="row between"><h2>Coming up</h2><button class="link" data-a="go" data-to="#/deadlines">All deadlines</button></div><ul class="list">'
   +ups.map(function(d){var m=d.mod?M(d.mod):null;return '<li><div class="item"><span class="floor" style="--h:'+(m?m.h:0)+'">'+(m?esc(m.code.slice(0,2)):'•')+'</span><div class="grow"><div class="t">'+esc(d.title)+'</div><div class="s">'+(m?esc(m.code)+' · ':'')+fmt(d.date)+'</div></div><span class="chip">'+rel(d)+'</span></div></li>';}).join('')+'</ul></section>';
  h+='<section class="stack"><h2>Modules</h2><div class="grid2">'
   +sem.modules.map(function(m){var c=litCount(m);return '<button class="item modcard" data-a="go" data-to="#/m/'+m.id+'"><div class="mini" style="width:100%"><span class="floor" style="--h:'+m.h+'">'+c+'</span><div class="grow"><div class="t">'+esc(m.name)+'</div><div class="s">'+esc(m.code)+' · '+c+' of '+m.units+' lights on</div></div></div><div class="bar" style="width:100%"><i style="width:'+Math.round(c/m.units*100)+'%"></i></div></button>';}).join('')+'</div></section>'+foot();
  return h;
}

function pendingRow(f){
  var sem=curSem(),m=f.mod?M(f.mod):null,N=m?m.units:14,held=f.flag&&!f.confirmed;
  return '<li><div class="pfile'+(held?' flag':'')+(f.include?'':' off')+'" data-f="'+f.id+'"><div class="top"><input type="checkbox" data-c="inc" '+(f.include?'checked':'')+' aria-label="Include '+esc(f.name)+'"><div class="grow" style="min-width:0"><div class="t" style="font-weight:600;overflow-wrap:anywhere">'+esc(f.path||f.name)+'</div><div class="s" style="font-size:.85rem;color:var(--muted)">'+size(f.size)+' · '+esc(f.why||'')+'</div></div>'
   +(f.dup?'<span class="chip warn">Duplicate</span>':(held?'<span class="chip warn">Check this</span>':''))+'</div>'
   +'<div class="sel"><label class="sr" for="m-'+f.id+'">Module for '+esc(f.name)+'</label><select id="m-'+f.id+'" data-c="mod"><option value="">Choose a module…</option>'
   +sem.modules.map(function(x){return '<option value="'+x.id+'"'+(x.id===f.mod?' selected':'')+'>'+esc(x.code)+' · '+esc(x.name)+'</option>';}).join('')+'</select>'
   +'<label class="sr" for="u-'+f.id+'">Unit for '+esc(f.name)+'</label><select id="u-'+f.id+'" data-c="unit">'
   +Array.apply(null,{length:N}).map(function(_,i){return '<option value="'+(i+1)+'"'+(i+1===f.unit?' selected':'')+'>Week '+(i+1)+'</option>';}).join('')+'</select></div>'
   +(held&&!f.dup&&f.mod?'<div><button class="btn small ghost" data-a="confirm" data-id="'+f.id+'">Looks right</button></div>':'')
   +(held&&!f.dup&&!f.mod?'<p class="foot">Choose a module to continue.</p>':'')+'</div></li>';
}
function eligible(f){return f.include&&f.mod&&f.unit&&(!f.flag||f.confirmed);}
function isDupRow(f){return !!f.dup&&f.status==='pending'&&FILES.some(function(x){return x.id===f.dup;});}
function vPort(){
  var sem=curSem(); if(!sem) return vWelcome();
  var list=pending();
  var h='<header class="stack"><p class="eyebrow">Learning Port</p><h1 tabindex="-1" id="h1">Add and sort files</h1><p class="lede">Any file type and any size. Booklyn suggests a module and week from the file name. You decide. Files marked “Check this” stay here until you confirm them.</p></header>';
  h+='<section class="drop" data-drop><h2>Drop files here</h2><p class="lede">or choose them from your computer or phone</p><div class="row" style="justify-content:center"><button class="btn" data-a="pickfiles">Choose files</button><button class="btn ghost" data-a="pickfolder">Choose a folder</button></div></section>';
  var lastChk=state.iliasLast?new Date(state.iliasLast).toLocaleString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'';
  if(!isMobileDevice()||iliasBridge)h+='<section class="card stack"><div class="row" style="justify-content:space-between"><div><p class="eyebrow">HSLU ILIAS</p><h2>Find new files</h2></div><a class="btn ghost small" href="https://elearning.hslu.ch/ilias/ilias.php?baseClass=ildashboardgui&amp;cmd=show" target="_blank" rel="noopener noreferrer">Open ILIAS ↗</a></div>'
    +'<p class="lede">Booklyn looks for file links on your ILIAS dashboard and linked courses and lists the ones it can read: PDF, Word (.docx), PowerPoint (.pptx) and text files. Videos, audio, images and zips are skipped. Files you already have are recognised by their content, so nothing is added twice. Nothing is downloaded until you press “Add to Port”. Sign in to ILIAS in this browser first.</p>'
    +'<div class="row"><button class="btn small" data-a="scanilias" '+(ui.ilias.busy?'disabled':'')+'>Check ILIAS again</button><span class="foot">'+(iliasBridge?'Connector ready'+(iliasVersion?' (v'+esc(iliasVersion)+')':'')+(verNum(iliasVersion)<verNum(CONNECTOR_LATEST)?' · <a href="/connector/#changelog" target="_blank" rel="noopener">Update available (v'+CONNECTOR_LATEST+')</a>':''):'Needs the Booklyn ILIAS Connector browser extension')+'</span></div>'
    +'<p class="foot">'+(lastChk?'Last checked: '+lastChk+'.':'Not checked yet.')+'</p>'
    +(!iliasBridge?'<p class="foot">Install the connector once on a computer with Edge or Chrome: <a href="/connector/" target="_blank" rel="noopener">download and install steps</a>. Then reload Booklyn. It does not work on phones; add files by hand there.</p>':'')
    +(ui.ilias.status?'<p class="foot" role="status">'+esc(ui.ilias.status)+'</p>':'')
    +(ui.ilias.items.length?iliasListHTML():iliasCoursesHTML())+'</section>';
  if(state.lastImport.length&&!list.length){
    var by={};state.lastImport.forEach(function(id){var f=FILES.filter(function(x){return x.id===id;})[0];if(f&&f.status==='imported'){by[f.mod]=(by[f.mod]||0)+1;}});
    h+='<section class="card stack"><h3>Imported</h3><div class="row tight">'+Object.keys(by).map(function(k){var m=M(k);return m?'<button class="chip" data-a="go" data-to="#/m/'+m.id+'" style="border:0;cursor:pointer">'+esc(m.code)+' · '+by[k]+'</button>':'';}).join('')+'</div><div class="row"><button class="btn ghost small" data-a="undo">Undo this import</button></div></section>';
  }
  if(!list.length){
    h+='<section class="card stack"><h3>Nothing waiting</h3><p class="lede">Add files above. Want to try it first?</p><div class="row"><button class="btn ghost small" data-a="samples">Add 6 sample files</button></div></section>';
    return h;
  }
  var dupN=list.filter(isDupRow).length;
  if(dupN)h+='<section class="card stack"><h3>'+dupN+' duplicate'+(dupN===1?'':'s')+' waiting</h3><p class="lede">These files have exactly the same content as a file Booklyn already has. Removing them here only clears the extra copy from the Port.</p><div class="row"><button class="btn small" data-a="rmdups">Remove '+dupN+' duplicate'+(dupN===1?'':'s')+'</button></div></section>';
  var ok=list.filter(eligible).length, held=list.filter(function(f){return f.include&&!eligible(f);}).length;
  h+='<ul class="list">'+list.map(pendingRow).join('')+'</ul>';
  h+='<div class="actionbar"><div><strong>'+ok+' ready to import</strong><div class="foot">'+(held?held+' need a check first.':'Nothing is held back.')+'</div></div><button class="btn" data-a="import" '+(ok?'':'disabled')+'>Import '+ok+' file'+(ok===1?'':'s')+'</button></div>';
  return h;
}

function vModule(r){
  var m=r.m,c=litCount(m);
  var h='<button class="back" data-a="go" data-to="#/">← Campus</button><header class="row" style="gap:18px;align-items:flex-end"><div style="width:72px;flex:none">'+building(m)+'</div><div class="stack" style="gap:6px"><p class="eyebrow">'+esc(m.code)+'</p><h1 tabindex="-1" id="h1">'+esc(m.name)+'</h1><p class="lede">'+c+' of '+m.units+' lights on</p></div></header>'
   +'<div class="tabs" role="tablist"><button role="tab" aria-selected="'+(ui.tab==='units')+'" data-a="tab" data-v="units">Units</button><button role="tab" aria-selected="'+(ui.tab==='files')+'" data-a="tab" data-v="files">All files</button></div>';
  if(ui.tab==='units'){
    h+='<ul class="list">';
    for(var u=1;u<=m.units;u++){
      var st=uStatus(m,u),n=mats(m,u).length;
      h+='<li><button class="item '+st+'" data-a="go" data-to="#/m/'+m.id+'/'+u+'"><span class="floor" style="--h:'+m.h+'">'+u+'</span><div class="grow"><div class="t">'+esc(m.titles[u-1])+'</div><div class="s">'+(n?n+' file'+(n>1?'s':''):'No files yet')+(st==='lit'||st==='fading'?' · '+esc(guestName(m.id,u))+(st==='fading'?' is packing':' lives here'):'')+(function(){var q=litInfo(m.id+':'+u);return q&&q.pinned?' · pinned':q&&q.until?' · '+cdSpan(q.until,true)+' left':'';})()+'</div></div>'+chip(st)+'</button></li>';
    }
    h+='</ul><div class="row" style="margin-top:12px"><button class="btn ghost small" data-a="addfloor" data-m="'+m.id+'">＋ Add a floor</button>'+(m.units>1&&!mats(m,m.units).length&&!state.lit[m.id+':'+m.units]?'<button class="btn ghost small" data-a="rmfloor" data-m="'+m.id+'">Remove last floor (Week '+m.units+')</button>':'')+'</div>';
  } else {
    h+='<label class="f">Search files<input type="search" id="q" value="'+esc(ui.q)+'" placeholder="Name or type"></label><div id="matlist">'+fileList(m)+'</div>';
  }
  return h;
}
function fileList(m){
  var q=ui.q.trim().toLowerCase(),out='';
  for(var u=1;u<=m.units;u++){
    var ms=mats(m,u).filter(function(x){return !q||(x.name+' '+x.type).toLowerCase().indexOf(q)>-1;});
    if(!ms.length) continue;
    out+='<h3 style="margin:14px 0 8px">Week '+u+' · '+esc(m.titles[u-1])+'</h3><div class="stack">'+ms.map(function(x){return matRow(m,u,x);}).join('')+'</div>';
  }
  return out||'<p class="lede" style="margin-top:12px">No files yet.</p>';
}
function matRow(m,u,x){
  var acts='';
  if(x.blob){
    acts='<div class="acts"><button class="btn small ghost" data-a="open" data-id="'+x.id+'">Open</button>'
     +(ui.confirm===x.id?'<button class="btn small danger" data-a="del2" data-id="'+x.id+'">Remove for good</button><button class="btn small ghost" data-a="del0">Cancel</button>':'<button class="btn small ghost" data-a="del1" data-id="'+x.id+'">Remove</button>')+'</div>';
  }
  return '<div class="matrow"><input type="checkbox" data-c="seen" data-id="'+x.id+'" data-mod="'+m.id+'" data-u="'+u+'" '+(isSeen(x,m,u)?'checked':'')+' aria-label="Reviewed: '+esc(x.name)+'"><div class="grow"><div class="t">'+esc(x.name)+'</div><div class="s">'+x.type+(x.size?' · '+size(x.size):'')+' · tick when reviewed</div>'+acts+'</div></div>';
}

function vUnit(r){
  var m=r.m,u=r.u,st=uStatus(m,u),ms=mats(m,u),k=m.id+':'+u;
  var h='<button class="back" data-a="go" data-to="#/m/'+m.id+'">← '+esc(m.code)+'</button><header class="stack"><p class="eyebrow">'+esc(m.code)+' · Floor '+u+'</p><h1 tabindex="-1" id="h1">'+esc(m.titles[u-1])+'</h1><div class="row">'+chip(st)+((st==='lit'||st==='fading')?'<span class="chip">Guest: '+esc(guestName(m.id,u))+'</span>':'')+'</div></header>';
  h+=unitGuest(m,u,k,st);
  if(!ms.length) h+='<section class="card stack"><h3>This floor is waiting for files</h3><p class="lede">Add the material for this unit and the floor is ready for a study block.</p><div class="row"><button class="btn" data-a="pickhere" data-mod="'+m.id+'" data-unit="'+u+'">Add files here</button><button class="btn ghost" data-a="go" data-to="#/port">Open the Port</button></div></section>';
  else h+='<section class="card stack"><h2>Study block</h2><p class="lede">Focus for 25 minutes, then do a short check. Pass it and the light goes on.</p><div class="row"><button class="btn" data-a="go" data-to="#/m/'+m.id+'/'+u+'/study">Start block</button></div></section>'
   +'<section class="stack"><div class="row between"><h2>Material</h2><button class="btn small ghost" data-a="pickhere" data-mod="'+m.id+'" data-unit="'+u+'">Add files here</button></div><div class="stack">'+ms.map(function(x){return matRow(m,u,x);}).join('')+'</div></section>';
  h+='<section class="stack"><label class="f" for="utitle">Unit name<input type="text" id="utitle" data-k="'+k+'" value="'+esc(m.titles[u-1])+'" maxlength="80"></label>'
   +'<label class="f" for="note">Notes<textarea id="note" data-k="'+k+'" placeholder="Terms you could not explain, questions for the lecturer…">'+esc(state.notes[k]||'')+'</textarea></label><p class="foot">Saved on this device while you type.</p></section>';
  h+='<div class="row between">'+(u>1?'<button class="btn ghost small" data-a="go" data-to="#/m/'+m.id+'/'+(u-1)+'">← Week '+(u-1)+'</button>':'<span></span>')+(u<m.units?'<button class="btn ghost small" data-a="go" data-to="#/m/'+m.id+'/'+(u+1)+'">Week '+(u+1)+' →</button>':'')+'</div>';
  return h;
}

function unitGuest(m,u,k,st){
  var li=litInfo(k),g=guestName(m.id,u),pin=!!(state.pin&&state.pin[k]),t='';
  if(li&&li.pinned) t=g+' lives here rent-free. This light stays on.';
  else if(st==='lit') t=g+' lives here and pays rent. The light stays on for \u0001.';
  else if(st==='fading') t='The light is fading and '+g+' is packing. Pass the check within \u0001 to keep your guest and earn 5 coins.';
  else if(state.lvl[k]!==undefined) t=g+' is away. Pass the check to bring them back and earn 5 coins.';
  var h='';
  if(t) h+='<div class="notice guestnote"><strong>Guest</strong> · '+esc(t).replace('\u0001',li&&li.until?cdSpan(li.until):'')+(st==='fading'&&state.shields>0?' <button class="btn small" data-a="shield" data-k="'+k+'">Use a shield ('+state.shields+' left)</button>':'')+'</div>';
  h+='<label class="check"><input type="checkbox" data-c="pin" data-k="'+k+'" '+(pin?'checked':'')+'><div class="t">Keep this light on for good<div class="s">Use it when the unit is easy or will not be in the exam. The light never fades, but it pays no rent. Unpinning later gives no free days: the light follows your real studying.</div></div></label>';
  return h;
}
function mmss(s){return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}
function quizFor(m,u){var s=semOf(m.id);return s&&s.demo?QUIZ[m.code.toLowerCase()+':'+u]:null;}

/* ================= questions from your own files ================= */
var STOPW={};('the and for are but not you all can had her was one our out has have this that with from they been were will would there their what about which when your said each she how its who did get may him his than then them these some into only other over such more most very just also like make time even back after use two way could first where those being both under while should because between through during before another does doing against without within along might must much many any own same too off here again once further few nor per via etc eg ie '+
 'der die das und ist ein eine einer eines einem einen nicht mit von zu den dem des sich auf für als auch sie sind wird werden wurde wurden kann können oder aber wenn dass dies diese dieser dieses diesem diesen bei nach aus über unter noch nur wie was wer wo hat haben sein seine ihre ihr zum zur vom im am um bis durch gegen ohne dann denn doch schon sehr mehr alle alles andere anderen einen jede jeder jedes man wir ihr ich du er es '+
 'el la los las un una unos unas de del al y en que es por con para como más pero sus este esta estos estas ese esa son fue ser está están hay muy también todo todos cada otro otra entre sobre sin desde hasta cuando donde porque').split(' ').forEach(function(w){if(w)STOPW[w]=1;});
function loadScript(src){return new Promise(function(res,rej){var el=document.createElement('script');el.src=src;el.onload=res;el.onerror=function(){rej(new Error('script'));};document.head.appendChild(el);});}
async function pdfText(blob){
  if(!window.pdfjsLib){await loadScript('vendor/pdf.min.js');}
  window.pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdf.worker.min.js';
  var doc=await window.pdfjsLib.getDocument({data:await blob.arrayBuffer(),isEvalSupported:false,enableXfa:false}).promise,out=[],n=Math.min(doc.numPages,80);
  for(var p=1;p<=n;p++){
    var pg=await doc.getPage(p),tc=await pg.getTextContent(),line='',last=null;
    tc.items.forEach(function(it){if(last!==null&&Math.abs(it.transform[5]-last)>3)line+='\n';line+=it.str+' ';last=it.transform[5];});
    out.push(line);if(out.join('\n').length>70000)break;
  }
  return out.join('\n\n');
}
async function inflateRaw(d){var ds=new DecompressionStream('deflate-raw'),w=ds.writable.getWriter();w.write(d);w.close();return new Uint8Array(await new Response(ds.readable).arrayBuffer());}
async function unzipSome(buf,want){
  var dv=new DataView(buf),u8=new Uint8Array(buf),n=u8.length,e=-1,i;
  for(i=n-22;i>=Math.max(0,n-65557);i--){if(dv.getUint32(i,true)===0x06054b50){e=i;break;}}
  if(e<0)return {};
  var cnt=dv.getUint16(e+10,true),off=dv.getUint32(e+16,true),out={};
  for(var c=0;c<cnt;c++){
    if(dv.getUint32(off,true)!==0x02014b50)break;
    var meth=dv.getUint16(off+10,true),csz=dv.getUint32(off+20,true),nl=dv.getUint16(off+28,true),el=dv.getUint16(off+30,true),cl=dv.getUint16(off+32,true),lho=dv.getUint32(off+42,true),name=new TextDecoder().decode(u8.subarray(off+46,off+46+nl));
    if(want(name)){var ds=lho+30+dv.getUint16(lho+26,true)+dv.getUint16(lho+28,true),data=u8.subarray(ds,ds+csz);out[name]=meth===0?data:await inflateRaw(data);}
    off+=46+nl+el+cl;
  }
  return out;
}
function xmlText(xml,tag){
  var o=xml.replace(new RegExp('</'+tag+':p>','g'),'\n').replace(new RegExp('<'+tag+':t[^>]*>([^<]*)</'+tag+':t>','g'),function(_,t){return t+' ';});
  return o.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'");
}
async function officeText(blob,name){
  var pptx=/\.pptx$/.test(name),files=await unzipSome(await blob.arrayBuffer(),function(n){return pptx?/^ppt\/slides\/slide\d+\.xml$/.test(n):n==='word/document.xml';});
  var keys=Object.keys(files).sort(function(a,b){return (parseInt(a.replace(/\D/g,''),10)||0)-(parseInt(b.replace(/\D/g,''),10)||0);});
  return keys.map(function(k){return xmlText(new TextDecoder().decode(files[k]),pptx?'a':'w');}).join('\n\n');
}
async function fileText(rec){
  if(rec.text!==undefined)return rec.text;
  var blob=await dbBlob(rec.id),name=String(rec.name||'').toLowerCase(),t='';
  if(!blob)return '';
  try{
    if(/\.(txt|md|csv|tex|html?|py|java|js|json|sql)$/.test(name))t=await blob.text();
    else if(/\.pdf$/.test(name))t=await pdfText(blob);
    else if(/\.(docx|pptx)$/.test(name))t=await officeText(blob,name);
  }catch(e){t='';}
  t=t.replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim().slice(0,70000);
  rec.text=t;try{await dbPut(rec);}catch(e){}
  return t;
}
function bankKey(k){return 'booklyn:bank:'+k;}
function bankGet(k){try{var b=JSON.parse(localStorage.getItem(bankKey(k))||'null');if(b&&b.q)return b;}catch(e){}return {q:[],used:[]};}
function bankPut(k,b){try{localStorage.setItem(bankKey(k),JSON.stringify(b));}catch(e){}}
function shuffled(arr,seed){var a=arr.slice(),h=seed>>>0||1;for(var i=a.length-1;i>0;i--){h=(h*1103515245+12345)>>>0;var j=h%(i+1),t=a[i];a[i]=a[j];a[j]=t;}return a;}
function localQuestions(text,max){
  var clean=text.replace(/\s+/g,' '),words=clean.match(/[A-Za-zÄÖÜäöüßÁÉÍÓÚÑáéíóúñ][A-Za-zÄÖÜäöüßÁÉÍÓÚÑáéíóúñ\-]{4,}/g)||[],freq={};
  words.forEach(function(w){var l=w.toLowerCase();if(STOPW[l]||l.length>22)return;freq[l]=(freq[l]||0)+1;});
  var terms=Object.keys(freq).filter(function(w){return freq[w]>=2;}).sort(function(a,b){return freq[b]-freq[a]||(a<b?-1:1);}).slice(0,80);
  if(terms.length<6)return [];
  var tset={};terms.forEach(function(t,i){tset[t]=i;});
  var sents=(clean.match(/[^.!?]{50,230}[.!?]/g)||[]).map(function(x){return x.trim();}).filter(function(x){
    var w=x.split(' ').length,letters=(x.match(/[A-Za-zÄÖÜäöüßÁÉÍÓÚÑáéíóúñ]/g)||[]).length;
    return w>=8&&w<=34&&letters/x.length>.72&&!/https?:|www\.|@|©/.test(x)&&/^[A-ZÄÖÜÁÉÍÓÚÑ]/.test(x);
  });
  var out=[],usedT={};
  shuffled(sents,hashStr(clean.slice(0,200))).forEach(function(sent){
    if(out.length>=max)return;
    var toks=sent.match(/[A-Za-zÄÖÜäöüßÁÉÍÓÚÑáéíóúñ][A-Za-zÄÖÜäöüßÁÉÍÓÚÑáéíóúñ\-]{4,}/g)||[],cand=toks.filter(function(t,i){var l=t.toLowerCase();return tset[l]!==undefined&&sent.indexOf(t)>3&&!usedT[l];});
    if(!cand.length)return;
    cand.sort(function(a,b){return tset[b.toLowerCase()]-tset[a.toLowerCase()];});
    var ans=cand[Math.min(cand.length-1,1)],al=ans.toLowerCase();
    var re=new RegExp('\\b'+ans.replace(/[-\/\\^$*+?.()|[\]{}]/g,'\\$&')+'\\b','g');
    if((sent.match(re)||[]).length!==1)return;
    var dist=terms.filter(function(t){return t!==al&&sent.toLowerCase().indexOf(t)<0&&Math.abs(t.length-al.length)<=4;});
    function sfx(w){return /ing$/.test(w)?'g':/ed$/.test(w)?'d':/ly$/.test(w)?'y':/s$/.test(w)?'s':'o';}
    var same=dist.filter(function(t){return sfx(t)===sfx(al);});
    if(same.length>=3)dist=same;
    dist=shuffled(dist,hashStr(sent)).slice(0,3);
    if(dist.length<3)return;
    var cap=/^[A-ZÄÖÜÁÉÍÓÚÑ]/.test(ans);
    var opts=dist.map(function(d){return cap?d.charAt(0).toUpperCase()+d.slice(1):d;});opts.push(ans);
    var order=shuffled([0,1,2,3],hashStr(sent+'o')),o2=order.map(function(i){return opts[i];});
    usedT[al]=1;
    out.push({id:'l'+hashStr(sent),q:'Fill in the blank: “'+sent.replace(re,'_____')+'”',o:o2,a:o2.indexOf(ans),e:'From your file: “'+sent+'”',src:'local',asked:0});
  });
  return out;
}
function chunksOf(text,size){var parts=text.split(/\n\n+/),chunks=[],cur='';parts.forEach(function(p){if((cur+p).length>size&&cur.length>600){chunks.push(cur);cur='';}cur+=(cur?'\n\n':'')+p;});if(cur.length>300)chunks.push(cur);return chunks.map(function(c){return c.slice(0,size);});}
async function aiMore(text,bank){
  var chunks=chunksOf(text,3500);if(!chunks.length)return 0;
  var free=chunks.map(function(c,i){return i;}).filter(function(i){return bank.used.indexOf(hashStr(chunks[i]))<0;});
  var pick=free.length?free[Math.floor(Math.random()*free.length)]:Math.floor(Math.random()*chunks.length);
  var r=await api('POST','/api/quiz',{text:chunks[pick],n:4});
  if(!r.ok||!r.questions){
    if(r.status===429)SYNC.aiMsg='The daily AI limit is used up. Booklyn used questions made on your device instead.';
    else if(r.status===503)SYNC.aiMsg='The AI service is not set up yet. Booklyn used questions made on your device instead.';
    else if(r.status===401)SYNC.aiMsg='Sign in to use AI questions.';
    return 0;
  }
  bank.used.push(hashStr(chunks[pick]));
  var have={};bank.q.forEach(function(q){have[q.q]=1;});var n=0;
  r.questions.forEach(function(q){if(have[q.q])return;bank.q.push({id:'a'+hashStr(q.q),q:q.q,o:q.o,a:q.a,e:q.e,src:'ai',asked:0});n++;});
  return n;
}
async function prepareQuiz(m,u){
  var k=m.id+':'+u,recs=FILES.filter(function(f){return f.status==='imported'&&f.mod===m.id&&f.unit===u;});
  if(!recs.length)return null;
  var texts=await Promise.race([Promise.all(recs.map(fileText)),new Promise(function(res){setTimeout(function(){res([]);},25000);})]);
  var text=texts.filter(Boolean).join('\n\n');
  if(text.length<400)return null;
  var bank=bankGet(k);
  bank.q=bank.q.filter(function(q){return !q.bad;});
  var hasLocal=bank.q.some(function(q){return q.src==='local';});
  if(!hasLocal)localQuestions(text,14).forEach(function(q){if(!bank.q.some(function(x){return x.id===q.id;}))bank.q.push(q);});
  SYNC.aiMsg='';
  var freshAi=bank.q.filter(function(q){return q.src==='ai'&&!q.asked;}).length;
  if(state.aiOpt&&SYNC.me&&navigator.onLine!==false&&freshAi<3){try{await aiMore(text,bank);}catch(e){}}
  var seed=Date.now()&0xffff;
  function low(arr){return shuffled(arr,seed).sort(function(x,y){return (x.asked||0)-(y.asked||0);});}
  var ais=low(bank.q.filter(function(q){return q.src==='ai';})),locs=low(bank.q.filter(function(q){return q.src==='local';}));
  var pick=ais.filter(function(q){return !q.asked;}).slice(0,3);
  locs.forEach(function(q){if(pick.length<3&&pick.indexOf(q)<0)pick.push(q);});
  ais.forEach(function(q){if(pick.length<3&&pick.indexOf(q)<0)pick.push(q);});
  if(pick.length<3){bankPut(k,bank);return null;}
  pick.forEach(function(q){q.asked=(q.asked||0)+1;});
  bankPut(k,bank);
  return pick.map(function(q){return {id:q.id,q:q.q,o:q.o,a:q.a,e:q.e,src:q.src,k:k};});
}
function goCheck(){
  var mm=M(study.k.split(':')[0]),uu=+study.k.split(':')[1];
  if(quizFor(mm,uu)){study.step='check';render(true);return;}
  var key=study.k;study.step='prep';render(true);
  prepareQuiz(mm,uu).catch(function(){return null;}).then(function(qs){
    if(!study||study.k!==key)return;
    study.quiz=qs;study.q=0;study.score=0;study.picked=null;study.step='check';render(true);
  });
}
function reportBad(){
  var q=study&&study.quiz&&study.quiz[study.q];if(!q)return;
  var b=bankGet(q.k);b.q.forEach(function(x){if(x.id===q.id)x.bad=true;});bankPut(q.k,b);
  study.picked=study.picked===null?-1:study.picked;toast('Thanks. That question will not come back.');
}

function vStudy(r){
  var m=r.m,u=r.u,k=m.id+':'+u;
  if(!study||study.k!==k) study={k:k,step:'focus',remaining:1500,end:null,running:false,q:0,score:0,picked:null,checks:[false,false,false],passed:false};
  var quiz=study.quiz||quizFor(m,u);
  var steps='<div class="steps" aria-hidden="true"><i class="on"></i><i class="'+(study.step!=='focus'?'on':'')+'"></i><i class="'+(study.step==='result'?'on':'')+'"></i></div>';
  var h='<button class="back" data-a="leave" data-to="#/m/'+m.id+'/'+u+'">← Leave block</button><header class="stack"><p class="eyebrow">'+esc(m.code)+' · Floor '+u+'</p><h1 tabindex="-1" id="h1">'+esc(m.titles[u-1])+'</h1>'+steps+'</header>';
  if(study.step==='focus'){
    h+='<section class="card stack"><p class="eyebrow">1 · Focus</p><div class="timer" id="tm">'+mmss(study.remaining)+'</div><div class="bar"><i id="tb" style="width:'+Math.round((1500-study.remaining)/15)+'%"></i></div>'
     +'<div class="row" style="justify-content:center"><button class="btn" data-a="timer" id="tbtn">'+(study.running?'Pause':(study.remaining<1500?'Resume':'Start 25 minutes'))+'</button><button class="btn ghost" data-a="treset">Reset</button></div>'
     +'<p class="foot" style="text-align:center">'+mats(m,u).map(function(x){return esc(x.name);}).join(' · ')+'</p></section>'
     +'<div class="row between"><span class="foot">Already studied this unit?</span><button class="btn ghost" data-a="tocheck">Skip to the check</button></div>';
  } else if(study.step==='prep'){
    h+='<section class="card stack" style="text-align:center"><p class="eyebrow">2 · Check</p><h2>Preparing your questions…</h2><p class="lede">Booklyn is reading your files for this unit. This can take a few seconds the first time.</p></section>';
  } else if(study.step==='check'&&quiz){
    var q=quiz[study.q],L=['A','B','C','D'];
    h+='<section class="card stack"><p class="eyebrow">2 · Check · Question '+(study.q+1)+' of 3</p><h2>'+esc(q.q)+'</h2><div class="stack">'
     +q.o.map(function(o,i){var cls=study.picked===null?'':(i===q.a?' right':(i===study.picked?' wrong':''));return '<button class="opt'+cls+'" data-a="pick" data-i="'+i+'" '+(study.picked!==null?'disabled':'')+'><span class="k">'+L[i]+'</span><span>'+esc(o)+'</span></button>';}).join('')+'</div>'
     +(study.picked!==null?'<div class="notice" role="status"><strong>'+(study.picked===q.a?'Correct. ':'Not quite. ')+'</strong>'+esc(q.e)+'</div><div class="row"><button class="btn" data-a="nextq">'+(study.q<2?'Next question':'See result')+'</button>'+(q.k?'<button class="btn ghost small" data-a="badq">Report a bad question</button>':'')+'</div>':'')+(q.k?'<p class="foot">'+(q.src==='ai'?'Written by an AI from your files. It can be wrong: check it against the material.':'Made on your device from your files.')+'</p>':'')+(SYNC.aiMsg&&study.q===0?'<p class="foot">'+esc(SYNC.aiMsg)+'</p>':'')+'</section>';
  } else if(study.step==='check'){
    var ps=['Explain “'+m.titles[u-1]+'” in one sentence without looking.','Name two terms from this unit that you could define to a friend.','Solve or sketch one exercise from the material.'];
    h+='<section class="card stack"><p class="eyebrow">2 · Self-check</p><h2>Tick what you can do without notes</h2><div class="stack">'
     +ps.map(function(p,i){return '<label class="check"><input type="checkbox" data-c="self" data-i="'+i+'" '+(study.checks[i]?'checked':'')+'><div class="t">'+esc(p)+'</div></label>';}).join('')+'</div>'
     +'<p class="foot">Pass with at least 2 of 3. Be honest. This is only for you.</p><div class="row"><button class="btn" data-a="finishself" '+(study.checks.filter(Boolean).length>=2?'':'disabled')+'>Finish</button></div></section>';
  } else {
    h+=study.passed
     ?'<section class="card stack" style="text-align:center"><div class="big">'+building(m,u)+'</div><h2>The light is on</h2><p class="lede" style="margin:0 auto">'+(quiz?study.score+' of 3 correct. ':'')+litCount(m)+' of '+m.units+' floors in '+esc(m.code)+' have their lights on.</p>'+rewardHTML()+'<div class="row" style="justify-content:center"><button class="btn" data-a="go" data-to="#/m/'+m.id+'">Back to '+esc(m.code)+'</button><button class="btn ghost" data-a="go" data-to="#/">Campus</button></div></section>'
     :'<section class="card stack"><h2>'+study.score+' of 3. One more pass.</h2><p class="lede">You need 2 correct to turn the light on. Re-read the material, then try again.</p><div class="row"><button class="btn" data-a="retry">Try again</button><button class="btn ghost" data-a="go" data-to="#/m/'+m.id+'/'+u+'">Back to material</button></div></section>';
  }
  return h;
}

function shopItem(name,desc,price,control){return '<div class="shopitem"><div class="grow"><div class="t">'+name+'</div><div class="s">'+desc+'</div></div><div class="shopbuy">'+(price?'<span class="price"><i class="cdot"></i>'+price+'</span>':'')+control+'</div></div>';}
function vShop(){
  var sem=curSem();if(!sem)return vWelcome();
  var mods=sem.modules;if(!ui.shopMod||!mods.some(function(x){return x.id===ui.shopMod;}))ui.shopMod=mods[0].id;
  var sm=M(ui.shopMod),d=state.deco[sm.id]||{},co=state.coins;
  function bb(item,label,off,extra){return '<button class="btn small" data-a="buy" data-item="'+item+'" '+(extra||'')+(off?' disabled':'')+'>'+label+'</button>';}
  var h='<header class="stack"><p class="eyebrow">Shop</p><h1 tabindex="-1" id="h1">Decorate your city</h1><p class="lede">Earn coins by lighting floors, and from the rent your guests pay each day. Everything here is for looks, except the shield.</p><div class="coinline"><i class="cdot"></i><b>'+co+' coins</b><span>Rent right now: +'+rentPerDay()+' a day</span></div></header>';
  h+='<label class="f">Place items at<select data-c="shopmod">'+mods.map(function(x){return '<option value="'+x.id+'"'+(x.id===sm.id?' selected':'')+'>'+esc(x.code+' · '+x.name)+'</option>';}).join('')+'</select></label>';
  h+='<div id="shopcity">'+cityBox(cityMods(sem).filter(function(x){return x.id===sm.id;}),{interactive:false,legend:false,label:'Your building'})+'</div>';
  function own(k,t,desc,price){return shopItem(t,desc,price,d[k]?'<span class="foot">Owned</span>':bb(k,'Buy',co<price));}
  function roof(k,t,desc,price){var on=roofOf(d)===k;return shopItem(t,desc,price,on?'<span class="foot">On the roof</span>':bb(k,roofOf(d)?'Swap':'Buy',co<price));}
  var c=esc(sm.code),sk=sceneKey();
  h+='<section class="stack"><h3>Around '+c+'</h3>'
   +shopItem('Tree','Plant a tree next to '+c+' ('+(d.tree||0)+' of 3).',PRICE.tree,bb('tree','Plant',co<PRICE.tree||(d.tree||0)>=3))
   +own('lamp','Street lamps','Two glowing lamps in front of '+c+'.',PRICE.lamp)
   +own('pool','Swimming pool','A pool in the garden of '+c+'.',PRICE.pool)
   +own('fountain','Fountain','A small fountain at the front door.',PRICE.fountain)
   +own('flowers','Flower beds','Colourful flower beds around the garden.',PRICE.flowers)
   +own('fence','Fence','A low white fence around the plot.',PRICE.fence)
   +'<h3>On the roof of '+c+'</h3>'
   +roof('garden','Rooftop garden','Green planters and small trees.',PRICE.garden)
   +roof('roofpool','Rooftop pool','A pool with a view. Swapping replaces the current roof item.',PRICE.roofpool)
   +roof('helipad','Helipad','A landing pad for important guests.',PRICE.helipad)
   +roof('solar','Solar panels','Two rows of panels catching the moonlight.',PRICE.solar)
   +'<h3>Colour</h3>'
   +shopItem('Paint','Repaint '+c+' in another colour.',PRICE.paint,'<div class="swatches">'+[20,45,95,165,215,270,330].map(function(hu){return '<button class="sw'+(d.hue===hu?' on':'')+'" style="background:hsl('+hu+' 45% 48%)" data-a="buy" data-item="paint" data-hue="'+hu+'" aria-label="Paint in colour '+hu+'" '+(co<PRICE.paint?'disabled':'')+'></button>';}).join('')+(d.hue!=null?'<button class="btn small ghost" data-a="buy" data-item="unpaint">Original</button>':'')+'</div>')
   +'<h3>Scenery for the whole district</h3><p class="foot">Buy a look once, then switch between the ones you own for free.</p>'
   +Object.keys(SCENES).map(function(k){var owned=k==='park'||state.sceneOwn[k];return shopItem(SCENES[k],k==='park'?'The default look.':'Changes the ground, the trees and the mood of the district.',owned?0:PRICE.scene,sk===k?'<span class="foot">In use</span>':'<button class="btn small" data-a="buy" data-item="scene" data-scene="'+k+'" '+(!owned&&co<PRICE.scene?'disabled':'')+'>'+(owned?'Use':'Buy')+'</button>');}).join('')
   +'<h3>Useful</h3>'
   +shopItem('Shield','Saves one fading light, any floor, without a check. You can hold 2 ('+state.shields+' now).',PRICE.shield,bb('shield','Buy',co<PRICE.shield||state.shields>=2))
   +'</section>'
   +'<section class="card stack"><h3>How coins work</h3><p class="lede">First light on a floor +10. Saving a fading light +5. A week lit in every module +15. A finished building +50. Each lit floor pays 1 coin of rent a day (up to 25), stored for 3 days at most. Floors you keep on for good pay no rent.</p></section>'+foot();
  return h;
}
function vDeadlines(){
  var sem=curSem(); if(!sem) return vWelcome();
  if(!ui.dl) ui.dl={title:'',date:'',mod:'',kind:'Exam'};
  var all=semDeadlines(sem).sort(function(a,b){return pdate(a.date)-pdate(b.date);});
  var h='<header class="stack"><p class="eyebrow">Deadlines</p><h1 tabindex="-1" id="h1">What is due</h1><p class="lede">Tick things off as you finish them.</p></header>';
  h+='<section class="card stack"><h3>Add a deadline</h3><label class="f">What<input type="text" id="dl-title" data-dl="title" value="'+esc(ui.dl.title)+'" placeholder="Midterm, assignment 2…"></label>'
   +'<div class="grid2"><label class="f">Date<input type="date" data-dl="date" value="'+esc(ui.dl.date)+'"></label><label class="f">Module<select data-dl="mod"><option value="">None</option>'+sem.modules.map(function(m){return '<option value="'+m.id+'"'+(ui.dl.mod===m.id?' selected':'')+'>'+esc(m.code)+'</option>';}).join('')+'</select></label></div>'
   +'<label class="f">Kind<select data-dl="kind">'+['Exam','Test','Assignment','Project','Other'].map(function(k){return '<option'+(ui.dl.kind===k?' selected':'')+'>'+k+'</option>';}).join('')+'</select></label><div class="row"><button class="btn" data-a="adddl">Add</button></div></section>';
  h+='<ul class="list">'+all.map(function(d){var m=d.mod?M(d.mod):null,done=!!state.tasksDone[d.id],n=daysTo(d);
    return '<li><div class="matrow" style="align-items:center"><input type="checkbox" data-c="dead" data-id="'+d.id+'" '+(done?'checked':'')+' aria-label="Done: '+esc(d.title)+'"><div class="grow"><div class="t"'+(done?' style="text-decoration:line-through;opacity:.6"':'')+'>'+esc(d.title)+'</div><div class="s">'+(m?esc(m.code)+' · ':'')+esc(d.kind||'')+' · '+fmt(d.date)+'</div></div><span class="chip'+(n<=3&&n>=0&&!done?' warn':'')+'">'+rel(d)+'</span><button class="btn small ghost" data-a="deldl" data-id="'+d.id+'" aria-label="Delete '+esc(d.title)+'">✕</button></div></li>';}).join('')+'</ul>';
  if(!all.length) h+='<p class="lede">No deadlines yet.</p>';
  return h;
}

function vSetup(){
  if(!ui.setup) ui.setup={name:state.name||'',sname:'Semester '+(state.sems.length+1),start:'2026-09-14',mods:[{code:'',name:'',units:14,kw:''}]};
  var S=ui.setup;
  var h='<header class="stack"><p class="eyebrow">New semester</p><h1 tabindex="-1" id="h1">Build your district</h1><p class="lede">A building for each module, a floor for each teaching unit. Most semesters have 14 weeks. Not sure how many units a module has? Keep 14. A new floor appears when you import a file with a higher week number, and you can add or remove floors at any time.</p></header>';
  h+='<div id="setupcity">'+setupCityHTML()+'</div>';
  h+='<section class="card stack"><label class="f">Your name (optional)<input type="text" data-sb="name" value="'+esc(S.name)+'" maxlength="30"></label><div class="grid2"><label class="f">Semester name<input type="text" data-sb="sname" value="'+esc(S.sname)+'" maxlength="40"></label><label class="f">First teaching week starts<input type="date" data-sb="start" value="'+esc(S.start)+'"></label></div></section>';
  h+='<section class="stack"><h2>Modules</h2>'+S.mods.map(function(m,i){
    return '<div class="modrow"><div class="g"><label class="f">Code<input type="text" data-sb="mods.'+i+'.code" value="'+esc(m.code)+'" maxlength="8" placeholder="CNB"></label><label class="f">Name<input type="text" data-sb="mods.'+i+'.name" value="'+esc(m.name)+'" maxlength="60" placeholder="Computer Networks Basics"></label><label class="f">Units (not sure? keep 14)<input type="number" min="1" max="30" data-sb="mods.'+i+'.units" value="'+esc(m.units)+'"></label></div>'
     +'<label class="f">Words that help sort files (optional, comma separated)<input type="text" data-sb="mods.'+i+'.kw" value="'+esc(m.kw)+'" placeholder="router, ipv4, subnet"></label>'
     +(S.mods.length>1?'<div><button class="btn small ghost" data-a="rmmod" data-i="'+i+'">Remove module</button></div>':'')+'</div>';}).join('')
   +'<div class="row"><button class="btn ghost" data-a="addmod">＋ Add a module</button></div></section>';
  h+='<div class="row"><button class="btn" data-a="buildsem">Build my district</button>'+(state.sems.length?'<button class="btn ghost" data-a="go" data-to="#/">Cancel</button>':'')+'</div>';
  return h;
}

function vSettings(){
  var sem=curSem();
  var h='<header class="stack"><p class="eyebrow">Settings</p><h1 tabindex="-1" id="h1">Your city</h1></header>';
  if(readOnly) h+='<div class="notice warn">The saved data on this device comes from a newer version of Booklyn. This page will not overwrite it.</div>';
  else if(!storageOK) h+='<div class="notice warn">This browser blocks saving, so your progress will be lost when you close the page.</div>';
  if(!filesOK) h+='<div class="notice warn">This browser cannot store files, so importing will not work here.</div>';
  h+='<section class="card stack"><label class="f">Your name<input type="text" id="nm" value="'+esc(state.name)+'" maxlength="30"></label>'
   +'<fieldset style="border:0;padding:0;margin:0" class="stack"><legend class="f" style="margin-bottom:6px">Theme</legend><div class="tabs" role="radiogroup">'+['system','light','dark'].map(function(t){return '<button role="radio" aria-checked="'+(state.theme===t)+'" aria-selected="'+(state.theme===t)+'" data-a="theme" data-v="'+t+'">'+t[0].toUpperCase()+t.slice(1)+'</button>';}).join('')+'</div></fieldset></section>';
  if(sem) h+='<section class="card stack"><h3>'+esc(sem.name)+'</h3><div class="row"><button class="btn small ghost" data-a="finish">'+(sem.finished?'Reopen this semester':'Mark as finished')+'</button><button class="btn small ghost" data-a="newsem">＋ New semester</button></div>'
   +'<div class="row">'+(ui.confirm==='sem'?'<button class="btn small danger" data-a="rmsem2">Remove it and its files</button><button class="btn small ghost" data-a="del0">Cancel</button>':'<button class="btn small ghost" data-a="rmsem1">Remove this semester…</button>')+'</div></section>';
  h+='<section class="card stack"><h3>Storage</h3><p class="lede" id="stor">Checking…</p><div class="row"><button class="btn small ghost" data-a="persist">Ask the browser to keep my files</button></div></section>';
  h+='<section class="card stack"><h3>Back up your progress</h3><p class="lede">'+(state.lastBackup?'Last backup: '+new Date(state.lastBackup).toLocaleDateString('en-GB')+'. ':'No backup yet. ')+'Download a file with your semesters, lights, notes and deadlines. Keep it in a safe place such as your cloud drive. The imported files themselves are not included, so keep the originals.</p><textarea id="bk" aria-label="Backup text" spellcheck="false" placeholder="Press “Create backup text”"></textarea><div class="row"><button class="btn small" data-a="dlbackup">Download backup file</button><button class="btn small ghost" data-a="loadbackup">Restore from file</button><input type="file" id="bkfile" accept=".json,application/json" hidden><button class="btn small ghost" data-a="export">Create backup text</button><button class="btn small ghost" data-a="restore">Restore from text</button></div></section>';
  h+=accountCard();
  if(devOn())h+='<section class="card stack"><details id="devtools"'+(ui.devOpen?' open':'')+'><summary><h3 style="display:inline">Testing tools</h3></summary><p class="lede" style="margin:8px 0">For the project team. Hide these before the user tests.</p><div class="row"><button class="btn small" data-a="tcoins" data-n="1000">Add 1,000 coins</button><button class="btn small ghost" data-a="tcoins" data-n="-9999999">Set coins to 0</button></div><div class="row" style="margin-top:8px"><button class="btn small ghost" data-a="tage" data-n="8">Age all lights 8 days</button><button class="btn small ghost" data-a="tage" data-n="20">Age all lights 20 days</button><button class="btn small ghost" data-a="trent">Make 3 days of rent due</button></div></details></section>';
  h+='<section class="card stack"><h3>Reset everything</h3><p class="lede">Deletes all semesters, progress and imported files from this device.</p><div class="row">'+(ui.confirm==='all'?'<button class="btn small danger" data-a="reset2">Yes, delete everything</button><button class="btn small ghost" data-a="del0">Cancel</button>':'<button class="btn small ghost" data-a="reset1">Reset…</button>')+'</div></section>';
  h+='<section class="stack"><h3>About</h3><p class="foot">Booklyn · saved-data schema '+SCHEMA+'. Older data is migrated automatically and backed up first. Data from a newer version is never overwritten.</p></section>'+foot();
  return h;
}

/* ================= shell ================= */
function nav(cur){
  var items=[['campus','Campus','#/','campus'],['port','Port','#/port','port'],['deadlines','Deadlines','#/deadlines','dead'],['shop','Shop','#/shop','shop'],['settings','Settings','#/settings','set']];
  var on={module:'campus',unit:'campus',study:'campus',setup:'campus'}[cur]||cur,p=pending().length;
  return items.map(function(i){return '<button class="navbtn" data-a="go" data-to="'+i[2]+'" '+(on===i[0]?'aria-current="page"':'')+'><svg viewBox="0 0 24 24" aria-hidden="true">'+ICON[i[3]]+'</svg><span>'+i[1]+'</span>'+(i[0]==='port'&&p?'<span class="badge" aria-label="'+p+' files waiting">'+p+'</span>':'')+'</button>';}).join('');
}
function render(focus){
  var r=route(); lastRendered=cur();
  if(r.name!=='campus') ui.cityFull=false;
  if(r.name==='campus'&&state.sems.length){var rp=collectRent();if(rp)setTimeout(function(){toast('Rent collected: +'+rp+' coins');},400);}
  document.documentElement.removeAttribute('data-theme');
  if(state.theme==='light'||state.theme==='dark') document.documentElement.setAttribute('data-theme',state.theme);
  var body;
  if(!state.sems.length&&r.name!=='setup'&&r.name!=='settings') body=vWelcome();
  else body=r.name==='campus'?vCampus():r.name==='port'?vPort():r.name==='module'?vModule(r):r.name==='unit'?vUnit(r):r.name==='study'?vStudy(r):r.name==='deadlines'?vDeadlines():r.name==='shop'?vShop():r.name==='setup'?vSetup():vSettings();
  if(r.name!=='study'&&study){pauseTimer();study=null;}
  $('#app').innerHTML='<nav class="rail" aria-label="Main"><div class="brand"><img src="icon.svg" alt="" width="30" height="30">Booklyn<small>Keep your lights on</small></div>'+nav(r.name)+'</nav><main class="main">'+body+'</main><nav class="tabbar" aria-label="Main">'+nav(r.name)+'</nav>';
  document.documentElement.classList.toggle('cityfull',!!ui.cityFull);
  if(focus){var h1=$('#h1');if(h1)h1.focus({preventScroll:true});window.scrollTo(0,0);}
  if(r.name==='settings') storageInfo();
}
window.addEventListener('hashchange',function(){try{var h=location.hash||'#/';if(h!==memHash){memHash=h;render(true);}}catch(e){}});
async function storageInfo(){
  var el=$('#stor'); if(!el) return;
  try{
    var e=await navigator.storage.estimate(), p=navigator.storage.persisted?await navigator.storage.persisted():null;
    var n=FILES.filter(function(f){return f.status==='imported';}).reduce(function(a,f){return a+f.size;},0);
    el.textContent=FILES.filter(function(f){return f.status==='imported';}).length+' files, '+size(n)+' of your files. Browser storage used: '+size(e.usage||0)+' of about '+size(e.quota||0)+'. '+(p===true?'The browser has promised to keep your data.':p===false?'The browser may clear this data if the device runs low on space.':'');
  }catch(x){el.textContent='Storage information is not available in this browser.';}
}

/* ================= timer ================= */
var tick;
function pauseTimer(){if(!study)return;study.running=false;clearInterval(tick);}
function startTimer(){
  study.running=true;study.end=Date.now()+study.remaining*1000;clearInterval(tick);
  tick=setInterval(function(){
    var rem=Math.max(0,Math.ceil((study.end-Date.now())/1000));study.remaining=rem;
    var t=$('#tm'),b=$('#tb');if(t)t.textContent=mmss(rem);if(b)b.style.width=Math.round((1500-rem)/15)+'%';
    if(rem===0){pauseTimer();toast('Time is up. Now the check.');goCheck();}
  },250);
}

/* ================= actions ================= */
function setLit(k){
  var p=k.split(':'),m=M(p[0]),u=+p[1],li=litInfo(k),pinned=!!(state.pin&&state.pin[k]),res={coins:0,notes:[]};
  if(!pinned){
    if(state.lvl[k]===undefined){state.lvl[k]=0;res.coins+=10;res.notes.push('first light on this floor');}
    else if(!li){state.lvl[k]=Math.max(0,state.lvl[k]-1);res.coins+=5;res.notes.push('back on after fading');}
    else if(li.state==='fading'){state.lvl[k]=Math.min(2,(state.lvl[k]||0)+1);res.coins+=5;res.notes.push('saved in time, so the light now lasts longer');}
  }
  if(pinned&&state.lvl[k]===undefined)state.lvl[k]=0;
  state.lit[k]=Date.now();
  if(m)mats(m,u).forEach(function(x){state.seen[x.id]=true;});
  if(m&&!pinned){
    var sem=semOf(m.id);
    if(sem){
      var wk='w:'+sem.id+':'+u;
      if(!state.paid[wk]&&sem.modules.every(function(x){return u>x.units||realOn(x,u);})){state.paid[wk]=1;res.coins+=15;res.notes.push('week '+u+' lit in every module (+15)');}
    }
    var bk='b:'+m.id,all=true;for(var i=1;i<=m.units;i++)if(!realOn(m,i))all=false;
    if(!state.paid[bk]&&all){state.paid[bk]=1;res.coins+=50;res.notes.push(m.code+' complete (+50)');}
  }
  state.coins+=res.coins;save();return res;
}
function rewardHTML(){
  var r=study&&study.reward;if(!r||!r.coins)return '';
  return '<div class="reward"><i class="cdot"></i><b>+'+r.coins+' coins</b><span>'+esc(r.notes.join(' · '))+'</span></div>';
}
function finishQuiz(){study.step='result';study.passed=study.score>=2;if(study.passed)study.reward=setLit(study.k);}
function fileById(id){return FILES.filter(function(f){return f.id===id;})[0];}
function demoSem(){
  var mods=DEMO.map(function(d){
    var titles=[],base={};
    for(var u=1;u<=14;u++){var w=d.weeks[u-1];titles.push(w?w[0]:'Week '+u);base[u]=w?w[1].slice():[];}
    return {id:d.code.toLowerCase(),code:d.code,name:d.name,h:d.h,units:14,kw:ALIASES[d.code]||'',titles:titles,base:base};
  });
  return {id:'demo',name:'Semester 1 (demo)',start:'2026-09-14',demo:true,finished:false,modules:mods};
}
function seedDemo(){
  if(state.sems.some(function(s){return s.id==='demo';})){state.activeSem='demo';return;}
  var s=demoSem();state.sems.push(s);state.activeSem='demo';
  Object.keys(DEMO_LIT).forEach(function(c){DEMO_LIT[c].forEach(function(u){state.lit[c.toLowerCase()+':'+u]=Date.now();});});
  state.lit['bscm:1']=Date.now()-9*864e5;state.lit['cnb:1']=Date.now()-20*864e5;state.lvl['bscm:1']=0;state.lvl['cnb:1']=0;
  DEMO_DEADLINES.forEach(function(d){state.deadlines.push({id:uid(),date:d.date,mod:d.code.toLowerCase(),kind:d.kind,title:d.title});});
}
function setPath(o,path,v){var p=path.split('.');for(var i=0;i<p.length-1;i++)o=o[p[i]];o[p[p.length-1]]=v;}
async function sampleFiles(){
  var items=[['BSCM_SW07_slides.txt','Sample A'],['Module 13 - ICMP.txt','Sample B'],['Module 14 - Transport Layer.txt','Sample C'],['week07_slides.txt','Sample D'],['weekly_test_04.txt','Sample E'],['BSCM_SW07_slides (copy).txt','Sample A']];
  var files=items.map(function(x){return new File([x[1]+'. This is a placeholder so you can try the Port.'],x[0],{type:'text/plain'});});
  await addFiles(files);
}

document.addEventListener('click',function(e){
  var b=e.target.closest('[data-a]');if(!b||b.disabled)return;
  var a=b.dataset.a,id=b.dataset.id;
  if(a==='go'){go(b.dataset.to);}
  else if(a==='czoom'){var cv=ui.cityVB;if(cv){ui.cityT=zoomAt({x:ui.cityT.x,y:ui.cityT.y,k:ui.cityT.k},[cv[0]+cv[2]/2,cv[1]+cv[3]/2],ui.cityT.k*(+b.dataset.d>0?1.4:1/1.4));applyCity();}}
  else if(a==='buy'){
    var it=b.dataset.item,sm2=M(ui.shopMod),dd;
    if(it==='unpaint'){if(sm2&&state.deco[sm2.id]){delete state.deco[sm2.id].hue;save();render();}return;}
    if(it==='scene'){
      var sk2=b.dataset.scene,sem2=curSem();if(!sem2||!SCENES[sk2])return;
      if(sk2==='park'||state.sceneOwn[sk2]){state.scenery[sem2.id]=sk2;save();render();return;}
      if(state.coins<PRICE.scene){toast('Not enough coins yet.');return;}
      state.coins-=PRICE.scene;state.sceneOwn[sk2]=true;state.scenery[sem2.id]=sk2;save();render();toast('Your district has a new look.');return;
    }
    var cost=PRICE[it];if(!cost)return;
    if(state.coins<cost){toast('Not enough coins yet.');return;}
    if(it==='shield'){if(state.shields>=2){toast('You can hold 2 shields.');return;}state.shields++;}
    else{
      if(!sm2)return;dd=state.deco[sm2.id]=state.deco[sm2.id]||{};
      if(it==='tree'){if((dd.tree||0)>=3){toast('This building has all its trees.');return;}dd.tree=(dd.tree||0)+1;}
      else if(['lamp','pool','fountain','flowers','fence'].indexOf(it)>=0){if(dd[it])return;dd[it]=true;}
      else if(['garden','roofpool','helipad','solar'].indexOf(it)>=0){if(roofOf(dd)===it)return;dd.roof=it;delete dd.garden;}
      else if(it==='paint'){dd.hue=+b.dataset.hue;}
    }
    state.coins-=cost;save();render();toast('Bought. It is already in your city.');
  }
  else if(a==='shield'){var sk=b.dataset.k,sli=litInfo(sk);if(state.shields>0&&sli&&sli.state==='fading'){state.shields--;state.lit[sk]=Date.now();save();render();toast('Shield used. The light is back to full.');}}
  else if(a==='tcoins'){state.coins=Math.max(0,state.coins+(+b.dataset.n||0));save();render();toast('Coins: '+state.coins);}
  else if(a==='tage'){Object.keys(state.lit).forEach(function(k){state.lit[k]=litTs(k)-(+b.dataset.n||0)*864e5;});save();render();toast('Lights aged. Open Campus to see them fade.');}
  else if(a==='trent'){state.rentAt=Date.now()-3*864e5;save();toast('Open Campus to collect the rent.');}
  else if(a==='creset'){ui.cityT={x:0,y:0,k:1};applyCity();}
  else if(a==='cfull'){ui.cityFull=true;render();var cb=$('[data-a="cclose"]');if(cb)cb.focus();}
  else if(a==='cclose'){ui.cityFull=false;render();}
  else if(a==='addfloor'){var am=M(b.dataset.m);if(am){if(am.units>=MAXU)toast('A module can have up to '+MAXU+' floors.');else{ensureUnits(am,am.units+1);render();}}}
  else if(a==='rmfloor'){var rm=M(b.dataset.m);if(rm&&rm.units>1&&!mats(rm,rm.units).length&&!state.lit[rm.id+':'+rm.units]){rm.titles.length=rm.units-1;rm.units--;save();render();}}
  else if(a==='leave'){pauseTimer();study=null;go(b.dataset.to);}
  else if(a==='tab'){ui.tab=b.dataset.v;render();}
  else if(a==='newsem'){ui.setup=null;go('#/setup');}
  else if(a==='demo'){seedDemo();ui.cityBuild=true;ui.cityT={x:0,y:0,k:1};save();go('#/');}
  else if(a==='addmod'){ui.setup.mods.push({code:'',name:'',units:14,kw:''});render();}
  else if(a==='rmmod'){ui.setup.mods.splice(+b.dataset.i,1);render();}
  else if(a==='buildsem'){
    var S=ui.setup,mods=S.mods.filter(function(m){return String(m.code).trim()&&String(m.name).trim();});
    if(!mods.length){toast('Add at least one module with a code and a name.');return;}
    var sem={id:uid(),name:String(S.sname).trim()||'Semester',start:S.start||'',demo:false,finished:false,modules:[]};
    mods.forEach(function(m,i){
      var code=String(m.code).trim().toUpperCase().slice(0,8),n=clamp(parseInt(m.units,10)||14,1,MAXU),t=[];
      for(var u=1;u<=n;u++)t.push('Week '+u);
      sem.modules.push({id:uid(),code:code,name:String(m.name).trim(),h:HUES[(state.sems.length*3+i)%HUES.length],units:n,kw:String(m.kw).trim()||ALIASES[code]||'',titles:t,base:{}});
    });
    if(S.name)state.name=S.name;
    state.sems.push(sem);state.activeSem=sem.id;ui.setup=null;ui.cityBuild=true;ui.cityT={x:0,y:0,k:1};save();go('#/');toast('Your district is ready. Tap a building to add its first files.');
  }
  else if(a==='syreq'){
    var em=($('#syemail')||{}).value;em=String(em||'').trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)){SYNC.msg='Enter a valid email address.';render();return;}
    SYNC.busy=true;SYNC.msg='Sending…';SYNC.link='';render();
    api('POST','/api/auth/request',{email:em}).then(function(r){
      SYNC.busy=false;
      if(r.ok){SYNC.msg='Check your inbox for the sign-in link. It works once and expires in 15 minutes.';SYNC.link=r.devLink||'';}
      else if(r.status===503)SYNC.msg='Email sending is not set up on this site yet.';
      else if(r.status===400)SYNC.msg='That email address does not look right.';
      else SYNC.msg=r.offline?'You are offline.':'Could not send the link. Try again in a minute.';
      render();
    });
  }
  else if(a==='sycodenew'){codeEnter('',true);}
  else if(a==='sycodein'){var cv=(($('#sycode')||{}).value||'').trim();if(!cv){SYNC.msg='Enter your sync code.';render();return;}codeEnter(cv,false);}
  else if(a==='sycopy'){var cc=SYNC.newCode||codeStored();try{navigator.clipboard.writeText(cc).then(function(){toast('Code copied.');},function(){toast('Select the code and copy it.');});}catch(e){toast('Select the code and copy it.');}}
  else if(a==='sycodedl'){try{var bl=new Blob(['Booklyn sync code: '+SYNC.newCode+'\nKeep this file private. Anyone with the code can open your progress.\n'],{type:'text/plain'}),la=document.createElement('a');la.href=URL.createObjectURL(bl);la.download='booklyn-sync-code.txt';document.body.appendChild(la);la.click();setTimeout(function(){URL.revokeObjectURL(la.href);la.remove();},1000);}catch(e){toast('Could not create the file.');}}
  else if(a==='sycodedone'){SYNC.newCode='';render();}
  else if(a==='syshow'){SYNC.showCode=true;render();}
  else if(a==='syhide'){SYNC.showCode=false;render();}
  else if(a==='sylogout2'){codeStore('');ui.confirm=null;api('POST','/api/auth/logout',{}).then(function(){SYNC.me=null;SYNC.kind='';SYNC.uid='';SYNC.conflict=null;SYNC.msg='';SYNC.newCode='';SYNC.showCode=false;render();toast('Signed out. Your progress stays on this device.');});}
  else if(a==='sysync'){SYNC.msg='';syncPull().then(function(){if(!SYNC.conflict&&SYNC.dirty)return syncPush();}).then(function(){if(!SYNC.msg&&!SYNC.conflict)toast('Synced.');});}
  else if(a==='sylogout'&&SYNC.kind==='code'){ui.confirm='logout';render();}
  else if(a==='sylogout'){api('POST','/api/auth/logout',{}).then(function(){SYNC.me=null;SYNC.conflict=null;SYNC.msg='';SYNC.link='';render();toast('Signed out. Your progress stays on this device.');});}
  else if(a==='sydel1'){ui.confirm='acct';render();}
  else if(a==='sydel2'){api('DELETE','/api/account',{}).then(function(r){ui.confirm=null;if(r.ok){codeStore('');SYNC.kind='';SYNC.uid='';SYNC.me=null;SYNC.base=0;SYNC.known='';SYNC.last=0;SYNC.conflict=null;SYNC.msg='';syncMeta();toast('Your cloud data was deleted. Your progress stays on this device.');}else toast('Could not delete just now. Try again.');render();});}
  else if(a==='sycloud'){if(SYNC.conflict&&syncAdopt(SYNC.conflict.state,SYNC.conflict.updatedAt))toast('Using the cloud copy.');else render();}
  else if(a==='sydevice'){if(SYNC.conflict){SYNC.base=SYNC.conflict.updatedAt;SYNC.conflict=null;SYNC.dirty=true;syncMeta();syncPush().then(function(){toast('Using this device. The cloud copy was replaced.');render();});}}
  else if(a==='scanilias'){if(!ui.ilias.busy)scanIlias();}
  else if(a==='ilreport'){var rep=ui.ilias.report||'';try{navigator.clipboard.writeText(rep).then(function(){ui.ilias.status='Scan report copied. Paste it in the chat.';render();},function(){ui.ilias.status='Could not copy. Your browser blocked the clipboard.';render();});}catch(e){ui.ilias.status='Could not copy the report.';render();}}
  else if(a==='iliasimport'){if(!ui.ilias.busy)importIlias(b.dataset.key);}
  else if(a==='iliasall'){if(!ui.ilias.busy)importAllIlias();}
  else if(a==='ilfilter'){ui.ilias.filter=b.dataset.f;render();}
  else if(a==='ildismiss'){state.iliasDismissed[b.dataset.key]=Date.now();save();render();}
  else if(a==='ilrestore'){delete state.iliasDismissed[b.dataset.key];save();render();}
  else if(a==='pickfiles'){ui.preset=null;$('#fi').click();}
  else if(a==='pickfolder'){ui.preset=null;$('#fd').click();}
  else if(a==='pickhere'){ui.preset={mod:b.dataset.mod,unit:+b.dataset.unit};$('#fi').click();}
  else if(a==='samples'){sampleFiles();}
  else if(a==='confirm'){var f=fileById(id);if(f){f.confirmed=true;dbPut(f);render();}}
  else if(a==='import'){
    var n=[];pending().forEach(function(f){if(eligible(f)){f.status='imported';dbPut(f);n.push(f.id);}});
    state.lastImport=n;save();render(true);toast(n.length+' file'+(n.length===1?'':'s')+' imported. Your floors are ready.');
  }
  else if(a==='undo'){state.lastImport.forEach(function(i){var f=fileById(i);if(f){f.status='pending';f.confirmed=true;dbPut(f);}});state.lastImport=[];save();render(true);toast('Import undone. The files are back in the Port.');}
  else if(a==='open'){openFile(id);}
  else if(a==='del1'){ui.confirm=id;render();}
  else if(a==='del0'){ui.confirm=null;render();}
  else if(a==='rmdups'){var gone=pending().filter(isDupRow);Promise.all(gone.map(function(f){return dbDel(f.id);})).then(function(){var ids={};gone.forEach(function(f){ids[f.id]=1;});FILES=FILES.filter(function(f){return !ids[f.id];});render();toast(gone.length+' duplicate'+(gone.length===1?'':'s')+' removed.');});}
  else if(a==='del2'){dbDel(id).then(function(){FILES=FILES.filter(function(f){return f.id!==id;});ui.confirm=null;render();toast('File removed.');});}
  else if(a==='timer'){if(study.running)pauseTimer();else startTimer();render();var btn=$('#tbtn');if(btn)btn.focus();}
  else if(a==='treset'){pauseTimer();study.remaining=1500;render();}
  else if(a==='tocheck'){pauseTimer();goCheck();}
  else if(a==='badq'){reportBad();render();}
  else if(a==='pick'){var i=+b.dataset.i,q=(study.quiz||quizFor(M(study.k.split(':')[0]),+study.k.split(':')[1]))[study.q];study.picked=i;if(i===q.a)study.score++;render();var nb=document.querySelector('[data-a="nextq"]');if(nb)nb.focus();}
  else if(a==='nextq'){if(study.q<2){study.q++;study.picked=null;render(true);}else{finishQuiz();render(true);}}
  else if(a==='finishself'){study.score=study.checks.filter(Boolean).length;finishQuiz();render(true);}
  else if(a==='retry'){var k=study.k;study={k:k,step:'check',remaining:1500,end:null,running:false,q:0,score:0,picked:null,checks:[false,false,false],passed:false};goCheck();}
  else if(a==='adddl'){
    var d=ui.dl;if(!d.title.trim()||!d.date){toast('Add a title and a date.');return;}
    state.deadlines.push({id:uid(),date:d.date,mod:d.mod,kind:d.kind,title:d.title.trim()});ui.dl=null;save();render();toast('Deadline added.');
  }
  else if(a==='deldl'){state.deadlines=state.deadlines.filter(function(x){return x.id!==id;});save();render();}
  else if(a==='theme'){state.theme=b.dataset.v;save();render();}
  else if(a==='finish'){var s=curSem();s.finished=!s.finished;save();render();}
  else if(a==='rmsem1'){ui.confirm='sem';render();}
  else if(a==='rmsem2'){
    var sm=curSem(),gone=FILES.filter(function(f){return f.sem===sm.id;});
    Promise.all(gone.map(function(f){return dbDel(f.id);})).then(function(){
      FILES=FILES.filter(function(f){return f.sem!==sm.id;});
      var ids={};sm.modules.forEach(function(m){ids[m.id]=1;});
      Object.keys(state.lit).forEach(function(k){if(ids[k.split(':')[0]])delete state.lit[k];});
      state.deadlines=state.deadlines.filter(function(d){return !ids[d.mod];});
      state.sems=state.sems.filter(function(x){return x.id!==sm.id;});state.activeSem=state.sems.length?state.sems[0].id:null;
      ui.confirm=null;save();go('#/');toast('Semester removed.');
    });
  }
  else if(a==='persist'){try{navigator.storage.persist().then(function(ok){toast(ok?'The browser will keep your data.':'The browser did not agree. Keep your originals.');storageInfo();});}catch(x){toast('Not available in this browser.');}}
  else if(a==='dlbackup'){if(dlBackup()){toast('Backup downloaded. Keep the file somewhere safe.');render();}else toast('Could not create the file. Use the backup text below.');}
  else if(a==='loadbackup'){var bf=$('#bkfile');if(bf)bf.click();}
  else if(a==='snoozebk'){state.snoozeBackup=Date.now()+3*864e5;save();render();}
  else if(a==='export'){$('#bk').value=JSON.stringify(state);$('#bk').select();toast('Backup text created. Copy it now.');}
  else if(a==='restore'){
    try{var s2=JSON.parse($('#bk').value);if(!s2||typeof s2.schema!=='number')throw 0;
      if(s2.schema>SCHEMA){toast('That backup is from a newer version.');return;}
      while(s2.schema<SCHEMA){var mg=MIGRATIONS[s2.schema];if(!mg)throw 0;s2=mg(s2);}
      state=clean(s2);save();render(true);toast('Progress restored.');
    }catch(err){toast('That text is not a valid backup.');}
  }
  else if(a==='reset1'){ui.confirm='all';render();}
  else if(a==='reset2'){
    Promise.all(FILES.map(function(f){return dbDel(f.id);})).then(function(){FILES=[];var th=state.theme;state=blank();state.theme=th;ui.confirm=null;ui.setup=null;save();go('#/');toast('Everything was deleted.');});
  }
});
document.addEventListener('change',function(e){
  var t=e.target,c=t.dataset.c;
  if(t.id==='bkfile'){var bf=t.files&&t.files[0];if(!bf)return;var rd=new FileReader();
    rd.onload=function(){try{var s2=JSON.parse(rd.result);if(!s2||typeof s2.schema!=='number')throw 0;
      if(s2.schema>SCHEMA){toast('That backup is from a newer version.');return;}
      while(s2.schema<SCHEMA){var mg=MIGRATIONS[s2.schema];if(!mg)throw 0;s2=mg(s2);}
      state=clean(s2);save();render(true);toast('Progress restored.');}catch(err){toast('That file is not a valid backup.');}t.value='';};
    rd.readAsText(bf);return;}
  if(t.id==='fi'||t.id==='fd'){var files=t.files,p=ui.preset;ui.preset=null;addFiles(files,p).then(function(){t.value='';});return;}
  if(t.dataset.dl){ui.dl[t.dataset.dl]=t.value;return;}
  if(!c)return;
  if(c==='sem'){if(t.value==='__new'){ui.setup=null;go('#/setup');}else{state.activeSem=t.value;ui.cityT={x:0,y:0,k:1};save();render();}}
  else if(c==='seen'){if(t.checked)state.seen[t.dataset.id]=true;else delete state.seen[t.dataset.id];save();render();}
  else if(c==='dead'){if(t.checked)state.tasksDone[t.dataset.id]=true;else delete state.tasksDone[t.dataset.id];save();render();}
  else if(c==='shopmod'){ui.shopMod=t.value;render();}
  else if(c==='pin'){var pk=t.dataset.k;if(t.checked)state.pin[pk]=true;else delete state.pin[pk];save();render();toast(t.checked?'Pinned. This light stays on and pays no rent.':'Unpinned. The light follows the normal rules again.');}
  else if(c==='aiopt'){state.aiOpt=t.checked;save();}
  else if(c==='self'){study.checks[+t.dataset.i]=t.checked;render();var cb=document.querySelectorAll('[data-c="self"]')[+t.dataset.i];if(cb)cb.focus();}
  else{
    var row=t.closest('[data-f]'),f=row&&fileById(row.dataset.f);if(!f)return;
    if(c==='inc'){f.include=t.checked;if(t.checked&&f.dup)f.confirmed=true;}
    else if(c==='mod'){f.mod=t.value;var m=M(f.mod);if(m&&f.unit>m.units)f.unit=m.units;f.confirmed=true;}
    else if(c==='unit'){f.unit=+t.value;f.confirmed=true;}
    dbPut(f);var y=window.scrollY;render();window.scrollTo(0,y);
  }
});
document.addEventListener('input',function(e){
  var t=e.target;
  if(t.id==='note'){state.notes[t.dataset.k]=t.value;save();}
  else if(t.id==='utitle'){var p=t.dataset.k.split(':'),m=M(p[0]);if(m){m.titles[+p[1]-1]=t.value||('Week '+p[1]);save();}}
  else if(t.id==='nm'){state.name=t.value;save();}
  else if(t.id==='q'){ui.q=t.value;var r=route();$('#matlist').innerHTML=fileList(r.m);}
  else if(t.dataset.sb){setPath(ui.setup,t.dataset.sb,t.type==='number'?t.value:t.value);if(/^mods\./.test(t.dataset.sb)){var sc=$('#setupcity');if(sc)sc.innerHTML=setupCityHTML();}}
  else if(t.dataset.dl){ui.dl[t.dataset.dl]=t.value;}
});
/* drag and drop */
document.addEventListener('dragover',function(e){var z=e.target.closest&&e.target.closest('[data-drop]');if(z){e.preventDefault();z.classList.add('over');}});
document.addEventListener('dragleave',function(e){var z=e.target.closest&&e.target.closest('[data-drop]');if(z)z.classList.remove('over');});
document.addEventListener('drop',function(e){var z=e.target.closest&&e.target.closest('[data-drop]');if(z){e.preventDefault();z.classList.remove('over');ui.preset=null;if(e.dataTransfer&&e.dataTransfer.files.length)addFiles(e.dataTransfer.files);}});

/* ================= account and sync ================= */
function api(method,path,body,keep){
  var o={method:method,credentials:'same-origin',headers:{}};
  if(keep)o.keepalive=true;
  if(body!==undefined){o.headers['Content-Type']='application/json';o.body=JSON.stringify(body);}
  return fetch(path,o).then(function(r){return r.json().catch(function(){return {};}).then(function(j){j.status=r.status;return j;});}).catch(function(){return {ok:false,status:0,offline:true};});
}
function codeStored(){try{return localStorage.getItem('booklyn:synccode')||'';}catch(e){return '';}}
function codeStore(c){try{if(c)localStorage.setItem('booklyn:synccode',c);else localStorage.removeItem('booklyn:synccode');}catch(e){}}
function setAccount(r){SYNC.kind=r.kind||'email';SYNC.me=r.kind==='code'?'Sync code':(r.email||'');SYNC.uid=r.uid||'';}
function devOn(){try{return localStorage.getItem('booklyn:dev')==='1';}catch(e){return false;}}
function syncRender(){
  if(route().name!=='settings'&&!SYNC.conflict)return;
  var ae=document.activeElement;if(ae&&ae.id==='syemail')return;
  render();
}
function syncSchedule(){clearTimeout(SYNC.timer);SYNC.timer=setTimeout(function(){syncPush();},4000);}
function syncAdopt(remote,updatedAt){
  var s2=remote;
  if(!s2||typeof s2.schema!=='number'){SYNC.msg='The cloud copy could not be read.';return false;}
  if(s2.schema>SCHEMA){SYNC.msg='The cloud copy comes from a newer version of Booklyn. Reload this page to update.';return false;}
  try{if(state.sems.some(function(x){return !x.demo;}))localStorage.setItem(KEY+'.beforesync',JSON.stringify(state));}catch(e){}
  while(s2.schema<SCHEMA){var mg=MIGRATIONS[s2.schema];if(!mg){SYNC.msg='The cloud copy could not be read.';return false;}s2=mg(s2);}
  try{s2=clean(s2);}catch(e){SYNC.msg='The cloud copy looks damaged, so it was not used.';return false;}
  SYNC.adopting=true;state=s2;save();SYNC.adopting=false;
  SYNC.base=updatedAt;SYNC.dirty=false;SYNC.last=Date.now();SYNC.conflict=null;SYNC.msg='';syncMeta();
  render(true);return true;
}
async function syncPull(){
  if(!SYNC.me||readOnly)return;
  SYNC.busy=true;var r=await api('GET','/api/state');SYNC.busy=false;
  if(!r.ok){if(r.status===401){SYNC.me=null;SYNC.msg='You were signed out. Sign in again to sync.';}else SYNC.msg=r.offline?'Offline. Your progress will sync when you are back online.':'Could not reach the cloud.';syncRender();return;}
  var hasLocal=state.sems.some(function(x){return !x.demo;});
  if(!r.state){if(hasLocal){SYNC.base=0;await syncPush();}else{SYNC.base=0;SYNC.dirty=false;syncMeta();}syncRender();return;}
  if(SYNC.base===r.updatedAt){if(SYNC.dirty&&hasLocal)await syncPush();else{SYNC.dirty=false;syncMeta();}syncRender();return;}
  if(!hasLocal||(SYNC.base&&!SYNC.dirty)){if(syncAdopt(r.state,r.updatedAt))toast('Your progress was updated from the cloud.');syncRender();return;}
  SYNC.conflict={state:r.state,updatedAt:r.updatedAt};
  toast('Your cloud copy and this device differ. Open Settings to choose.');syncRender();
}
async function syncPush(keep){
  if(!SYNC.me||SYNC.pushing||readOnly||SYNC.conflict)return;
  clearTimeout(SYNC.timer);SYNC.pushing=true;
  var r=await api('PUT','/api/state',{state:state,base:SYNC.base},keep);SYNC.pushing=false;
  if(r.ok){SYNC.base=r.updatedAt;SYNC.dirty=false;SYNC.last=Date.now();SYNC.msg='';syncMeta();}
  else if(r.status===409){await syncPull();return;}
  else if(r.status===401){SYNC.me=null;SYNC.msg='You were signed out. Sign in again to sync.';}
  else SYNC.msg=r.offline?'Offline. Your progress will sync when you are back online.':'Could not sync just now.';
  syncRender();
}
async function syncInit(){
  if(readOnly)return;
  var tk=null;try{tk=new URL(location.href).searchParams.get('token');}catch(e){}
  if(tk){
    try{history.replaceState(null,'',location.pathname+location.hash);}catch(e){}
    var v=await api('POST','/api/auth/verify',{token:tk});
    if(v.ok){setAccount(v);toast('Signed in as '+v.email+'.');}
    else{SYNC.msg='That sign-in link has expired or was already used. Ask for a new one in Settings.';toast(SYNC.msg);}
  }
  if(!SYNC.me){var m=await api('GET','/api/me');if(m.ok)setAccount(m);else if(m.status===404||m.status===405||m.status===501)SYNC.na=true;}
  if(!SYNC.me&&!SYNC.na&&codeStored()){var lg=await api('POST','/api/code/login',{code:codeStored()});if(lg.ok)setAccount({kind:'code',uid:lg.uid});}
  SYNC.checked=true;
  if(SYNC.me){if(SYNC.known&&SYNC.known!==SYNC.uid){SYNC.base=0;}SYNC.known=SYNC.uid;syncMeta();await syncPull();}
  syncRender();
}
async function codeEnter(code,isNew){
  SYNC.busy=true;SYNC.msg='';render();
  var r=isNew?await api('POST','/api/code/create',{}):await api('POST','/api/code/login',{code:code});
  SYNC.busy=false;
  if(!r.ok){SYNC.msg=r.status===429?'Too many tries. Wait a little and try again.':r.status===404||r.status===400?'That code was not found. Check it and try again.':r.status===404?'':(r.offline?'You are offline.':'Could not reach the server. Try again.');render();return;}
  var c=isNew?r.code:code;codeStore(c);setAccount({kind:'code',uid:r.uid});
  if(isNew)SYNC.newCode=c;
  if(SYNC.known&&SYNC.known!==SYNC.uid)SYNC.base=0;SYNC.known=SYNC.uid;syncMeta();
  await syncPull();render();
}
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden'&&SYNC.me&&SYNC.dirty&&!SYNC.conflict)syncPush(true);});
window.addEventListener('online',function(){if(SYNC.me&&SYNC.dirty)syncPush();});
function accountCard(){
  var h='<section class="card stack" id="account"><h3>Account and sync</h3>';
  if(SYNC.na)return h+'<p class="lede">Accounts are not available on this address. Your progress stays on this device.</p></section>';
  if(!SYNC.checked)return h+'<p class="lede">Checking…</p></section>';
  if(SYNC.conflict){
    var cs=SYNC.conflict.state||{},cn=(cs.sems||[]).length,ln=state.sems.length,cl=Object.keys(cs.lit||{}).length,dl=Object.keys(state.lit||{}).length;
    h+='<div class="notice warn stack"><p style="margin:0"><strong>Your cloud copy and this device differ.</strong> The cloud copy has '+cn+' semester'+(cn===1?'':'s')+' and '+cl+' lit floor'+(cl===1?'':'s')+' (saved '+new Date(SYNC.conflict.updatedAt).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})+'). This device has '+ln+' and '+dl+'. Choose which one to keep. The other one is replaced, and a safety copy of this device stays in the browser.</p>'
      +'<div class="row"><button class="btn small" data-a="sycloud">Use the cloud copy</button><button class="btn small ghost" data-a="sydevice">Use this device</button></div></div>';
  }
  if(SYNC.me){
    h+='<p class="lede">'+(SYNC.kind==='code'?'Signed in with a <strong>sync code</strong>. ':'Signed in as <strong>'+esc(SYNC.me)+'</strong>. ')+(SYNC.last?'Last synced: '+new Date(SYNC.last).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})+'. ':'')+(SYNC.dirty&&!SYNC.conflict?'Changes waiting to sync.':'')+'</p>'
     +(SYNC.newCode?'<div class="notice stack"><p style="margin:0"><strong>Your sync code. Save it now.</strong> It is the only way to open your progress on another device, and nobody can recover it for you.</p><p style="margin:0;font:700 1.25rem ui-monospace,Consolas,monospace;letter-spacing:.06em;word-break:break-all">'+esc(SYNC.newCode)+'</p><div class="row"><button class="btn small" data-a="sycopy">Copy code</button><button class="btn small ghost" data-a="sycodedl">Download as a file</button><button class="btn small ghost" data-a="sycodedone">I saved it</button></div></div>':'')
     +(SYNC.kind==='code'&&!SYNC.newCode&&codeStored()?(SYNC.showCode?'<p style="margin:0;font:700 1.1rem ui-monospace,Consolas,monospace;letter-spacing:.06em;word-break:break-all">'+esc(codeStored())+'</p><div class="row"><button class="btn small ghost" data-a="sycopy">Copy code</button><button class="btn small ghost" data-a="syhide">Hide</button></div>':'<div class="row"><button class="btn small ghost" data-a="syshow">Show my sync code</button></div>'):'')
     +(SYNC.msg?'<p class="foot" role="status">'+esc(SYNC.msg)+'</p>':'')
     +'<label class="check"><input type="checkbox" data-c="aiopt" '+(state.aiOpt?'checked':'')+'><div><div class="t">Let an AI write extra questions</div><div class="s">Short text excerpts of your files are sent to Cloudflare Workers AI to write questions. Files are never sent or stored. Off by default. Without it, Booklyn still makes questions on your device.</div></div></label>'
     +'<div class="row"><button class="btn small" data-a="sysync" '+(SYNC.pushing||SYNC.busy?'disabled':'')+'>Sync now</button>'+(ui.confirm==='logout'?'<button class="btn small danger" data-a="sylogout2">Sign out and forget the code here</button><button class="btn small ghost" data-a="del0">Cancel</button>':'<button class="btn small ghost" data-a="sylogout">Sign out</button>')+'</div>'
     +'<div class="row">'+(ui.confirm==='acct'?'<button class="btn small danger" data-a="sydel2">Yes, delete my cloud data</button><button class="btn small ghost" data-a="del0">Cancel</button>':'<button class="btn small ghost" data-a="sydel1">Delete my cloud data…</button>')+'</div>';
  } else {
    h+='<p class="lede">Optional. Keep your progress safe and use it on your phone and your computer. No email and no password: Booklyn gives you a secret sync code.</p>'
     +'<div class="row"><button class="btn small" data-a="sycodenew" '+(SYNC.busy?'disabled':'')+'>Create my sync code</button></div>'
     +'<div class="row"><input type="text" id="sycode" placeholder="XXXXX-XXXXX-XXXXX-XXXXX" autocomplete="off" autocapitalize="characters" style="flex:1 1 220px" aria-label="Your sync code"><button class="btn small ghost" data-a="sycodein" '+(SYNC.busy?'disabled':'')+'>I already have a code</button></div>'
     +(SYNC.msg?'<p class="foot" role="status">'+esc(SYNC.msg)+'</p>':'')
     +'<details><summary class="foot" style="cursor:pointer">Prefer an email link?</summary><div class="stack" style="margin-top:8px"><div class="row"><input type="email" id="syemail" placeholder="you@example.com" autocomplete="email" style="flex:1 1 220px" aria-label="Your email address"><button class="btn small ghost" data-a="syreq" '+(SYNC.busy?'disabled':'')+'>Send me a link</button></div>'+(SYNC.link?'<p class="foot">Local test link: <a href="'+esc(SYNC.link)+'">sign in</a></p>':'')+'</div></details>';
  }
  return h+'<p class="foot">Only your progress (semesters, modules, lights, coins, notes and deadlines) is stored in the cloud. Your files never leave this device. If you sign in by email, the address is used only to send sign-in links. You can delete everything at any time.</p></section>';
}
/* ================= boot ================= */
try{var _u=new URL(location.href);if(_u.searchParams.get('dev')==='1'||_u.searchParams.get('dev')==='0'){localStorage.setItem('booklyn:dev',_u.searchParams.get('dev'));_u.searchParams.delete('dev');history.replaceState(null,'',_u.pathname+(_u.search||'')+_u.hash);}}catch(e){}
var lastExpRender=0;
setInterval(function(){var els=document.querySelectorAll('.cd[data-until]');var exp=false;for(var i=0;i<els.length;i++){var u=+els[i].dataset.until,ms=u-Date.now();if(ms<=0){exp=true;continue;}els[i].textContent=fmtLeft(ms,!!els[i].dataset.compact);}if(exp&&location.hash.indexOf('/study')<0&&!document.hidden&&Date.now()-lastExpRender>5000){lastExpRender=Date.now();render();}},1000);
try{if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1'))window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){});});}catch(e){}
try{window.postMessage({source:'booklyn-app',type:'ping'},location.origin);}catch(e){}
render(false);
try{syncInit();}catch(e){}
dbAll().then(function(all){FILES=all||[];render(false);}).catch(function(){filesOK=false;render(false);});
})();
