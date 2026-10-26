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
 set:'<path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6"/>'
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
  return {schema:SCHEMA,name:'',theme:'system',activeSem:null,sems:[],lit:{},seen:{},notes:{},tasksDone:{},deadlines:[],lastImport:[]};
}
function fill(s){var d=blank();Object.keys(d).forEach(function(k){if(s[k]===undefined)s[k]=d[k];});return s;}
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
var saveT;
function save(){
  if(readOnly) return; clearTimeout(saveT);
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
  if(state.lit[m.id+':'+u]) return 'lit';
  var ms=mats(m,u); if(!ms.length) return 'empty';
  if(ms.some(function(x){return state.seen[x.id];})) return 'progress';
  return 'ready';
}
function litCount(m){var n=0;for(var u=1;u<=m.units;u++) if(state.lit[m.id+':'+u]) n++;return n;}
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
  if(mod&&(unit<1||unit>mod.units)) unit=0;
  var why;
  if(mod&&unit) why='Matched '+best.hits.slice(0,2).join(', ')+' and unit '+unit;
  else if(mod) why='Matched '+best.hits.slice(0,2).join(', ')+', but no week number in the name';
  else if(best&&second===best.sc) why='Several modules match this name';
  else if(unit) why='Found week '+unit+' but no module';
  else why='No module or week found in the name';
  return {mod:mod?mod.id:'',unit:unit,sure:!!(mod&&unit),why:why};
}

/* ================= adding files ================= */
async function addFiles(list,preset){
  var sem=curSem(); if(!sem){toast('Set up a semester first.');return;}
  var arr=Array.prototype.slice.call(list); if(!arr.length) return;
  try{if(navigator.storage&&navigator.storage.persist) navigator.storage.persist();}catch(e){}
  var added=0,dups=0,failed=0,ids=[];
  for(var i=0;i<arr.length;i++){
    var f=arr[i];
    toast('Adding '+(i+1)+' of '+arr.length+'…',true);
    var h=await sha(f), dup=h?FILES.filter(function(x){return x.hash===h;})[0]:null;
    var rec={id:uid(),name:f.name,path:f.webkitRelativePath||'',size:f.size,type:f.type,mtime:f.lastModified,hash:h,addedAt:Date.now(),sem:sem.id,dup:null};
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
function chip(st){var t={lit:'Lights on',progress:'In progress',ready:'Ready',empty:'Waiting for files'}[st];return '<span class="chip s-'+st+'">'+t+'</span>';}

/* ================= routing ================= */
var memHash='#/';try{memHash=location.hash||'#/';}catch(e){}
var lastRendered=null, study=null, ui={tab:'units',q:'',preset:null,setup:null,dl:null,confirm:null};
function cur(){return memHash;}
function go(to){memHash=to;try{if(location.hash!==to)location.hash=to;}catch(e){}render(true);}
function route(){
  var p=cur().replace(/^#\/?/,'').split('/').filter(Boolean);
  if(!p.length) return {name:'campus'};
  if(p[0]==='port') return {name:'port'};
  if(p[0]==='deadlines') return {name:'deadlines'};
  if(p[0]==='settings') return {name:'settings'};
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
function foot(){return '<p class="disclaimer">Unofficial student project, not affiliated with HSLU. Your files and progress stay on this device. Nothing is tracked.</p>';}

function vWelcome(){
  return '<section class="hero"><p class="eyebrow">Welcome</p><h1 tabindex="-1" id="h1">Booklyn</h1><p class="motto">Keep your lights on.</p>'
   +'<p class="lede">A study app for students that turns each week’s course material into a city you light up as you learn, so you always know what to study next.</p>'
   +'<div class="row"><button class="btn" data-a="newsem">Build my first semester</button><button class="btn ghost" data-a="demo">Try the demo</button></div></section>'
   +'<section class="card stack"><h3>How it works</h3><p class="lede">Your degree is a city. A semester is a district, a module is a building and each teaching unit is a floor. Add your files, study a unit, pass the short check, and the light goes on.</p></section>'+foot();
}

function vCampus(){
  var sem=curSem(); if(!sem) return vWelcome();
  var n=nextUp(sem),p=pending().length,t=totals(sem),pct=t.t?Math.round(t.l/t.t*100):0;
  var ups=semDeadlines(sem).filter(function(d){return !state.tasksDone[d.id]&&daysTo(d)>=0;}).sort(function(a,b){return pdate(a.date)-pdate(b.date);}).slice(0,3);
  var h='<header class="stack"><div class="sem"><p class="eyebrow">Week '+weekNo(sem)+' · '+fmt(new Date())+'</p></div>'
   +'<div class="sem"><label class="sr" for="semsel">Semester</label><select id="semsel" data-c="sem">'+state.sems.map(function(s){return '<option value="'+s.id+'"'+(s.id===sem.id?' selected':'')+'>'+esc(s.name)+(s.finished?' (finished)':'')+'</option>';}).join('')+'<option value="__new">＋ New semester…</option></select></div>'
   +'<h1 tabindex="-1" id="h1">'+(state.name?'Hello, '+esc(state.name):'Keep your lights on')+'</h1>'
   +'<p class="lede">'+t.l+' of '+t.t+' floors have their lights on.</p></header>';
  h+='<section class="card stack" aria-label="Your district"><div class="sky">'
   +sem.modules.map(function(m){return '<button class="bld" data-a="go" data-to="#/m/'+m.id+'" aria-label="'+esc(m.name)+', '+litCount(m)+' of '+m.units+' lights on">'+building(m)+'<span class="code">'+esc(m.code)+'</span></button>';}).join('')
   +'</div><div class="legend"><span><i class="dot l"></i>Lights on</span><span><i class="dot p"></i>In progress</span><span><i class="dot"></i>Ready</span><span><i class="dot e"></i>Waiting for files</span></div>'
   +'<div class="bar" role="progressbar" aria-label="Lights on" aria-valuemin="0" aria-valuemax="'+t.t+'" aria-valuenow="'+t.l+'"><i style="width:'+pct+'%"></i></div></section>';
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
function vPort(){
  var sem=curSem(); if(!sem) return vWelcome();
  var list=pending();
  var h='<header class="stack"><p class="eyebrow">Learning Port</p><h1 tabindex="-1" id="h1">Add and sort files</h1><p class="lede">Any file type and any size. Booklyn suggests a module and week from the file name. You decide. Files marked “Check this” stay here until you confirm them.</p></header>';
  h+='<section class="drop" data-drop><h2>Drop files here</h2><p class="lede">or choose them from your computer or phone</p><div class="row" style="justify-content:center"><button class="btn" data-a="pickfiles">Choose files</button><button class="btn ghost" data-a="pickfolder">Choose a folder</button></div></section>';
  if(state.lastImport.length&&!list.length){
    var by={};state.lastImport.forEach(function(id){var f=FILES.filter(function(x){return x.id===id;})[0];if(f&&f.status==='imported'){by[f.mod]=(by[f.mod]||0)+1;}});
    h+='<section class="card stack"><h3>Imported</h3><div class="row tight">'+Object.keys(by).map(function(k){var m=M(k);return m?'<button class="chip" data-a="go" data-to="#/m/'+m.id+'" style="border:0;cursor:pointer">'+esc(m.code)+' · '+by[k]+'</button>':'';}).join('')+'</div><div class="row"><button class="btn ghost small" data-a="undo">Undo this import</button></div></section>';
  }
  if(!list.length){
    h+='<section class="card stack"><h3>Nothing waiting</h3><p class="lede">Add files above. Want to try it first?</p><div class="row"><button class="btn ghost small" data-a="samples">Add 6 sample files</button></div></section>';
    return h;
  }
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
      h+='<li><button class="item '+st+'" data-a="go" data-to="#/m/'+m.id+'/'+u+'"><span class="floor" style="--h:'+m.h+'">'+u+'</span><div class="grow"><div class="t">'+esc(m.titles[u-1])+'</div><div class="s">'+(n?n+' file'+(n>1?'s':''):'No files yet')+'</div></div>'+chip(st)+'</button></li>';
    }
    h+='</ul>';
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
  var h='<button class="back" data-a="go" data-to="#/m/'+m.id+'">← '+esc(m.code)+'</button><header class="stack"><p class="eyebrow">'+esc(m.code)+' · Floor '+u+'</p><h1 tabindex="-1" id="h1">'+esc(m.titles[u-1])+'</h1><div class="row">'+chip(st)+'</div></header>';
  if(!ms.length) h+='<section class="card stack"><h3>This floor is waiting for files</h3><p class="lede">Add the material for this unit and the floor is ready for a study block.</p><div class="row"><button class="btn" data-a="pickhere" data-mod="'+m.id+'" data-unit="'+u+'">Add files here</button><button class="btn ghost" data-a="go" data-to="#/port">Open the Port</button></div></section>';
  else h+='<section class="card stack"><h2>Study block</h2><p class="lede">Focus for 25 minutes, then do a short check. Pass it and the light goes on.</p><div class="row"><button class="btn" data-a="go" data-to="#/m/'+m.id+'/'+u+'/study">Start block</button></div></section>'
   +'<section class="stack"><div class="row between"><h2>Material</h2><button class="btn small ghost" data-a="pickhere" data-mod="'+m.id+'" data-unit="'+u+'">Add files here</button></div><div class="stack">'+ms.map(function(x){return matRow(m,u,x);}).join('')+'</div></section>';
  h+='<section class="stack"><label class="f" for="utitle">Unit name<input type="text" id="utitle" data-k="'+k+'" value="'+esc(m.titles[u-1])+'" maxlength="80"></label>'
   +'<label class="f" for="note">Notes<textarea id="note" data-k="'+k+'" placeholder="Terms you could not explain, questions for the lecturer…">'+esc(state.notes[k]||'')+'</textarea></label><p class="foot">Saved on this device while you type.</p></section>';
  h+='<div class="row between">'+(u>1?'<button class="btn ghost small" data-a="go" data-to="#/m/'+m.id+'/'+(u-1)+'">← Week '+(u-1)+'</button>':'<span></span>')+(u<m.units?'<button class="btn ghost small" data-a="go" data-to="#/m/'+m.id+'/'+(u+1)+'">Week '+(u+1)+' →</button>':'')+'</div>';
  return h;
}

function mmss(s){return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}
function quizFor(m,u){var s=semOf(m.id);return s&&s.demo?QUIZ[m.code.toLowerCase()+':'+u]:null;}
function vStudy(r){
  var m=r.m,u=r.u,k=m.id+':'+u,quiz=quizFor(m,u);
  if(!study||study.k!==k) study={k:k,step:'focus',remaining:1500,end:null,running:false,q:0,score:0,picked:null,checks:[false,false,false],passed:false};
  var steps='<div class="steps" aria-hidden="true"><i class="on"></i><i class="'+(study.step!=='focus'?'on':'')+'"></i><i class="'+(study.step==='result'?'on':'')+'"></i></div>';
  var h='<button class="back" data-a="leave" data-to="#/m/'+m.id+'/'+u+'">← Leave block</button><header class="stack"><p class="eyebrow">'+esc(m.code)+' · Floor '+u+'</p><h1 tabindex="-1" id="h1">'+esc(m.titles[u-1])+'</h1>'+steps+'</header>';
  if(study.step==='focus'){
    h+='<section class="card stack"><p class="eyebrow">1 · Focus</p><div class="timer" id="tm">'+mmss(study.remaining)+'</div><div class="bar"><i id="tb" style="width:'+Math.round((1500-study.remaining)/15)+'%"></i></div>'
     +'<div class="row" style="justify-content:center"><button class="btn" data-a="timer" id="tbtn">'+(study.running?'Pause':(study.remaining<1500?'Resume':'Start 25 minutes'))+'</button><button class="btn ghost" data-a="treset">Reset</button></div>'
     +'<p class="foot" style="text-align:center">'+mats(m,u).map(function(x){return esc(x.name);}).join(' · ')+'</p></section>'
     +'<div class="row between"><span class="foot">Already studied this unit?</span><button class="btn ghost" data-a="tocheck">Skip to the check</button></div>';
  } else if(study.step==='check'&&quiz){
    var q=quiz[study.q],L=['A','B','C'];
    h+='<section class="card stack"><p class="eyebrow">2 · Check · Question '+(study.q+1)+' of 3</p><h2>'+esc(q.q)+'</h2><div class="stack">'
     +q.o.map(function(o,i){var cls=study.picked===null?'':(i===q.a?' right':(i===study.picked?' wrong':''));return '<button class="opt'+cls+'" data-a="pick" data-i="'+i+'" '+(study.picked!==null?'disabled':'')+'><span class="k">'+L[i]+'</span><span>'+esc(o)+'</span></button>';}).join('')+'</div>'
     +(study.picked!==null?'<div class="notice" role="status"><strong>'+(study.picked===q.a?'Correct. ':'Not quite. ')+'</strong>'+esc(q.e)+'</div><div class="row"><button class="btn" data-a="nextq">'+(study.q<2?'Next question':'See result')+'</button></div>':'')+'</section>';
  } else if(study.step==='check'){
    var ps=['Explain “'+m.titles[u-1]+'” in one sentence without looking.','Name two terms from this unit that you could define to a friend.','Solve or sketch one exercise from the material.'];
    h+='<section class="card stack"><p class="eyebrow">2 · Self-check</p><h2>Tick what you can do without notes</h2><div class="stack">'
     +ps.map(function(p,i){return '<label class="check"><input type="checkbox" data-c="self" data-i="'+i+'" '+(study.checks[i]?'checked':'')+'><div class="t">'+esc(p)+'</div></label>';}).join('')+'</div>'
     +'<p class="foot">Pass with at least 2 of 3. Be honest. This is only for you.</p><div class="row"><button class="btn" data-a="finishself" '+(study.checks.filter(Boolean).length>=2?'':'disabled')+'>Finish</button></div></section>';
  } else {
    h+=study.passed
     ?'<section class="card stack" style="text-align:center"><div class="big">'+building(m,u)+'</div><h2>The light is on</h2><p class="lede" style="margin:0 auto">'+(quiz?study.score+' of 3 correct. ':'')+litCount(m)+' of '+m.units+' floors in '+esc(m.code)+' have their lights on.</p><div class="row" style="justify-content:center"><button class="btn" data-a="go" data-to="#/m/'+m.id+'">Back to '+esc(m.code)+'</button><button class="btn ghost" data-a="go" data-to="#/">Campus</button></div></section>'
     :'<section class="card stack"><h2>'+study.score+' of 3. One more pass.</h2><p class="lede">You need 2 correct to turn the light on. Re-read the material, then try again.</p><div class="row"><button class="btn" data-a="retry">Try again</button><button class="btn ghost" data-a="go" data-to="#/m/'+m.id+'/'+u+'">Back to material</button></div></section>';
  }
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
  var h='<header class="stack"><p class="eyebrow">New semester</p><h1 tabindex="-1" id="h1">Build your district</h1><p class="lede">A building for each module, a floor for each teaching unit. Most semesters have 14 weeks. You can rename units later.</p></header>';
  h+='<section class="card stack"><label class="f">Your name (optional)<input type="text" data-sb="name" value="'+esc(S.name)+'" maxlength="30"></label><div class="grid2"><label class="f">Semester name<input type="text" data-sb="sname" value="'+esc(S.sname)+'" maxlength="40"></label><label class="f">First teaching week starts<input type="date" data-sb="start" value="'+esc(S.start)+'"></label></div></section>';
  h+='<section class="stack"><h2>Modules</h2>'+S.mods.map(function(m,i){
    return '<div class="modrow"><div class="g"><label class="f">Code<input type="text" data-sb="mods.'+i+'.code" value="'+esc(m.code)+'" maxlength="8" placeholder="CNB"></label><label class="f">Name<input type="text" data-sb="mods.'+i+'.name" value="'+esc(m.name)+'" maxlength="60" placeholder="Computer Networks Basics"></label><label class="f">Units<input type="number" min="1" max="24" data-sb="mods.'+i+'.units" value="'+esc(m.units)+'"></label></div>'
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
  h+='<section class="card stack"><h3>Back up your progress</h3><p class="lede">This saves your semesters, lights, notes and deadlines as text. The files themselves are not included, so keep the originals.</p><textarea id="bk" aria-label="Backup text" spellcheck="false" placeholder="Press “Create backup text”"></textarea><div class="row"><button class="btn small" data-a="export">Create backup text</button><button class="btn small ghost" data-a="restore">Restore from text</button></div></section>';
  h+='<section class="card stack"><h3>Reset everything</h3><p class="lede">Deletes all semesters, progress and imported files from this device.</p><div class="row">'+(ui.confirm==='all'?'<button class="btn small danger" data-a="reset2">Yes, delete everything</button><button class="btn small ghost" data-a="del0">Cancel</button>':'<button class="btn small ghost" data-a="reset1">Reset…</button>')+'</div></section>';
  h+='<section class="stack"><h3>About</h3><p class="foot">Booklyn · saved-data schema '+SCHEMA+'. Older data is migrated automatically and backed up first. Data from a newer version is never overwritten.</p></section>'+foot();
  return h;
}

/* ================= shell ================= */
function nav(cur){
  var items=[['campus','Campus','#/','campus'],['port','Port','#/port','port'],['deadlines','Deadlines','#/deadlines','dead'],['settings','Settings','#/settings','set']];
  var on={module:'campus',unit:'campus',study:'campus',setup:'campus'}[cur]||cur,p=pending().length;
  return items.map(function(i){return '<button class="navbtn" data-a="go" data-to="'+i[2]+'" '+(on===i[0]?'aria-current="page"':'')+'><svg viewBox="0 0 24 24" aria-hidden="true">'+ICON[i[3]]+'</svg><span>'+i[1]+'</span>'+(i[0]==='port'&&p?'<span class="badge" aria-label="'+p+' files waiting">'+p+'</span>':'')+'</button>';}).join('');
}
function render(focus){
  var r=route(); lastRendered=cur();
  document.documentElement.removeAttribute('data-theme');
  if(state.theme==='light'||state.theme==='dark') document.documentElement.setAttribute('data-theme',state.theme);
  var body;
  if(!state.sems.length&&r.name!=='setup'&&r.name!=='settings') body=vWelcome();
  else body=r.name==='campus'?vCampus():r.name==='port'?vPort():r.name==='module'?vModule(r):r.name==='unit'?vUnit(r):r.name==='study'?vStudy(r):r.name==='deadlines'?vDeadlines():r.name==='setup'?vSetup():vSettings();
  if(r.name!=='study'&&study){pauseTimer();study=null;}
  $('#app').innerHTML='<nav class="rail" aria-label="Main"><div class="brand">Booklyn<small>Keep your lights on</small></div>'+nav(r.name)+'</nav><main class="main">'+body+'</main><nav class="tabbar" aria-label="Main">'+nav(r.name)+'</nav>';
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
    if(rem===0){pauseTimer();study.step='check';toast('Time is up. Now the check.');render(true);}
  },250);
}

/* ================= actions ================= */
function setLit(k){state.lit[k]=Date.now();var p=k.split(':'),m=M(p[0]);if(m)mats(m,+p[1]).forEach(function(x){state.seen[x.id]=true;});save();}
function finishQuiz(){study.step='result';study.passed=study.score>=2;if(study.passed)setLit(study.k);}
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
  else if(a==='leave'){pauseTimer();study=null;go(b.dataset.to);}
  else if(a==='tab'){ui.tab=b.dataset.v;render();}
  else if(a==='newsem'){ui.setup=null;go('#/setup');}
  else if(a==='demo'){seedDemo();save();go('#/');}
  else if(a==='addmod'){ui.setup.mods.push({code:'',name:'',units:14,kw:''});render();}
  else if(a==='rmmod'){ui.setup.mods.splice(+b.dataset.i,1);render();}
  else if(a==='buildsem'){
    var S=ui.setup,mods=S.mods.filter(function(m){return String(m.code).trim()&&String(m.name).trim();});
    if(!mods.length){toast('Add at least one module with a code and a name.');return;}
    var sem={id:uid(),name:String(S.sname).trim()||'Semester',start:S.start||'',demo:false,finished:false,modules:[]};
    mods.forEach(function(m,i){
      var code=String(m.code).trim().toUpperCase().slice(0,8),n=clamp(parseInt(m.units,10)||14,1,24),t=[];
      for(var u=1;u<=n;u++)t.push('Week '+u);
      sem.modules.push({id:uid(),code:code,name:String(m.name).trim(),h:HUES[(state.sems.length*3+i)%HUES.length],units:n,kw:String(m.kw).trim()||ALIASES[code]||'',titles:t,base:{}});
    });
    if(S.name)state.name=S.name;
    state.sems.push(sem);state.activeSem=sem.id;ui.setup=null;save();go('#/');toast('Your district is ready.');
  }
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
  else if(a==='del2'){dbDel(id).then(function(){FILES=FILES.filter(function(f){return f.id!==id;});ui.confirm=null;render();toast('File removed.');});}
  else if(a==='timer'){if(study.running)pauseTimer();else startTimer();render();var btn=$('#tbtn');if(btn)btn.focus();}
  else if(a==='treset'){pauseTimer();study.remaining=1500;render();}
  else if(a==='tocheck'){pauseTimer();study.step='check';render(true);}
  else if(a==='pick'){var i=+b.dataset.i,q=quizFor(M(study.k.split(':')[0]),+study.k.split(':')[1])[study.q];study.picked=i;if(i===q.a)study.score++;render();var nb=document.querySelector('[data-a="nextq"]');if(nb)nb.focus();}
  else if(a==='nextq'){if(study.q<2){study.q++;study.picked=null;render(true);}else{finishQuiz();render(true);}}
  else if(a==='finishself'){study.score=study.checks.filter(Boolean).length;finishQuiz();render(true);}
  else if(a==='retry'){var k=study.k;study={k:k,step:'check',remaining:1500,end:null,running:false,q:0,score:0,picked:null,checks:[false,false,false],passed:false};render(true);}
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
  else if(a==='export'){$('#bk').value=JSON.stringify(state);$('#bk').select();toast('Backup text created. Copy it now.');}
  else if(a==='restore'){
    try{var s2=JSON.parse($('#bk').value);if(!s2||typeof s2.schema!=='number')throw 0;
      if(s2.schema>SCHEMA){toast('That backup is from a newer version.');return;}
      while(s2.schema<SCHEMA){var mg=MIGRATIONS[s2.schema];if(!mg)throw 0;s2=mg(s2);}
      state=fill(s2);save();render(true);toast('Progress restored.');
    }catch(err){toast('That text is not a valid backup.');}
  }
  else if(a==='reset1'){ui.confirm='all';render();}
  else if(a==='reset2'){
    Promise.all(FILES.map(function(f){return dbDel(f.id);})).then(function(){FILES=[];var th=state.theme;state=blank();state.theme=th;ui.confirm=null;ui.setup=null;save();go('#/');toast('Everything was deleted.');});
  }
});
document.addEventListener('change',function(e){
  var t=e.target,c=t.dataset.c;
  if(t.id==='fi'||t.id==='fd'){var files=t.files,p=ui.preset;ui.preset=null;addFiles(files,p).then(function(){t.value='';});return;}
  if(t.dataset.dl){ui.dl[t.dataset.dl]=t.value;return;}
  if(!c)return;
  if(c==='sem'){if(t.value==='__new'){ui.setup=null;go('#/setup');}else{state.activeSem=t.value;save();render();}}
  else if(c==='seen'){if(t.checked)state.seen[t.dataset.id]=true;else delete state.seen[t.dataset.id];save();render();}
  else if(c==='dead'){if(t.checked)state.tasksDone[t.dataset.id]=true;else delete state.tasksDone[t.dataset.id];save();render();}
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
  else if(t.dataset.sb){setPath(ui.setup,t.dataset.sb,t.type==='number'?t.value:t.value);}
  else if(t.dataset.dl){ui.dl[t.dataset.dl]=t.value;}
});
/* drag and drop */
document.addEventListener('dragover',function(e){var z=e.target.closest&&e.target.closest('[data-drop]');if(z){e.preventDefault();z.classList.add('over');}});
document.addEventListener('dragleave',function(e){var z=e.target.closest&&e.target.closest('[data-drop]');if(z)z.classList.remove('over');});
document.addEventListener('drop',function(e){var z=e.target.closest&&e.target.closest('[data-drop]');if(z){e.preventDefault();z.classList.remove('over');ui.preset=null;if(e.dataTransfer&&e.dataTransfer.files.length)addFiles(e.dataTransfer.files);}});

/* ================= boot ================= */
render(false);
dbAll().then(function(all){FILES=all||[];render(false);}).catch(function(){filesOK=false;render(false);});
})();
