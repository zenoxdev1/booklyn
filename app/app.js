/* Booklyn. Keep your lights on.
   Your degree is a city. A semester is a district, a module is a building, a teaching unit is a floor.
   Files are stored on this device only (IndexedDB). Progress is stored in localStorage with a schema version. */
import * as ST from './js/storage.js';
import * as IM from './js/imports.js';
import * as QC from './js/quiz-core.js';
import * as BK from './js/backup.js';
import {_t,_pl,_tf,LOC,LANGS,getLang,setLang} from './js/i18n.js';
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
  {q:'How is an intermediate event drawn in BPMN?',o:['Thin single circle','Double-lined circle','Thick single circle'],a:1,e:'Start events are thin, intermediate events have a double line, end events are thick.'},
  {q:'What does an exclusive (XOR) gateway do in BPMN?',o:['Starts all outgoing paths at once','Chooses exactly one outgoing path','Sends a message to another pool'],a:1,e:'XOR splits the flow into exactly one of its branches, depending on a condition.'},
  {q:'Which element makes a process wait until a message arrives?',o:['A plain task','A message intermediate catching event','An end event'],a:1,e:'A catching message event pauses the flow until the message is received.'}],
 'stcsb:6':[
  {q:'In how many different orders can 3 distinct books stand on a shelf?',o:['3','6','9'],a:1,e:'3! = 3 × 2 × 1 = 6.'},
  {q:'Which expression is Bayes’ theorem?',o:['P(A|B) = P(B|A)·P(A) / P(B)','P(A|B) = P(A)·P(B)','P(A|B) = P(B|A) + P(A)'],a:0,e:'Bayes turns P(B|A) into P(A|B) by weighting with the prior P(A) and dividing by P(B).'},
  {q:'A fair coin is tossed 3 times. What is P(exactly 2 heads)?',o:['0.25','0.375','0.5'],a:1,e:'Binomial: C(3,2) · 0.5² · 0.5¹ = 3 · 0.125 = 0.375.'},
  {q:'For two mutually exclusive events A and B, what is P(A or B)?',o:['P(A) · P(B)','P(A) + P(B)','P(A) − P(B)'],a:1,e:'Events that cannot happen together simply add their probabilities.'},
  {q:'A fair die is rolled once. What is the probability of an even number?',o:['1/6','1/3','1/2'],a:2,e:'Three of the six outcomes (2, 4, 6) are even: 3/6 = 1/2.'}],
 'cnb:6':[
  {q:'How many bits does an IPv4 address have?',o:['32','48','128'],a:0,e:'IPv4 uses 32 bits, IPv6 uses 128 bits.'},
  {q:'Which subnet mask matches a /24 prefix?',o:['255.255.0.0','255.255.255.0','255.255.255.128'],a:1,e:'/24 means 24 network bits: three full octets of 255.'},
  {q:'How many usable host addresses does a /24 network have?',o:['256','255','254'],a:2,e:'256 addresses minus the network and broadcast addresses leaves 254.'},
  {q:'Which protocol finds the MAC address that belongs to an IPv4 address on the local network?',o:['DNS','ARP','DHCP'],a:1,e:'ARP asks the local network who has a given IP address and learns the MAC address from the answer.'},
  {q:'At which OSI layer does a router mainly work?',o:['Layer 2 (data link)','Layer 3 (network)','Layer 4 (transport)'],a:1,e:'Routers forward packets by IP address, which is layer 3.'}],
 'ifa:2':[
  {q:'A company pays rent in cash. Which entry is correct?',o:['Debit Rent expense, credit Cash','Debit Cash, credit Rent expense','Debit Rent expense, credit Revenue'],a:0,e:'The expense increases (debit) and cash decreases (credit).'},
  {q:'Which equation must always balance?',o:['Assets = Liabilities + Equity','Assets = Revenue − Expenses','Equity = Assets + Liabilities'],a:0,e:'Everything the company owns is financed by debt or by owners.'},
  {q:'On which side of a T-account is an increase in a liability recorded?',o:['Debit (left)','Credit (right)','Either, depending on the day'],a:1,e:'Liabilities, equity and revenue increase on the credit side.'},
  {q:'A customer pays an open invoice of 500 in cash. Which entry is correct?',o:['Debit Cash, credit Accounts receivable','Debit Accounts receivable, credit Cash','Debit Cash, credit Revenue'],a:0,e:'Cash goes up (debit) and the receivable shrinks (credit). The revenue was booked earlier, with the invoice.'},
  {q:'Which account normally has a debit balance?',o:['Accounts payable','Equipment (an asset)','Share capital'],a:1,e:'Assets increase on the debit side. Liabilities and equity increase on the credit side.'}],
 'profu:4':[
  {q:'Which loop fits best when you know the number of repetitions in advance?',o:['A for loop','An if statement','A while loop that never changes its condition'],a:0,e:'A for loop counts for you. That is its job.'},
  {q:'In most languages, what does 7 % 3 evaluate to?',o:['2','1','2.33'],a:1,e:'% is the remainder after integer division: 7 = 2·3 + 1.'},
  {q:'What happens if a while loop’s condition never becomes false?',o:['It stops after 10 rounds','It runs forever (infinite loop)','The program skips it'],a:1,e:'Make sure something inside the loop eventually changes the condition.'},
  {q:'In Java, what does 10 / 4 give when both numbers are int?',o:['2.5','2','3'],a:1,e:'Integer division drops the remainder: 10 / 4 = 2.'},
  {q:'What is the index of the first element of an array in Java?',o:['1','0','-1'],a:1,e:'Arrays start counting at 0.'}],
 'iae:6':[
  {q:'Which indicator is lagging, so it turns after the economy turns?',o:['Purchasing Managers’ Index','Unemployment rate','Stock market index'],a:1,e:'PMI and stock prices lead. Unemployment follows with a delay.'},
  {q:'Effective GDP is above potential GDP. What is the output gap?',o:['Positive: the economy runs hot','Negative: there is slack','Zero by definition'],a:0,e:'Effective minus potential: a positive gap often comes with rising inflation.'},
  {q:'Inflation is high and rising. What would a central bank typically do?',o:['Raise policy rates','Cut policy rates','Buy more bonds to push yields down'],a:0,e:'Higher rates make credit dearer and cool demand.'},
  {q:'What does the inflation rate measure?',o:['The change in the general price level','The size of the national debt','The share of people without a job'],a:0,e:'Inflation is the rate at which the general price level rises.'},
  {q:'When the price of a bond rises, what happens to its yield?',o:['It falls','It rises','It stays the same'],a:0,e:'Price and yield move in opposite directions.'}],
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
function rel(d){var n=daysTo(d);return n<0?_t('passed'):n===0?_t('today'):n===1?_t('tomorrow'):_tf('in {n} days',{n:n});}
function fmt(d){return (d instanceof Date?d:pdate(d)).toLocaleDateString(LOC(),{weekday:'short',day:'numeric',month:'short'});}
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
  return {schema:SCHEMA,name:'',theme:'system',activeSem:null,sems:[],lit:{},seen:{},notes:{},tasksDone:{},deadlines:[],lastImport:[],lastBackup:0,snoozeBackup:0,coins:0,rentAt:0,lvl:{},pin:{},deco:{},paid:{},shields:0,iliasKnown:{},iliasDismissed:{},iliasHash:{},iliasImported:{},iliasLast:0,scenery:{},sceneOwn:{},aiOpt:false,how:{},iliasCourseMap:{}};
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
  ['lit','seen','notes','tasksDone','lvl','pin','deco','paid','iliasKnown','iliasDismissed','iliasHash','iliasImported','scenery','sceneOwn','how','iliasCourseMap'].forEach(function(k){if(!s[k]||typeof s[k]!=='object'||Array.isArray(s[k]))s[k]={};});
  if(!Array.isArray(s.sems)||!Array.isArray(s.deadlines)||!Array.isArray(s.lastImport))throw new Error('lists');
  s.name=String(s.name||'').slice(0,80);
  ['coins','shields','rentAt','lastBackup','snoozeBackup','iliasLast'].forEach(function(k){s[k]=Math.max(0,+s[k]||0);});
  s.lastImport=s.lastImport.map(String).slice(0,500);
  Object.keys(s.how).forEach(function(k){if(s.how[k]!=='quiz'&&s.how[k]!=='self')delete s.how[k];});
  Object.keys(s.iliasCourseMap).forEach(function(k){if(!/^[a-z0-9-]{1,60}$/.test(k)||!ID_OK.test(String(s.iliasCourseMap[k])))delete s.iliasCourseMap[k];else s.iliasCourseMap[k]=String(s.iliasCourseMap[k]);});
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
var SYNC={me:null,admin:false,uid:'',kind:'',newCode:'',showCode:false,checked:false,na:false,base:0,last:0,dirty:false,known:'',busy:false,pushing:false,msg:'',link:'',conflict:null,timer:null,adopting:false};
try{var _sm=JSON.parse(localStorage.getItem('booklyn:sync')||'{}');SYNC.base=_sm.base||0;SYNC.last=_sm.last||0;SYNC.known=_sm.uid||_sm.email||'';SYNC.dirty=!!_sm.dirty;}catch(e){}
function syncMeta(){try{localStorage.setItem('booklyn:sync',JSON.stringify({base:SYNC.base,last:SYNC.last,uid:SYNC.uid||SYNC.known||'',dirty:SYNC.dirty}));}catch(e){}}
function save(){
  if(readOnly) return; clearTimeout(saveT);
  if(!SYNC.adopting){SYNC.dirty=true;syncMeta();if(SYNC.me)syncSchedule();}
  saveT=setTimeout(function(){try{localStorage.setItem(KEY,JSON.stringify(state));storageOK=true;}catch(e){storageOK=false;}},150);
}
state=load();

/* ================= file storage (IndexedDB) ================= */
var FILES=[], filesOK=true;
/* The storage code lives in js/storage.js. Every write resolves only when the browser confirmed it. */
var dbAll=ST.dbAll, dbPut=ST.dbPut, dbBlob=ST.dbBlob, dbDel=ST.dbDel;
var fileStore={add:ST.dbAdd,putMany:ST.dbPutMany,delMany:ST.dbDelMany};
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
var SCENES={park:_t("Evening park"),autumn:_t("Autumn"),blossom:_t("Cherry blossom"),snow:_t("Snow"),desert:_t("Desert")};
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
function ensureUnits(m,n){n=clamp(n,1,MAXU);if(n<=m.units)return false;for(var u=m.units+1;u<=n;u++)m.titles[u-1]=m.titles[u-1]||(_t("Week ")+u);m.units=n;save();return true;}
function litCount(m){var n=0;for(var u=1;u<=m.units;u++) if(isOn(uStatus(m,u))) n++;return n;}
function totals(sem){var l=0,t=0;sem.modules.forEach(function(m){l+=litCount(m);t+=m.units;});return {l:l,t:t};}
function pending(){var s=curSem();return FILES.filter(function(f){return f.status==='pending'&&(!s||f.sem===s.id);});}
function semDeadlines(sem){var ids={};sem.modules.forEach(function(m){ids[m.id]=1;});return state.deadlines.filter(function(d){return !d.mod||ids[d.mod];});}
function nextUp(sem){
  var up=semDeadlines(sem).filter(function(d){return d.mod&&!state.tasksDone[d.id]&&daysTo(d)>=0;}).sort(function(a,b){return pdate(a.date)-pdate(b.date);});
  for(var i=0;i<up.length;i++){var m=M(up[i].mod);if(!m)continue;
    for(var u=1;u<=m.units;u++) if(uStatus(m,u)!=='lit'&&mats(m,u).length) return {m:m,u:u,why:up[i].title+' · '+rel(up[i])};}
  for(var j=0;j<sem.modules.length;j++){var mm=sem.modules[j];
    for(var k=1;k<=mm.units;k++) if(uStatus(mm,k)!=='lit'&&mats(mm,k).length) return {m:mm,u:k,why:_t("The next dark floor in your district")};}
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
  if(mod&&unit) why=_t("Matched ")+best.hits.slice(0,2).join(', ')+_t(" and unit ")+unit;
  else if(mod) why=_t("Matched ")+best.hits.slice(0,2).join(', ')+_t(", but no week number in the name");
  else if(best&&second===best.sc) why=_t("Several modules match this name");
  else if(unit) why=_t("Found week ")+unit+_t(" but no module");
  else why=_t("No module or week found in the name");
  return {mod:mod?mod.id:'',unit:unit,sure:!!(mod&&unit),why:why};
}

/* ================= adding files ================= */
async function addFiles(list,preset,skipDups,hint){
  var sem=curSem(); if(!sem){toast(_t("Set up a semester first."));return;}
  var arr=Array.prototype.slice.call(list); if(!arr.length) return;
  try{if(navigator.storage&&navigator.storage.persist) navigator.storage.persist();}catch(e){}
  /* A file is listed only after the browser confirmed it stored it (see js/imports.js). */
  var res=await IM.ingest(arr,{
    files:FILES,store:fileStore,hashOf:sha,skipDuplicates:skipDups!==false,
    isQuota:ST.isQuota,explain:ST.explainStorageError,
    onProgress:function(i,n){toast(_t("Adding ")+(i+1)+_t(" of ")+n+'…',true);},
    build:function(f,h,dup){
      var rec={id:uid(),name:f.name,path:f.webkitRelativePath||'',size:f.size,type:f.type,mtime:f.lastModified,hash:h,addedAt:Date.now(),sem:sem.id,dup:null};
      if(preset){
        rec.status='imported';rec.mod=preset.mod;rec.unit=preset.unit;rec.include=true;rec.confirmed=true;rec.flag=false;rec.why='';
      } else if(hint&&hint.mod&&M(hint.mod)){
        /* the file comes from a known ILIAS course: the module is not guessed from the file name */
        var hm=M(hint.mod);
        rec.status='pending';rec.mod=hint.mod;rec.unit=hint.unit||clamp(weekNo(sem),1,hm.units);
        rec.dup=dup?dup.id:null;rec.flag=!hint.unit||!!dup;rec.include=!dup;rec.confirmed=false;
        rec.why=dup?(_t("Same content as “")+dup.name+'”'):hint.why;
      } else {
        var sg=suggest(rec.path||rec.name,sem),m=sg.mod?M(sg.mod):null;
        rec.status='pending';rec.mod=sg.mod;rec.unit=sg.unit||(m?clamp(weekNo(sem),1,m.units):1);
        rec.dup=dup?dup.id:null;rec.flag=!sg.sure||!!dup;rec.include=!dup;rec.confirmed=false;
        rec.why=dup?(_t("Same content as “")+dup.name+'”'):sg.why;
      }
      return rec;
    }
  });
  $('#toast').classList.remove('show');
  /* files that could not be saved stay in a retry list; retrying cannot create duplicates */
  if(res.failed.length){
    var prev=ui.failed?ui.failed.items:[];
    res.failed.forEach(function(x){x.preset=preset||null;});
    ui.failed={items:prev.concat(res.failed)};
  }
  var added=res.added.length,failed=res.failed.length;
  var msg=added+_pl(added,' file added',' files added')+(res.dups?', '+res.dups+_pl(res.dups,' duplicate skipped',' duplicates skipped'):'')+(failed?', '+failed+_t(" could not be saved"):'')+'.';
  if(failed&&res.failed.some(function(x){return x.quota;}))msg+=_t(" The storage on this device is full.");
  if(!preset&&added&&route().name!=='port'){go('#/port');}
  render(); toast(msg);
  return {added:added,dups:res.dups,failed:failed,hashes:res.hashes};
}
async function openFile(id){
  var rec=FILES.filter(function(f){return f.id===id;})[0]; if(!rec) return;
  try{
    var b=await dbBlob(id); if(!b){toast(_t("This file is missing from storage."));return;}
    var url=URL.createObjectURL(b), w=null;
    try{w=window.open(url,'_blank');}catch(e){}
    if(!w){var a=document.createElement('a');a.href=url;a.download=rec.name;document.body.appendChild(a);a.click();a.remove();}
    setTimeout(function(){URL.revokeObjectURL(url);},120000);
  }catch(e){toast(_t("Could not open this file."));}
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
function chip(st){var t={lit:_t("Lights on"),fading:_t("Fading"),progress:_t("In progress"),ready:_t("Ready"),empty:_t("Waiting for files")}[st];return '<span class="chip s-'+st+'">'+t+'</span>';}

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
  if(!out.length){var st=[];for(var u=0;u<6;u++)st.push('empty');out.push({id:'ghost',code:_t("Your first module"),name:'',h:215,N:6,st:st,link:'',nocount:true});}
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
  if(I&&m.link) s+='<title>'+esc(m.code+' · '+m.name+': '+lit+_t(" of ")+N+_t(" lights on"))+'</title>';
  s+='<polygon class="shadow" points="'+pts([iso(x0+.2,y0+.2,0),iso(x1+.55,y0+.2,0),iso(x1+.55,y1+.55,0),iso(x0+.2,y1+.55,0)])+'"/>';
  s+=boxP(x0-.2,y0-.2,x1+.2,y1+.2,0,zb,['pl-l','pl-r','pl-t']);
  var fl='',wl='',wo='',wg='',T=[[.14,.4],[.6,.86]];
  for(var u=1;u<=N;u++){
    var z0=zb+(u-1)*fh,z1=zb+u*fh,st=m.st[u-1];
    fl+='<polygon class="fl fl-l fl-'+st+'" points="'+pts([iso(x0,y1,z0),iso(x1,y1,z0),iso(x1,y1,z1),iso(x0,y1,z1)])+'">'+(I&&!m.nocount&&(st==='lit'||st==='fading')?'<title>'+esc(m.code+_t(" · floor ")+u+' · '+guestName(m.k||m.code,u)+(st==='fading'?_t(" (leaving soon)"):_t(" lives here"))+(function(){var q=natInfo((m.k||m.id||m.code)+':'+u);return q&&q.until&&!(state.pin&&state.pin[(m.k||m.id||m.code)+':'+u])?' · '+fmtLeft(q.until-Date.now(),true)+_t(" left"):'';})())+'</title>':'')+'</polygon>'
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
/* ---- island, bridge and port: the city no longer floats in empty space ---- */
function islandLayer(C,R,P,ex,TH){
  var X1=C*P+ex,Y1=R*P+ex,cy=R*P/2,SEA=-TH+2,RIM=-3,rm=.75;
  var LB=4.2,XP0=X1+LB,XP1=XP0+3.4,py0=cy-1.9,py1=cy+1.9;
  var sx0=-1.7,sy0=-1.7,sx1=XP1+1.9,sy1=Math.max(Y1+1.3,cy+3.3);
  var bot=-TH-8,g='',f='';
  function poly(cl,a){return '<polygon class="'+cl+'" points="'+pts(a)+'"/>';}
  /* sea: a block with water-coloured sides and a few slow wave lines */
  g+=poly('sea-l',[iso(sx0,sy1,SEA),iso(sx1,sy1,SEA),iso(sx1,sy1,bot),iso(sx0,sy1,bot)])+poly('sea-r',[iso(sx1,sy1,SEA),iso(sx1,sy0,SEA),iso(sx1,sy0,bot),iso(sx1,sy1,bot)])+poly('sea-t',[iso(sx0,sy0,SEA),iso(sx1,sy0,SEA),iso(sx1,sy1,SEA),iso(sx0,sy1,SEA)]);
  for(var w=0;w<9;w++){
    var wx=sx0+.8+(hashStr('wx'+w)%1000)/1000*(sx1-sx0-2.4),wy=sy0+.8+(hashStr('wy'+w)%1000)/1000*(sy1-sy0-1.6);
    if(wx<X1+rm+.4&&wy<Y1+rm+.4&&wx>-rm-.4&&wy>-rm-.4)continue;
    if(wx>X1+rm&&wx<XP1+.3&&wy>py0-.3&&wy<cy+4.4)continue;
    g+='<polyline class="wave" style="animation-delay:-'+(w*.9).toFixed(1)+'s" points="'+pts([iso(wx,wy,SEA),iso(wx+.7,wy,SEA)])+'"/>';
  }
  /* island rim (sand), then the lawn slab sits on it */
  g+=poly('rim-l',[iso(-ex-rm,Y1+rm,RIM),iso(X1+rm,Y1+rm,RIM),iso(X1+rm,Y1+rm,SEA),iso(-ex-rm,Y1+rm,SEA)])+poly('rim-r',[iso(X1+rm,Y1+rm,RIM),iso(X1+rm,-ex-rm,RIM),iso(X1+rm,-ex-rm,SEA),iso(X1+rm,Y1+rm,SEA)])+poly('rim-t',[iso(-ex-rm,-ex-rm,RIM),iso(X1+rm,-ex-rm,RIM),iso(X1+rm,Y1+rm,RIM),iso(-ex-rm,Y1+rm,RIM)]);
  g+='<polyline class="foam" points="'+pts([iso(-ex-rm,Y1+rm,SEA),iso(X1+rm,Y1+rm,SEA),iso(X1+rm,-ex-rm,SEA)])+'"/>';
  /* bridge: two pylons, deck, back rail (front rail is added after the deck) */
  var by0=cy-.55,by1=cy+.55;
  [X1+1.2,X1+3.0].forEach(function(px){g+=boxP(px-.12,by0+.1,px+.12,by1-.1,SEA,-3,['br-l','br-r','br-t']);});
  g+=boxP(X1,by0,XP0,by1,-3,0,['bd-l','bd-r','bd-t']);
  g+='<polyline class="rail" points="'+pts([iso(X1,by0,6),iso(XP0,by0,6)])+'"/>';
  for(var k=0;k<=5;k++){var bx=X1+.15+k*(LB-.3)/5;g+='<polyline class="rail" points="'+pts([iso(bx,by0,0),iso(bx,by0,6)])+'"/>';}
  for(var k2=1;k2<8;k2++){var bk=X1+k2*LB/8;g+='<polyline class="plank" points="'+pts([iso(bk,by0,0),iso(bk,by1,0)])+'"/>';}
  g+='<polyline class="rail" points="'+pts([iso(X1,by1,6),iso(XP0,by1,6)])+'"/>';
  for(var k3=0;k3<=5;k3++){var bx3=X1+.15+k3*(LB-.3)/5;g+='<polyline class="rail" points="'+pts([iso(bx3,by1,0),iso(bx3,by1,6)])+'"/>';}
  /* port platform on stilts */
  [[XP0+.3,py0+.3],[XP1-.3,py0+.3],[XP0+.3,py1-.3],[XP1-.3,py1-.3]].forEach(function(s){g+=boxP(s[0]-.14,s[1]-.14,s[0]+.14,s[1]+.14,SEA,-3,['br-l','br-r','br-t']);});
  g+=boxP(XP0,py0,XP1,py1,-4,0,['pd-l','pd-r','pd-t']);
  g+='<polyline class="pmark" points="'+pts([iso(XP0+.25,py1-.3,0),iso(XP1-.25,py1-.3,0)])+'"/>';
  /* depth-sorted things standing on the port */
  var it=[];
  function add(x,y,html){it.push({d:x+y,html:html});}
  /* warehouse with a lit window */
  add(XP0+.9,py0+.9,boxP(XP0+.3,py0+.3,XP0+1.5,py0+1.5,0,16,['wh-l','wh-r','wh-t'])+'<polygon class="wh-w" points="'+pts([iso(XP0+.55,py0+1.5,5),iso(XP0+1.25,py0+1.5,5),iso(XP0+1.25,py0+1.5,10),iso(XP0+.55,py0+1.5,10)])+'"/>');
  /* containers, two stacks */
  var cts=[[XP1-1.45,py0+.35,0,'ct1'],[XP1-1.45,py0+.35,8,'ct2'],[XP1-.75,py0+.35,0,'ct3'],[XP0+1.8,py0+.35,0,'ct2'],[XP0+1.8,py0+.35,8,'ct1']];
  cts.forEach(function(c){add(c[0]+.3,c[1]+.4+c[2]/20,boxP(c[0],c[1],c[0]+.6,c[1]+.8,c[2],c[2]+8,[c[3]+'-l',c[3]+'-r',c[3]+'-t']));});
  /* ship moored on the long side, with a cabin and a deck container */
  var sx=XP0+.1,sxe=XP1+1.2,sy=py1+.25,sye=py1+1.65;
  var ship='<g class="ship">'+boxP(sx,sy,sxe,sye,-5,5,['hl-l','hl-r','hl-t'])+boxP(sx+.2,sy+.2,sx+1.1,sye-.2,5,13,['cb-l','cb-r','cb-t'])+'<polygon class="cb-w" points="'+pts([iso(sx+.3,sye-.2,8),iso(sx+1.0,sye-.2,8),iso(sx+1.0,sye-.2,11),iso(sx+.3,sye-.2,11)])+'"/>'+boxP(sx+1.6,sy+.3,sx+2.2,sye-.3,5,11,['ct3-l','ct3-r','ct3-t'])+boxP(sx+2.3,sy+.3,sx+2.9,sye-.3,5,11,['ct1-l','ct1-r','ct1-t'])+'</g>';
  add(sx+1.8,sye,ship);
  /* crane: tower on the pier edge, boom over the ship, cable and a box */
  var cx=XP0+2.3,cyy=py1-.45,top=44;
  var crane=boxP(cx-.1,cyy-.1,cx+.1,cyy+.1,0,top,['cr-l','cr-r','cr-t'])
   +'<polyline class="crb" points="'+pts([iso(cx,cyy-1.1,top),iso(cx,cyy+2.2,top)])+'"/>'
   +'<polyline class="crs" points="'+pts([iso(cx,cyy,top),iso(cx,cyy+.9,top-12),iso(cx,cyy+1.7,top)])+'"/>'
   +'<polyline class="crc" points="'+pts([iso(cx,cyy+1.55,top),iso(cx,cyy+1.55,top-23)])+'"/>'
   +boxP(cx-.25,cyy+1.35,cx+.25,cyy+1.75,top-31,top-23,['ct2-l','ct2-r','ct2-t'])
   +'<circle class="beacon" cx="'+iso(cx,cyy,top+2)[0].toFixed(1)+'" cy="'+iso(cx,cyy,top+2)[1].toFixed(1)+'" r="1.4"/>';
  add(cx,cyy+1.3,crane);
  /* a lamp at the foot of the bridge */
  add(XP0+.2,py1-.3,'<polyline class="lp" points="'+pts([iso(XP0+.2,py1-.3,0),iso(XP0+.2,py1-.3,15)])+'"/><circle class="lampg" cx="'+iso(XP0+.2,py1-.3,16)[0].toFixed(1)+'" cy="'+iso(XP0+.2,py1-.3,16)[1].toFixed(1)+'" r="2"/>');
  it.sort(function(a,b){return a.d-b.d;});
  it.forEach(function(o){f+=o.html;});
  return {back:g,front:f,
    left:iso(sx0,sy1,0)[0],right:iso(sx1,sy0,0)[0],bottom:iso(sx1,sy1,bot)[1],top:iso(sx0,sy0,SEA)[1]};
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
  var ISL=o.island===false?null:islandLayer(C,R,P,ex,TH);
  if(ISL){left=ISL.left;right=ISL.right;bottom=ISL.bottom;minY=Math.min(minY,ISL.top);}
  var vb=[left-pad,minY-pad,right-left+2*pad,bottom-minY+2*pad];
  ui.cityVB=vb;
  var T=I?ui.cityT:{x:0,y:0,k:1},g='';
  if(ISL)g+=ISL.back;
  g+='<polygon class="slab-l" points="'+pts([iso(X0,Y1,0),iso(X1,Y1,0),iso(X1,Y1,-TH),iso(X0,Y1,-TH)])+'"/><polygon class="slab-r" points="'+pts([iso(X1,Y1,0),iso(X1,Y0,0),iso(X1,Y0,-TH),iso(X1,Y1,-TH)])+'"/><polygon class="slab-t" points="'+pts([iso(X0,Y0,0),iso(X1,Y0,0),iso(X1,Y1,0),iso(X0,Y1,0)])+'"/>';
  for(var i=1;i<C;i++) g+='<polyline class="road" points="'+pts([iso(P*i,0,0),iso(P*i,R*P,0)])+'"/>';
  for(var j=1;j<R;j++) g+='<polyline class="road" points="'+pts([iso(0,P*j,0),iso(C*P,P*j,0)])+'"/>';
  for(var s2=0;s2<C*R;s2++){var qx=(s2%C)*P,qy=Math.floor(s2/C)*P;g+='<polygon class="lawn" points="'+pts([iso(qx+.3,qy+.3,0),iso(qx+P-.3,qy+.3,0),iso(qx+P-.3,qy+P-.3,0),iso(qx+.3,qy+P-.3,0)])+'"/>';}
  items.forEach(function(it){g+=it.html;});
  if(ISL)g+=ISL.front;
  if(SCENE==='snow'){for(var fk=0;fk<46;fk++){var fx=(hashStr('f'+fk)%1000)/1000*C*P,fy=(hashStr('g'+fk)%1000)/1000*R*P,fp=iso(fx,fy,(hashStr('h'+fk)%60)+4);g+='<circle class="flake" style="animation-delay:-'+((fk%9)*.7).toFixed(1)+'s" cx="'+fp[0].toFixed(1)+'" cy="'+fp[1].toFixed(1)+'" r="'+(1+(fk%3)*.5)+'"/>';}}
  var lit=0,tot=0;mods.forEach(function(m){tot+=m.N;m.st.forEach(function(s){if(isOn(s))lit++;});});
  return '<svg class="cityv sc-'+SCENE+(I&&T.k>=2.3?' zin':'')+'"'+(I?' id="citysvg"':'')+' viewBox="'+vb.map(function(v){return v.toFixed(1);}).join(' ')+'" preserveAspectRatio="xMidYMid meet" role="img" aria-label="'+_tf('Your semester as a city: {b} buildings, {l} of {t} floors have their lights on',{b:mods.length,l:lit,t:tot})+'"><defs><filter id="cglow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g id="cityg" transform="translate('+T.x.toFixed(1)+' '+T.y.toFixed(1)+') scale('+T.k.toFixed(3)+')">'+g+'</g></svg>';
}
function cityBox(mods,o){
  o=o||{};var I=!!o.interactive,lit=0,tot=0;
  mods.forEach(function(m){tot+=m.N;m.st.forEach(function(s){if(isOn(s))lit++;});});
  var cls='city'+(o.full?' full':'')+(o.build?' build':'')+(I?'':' static');
  var h='<section class="'+cls+'" aria-label="'+esc(o.label||_t("Your district"))+'"><div class="cityvp"'+(I?' data-pz="1"':'')+'>'+citySVG(mods,o)+'</div>';
  if(o.title) h+='<div class="cstat"><span>'+esc(o.title)+'</span><b>'+_tf('{l} of {t} floors lit',{l:lit,t:tot})+'</b><i class="cbar"><u style="width:'+(tot?Math.round(lit/tot*100):0)+'%"></u></i>'+(o.coins!==undefined?'<button class="ccoin" data-a="go" data-to="#/shop"><i class="cdot"></i>'+o.coins+_t(" coins")+(o.rent?' · +'+o.rent+_t("/day · next in ")+cdSpan((state.rentAt||Date.now())+864e5,true):'')+(_t(" · Shop")+"</button>"):'')+'</div>';
  if(I) h+=("<div class=\"cctl\"><button class=\"cbtn\" data-a=\"czoom\" data-d=\"1\" aria-label=\""+_t("Zoom in")+"\">＋</button><button class=\"cbtn\" data-a=\"czoom\" data-d=\"-1\" aria-label=\""+_t("Zoom out")+"\">−</button><button class=\"cbtn\" data-a=\"creset\" aria-label=\""+_t("Reset the view")+"\">⌖</button>")
    +(o.full?("<button class=\"cbtn\" data-a=\"cclose\" aria-label=\""+_t("Close the full screen view")+"\">✕</button>"):("<button class=\"cbtn\" data-a=\"cfull\" aria-label=\""+_t("Open the city full screen")+"\">⛶</button>"))+'</div>';
  if(o.legend!==false) h+=("<div class=\"clegend\"><span><i class=\"lg-lit\"></i>"+_t("Lights on")+"</span><span><i class=\"lg-progress\"></i>"+_t("In progress")+"</span><span><i class=\"lg-fading\"></i>"+_t("Fading")+"</span><span><i class=\"lg-ready\"></i>"+_t("Ready")+"</span><span><i class=\"lg-empty\"></i>"+_t("Waiting for files")+"</span></div>");
  if(I) h+=("<p class=\"chint\">"+_t("Tap a building to open it. Drag to look around.")+"</p>");
  return h+'</section>';
}
function setupCityHTML(){return cityBox(setupMods(),{interactive:false,legend:false,scene:'park',label:_t("Preview of your district")});}
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
var lastRendered=null, study=null, ui={tab:'units',q:'',preset:null,setup:null,dl:null,confirm:null,cityT:{x:0,y:0,k:1},cityFull:false,cityBuild:false,cityVB:null,readyOpen:false,failed:null,restore:null,bk:null,busyImport:false,ilias:{busy:false,items:[],status:'',scanned:false,filter:'todo',skipped:[]}};
var iliasBridge=false, iliasVersion='', iliasRequests={}, CONNECTOR_LATEST='0.4.0', CONNECTOR_MIN_SCAN='0.4.0';
function verNum(v){var p=String(v||'0').split('.');return (+p[0]||0)*1e6+(+p[1]||0)*1e3+(+p[2]||0);}
var READABLE_RX=/\.(pdf|docx|pptx|txt|md|csv|tex|html?|py|java|js|json|sql)$/i,UNREADABLE_RX=/\.(mp4|m4v|mov|mkv|avi|webm|wmv|mpe?g|mp3|m4a|aac|wav|ogg|flac|png|jpe?g|gif|bmp|svg|webp|tiff?|zip|rar|7z|tar|gz|doc|ppt|pps|xls|xlsx|xlsm|ods|odp|odt|exe|dmg|iso|jar|pkt)$/i;
function isMobileDevice(){try{return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)||(window.matchMedia&&matchMedia('(pointer:coarse)').matches&&Math.min(screen.width,screen.height)<900);}catch(e){return false;}}
window.addEventListener('message',function(event){
  if(event.source!==window||event.origin!==location.origin||!event.data||event.data.source!=='booklyn-ilias-extension')return;
  var data=event.data;
  if(data.type==='ready'){iliasBridge=true;iliasVersion=String(data.version||'').slice(0,20);if(route().name==='port')render();return;}
  var request=iliasRequests[data.requestId];if(!request)return;
  clearTimeout(request.timer);delete iliasRequests[data.requestId];request.resolve(data.response||{ok:false,message:_t("No response from ILIAS.")});
});
function iliasRequest(type,details){
  if(!iliasBridge)return Promise.resolve({ok:false,message:_t("Install the Booklyn ILIAS Connector, reload Booklyn, then try again.")});
  return new Promise(function(resolve){
    var id=uid(),timer=setTimeout(function(){delete iliasRequests[id];resolve({ok:false,message:_t("ILIAS took too long to respond. Open ILIAS in a tab, wait for it to load, then try again.")});},type==='fetch'?30000:90000);
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
function ckey(name){return String(name||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60);}
/* Which module an ILIAS course belongs to: a choice saved earlier, else a module code or keyword in the course name. */
function iliasCourseModule(courseName){
  var sem=curSem();if(!sem||!courseName||courseName==='ILIAS news')return null;
  var saved=state.iliasCourseMap[ckey(courseName)];
  if(saved){var sm=M(saved);if(sm&&sem.modules.indexOf(sm)>-1)return {m:sm,how:'saved'};}
  var sg=suggest(String(courseName),sem);
  return sg.mod?{m:M(sg.mod),how:'name'}:null;
}
function iliasHint(file){
  var r=iliasCourseModule(file.course);if(!r||!r.m)return null;
  var sg=suggest(String(file.name||'')+' '+String(file.context||''),{modules:[{id:r.m.id,code:r.m.code,kw:'',units:MAXU}]});
  var unit=sg.unit>=1&&sg.unit<=MAXU?sg.unit:0;
  if(unit>r.m.units)ensureUnits(r.m,unit);
  return {mod:r.m.id,unit:unit,why:_t("ILIAS course “")+String(file.course).slice(0,60)+'”'+(unit?_t(" · week ")+unit:_t(" · week not found, please check"))};
}
function iliasSuggest(file){
  var h=iliasHint(file);
  if(h){var m=M(h.mod);return m.code+(h.unit?_t(" · week ")+h.unit:_t(" · week not found"));}
  var sem=curSem();if(!sem)return '';
  var c={modules:sem.modules.map(function(m){return {id:m.id,code:m.code,kw:m.kw,units:MAXU};})};
  var sg=suggest(String(file.name||'')+' '+String(file.context||''),c),m2=sg.mod?M(sg.mod):null;
  return m2?m2.code+(sg.unit?_t(" · week ")+sg.unit:''):'';
}
function iliasMapHTML(){
  var sem=curSem();if(!sem)return '';
  var seen={},open=[];
  ui.ilias.items.forEach(function(f){var c=f.course;if(!c||c==='ILIAS news'||seen[c])return;seen[c]=1;if(!iliasCourseModule(c))open.push(c);});
  if(!open.length)return '';
  return ("<div class=\"notice\" role=\"region\" aria-label=\""+_t("Match ILIAS courses to modules")+"\"><strong>"+_t("Which module is this ILIAS course?")+"</strong><p class=\"foot\">"+_t("Booklyn could not tell from the course name. Choose once and it remembers. Until then it guesses from each file name.")+"</p>")
   +open.map(function(c){var k=ckey(c);return '<label class="f">'+esc(c)+'<select data-c="ilmap" data-k="'+esc(k)+("\"><option value=\"\">"+_t("Choose a module…")+"</option>")+sem.modules.map(function(x){return '<option value="'+esc(x.id)+'">'+esc(x.code+' · '+x.name)+'</option>';}).join('')+'</select></label>';}).join('')+'</div>';
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
  var x=/^(crs|fold|grp|cat)_(\d+)$/i.exec(t)||/\/(?:go|goto\.php)\/(crs|fold|grp|cat)\/(\d+)\/?$/i.exec(u.pathname)||/goto_[^_\/]+_(crs|fold|grp|cat)_(\d+)\.html$/i.exec(u.pathname);
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
function ilCollect(doc,pageUrl,files,found,ctx,courseName,dump){
  var anchors=doc.querySelectorAll('a[href]'),n=0;
  for(var i=0;i<anchors.length;i++){
    var a=anchors[i];if(a.closest(IL_CHROME))continue;
    var u=ilUrl(a.getAttribute('href'),pageUrl);if(!u)continue;n++;
    var name=(a.getAttribute('title')||a.getAttribute('aria-label')||a.textContent||'').replace(/\s+/g,' ').trim().slice(0,180);
    if(ilIsFile(u,name)){
      if(!name||/^(download|herunterladen|open|öffnen)$/i.test(name))continue;
      var key=ilFileKey(u,name);
      if(!files.has(key)){var ext=ilExt(name)||ilHint(a);files.set(key,{key:key,name:name,url:u.href,openUrl:u.href,context:ctx,course:courseName,ext:ext,kind:ilKind(ext)});}
    }else{var info=ilContainer(u);if(info)found.push({href:u.href,name:name,info:info});else if(dump&&name&&dump.length<70)dump.push(ilShort(u.href)+' "'+name.slice(0,40)+'"');}
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
  function progress(){ui.ilias.status=_t("Checking ILIAS… ")+pages+_t(" pages · ")+files.size+_t(" files found so far");if(route().name==='port')render();}
  async function getPage(href){
    var r=await iliasRequest('fetch',{url:href});
    if(r&&r.login)login=true;
    if(r&&!r.ok&&r.code&&!blocked)blocked=r;
    if(!r||!r.ok||typeof r.html!=='string')return null;
    return {url:String(r.url||href),doc:new DOMParser().parseFromString(r.html,'text/html')};
  }
  function addCourse(f){
    var info=f.info;
    if(info.type==='news'){if(byKey.news)return;byKey.news=1;courses.push({key:'news',name:_t("ILIAS news"),queue:[{url:f.href,depth:IL_LIM.depth},
  {q:'What is a persona used for?',o:['To describe a typical user and keep design decisions focused on them','To list the technical requirements','To track the project budget'],a:0,e:'A persona makes the target user concrete so the team designs for real needs.'},
  {q:'A test participant struggles with your prototype. What should the moderator do first?',o:['Explain quickly how it works','Stay quiet and observe','End the session'],a:1,e:'The struggle is the data. Observe and take notes before helping.'}],taken:0,limit:3,pages:0,news:true});return;}
    if(info.type==='cat')return;
    var key=info.type+'_'+info.id,alt='ref_'+info.id;
    if(byKey[key]||byKey[alt]||courses.length>=IL_LIM.courses)return;
    byKey[key]=byKey[alt]=1;
    courses.push({key:key,name:f.name||key,queue:[{url:f.href,depth:0}],taken:0,limit:IL_LIM.perCourse,pages:0});
  }
  async function seeds(list){
    var got=await Promise.all(list.map(async function(h){var u=ilUrl(h);if(!u||visited[u.href])return null;visited[u.href]=1;var p=await getPage(u.href);return p?{h:u.href,p:p}:null;}));
    got.forEach(function(g){
      if(!g)return;pages++;var found=[],dump=[],n=ilCollect(g.p.doc,g.p.url,files,found,ilTitle(g.p.doc)||'ILIAS','',dump);
      note('SEED '+ilShort(g.h)+' -> '+ilShort(g.p.url)+' | "'+ilTitle(g.p.doc)+'" | links:'+n+' | containers: '+(found.filter(function(f){return f.info.type!=='news';}).slice(0,40).map(function(f){return f.info.type+'_'+f.info.id+' "'+f.name.slice(0,40)+'"';}).join(', ')||'none')+(found.some(function(f){return f.info.type==='news';})?' (+news links)':'')+'\n    other links: '+(dump.join(' ; ')||'none'));
      found.forEach(addCourse);
    });
    progress();
  }
  await seeds(IL_SEEDS);
  if(blocked&&!pages)return {ok:false,message:blocked.message||_t("Could not reach ILIAS.")};
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
  if(login&&!pages)return {ok:false,code:'login',message:_t("Sign in to ILIAS, then scan again.")};
  var all=Array.from(files.values());
  var keep=all.filter(function(f){return f.kind!=='skip';}).slice(0,500);
  var skipped=all.filter(function(f){return f.kind==='skip';}).slice(0,300).map(function(f){return {key:f.key,name:f.name,ext:f.ext,openUrl:f.openUrl,context:f.context};});
  var summary=courses.filter(function(c){return !c.news;}).map(function(c){return {name:c.name,pages:c.pages,
    files:all.filter(function(f){return f.course===c.name&&f.kind!=='skip';}).length,skipped:all.filter(function(f){return f.course===c.name&&f.kind==='skip';}).length,more:c.queue.length>0&&c.taken>=c.limit};});
  return {ok:true,files:keep,skipped:skipped,pages:pages,courses:summary,report:report.join('\n').slice(0,40000),limited:timeUp||pages>=IL_LIM.pages||summary.some(function(c){return c.more;})};
}
async function scanIlias(){
  if(iliasBridge&&verNum(iliasVersion)<verNum(CONNECTOR_MIN_SCAN)){ui.ilias.status=_t("Booklyn needs connector v")+CONNECTOR_MIN_SCAN+_t(" or newer (yours is v")+(iliasVersion||'?')+_t("). Download it again from the Connector page, extract it over your old connector folder, then press the reload arrow on edge://extensions. After this version, scan improvements arrive with Booklyn itself, so you will rarely need to do it again.");render();return;}
  ui.ilias.busy=true;ui.ilias.status=_t("Checking ILIAS…");render();
  var result=await iliasCrawl();
  ui.ilias.busy=false;ui.ilias.scanned=true;
  if(!result.ok){ui.ilias.status=result.message||_t("Could not check ILIAS.");render();return;}
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
  ui.ilias.status=ui.ilias.items.length+_t(" readable files found on ILIAS · ")+c.todo+_t(" to add · ")+c.in+_t(" already in Booklyn · ")+c.dis+_t(" dismissed")+(ui.ilias.skipped.length?' · '+ui.ilias.skipped.length+_t(" skipped (video, audio, images, zips, old Office formats)"):'')+'.';
  if(!ui.ilias.items.length)ui.ilias.status=_t("No readable files found on the scanned ILIAS pages")+(ui.ilias.skipped.length?' ('+ui.ilias.skipped.length+_t(" unreadable files were skipped)."):'.');
  if(result.limited)ui.ilias.status+=_t(" The scan stopped early (page or time limit), so some files may be missing.");
  ui.ilias.filter=c.todo?'todo':(c.in?'in':'all');
  render();
}
async function importIlias(key,batch){
  var file=ui.ilias.items.filter(function(item){return item.key===key;})[0];if(!file)return 'fail';
  if(!batch){ui.ilias.busy=true;ui.ilias.status=_t("Downloading ")+file.name+'…';render();}
  var result=await iliasRequest('download',{url:file.url,name:file.name}),out='fail';
  if(!result.ok){if(result.skipped){out='skip';state.iliasDismissed[key]=Date.now();save();}if(!batch)ui.ilias.status=result.message||_t("Could not download this file.");}
  else{
    try{
      var binary=atob(result.base64),bytes=new Uint8Array(binary.length);
      for(var i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
      var added=await addFiles([new File([bytes],result.name||file.name,{type:result.mime||'application/octet-stream'})],null,true,iliasHint(file));
      if(added&&(added.added||added.dups)){
        state.iliasImported[key]=Date.now();if(added.hashes&&added.hashes[0])state.iliasHash[key]=added.hashes[0];
        delete state.iliasDismissed[key];save();out=added.added?'added':'dup';
      }
      if(!batch)ui.ilias.status=out==='added'?_t("File added to the Port for review."):out==='dup'?_t("This content is already in Booklyn, so nothing was duplicated."):(added&&added.failed?_t("Could not save the file on this device. It stays on ILIAS, and you can retry it from the Port."):_t("Could not add the file."));
    }catch(error){if(!batch)ui.ilias.status=_t("Could not read the downloaded file.");}
  }
  if(!batch){ui.ilias.busy=false;render();}
  return out;
}
async function importAllIlias(){
  var todo=ui.ilias.items.filter(function(f){return iliasCls(f)==='todo';});if(!todo.length)return;
  ui.ilias.busy=true;var n={added:0,dup:0,fail:0,skip:0};
  for(var i=0;i<todo.length;i++){
    ui.ilias.status=_t("Adding ")+(i+1)+_t(" of ")+todo.length+': '+todo[i].name;render();
    var r=await importIlias(todo[i].key,true);n[r]++;
  }
  ui.ilias.busy=false;
  ui.ilias.status=n.added+_t(" added to the Port")+(n.dup?' · '+n.dup+_t(" were identical to files you already have"):'')+(n.skip?' · '+n.skip+_t(" skipped because Booklyn cannot read them"):'')+(n.fail?' · '+n.fail+_t(" could not be downloaded (for example over 12 MB)"):'')+'.';
  go('#/port');
}
function iliasCoursesHTML(){
  var cs=ui.ilias.courses||[],rb=ui.ilias.report?("<button class=\"btn ghost small\" data-a=\"ilreport\">"+_t("Copy scan report")+"</button>"):'';
  if(!cs.length)return ui.ilias.scanned?("<div class=\"row\"><span class=\"foot\">"+_t("No courses were found on your ILIAS dashboard.")+"</span>")+rb+'</div>':'';
  return '<details class="foot"><summary>'+cs.length+(_t(" courses scanned")+"</summary><div class=\"row\">")+rb+'</div><ul class="list">'+cs.map(function(x){
    return '<li class="item"><div class="grow"><div class="t">'+esc(x.name||_t("Course"))+'</div><div class="s">'+x.files+_pl(x.files,' readable file',' readable files')+(x.skipped?' · '+x.skipped+_t(" skipped"):'')+' · '+x.pages+_pl(x.pages,' page checked',' pages checked')+(x.more?_t(" · more pages not checked"):'')+(!x.files&&!x.skipped?_t(" · nothing found here (the content may be in a learning module, wiki or video page)"):'')+'</div></div></li>';
  }).join('')+'</ul></details>';
}
function iliasListHTML(){
  var c=iliasCounts(),f=ui.ilias.filter||'todo',LAB={todo:_t("To add"),in:_t("Already in Booklyn"),dis:_t("Dismissed"),skip:_t("Not readable"),all:_t("All readable")},CNT={todo:c.todo,in:c.in,dis:c.dis,skip:(ui.ilias.skipped||[]).length,all:ui.ilias.items.length};
  var h=iliasCoursesHTML()+iliasMapHTML()+("<div class=\"row tight\" role=\"group\" aria-label=\""+_t("Filter ILIAS files")+"\">")+['todo','in','dis','skip','all'].map(function(k){return '<button class="chip fchip" data-a="ilfilter" data-f="'+k+'" aria-pressed="'+(f===k)+'">'+LAB[k]+' · '+CNT[k]+'</button>';}).join('')+'</div>';
  if(c.todo)h+='<div class="row"><button class="btn small" data-a="iliasall" '+(ui.ilias.busy?'disabled':'')+(">"+_t("Add all "))+c.todo+(_t(" to the Port")+"</button><span class=\"foot\">"+_t("Dismiss what you do not need first.")+"</span></div>");
  if(f==='skip'){
    var sk=ui.ilias.skipped||[];
    if(!sk.length)return h+("<p class=\"foot\">"+_t("Nothing was skipped.")+"</p>");
    return h+("<p class=\"foot\">"+_t("Booklyn cannot make questions from videos, audio, images, zips, spreadsheets or old Office files, so these are not offered for import.")+"</p><ul class=\"list\">")+sk.slice(0,150).map(function(file){return '<li class="item"><div class="grow"><div class="t">'+esc(file.name)+(file.ext?' <span class="chip">.'+esc(file.ext)+'</span>':'')+'</div><div class="s">'+esc(file.context||'ILIAS')+'</div></div><div class="row tight"><a class="btn ghost small" href="'+esc(safeUrl(file.openUrl||file.url))+("\" target=\"_blank\" rel=\"noopener noreferrer\">"+_t("Open ↗")+"</a></div></li>");}).join('')+'</ul>';
  }
  var rows=ui.ilias.items.filter(function(x){return f==='all'||iliasCls(x)===f;});
  if(!rows.length)return h+("<p class=\"foot\">"+_t("Nothing in this list.")+"</p>");
  h+='<ul class="list">'+rows.slice(0,150).map(function(file){
    var k=iliasCls(file),sg=iliasSuggest(file);
    return '<li class="item"><div class="grow"><div class="t">'+esc(file.name)+(file.isNew?(" <span class=\"chip\">"+_t("New")+"</span>"):'')+(k==='in'?(" <span class=\"chip s-lit\">"+_t("In Booklyn")+"</span>"):k==='dis'?(" <span class=\"chip\">"+_t("Dismissed")+"</span>"):'')+'</div><div class="s">'+esc(file.context||'ILIAS')+(sg&&k!=='in'?_t(" · looks like ")+esc(sg):'')+'</div></div><div class="row tight">'
      +(k==='todo'?'<button class="btn small" data-a="iliasimport" data-key="'+esc(file.key)+'" '+(ui.ilias.busy?'disabled':'')+(">"+_t("Add to Port")+"</button><button class=\"btn ghost small\" data-a=\"ildismiss\" data-key=\"")+esc(file.key)+("\">"+_t("Dismiss")+"</button>"):'')
      +(k==='dis'?'<button class="btn ghost small" data-a="ilrestore" data-key="'+esc(file.key)+("\">"+_t("Restore")+"</button>"):'')
      +'<a class="btn ghost small" href="'+esc(safeUrl(file.openUrl||file.url))+("\" target=\"_blank\" rel=\"noopener noreferrer\">"+_t("Open ↗")+"</a></div></li>");}).join('')+'</ul>'+(rows.length>150?("<p class=\"foot\">"+_t("Showing the first 150 of "))+rows.length+(_t(". Dismiss or add some to see the rest.")+"</p>"):'');
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
function langSel(){return '<label class="f langf">'+_t('Language')+'<select id="langsel" data-c="lang">'+LANGS.map(function(l){return '<option value="'+l[0]+'"'+(getLang()===l[0]?' selected':'')+'>'+l[1]+'</option>';}).join('')+'</select></label>';}
function foot(){return langSel()+("<p class=\"disclaimer\">"+_t("Unofficial student project, not affiliated with HSLU. Your files stay on this device. Your progress stays here too unless you turn on sync. No ads, no tracking. ")+"<a href=\"/privacy/\">"+_t("Privacy")+"</a> · <a href=\"/terms/\">"+_t("Terms")+"</a> · <a href=\"/imprint/\">"+_t("Imprint")+"</a> · <a href=\"/\">"+_t("About Booklyn")+"</a></p>");}

function vWelcome(){
  return ("<section class=\"hero\"><p class=\"eyebrow\">"+_t("Welcome")+"</p><h1 tabindex=\"-1\" id=\"h1\">Booklyn</h1><p class=\"motto\">"+_t("Keep your lights on.")+"</p>")
   +cityBox(sampleMods(),{interactive:false,build:true,scene:'park',label:_t("A sample district")})+("<p class=\"foot\">"+_t("A sample district. Yours builds itself as you add your modules.")+"</p>")
   +("<p class=\"lede\">"+_t("A study app for students that turns each week’s course material into a city you light up as you learn, so you always know what to study next.")+"</p>")
   +("<div class=\"row\"><button class=\"btn\" data-a=\"newsem\">"+_t("Build my first semester")+"</button><button class=\"btn ghost\" data-a=\"demo\">"+_t("Try the demo")+"</button></div></section>")
   +("<section class=\"card stack\"><h3>"+_t("How it works")+"</h3><p class=\"lede\">"+_t("Your degree is a city. A semester is a district, a module is a building and each teaching unit is a floor. Add your files, study a unit, pass the short check, and the light goes on.")+"</p></section>")+foot();
}

function vCampus(){
  var sem=curSem(); if(!sem) return vWelcome();
  var n=nextUp(sem),p=pending().length,t=totals(sem),pct=t.t?Math.round(t.l/t.t*100):0;
  var ups=semDeadlines(sem).filter(function(d){return !state.tasksDone[d.id]&&daysTo(d)>=0;}).sort(function(a,b){return pdate(a.date)-pdate(b.date);}).slice(0,3);
  var h=(SYNC.conflict?("<div class=\"notice warn stack\"><p style=\"margin:0\"><strong>"+_t("Your cloud copy and this device differ.")+"</strong>"+_t(" Open Settings to choose which one to keep.")+"</p><div class=\"row\"><button class=\"btn small\" data-a=\"go\" data-to=\"#/settings\">"+_t("Open Settings")+"</button></div></div>"):'')+(backupDue()?("<div class=\"notice stack\"><p style=\"margin:0\"><strong>"+_t("Protect your work.")+"</strong> ")+(state.lastBackup?_t("Your last backup is more than a week old."):_t("You have no backup yet."))+(_t(" If you clear this browser’s data, your semesters and progress are gone.")+"</p><div class=\"row\"><button class=\"btn small\" data-a=\"dlbackup\">"+_t("Download backup")+"</button><button class=\"btn small ghost\" data-a=\"snoozebk\">"+_t("Remind me in 3 days")+"</button></div></div>"):'')+("<header class=\"stack\"><div class=\"sem\"><p class=\"eyebrow\">"+_t("Week "))+weekNo(sem)+' · '+fmt(new Date())+'</p></div>'
   +("<div class=\"sem\"><label class=\"sr\" for=\"semsel\">"+_t("Semester")+"</label><select id=\"semsel\" data-c=\"sem\">")+state.sems.map(function(s){return '<option value="'+s.id+'"'+(s.id===sem.id?' selected':'')+'>'+esc(s.name)+(s.finished?_t(" (finished)"):'')+'</option>';}).join('')+("<option value=\"__new\">"+_t("＋ New semester…")+"</option></select></div>")
   +'<h1 tabindex="-1" id="h1">'+(state.name?_t("Hello, ")+esc(state.name):_t("Keep your lights on"))+'</h1>'
   +("<p class=\"lede\">"+_t("Tap a building to open its weeks, or pick a module below.")+"</p></header>");
  var bld=ui.cityBuild;if(bld)setTimeout(function(){ui.cityBuild=false;},4500);
  h+=cityBox(cityMods(sem),{interactive:true,build:bld,full:ui.cityFull,title:sem.name,coins:state.coins,rent:rentPerDay()});
  if(n) h+=("<section class=\"card accent stack\"><p class=\"eyebrow\">"+_t("Next up")+"</p><h2>")+esc(n.m.code)+' · '+esc(n.m.titles[n.u-1])+'</h2><p class="lede">'+esc(n.why)+'</p><div class="row"><button class="btn light" data-a="go" data-to="#/m/'+n.m.id+'/'+n.u+("/study\">"+_t("Start block")+"</button><button class=\"btn ghost\" data-a=\"go\" data-to=\"#/m/")+n.m.id+'/'+n.u+("\">"+_t("Open unit")+"</button></div></section>");
  else if(!pending().length&&!FILES.some(function(f){return f.sem===sem.id;})&&!sem.demo) h+=("<section class=\"card stack\"><h3>"+_t("Add your first files")+"</h3><p class=\"lede\">"+_t("Drop your slides and scripts into the Port. Booklyn suggests where each one belongs.")+"</p><div class=\"row\"><button class=\"btn\" data-a=\"go\" data-to=\"#/port\">"+_t("Open the Port")+"</button></div></section>");
  if(p) h+='<section class="card row between"><div><h3>'+p+_pl(p,' file waiting in the Port',' files waiting in the Port')+("</h3><p class=\"lede\">"+_t("Review where they belong, then import.")+"</p></div><button class=\"btn\" data-a=\"go\" data-to=\"#/port\">"+_t("Review")+"</button></section>");
  if(ups.length) h+=("<section class=\"stack\"><div class=\"row between\"><h2>"+_t("Coming up")+"</h2><button class=\"link\" data-a=\"go\" data-to=\"#/deadlines\">"+_t("All deadlines")+"</button></div><ul class=\"list\">")
   +ups.map(function(d){var m=d.mod?M(d.mod):null;return '<li><div class="item"><span class="floor" style="--h:'+(m?m.h:0)+'">'+(m?esc(m.code.slice(0,2)):'•')+'</span><div class="grow"><div class="t">'+esc(d.title)+'</div><div class="s">'+(m?esc(m.code)+' · ':'')+fmt(d.date)+'</div></div><span class="chip">'+rel(d)+'</span></div></li>';}).join('')+'</ul></section>';
  h+=("<section class=\"stack\"><h2>"+_t("Modules")+"</h2><div class=\"grid2\">")
   +sem.modules.map(function(m){var c=litCount(m);return '<button class="item modcard" data-a="go" data-to="#/m/'+m.id+'"><div class="mini" style="width:100%"><span class="floor" style="--h:'+m.h+'">'+c+'</span><div class="grow"><div class="t">'+esc(m.name)+'</div><div class="s">'+esc(m.code)+' · '+c+_t(" of ")+m.units+(_t(" lights on")+"</div></div></div><div class=\"bar\" style=\"width:100%\"><i style=\"width:")+Math.round(c/m.units*100)+'%"></i></div></button>';}).join('')+'</div></section>'+foot();
  return h;
}

function pendingRow(f){
  var sem=curSem(),m=f.mod?M(f.mod):null,N=m?m.units:14,held=f.flag&&!f.confirmed;
  return '<li><div class="pfile'+(held?' flag':'')+(f.include?'':' off')+'" data-f="'+f.id+'"><div class="top"><input type="checkbox" data-c="inc" '+(f.include?'checked':'')+(" aria-label=\""+_t("Include "))+esc(f.name)+'"><div class="grow" style="min-width:0"><div class="t" style="font-weight:600;overflow-wrap:anywhere">'+esc(f.path||f.name)+'</div><div class="s" style="font-size:.85rem;color:var(--muted)">'+size(f.size)+' · '+esc(f.why||'')+'</div></div>'
   +(f.dup?("<span class=\"chip warn\">"+_t("Duplicate")+"</span>"):(held?("<span class=\"chip warn\">"+_t("Check this")+"</span>"):''))+'</div>'
   +'<div class="sel"><label class="sr" for="m-'+f.id+("\">"+_t("Module for "))+esc(f.name)+'</label><select id="m-'+f.id+("\" data-c=\"mod\"><option value=\"\">"+_t("Choose a module…")+"</option>")
   +sem.modules.map(function(x){return '<option value="'+x.id+'"'+(x.id===f.mod?' selected':'')+'>'+esc(x.code)+' · '+esc(x.name)+'</option>';}).join('')+'</select>'
   +'<label class="sr" for="u-'+f.id+("\">"+_t("Unit for "))+esc(f.name)+'</label><select id="u-'+f.id+'" data-c="unit">'
   +Array.apply(null,{length:N}).map(function(_,i){return '<option value="'+(i+1)+'"'+(i+1===f.unit?' selected':'')+(">"+_t("Week "))+(i+1)+'</option>';}).join('')+'</select></div>'
   +(held&&!f.dup&&f.mod?'<div><button class="btn small ghost" data-a="confirm" data-id="'+f.id+("\">"+_t("Looks right")+"</button></div>"):'')
   +(held&&!f.dup&&!f.mod?("<p class=\"foot\">"+_t("Choose a module to continue.")+"</p>"):'')+'</div></li>';
}
function eligible(f){return f.include&&f.mod&&f.unit&&(!f.flag||f.confirmed);}
function isDupRow(f){return !!f.dup&&f.status==='pending'&&FILES.some(function(x){return x.id===f.dup;});}
function vPort(){
  var sem=curSem(); if(!sem) return vWelcome();
  var list=pending();
  var h=("<header class=\"stack\"><p class=\"eyebrow\">"+_t("Learning Port")+"</p><h1 tabindex=\"-1\" id=\"h1\">"+_t("Add and sort files")+"</h1><p class=\"lede\">"+_t("Any file type and any size. Booklyn suggests a module and week from the file name. You decide. Files marked “Check this” stay here until you confirm them.")+"</p></header>");
  h+=("<section class=\"drop\" data-drop><h2>"+_t("Drop files here")+"</h2><p class=\"lede\">"+_t("or choose them from your computer or phone")+"</p><div class=\"row\" style=\"justify-content:center\"><button class=\"btn\" data-a=\"pickfiles\">"+_t("Choose files")+"</button><button class=\"btn ghost\" data-a=\"pickfolder\">"+_t("Choose a folder")+"</button></div></section>");
  if(ui.failed&&ui.failed.items.length){
    var fl=ui.failed.items;
    h+='<section class="card stack" role="alert"><h3>'+fl.length+_pl(fl.length,' file could not be saved',' files could not be saved')+'</h3><ul class="list">'
      +fl.slice(0,8).map(function(x){return '<li class="foot"><strong>'+esc(x.name)+'</strong> · '+esc(x.reason)+'</li>';}).join('')+(fl.length>8?("<li class=\"foot\">"+_t("and "))+(fl.length-8)+(_t(" more.")+"</li>"):'')+'</ul>'
      +("<p class=\"lede\">"+_t("Nothing was added twice, and files that did save are already in the list. Free some space or try again: only these files are retried.")+"</p>")
      +("<div class=\"row\"><button class=\"btn small\" data-a=\"retryfailed\">"+_t("Try these again")+"</button><button class=\"btn small ghost\" data-a=\"dismissfailed\">"+_t("Dismiss")+"</button></div></section>");
  }
  var lastChk=state.iliasLast?new Date(state.iliasLast).toLocaleString(LOC(),{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'';
  if(!isMobileDevice()||iliasBridge)h+=("<section class=\"card stack\"><div class=\"row\" style=\"justify-content:space-between\"><div><p class=\"eyebrow\">"+_t("HSLU ILIAS")+"</p><h2>"+_t("Find new files")+"</h2></div><a class=\"btn ghost small\" href=\"https://elearning.hslu.ch/ilias/ilias.php?baseClass=ildashboardgui&amp;cmd=show\" target=\"_blank\" rel=\"noopener noreferrer\">"+_t("Open ILIAS ↗")+"</a></div>")
    +("<p class=\"lede\">"+_t("Booklyn looks for file links on your ILIAS dashboard and linked courses and lists the ones it can read: PDF, Word (.docx), PowerPoint (.pptx) and text files. Videos, audio, images and zips are skipped. Files you already have are recognised by their content, so nothing is added twice. Nothing is downloaded until you press “Add to Port”. Sign in to ILIAS in this browser first.")+"</p>")
    +'<div class="row"><button class="btn small" data-a="scanilias" '+(ui.ilias.busy?'disabled':'')+(">"+_t("Check ILIAS again")+"</button><span class=\"foot\">")+(iliasBridge?_t("Connector ready")+(iliasVersion?' (v'+esc(iliasVersion)+')':'')+(verNum(iliasVersion)<verNum(CONNECTOR_LATEST)?(" · <a href=\"/connector/#changelog\" target=\"_blank\" rel=\"noopener\">"+_t("Update available (v"))+CONNECTOR_LATEST+')</a>':''):_t("Needs the Booklyn ILIAS Connector browser extension"))+'</span></div>'
    +'<p class="foot">'+(lastChk?_t("Last checked: ")+lastChk+'.':_t("Not checked yet."))+'</p>'
    +(!iliasBridge?("<p class=\"foot\">"+_t("Install the connector once on a computer with Edge or Chrome: ")+"<a href=\"/connector/\" target=\"_blank\" rel=\"noopener\">"+_t("download and install steps")+"</a>"+_t(". Then reload Booklyn. It does not work on phones; add files by hand there.")+"</p>"):'')
    +(ui.ilias.status?'<p class="foot" role="status">'+esc(ui.ilias.status)+'</p>':'')
    +(ui.ilias.items.length?iliasListHTML():iliasCoursesHTML())+'</section>';
  if(state.lastImport.length&&!list.length){
    var by={};state.lastImport.forEach(function(id){var f=FILES.filter(function(x){return x.id===id;})[0];if(f&&f.status==='imported'){by[f.mod]=(by[f.mod]||0)+1;}});
    h+=("<section class=\"card stack\"><h3>"+_t("Imported")+"</h3><div class=\"row tight\">")+Object.keys(by).map(function(k){var m=M(k);return m?'<button class="chip" data-a="go" data-to="#/m/'+m.id+'" style="border:0;cursor:pointer">'+esc(m.code)+' · '+by[k]+'</button>':'';}).join('')+("</div><div class=\"row\"><button class=\"btn ghost small\" data-a=\"undo\">"+_t("Undo this import")+"</button></div></section>");
  }
  if(!list.length){
    h+=("<section class=\"card stack\"><h3>"+_t("Nothing waiting")+"</h3><p class=\"lede\">"+_t("Add files above. Want to try it first?")+"</p><div class=\"row\"><button class=\"btn ghost small\" data-a=\"samples\">"+_t("Add 6 sample files")+"</button></div></section>");
    return h;
  }
  var dupN=list.filter(isDupRow).length;
  if(dupN)h+='<section class="card stack"><h3>'+dupN+_pl(dupN,' duplicate waiting',' duplicates waiting')+("</h3><p class=\"lede\">"+_t("These files have exactly the same content as a file Booklyn already has. Removing them here only clears the extra copy from the Port.")+"</p><div class=\"row\"><button class=\"btn small\" data-a=\"rmdups\">"+_t("Remove "))+dupN+_pl(dupN,' duplicate',' duplicates')+'</button></div></section>';
  var ready=list.filter(eligible),check=list.filter(function(f){return !eligible(f);}),ok=ready.length, held=list.filter(function(f){return f.include&&!eligible(f);}).length;
  if(check.length)h+='<ul class="list">'+check.map(pendingRow).join('')+'</ul>';
  if(ready.length){
    h+='<section class="card stack"><div class="row between"><div><h3>'+ready.length+_pl(ready.length,' ready file',' ready files')+("</h3><div class=\"foot\">"+_t("Booklyn is sure where these belong. Looking through them is optional: you can import straight away.")+"</div></div><button class=\"btn ghost small\" data-a=\"togready\" aria-expanded=\"")+(!!ui.readyOpen)+'">'+(ui.readyOpen?_t("Hide the list"):_t("Review the list"))+'</button></div>';
    if(ui.readyOpen){
      var gs={};ready.forEach(function(f){(gs[f.mod]=gs[f.mod]||[]).push(f);});
      h+=Object.keys(gs).sort(function(a,b){var ma=M(a),mb=M(b);return String(ma&&ma.code).localeCompare(String(mb&&mb.code));}).map(function(k){
        var mm=M(k),rows=gs[k].slice().sort(function(a,b){return (a.unit-b.unit)||String(a.name).localeCompare(String(b.name));});
        return '<div class="stack"><h4>'+esc(mm?mm.code+' · '+mm.name:_t("No module"))+' <span class="foot">'+rows.length+_pl(rows.length,' file',' files')+'</span></h4><ul class="list">'+rows.map(pendingRow).join('')+'</ul></div>';
      }).join('');
    }
    h+='</section>';
  }
  h+='<div class="actionbar"><div><strong>'+ok+(_t(" ready to import")+"</strong><div class=\"foot\">")+(held?held+_t(" need a check first."):_t("Nothing is held back."))+'</div></div><button class="btn" data-a="import" '+(ok&&!ui.busyImport?'':'disabled')+'>'+(ui.busyImport?_t("Importing…"):_t("Import ")+ok+_pl(ok,' file',' files'))+'</button></div>';
  return h;
}

function vModule(r){
  var m=r.m,c=litCount(m);
  var h=("<button class=\"back\" data-a=\"go\" data-to=\"#/\">"+_t("← Campus")+"</button><header class=\"row\" style=\"gap:18px;align-items:flex-end\"><div style=\"width:72px;flex:none\">")+building(m)+'</div><div class="stack" style="gap:6px"><p class="eyebrow">'+esc(m.code)+'</p><h1 tabindex="-1" id="h1">'+esc(m.name)+'</h1><p class="lede">'+c+_t(" of ")+m.units+(_t(" lights on")+"</p></div></header>")
   +'<div class="tabs" role="tablist"><button role="tab" aria-selected="'+(ui.tab==='units')+("\" data-a=\"tab\" data-v=\"units\">"+_t("Units")+"</button><button role=\"tab\" aria-selected=\"")+(ui.tab==='files')+("\" data-a=\"tab\" data-v=\"files\">"+_t("All files")+"</button></div>");
  if(ui.tab==='units'){
    h+='<ul class="list">';
    for(var u=1;u<=m.units;u++){
      var st=uStatus(m,u),n=mats(m,u).length;
      h+='<li><button class="item '+st+'" data-a="go" data-to="#/m/'+m.id+'/'+u+'"><span class="floor" style="--h:'+m.h+'">'+u+'</span><div class="grow"><div class="t">'+esc(m.titles[u-1])+'</div><div class="s">'+(n?n+_pl(n,' file',' files'):_t("No files yet"))+(st==='lit'||st==='fading'?' · '+esc(guestName(m.id,u))+(st==='fading'?_t(" is packing"):_t(" lives here")):'')+(function(){var q=litInfo(m.id+':'+u);return q&&q.pinned?_t(" · pinned"):q&&q.until?' · '+cdSpan(q.until,true)+_t(" left"):'';})()+'</div></div>'+chip(st)+'</button></li>';
    }
    h+='</ul><div class="row" style="margin-top:12px"><button class="btn ghost small" data-a="addfloor" data-m="'+m.id+("\">"+_t("＋ Add a floor")+"</button>")+(m.units>1&&!mats(m,m.units).length&&!state.lit[m.id+':'+m.units]?'<button class="btn ghost small" data-a="rmfloor" data-m="'+m.id+("\">"+_t("Remove last floor (Week "))+m.units+')</button>':'')+'</div>';
  } else {
    h+=("<label class=\"f\">"+_t("Search files")+"<input type=\"search\" id=\"q\" value=\"")+esc(ui.q)+("\" placeholder=\""+_t("Name or type")+"\"></label><div id=\"matlist\">")+fileList(m)+'</div>';
  }
  return h;
}
function fileList(m){
  var q=ui.q.trim().toLowerCase(),out='';
  for(var u=1;u<=m.units;u++){
    var ms=mats(m,u).filter(function(x){return !q||(x.name+' '+x.type).toLowerCase().indexOf(q)>-1;});
    if(!ms.length) continue;
    out+=("<h3 style=\"margin:14px 0 8px\">"+_t("Week "))+u+' · '+esc(m.titles[u-1])+'</h3><div class="stack">'+ms.map(function(x){return matRow(m,u,x);}).join('')+'</div>';
  }
  return out||("<p class=\"lede\" style=\"margin-top:12px\">"+_t("No files yet.")+"</p>");
}
function matRow(m,u,x){
  var acts='';
  if(x.blob){
    acts='<div class="acts"><button class="btn small ghost" data-a="open" data-id="'+x.id+("\">"+_t("Open")+"</button>")
     +(ui.confirm===x.id?'<button class="btn small danger" data-a="del2" data-id="'+x.id+("\">"+_t("Remove for good")+"</button><button class=\"btn small ghost\" data-a=\"del0\">"+_t("Cancel")+"</button>"):'<button class="btn small ghost" data-a="del1" data-id="'+x.id+("\">"+_t("Remove")+"</button>"))+'</div>';
  }
  return '<div class="matrow"><input type="checkbox" data-c="seen" data-id="'+x.id+'" data-mod="'+m.id+'" data-u="'+u+'" '+(isSeen(x,m,u)?'checked':'')+(" aria-label=\""+_t("Reviewed: "))+esc(x.name)+'"><div class="grow"><div class="t">'+esc(x.name)+'</div><div class="s">'+x.type+(x.size?' · '+size(x.size):'')+(_t(" · tick when reviewed")+"</div>")+acts+'</div></div>';
}

function vUnit(r){
  var m=r.m,u=r.u,st=uStatus(m,u),ms=mats(m,u),k=m.id+':'+u;
  var h='<button class="back" data-a="go" data-to="#/m/'+m.id+'">← '+esc(m.code)+'</button><header class="stack"><p class="eyebrow">'+esc(m.code)+_t(" · Floor ")+u+'</p><h1 tabindex="-1" id="h1">'+esc(m.titles[u-1])+'</h1><div class="row">'+chip(st)+((st==='lit'||st==='fading')?("<span class=\"chip\">"+_t("Guest: "))+esc(guestName(m.id,u))+'</span>':'')+'</div></header>';
  h+=unitGuest(m,u,k,st);
  if(!ms.length) h+=("<section class=\"card stack\"><h3>"+_t("This floor is waiting for files")+"</h3><p class=\"lede\">"+_t("Add the material for this unit and the floor is ready for a study block.")+"</p><div class=\"row\"><button class=\"btn\" data-a=\"pickhere\" data-mod=\"")+m.id+'" data-unit="'+u+("\">"+_t("Add files here")+"</button><button class=\"btn ghost\" data-a=\"go\" data-to=\"#/port\">"+_t("Open the Port")+"</button></div></section>");
  else h+=("<section class=\"card stack\"><h2>"+_t("Study block")+"</h2><p class=\"lede\">"+_t("Focus for 25 minutes, then do a short check. Pass it and the light goes on.")+"</p><div class=\"row\"><button class=\"btn\" data-a=\"go\" data-to=\"#/m/")+m.id+'/'+u+("/study\">"+_t("Start block")+"</button></div></section>")
   +("<section class=\"stack\"><div class=\"row between\"><h2>"+_t("Material")+"</h2><button class=\"btn small ghost\" data-a=\"pickhere\" data-mod=\"")+m.id+'" data-unit="'+u+("\">"+_t("Add files here")+"</button></div><div class=\"stack\">")+ms.map(function(x){return matRow(m,u,x);}).join('')+'</div></section>';
  h+=("<section class=\"stack\"><label class=\"f\" for=\"utitle\">"+_t("Unit name")+"<input type=\"text\" id=\"utitle\" data-k=\"")+k+'" value="'+esc(m.titles[u-1])+'" maxlength="80"></label>'
   +("<label class=\"f\" for=\"note\">"+_t("Notes")+"<textarea id=\"note\" data-k=\"")+k+("\" placeholder=\""+_t("Terms you could not explain, questions for the lecturer…")+"\">")+esc(state.notes[k]||'')+("</textarea></label><p class=\"foot\">"+_t("Saved on this device while you type.")+"</p></section>");
  h+='<div class="row between">'+(u>1?'<button class="btn ghost small" data-a="go" data-to="#/m/'+m.id+'/'+(u-1)+("\">"+_t("← Week "))+(u-1)+'</button>':'<span></span>')+(u<m.units?'<button class="btn ghost small" data-a="go" data-to="#/m/'+m.id+'/'+(u+1)+("\">"+_t("Week "))+(u+1)+' →</button>':'')+'</div>';
  return h;
}

function unitGuest(m,u,k,st){
  var li=litInfo(k),g=guestName(m.id,u),pin=!!(state.pin&&state.pin[k]),t='';
  if(li&&li.pinned) t=g+_t(" lives here rent-free. This light stays on.");
  else if(st==='lit') t=g+_t(" lives here and pays rent. The light stays on for \u0001.");
  else if(st==='fading') t=_t("The light is fading and ")+g+_t(" is packing. Pass the check within \u0001 to keep your guest and earn 5 coins.");
  else if(state.lvl[k]!==undefined) t=g+_t(" is away. Pass the check to bring them back and earn 5 coins.");
  var h='';
  if(t) h+=("<div class=\"notice guestnote\"><strong>"+_t("Guest")+"</strong> · ")+esc(t).replace('\u0001',li&&li.until?cdSpan(li.until):'')+(st==='fading'&&state.shields>0?' <button class="btn small" data-a="shield" data-k="'+k+("\">"+_t("Use a shield ("))+state.shields+(_t(" left)")+"</button>"):'')+'</div>';
  h+='<label class="check"><input type="checkbox" data-c="pin" data-k="'+k+'" '+(pin?'checked':'')+("><div class=\"t\">"+_t("Keep this light on for good")+"<div class=\"s\">"+_t("Use it when the unit is easy or will not be in the exam. The light never fades, but it pays no rent. Unpinning later gives no free days: the light follows your real studying.")+"</div></div></label>");
  return h;
}
function mmss(s){return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}
function quizFor(m,u){var s=semOf(m.id);return s&&s.demo?QUIZ[m.code.toLowerCase()+':'+u]:null;}

/* ================= questions from your own files ================= */
function loadScript(src){return new Promise(function(res,rej){var el=document.createElement('script');el.src=src;el.onload=res;el.onerror=function(){rej(new Error('script'));};document.head.appendChild(el);});}
var TEXT_CAP=600000, PDF_PAGES=300;
async function pdfText(blob){
  if(!window.pdfjsLib){await loadScript('vendor/pdf.min.js');}
  window.pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdf.worker.min.js';
  var doc=await window.pdfjsLib.getDocument({data:await blob.arrayBuffer(),isEvalSupported:false,enableXfa:false}).promise,out=[],total=doc.numPages,n=Math.min(total,PDF_PAGES),cut=total>n,len=0;
  for(var p=1;p<=n;p++){
    var pg=await doc.getPage(p),tc=await pg.getTextContent(),line='',last=null;
    tc.items.forEach(function(it){if(last!==null&&Math.abs(it.transform[5]-last)>3)line+='\n';line+=it.str+' ';last=it.transform[5];});
    out.push(line);len+=line.length;
    if(len>TEXT_CAP){cut=p<total;break;}
  }
  /* pages are separated by a form feed so questions can say which page they came from */
  return {text:out.join('\f'),cut:cut};
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
  return keys.map(function(k){return xmlText(new TextDecoder().decode(files[k]),pptx?'a':'w');}).join(pptx?'\f':'\n\n');
}
function pageLabelOf(rec){var n=String(rec.name||'').toLowerCase();return /\.pdf$/.test(n)?'p.':/\.pptx$/.test(n)?'slide':'';}
async function fileText(rec){
  /* textV 2 = complete text with page marks; older cached text was cut at 70 000 characters */
  if(rec.text!==undefined&&rec.textV===2)return rec.text;
  var blob=await dbBlob(rec.id),name=String(rec.name||'').toLowerCase(),t='',cut=false;
  if(!blob)return '';
  try{
    if(/\.(txt|md|csv|tex|html?|py|java|js|json|sql)$/.test(name))t=await blob.text();
    else if(/\.pdf$/.test(name)){var pr=await pdfText(blob);t=pr.text;cut=pr.cut;}
    else if(/\.(docx|pptx)$/.test(name))t=await officeText(blob,name);
  }catch(e){t='';}
  t=t.replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
  if(t.length>TEXT_CAP){t=t.slice(0,TEXT_CAP);cut=true;}
  rec.text=t;rec.textV=2;rec.textCut=cut;
  try{await dbPut(rec);}catch(e){}
  return t;
}
function bankKey(k){return 'booklyn:bank:'+k;}
function bankGet(k){var b=null;try{b=JSON.parse(localStorage.getItem(bankKey(k))||'null');}catch(e){}return QC.upgradeBank(b);}
function bankPut(k,b){try{localStorage.setItem(bankKey(k),JSON.stringify(b));}catch(e){}}
function allBanks(){var o={};try{for(var i=0;i<localStorage.length;i++){var key=localStorage.key(i);if(key&&key.indexOf('booklyn:bank:')===0){var k=key.slice(13);try{o[k]=JSON.parse(localStorage.getItem(key));}catch(e){}}}}catch(e){}return o;}
function clearBanks(){try{var del=[];for(var i=0;i<localStorage.length;i++){var key=localStorage.key(i);if(key&&key.indexOf('booklyn:bank:')===0)del.push(key);}del.forEach(function(k){localStorage.removeItem(k);});}catch(e){}}
async function aiMore(items,bank){
  /* One request = one section (a few pages with their heading). The server analyses it, writes questions, checks them and returns only what passed. */
  var all=[];
  items.forEach(function(it){QC.sectionChunks(it.text,5500,pageLabelOf(it.rec)).forEach(function(c){if(c.text.length>=300)all.push({rec:it.rec,c:c,h:hashStr(it.rec.id+':'+c.text.length+':'+c.text.slice(0,200))});});});
  if(!all.length)return -1;
  var free=all.filter(function(x){return bank.used.indexOf(x.h)<0;}),pool=free.length?free:all,pick=pool[Math.floor(Math.random()*pool.length)];
  var r=await api('POST','/api/quiz',{sections:[{title:pick.c.title||'',text:pick.c.text.replace(/\f/g,'\n\n'),ref:pick.c.ref||''}],n:QC.QUIZ_LEN});
  if(!r.ok){
    if(r.status===429)SYNC.aiMsg=_t("The daily AI limit is used up. Booklyn used the questions it could make on your device.");
    else if(r.status===503)SYNC.aiMsg=_t("The AI service is not set up yet. Booklyn used the questions it could make on your device.");
    else if(r.status===401)SYNC.aiMsg=_t("Sign in to use AI questions.");
    else SYNC.aiMsg=_t("The AI service did not answer. Booklyn used the questions it could make on your device.");
    return -1;
  }
  bank.used.push(pick.h);
  if(!r.questions||!r.questions.length){bank.aiReason=String(r.reason||'').slice(0,240);return 0;}
  bank.aiReason='';
  var made=r.questions.map(function(q){return {id:'a'+hashStr(q.q),q:q.q,o:q.o,a:q.a,e:q.e,src:'ai',evidence:String(q.evidence||'').slice(0,240),title:String(q.title||'').slice(0,120),ref:String(q.ref||'').slice(0,40)};});
  return QC.addQuestions(bank,made,QC.fileKey(pick.rec),pick.rec.name);
}
/* Result: {quiz:[5 questions], notes:[]} or {fail:'nofiles'|'notext'|'timeout'|'few'|'error', have:n, reason, aiOn} */
async function prepareQuiz(m,u){
  var k=m.id+':'+u,recs=FILES.filter(function(f){return f.status==='imported'&&f.mod===m.id&&f.unit===u;});
  if(!recs.length)return {fail:'nofiles'};
  var texts=await Promise.race([Promise.all(recs.map(fileText)),new Promise(function(res){setTimeout(function(){res(null);},25000);})]);
  if(!texts)return {fail:'timeout'};
  var items=recs.map(function(r,i){return {rec:r,text:texts[i]||''};}).filter(function(x){return x.text.length>=150;});
  if(!items.length)return {fail:'notext'};
  var bank=bankGet(k);QC.syncBank(bank,items.map(function(x){return x.rec;}));
  /* On-device questions only come from clear definitions in the files; random-word blanks are no longer made. */
  items.forEach(function(it){
    var fk=QC.fileKey(it.rec);if(bank.done[fk])return;
    QC.addQuestions(bank,QC.definitionQuestions(it.text,12,{pageLabel:pageLabelOf(it.rec)}),fk,it.rec.name);
    bank.done[fk]=true;
  });
  SYNC.aiMsg='';
  var aiOn=!!(state.aiOpt&&SYNC.me&&navigator.onLine!==false);
  function freshAi(){return bank.q.filter(function(q){return q.src==='ai'&&!q.bad&&!(bank.stats[q.id]&&bank.stats[q.id].asked);}).length;}
  if(aiOn){for(var t=0;t<2&&freshAi()<QC.QUIZ_LEN+1;t++){var got=-1;try{got=await aiMore(items,bank);}catch(e){got=-1;}if(got<0)break;}}
  var valid=bank.q.filter(QC.validQuestion).length,quiz=QC.selectQuiz(bank,QC.QUIZ_LEN,Date.now()&0xffff);
  if(!quiz){bankPut(k,bank);return {fail:'few',have:valid,reason:bank.aiReason,aiOn:aiOn};}
  QC.markAsked(bank,quiz.map(function(q){return q.id;}));
  bankPut(k,bank);
  var notes=recs.filter(function(r){return r.textCut;}).map(function(r){return _t("Only the first part of “")+r.name+_t("” was read (it is very long).");});
  return {quiz:quiz.map(function(q){q.k=k;return q;}),notes:notes};
}
function newStudy(k){return {k:k,step:'focus',remaining:1500,end:null,running:false,q:0,score:0,picked:null,checks:[false,false,false],passed:false,answers:[],refunded:false,fail:null,have:0,notes:[],quiz:null,reason:'',aiOn:false};}
function goCheck(){
  var mm=M(study.k.split(':')[0]),uu=+study.k.split(':')[1];
  if(quizFor(mm,uu)){study.step='check';render(true);return;}
  var key=study.k;study.step='prep';render(true);
  prepareQuiz(mm,uu).catch(function(){return {fail:'error'};}).then(function(res){
    if(!study||study.k!==key)return;
    study.quiz=res.quiz||null;study.fail=res.fail||null;study.have=res.have||0;study.notes=res.notes||[];study.reason=res.reason||'';study.aiOn=!!res.aiOn;
    study.q=0;study.score=0;study.picked=null;study.answers=[];study.refunded=false;study.step='check';render(true);
  });
}
function reportBad(why){
  var q=study&&study.quiz&&study.quiz[study.q];if(!q||!q.k)return;
  var b=bankGet(q.k);b.q.forEach(function(x){if(x.id===q.id){x.bad=true;x.badWhy=why||'';}});bankPut(q.k,b);
  var a=study.answers[study.q],msg=_t("Thanks. That question will not come back.");
  if(a&&!a.bad){a.bad=true;if(!a.ok&&!study.refunded){study.refunded=true;study.score++;a.ok=true;msg+=_t(" You get the point back for it.");}}
  toast(msg);
}
function noQuizText(){
  var f=study.fail;
  if(f==='few')return _t("Booklyn could only make ")+study.have+_pl(study.have,' good question',' good questions')+_t(" from the files in this unit. A quiz needs ")+QC.QUIZ_LEN+_t(", so it will not give you a shorter one or invent questions. ")+(study.reason?_t("The AI said: ")+study.reason+' ':'')+(study.aiOn?'':_t("Turn on AI questions in Settings (needs a sync account) for better questions. "))+_t("You can also add more material to the unit, or use the self-check below.");
  if(f==='nofiles')return _t("This unit has no imported files yet, so Booklyn has nothing to ask about. Import the slides or script first, or use the self-check below.");
  if(f==='notext')return _t("Booklyn could not read enough text in these files (scanned pages and pictures cannot be read). You can use the self-check below.");
  if(f==='timeout')return _t("Reading the files took too long. Booklyn keeps what it already read, so trying again is usually faster.");
  if(f==='error')return _t("Something went wrong while preparing the questions. You can try again or use the self-check below.");
  return '';
}

function missedHTML(){
  var miss=study.answers.filter(function(a){return a&&!a.ok&&!a.bad;});
  if(!miss.length)return '';
  return ("<div class=\"stack\"><h3>"+_t("Review what you missed")+"</h3><ul class=\"list\">")+miss.map(function(a){var q=a.q;return '<li class="foot"><strong>'+esc(q.q)+("</strong><br>"+_t("Right answer: "))+esc(q.o[q.a])+'. '+esc(q.e)+'</li>';}).join('')+("</ul><p class=\"foot\">"+_t("These questions come back first next time.")+"</p></div>");
}
function vStudy(r){
  var m=r.m,u=r.u,k=m.id+':'+u;
  if(!study||study.k!==k) study=newStudy(k);
  var quiz=study.quiz||quizFor(m,u),N=quiz?quiz.length:0;
  var steps='<div class="steps" aria-hidden="true"><i class="on"></i><i class="'+(study.step!=='focus'?'on':'')+'"></i><i class="'+(study.step==='result'?'on':'')+'"></i></div>';
  var h='<button class="back" data-a="leave" data-to="#/m/'+m.id+'/'+u+("\">"+_t("← Leave block")+"</button><header class=\"stack\"><p class=\"eyebrow\">")+esc(m.code)+_t(" · Floor ")+u+'</p><h1 tabindex="-1" id="h1">'+esc(m.titles[u-1])+'</h1>'+steps+'</header>';
  if(study.step==='focus'){
    h+=("<section class=\"card stack\"><p class=\"eyebrow\">"+_t("1 · Focus")+"</p><div class=\"timer\" id=\"tm\">")+mmss(study.remaining)+'</div><div class="bar"><i id="tb" style="width:'+Math.round((1500-study.remaining)/15)+'%"></i></div>'
     +'<div class="row" style="justify-content:center"><button class="btn" data-a="timer" id="tbtn">'+(study.running?_t("Pause"):(study.remaining<1500?_t("Resume"):_t("Start 25 minutes")))+("</button><button class=\"btn ghost\" data-a=\"treset\">"+_t("Reset")+"</button></div>")
     +'<p class="foot" style="text-align:center">'+mats(m,u).map(function(x){return esc(x.name);}).join(' · ')+'</p></section>'
     +("<div class=\"row between\"><span class=\"foot\">"+_t("Already studied this unit?")+"</span><button class=\"btn ghost\" data-a=\"tocheck\">"+_t("Skip to the check")+"</button></div>");
  } else if(study.step==='prep'){
    h+=("<section class=\"card stack\" style=\"text-align:center\"><p class=\"eyebrow\">"+_t("2 · Check")+"</p><h2>"+_t("Preparing your questions…")+"</h2><p class=\"lede\">"+_t("Booklyn is reading your files for this unit. This can take a few seconds the first time"))+(state.aiOpt&&SYNC.me?_t(", and up to a minute when the AI writes and checks new questions"):'')+'.</p></section>';
  } else if(study.step==='check'&&quiz){
    var q=quiz[study.q],L=['A','B','C','D','E'],srcLine=QC.sourceLine(q);
    h+=("<section class=\"card stack\"><p class=\"eyebrow\">"+_t("2 · Quiz · Question "))+(study.q+1)+_t(" of ")+N+'</p><div class="bar" aria-hidden="true"><i style="width:'+Math.round(study.q/N*100)+'%"></i></div>'
     +("<p class=\"foot\">"+_t("Get "))+QC.PASS_MIN+_t(" of ")+QC.QUIZ_LEN+_t(" right (")+QC.PASS_PCT+_t(" %) to turn the light on. Right so far: ")+study.score+'.</p>'
     +'<h2>'+esc(q.q)+'</h2><div class="stack">'
     +q.o.map(function(o,i){var cls=study.picked===null?'':(i===q.a?' right':(i===study.picked?' wrong':''));return '<button class="opt'+cls+'" data-a="pick" data-i="'+i+'" '+(study.picked!==null?'disabled':'')+'><span class="k">'+L[i]+'</span><span>'+esc(o)+'</span></button>';}).join('')+'</div>'
     +(study.picked!==null?'<div class="notice" role="status"><strong>'+(study.picked===q.a?_t("Correct. "):_t("Not quite. "))+'</strong>'+esc(q.e)+(q.src==='ai'&&q.evidence?("<br><span class=\"foot\">"+_t("From your material: “"))+esc(q.evidence)+'”</span>':'')+'</div><div class="row"><button class="btn" data-a="nextq">'+(study.q<N-1?_t("Next question"):_t("See result"))+'</button>'+(q.k?("<span class=\"foot\">"+_t("Report:")+"</span><button class=\"btn ghost small\" data-a=\"badq\" data-why=\"unclear\">"+_t("Unclear")+"</button><button class=\"btn ghost small\" data-a=\"badq\" data-why=\"wrong\">"+_t("Wrong answer")+"</button><button class=\"btn ghost small\" data-a=\"badq\" data-why=\"offtopic\">"+_t("Not relevant")+"</button>"):'')+'</div>':'')
     +(srcLine?("<p class=\"foot\">"+_t("Source: "))+esc(srcLine)+'</p>':'')
     +(q.k?'<p class="foot">'+(q.src==='ai'?_t("Written by an AI from your files, then checked by rules and a second review. It can still be wrong: check it against the material."):_t("Made on your device from a definition in your files."))+'</p>':'')+(SYNC.aiMsg&&study.q===0?'<p class="foot">'+esc(SYNC.aiMsg)+'</p>':'')
     +(study.notes.length&&study.q===0?'<p class="foot">'+esc(study.notes.join(' '))+'</p>':'')+'</section>';
  } else if(study.step==='check'){
    var ps=[_t("Explain “")+m.titles[u-1]+_t("” in one sentence without looking."),_t("Name two terms from this unit that you could define to a friend."),_t("Solve or sketch one exercise from the material.")],nq=noQuizText();
    if(nq)h+=("<section class=\"card stack\"><p class=\"eyebrow\">"+_t("2 · Quiz")+"</p><h2>"+_t("No quiz this time")+"</h2><p class=\"lede\">")+esc(nq)+'</p>'+(study.fail==='timeout'||study.fail==='error'?("<div class=\"row\"><button class=\"btn\" data-a=\"retryprep\">"+_t("Try again")+"</button></div>"):'')+'</section>';
    h+=("<section class=\"card stack\"><p class=\"eyebrow\">"+_t("2 · Self-check (not a quiz)")+"</p><h2>"+_t("Tick what you can do without notes")+"</h2><div class=\"stack\">")
     +ps.map(function(p,i){return '<label class="check"><input type="checkbox" data-c="self" data-i="'+i+'" '+(study.checks[i]?'checked':'')+'><div class="t">'+esc(p)+'</div></label>';}).join('')+'</div>'
     +("<p class=\"foot\">"+_t("Tick at least 2 of 3. Be honest. This only marks the floor as “Reviewed”. It does not count as a passed quiz.")+"</p><div class=\"row\"><button class=\"btn\" data-a=\"finishself\" ")+(study.checks.filter(Boolean).length>=2?'':'disabled')+(">"+_t("Finish self-check")+"</button></div></section>");
  } else {
    var viaQuiz=!!quiz;
    h+=study.passed
     ?'<section class="card stack" style="text-align:center"><div class="big">'+building(m,u)+("</div><h2>"+_t("The light is on")+"</h2><p class=\"lede\" style=\"margin:0 auto\">")+(viaQuiz?_t("Quiz passed: ")+study.score+_t(" of ")+N+_t(" correct (")+QC.PASS_PCT+_t(" % needed). "):_t("Reviewed by self-check, not by a quiz. "))+litCount(m)+_t(" of ")+m.units+_t(" floors in ")+esc(m.code)+(_t(" have their lights on.")+"</p>")+rewardHTML()+(viaQuiz?missedHTML():'')+'<div class="row" style="justify-content:center"><button class="btn" data-a="go" data-to="#/m/'+m.id+("\">"+_t("Back to "))+esc(m.code)+("</button><button class=\"btn ghost\" data-a=\"go\" data-to=\"#/\">"+_t("Campus")+"</button></div></section>")
     :'<section class="card stack"><h2>'+study.score+_t(" of ")+(N||QC.QUIZ_LEN)+(_t(". One more pass.")+"</h2><p class=\"lede\">"+_t("You need "))+QC.PASS_MIN+_t(" of ")+QC.QUIZ_LEN+_t(" correct (")+QC.PASS_PCT+(_t(" %) to turn the light on. Re-read the material, then try again.")+"</p>")+missedHTML()+("<div class=\"row\"><button class=\"btn\" data-a=\"retry\">"+_t("Try again")+"</button><button class=\"btn ghost\" data-a=\"go\" data-to=\"#/m/")+m.id+'/'+u+("\">"+_t("Back to material")+"</button></div></section>");
  }
  return h;
}

function shopItem(name,desc,price,control){return '<div class="shopitem"><div class="grow"><div class="t">'+name+'</div><div class="s">'+desc+'</div></div><div class="shopbuy">'+(price?'<span class="price"><i class="cdot"></i>'+price+'</span>':'')+control+'</div></div>';}
function vShop(){
  var sem=curSem();if(!sem)return vWelcome();
  var mods=sem.modules;if(!ui.shopMod||!mods.some(function(x){return x.id===ui.shopMod;}))ui.shopMod=mods[0].id;
  var sm=M(ui.shopMod),d=state.deco[sm.id]||{},co=state.coins;
  function bb(item,label,off,extra){return '<button class="btn small" data-a="buy" data-item="'+item+'" '+(extra||'')+(off?' disabled':'')+'>'+label+'</button>';}
  var h=("<header class=\"stack\"><p class=\"eyebrow\">"+_t("Shop")+"</p><h1 tabindex=\"-1\" id=\"h1\">"+_t("Decorate your city")+"</h1><p class=\"lede\">"+_t("Earn coins by lighting floors, and from the rent your guests pay each day. Everything here is for looks, except the shield.")+"</p><div class=\"coinline\"><i class=\"cdot\"></i><b>")+co+(_t(" coins")+"</b><span>"+_t("Rent right now: +"))+rentPerDay()+(_t(" a day")+"</span></div></header>");
  h+=("<label class=\"f\">"+_t("Place items at")+"<select data-c=\"shopmod\">")+mods.map(function(x){return '<option value="'+x.id+'"'+(x.id===sm.id?' selected':'')+'>'+esc(x.code+' · '+x.name)+'</option>';}).join('')+'</select></label>';
  h+='<div id="shopcity">'+cityBox(cityMods(sem).filter(function(x){return x.id===sm.id;}),{interactive:false,legend:false,island:false,label:_t("Your building")})+'</div>';
  function own(k,t,desc,price){return shopItem(t,desc,price,d[k]?("<span class=\"foot\">"+_t("Owned")+"</span>"):bb(k,_t("Buy"),!canPay(price)));}
  function roof(k,t,desc,price){var on=roofOf(d)===k;return shopItem(t,desc,price,on?("<span class=\"foot\">"+_t("On the roof")+"</span>"):bb(k,roofOf(d)?_t("Swap"):_t("Buy"),!canPay(price)));}
  var c=esc(sm.code),sk=sceneKey();
  h+=("<section class=\"stack\"><h3>"+_t("Around "))+c+'</h3>'
   +shopItem(_t("Tree"),_t("Plant a tree next to ")+c+' ('+(d.tree||0)+' of 3).',PRICE.tree,bb('tree',_t("Plant"),!canPay(PRICE.tree)||(d.tree||0)>=3))
   +own('lamp',_t("Street lamps"),_t("Two glowing lamps in front of ")+c+'.',PRICE.lamp)
   +own('pool',_t("Swimming pool"),_t("A pool in the garden of ")+c+'.',PRICE.pool)
   +own('fountain',_t("Fountain"),_t("A small fountain at the front door."),PRICE.fountain)
   +own('flowers',_t("Flower beds"),_t("Colourful flower beds around the garden."),PRICE.flowers)
   +own('fence',_t("Fence"),_t("A low white fence around the plot."),PRICE.fence)
   +("<h3>"+_t("On the roof of "))+c+'</h3>'
   +roof('garden',_t("Rooftop garden"),_t("Green planters and small trees."),PRICE.garden)
   +roof('roofpool',_t("Rooftop pool"),_t("A pool with a view. Swapping replaces the current roof item."),PRICE.roofpool)
   +roof('helipad',_t("Helipad"),_t("A landing pad for important guests."),PRICE.helipad)
   +roof('solar',_t("Solar panels"),_t("Two rows of panels catching the moonlight."),PRICE.solar)
   +("<h3>"+_t("Colour")+"</h3>")
   +shopItem(_t("Paint"),_t("Repaint ")+c+_t(" in another colour."),PRICE.paint,'<div class="swatches">'+[20,45,95,165,215,270,330].map(function(hu){return '<button class="sw'+(d.hue===hu?' on':'')+'" style="background:hsl('+hu+' 45% 48%)" data-a="buy" data-item="paint" data-hue="'+hu+("\" aria-label=\""+_t("Paint in colour "))+hu+'" '+(!canPay(PRICE.paint)?'disabled':'')+'></button>';}).join('')+(d.hue!=null?("<button class=\"btn small ghost\" data-a=\"buy\" data-item=\"unpaint\">"+_t("Original")+"</button>"):'')+'</div>')
   +("<h3>"+_t("Scenery for the whole district")+"</h3><p class=\"foot\">"+_t("Buy a look once, then switch between the ones you own for free.")+"</p>")
   +Object.keys(SCENES).map(function(k){var owned=k==='park'||state.sceneOwn[k];return shopItem(SCENES[k],k==='park'?_t("The default look."):_t("Changes the ground, the trees and the mood of the district."),owned?0:PRICE.scene,sk===k?("<span class=\"foot\">"+_t("In use")+"</span>"):'<button class="btn small" data-a="buy" data-item="scene" data-scene="'+k+'" '+(!owned&&!canPay(PRICE.scene)?'disabled':'')+'>'+(owned?_t("Use"):_t("Buy"))+'</button>');}).join('')
   +("<h3>"+_t("Useful")+"</h3>")
   +shopItem(_t("Shield"),_t("Saves one fading light, any floor, without a check. You can hold 2 (")+state.shields+_t(" now)."),PRICE.shield,bb('shield',_t("Buy"),!canPay(PRICE.shield)||state.shields>=2))
   +'</section>'
   +("<section class=\"card stack\"><h3>"+_t("How coins work")+"</h3><p class=\"lede\">"+_t("First light on a floor +10. Saving a fading light +5. A week lit in every module +15. A finished building +50. Each lit floor pays 1 coin of rent a day (up to 25), stored for 3 days at most. Floors you keep on for good pay no rent.")+"</p></section>")+foot();
  return h;
}
function vDeadlines(){
  var sem=curSem(); if(!sem) return vWelcome();
  if(!ui.dl) ui.dl={title:'',date:'',mod:'',kind:'Exam'};
  var all=semDeadlines(sem).sort(function(a,b){return pdate(a.date)-pdate(b.date);});
  var h=("<header class=\"stack\"><p class=\"eyebrow\">"+_t("Deadlines")+"</p><h1 tabindex=\"-1\" id=\"h1\">"+_t("What is due")+"</h1><p class=\"lede\">"+_t("Tick things off as you finish them.")+"</p></header>");
  h+=("<section class=\"card stack\"><h3>"+_t("Add a deadline")+"</h3><label class=\"f\">"+_t("What")+"<input type=\"text\" id=\"dl-title\" data-dl=\"title\" value=\"")+esc(ui.dl.title)+("\" placeholder=\""+_t("Midterm, assignment 2…")+"\"></label>")
   +("<div class=\"grid2\"><label class=\"f\">"+_t("Date")+"<input type=\"date\" data-dl=\"date\" value=\"")+esc(ui.dl.date)+("\"></label><label class=\"f\">"+_t("Module")+"<select data-dl=\"mod\"><option value=\"\">"+_t("None")+"</option>")+sem.modules.map(function(m){return '<option value="'+m.id+'"'+(ui.dl.mod===m.id?' selected':'')+'>'+esc(m.code)+'</option>';}).join('')+'</select></label></div>'
   +("<label class=\"f\">"+_t("Kind")+"<select data-dl=\"kind\">")+['Exam','Test','Assignment','Project','Other'].map(function(k){return '<option value="'+k+'"'+(ui.dl.kind===k?' selected':'')+'>'+_t(k)+'</option>';}).join('')+("</select></label><div class=\"row\"><button class=\"btn\" data-a=\"adddl\">"+_t("Add")+"</button></div></section>");
  h+='<ul class="list">'+all.map(function(d){var m=d.mod?M(d.mod):null,done=!!state.tasksDone[d.id],n=daysTo(d);
    return '<li><div class="matrow" style="align-items:center"><input type="checkbox" data-c="dead" data-id="'+d.id+'" '+(done?'checked':'')+(" aria-label=\""+_t("Done: "))+esc(d.title)+'"><div class="grow"><div class="t"'+(done?' style="text-decoration:line-through;opacity:.6"':'')+'>'+esc(d.title)+'</div><div class="s">'+(m?esc(m.code)+' · ':'')+esc(_t(d.kind||''))+' · '+fmt(d.date)+'</div></div><span class="chip'+(n<=3&&n>=0&&!done?' warn':'')+'">'+rel(d)+'</span><button class="btn small ghost" data-a="deldl" data-id="'+d.id+("\" aria-label=\""+_t("Delete "))+esc(d.title)+'">✕</button></div></li>';}).join('')+'</ul>';
  if(!all.length) h+=("<p class=\"lede\">"+_t("No deadlines yet.")+"</p>");
  return h;
}

function vSetup(){
  if(!ui.setup) ui.setup={name:state.name||'',sname:_t("Semester ")+(state.sems.length+1),start:'2026-09-14',mods:[{code:'',name:'',units:14,kw:''}]};
  var S=ui.setup;
  var h=("<header class=\"stack\"><p class=\"eyebrow\">"+_t("New semester")+"</p><h1 tabindex=\"-1\" id=\"h1\">"+_t("Build your district")+"</h1><p class=\"lede\">"+_t("A building for each module, a floor for each teaching unit. Most semesters have 14 weeks. Not sure how many units a module has? Keep 14. A new floor appears when you import a file with a higher week number, and you can add or remove floors at any time.")+"</p></header>");
  h+='<div id="setupcity">'+setupCityHTML()+'</div>';
  h+=("<section class=\"card stack\"><label class=\"f\">"+_t("Your name (optional)")+"<input type=\"text\" data-sb=\"name\" value=\"")+esc(S.name)+("\" maxlength=\"30\"></label><div class=\"grid2\"><label class=\"f\">"+_t("Semester name")+"<input type=\"text\" data-sb=\"sname\" value=\"")+esc(S.sname)+("\" maxlength=\"40\"></label><label class=\"f\">"+_t("First teaching week starts")+"<input type=\"date\" data-sb=\"start\" value=\"")+esc(S.start)+'"></label></div></section>';
  h+=("<section class=\"stack\"><h2>"+_t("Modules")+"</h2>")+S.mods.map(function(m,i){
    return ("<div class=\"modrow\"><div class=\"g\"><label class=\"f\">"+_t("Code")+"<input type=\"text\" data-sb=\"mods.")+i+'.code" value="'+esc(m.code)+("\" maxlength=\"8\" placeholder=\"CNB\"></label><label class=\"f\">"+_t("Name")+"<input type=\"text\" data-sb=\"mods.")+i+'.name" value="'+esc(m.name)+("\" maxlength=\"60\" placeholder=\"Computer Networks Basics\"></label><label class=\"f\">"+_t("Units (not sure? keep 14)")+"<input type=\"number\" min=\"1\" max=\"30\" data-sb=\"mods.")+i+'.units" value="'+esc(m.units)+'"></label></div>'
     +("<label class=\"f\">"+_t("Words that help sort files (optional, comma separated)")+"<input type=\"text\" data-sb=\"mods.")+i+'.kw" value="'+esc(m.kw)+("\" placeholder=\""+_t("router, ipv4, subnet")+"\"></label>")
     +(S.mods.length>1?'<div><button class="btn small ghost" data-a="rmmod" data-i="'+i+("\">"+_t("Remove module")+"</button></div>"):'')+'</div>';}).join('')
   +("<div class=\"row\"><button class=\"btn ghost\" data-a=\"addmod\">"+_t("＋ Add a module")+"</button></div></section>");
  h+=("<div class=\"row\"><button class=\"btn\" data-a=\"buildsem\">"+_t("Build my district")+"</button>")+(state.sems.length?("<button class=\"btn ghost\" data-a=\"go\" data-to=\"#/\">"+_t("Cancel")+"</button>"):'')+'</div>';
  return h;
}

function vSettings(){
  var sem=curSem();
  var h=("<header class=\"stack\"><p class=\"eyebrow\">"+_t("Settings")+"</p><h1 tabindex=\"-1\" id=\"h1\">"+_t("Your city")+"</h1></header>");
  if(readOnly) h+=("<div class=\"notice warn\">"+_t("The saved data on this device comes from a newer version of Booklyn. This page will not overwrite it.")+"</div>");
  else if(!storageOK) h+=("<div class=\"notice warn\">"+_t("This browser blocks saving, so your progress will be lost when you close the page.")+"</div>");
  if(!filesOK) h+=("<div class=\"notice warn\">"+_t("This browser cannot store files, so importing will not work here.")+"</div>");
  h+=("<section class=\"card stack\"><label class=\"f\">"+_t("Your name")+"<input type=\"text\" id=\"nm\" value=\"")+esc(state.name)+'" maxlength="30"></label>'
   +("<fieldset style=\"border:0;padding:0;margin:0\" class=\"stack\"><legend class=\"f\" style=\"margin-bottom:6px\">"+_t("Theme")+"</legend><div class=\"tabs\" role=\"radiogroup\">")+['system','light','dark'].map(function(t){return '<button role="radio" aria-checked="'+(state.theme===t)+'" aria-selected="'+(state.theme===t)+'" data-a="theme" data-v="'+t+'">'+_t(t[0].toUpperCase()+t.slice(1))+'</button>';}).join('')+'</div></fieldset>'+langSel()+'</section>';
  if(sem) h+='<section class="card stack"><h3>'+esc(sem.name)+'</h3><div class="row"><button class="btn small ghost" data-a="finish">'+(sem.finished?_t("Reopen this semester"):_t("Mark as finished"))+("</button><button class=\"btn small ghost\" data-a=\"newsem\">"+_t("＋ New semester")+"</button></div>")
   +'<div class="row">'+(ui.confirm==='sem'?("<button class=\"btn small danger\" data-a=\"rmsem2\">"+_t("Remove it and its files")+"</button><button class=\"btn small ghost\" data-a=\"del0\">"+_t("Cancel")+"</button>"):("<button class=\"btn small ghost\" data-a=\"rmsem1\">"+_t("Remove this semester…")+"</button>"))+'</div></section>';
  h+=("<section class=\"card stack\"><h3>"+_t("Storage")+"</h3><p class=\"lede\" id=\"stor\">"+_t("Checking…")+"</p><div class=\"row\"><button class=\"btn small ghost\" data-a=\"persist\">"+_t("Ask the browser to keep my files")+"</button></div></section>");
  h+=backupCardHTML();
  h+=accountCard();
  if(devOn()){var adm=isAdminNow();h+='<section class="card stack"><details id="devtools"'+(ui.devOpen||adm?' open':'')+'><summary><h3 style="display:inline">'+(adm?_t("Admin tools"):_t("Testing tools"))+'</h3></summary><p class="lede" style="margin:8px 0">'+(adm?_t("This account is an admin. Only you see these tools; other accounts cannot turn them on.")+(SYNC.uid?(_t(" Account id: ")+"<code>")+esc(String(SYNC.uid))+'</code>':''):_t("For the project team. Hide these before the user tests."))+'</p>'+(adm?'<label class="check"><input type="checkbox" data-c="unl" '+(unlOn()?'checked':'')+("><div><div class=\"t\">"+_t("Unlimited coins")+"</div><div class=\"s\">"+_t("Everything in the shop is free and your balance never goes down.")+"</div></div></label>")+("<div class=\"row\" style=\"margin:8px 0\"><label class=\"f\" style=\"flex:1\">"+_t("Set coins to")+"<input type=\"number\" id=\"admcoins\" min=\"0\" max=\"99999999\" step=\"1\" value=\"")+state.coins+("\" inputmode=\"numeric\"></label><button class=\"btn small\" data-a=\"tcoinsset\">"+_t("Set")+"</button></div>"):'')+("<div class=\"row\"><button class=\"btn small\" data-a=\"tcoins\" data-n=\"1000\">"+_t("Add 1,000 coins")+"</button>")+(adm?("<button class=\"btn small\" data-a=\"tcoins\" data-n=\"100000\">"+_t("Add 100,000")+"</button>"):'')+("<button class=\"btn small ghost\" data-a=\"tcoins\" data-n=\"-9999999\">"+_t("Set coins to 0")+"</button></div><div class=\"row\" style=\"margin-top:8px\"><button class=\"btn small ghost\" data-a=\"tage\" data-n=\"8\">"+_t("Age all lights 8 days")+"</button><button class=\"btn small ghost\" data-a=\"tage\" data-n=\"20\">"+_t("Age all lights 20 days")+"</button><button class=\"btn small ghost\" data-a=\"trent\">"+_t("Make 3 days of rent due")+"</button></div></details></section>");}
  h+=("<section class=\"card stack\"><h3>"+_t("Reset everything")+"</h3><p class=\"lede\">"+_t("Deletes all semesters, progress and imported files from this device.")+"</p><div class=\"row\">")+(ui.confirm==='all'?("<button class=\"btn small danger\" data-a=\"reset2\">"+_t("Yes, delete everything")+"</button><button class=\"btn small ghost\" data-a=\"del0\">"+_t("Cancel")+"</button>"):("<button class=\"btn small ghost\" data-a=\"reset1\">"+_t("Reset…")+"</button>"))+'</div></section>';
  h+=("<section class=\"stack\"><h3>"+_t("About")+"</h3><p class=\"foot\">"+_t("Booklyn · saved-data schema "))+SCHEMA+(_t(". Older data is migrated automatically and backed up first. Data from a newer version is never overwritten.")+"</p></section>")+foot();
  return h;
}

/* ================= shell ================= */
function nav(cur){
  var items=[['campus',_t("Campus"),'#/','campus'],['port',_t("Port"),'#/port','port'],['deadlines',_t("Deadlines"),'#/deadlines','dead'],['shop',_t("Shop"),'#/shop','shop'],['settings',_t("Settings"),'#/settings','set']];
  var on={module:'campus',unit:'campus',study:'campus',setup:'campus'}[cur]||cur,p=pending().length;
  return items.map(function(i){return '<button class="navbtn" data-a="go" data-to="'+i[2]+'" '+(on===i[0]?'aria-current="page"':'')+'><svg viewBox="0 0 24 24" aria-hidden="true">'+ICON[i[3]]+'</svg><span>'+i[1]+'</span>'+(i[0]==='port'&&p?'<span class="badge" aria-label="'+_pl(p,' file waiting',' files waiting')+'">'+p+'</span>':'')+'</button>';}).join('');
}
function render(focus){
  var r=route(); lastRendered=cur();
  if(r.name!=='campus') ui.cityFull=false;
  if(r.name==='campus'&&state.sems.length){var rp=collectRent();if(rp)setTimeout(function(){toast(_t("Rent collected: +")+rp+_t(" coins"));},400);}
  document.documentElement.removeAttribute('data-theme');
  if(state.theme==='light'||state.theme==='dark') document.documentElement.setAttribute('data-theme',state.theme);
  var body;
  if(!state.sems.length&&r.name!=='setup'&&r.name!=='settings') body=vWelcome();
  else body=r.name==='campus'?vCampus():r.name==='port'?vPort():r.name==='module'?vModule(r):r.name==='unit'?vUnit(r):r.name==='study'?vStudy(r):r.name==='deadlines'?vDeadlines():r.name==='shop'?vShop():r.name==='setup'?vSetup():vSettings();
  if(r.name!=='study'&&study){pauseTimer();study=null;}
  $('#app').innerHTML=("<nav class=\"rail\" aria-label=\""+_t("Main")+"\"><div class=\"brand\"><img src=\"icon.svg\" alt=\"\" width=\"30\" height=\"30\">Booklyn<small>"+_t("Keep your lights on")+"</small></div>")+nav(r.name)+'</nav><main class="main">'+body+("</main><nav class=\"tabbar\" aria-label=\""+_t("Main")+"\">")+nav(r.name)+'</nav>';
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
    el.textContent=FILES.filter(function(f){return f.status==='imported';}).length+_t(" files, ")+size(n)+_t(" of your files. Browser storage used: ")+size(e.usage||0)+_t(" of about ")+size(e.quota||0)+'. '+(p===true?_t("The browser has promised to keep your data."):p===false?_t("The browser may clear this data if the device runs low on space."):'');
  }catch(x){el.textContent=_t("Storage information is not available in this browser.");}
}


/* ================= backups and restore (logic in js/backup.js) ================= */
function saveErr(e){return _t("Could not save that change. ")+ST.explainStorageError(e)+_t(" Nothing was changed.");}
function b64(blob){return new Promise(function(res,rej){var r=new FileReader();r.onload=function(){var d=String(r.result);res(d.slice(d.indexOf(',')+1));};r.onerror=function(){rej(r.error);};r.readAsDataURL(blob);});}
function unb64(str){var bin=atob(str),n=bin.length,u=new Uint8Array(n);for(var i=0;i<n;i++)u[i]=bin.charCodeAt(i);return u;}
async function sha256Bytes(u8){var h=await crypto.subtle.digest('SHA-256',u8);return Array.prototype.map.call(new Uint8Array(h),function(x){return ('0'+x.toString(16)).slice(-2);}).join('');}
function prepState(s2){
  if(!s2||typeof s2.schema!=='number')throw new Error('shape');
  if(s2.schema>SCHEMA){var e=new Error('newer');e.newer=true;throw e;}
  while(s2.schema<SCHEMA){var mg=MIGRATIONS[s2.schema];if(!mg)throw new Error('migration');s2=mg(s2);}
  return clean(s2);
}
function hideToast(){var t=$('#toast');if(t)t.classList.remove('show');}
async function fullBackup(){
  if(ui.bk&&ui.bk.busy)return;
  ui.bk={busy:true};render();
  try{
    var out=await BK.buildFullBackup({state:state,banks:allBanks(),files:FILES},{readBlob:dbBlob,toBase64:b64,onProgress:function(i,n){toast(_t("Packing file ")+(i+1)+_t(" of ")+n+'…',true);}});
    var blob=new Blob(out.parts,{type:'application/x-ndjson'}),a=document.createElement('a');
    a.href=URL.createObjectURL(blob);a.download='booklyn-full-backup-'+new Date().toISOString().slice(0,10)+'.ndjson';document.body.appendChild(a);a.click();
    setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},60000);
    state.lastBackup=Date.now();save();ui.bk=null;hideToast();render();
    toast(_t("Full backup saved: ")+out.files+_pl(out.files,' file',' files')+', '+size(out.bytes)+'.'+(out.missing.length?' '+out.missing.length+_pl(out.missing.length,' file could not be read and is not in it.',' files could not be read and are not in it.'):_t(" Keep it somewhere safe.")));
  }catch(e){
    ui.bk=null;hideToast();render();
    toast(_t("Could not create the full backup. ")+(/memory|allocation|quota/i.test(String(e&&(e.name+' '+e.message)))?_t("There is not enough memory for this many files. Use the progress backup and keep your original files."):_t("Try again, or use the progress backup.")));
  }
}
async function startRestore(blob){
  if(ui.restore&&ui.restore.busy)return;
  toast(_t("Checking the backup…"),true);
  try{
    var parsed=await BK.readBackup(blob,{prepareState:prepState,fromBase64:unb64,sha256:sha256Bytes,upgradeBank:QC.upgradeBank,validQuestion:QC.validQuestion,onProgress:function(pos,total){toast(_t("Checking the backup… ")+Math.round(pos/Math.max(1,total)*100)+' %',true);}});
    hideToast();ui.restore={parsed:parsed,desc:BK.describeBackup(parsed),busy:false,error:''};render();
    var el=$('#restorebox');if(el&&el.scrollIntoView)el.scrollIntoView({block:'center'});
  }catch(e){
    hideToast();ui.restore=null;render();
    toast(e instanceof BK.BackupError?e.message:_t("That file could not be read. Nothing was changed."));
  }
}
/* Everything is computed and checked first. The first thing written is the files (one transaction: all or nothing).
   Only after that succeeded do the progress data and question sets change. */
async function applyRestore(mode){
  var R=ui.restore;if(!R||R.busy)return;
  var p=R.parsed;R.busy=true;R.error='';render();
  try{
    var newState,banks={},items=p.files,full=p.kind==='full';
    if(mode==='merge'){
      newState=clean(BK.mergeStates(state,p.state).state);
      var haveId={},haveHash={},semOk={};
      FILES.forEach(function(f){haveId[f.id]=1;if(f.hash)haveHash[f.hash]=1;});
      newState.sems.forEach(function(sm){semOk[sm.id]=1;});
      items=items.filter(function(it){return !haveId[it.meta.id]&&!(it.meta.hash&&haveHash[it.meta.hash])&&semOk[it.meta.sem];});
      Object.keys(p.banks).forEach(function(k){banks[k]=BK.mergeBanks(bankGet(k),p.banks[k]);});
    } else {
      newState=p.state;banks=p.banks;
    }
    if(items.length)await ST.dbAddMany(items.map(function(it){return {meta:it.meta,blob:it.blob};}));
    var oldFiles=FILES;
    if(mode==='replace'&&full)FILES=items.map(function(it){return it.meta;});
    else FILES=FILES.concat(items.map(function(it){return it.meta;}));
    state=newState;
    if(mode==='replace')clearBanks();
    Object.keys(banks).forEach(function(k){bankPut(k,banks[k]);});
    state.lastImport=state.lastImport.filter(function(i){return !!fileById(i);});
    save();
    var warn='';
    if(mode==='replace'&&full){
      var keep={};items.forEach(function(it){keep[it.meta.id]=1;});
      var rr=await IM.removeFiles(fileStore,oldFiles.filter(function(f){return !keep[f.id];}).map(function(f){return f.id;}));
      if(!rr.ok)warn=_t(" Some older files on this device could not be removed.");
    }
    ui.restore=null;render(true);
    toast((mode==='merge'?_t("Merged: "):_t("Restored: "))+items.length+_pl(items.length,' file',' files')+_t(" and your progress.")+warn);
  }catch(e){
    R.busy=false;R.error=_t("Nothing was changed. ")+(ST.isQuota(e)?_t("There is not enough storage left on this device for the files in this backup."):_t("The restore did not finish."));
    render();
  }
}
function backupCardHTML(){
  var imported=FILES.length,bytes=FILES.reduce(function(a,f){return a+(f.size||0);},0),busy=ui.bk&&ui.bk.busy;
  var h=("<section class=\"card stack\"><h3>"+_t("Back up your data")+"</h3><p class=\"lede\">")+(state.lastBackup?_t("Last backup: ")+new Date(state.lastBackup).toLocaleDateString(LOC())+'. ':_t("No backup yet. "))+(_t("Keep backup files somewhere safe, such as your cloud drive.")+"</p>");
  h+='<ul class="list">'+BK.DATA_MAP.map(function(d){return '<li class="foot"><strong>'+esc(d.what)+'</strong><br>'+(d.sync?_t("Synced with your account: yes"):_t("Synced: no, this device only"))+_t(" · Progress backup: ")+_t(d.light?'yes':'no')+_t(" · Full backup: ")+_t(d.full?'yes':'no')+'</li>';}).join('')+'</ul>';
  h+=("<div class=\"row\"><button class=\"btn small\" data-a=\"dlbackup\">"+_t("Download progress backup")+"</button><button class=\"btn small\" data-a=\"dlfull\" ")+(busy?'disabled':'')+'>'+(busy?_t("Packing…"):_t("Download full backup"))+'</button></div>';
  h+=("<p class=\"foot\">"+_t("The full backup adds your "))+imported+_pl(imported,' imported file',' imported files')+' ('+size(bytes)+(_t("), where each one belongs and your practice questions. It is a larger file and takes longer to create.")+"</p>");
  h+=("<div class=\"row\"><button class=\"btn small ghost\" data-a=\"loadbackup\">"+_t("Restore from a backup file…")+"</button><input type=\"file\" id=\"bkfile\" accept=\".json,.ndjson,.txt,application/json\" hidden></div>");
  if(ui.restore){
    var R=ui.restore,d=R.desc,full=d.kind==='full';
    h+=("<div class=\"notice\" id=\"restorebox\" role=\"region\" aria-label=\""+_t("Restore this backup")+"\"><strong>")+(full?_t("Full backup"):_t("Progress backup"))+'</strong>'+(d.createdAt?_t(" · made ")+esc(new Date(d.createdAt).toLocaleDateString(LOC())):'')+("<br>"+_t("It contains "))+d.semesters+_pl(d.semesters,' semester',' semesters')+', '+d.modules+_pl(d.modules,' module',' modules')+', '+d.lights+_pl(d.lights,' lit floor',' lit floors')+', '+d.deadlines+_pl(d.deadlines,' deadline',' deadlines')+', '+d.coins+_t(" coins")+(full?', '+d.files+_pl(d.files,' file',' files')+_t(" and ")+d.banks+_pl(d.banks,' question set',' question sets'):'')+_t(". The backup was checked and nothing has been changed yet.")
      +(R.parsed.notes.length?'<br>'+esc(R.parsed.notes.slice(0,4).join(' ')):'')
      +("<div class=\"stack\" style=\"margin-top:10px\"><div><strong>"+_t("Merge")+"</strong>"+_t(" adds what is missing on this device and keeps what you have. If both have the same item, this device wins. Coins take the higher number, and a light that is on in either place stays on.")+"</div>")
      +("<div><strong>"+_t("Replace")+"</strong>"+_t(" makes this device match the backup. Your current progress is overwritten"))+(full?_t(", and files that are not in the backup are removed from this device."):_t(". Files already on this device stay."))+'</div></div>'
      +(R.error?'<p class="foot" role="alert"><strong>'+esc(R.error)+'</strong></p>':'')
      +'<div class="row" style="margin-top:10px"><button class="btn small" data-a="rmerge" '+(R.busy?'disabled':'')+(">"+_t("Merge")+"</button><button class=\"btn small danger\" data-a=\"rreplace\" ")+(R.busy?'disabled':'')+(">"+_t("Replace")+"</button><button class=\"btn small ghost\" data-a=\"rcancel\" ")+(R.busy?'disabled':'')+(">"+_t("Cancel")+"</button></div>")+(R.busy?("<p class=\"foot\" role=\"status\">"+_t("Restoring… do not close this page.")+"</p>"):'')+'</div>';
  }
  h+=("<details><summary class=\"foot\">"+_t("Progress backup as text")+"</summary><textarea id=\"bk\" aria-label=\""+_t("Backup text")+"\" spellcheck=\"false\" placeholder=\""+_t("Press “Create backup text”, or paste a backup here")+"\"></textarea><div class=\"row\"><button class=\"btn small ghost\" data-a=\"export\">"+_t("Create backup text")+"</button><button class=\"btn small ghost\" data-a=\"restore\">"+_t("Check pasted backup")+"</button></div></details></section>");
  return h;
}

/* ================= timer ================= */
var tick;
function pauseTimer(){if(!study)return;study.running=false;clearInterval(tick);}
function startTimer(){
  study.running=true;study.end=Date.now()+study.remaining*1000;clearInterval(tick);
  tick=setInterval(function(){
    var rem=Math.max(0,Math.ceil((study.end-Date.now())/1000));study.remaining=rem;
    var t=$('#tm'),b=$('#tb');if(t)t.textContent=mmss(rem);if(b)b.style.width=Math.round((1500-rem)/15)+'%';
    if(rem===0){pauseTimer();toast(_t("Time is up. Now the check."));goCheck();}
  },250);
}

/* ================= actions ================= */
function setLit(k){
  var p=k.split(':'),m=M(p[0]),u=+p[1],li=litInfo(k),pinned=!!(state.pin&&state.pin[k]),res={coins:0,notes:[]};
  if(!pinned){
    if(state.lvl[k]===undefined){state.lvl[k]=0;res.coins+=10;res.notes.push(_t("first light on this floor"));}
    else if(!li){state.lvl[k]=Math.max(0,state.lvl[k]-1);res.coins+=5;res.notes.push(_t("back on after fading"));}
    else if(li.state==='fading'){state.lvl[k]=Math.min(2,(state.lvl[k]||0)+1);res.coins+=5;res.notes.push(_t("saved in time, so the light now lasts longer"));}
  }
  if(pinned&&state.lvl[k]===undefined)state.lvl[k]=0;
  state.lit[k]=Date.now();
  if(m)mats(m,u).forEach(function(x){state.seen[x.id]=true;});
  if(m&&!pinned){
    var sem=semOf(m.id);
    if(sem){
      var wk='w:'+sem.id+':'+u;
      if(!state.paid[wk]&&sem.modules.every(function(x){return u>x.units||realOn(x,u);})){state.paid[wk]=1;res.coins+=15;res.notes.push(_t("week ")+u+_t(" lit in every module (+15)"));}
    }
    var bk='b:'+m.id,all=true;for(var i=1;i<=m.units;i++)if(!realOn(m,i))all=false;
    if(!state.paid[bk]&&all){state.paid[bk]=1;res.coins+=50;res.notes.push(m.code+_t(" complete (+50)"));}
  }
  state.coins+=res.coins;save();return res;
}
function rewardHTML(){
  var r=study&&study.reward;if(!r||!r.coins)return '';
  return '<div class="reward"><i class="cdot"></i><b>+'+r.coins+(_t(" coins")+"</b><span>")+esc(r.notes.join(' · '))+'</span></div>';
}
function finishQuiz(){
  var qz=study.quiz||quizFor(M(study.k.split(':')[0]),+study.k.split(':')[1]);
  study.step='result';
  /* a quiz passes with 4 of 5; the self-check is a separate, weaker path and is recorded as such */
  study.passed=qz?QC.isPass(study.score,qz.length):study.score>=2;
  if(study.passed){state.how[study.k]=qz?'quiz':'self';study.reward=setLit(study.k);}
}
function fileById(id){return FILES.filter(function(f){return f.id===id;})[0];}
function demoSem(){
  var mods=DEMO.map(function(d){
    var titles=[],base={};
    for(var u=1;u<=14;u++){var w=d.weeks[u-1];titles.push(w?w[0]:_t("Week ")+u);base[u]=w?w[1].slice():[];}
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
  var files=items.map(function(x){return new File([x[1]+_t(". This is a placeholder so you can try the Port.")],x[0],{type:'text/plain'});});
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
      if(!canPay(PRICE.scene)){toast(_t("Not enough coins yet."));return;}
      pay(PRICE.scene);state.sceneOwn[sk2]=true;state.scenery[sem2.id]=sk2;save();render();toast(_t("Your district has a new look."));return;
    }
    var cost=PRICE[it];if(!cost)return;
    if(!canPay(cost)){toast(_t("Not enough coins yet."));return;}
    if(it==='shield'){if(state.shields>=2){toast(_t("You can hold 2 shields."));return;}state.shields++;}
    else{
      if(!sm2)return;dd=state.deco[sm2.id]=state.deco[sm2.id]||{};
      if(it==='tree'){if((dd.tree||0)>=3){toast(_t("This building has all its trees."));return;}dd.tree=(dd.tree||0)+1;}
      else if(['lamp','pool','fountain','flowers','fence'].indexOf(it)>=0){if(dd[it])return;dd[it]=true;}
      else if(['garden','roofpool','helipad','solar'].indexOf(it)>=0){if(roofOf(dd)===it)return;dd.roof=it;delete dd.garden;}
      else if(it==='paint'){dd.hue=+b.dataset.hue;}
    }
    pay(cost);save();render();toast(_t("Bought. It is already in your city."));
  }
  else if(a==='shield'){var sk=b.dataset.k,sli=litInfo(sk);if(state.shields>0&&sli&&sli.state==='fading'){state.shields--;state.lit[sk]=Date.now();save();render();toast(_t("Shield used. The light is back to full."));}}
  else if(a==='tcoinsset'){if(!isAdminNow())return;var inp=document.getElementById('admcoins'),nv=Math.floor(+(inp&&inp.value));if(!isFinite(nv)||nv<0||nv>99999999){toast(_t("Enter a number from 0 to 99,999,999."));return;}state.coins=nv;save();render();toast(_t("Coins: ")+state.coins);}
  else if(a==='tcoins'){if(!devOn())return;state.coins=Math.max(0,state.coins+(+b.dataset.n||0));save();render();toast(_t("Coins: ")+state.coins);}
  else if(a==='tage'){Object.keys(state.lit).forEach(function(k){state.lit[k]=litTs(k)-(+b.dataset.n||0)*864e5;});save();render();toast(_t("Lights aged. Open Campus to see them fade."));}
  else if(a==='trent'){state.rentAt=Date.now()-3*864e5;save();toast(_t("Open Campus to collect the rent."));}
  else if(a==='creset'){ui.cityT={x:0,y:0,k:1};applyCity();}
  else if(a==='cfull'){ui.cityFull=true;render();var cb=$('[data-a="cclose"]');if(cb)cb.focus();}
  else if(a==='cclose'){ui.cityFull=false;render();}
  else if(a==='addfloor'){var am=M(b.dataset.m);if(am){if(am.units>=MAXU)toast(_t("A module can have up to ")+MAXU+_t(" floors."));else{ensureUnits(am,am.units+1);render();}}}
  else if(a==='rmfloor'){var rm=M(b.dataset.m);if(rm&&rm.units>1&&!mats(rm,rm.units).length&&!state.lit[rm.id+':'+rm.units]){rm.titles.length=rm.units-1;rm.units--;save();render();}}
  else if(a==='leave'){pauseTimer();study=null;go(b.dataset.to);}
  else if(a==='tab'){ui.tab=b.dataset.v;render();}
  else if(a==='newsem'){ui.setup=null;go('#/setup');}
  else if(a==='demo'){seedDemo();ui.cityBuild=true;ui.cityT={x:0,y:0,k:1};save();go('#/');}
  else if(a==='addmod'){ui.setup.mods.push({code:'',name:'',units:14,kw:''});render();}
  else if(a==='rmmod'){ui.setup.mods.splice(+b.dataset.i,1);render();}
  else if(a==='buildsem'){
    var S=ui.setup,mods=S.mods.filter(function(m){return String(m.code).trim()&&String(m.name).trim();});
    if(!mods.length){toast(_t("Add at least one module with a code and a name."));return;}
    var sem={id:uid(),name:String(S.sname).trim()||_t("Semester"),start:S.start||'',demo:false,finished:false,modules:[]};
    mods.forEach(function(m,i){
      var code=String(m.code).trim().toUpperCase().slice(0,8),n=clamp(parseInt(m.units,10)||14,1,MAXU),t=[];
      for(var u=1;u<=n;u++)t.push(_t("Week ")+u);
      sem.modules.push({id:uid(),code:code,name:String(m.name).trim(),h:HUES[(state.sems.length*3+i)%HUES.length],units:n,kw:String(m.kw).trim()||ALIASES[code]||'',titles:t,base:{}});
    });
    if(S.name)state.name=S.name;
    state.sems.push(sem);state.activeSem=sem.id;ui.setup=null;ui.cityBuild=true;ui.cityT={x:0,y:0,k:1};save();go('#/');toast(_t("Your district is ready. Tap a building to add its first files."));
  }
  else if(a==='syreq'){
    var em=($('#syemail')||{}).value;em=String(em||'').trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)){SYNC.msg=_t("Enter a valid email address.");render();return;}
    SYNC.busy=true;SYNC.msg=_t("Sending…");SYNC.link='';render();
    api('POST','/api/auth/request',{email:em}).then(function(r){
      SYNC.busy=false;
      if(r.ok){SYNC.msg=_t("Check your inbox for the sign-in link. It works once and expires in 15 minutes.");SYNC.link=r.devLink||'';}
      else if(r.status===503)SYNC.msg=_t("Email sending is not set up on this site yet.");
      else if(r.status===400)SYNC.msg=_t("That email address does not look right.");
      else SYNC.msg=r.offline?_t("You are offline."):_t("Could not send the link. Try again in a minute.");
      render();
    });
  }
  else if(a==='sycodenew'){codeEnter('',true);}
  else if(a==='sycodein'){var cv=(($('#sycode')||{}).value||'').trim();if(!cv){SYNC.msg=_t("Enter your sync code.");render();return;}codeEnter(cv,false);}
  else if(a==='sycopy'){var cc=SYNC.newCode||codeStored();try{navigator.clipboard.writeText(cc).then(function(){toast(_t("Code copied."));},function(){toast(_t("Select the code and copy it."));});}catch(e){toast(_t("Select the code and copy it."));}}
  else if(a==='sycodedl'){try{var bl=new Blob([_t("Booklyn sync code: ")+SYNC.newCode+_t("\nKeep this file private. Anyone with the code can open your progress.\n")],{type:'text/plain'}),la=document.createElement('a');la.href=URL.createObjectURL(bl);la.download='booklyn-sync-code.txt';document.body.appendChild(la);la.click();setTimeout(function(){URL.revokeObjectURL(la.href);la.remove();},1000);}catch(e){toast(_t("Could not create the file."));}}
  else if(a==='sycodedone'){SYNC.newCode='';render();}
  else if(a==='syshow'){SYNC.showCode=true;render();}
  else if(a==='syhide'){SYNC.showCode=false;render();}
  else if(a==='sylogout2'){codeStore('');ui.confirm=null;api('POST','/api/auth/logout',{}).then(function(){SYNC.me=null;SYNC.kind='';SYNC.uid='';SYNC.conflict=null;SYNC.msg='';SYNC.newCode='';SYNC.showCode=false;render();toast(_t("Signed out. Your progress stays on this device."));});}
  else if(a==='sysync'){SYNC.msg='';syncPull().then(function(){if(!SYNC.conflict&&SYNC.dirty)return syncPush();}).then(function(){if(!SYNC.msg&&!SYNC.conflict)toast(_t("Synced."));});}
  else if(a==='sylogout'&&SYNC.kind==='code'){ui.confirm='logout';render();}
  else if(a==='sylogout'){api('POST','/api/auth/logout',{}).then(function(){SYNC.me=null;SYNC.conflict=null;SYNC.msg='';SYNC.link='';render();toast(_t("Signed out. Your progress stays on this device."));});}
  else if(a==='sydel1'){ui.confirm='acct';render();}
  else if(a==='sydel2'){api('DELETE','/api/account',{}).then(function(r){ui.confirm=null;if(r.ok){codeStore('');SYNC.kind='';SYNC.uid='';SYNC.me=null;SYNC.base=0;SYNC.known='';SYNC.last=0;SYNC.conflict=null;SYNC.msg='';syncMeta();toast(_t("Your cloud data was deleted. Your progress stays on this device."));}else toast(_t("Could not delete just now. Try again."));render();});}
  else if(a==='sycloud'){if(SYNC.conflict&&syncAdopt(SYNC.conflict.state,SYNC.conflict.updatedAt))toast(_t("Using the cloud copy."));else render();}
  else if(a==='sydevice'){if(SYNC.conflict){SYNC.base=SYNC.conflict.updatedAt;SYNC.conflict=null;SYNC.dirty=true;syncMeta();syncPush().then(function(){toast(_t("Using this device. The cloud copy was replaced."));render();});}}
  else if(a==='scanilias'){if(!ui.ilias.busy)scanIlias();}
  else if(a==='ilreport'){var rep=ui.ilias.report||'';try{navigator.clipboard.writeText(rep).then(function(){ui.ilias.status=_t("Scan report copied. Paste it in the chat.");render();},function(){ui.ilias.status=_t("Could not copy. Your browser blocked the clipboard.");render();});}catch(e){ui.ilias.status=_t("Could not copy the report.");render();}}
  else if(a==='iliasimport'){if(!ui.ilias.busy)importIlias(b.dataset.key);}
  else if(a==='iliasall'){if(!ui.ilias.busy)importAllIlias();}
  else if(a==='ilfilter'){ui.ilias.filter=b.dataset.f;render();}
  else if(a==='ildismiss'){state.iliasDismissed[b.dataset.key]=Date.now();save();render();}
  else if(a==='ilrestore'){delete state.iliasDismissed[b.dataset.key];save();render();}
  else if(a==='pickfiles'){ui.preset=null;$('#fi').click();}
  else if(a==='pickfolder'){ui.preset=null;$('#fd').click();}
  else if(a==='pickhere'){ui.preset={mod:b.dataset.mod,unit:+b.dataset.unit};$('#fi').click();}
  else if(a==='samples'){sampleFiles();}
  else if(a==='confirm'){var f=fileById(id);if(f){IM.commitPatch(fileStore,[f],function(){return {confirmed:true};}).then(function(r){if(!r.ok)toast(saveErr(r.error));render();});}}
  else if(a==='import'){
    if(ui.busyImport)return;
    ui.busyImport=true;render();
    /* the files are marked as imported only after the browser confirmed the write */
    IM.commitPatch(fileStore,pending().filter(eligible),function(){return {status:'imported'};}).then(function(r){
      ui.busyImport=false;
      if(!r.ok){render();toast(_t("Import failed. ")+ST.explainStorageError(r.error)+_t(" Your files are still waiting in the Port. Try again."));return;}
      state.lastImport=r.changed;save();render(true);toast(r.changed.length+_pl(r.changed.length,' file',' files')+_t(" imported. Your floors are ready."));
    });
  }
  else if(a==='undo'){
    var back=state.lastImport.map(fileById).filter(Boolean);
    IM.commitPatch(fileStore,back,function(){return {status:'pending',confirmed:true};}).then(function(r){
      if(!r.ok){toast(_t("Could not undo the import. ")+ST.explainStorageError(r.error)+_t(" Nothing was changed."));return;}
      state.lastImport=[];save();render(true);toast(_t("Import undone. The files are back in the Port."));
    });
  }
  else if(a==='open'){openFile(id);}
  else if(a==='del1'){ui.confirm=id;render();}
  else if(a==='del0'){ui.confirm=null;render();}
  else if(a==='rmdups'){var gone=pending().filter(isDupRow),gids=gone.map(function(f){return f.id;});IM.removeFiles(fileStore,gids).then(function(r){if(!r.ok){toast(_t("Could not remove the duplicates. ")+ST.explainStorageError(r.error));return;}var ids={};gids.forEach(function(i){ids[i]=1;});FILES=FILES.filter(function(f){return !ids[f.id];});render();toast(gone.length+_pl(gone.length,' duplicate removed.',' duplicates removed.'));});}
  else if(a==='del2'){IM.removeFiles(fileStore,[id]).then(function(r){if(!r.ok){toast(_t("Could not remove the file. ")+ST.explainStorageError(r.error));return;}FILES=FILES.filter(function(f){return f.id!==id;});ui.confirm=null;render();toast(_t("File removed."));});}
  else if(a==='retryfailed'){
    var fl=ui.failed?ui.failed.items:[];ui.failed=null;
    var groups={};fl.forEach(function(x){var gk=JSON.stringify(x.preset);(groups[gk]=groups[gk]||{preset:x.preset,files:[]}).files.push(x.file);});
    Object.keys(groups).reduce(function(pr,gk){return pr.then(function(){return addFiles(groups[gk].files,groups[gk].preset);});},Promise.resolve());
  }
  else if(a==='dismissfailed'){ui.failed=null;render();}
  else if(a==='timer'){if(study.running)pauseTimer();else startTimer();render();var btn=$('#tbtn');if(btn)btn.focus();}
  else if(a==='treset'){pauseTimer();study.remaining=1500;render();}
  else if(a==='tocheck'){pauseTimer();goCheck();}
  else if(a==='badq'){reportBad(b.dataset.why);render();}
  else if(a==='pick'){var i=+b.dataset.i,qz=study.quiz||quizFor(M(study.k.split(':')[0]),+study.k.split(':')[1]),q=qz[study.q],ok=i===q.a;study.picked=i;if(ok)study.score++;study.answers[study.q]={q:q,ok:ok,bad:false};if(q.k){var bk=bankGet(q.k);QC.recordAnswer(bk,q.id,ok);bankPut(q.k,bk);}render();var nb=document.querySelector('[data-a="nextq"]');if(nb)nb.focus();}
  else if(a==='nextq'){var qz2=study.quiz||quizFor(M(study.k.split(':')[0]),+study.k.split(':')[1]);if(study.q<qz2.length-1){study.q++;study.picked=null;render(true);}else{finishQuiz();render(true);}}
  else if(a==='retryprep'){goCheck();}
  else if(a==='togready'){ui.readyOpen=!ui.readyOpen;var ty=window.scrollY;render();window.scrollTo(0,ty);}
  else if(a==='finishself'){study.score=study.checks.filter(Boolean).length;finishQuiz();render(true);}
  else if(a==='retry'){var k=study.k;study=newStudy(k);study.step='check';goCheck();}
  else if(a==='adddl'){
    var d=ui.dl;if(!d.title.trim()||!d.date){toast(_t("Add a title and a date."));return;}
    state.deadlines.push({id:uid(),date:d.date,mod:d.mod,kind:d.kind,title:d.title.trim()});ui.dl=null;save();render();toast(_t("Deadline added."));
  }
  else if(a==='deldl'){state.deadlines=state.deadlines.filter(function(x){return x.id!==id;});save();render();}
  else if(a==='theme'){state.theme=b.dataset.v;save();render();}
  else if(a==='finish'){var s=curSem();s.finished=!s.finished;save();render();}
  else if(a==='rmsem1'){ui.confirm='sem';render();}
  else if(a==='rmsem2'){
    var sm=curSem(),gone2=FILES.filter(function(f){return f.sem===sm.id;});
    IM.removeFiles(fileStore,gone2.map(function(f){return f.id;})).then(function(r){
      if(!r.ok){toast(_t("Could not remove the files. ")+ST.explainStorageError(r.error)+_t(" Nothing was changed."));return;}
      FILES=FILES.filter(function(f){return f.sem!==sm.id;});
      var ids={};sm.modules.forEach(function(m){ids[m.id]=1;});
      Object.keys(state.lit).forEach(function(k){if(ids[k.split(':')[0]])delete state.lit[k];});
      Object.keys(state.how).forEach(function(k){if(ids[k.split(':')[0]])delete state.how[k];});
      state.deadlines=state.deadlines.filter(function(d){return !ids[d.mod];});
      state.sems=state.sems.filter(function(x){return x.id!==sm.id;});state.activeSem=state.sems.length?state.sems[0].id:null;
      ui.confirm=null;save();go('#/');toast(_t("Semester removed."));
    });
  }
  else if(a==='persist'){try{navigator.storage.persist().then(function(ok){toast(ok?_t("The browser will keep your data."):_t("The browser did not agree. Keep your originals."));storageInfo();});}catch(x){toast(_t("Not available in this browser."));}}
  else if(a==='dlbackup'){if(dlBackup()){toast(_t("Backup downloaded. Keep the file somewhere safe."));render();}else toast(_t("Could not create the file. Use the backup text below."));}
  else if(a==='loadbackup'){var bf=$('#bkfile');if(bf)bf.click();}
  else if(a==='dlfull'){fullBackup();}
  else if(a==='snoozebk'){state.snoozeBackup=Date.now()+3*864e5;save();render();}
  else if(a==='export'){$('#bk').value=BK.lightBackupText(state);$('#bk').select();toast(_t("Backup text created. Copy it now."));}
  else if(a==='restore'){var txt=$('#bk').value;if(!txt.trim()){toast(_t("Paste the backup text first."));return;}startRestore(new Blob([txt]));}
  else if(a==='rmerge'){applyRestore('merge');}
  else if(a==='rreplace'){applyRestore('replace');}
  else if(a==='rcancel'){ui.restore=null;render();}
  else if(a==='reset1'){ui.confirm='all';render();}
  else if(a==='reset2'){IM.removeFiles(fileStore,FILES.map(function(f){return f.id;})).then(function(r){if(!r.ok){toast(_t("Could not delete the files. ")+ST.explainStorageError(r.error)+_t(" Nothing was changed."));return;}FILES=[];clearBanks();var th=state.theme;state=blank();state.theme=th;ui.confirm=null;ui.setup=null;ui.failed=null;ui.restore=null;save();go('#/');toast(_t("Everything was deleted."));});}
});
document.addEventListener('change',function(e){
  var t=e.target,c=t.dataset.c;
  if(t.id==='bkfile'){var bf=t.files&&t.files[0];if(!bf)return;startRestore(bf);t.value='';return;}
  if(t.id==='fi'||t.id==='fd'){var files=t.files,p=ui.preset;ui.preset=null;addFiles(files,p).then(function(){t.value='';});return;}
  if(t.dataset.dl){ui.dl[t.dataset.dl]=t.value;return;}
  if(!c)return;
  if(c==='lang'){setLang(t.value);render(false);return;}
  if(c==='sem'){if(t.value==='__new'){ui.setup=null;go('#/setup');}else{state.activeSem=t.value;ui.cityT={x:0,y:0,k:1};save();render();}}
  else if(c==='seen'){if(t.checked)state.seen[t.dataset.id]=true;else delete state.seen[t.dataset.id];save();render();}
  else if(c==='dead'){if(t.checked)state.tasksDone[t.dataset.id]=true;else delete state.tasksDone[t.dataset.id];save();render();}
  else if(c==='shopmod'){ui.shopMod=t.value;render();}
  else if(c==='pin'){var pk=t.dataset.k;if(t.checked)state.pin[pk]=true;else delete state.pin[pk];save();render();toast(t.checked?_t("Pinned. This light stays on and pays no rent."):_t("Unpinned. The light follows the normal rules again."));}
  else if(c==='aiopt'){state.aiOpt=t.checked;save();}
  else if(c==='unl'){if(!isAdminNow())return;try{if(t.checked)localStorage.setItem('booklyn:unl','1');else localStorage.removeItem('booklyn:unl');}catch(e){}if(t.checked&&state.coins<999999){state.coins=999999;save();}render();toast(t.checked?_t("Unlimited coins on."):_t("Unlimited coins off."));}
  else if(c==='ilmap'){if(t.value)state.iliasCourseMap[t.dataset.k]=t.value;else delete state.iliasCourseMap[t.dataset.k];save();render();}
  else if(c==='self'){study.checks[+t.dataset.i]=t.checked;render();var cb=document.querySelectorAll('[data-c="self"]')[+t.dataset.i];if(cb)cb.focus();}
  else{
    var row=t.closest('[data-f]'),f=row&&fileById(row.dataset.f);if(!f)return;
    var patch={};
    if(c==='inc'){patch.include=t.checked;if(t.checked&&f.dup)patch.confirmed=true;}
    else if(c==='mod'){patch.mod=t.value;var m2=M(t.value);if(m2&&f.unit>m2.units)patch.unit=m2.units;patch.confirmed=true;}
    else if(c==='unit'){patch.unit=+t.value;patch.confirmed=true;}
    var y=window.scrollY;
    IM.commitPatch(fileStore,[f],function(){return patch;}).then(function(r){if(!r.ok)toast(saveErr(r.error));render();window.scrollTo(0,y);});
  }
});
document.addEventListener('input',function(e){
  var t=e.target;
  if(t.id==='note'){state.notes[t.dataset.k]=t.value;save();}
  else if(t.id==='utitle'){var p=t.dataset.k.split(':'),m=M(p[0]);if(m){m.titles[+p[1]-1]=t.value||(_t("Week ")+p[1]);save();}}
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
function setAccount(r){SYNC.kind=r.kind||'email';SYNC.me=r.kind==='code'?_t("Sync code"):(r.email||'');SYNC.uid=r.uid||'';SYNC.admin=!!r.admin;if(r.admin===undefined)adminCheck();}
/* Admin is decided by the server (ADMIN_EMAILS / ADMIN_UIDS in Cloudflare). Asking /api/me is the only way to learn it. */
function adminCheck(){api('GET','/api/me').then(function(m){var a=!!(m&&m.ok&&m.admin);if(a!==SYNC.admin){SYNC.admin=a;render();}});}
function isAdminNow(){return !!(SYNC.me&&SYNC.admin);}
function localDev(){var h=location.hostname;return h==='localhost'||h==='127.0.0.1'||h==='[::1]'||/\.localhost$/.test(h);}
function unlOn(){if(!isAdminNow())return false;try{return localStorage.getItem('booklyn:unl')==='1';}catch(e){return false;}}
function canPay(c){return unlOn()||state.coins>=c;}
function pay(c){if(!unlOn())state.coins-=c;}
/* Testing tools: for admin accounts, or on a local development address. A ?dev=1 link on the public site does nothing. */
function devOn(){if(isAdminNow())return true;try{return localDev()&&localStorage.getItem('booklyn:dev')==='1';}catch(e){return false;}}
function syncRender(){
  if(route().name!=='settings'&&!SYNC.conflict)return;
  var ae=document.activeElement;if(ae&&ae.id==='syemail')return;
  render();
}
function syncSchedule(){clearTimeout(SYNC.timer);SYNC.timer=setTimeout(function(){syncPush();},4000);}
function syncAdopt(remote,updatedAt){
  var s2=remote;
  if(!s2||typeof s2.schema!=='number'){SYNC.msg=_t("The cloud copy could not be read.");return false;}
  if(s2.schema>SCHEMA){SYNC.msg=_t("The cloud copy comes from a newer version of Booklyn. Reload this page to update.");return false;}
  try{if(state.sems.some(function(x){return !x.demo;}))localStorage.setItem(KEY+'.beforesync',JSON.stringify(state));}catch(e){}
  while(s2.schema<SCHEMA){var mg=MIGRATIONS[s2.schema];if(!mg){SYNC.msg=_t("The cloud copy could not be read.");return false;}s2=mg(s2);}
  try{s2=clean(s2);}catch(e){SYNC.msg=_t("The cloud copy looks damaged, so it was not used.");return false;}
  SYNC.adopting=true;state=s2;save();SYNC.adopting=false;
  SYNC.base=updatedAt;SYNC.dirty=false;SYNC.last=Date.now();SYNC.conflict=null;SYNC.msg='';syncMeta();
  render(true);return true;
}
async function syncPull(){
  if(!SYNC.me||readOnly)return;
  SYNC.busy=true;var r=await api('GET','/api/state');SYNC.busy=false;
  if(!r.ok){if(r.status===401){SYNC.me=null;SYNC.msg=_t("You were signed out. Sign in again to sync.");}else SYNC.msg=r.offline?_t("Offline. Your progress will sync when you are back online."):_t("Could not reach the cloud.");syncRender();return;}
  var hasLocal=state.sems.some(function(x){return !x.demo;});
  if(!r.state){if(hasLocal){SYNC.base=0;await syncPush();}else{SYNC.base=0;SYNC.dirty=false;syncMeta();}syncRender();return;}
  if(SYNC.base===r.updatedAt){if(SYNC.dirty&&hasLocal)await syncPush();else{SYNC.dirty=false;syncMeta();}syncRender();return;}
  if(!hasLocal||(SYNC.base&&!SYNC.dirty)){if(syncAdopt(r.state,r.updatedAt))toast(_t("Your progress was updated from the cloud."));syncRender();return;}
  SYNC.conflict={state:r.state,updatedAt:r.updatedAt};
  toast(_t("Your cloud copy and this device differ. Open Settings to choose."));syncRender();
}
async function syncPush(keep){
  if(!SYNC.me||SYNC.pushing||readOnly||SYNC.conflict)return;
  clearTimeout(SYNC.timer);SYNC.pushing=true;
  var r=await api('PUT','/api/state',{state:state,base:SYNC.base},keep);SYNC.pushing=false;
  if(r.ok){SYNC.base=r.updatedAt;SYNC.dirty=false;SYNC.last=Date.now();SYNC.msg='';syncMeta();}
  else if(r.status===409){await syncPull();return;}
  else if(r.status===401){SYNC.me=null;SYNC.msg=_t("You were signed out. Sign in again to sync.");}
  else SYNC.msg=r.offline?_t("Offline. Your progress will sync when you are back online."):_t("Could not sync just now.");
  syncRender();
}
async function syncInit(){
  if(readOnly)return;
  var tk=null;try{tk=new URL(location.href).searchParams.get('token');}catch(e){}
  if(tk){
    try{history.replaceState(null,'',location.pathname+location.hash);}catch(e){}
    var v=await api('POST','/api/auth/verify',{token:tk});
    if(v.ok){setAccount(v);toast(_t("Signed in as ")+v.email+'.');}
    else{SYNC.msg=_t("That sign-in link has expired or was already used. Ask for a new one in Settings.");toast(SYNC.msg);}
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
  if(!r.ok){SYNC.msg=r.status===429?_t("Too many tries. Wait a little and try again."):r.status===404||r.status===400?_t("That code was not found. Check it and try again."):r.status===404?'':(r.offline?_t("You are offline."):_t("Could not reach the server. Try again."));render();return;}
  var c=isNew?r.code:code;codeStore(c);setAccount({kind:'code',uid:r.uid});
  if(isNew)SYNC.newCode=c;
  if(SYNC.known&&SYNC.known!==SYNC.uid)SYNC.base=0;SYNC.known=SYNC.uid;syncMeta();
  await syncPull();render();
}
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden'&&SYNC.me&&SYNC.dirty&&!SYNC.conflict)syncPush(true);});
window.addEventListener('online',function(){if(SYNC.me&&SYNC.dirty)syncPush();});
function accountCard(){
  var h=("<section class=\"card stack\" id=\"account\"><h3>"+_t("Account and sync")+"</h3>");
  if(SYNC.na)return h+("<p class=\"lede\">"+_t("Accounts are not available on this address. Your progress stays on this device.")+"</p></section>");
  if(!SYNC.checked)return h+("<p class=\"lede\">"+_t("Checking…")+"</p></section>");
  if(SYNC.conflict){
    var cs=SYNC.conflict.state||{},cn=(cs.sems||[]).length,ln=state.sems.length,cl=Object.keys(cs.lit||{}).length,dl=Object.keys(state.lit||{}).length;
    h+=("<div class=\"notice warn stack\"><p style=\"margin:0\"><strong>"+_t("Your cloud copy and this device differ.")+"</strong>"+_t(" The cloud copy has "))+cn+_pl(cn,' semester',' semesters')+_t(" and ")+cl+_pl(cl,' lit floor',' lit floors')+_t(" (saved ")+new Date(SYNC.conflict.updatedAt).toLocaleString(LOC(),{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})+_t("). This device has ")+ln+_t(" and ")+dl+(_t(". Choose which one to keep. The other one is replaced, and a safety copy of this device stays in the browser.")+"</p>")
      +("<div class=\"row\"><button class=\"btn small\" data-a=\"sycloud\">"+_t("Use the cloud copy")+"</button><button class=\"btn small ghost\" data-a=\"sydevice\">"+_t("Use this device")+"</button></div></div>");
  }
  if(SYNC.me){
    h+='<p class="lede">'+(SYNC.kind==='code'?(_t("Signed in with a ")+"<strong>"+_t("sync code")+"</strong>. "):(_t("Signed in as ")+"<strong>")+esc(SYNC.me)+'</strong>. ')+(SYNC.last?_t("Last synced: ")+new Date(SYNC.last).toLocaleString(LOC(),{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})+'. ':'')+(SYNC.dirty&&!SYNC.conflict?_t("Changes waiting to sync."):'')+'</p>'
     +(SYNC.newCode?("<div class=\"notice stack\"><p style=\"margin:0\"><strong>"+_t("Your sync code. Save it now.")+"</strong>"+_t(" It is the only way to open your progress on another device, and nobody can recover it for you.")+"</p><p style=\"margin:0;font:700 1.25rem ui-monospace,Consolas,monospace;letter-spacing:.06em;word-break:break-all\">")+esc(SYNC.newCode)+("</p><div class=\"row\"><button class=\"btn small\" data-a=\"sycopy\">"+_t("Copy code")+"</button><button class=\"btn small ghost\" data-a=\"sycodedl\">"+_t("Download as a file")+"</button><button class=\"btn small ghost\" data-a=\"sycodedone\">"+_t("I saved it")+"</button></div></div>"):'')
     +(SYNC.kind==='code'&&!SYNC.newCode&&codeStored()?(SYNC.showCode?'<p style="margin:0;font:700 1.1rem ui-monospace,Consolas,monospace;letter-spacing:.06em;word-break:break-all">'+esc(codeStored())+("</p><div class=\"row\"><button class=\"btn small ghost\" data-a=\"sycopy\">"+_t("Copy code")+"</button><button class=\"btn small ghost\" data-a=\"syhide\">"+_t("Hide")+"</button></div>"):("<div class=\"row\"><button class=\"btn small ghost\" data-a=\"syshow\">"+_t("Show my sync code")+"</button></div>")):'')
     +(SYNC.msg?'<p class="foot" role="status">'+esc(SYNC.msg)+'</p>':'')
     +'<label class="check"><input type="checkbox" data-c="aiopt" '+(state.aiOpt?'checked':'')+("><div><div class=\"t\">"+_t("Let an AI write extra questions")+"</div><div class=\"s\">"+_t("Short text excerpts of your files (a few pages at a time) are sent to Cloudflare Workers AI. It reads the excerpt, writes questions and checks them before you see them. Files are never sent whole or stored. Off by default. Without it, Booklyn only asks about clear definitions it finds in your files, and says so when there is not enough material.")+"</div></div></label>")
     +'<div class="row"><button class="btn small" data-a="sysync" '+(SYNC.pushing||SYNC.busy?'disabled':'')+(">"+_t("Sync now")+"</button>")+(ui.confirm==='logout'?("<button class=\"btn small danger\" data-a=\"sylogout2\">"+_t("Sign out and forget the code here")+"</button><button class=\"btn small ghost\" data-a=\"del0\">"+_t("Cancel")+"</button>"):("<button class=\"btn small ghost\" data-a=\"sylogout\">"+_t("Sign out")+"</button>"))+'</div>'
     +'<div class="row">'+(ui.confirm==='acct'?("<button class=\"btn small danger\" data-a=\"sydel2\">"+_t("Yes, delete my cloud data")+"</button><button class=\"btn small ghost\" data-a=\"del0\">"+_t("Cancel")+"</button>"):("<button class=\"btn small ghost\" data-a=\"sydel1\">"+_t("Delete my cloud data…")+"</button>"))+'</div>';
  } else {
    h+=("<p class=\"lede\">"+_t("Optional. Keep your progress safe and use it on your phone and your computer. No email and no password: Booklyn gives you a secret sync code.")+"</p>")
     +'<div class="row"><button class="btn small" data-a="sycodenew" '+(SYNC.busy?'disabled':'')+(">"+_t("Create my sync code")+"</button></div>")
     +("<div class=\"row\"><input type=\"text\" id=\"sycode\" placeholder=\"XXXXX-XXXXX-XXXXX-XXXXX\" autocomplete=\"off\" autocapitalize=\"characters\" style=\"flex:1 1 220px\" aria-label=\""+_t("Your sync code")+"\"><button class=\"btn small ghost\" data-a=\"sycodein\" ")+(SYNC.busy?'disabled':'')+(">"+_t("I already have a code")+"</button></div>")
     +(SYNC.msg?'<p class="foot" role="status">'+esc(SYNC.msg)+'</p>':'')
     +("<details><summary class=\"foot\" style=\"cursor:pointer\">"+_t("Prefer an email link?")+"</summary><div class=\"stack\" style=\"margin-top:8px\"><div class=\"row\"><input type=\"email\" id=\"syemail\" placeholder=\""+_t("you@example.com")+"\" autocomplete=\"email\" style=\"flex:1 1 220px\" aria-label=\""+_t("Your email address")+"\"><button class=\"btn small ghost\" data-a=\"syreq\" ")+(SYNC.busy?'disabled':'')+(">"+_t("Send me a link")+"</button></div>")+(SYNC.link?("<p class=\"foot\">"+_t("Local test link: ")+"<a href=\"")+esc(SYNC.link)+("\">"+_t("sign in")+"</a></p>"):'')+'</div></details>';
  }
  return h+("<p class=\"foot\">"+_t("Only your progress (semesters, modules, lights, coins, notes and deadlines) is stored in the cloud. Your files never leave this device. If you sign in by email, the address is used only to send sign-in links. You can delete everything at any time.")+"</p></section>");
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
