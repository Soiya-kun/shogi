import {initial,key,legal,apply,check,zone} from './rules.mjs';
import {toUSI,fromUSI} from './ai/usi-codec.mjs';
import {safeCertificate,checkingSources,king,distance,value,effective,pressure,weakZone,pinned} from './presentation-analysis.mjs';
import {SCRIPTS} from './presentation-catalog.mjs';

export const IMPLEMENTED=Object.freeze([1,2,3,4,5,6,7,8,9,10,11,12,14,16,17,18,19,21,23,24,29,30,46,47,48,49,50,53,54,55,56,57,58,60,62,80,81,83,84,85,89,95,96,97]);
const medium=new Set([1,2,3,4,5,6,7,8,9,10,11,12,14,16,17,21,23,24,46,47,48,49,50,54,55,56,57,58,80,81,83,84,85,89]);
const priorities={29:1000,30:990,60:980,24:850,23:840,81:835,55:830,50:820,21:810,10:780,11:770,12:760,19:750,9:710,14:700,83:690,84:680,85:675,57:670,54:660,89:655,80:650,46:645,16:640,47:630,48:630,49:630,58:625,56:620,17:610,6:520,7:520,8:530,18:200,53:190,62:180};
export function event(id,context,extra={}){
  const {gameId,positionRevision,policyRevision=0,after,m,side=after?.turn===0?1:0}=context;
  return {id,eventId:`script.${id}`,gameId,positionRevision,policyRevision,ply:after?.ply??context.ply??0,side,
    sourceMoveId:`${gameId}:${positionRevision}`,evidence:'rules',subjectPieceIds:[],targetCells:Number.isInteger(m?.to)?[m.to]:[],
    intensity:medium.has(id)?'medium':[29,30,60].includes(id)?'large':'small',priority:priorities[id]??500,
    textKey:String(id),voiceKey:String(id),trigger:[29,30,60].includes(id)?'result':'arrival',expiresAfterRevision:positionRevision,
    ...SCRIPTS[id],...extra};
}
export function outcome(match){
  if(!match.end)return null;
  if(match.resignation===0||match.resignation===1)return {reason:'resignation',winner:1-match.resignation};
  if(match.end.includes('連続王手')){
    const seq=[...match.past,match.g],hits=seq.flatMap((g,i)=>key(g)===key(match.g)?[i]:[]);
    if(hits.length<4)return {reason:'unknown',winner:null};
    const records=match.records.slice(hits.at(-4));
    const loser=[0,1].find(s=>records.some(r=>r.mover===s)&&records.filter(r=>r.mover===s).every(r=>r.check));
    return {reason:'perpetual-check',winner:loser===undefined?null:1-loser};
  }
  if(match.end.includes('千日手'))return {reason:'repetition',winner:null};
  if(check(match.g,match.g.turn)&&legal(match.g).length===0)return {reason:'checkmate',winner:1-match.g.turn};
  return {reason:'no-legal-moves',winner:null};
}
export function formation(g,s,ids,units){
  const index=i=>s?80-i:i,piece=(i,t)=>{const p=g.b[index(i)];return p?.s===s&&p.t===t&&!p.p;};
  const rook=g.b.findIndex((p,i)=>p?.s===s&&p.t==='R'&&!p.p&&units[ids[i]]?.originalSide===s&&units[ids[i]]?.ownerEpoch===0);
  const pawnAdvanced=(col,ranks)=>g.b.some((p,i)=>p?.s===s&&p.t==='P'&&!p.p&&units[ids[i]]?.originCell===index(54+col)&&units[ids[i]]?.ownerEpoch===0&&Math.floor(index(i)/9)<=6-ranks);
  const out=[];
  if(check(g,s))return out;
  if(rook>=0){const r=index(rook);if(r%9===7&&pawnAdvanced(7,2)&&pawnAdvanced(2,1))out.push(1);if(r===66&&pawnAdvanced(3,1)&&pawnAdvanced(2,1))out.push(2);if(r===67&&pawnAdvanced(4,1))out.push(3);}
  if([[70,'K'],[69,'S'],[77,'G'],[67,'G']].every(([i,t])=>piece(i,t)))out.push(4);
  if([[72,'K'],[63,'L'],[73,'N'],[64,'S'],[65,'G'],[74,'G']].every(([i,t])=>piece(i,t)))out.push(5);
  return out;
}
// A conservative subset of forks: the engine's legal best-response PV must retain
// a profitable capture by this exact attacker. Geometry alone never qualifies.
function forkEvidence(before,after,m,c){
  if(!c?.pv||c.pv[0]!==toUSI(m))return null;
  const targets=after.b.flatMap((p,i)=>p?.s===after.turn&&p.t!=='K'&&effective(after,m.to,i)?[i]:[]);
  const checking=checkingSources(after,after.turn).includes(m.to);
  if(targets.length+(checking?1:0)<2||!targets.some(i=>after.b[i].t!=='P'))return null;
  if(!m.drop&&targets.every(i=>effective(before,m.from,i))&&!checking)return null;
  const profitable=(g,a,b)=>legal({...g,turn:before.turn}).some(v=>v.from===a&&v.to===b)&&
    (value(g.b[b])>=value(g.b[a])||!g.b.some((p,i)=>p?.s===after.turn&&effective(apply({...g,turn:before.turn},{from:a,to:b}),i,b)));
  try{
    const reply=fromUSI(c.pv[1]),follow=fromUSI(c.pv[2]);
    if(!legal(after).some(v=>toUSI(v)===toUSI(reply)))return null;
    const next=apply(after,reply);
    if(follow.from!==m.to||!targets.includes(follow.to)||!legal(next).some(v=>toUSI(v)===toUSI(follow))||!profitable(next,m.to,follow.to))return null;
    const rooks=targets.filter(i=>after.b[i].t==='R');
    const royal=checking&&rooks.length&&legal(after).every(r=>{const n=apply(after,r);return n.b[m.to]?.s===before.turn&&rooks.some(i=>n.b[i]?.t==='R'&&n.b[i].s===after.turn&&profitable(n,m.to,i));});
    if(checking&&targets.length<2&&!royal)return null;
    return {id:royal?10:9,targets};
  }catch{return null;}
}
export class Chronicle {
  constructor(g){this.seed(g);}
  seed(g){
    const original=key(g)===key(initial());
    this.state={board:Array(81).fill(null),hands:[{},{}],units:{},ownMoves:[0,0],lastQuietOwn:[0,0],seen:[],firstCapture:[null,null],lastCheck:[false,false],captures:[]};
    const make=(id,p,cell)=>this.state.units[id]={unitId:id,originalSide:original?p.s:null,originCell:original?cell:null,ownerSide:p.s,ownerEpoch:0,basePieceType:p.t,captures:[],promotions:[],defenses:[],ownership:[],drops:[],awards:[],lastActivity:0};
    g.b.forEach((p,i)=>{if(p){const id=`root:${i}:${p.s}:${p.t}`;this.state.board[i]=id;make(id,p,i);}});
    for(const s of [0,1])for(const [t,n] of Object.entries(g.h[s])){const queue=this.state.hands[s][t]=[];for(let i=0;i<n;i++){const id=`hand:${s}:${t}:${i}`;queue.push(id);make(id,{s,t},null);}}
  }
  advance(context,certificate=null){
    const {before,after,m,policy={},result}=context,s=before.turn,state=this.state,events=[],prior=structuredClone(state);
    const safe=safeCertificate(certificate,before,m),oldPiece=m.drop?{t:m.drop,s,p:false}:before.b[m.from],victim=before.b[m.to];
    const unitId=m.drop?state.hands[s][m.drop]?.shift():state.board[m.from],victimId=state.board[m.to],unit=state.units[unitId];
    if(!unit)throw new Error('部隊履歴と局面が一致しません');
    const own=++state.ownMoves[s],moveId=`${after.ply}:${toUSI(m)}`,oldUnit=structuredClone(unit);
    const add=(id,extra={})=>events.push(event(id,{...context,side:s},{subjectPieceIds:[unitId],ownMove:own,...extra}));
    const once=(id,scope=s,extra={})=>{const token=`${id}:${scope}`;if(state.seen.includes(token))return false;state.seen.push(token);add(id,extra);return true;};
    if(!m.drop)state.board[m.from]=null;
    if(victim){
      const enemy=state.units[victimId];enemy.ownership.push({moveId,from:enemy.ownerSide,to:s,at:after.ply});enemy.ownerSide=s;enemy.ownerEpoch++;enemy.lastActivity=own;enemy.awards=[];delete enemy.returnedAt;
      (state.hands[s][victim.t]??=[]).push(victimId);
      unit.captures.push({moveId,at:after.ply,own,ownerEpoch:unit.ownerEpoch,target:victimId,value:value(victim),safe});
      state.captures.push({attacker:unitId,victim:victimId,at:after.ply,type:victim.t,side:victim.s,merit:prior.units[victimId].awards.length>0});
      if(!state.firstCapture[s])state.firstCapture[s]=unitId;
      once(62,'game',{intensity:'small',voice:false});
    }
    state.board[m.to]=unitId;
    if(m.drop){
      unit.drops.push({moveId,side:s,own,ownerEpoch:unit.ownerEpoch});
      const first=!prior.units||!Object.values(prior.units).some(u=>u.drops.some(d=>d.side===s));
      add(18,{voice:first});
      const returned=unit.originalSide===s&&unit.ownership.some(c=>c.from===s&&c.to===1-s)&&unit.drops.some(d=>d.side===1-s)&&unit.ownership.at(-1)?.to===s;
      if(returned&&once(56,`${unitId}:${unit.ownerEpoch}`,{evidence:'history'})){unit.returnedAt=own;unit.awards.push(56);}
    }
    if(m.promote&&!oldPiece.p){unit.promotions.push({moveId,own,ownerEpoch:unit.ownerEpoch});if(oldPiece.t==='R')add(17,{voice:!certificate?.losingMate,intensity:certificate?.losingMate?'small':'medium'});}
    const inCheck=check(before,s),givesCheck=check(after,1-s),sources=givesCheck?checkingSources(after,1-s):[],k=king(after,1-s);
    if(!inCheck)state.lastQuietOwn[s]=own;
    if(givesCheck){
      add(19,{targetCells:[...sources,k],voice:!state.lastCheck[s]});
      if(sources.length>=2)add(11,{targetCells:[...sources,k]});
      else if(!m.drop&&sources.some(i=>i!==m.to&&'RBL'.includes(after.b[i].t)&&!checkingSources(before,1-s).includes(i)))add(12,{targetCells:[...sources,k],detail:'開き王手'});
    }
    state.lastCheck[s]=givesCheck;
    if(unit.originalSide===s&&unit.ownerEpoch===0&&oldPiece.t!=='K'&&!m.drop&&!zone(m.from,s)&&zone(m.to,s))once(53,s,{voice:false});
    const beforeShapes=formation(before,s,prior.board,prior.units),afterShapes=formation(after,s,state.board,state.units);
    for(const id of afterShapes)if(!beforeShapes.includes(id)&&(id>=4||safe)&&!(id<=3&&inCheck))once(id,s,{evidence:id<=3?'analysis':'pattern'});
    const defense=inCheck&&!check(after,s)&&oldPiece.t!=='K';
    if(safe){
      if(policy.order==='attack'&&pressure(after,s).length>=2&&pressure(after,s).length>pressure(before,s).length)once(6,s,{evidence:'analysis'});
      if(policy.order==='defend'&&weakZone(after,s).length<weakZone(before,s).length)once(7,s,{evidence:'analysis'});
      if(policy.order==='counter'&&inCheck&&!check(after,s)&&(givesCheck||victim))once(8,s,{evidence:'analysis'});
      const fork=forkEvidence(before,after,m,certificate);if(fork)add(fork.id,{evidence:'analysis',targetCells:[m.to,...fork.targets,k].filter(i=>i>=0)});
      const oldPins=pinned(before,1-s),pins=pinned(after,1-s).filter(p=>!oldPins.some(v=>v.cell===p.cell)&&p.sources.includes(m.to));
      if(pins.length)add(14,{evidence:'analysis',targetCells:[m.to,...pins.map(p=>p.cell),k]});
      if(oldPiece.t==='P'&&!oldPiece.p&&m.promote&&victim&&zone(m.to,s))add(16,{evidence:'analysis'});
      if(defense){
        add(21,{evidence:'analysis',targetCells:[m.to,king(after,s)]});
        if(m.drop)add(23,{evidence:'analysis',targetCells:[m.to,king(after,s)]});
        if(oldPiece.t==='G'&&victim&&checkingSources(before,s).includes(m.to)&&distance(m.from,king(before,s))<=2)add(50,{evidence:'analysis'});
        const earlier=unit.defenses.find(d=>d.ownerEpoch===unit.ownerEpoch&&d.own<prior.lastQuietOwn[s]&&d.root!==key(before));
        unit.defenses.push({moveId,own,root:key(before),ownerEpoch:unit.ownerEpoch});
        if(earlier&&once(55,`${unitId}:${unit.ownerEpoch}`,{evidence:'history-analysis'}))unit.awards.push(55);
        const retainers=state.board.filter(id=>{const u=state.units[id];return u?.originalSide===s&&u.ownerSide===s&&['G','S'].includes(u.basePieceType);});
        if(retainers.length===1&&retainers[0]===unitId&&distance(m.to,king(after,s))<=2)once(81,s,{evidence:'history-analysis'});
      }
      if(inCheck&&givesCheck)add(24,{evidence:'analysis'});
      if(victim){
        if(oldPiece.t==='P'&&!oldPiece.p&&['R','B'].includes(victim.t))add(46,{evidence:'analysis'});
        if(oldPiece.t==='L'&&!oldPiece.p&&Math.abs(m.from-m.to)>=27&&value(victim)>=450)add(47,{evidence:'analysis'});
        if(oldPiece.t==='N'&&!oldPiece.p&&before.b.some((p,i)=>p?.s===1-s&&Math.floor(i/9)===(Math.floor(m.from/9)+Math.floor(m.to/9))/2&&Math.abs(i%9-m.from%9)<=1))add(48,{evidence:'analysis'});
        if(oldPiece.t==='S'&&['G','S'].includes(victim.t)&&distance(m.to,k)<=2)add(49,{evidence:'analysis'});
        const captures=unit.captures.filter(c=>c.ownerEpoch===unit.ownerEpoch&&c.safe);
        if(captures.length>=3&&captures.reduce((sum,c)=>sum+c.value,0)>=450&&once(54,`${unitId}:${unit.ownerEpoch}`,{evidence:'history-analysis'}))unit.awards.push(54);
        if(value(victim)>=450){
          if(unit.returnedAt&&own-unit.returnedAt<=6&&captures.filter(c=>c.own>unit.returnedAt).length===1)once(57,`${unitId}:${unit.ownerEpoch}`,{evidence:'history-analysis'});
          else if(unit.ownership.at(-1)?.from===1-s&&unit.drops.filter(d=>d.side===s).length===1&&own-unit.drops.at(-1)?.own===1)once(58,`${unitId}:${unit.ownerEpoch}`,{evidence:'history-analysis'});
          if(oldPiece.t!=='K'&&!oldUnit.captures.length&&!oldUnit.defenses.length&&own-1-oldUnit.lastActivity>=8)once(80,unitId,{evidence:'history-analysis'});
          if(oldUnit.awards.includes(55)&&zone(m.to,s))once(83,`${unitId}:${unit.ownerEpoch}`,{evidence:'history-analysis'});
          if(state.firstCapture[s]===unitId&&['P','L','N'].includes(oldPiece.t)&&oldPiece.p&&oldUnit.promotions.some(p=>p.ownerEpoch===unit.ownerEpoch))once(85,`${unitId}:${unit.ownerEpoch}`,{evidence:'history-analysis'});
        }
        const fallen=prior.captures.find(c=>c.attacker===victimId&&c.side===s&&c.merit&&c.type===oldPiece.t&&after.ply-c.at<=4&&c.victim!==unitId);
        if(fallen)once(84,`${fallen.victim}:${victimId}`,{evidence:'history-analysis'});
      }
      const tokin=after.b.flatMap((p,i)=>p?.s===s&&p.t==='P'&&p.p?[state.board[i]]:[]);
      if(tokin.length===3&&before.b.filter(p=>p?.s===s&&p.t==='P'&&p.p).length<3&&tokin.some(id=>state.units[id].captures.some(c=>c.safe&&c.ownerEpoch===state.units[id].ownerEpoch)))once(89,s,{evidence:'history-analysis',subjectPieceIds:tokin});
    }
    unit.lastActivity=own;
    // Checking by a stationary rear unit also counts as activity for Hidden Reserve.
    for(const i of sources)state.units[state.board[i]].lastActivity=own;
    if(result?.winner!==null&&result?.winner!==undefined){
      if(result.reason==='checkmate'){add(29,{reason:result.reason,side:result.winner});if(oldPiece.t==='P')add(60,{reason:result.reason,side:result.winner});}
      once(30,'game',{reason:result.reason,side:result.winner});
    }
    return events;
  }
}
