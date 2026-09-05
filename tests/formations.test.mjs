import {test} from 'node:test';
import assert from 'node:assert/strict';
import {formation,SQUADS,squadSpec} from '../dist/formations.mjs';
import {initial} from '../dist/rules.mjs';
import {CELL_SIZE} from '../dist/terrain.mjs';

test('all squads fit one square with equipment clearance and retain their leader on mobile',()=>{
  for(const role of Object.keys(SQUADS)){
    const members=formation(role),compact=formation(role,true);
    assert.equal(members.length,SQUADS[role].count);
    assert.equal(compact.length,6);assert.deepEqual(compact[0],members[0]);
    for(const m of members){
      assert(Math.abs(m.x)+1<CELL_SIZE/2&&Math.abs(m.z)+1.5<CELL_SIZE/2,'Equipment must stay inside its cell');
      for(const other of members)if(other!==m)assert(Math.hypot(m.x-other.x,m.z-other.z)>1.2,'Members must not overlap');
    }
  }
});
test('initial board has 40 squads, 392 people and 240 mobile representatives',()=>{
  const squads=initial().b.filter(Boolean);assert.equal(squads.length,40);
  assert.equal(squads.reduce((n,p)=>n+formation(p.t).length,0),392);
  assert.equal(squads.reduce((n,p)=>n+formation(p.t,true).length,0),240);
});

test('rook mounts change only on promotion, keeping the squad and footprint on desktop and mobile',()=>{
  for(const compact of [false,true]){
    const horses=formation('R',compact),dragons=formation('R',compact,true);
    assert.equal(horses.length,compact?6:8);assert.equal(dragons.length,horses.length);
    assert(horses.every(m=>m.type==='R'&&m.altitudeOffset===0));assert(dragons.every(m=>m.type==='D'));
    assert.deepEqual(horses.map(({x,z})=>({x,z})),dragons.map(({x,z})=>({x,z})));
  }
  assert.equal(squadSpec('R').name,'騎馬武者隊');assert.equal(squadSpec('R',true).name,'龍武者隊');
});
