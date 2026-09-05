import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GameController} from '../dist/game-controller.mjs';
import {toUSI} from '../dist/ai/usi-codec.mjs';
import {initial} from '../dist/rules.mjs';

const tick=()=>new Promise(resolve=>setImmediate(resolve));
class FakeEngine {
  ready=true;requests=[];
  async init(){}
  search(request){return new Promise((resolve,reject)=>this.requests.push({request,resolve,reject}));}
  stop(){} // Deliberately delivers late results, exercising controller identity checks.
  destroy(){}
  respond(index=-1,usi='7g7f',score=20){const p=this.requests.at(index);p.resolve({request:p.request,main:{bestmove:usi,count:1,lines:[`info depth 4 score cp ${score} pv ${usi}`]}});}
}
function setup(options={}){const engine=new FakeEngine(),c=new GameController({engine,minimumThinkMs:0,...options});c.start();return {c,engine};}
test('start either side at any position, stop thinking, discard late results and return to manual',async()=>{
  const {c,engine}=setup();c.updateSide(0,{enabled:true});await tick();assert.equal(engine.requests.length,1);assert.equal(c.canPlay,false);
  c.updateSide(0,{enabled:false});engine.respond();await tick();assert.equal(c.match.g.ply,0);assert(c.canPlay);
  await c.play({from:54,to:45});c.updateSide(1,{enabled:true});await tick();engine.respond(-1,'3c3d');await tick();assert.equal(c.match.g.ply,2);assert.equal(c.match.records[1].actor,'ai');assert(c.canPlay);c.destroy();
});
test('last instruction wins; an older response cannot masquerade as the new request',async()=>{
  const {c,engine}=setup();c.updateSide(0,{enabled:true});await tick();
  for(const order of ['attack','defend','counter']){c.updateSide(0,{order});await tick();}
  assert.equal(engine.requests.length,4);for(let i=0;i<3;i++)engine.respond(i,'2g2f');await tick();assert.equal(c.match.g.ply,0);
  engine.respond(3);await tick();assert.equal(c.match.g.ply,1);assert.equal(c.lastDecision.policy.order,'counter');c.destroy();
});
test('both AIs commit while earlier animations continue; changing instructions never waits for presentation',async()=>{
  const completions=[];const {c,engine}=setup({animate:()=>new Promise(r=>completions.push(r))});
  c.updateSide(0,{enabled:true});c.updateSide(1,{enabled:true,opening:'central'});await tick();engine.respond();await tick();
  assert(c.animating);assert.equal(c.phase,'ai-thinking');assert.equal(engine.requests.at(-1).request.side,1);
  c.updateSide(1,{order:'defend'});await tick();assert.equal(engine.requests.at(-1).request.order,'defend');
  engine.respond(-1,'3c3d');await tick();assert.equal(c.match.g.ply,2);assert.equal(completions.length,2);assert.equal(c.animations.size,2);
  assert.equal(engine.requests.at(-1).request.side,0);c.undo();assert.equal(c.match.g.ply,1);assert(c.settings.every(p=>!p.enabled));
  completions.forEach(r=>r());await tick();assert.equal(c.match.g.ply,1);assert(!c.animating);c.destroy();
});

test('human input and reset remain available while presentation is pending',async()=>{
  const completions=[];const {c}=setup({animate:()=>new Promise(r=>completions.push(r))});
  await c.play({from:54,to:45});assert(c.canPlay);await c.play({from:18,to:27});assert.equal(c.match.g.ply,2);assert(c.animating);
  c.reset();completions.forEach(r=>r());await tick();assert.equal(c.match.g.ply,0);assert(!c.animating);c.destroy();
});
test('human/AI undo returns to the human decision and rolls policy changes back',async()=>{
  const {c,engine}=setup();c.updateSide(1,{enabled:true});await c.play({from:54,to:45});await tick();
  c.updateSide(1,{order:'defend'});await tick();engine.respond(-1,'3c3d');await tick();assert.equal(c.match.g.ply,2);
  c.undo();assert.equal(c.match.g.ply,0);assert.equal(c.settings[1].order,'auto');assert(c.canPlay);assert.equal(c.history.length,1);c.destroy();
});
test('undo during thinking and reset invalidate replies; AI versus AI undo pauses both sides',async()=>{
  const {c,engine}=setup();c.updateSide(1,{enabled:true});await c.play({from:54,to:45});await tick();c.undo();engine.respond(-1,'3c3d');await tick();assert.equal(c.match.g.ply,0);
  c.updateSide(0,{enabled:true});await tick();engine.respond(-1);await tick();assert.equal(c.match.g.ply,1);
  c.undo();assert(c.settings.every(p=>!p.enabled));assert.equal(c.match.g.ply,0);
  c.updateSide(0,{enabled:true});await tick();const id=c.gameId;c.reset();engine.respond(-1);await tick();assert.notEqual(c.gameId,id);assert.equal(c.match.g.ply,0);c.destroy();
});
test('save restores policies with fresh request IDs; old saves stay manual',async()=>{
  const {c}=setup();c.updateSide(0,{opening:'fourth',order:'attack',enabled:true});await tick();const saved=structuredClone(c.serialize()),old=c.activeRequest.requestId;
  const second=setup({saved});await tick();assert.equal(second.c.settings[0].opening,'fourth');assert.notEqual(second.c.activeRequest.requestId,old);
  const legacy=setup({saved:{g:initial(),past:[],records:[],end:''}});assert(legacy.c.settings.every(p=>!p.enabled));c.destroy();second.c.destroy();legacy.c.destroy();
});
test('illegal result, load failure and timeout stop without playing; retry and resignation are explicit',async()=>{
  const {c,engine}=setup();c.updateSide(0,{enabled:true});await tick();engine.respond(-1,'7g7e');await tick();assert.equal(c.phase,'error');assert.equal(c.match.g.ply,0);
  c.retry(0);await tick();engine.requests.at(-1).reject(new Error('load failed'));await tick();assert.equal(c.phase,'error');
  c.retry(0);await tick();engine.respond(-1,'resign');await tick();assert.match(c.match.end,/先手AIが投了/);assert.equal(c.match.g.ply,0);
  c.undo();assert.equal(c.match.end,'');assert(c.canPlay);c.destroy();
});

test('a reply carrying mismatched revisions fails safely instead of leaving a thinking state',async()=>{
  const {c,engine}=setup();c.updateSide(0,{enabled:true});await tick();const p=engine.requests[0];
  p.resolve({request:{...p.request,positionRevision:-1},main:{bestmove:'7g7f'}});await tick();assert.equal(c.phase,'error');assert.equal(c.match.g.ply,0);c.destroy();
});

test('undo after stopping an AI never reactivates it to replay the undone move',async()=>{
  const {c,engine}=setup();c.updateSide(0,{enabled:true});await tick();engine.respond();await tick();
  c.updateSide(0,{enabled:false});c.undo();await tick();assert.equal(c.match.g.ply,0);assert(c.canPlay);assert.equal(engine.requests.length,1);
  const restored=setup({saved:structuredClone(c.serialize())});assert(restored.c.canPlay);c.destroy();restored.c.destroy();
});
