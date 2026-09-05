import {Chronicle,event,outcome} from './battle-events.mjs';
import {certify} from './presentation-analysis.mjs';
import {EngineClient} from './ai/engine-client.mjs';
import {positionCommand,toUSI} from './ai/usi-codec.mjs';
import {legal,key,apply,check} from './rules.mjs';
import {COMBAT_TIMING} from './combat-motion.mjs';

const copy=v=>structuredClone(v);
const orders={attack:['攻めに転ずる。承知した！','We take the offensive. Understood!'],defend:['守りを優先する。承知した！','Defense comes first. Understood!'],counter:['機をうかがう。任せよ！','We will watch for our moment. Leave it to me!'],auto:['局面を見て決める。任せよ！','I will judge the position. Leave it to me!']};
export class BattlePresentation {
  constructor({controller,director,saved,engineFactory=()=>new EngineClient(),save=()=>{},animated=()=>true}){
    this.controller=controller;this.director=director;this.engineFactory=engineFactory;this.save=save;this.animated=animated;this.generation=0;this.analysisCount=0;this.analysisStatus='idle';
    this.pendingCommands=controller.settings.map(p=>p.enabled?95:null);this.pendingReturn=[false,false];this.restore(saved);
    director.begin(this.identity());
  }
  identity(){const c=this.controller;return {gameId:c.gameId,positionRevision:c.positionRevision,policyRevision:c.policyRevision};}
  restore(saved){
    const snapshot=this.controller.serialize(),start=snapshot.past[0]??snapshot.g;
    this.chronicle=new Chronicle(start);this.proofs=Array.isArray(saved?.proofs)?saved.proofs.filter(p=>Number.isInteger(p.at)&&p.at>0&&p.at<=snapshot.records.length&&p.certificate):[];
    let g=copy(start),policy=copy(snapshot.ai.baseline);
    try{
      for(let i=0;i<snapshot.records.length;i++){
        for(const h of snapshot.ai.history.filter(h=>h.at===i))policy[h.side]=copy(h.after);
        const m=snapshot.records[i].m;
        if(!m||!legal(g).some(v=>toUSI(v)===toUSI(m)))throw new Error('history');
        const after=apply(g,m);if(key(after)!==key(snapshot.past[i+1]??snapshot.g))throw new Error('history');
        const certificate=this.proofs.find(p=>p.at===i+1)?.certificate;
        this.chronicle.advance({...this.identity(),before:g,after,m,policy:policy[g.turn]},certificate);g=after;
      }
      this.restored=true;
    }catch{this.chronicle=new Chronicle(snapshot.g);this.proofs=[];this.restored=false;}
  }
  serialize(){return {version:1,proofs:copy(this.proofs)};}
  cancel(reason){this.generation++;this.analysisEngine?.stop();this.analysisStatus='idle';this.director.cancel(reason);this.waitingTerminal=null;}
  configure(settings){this.cancel('settings');this.director.configure(settings);this.director.current=this.identity();}
  command(id,side,extra={}){
    const c=this.controller;
    this.director.control(event(id,{...this.identity(),side,ply:c.match.g.ply},{subjectPieceIds:[],targetCells:[],trigger:'control',ownMove:this.chronicle.state.ownMoves[side],...extra}));
  }
  handle(type,data={}){
    const c=this.controller;
    if(type==='policy'){
      this.cancel(data.before.enabled&&!data.after.enabled?'ai-stop':'policy-change');this.director.current=this.identity();
      const {side,before,after}=data;this.pendingReturn[side]=false;
      if(!after.enabled){
        this.pendingCommands[side]=null;
        if(before.enabled){
          if(c.match.g.turn!==side||c.match.end)this.command(96,side,{kanji:'手動へ切替済み',ja:'次の手番から、そなたの采配だ。',subtitle:'Manual control is set for your next turn.',voice:false});
          else if(c.animating)this.pendingReturn[side]=true;
          else this.command(96,side);
        }
      }else if(!before.enabled)this.pendingCommands[side]=95;
      else if(before.order!==after.order)this.pendingCommands[side]=97;
      return;
    }
    if(type==='thinking'){
      if(!c.current(data.request))return;
      const side=data.request.side,id=this.pendingCommands[side];this.pendingCommands[side]=null;
      if(id===97){const [ja,subtitle]=orders[data.policy.order];this.command(id,side,{ja,subtitle,voiceKey:`97.${data.policy.order}`});}
      else if(id)this.command(id,side);
      return;
    }
    if(type==='settled'){
      if(this.waitingTerminal===data.event.eventId&&this.director.valid({...data.event,policyRevision:c.policyRevision})){
        if(this.director.flushTimer){this.director.clearTimer(this.director.flushTimer);this.director.timers.delete(this.director.flushTimer);this.director.flushTimer=null;}
        this.director.flush();this.waitingTerminal=null;
      }
      if(!c.animating)for(const s of [0,1])if(this.pendingReturn[s]){this.pendingReturn[s]=false;if(c.canPlay&&c.match.g.turn===s)this.command(96,s);}
      return;
    }
    if(type==='undo'||type==='reset'){
      this.cancel(type);this.pendingCommands=[null,null];this.pendingReturn=[false,false];
      this.restore(type==='reset'?null:this.serialize());this.director.begin(this.identity());
      // Logs from abandoned moves are removed; audio cooldowns intentionally survive undo.
      this.director.log=type==='reset'?[]:this.director.log.filter(e=>e.ply<=c.match.g.ply&&!e.control);this.director.view?.log(this.director.log);return;
    }
    if(type==='destroy'){this.cancel(type);this.analysisEngine?.destroy();this.director.view?.destroy?.();return;}
    if(type==='terminal'){
      this.cancel(type);this.director.begin(this.identity());const result=outcome(c.match);
      if(result?.winner!==null)this.director.submit([event(30,{...this.identity(),side:result.winner,ply:c.match.g.ply},{reason:result.reason})]);return;
    }
    if(type!=='commit')return;
    this.cancel('next-position');this.pendingReturn=[false,false];this.director.begin(this.identity());
    const {before,after,m,analysis}=data,context={...this.identity(),before,after,m,policy:copy(c.settings[before.turn]),result:outcome(c.match)};
    const previous=copy(this.chronicle.state),certificate=analysis&&this.director.settings.analysis?certify(analysis.snapshot,m,analysis.result,analysis.request):null;
    const events=this.chronicle.advance(context,certificate),at=c.match.records.length;
    if(certificate)this.proofs.push({at,certificate});
    const delay=!this.animated()?0:before.b[m.to]?COMBAT_TIMING.approach:m.drop?700:1150;
    if(context.result?.winner!==null&&context.result?.winner!==undefined){this.waitingTerminal=data.event.eventId;this.director.submit(events,{delay:60000});return;}
    this.director.submit(events,{delay});
    if(!this.director.settings.analysis||certificate)return;
    // Analyze only potential tactical/formation transitions. Independent worker;
    // its result is never a prerequisite for an AI search or a legal move.
    const potential=!!before.b[m.to]||!!m.promote||check(before,before.turn)||check(after,after.turn)||before.ply<32||context.policy.order!=='auto';
    if(!potential)return;
    // Manual play on a simple static host must not unexpectedly reload for COOP/COEP.
    if(typeof window!=='undefined'&&!window.crossOriginIsolated){this.analysisStatus='unavailable';return;}
    const snapshot={g:before,past:copy(c.match.past.slice(0,-1)),records:copy(c.match.records.slice(0,-1)),end:'',resignation:null};
    this.analyze({context,snapshot,previous,at,delay});
  }
  async analyze({context,snapshot,previous,at,delay}){
    const generation=this.generation,started=performance.now();this.analysisStatus='thinking';
    const request={...this.identity(),side:snapshot.g.turn,requestId:`presentation:${this.controller.gameId}:${++this.analysisCount}`,position:positionCommand(snapshot),legalCount:legal(snapshot.g).length,openingMoves:[toUSI(context.m)],limits:{nodes:14000,timeMs:550}};
    try{
      this.analysisEngine??=this.engineFactory();const result=await this.analysisEngine.search(request);
      if(generation!==this.generation||!this.director.valid(context))return;
      const certificate=certify(snapshot,context.m,result,request);this.analysisStatus=certificate?'complete':'insufficient';
      if(!certificate)return;
      this.proofs.push({at,certificate});this.chronicle.state=previous;
      const events=this.chronicle.advance(context,certificate);
      this.director.submit(events,{delay:Math.max(0,delay-(performance.now()-started))});this.save();
    }catch(error){if(generation===this.generation)this.analysisStatus=error.name==='AbortError'?'idle':'unavailable';}
  }
  diagnostics(){return {...this.director.diagnostics(),analysisStatus:this.analysisStatus,analysisCount:this.analysisCount,restored:this.restored,chronicle:copy(this.chronicle.state)};}
}
