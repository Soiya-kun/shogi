import {test} from 'node:test';
import assert from 'node:assert/strict';
import {COMBATS,COMBAT_TIMING,attackPose,combatStage,battleProgress,defeatPose} from '../dist/combat-motion.mjs';
import {formation} from '../dist/formations.mjs';

test('every attack stays finite, every rank falls before occupation, and all joint offsets settle',()=>{
  assert.equal(COMBAT_TIMING.battle,3000);
  assert.equal(battleProgress(COMBAT_TIMING.approach/COMBAT_TIMING.total),.23);
  assert.equal(battleProgress((COMBAT_TIMING.approach+3000)/COMBAT_TIMING.total),.76);
  for(const [style,spec] of Object.entries(COMBATS))for(const compact of [false,true]){
    const members=formation(style==='D'?'R':style,compact,style==='D');
    for(const [i,m] of members.entries()){
      for(let step=0;step<=100;step++){
        const t=step/100,attack=attackPose(style,m,i,t),fallen=defeatPose(m,i,t,spec.impact);
        assert(Object.values(attack).every(Number.isFinite));assert(Object.values(fallen).every(Number.isFinite));
        assert(fallen.scale>=0&&fallen.scale<=1);
        if(combatStage(style,t)==='occupy')assert.equal(fallen.fall,1,`${style}: occupation preceded the last rank falling`);
      }
      assert(Object.values(attackPose(style,m,i,1)).every(v=>Math.abs(v)<1e-8),`${style}: unfinished joint pose`);
    }
    const front={z:-4},back={z:4};
    assert(defeatPose(front,0,spec.impact+.07,spec.impact).fall>defeatPose(back,0,spec.impact+.07,spec.impact).fall);
  }
});
