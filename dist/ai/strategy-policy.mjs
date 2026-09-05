import {apply,attacks,check,legal,key} from '../rules.mjs';
import {toUSI,fromUSI,toSFEN,parseInfo} from './usi-codec.mjs';
import {BOOK} from './openings/book.mjs';

export const OPENINGS={auto:'おまかせ',static:'居飛車',fourth:'四間飛車',central:'中飛車'};
export const ORDERS={auto:'おまかせ',attack:'攻勢',defend:'守備',counter:'反撃狙い'};
export const defaultPolicy=()=>({enabled:false,opening:'auto',order:'auto'});
export function sanitizePolicy(p){return {enabled:p?.enabled===true,opening:Object.hasOwn(OPENINGS,p?.opening)?p.opening:'auto',order:Object.hasOwn(ORDERS,p?.order)?p.order:'auto'};}
export function canonical(g){return g.turn?{...g,b:[...g.b].reverse().map(p=>p?{...p,s:1-p.s}:null),h:[g.h[1],g.h[0]],turn:0}:g;}
export const openingKey=g=>toSFEN(canonical(g)).split(' ').slice(0,3).join(' ');
export const rotateMove=m=>m.drop?{...m,to:80-m.to}:{...m,from:80-m.from,to:80-m.to};
const distance=(a,b)=>Math.max(Math.abs(a%9-b%9),Math.abs(Math.floor(a/9)-Math.floor(b/9)));
const value=p=>p?({P:100,L:300,N:320,S:450,G:550,B:800,R:1000,K:10000}[p.t]+(p.p?200:0)):0;

export function openingPlan(g,policy,previous={}){
  if(policy.opening==='auto')return {state:'auto',moves:[],message:'作戦に合わせて判断します'};
  const side=g.turn,rook=g.b.findIndex(p=>p?.s===side&&p.t==='R'&&!p.p),target={static:7,fourth:3,central:4}[policy.opening];
  if(g.ply>=32||check(g,side)||rook<0||Object.values(g.h[0]).some(Boolean)||Object.values(g.h[1]).some(Boolean))return {state:'suspended',moves:[],message:'この局面では作戦指示を優先'};
  const available=legal(g),allowed=new Set(available.map(toUSI));
  const book=(BOOK[openingKey(g)]?.[policy.opening]??[]).map(s=>side?toUSI(rotateMove(fromUSI(s))):s).filter(s=>allowed.has(s));
  const achieved=(side?80-rook:rook)%9===target;
  if(book.length)return {state:achieved?'continuing':'attempting',moves:book,message:achieved?'戦法の形を継続':'序盤の形を目指しています'};
  if(achieved)return {state:'continuing',moves:[],message:'戦法の形を継続'};
  if((previous.attempts??0)>=6)return {state:'suspended',moves:[],message:'この局面では作戦指示を優先'};
  // Only a safe legal rook transfer on the home rank is planned outside the book.
  const moves=available.filter(m=>m.from===rook&&!(g.b[m.to])&&Math.floor((side?80-m.to:m.to)/9)===7&&(side?80-m.to:m.to)%9===target&&!m.promote).map(toUSI);
  return {state:moves.length?'attempting':'suspended',moves,message:moves.length?'現在の局面から移行を検討':'この局面では作戦指示を優先'};
}

function frames(pass){
  const depths=new Map();if(!pass)return depths;
  for(const line of pass.lines){const c=parseInfo(line);if(!c||c.score.bound)continue;if(!depths.has(c.depth))depths.set(c.depth,new Map());depths.get(c.depth).set(c.rank,c);}
  for(const [depth,rows] of depths)if(rows.size<pass.count||!Array.from({length:pass.count},(_,i)=>rows.has(i+1)).every(Boolean))depths.delete(depth);
  return depths;
}
export function comparableCandidates(result){
  const main=frames(result.main),extra=frames(result.opening);
  const shared=[...main.keys()].filter(d=>extra.has(d)).sort((a,b)=>b-a);
  const depth=shared[0]??Math.max(...main.keys());if(!Number.isFinite(depth))return [];
  const merged=[...main.get(depth).values(),...(shared.length?[...extra.get(depth).values()]:[])];
  const unique=new Map();for(const c of merged)if(!unique.has(c.usi))unique.set(c.usi,c);
  return [...unique.values()];
}
// Transparent positional features are applied only within a narrow engine score band.
export function features(g,side){
  const kings=[0,1].map(s=>g.b.findIndex(p=>p?.t==='K'&&p.s===s)),control=[new Int16Array(81),new Int16Array(81)];
  let activity=0,pressure=0,threat=0,shelter=0;
  for(let i=0;i<81;i++){const p=g.b[i];if(!p)continue;const squares=attacks(g,i);
    // Include the first friendly blocker as a defended square without sliding through it.
    const defended=attacks({...g,b:g.b.map((q,j)=>q&&j!==i?{...q,s:1-p.s}:q)},i);for(const j of defended)control[p.s][j]++;
    if(p.s===side&&p.t!=='K'){activity+=squares.length*(['R','B'].includes(p.t)?.7:.25);pressure+=squares.filter(j=>distance(j,kings[1-side])<=2).length; if(['G','S'].includes(p.t))shelter+=Math.max(0,3-distance(i,kings[side]))*2;}
  }
  for(let i=0;i<81;i++){
    if(distance(i,kings[side])<=1)threat+=Math.max(0,control[1-side][i]-control[side][i]) * 3;
    const p=g.b[i];if(p?.s===side&&p.t!=='K'&&control[1-side][i]>control[side][i])threat+=Math.min(value(p)/100,10);
  }
  return {activity,pressure,safety:shelter-threat,threat};
}
export function chooseMove(snapshot,policy,plan,result){
  if(result.main.bestmove==='win')throw new Error('AIの宣言勝ちはこの対局では扱えません。手動に切り替えてください');
  if(result.main.bestmove==='resign')return {resign:true};
  const g=snapshot.g,moves=legal(g),allowed=new Map(moves.map(m=>[toUSI(m),m]));
  if(!allowed.has(result.main.bestmove))throw new Error('AIが合法でない着手を返しました');
  const mainDepths=frames(result.main),deepest=mainDepths.get(Math.max(...mainDepths.keys()));
  const mainCandidates=[...(deepest?.values()??[])].filter(c=>allowed.has(c.usi));
  // A shallower shared opening depth must never conceal a mate found by the main search.
  const proven=mainCandidates.filter(c=>c.score.type==='mate'&&c.score.value>0).sort((a,b)=>a.score.value-b.score.value);
  if(proven.length)return {m:allowed.get(proven[0].usi),selected:proven[0],reason:'詰みを優先'};
  if(mainCandidates.length&&mainCandidates.every(c=>c.score.type==='mate'&&c.score.value<0))return {m:allowed.get(result.main.bestmove),selected:mainCandidates.find(c=>c.usi===result.main.bestmove),reason:'玉の安全を優先'};
  const losing=new Set(mainCandidates.filter(c=>c.score.type==='mate'&&c.score.value<0).map(c=>c.usi));
  const candidates=comparableCandidates(result).filter(c=>allowed.has(c.usi)&&!losing.has(c.usi));
  if(!candidates.length)throw new Error('AIの探索結果を比較できませんでした。再試行してください');
  const mates=candidates.filter(c=>c.score.type==='mate'&&c.score.value>0).sort((a,b)=>a.score.value-b.score.value);
  if(mates.length)return {m:allowed.get(mates[0].usi),selected:mates[0],reason:'詰みを優先'};
  const cp=candidates.filter(c=>c.score.type==='cp'),best=Math.max(...cp.map(c=>c.score.value));
  if(!cp.length){const c=candidates.find(c=>c.usi===result.main.bestmove)??candidates[0];return {m:allowed.get(c.usi),selected:c,reason:'玉の安全を優先'};}
  const band=check(g,g.turn)?0:policy.order==='auto'&&policy.opening==='auto'?0:110;
  const safe=cp.filter(c=>best-c.score.value<=band),before=features(g,g.turn),recent=snapshot.records.slice(-8);
  const ranked=safe.map(c=>{
    const m=allowed.get(c.usi),next=apply(g,m),f=features(next,g.turn);
    let bonus=0;
    if(policy.order==='attack')bonus=7*(f.pressure-before.pressure)+3*(f.activity-before.activity)+2*(f.safety-before.safety);
    if(policy.order==='defend')bonus=10*(f.safety-before.safety)+2*(f.activity-before.activity);
    if(policy.order==='counter')bonus=6*(f.safety-before.safety)+4*(f.activity-before.activity)+5*(f.pressure-before.pressure);
    if(plan.moves.includes(c.usi))bonus+=95;
    if(policy.order!=='auto'||policy.opening!=='auto'){
      if(recent.some(r=>r.mover===g.turn&&r.m?.from===m.to&&r.m?.to===m.from&&!r.m?.drop))bonus-=70;
      if(snapshot.past.slice(-12).some(p=>key(p)===key(next)))bonus-=90;
    }
    return {c,m,rank:c.score.value+Math.max(-100,Math.min(100,bonus))};
  }).sort((a,b)=>b.rank-a.rank||b.c.score.value-a.c.score.value);
  const chosen=ranked[0];return {m:chosen.m,selected:chosen.c,reason:plan.moves.includes(chosen.c.usi)?'戦法の形を優先':ORDERS[policy.order]+'で判断'};
}
