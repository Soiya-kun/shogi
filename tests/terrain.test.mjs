import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cellXZ,cellAt,terrainSampler,HALF_FIELD} from '../dist/terrain.mjs';
test('all 81 cells round-trip; out-of-bounds never select a piece',()=>{
  for(let i=0;i<81;i++)assert.equal(cellAt(...cellXZ(i)),i);
  assert.equal(cellAt(-HALF_FIELD,0),36);assert.equal(cellAt(HALF_FIELD,0),null);assert.equal(cellAt(0,-8),null);
});
test('terrain sampling follows actual triangle slopes and rejects holes',()=>{
  const h=terrainSampler(new Float32Array([0,0,0, 1,2,0, 0,4,1, 1,6,1]),new Uint16Array([0,2,1,1,2,3]));
  assert.equal(h(.25,.25),1.5);assert.equal(h(.75,.75),4.5);assert.equal(h(.5,.5),3);
  assert.throws(()=>h(3,3),/no surface/);
});
