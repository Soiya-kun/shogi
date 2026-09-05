import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EngineClient} from '../dist/ai/engine-client.mjs';
class WorkerDouble{messages=[];terminated=false;postMessage(m){this.messages.push(m);}terminate(){this.terminated=true;}emit(data){this.onmessage({data});}}
const flush=async()=>{for(let i=0;i<5;i++)await Promise.resolve();};
test('engine adapter cancels during initialization and filters delayed replies across searches',async()=>{
  const worker=new WorkerDouble(),c=new EngineClient({workerFactory:()=>worker});
  const pending=c.search({requestId:'old'}),rejected=assert.rejects(pending,{name:'AbortError'});c.stop();worker.emit({type:'ready',metadata:{name:'test'}});await rejected;
  const next=c.search({requestId:'new',limits:{timeMs:500}});await flush();let resolved=false;next.then(()=>resolved=true);
  worker.emit({type:'result',request:{requestId:'old'}});await flush();assert.equal(resolved,false);
  worker.emit({type:'result',request:{requestId:'new'}});assert.equal((await next).request.requestId,'new');c.destroy();
});
test('startup and search deadlines terminate the worker; retry creates a fresh instance',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const workers=[],c=new EngineClient({workerFactory:()=>{const w=new WorkerDouble();workers.push(w);return w;}});
  let p=c.init(),rejected=assert.rejects(p,/準備/);t.mock.timers.tick(20001);await rejected;assert(workers[0].terminated);
  p=c.search({requestId:'retry',limits:{timeMs:500}});rejected=assert.rejects(p,/思考/);workers[1].emit({type:'ready',metadata:{}});await flush();t.mock.timers.tick(5501);await rejected;assert(workers[1].terminated);assert.equal(c.ready,false);c.destroy();
});
