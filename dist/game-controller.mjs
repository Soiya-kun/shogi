import {Match} from './match.mjs';
import {EngineClient} from './ai/engine-client.mjs';
import {positionCommand} from './ai/usi-codec.mjs';
import {defaultPolicy,sanitizePolicy,openingPlan,chooseMove} from './ai/strategy-policy.mjs';

const copy=value=>structuredClone(value),ids=['gameId','positionRevision','policyRevision','requestId','side'];
export const AI_TEMPOS=Object.freeze({fast:{minimum:1000,nodes:12000,timeMs:350},normal:{minimum:3000,nodes:50000,timeMs:1500},slow:{minimum:5000,nodes:80000,timeMs:2200}});
export class GameController {
  constructor({saved,engine=new EngineClient(),animate=async()=>{},onChange=()=>{},onNotice=()=>{},onEvent=()=>{},minimumThinkMs=AI_TEMPOS.normal.minimum}={}){
    this.match=new Match(saved);this.engine=engine;this.animate=animate;this.onChange=onChange;this.onNotice=onNotice;this.onEvent=onEvent;this.minimumThinkMs=minimumThinkMs;
    this.tempo='normal';this.searchLimits={nodes:AI_TEMPOS.normal.nodes,timeMs:AI_TEMPOS.normal.timeMs};
    const ai=this.match.g===saved?.g&&saved?.version===2?saved.ai:null;
    this.settings=[0,1].map(s=>sanitizePolicy(ai?.settings?.[s]??defaultPolicy()));
    this.baseline=[0,1].map(s=>sanitizePolicy(ai?.baseline?.[s]??this.settings[s]));
    this.history=Array.isArray(ai?.history)?ai.history.filter(e=>[0,1].includes(e.side)&&Number.isInteger(e.at)&&e.at>=0&&e.at<=this.match.past.length&&Number.isInteger(e.sequence)).map(e=>({...e,before:sanitizePolicy(e.before),after:sanitizePolicy(e.after)})):[];
    this.sequence=Math.max(0,...this.history.map(e=>e.sequence));this.plans=[{},{}];
    this.gameId=crypto.randomUUID();this.positionRevision=0;this.policyRevision=0;this.requestSequence=0;
    this.ready=false;this.animations=new Set();this.disposed=false;this.activeRequest=null;this.errors=[null,null];this.notices=['手動で操作できます','手動で操作できます'];
  }
  get phase(){return !this.ready?'loading':this.match.end?'ended':this.errors[this.match.g.turn]?'error':this.activeRequest?(this.engine.ready?'ai-thinking':'loading'):'human-turn';}
  get animating(){return this.animations.size>0;}
  get canPlay(){return this.ready&&!this.match.end&&!this.settings[this.match.g.turn].enabled&&!this.disposed;}
  start(){this.ready=true;this.changed();this.schedule();}
  setTempo(tempo){const value=AI_TEMPOS[tempo];if(!value)return;this.tempo=tempo;this.minimumThinkMs=value.minimum;this.searchLimits={nodes:value.nodes,timeMs:value.timeMs};this.changed();}
  changed(){this.onChange(this);}
  emit(type,payload={}){try{this.onEvent(type,payload);}catch(error){console.error('戦局演出を省略しました',error);}}
  invalidate(){this.activeRequest=null;this.engine.stop();}
  updateSide(side,patch){
    if(![0,1].includes(side)||this.disposed)return;
    const before=copy(this.settings[side]),after=sanitizePolicy({...before,...patch});
    if(JSON.stringify(before)===JSON.stringify(after))return;
    this.invalidate();this.policyRevision++;this.settings[side]=after;this.errors[side]=null;
    if(before.opening!==after.opening)this.plans[side]={};
    this.history.push({sequence:++this.sequence,at:this.match.past.length,side,before,after:copy(after)});
    this.notices[side]=after.enabled?'指示を反映して考えます':'手動で操作できます';
    this.emit('policy',{side,before,after});this.changed();this.schedule();
  }
  retry(side){this.invalidate();this.errors[side]=null;this.changed();this.schedule();}
  current(request){return !this.disposed&&this.activeRequest&&ids.every(k=>this.activeRequest[k]===request[k])&&request.gameId===this.gameId&&request.positionRevision===this.positionRevision&&request.policyRevision===this.policyRevision&&request.side===this.match.g.turn&&this.settings[request.side].enabled&&!this.match.end;}
  async schedule(){
    const side=this.match.g.turn;
    if(!this.ready||this.disposed||this.match.end||this.activeRequest||!this.settings[side].enabled||this.errors[side])return;
    const snapshot=copy(this.match.serialize()),policy=copy(this.settings[side]);
    const request={gameId:this.gameId,positionRevision:this.positionRevision,policyRevision:this.policyRevision,requestId:`${this.gameId}:${++this.requestSequence}`,side,opening:policy.opening,order:policy.order,limits:{...this.searchLimits}};
    this.activeRequest=request;const started=performance.now();this.changed();
    try{
      const legalCount=this.match.moves.length;if(!legalCount)throw new Error('AIが指せる合法手がありません');
      const plan=openingPlan(snapshot.g,policy,this.plans[side]);this.notices[side]=plan.message;
      Object.assign(request,{position:positionCommand(snapshot),legalCount,openingMoves:plan.moves});
      await this.engine.init();if(!this.current(request))return;this.emit('thinking',{request,policy});this.changed();
      const result=await this.engine.search(copy(request));
      if(!this.current(request))return;
      if(!ids.every(k=>result.request?.[k]===request[k]))throw new Error('AIの回答が現在の局面と一致しません');
      const choice=chooseMove(snapshot,policy,plan,result);
      const remaining=this.minimumThinkMs-(performance.now()-started);if(remaining>0)await new Promise(resolve=>setTimeout(resolve,remaining));
      if(!this.current(request))return;
      this.plans[side]={...plan,attempts:(this.plans[side].attempts??0)+(plan.state==='attempting'?1:0)};
      this.notices[side]=choice.reason??'投了';this.lastDecision={side,policy,plan,choice,requestId:request.requestId};
      if(choice.resign){this.activeRequest=null;this.match.resign(side);this.positionRevision++;this.invalidate();this.emit('terminal');this.changed();return;}
      await this.commit(choice.m,'ai',{result,request,snapshot});
    }catch(error){
      if(!this.current(request)||error.name==='AbortError')return;
      this.activeRequest=null;this.engine.stop();this.errors[side]=error.message;this.changed();
    }
  }
  async play(m){if(!this.canPlay)throw new Error('現在は手動で指せません');return this.commit(m,'human');}
  async commit(m,actor,analysis=null){
    const result=this.match.play(m);this.match.records.at(-1).actor=actor;
    this.activeRequest=null;this.positionRevision++;
    const event={gameId:this.gameId,positionRevision:this.positionRevision,eventId:`${this.gameId}:${this.positionRevision}`};this.animations.add(event);
    this.emit('commit',{...result,event,analysis});
    this.changed();
    // Presentation is independent of turn order, including when two AIs keep playing.
    Promise.resolve().then(()=>{if(this.animations.has(event))return this.animate({...result,event});})
      .catch(()=>{if(this.animations.has(event))this.onNotice('着手は確定しました。表示を復元します');})
      .finally(()=>{if(this.animations.delete(event)){this.emit('settled',{event});this.changed();}});
    this.schedule();
    return result;
  }
  undo(){
    if(!this.match.past.length&&this.match.resignation===null)return false;
    const controlled=this.settings.map(p=>p.enabled),one=controlled.filter(Boolean).length===1,human=controlled[0]?1:0,resigned=this.match.resignation!==null;
    this.invalidate();this.animations.clear();this.positionRevision++;this.policyRevision++;
    this.match.undo();
    if(one&&!resigned)while(this.match.past.length&&this.match.g.turn!==human)this.match.undo();
    const at=this.match.past.length;this.history=this.history.filter(e=>e.at<=at);this.settings=copy(this.baseline);
    for(const e of this.history)this.settings[e.side]=copy(e.after);
    // Two-AI observation, resignation and positions with no prior human decision pause.
    if(controlled.every(Boolean)||resigned||this.settings[this.match.g.turn].enabled)this.settings.forEach((p,side)=>{if(p.enabled){const before=copy(p);p.enabled=false;this.history.push({sequence:++this.sequence,at,side,before,after:copy(p)});}});
    this.errors=[null,null];this.plans=[{},{}];this.notices=['指示をこの局面へ戻しました','指示をこの局面へ戻しました'];
    this.emit('undo');this.changed();this.schedule();return true;
  }
  reset(){
    this.invalidate();this.animations.clear();this.gameId=crypto.randomUUID();this.positionRevision++;this.policyRevision++;
    this.match.reset();this.settings.forEach(p=>p.enabled=false);this.baseline=copy(this.settings);this.history=[];this.plans=[{},{}];this.errors=[null,null];
    this.notices=['手動で操作できます','手動で操作できます'];this.emit('reset');this.changed();
  }
  serialize(){return {...this.match.serialize(),version:2,ai:{settings:copy(this.settings),baseline:copy(this.baseline),history:copy(this.history)}};}
  diagnostics(){return {gameId:this.gameId,phase:this.phase,animations:this.animations.size,tempo:this.tempo,minimumThinkMs:this.minimumThinkMs,settings:copy(this.settings),errors:[...this.errors],notices:[...this.notices],activeRequest:this.activeRequest?copy(this.activeRequest):null,engine:this.engine.metadata??null,positionRevision:this.positionRevision,policyRevision:this.policyRevision,lastDecision:this.lastDecision?copy(this.lastDecision):null};}
  destroy(){this.disposed=true;this.animations.clear();this.invalidate();this.emit('destroy');this.engine.destroy();}
}
