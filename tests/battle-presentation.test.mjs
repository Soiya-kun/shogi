import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Chronicle,event,formation,outcome,IMPLEMENTED} from '../dist/battle-events.mjs';
import {certify,effective,pinned} from '../dist/presentation-analysis.mjs';
import {PresentationDirector} from '../dist/presentation-director.mjs';
import {BattlePresentation} from '../dist/battle-presentation.mjs';
import {GameController} from '../dist/game-controller.mjs';
import {initial,key,apply,legal} from '../dist/rules.mjs';
import {Match} from '../dist/match.mjs';
import {toUSI,positionCommand} from '../dist/ai/usi-codec.mjs';
import {SCRIPTS} from '../dist/presentation-catalog.mjs';

const identity={gameId:'test',positionRevision:1,policyRevision:0},tick=()=>new Promise(r=>setImmediate(r));
function empty(){const g=initial();g.b.fill(null);g.b[80]={t:'K',s:0,p:false};g.b[0]={t:'K',s:1,p:false};return g;}
const put=(g,i,t,s=0,p=false)=>g.b[i]={t,s,p};
const mirror=g=>({...structuredClone(g),b:[...g.b].reverse().map(p=>p?{...p,s:1-p.s}:null),h:[g.h[1],g.h[0]],turn:1-g.turn});
const rotate=m=>m.drop?{...m,to:80-m.to}:{...m,from:80-m.from,to:80-m.to};
const certificate=(g,m,loss=0)=>({root:key(g),usi:toUSI(m),side:g.turn,depth:4,loss,score:20,safe:loss<=100,losingMate:false});
function detect(g,m,{safe=false,chronicle=new Chronicle(g),policy={},result=null}={}){
  assert(legal(g).some(v=>toUSI(v)===toUSI(m)),`fixture illegal: ${toUSI(m)}`);
  const after=apply(g,m),events=chronicle.advance({...identity,before:g,after,m,policy,result},safe?certificate(g,m):null);
  return {after,events,ids:events.map(e=>e.id),chronicle};
}
test('11/12 real double/discovered checks, 14 pin, 24 countercheck and 47–50 troop tactics have negative controls',()=>{
  const scenarios=[];
  for(const [id,to] of [[11,12],[12,30]]){const g=empty();g.b[0]=null;put(g,4,'K',1);put(g,40,'R');put(g,22,'B');scenarios.push({id,g,m:{from:22,to},rules:true});}
  {const g=empty();g.b[0]=null;put(g,4,'K',1);put(g,22,'S',1);put(g,41,'R');scenarios.push({id:14,g,m:{from:41,to:40}});}
  {const g=empty();g.b[0]=g.b[80]=null;put(g,76,'K');put(g,35,'K',1);put(g,72,'R',1);put(g,65,'B');scenarios.push({id:24,g,m:{from:65,to:75}});}
  {const g=empty();put(g,58,'L');put(g,31,'S',1);scenarios.push({id:47,g,m:{from:58,to:31}});}
  {const g=empty();put(g,49,'N');put(g,30,'G',1);put(g,40,'P',1);scenarios.push({id:48,g,m:{from:49,to:30}});}
  {const g=empty();g.b[0]=null;put(g,13,'K',1);put(g,40,'S');put(g,31,'G',1);scenarios.push({id:49,g,m:{from:40,to:31}});}
  {const g=empty();g.b[80]=null;put(g,76,'K');put(g,67,'R',1);put(g,68,'G');scenarios.push({id:50,g,m:{from:68,to:67}});}
  for(const {id,g,m,rules} of scenarios)for(const side of [0,1]){
    const board=side?mirror(g):g,move=side?rotate(m):m;
    assert(detect(board,move,{safe:true}).ids.includes(id),`positive ${id}, side ${side}`);
    if(!rules)assert(!detect(board,move).ids.includes(id),`no analysis ${id}`);
    else {const quiet=legal(board).find(v=>!detect(board,v).ids.includes(id));assert(quiet,`negative ${id}`);}
  }
});
test('09 requires a legal best-response PV retaining a capture, never two geometric attacks alone',()=>{
  const g=empty();put(g,49,'N');put(g,11,'R',1);put(g,13,'R',1);const m={from:49,to:30},after=apply(g,m),proof=certificate(g,m);
  const run=c=>new Chronicle(g).advance({...identity,before:g,after,m},c).map(e=>e.id);
  assert(!run(proof).includes(9));proof.pv=[toUSI(m),toUSI({from:11,to:12}),toUSI({from:30,to:13,promote:true})];assert(run(proof).includes(9));
  proof.pv[1]='resign';assert(!run(proof).includes(9));
});
test('06–08 acknowledge executed orders only; 10 rejects a royal fork that can simply be captured',()=>{
  const scenarios=[];
  {const g=empty();put(g,40,'R');put(g,22,'B');scenarios.push({g,m:{from:40,to:36},order:'attack',id:6});}
  {const g=empty();g.b[80]=null;put(g,76,'K');put(g,67,'R',1);put(g,68,'G');scenarios.push({g,m:{from:68,to:67},order:'defend',id:7});}
  {const g=empty();g.b[0]=g.b[80]=null;put(g,76,'K');put(g,35,'K',1);put(g,72,'R',1);put(g,65,'B');scenarios.push({g,m:{from:65,to:75},order:'counter',id:8});}
  for(const {g,m,order,id} of scenarios)for(const side of [0,1]){
    const board=side?mirror(g):g,move=side?rotate(m):m;
    assert(detect(board,move,{safe:true,policy:{order}}).ids.includes(id),`order ${id}`);
    assert(!detect(board,move,{safe:false,policy:{order}}).ids.includes(id));assert(!detect(board,move,{safe:true,policy:{order:'auto'}}).ids.includes(id));
  }
  const g=empty();g.b[0]=null;put(g,11,'K',1);put(g,13,'R',1);put(g,49,'N');const m={from:49,to:30};
  const run=board=>{const c=certificate(board,m);c.pv=[toUSI(m),toUSI({from:11,to:10}),toUSI({from:30,to:13,promote:true})];return new Chronicle(board).advance({...identity,before:board,after:apply(board,m),m},c).map(e=>e.id);};
  assert(run(g).includes(10));put(g,39,'G',1);assert(!run(g).includes(10));assert(!run(g).includes(9));
});
test('54 captures and 55 independent defenses accumulate only safe successes in the current ownership period',()=>{
  for(const qualified of [true,false]){
    let g=empty();put(g,40,'R');put(g,31,'L',1);put(g,22,'P',1);put(g,13,'S',1);const ch=new Chronicle(g);let last;
    for(const [i,[from,to]] of [[40,31],[0,1],[31,22],[1,0],[22,13]].entries()){last=detect(g,{from,to},{safe:i!==2||qualified,chronicle:ch});g=last.after;}
    assert.equal(last.ids.includes(54),qualified);
    g=empty();g.b[80]=null;put(g,76,'K');put(g,4,'R',1);put(g,68,'G');const guard=new Chronicle(g);
    for(const [i,[from,to]] of [[68,67],[4,5],[67,66],[5,4],[66,67]].entries()){last=detect(g,{from,to},{safe:i!==0||qualified,chronicle:guard});g=last.after;}
    assert.equal(last.ids.includes(55),qualified);
  }
});
test('53 first incursion, 58 new allegiance and 60 pawn finish use piece provenance and actual outcomes',()=>{
  const origin=initial(),ch=new Chronicle(origin);let g=structuredClone(origin);
  // Position/history fixture with the original pawn advanced on its file.
  g.b[31]=g.b[58];g.b[58]=null;ch.state.board[31]=ch.state.board[58];ch.state.board[58]=null;g.b[22]=null;ch.state.board[22]=null;
  assert(detect(g,{from:31,to:22},{chronicle:ch}).ids.includes(53));
  assert(!detect(g,{from:31,to:22}).ids.includes(53)); // Midgame import has no invented origin.
  for(const owned of [true,false]){
    g=empty();put(g,40,'S');put(g,31,'S',1);const recruit=new Chronicle(g),id=recruit.state.board[40],u=recruit.state.units[id];
    u.ownerEpoch=1;u.ownership=owned?[{from:1,to:0}]:[];u.drops=[{side:0,own:0,ownerEpoch:1}];
    assert.equal(detect(g,{from:40,to:31},{safe:true,chronicle:recruit}).ids.includes(58),owned);
  }
  g=empty();g.b[0]=null;put(g,4,'K',1);put(g,3,'L',1);put(g,5,'L',1);put(g,21,'G');put(g,23,'G');put(g,22,'P');
  const m={from:22,to:13},match=new Match({g,past:[],records:[],end:''});match.play(m);
  assert.equal(outcome(match).reason,'checkmate');assert(detect(g,m,{result:outcome(match)}).ids.includes(60));assert(!detect(g,m).ids.includes(60));
});
test('80 reserves need eight observed quiet own moves, rather than time spent on screen',()=>{
  for(const count of [7,8]){
    let g=empty();put(g,40,'R');put(g,31,'S',1);for(let i=0;i<8;i++)put(g,54+i,'P');const ch=new Chronicle(g);
    for(let i=0;i<count;i++){g=detect(g,{from:54+i,to:45+i},{chronicle:ch}).after;g=detect(g,{from:i%2?1:0,to:i%2?0:1},{chronicle:ch}).after;}
    assert.equal(detect(g,{from:40,to:31},{safe:true,chronicle:ch}).ids.includes(80),count===8);
  }
});
test('81/83/84/85/89 require the corresponding original unit, earned merit, exact attacker or promotion history',()=>{
  for(const qualified of [true,false]){
    let g=empty();g.b[80]=null;put(g,76,'K');put(g,67,'R',1);put(g,68,'G');let ch=new Chronicle(g),id=ch.state.board[68];ch.state.units[id].originalSide=qualified?0:null;
    assert.equal(detect(g,{from:68,to:67},{safe:true,chronicle:ch}).ids.includes(81),qualified);
    g=empty();put(g,31,'G');put(g,22,'S',1);ch=new Chronicle(g);id=ch.state.board[31];ch.state.units[id].awards=qualified?[55]:[];
    assert.equal(detect(g,{from:31,to:22},{safe:true,chronicle:ch}).ids.includes(83),qualified);
    g=empty();put(g,40,'G');put(g,31,'B',1);ch=new Chronicle(g);
    ch.state.captures=[{attacker:qualified?ch.state.board[31]:'different-enemy',victim:'fallen-guard',side:0,merit:true,type:'G',at:0}];
    assert.equal(detect(g,{from:40,to:31},{safe:true,chronicle:ch}).ids.includes(84),qualified);
    g=empty();put(g,31,'P',0,true);put(g,22,'S',1);ch=new Chronicle(g);id=ch.state.board[31];ch.state.firstCapture[0]=qualified?id:'other-pawn';ch.state.units[id].promotions=[{ownerEpoch:0}];
    assert.equal(detect(g,{from:31,to:22},{safe:true,chronicle:ch}).ids.includes(85),qualified);
    g=empty();put(g,20,'P',0,true);put(g,21,'P',0,true);put(g,31,'P');ch=new Chronicle(g);id=ch.state.board[20];ch.state.units[id].captures=qualified?[{ownerEpoch:0,safe:true}]:[];
    assert.equal(detect(g,{from:31,to:22,promote:true},{safe:true,chronicle:ch}).ids.includes(89),qualified);
  }
});
test('all catalog scripts retain the original Japanese and English; only registered detectors run',()=>{
  assert.equal(Object.keys(SCRIPTS).length,100);for(const s of Object.values(SCRIPTS))assert(s.ja&&s.subtitle&&s.english&&s.kanji,JSON.stringify(s));
  for(const id of IMPLEMENTED)assert(SCRIPTS[id]);assert(!IMPLEMENTED.includes(28));assert(!IMPLEMENTED.includes(15));
});
test('17 promotion only; 18 legal drop; 19 actual check, symmetric and neutral without analysis',()=>{
  for(const side of [0,1]){
    let g=empty();put(g,31,'R');let m={from:31,to:22,promote:true};if(side){g=mirror(g);m=rotate(m);}
    assert(detect(g,m).ids.includes(17));assert(!detect(g,{...m,promote:false}).ids.includes(17));
    g=empty();g.h[0].S=2;m={drop:'S',to:40};if(side){g=mirror(g);m=rotate(m);}
    const dropped=detect(g,m);assert(dropped.ids.includes(18));assert.equal(dropped.events.find(e=>e.id===18).voice,true);
    g=empty();put(g,40,'R');m={from:40,to:36,promote:false};if(side){g=mirror(g);m=rotate(m);}
    const checked=detect(g,m);assert(checked.ids.includes(19));assert(checked.events.find(e=>e.id===19).targetCells.includes(side?80:0));
    const quiet=side?rotate({from:40,to:41}):{from:40,to:41};assert(!detect(g,quiet).ids.includes(19));
  }
});
test('29/30 actual checkmate and resignation; draws and finite engine mate scores never claim victory',()=>{
  const g=empty();g.b[0]=null;put(g,4,'K',1);put(g,22,'G');put(g,12,'G');put(g,14,'G');
  const m={from:22,to:13,promote:false},match=new Match({g,past:[],records:[],end:''});match.play(m);
  assert.match(match.end,/詰み/);assert.deepEqual(outcome(match),{reason:'checkmate',winner:0});
  const events=detect(g,m,{result:outcome(match)}).ids;assert(events.includes(29)&&events.includes(30));
  const resign=new Match();resign.resign(0);assert.deepEqual(outcome(resign),{reason:'resignation',winner:1});
  const draw=new Match();draw.end='千日手 — 引き分け・指し直し';assert.equal(outcome(draw).winner,null);
  assert(!detect(g,m).ids.includes(29));
});
test('analysis certificates reject stale roots, mismatched depth, partial frames, bounds and >100 cp loss',()=>{
  const g=initial(),m={from:56,to:47,promote:false},snapshot={g,past:[],records:[]},request={...identity,requestId:'q',side:0,position:positionCommand(snapshot)};
  const result={request,main:{count:2,lines:['info depth 5 multipv 1 score cp 80 pv 2g2f','info depth 5 multipv 2 score cp 60 pv 7g7f']},opening:{count:1,lines:['info depth 5 score cp 60 pv 7g7f']}};
  assert.equal(certify(snapshot,m,result,request).safe,true);
  assert.equal(certify(snapshot,m,result,{...request,positionRevision:4}),null);
  const bounded=structuredClone(result);bounded.main.lines[1]='info depth 5 multipv 2 score cp 60 upperbound pv 7g7f';assert.equal(certify(snapshot,m,bounded,request),null);
  const missing=structuredClone(result);missing.main.lines[1]='info depth 4 multipv 2 score cp 60 pv 7g7f';assert.equal(certify(snapshot,m,missing,request),null);
  const bad=structuredClone(result);bad.main.lines[1]='info depth 5 multipv 2 score cp -30 pv 7g7f';assert.equal(certify(snapshot,m,bad,request).safe,false);
  const losing=structuredClone(result);losing.opening.lines.push('info depth 6 score mate -5 pv 7g7f');assert.equal(certify(snapshot,m,losing,request).safe,false);
});
test('01–03 require original rook, advanced original pawns, transition and exact safe analysis for either army',()=>{
  for(const side of [0,1])for(const id of [1,2,3]){
    let g=initial();const chronicle=new Chronicle(g);const state=chronicle.state;
    const relocate=(from,to)=>{g.b[to]=g.b[from];g.b[from]=null;state.board[to]=state.board[from];state.board[from]=null;};
    if(id===1){relocate(61,43);relocate(56,47);}if(id===2){relocate(70,66);relocate(57,48);relocate(56,47);}if(id===3){relocate(70,67);relocate(58,49);}
    if(side){g=mirror(g);state.board.reverse();for(const u of Object.values(state.units)){u.originalSide=1-u.originalSide;u.ownerSide=1-u.ownerSide;u.originCell=80-u.originCell;}}
    assert(formation(g,side,state.board,state.units).includes(id));
    const rookId=state.board[side?80-({1:70,2:66,3:67}[id]):({1:70,2:66,3:67}[id])];state.units[rookId].ownerEpoch=1;
    assert(!formation(g,side,state.board,state.units).includes(id));
  }
  // A genuine legal opening sequence; missing/poor analysis must not acknowledge it.
  for(const loss of [null,0,101]){
    let g=initial(),ch=new Chronicle(g),last;
    for(const m of [{from:61,to:52},{from:18,to:27},{from:56,to:47},{from:19,to:28},{from:52,to:43}]){const after=apply(g,m);last=ch.advance({...identity,before:g,after,m},loss===null?null:certificate(g,m,loss));g=after;}
    assert.equal(last.some(e=>e.id===1),loss===0);
  }
});
test('04/05 exact complete castles only, no load-time event or repeated reforming',()=>{
  for(const template of [[[70,'K'],[69,'S'],[77,'G'],[67,'G']],[[72,'K'],[63,'L'],[73,'N'],[64,'S'],[65,'G'],[74,'G']]])for(const side of [0,1]){
    let g=empty();g.b[80]=null;for(const [i,t] of template)put(g,i,t);if(side)g=mirror(g);
    const ch=new Chronicle(g),id=template.length===4?4:5;assert(formation(g,side,ch.state.board,ch.state.units).includes(id));
    const index=side?80-template.at(-1)[0]:template.at(-1)[0];g.b[index]=null;assert(!formation(g,side,ch.state.board,ch.state.units).includes(id));
  }
});
test('16/46 material capture-promotion only passes the quality gate, not a blunder',()=>{
  for(const side of [0,1]){
    let g=empty();put(g,31,'P');put(g,22,'R',1);let m={from:31,to:22,promote:true};if(side){g=mirror(g);m=rotate(m);}
    assert(detect(g,m,{safe:true}).ids.includes(16));assert(detect(g,m,{safe:true}).ids.includes(46));assert(!detect(g,m).ids.includes(16));assert(!detect(g,m).ids.includes(46));
  }
});
test('absolute pins cannot contribute effective attacks; pin detector checks illegal escape moves',()=>{
  const g=empty();g.b[80]=null;put(g,76,'K');put(g,67,'S');put(g,4,'R',1);
  assert.equal(effective(g,67,57),false);assert(pinned(g,0).some(p=>p.cell===67));
  g.b[4]=null;assert.equal(effective(g,67,57),true);assert.equal(pinned(g,0).length,0);
});
test('21/23 check evasion is verified; 55 requires separate safe defenses by the exact unit',()=>{
  const g=empty();g.b[80]=null;put(g,76,'K');put(g,4,'R',1);g.h[0].G=1;
  const m={drop:'G',to:67};assert(detect(g,m,{safe:true}).ids.includes(23));assert(!detect(g,m).ids.includes(23));
  assert(!detect(g,m,{safe:true}).ids.includes(55));
});
test('56→57 uses original unit ID through both armies, FIFO hands and real legal moves',()=>{
  let g=initial(),ch=new Chronicle(g);const origin=ch.state.board[61],steps=[
    [61,52],[25,34],[52,43],[34,43],[70,43],['P',52],[43,52],[18,27],['P',43],[27,36],[43,34],[19,28],[34,25,true],[20,29],[25,24],[21,30],['P',25],[22,31],[25,16,true]
  ];const seen=[];
  for(const [from,to,promote=false] of steps){const m=typeof from==='string'?{drop:from,to}:{from,to,promote};const r=detect(g,m,{safe:true,chronicle:ch});seen.push(r.events);g=r.after;}
  const returning=seen[16].find(e=>e.id===56);assert(returning);assert.equal(returning.subjectPieceIds[0],origin);assert(seen[18].some(e=>e.id===57));
  assert.equal(ch.state.units[origin].ownerEpoch,2);assert.equal(ch.state.units[origin].originalSide,0);assert.equal(ch.state.board[16],origin);
  assert(!seen[8].some(e=>e.id===56)); // First drop consumes the other captured pawn.
});
test('priority, dedupe, terminal sequence, cancellation, off and voice cooldowns never block play',()=>{
  const shown=[],view={show:(e,s)=>{shown.push({id:e.id,voice:s.canVoice});return s.canVoice;},clear(){},hide(){},log(){}};
  const timers=new Map();let now=0,n=0;const director=new PresentationDirector({view,settings:{voice:true},now:()=>now,timer:(fn,delay)=>{timers.set(++n,{fn,at:now+delay});return n;},clearTimer:id=>timers.delete(id)});
  const advance=ms=>{now+=ms;for(const [id,t] of [...timers])if(t.at<=now){timers.delete(id);t.fn();}};
  director.begin(identity);const e=id=>event(id,{...identity,side:0,ply:1},{ownMove:1});
  director.submit([e(18),e(19),e(17),e(19)]);advance(0);assert.deepEqual(shown.map(e=>e.id),[19]);assert.equal(director.log.length,3);
  director.submit([e(29)]);advance(0);assert.equal(shown.length,1); // A late analysis cannot add another headline.
  director.begin({...identity,positionRevision:2});director.submit([29,30,19].map(id=>({...e(id),positionRevision:2})));advance(0);assert.equal(shown.at(-1).id,29);advance(2100);assert.equal(shown.at(-1).id,30);
  director.begin({...identity,positionRevision:3});director.submit([{...e(17),positionRevision:3}],{delay:100});director.cancel('undo');advance(100);assert.equal(shown.at(-1).id,30);
  director.configure({mode:'off'});director.begin({...identity,positionRevision:4});director.submit([{...e(19),positionRevision:4}]);advance(0);assert.equal(shown.at(-1).id,30);
  director.configure({voice:true});director.begin({...identity,positionRevision:5});director.submit([{...e(18),positionRevision:5}]);advance(0);assert.equal(shown.at(-1).voice,false);
});
class Engine {
  ready=false;pending=[];async init(){this.ready=true;}stop(){}destroy(){}
  search(request){return new Promise(resolve=>this.pending.push({request,resolve}));}
}
function serviceSetup(){
  const engine=new Engine(),analysis=new Engine(),shown=[];let service;
  const c=new GameController({engine,minimumThinkMs:0,onEvent:(t,d)=>service?.handle(t,d)});
  const director=new PresentationDirector({settings:{analysis:true},view:{show:e=>shown.push(e.id),clear(){},hide(){},log(){}}});
  service=new BattlePresentation({controller:c,director,engineFactory:()=>analysis,animated:()=>false});c.start();return {c,engine,analysis,service,director,shown};
}
test('95 waits for active successful initialization; 97 coalesces; 96 follows actual manual availability',async()=>{
  const {c,engine,service,director}=serviceSetup();
  c.updateSide(1,{enabled:true});await tick();assert(!director.log.some(e=>e.id===95));
  c.updateSide(0,{enabled:true});await tick();assert(director.log.some(e=>e.id===95&&e.side===0));
  c.updateSide(0,{order:'attack'});c.updateSide(0,{order:'defend'});c.updateSide(0,{order:'counter'});await tick();
  const orders=director.log.filter(e=>e.id===97);assert.equal(orders.length,1);assert.match(orders[0].ja,/機をうかがう/);
  c.updateSide(0,{enabled:false});assert(c.canPlay);assert(director.log.some(e=>e.id===96&&e.side===0));
  c.updateSide(0,{enabled:true});await tick();assert.equal(director.log.filter(e=>e.id===95&&e.side===0).length,1);
  c.destroy();assert.equal(service.director.timers.size,0);assert.equal(service.director.active,null);assert(engine.pending.length);
});
test('stale human analysis is discarded after next move/undo/reset/AI-stop; restore rolls back identity',async()=>{
  const {c,analysis,service}=serviceSetup();
  await c.play({from:56,to:47});await tick();const old=analysis.pending[0];assert(old);
  await c.play({from:24,to:33});const saved=service.serialize();c.undo();assert.equal(service.chronicle.state.board[24]?.includes('24'),true);
  old.resolve({request:old.request,main:{count:1,lines:['info depth 4 score cp 0 pv 7g7f']}});await tick();assert.equal(service.proofs.length,0);
  assert(!service.director.active);c.reset();assert.equal(service.chronicle.state.board.filter(Boolean).length,40);assert.deepEqual(service.serialize().proofs,[]);
  assert(saved);c.destroy();
});
