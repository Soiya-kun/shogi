import {test} from 'node:test';
import assert from 'node:assert/strict';
import {formation,SQUADS} from '../dist/formations.mjs';
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
