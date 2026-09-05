import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initial,apply,legal,check,key} from '../dist/rules.mjs';
import {fromSFEN,fromUSI,toUSI} from '../dist/ai/usi-codec.mjs';
import {BOOK} from '../dist/ai/openings/book.mjs';
import {openingPlan,rotateMove,chooseMove,comparableCandidates,features} from '../dist/ai/strategy-policy.mjs';

const policy=(order='auto',opening='auto')=>({enabled:true,order,opening});
const snapshot=g=>({g,past:[],records:[]});
const result=rows=>({main:{bestmove:rows[0][0],count:rows.length,lines:rows.map(([m,n],i)=>`info depth 6 multipv ${i+1} score cp ${n} pv ${m}`)}});
test('all original opening branches are legal for either side; unsupported midgames suspend the plan',()=>{
  assert(Object.keys(BOOK).length>150);
  for(const [sfen,styles] of Object.entries(BOOK)){
    const g=fromSFEN(sfen+' 1'),normal=new Set(legal(g).map(toUSI));
    const rear={...g,turn:1,b:[...g.b].reverse().map(p=>p?{...p,s:1-p.s}:null),h:[g.h[1],g.h[0]]},mirrored=new Set(legal(rear).map(toUSI));
    for(const moves of Object.values(styles))for(const move of moves){assert(normal.has(move));assert(mirrored.has(toUSI(rotateMove(fromUSI(move)))));}
  }
  const g=initial();assert(openingPlan(g,policy('auto','fourth')).moves.includes('7g7f'));assert(openingPlan(g,policy('auto','central')).moves.includes('5g5f'));
  g.ply=60;assert.equal(openingPlan(g,policy('attack','fourth')).state,'suspended');
  const off=initial();off.b[64]=null;off.ply=8;assert(openingPlan(off,policy('auto','central')).moves.includes('2h5h'));
});
test('only complete, exact scores at the same depth are compared, including opening checks',()=>{
  const r=result([['7g7f',90],['2g2f',80]]);r.main.lines.push('info depth 7 multipv 1 score cp 500 lowerbound pv 7g7f');
  r.opening={count:1,lines:['info depth 6 score cp 85 pv 5g5f','info depth 8 score cp 900 pv 5g5f']};
  const candidates=comparableCandidates(r);assert.equal(candidates.length,3);assert(candidates.every(c=>c.depth===6&&!c.score.bound));
});
test('attack, defense and counterattack use distinct positional features inside the score band',()=>{
  const g=initial();g.b.fill(null);g.b[76]={t:'K',s:0,p:false};g.b[4]={t:'K',s:1,p:false};g.b[67]={t:'G',s:0,p:false};g.b[40]={t:'R',s:0,p:false};g.b[53]={t:'B',s:1,p:false};g.b[13]={t:'G',s:1,p:false};
  const moves=legal(g),base=features(g,0),scored=moves.map(m=>{const f=features(apply(g,m),0);return {m,f};});
  // Equal engine scores isolate the intentional choice of positional policy.
  const r=result(scored.map(({m})=>[toUSI(m),100])),plan={moves:[]};
  const choices=Object.fromEntries(['auto','attack','defend','counter'].map(order=>[order,chooseMove(snapshot(g),policy(order),plan,r)]));
  const selected=order=>features(apply(g,choices[order].m),0);
  assert(selected('attack').pressure>=selected('defend').pressure);assert(selected('defend').safety>=selected('attack').safety);
  assert.notEqual(toUSI(choices.attack.m),toUSI(choices.defend.m));assert(selected('counter').threat<=base.threat);
  const unsafe=result([['5e5d',300],['5e1e',0]]);assert.equal(toUSI(chooseMove(snapshot(g),policy('attack'),{moves:['5e1e']},unsafe).m),'5e5d');
});
test('mate and check override style, and unsupported declarations never win automatically',()=>{
  const g=initial(),r=result([['7g7f',100],['5g5f',95]]);
  r.main.lines[1]='info depth 6 multipv 2 score mate 3 pv 5g5f';assert.equal(toUSI(chooseMove(snapshot(g),policy('defend','fourth'),{moves:['7g7f']},r).m),'5g5f');
  const deeper=result([['7g7f',100],['5g5f',95]]);deeper.main.lines.push('info depth 8 multipv 1 score cp 100 pv 7g7f','info depth 8 multipv 2 score mate 3 pv 5g5f');
  deeper.opening={count:1,lines:['info depth 6 score cp 100 pv 7g7f']};
  assert.equal(toUSI(chooseMove(snapshot(g),policy('defend','fourth'),{moves:['7g7f']},deeper).m),'5g5f');
  assert.throws(()=>chooseMove(snapshot(g),policy(),{moves:[]},{main:{bestmove:'win'}}));
  assert.deepEqual(chooseMove(snapshot(g),policy(),{moves:[]},{main:{bestmove:'resign'}}),{resign:true});
  g.b.fill(null);g.b[76]={t:'K',s:0,p:false};g.b[4]={t:'K',s:1,p:false};g.b[58]={t:'R',s:1,p:false};assert(check(g,0));
  const moves=legal(g).map(toUSI),checked=result(moves.map((m,i)=>[m,100-i*10]));assert.equal(toUSI(chooseMove(snapshot(g),policy('attack'),{moves:[moves.at(-1)]},checked).m),moves[0]);
});
