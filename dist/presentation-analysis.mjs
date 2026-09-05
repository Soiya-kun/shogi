import {apply,attacks,check,key,legal} from './rules.mjs';
import {parseInfo,toUSI,positionCommand} from './ai/usi-codec.mjs';

function frames(pass){
  const out=new Map();
  if(!Number.isInteger(pass?.count)||pass.count<1)return out;
  for(const line of pass.lines??[]){const v=parseInfo(line);if(!v||v.score.bound)continue;const f=out.get(v.depth)??new Map();f.set(v.rank,v);out.set(v.depth,f);}
  for(const [depth,f] of out)if(!Array.from({length:pass.count},(_,i)=>f.has(i+1)).every(Boolean))out.delete(depth);
  return out;
}
// Only exact, completed MultiPV frames at one shared root/depth are comparable.
export function certify(snapshot,m,result,identity){
  if(!result?.request||!['gameId','positionRevision','policyRevision','requestId','side'].every(k=>result.request[k]===identity[k]))return null;
  if(result.request.position!==positionCommand(snapshot)||identity.side!==snapshot.g.turn)return null;
  const usi=toUSI(m);if(!legal(snapshot.g).some(v=>toUSI(v)===usi))return null;
  const main=frames(result.main),extra=frames(result.opening);
  for(const depth of [...main.keys()].sort((a,b)=>b-a)){
    const candidates=[...main.get(depth).values()],selected=[...candidates,...(extra.get(depth)?.values()??[])].find(v=>v.usi===usi);
    if(!selected)continue;
    const best=main.get(depth).get(1),cp=best.score.type==='cp'&&selected.score.type==='cp';
    // A deeper completed losing-mate result cannot be overwritten by a shallower cp frame.
    const losing=[...main.values(),...extra.values()].some(f=>[...f.values()].some(v=>v.usi===usi&&v.depth>=depth&&v.score.type==='mate'&&v.score.value<0));
    const loss=cp?Math.max(0,best.score.value-selected.score.value):null;
    return {root:key(snapshot.g),usi,side:snapshot.g.turn,depth,loss,score:cp?selected.score.value:null,safe:cp&&loss<=100&&!losing,losingMate:losing,pv:selected.pv};
  }
  return null;
}
export function safeCertificate(c,before,m){return !!c&&c.root===key(before)&&c.usi===toUSI(m)&&c.side===before.turn&&Number.isInteger(c.depth)&&c.depth>0&&Number.isFinite(c.loss)&&c.loss>=0&&c.loss<=100&&c.safe===true&&!c.losingMate;}
export const distance=(a,b)=>Math.max(Math.abs(a%9-b%9),Math.abs(Math.floor(a/9)-Math.floor(b/9)));
export const king=(g,s)=>g.b.findIndex(p=>p?.s===s&&p.t==='K');
export const checkingSources=(g,s)=>g.b.flatMap((p,i)=>p?.s===1-s&&attacks(g,i).includes(king(g,s))?[i]:[]);
export const value=p=>p?({P:100,L:300,N:320,S:450,G:550,B:800,R:1000,K:10000}[p.t]+(p.p?200:0)):0;
// Defended friendly squares count too. Simulate a hypothetical capture on that square
// and reject attacks which expose the attacking king (absolute pins).
export function effective(g,from,to){
  const p=g.b[from];if(!p||from===to)return false;
  const probe=structuredClone(g);if(probe.b[to]?.s===p.s)probe.b[to]=null;
  if(!attacks(probe,from).includes(to))return false;
  probe.b[from]=null;probe.b[to]=p;
  return !check(probe,p.s);
}
export function pressure(g,s){
  const k=king(g,1-s);if(k<0)return [];
  return g.b.flatMap((p,i)=>p?.s===s&&p.t!=='K'&&Array.from({length:81},(_,j)=>j).some(j=>distance(j,k)<=2&&effective(g,i,j))?[i]:[]);
}
export function weakZone(g,s){
  const k=king(g,s),out=[];
  for(let j=0;j<81;j++)if(distance(j,k)<=2){
    const counts=[0,0];g.b.forEach((p,i)=>{if(p&&effective(g,i,j))counts[p.s]++;});
    if(counts[1-s]>counts[s])out.push(j);
  }
  return out;
}
export function pinned(g,s){
  const k=king(g,s),out=[];
  g.b.forEach((p,i)=>{if(p?.s!==s||p.t==='K')return;
    const removed=structuredClone(g);removed.b[i]=null;
    const sources=checkingSources(removed,s).filter(j=>'RBL'.includes(g.b[j].t)&&!attacks(g,j).includes(k));
    if(!sources.length)return;
    const illegal=attacks(g,i).some(to=>g.b[to]?.t!=='K'&&check(apply({...g,turn:s},{from:i,to}),s));
    if(illegal)out.push({cell:i,sources});
  });return out;
}
