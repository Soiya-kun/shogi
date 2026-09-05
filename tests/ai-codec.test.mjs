import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initial,legal,apply,key} from '../dist/rules.mjs';
import {Match} from '../dist/match.mjs';
import {toUSI,fromUSI,toSFEN,fromSFEN,positionCommand,parseInfo} from '../dist/ai/usi-codec.mjs';
test('SFEN/USI: both sides, all squares, promoted pieces, hands and complete replay history',()=>{
  assert.equal(toSFEN(initial()),'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1');
  for(let from=0;from<81;from++)for(let to=0;to<81;to++)for(const promote of [false,true])assert.deepEqual(fromUSI(toUSI({from,to,promote})),{from,to,promote});
  for(const drop of ['P','L','N','S','G','B','R'])for(let to=0;to<81;to++)assert.deepEqual(fromUSI(toUSI({drop,to})),{drop,to});
  const m=new Match();for(let i=0;i<30;i++){m.play(m.moves[(i*17)%m.moves.length]);assert.equal(key(fromSFEN(toSFEN(m.g))),key(m.g));}
  const cmd=positionCommand(m.serialize());assert.equal(cmd.split(' moves ')[1].split(' ').length,30);
  let replay=fromSFEN(cmd.split(' moves ')[0].slice(14));for(const text of cmd.split(' moves ')[1].split(' '))replay=apply(replay,fromUSI(text));assert.equal(key(replay),key(m.g));
  const g=initial();g.b[40]={t:'B',s:1,p:true};g.b[41]={t:'R',s:0,p:true};g.h=[{P:12,N:2},{B:1,S:3}];g.turn=1;g.ply=57;assert.equal(key(fromSFEN(toSFEN(g))),key(g));
  assert.throws(()=>fromUSI('resign'));assert.throws(()=>fromUSI('0a9z'));assert.throws(()=>positionCommand({...m.serialize(),g:initial()}));
});
test('USI evaluation keeps score kind, bounds, root side and depth distinct',()=>{
  assert.deepEqual(parseInfo('info depth 9 multipv 2 score mate -3 upperbound pv 8b8h+ 7i8h'),{depth:9,rank:2,score:{type:'mate',value:-3,bound:'upperbound'},pv:['8b8h+','7i8h'],usi:'8b8h+'});
  assert.equal(parseInfo('info string ready'),null);
});
