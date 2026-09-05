import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../dist/match.mjs';
import {initial} from '../dist/rules.mjs';
test('reject illegal moves; preserve state across undo and old-format saves',()=>{
  const m=new Match();assert.throws(()=>m.play({from:54,to:36}));assert.equal(m.g.ply,0);
  m.play({from:54,to:45});const restored=new Match(JSON.parse(JSON.stringify(m.serialize())));assert.deepEqual(restored.g,m.g);
  restored.undo();assert.deepEqual(restored.g,initial());
  assert.deepEqual(new Match({g:{b:Array(81).fill(null)}}).g,initial());
});
test('fourfold repetition ends game; undo reopens it',()=>{
  const m=new Match();m.g.b.fill(null);m.g.b[76]={t:'K',s:0,p:false};m.g.b[4]={t:'K',s:1,p:false};
  for(let i=0;i<3;i++)for(const [from,to] of [[76,75],[4,3],[75,76],[3,4]])m.play({from,to});
  assert.match(m.end,/千日手/);assert.equal(m.moves.length,0);m.undo();assert.equal(m.end,'');assert(m.moves.length>0);
});
