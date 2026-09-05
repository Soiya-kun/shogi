import {apply,key,legal} from '../rules.mjs';

const square=i=>`${9-i%9}${'abcdefghi'[Math.floor(i/9)]}`;
const index=s=>('abcdefghi'.indexOf(s[1]))*9+9-Number(s[0]);
export const toUSI=m=>m.drop?`${m.drop}*${square(m.to)}`:`${square(m.from)}${square(m.to)}${m.promote?'+':''}`;
export function fromUSI(text){
  if(/^[PLNSGBR]\*[1-9][a-i]$/.test(text))return {drop:text[0],to:index(text.slice(2))};
  if(/^[1-9][a-i][1-9][a-i]\+?$/.test(text))return {from:index(text.slice(0,2)),to:index(text.slice(2,4)),promote:text.endsWith('+')};
  throw new Error('AIから不正な着手が返されました');
}
export function toSFEN(g){
  const rows=[];
  for(let r=0;r<9;r++){
    let row='',empty=0;
    for(let x=0;x<9;x++){const p=g.b[r*9+x];if(!p){empty++;continue;}if(empty){row+=empty;empty=0;}row+=(p.p?'+':'')+(p.s?p.t.toLowerCase():p.t);}
    if(empty)row+=empty;rows.push(row);
  }
  let hand='';for(const side of [0,1])for(const t of ['R','B','G','S','N','L','P']){const n=g.h[side][t]||0;if(n)hand+=(n>1?n:'')+(side?t.toLowerCase():t);}
  return `${rows.join('/')} ${g.turn?'w':'b'} ${hand||'-'} ${g.ply+1}`;
}
export function fromSFEN(sfen){
  const [board,turn,hand,ply]=sfen.split(' '),b=[];
  if(!['b','w'].includes(turn)||board.split('/').length!==9)throw new Error('Invalid SFEN');
  for(const row of board.split('/')){let promoted=false,start=b.length;for(const c of row){if(c==='+'){promoted=true;continue;}if(/[1-9]/.test(c))b.push(...Array(Number(c)).fill(null));else if(/[plnsgbrk]/i.test(c)){b.push({t:c.toUpperCase(),s:c===c.toLowerCase()?1:0,p:promoted});promoted=false;}else throw new Error('Invalid SFEN');}if(b.length-start!==9||promoted)throw new Error('Invalid SFEN row');}
  const h=[{},{}];if(hand!=='-'){let n='';for(const c of hand){if(/[0-9]/.test(c))n+=c;else if(/[plnsgbr]/i.test(c)){h[c===c.toLowerCase()?1:0][c.toUpperCase()]=Number(n||1);n='';}else throw new Error('Invalid hand');}if(n)throw new Error('Invalid hand');}
  if(!Number.isInteger(Number(ply))||Number(ply)<1)throw new Error('Invalid SFEN move number');
  return {b,h,turn:turn==='w'?1:0,ply:Number(ply)-1};
}
// Preserve all legal history; old saves with unverifiable history fail explicitly.
export function positionCommand(snapshot){
  const start=snapshot.past[0]??snapshot.g,moves=[];let g=structuredClone(start);
  for(let i=0;i<snapshot.records.length;i++){
    const m=snapshot.records[i].m;
    if(!m||!legal(g).some(v=>toUSI(v)===toUSI(m)))throw new Error('保存された棋譜をAIに渡せません。手動操作か新しい対局をお使いください');
    g=apply(g,m);moves.push(toUSI(m));
    if(key(g)!==key(snapshot.past[i+1]??snapshot.g))throw new Error('保存された局面と棋譜が一致しません');
  }
  return `position sfen ${toSFEN(start)}${moves.length?' moves '+moves.join(' '):''}`;
}
export function parseInfo(line){
  const depth=line.match(/\bdepth (\d+)/),score=line.match(/\bscore (cp|mate) (-?\d+|[+-])/),pv=line.match(/\bpv (.+)$/);
  if(!depth||!score||!pv)return null;
  return {depth:Number(depth[1]),rank:Number(line.match(/\bmultipv (\d+)/)?.[1]||1),score:{type:score[1],value:score[2]==='+'?1:score[2]==='-'?-1:Number(score[2]),bound:/\b(lowerbound|upperbound)\b/.exec(line)?.[1]??null},pv:pv[1].trim().split(/\s+/),usi:pv[1].trim().split(/\s+/)[0]};
}
