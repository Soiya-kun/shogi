const duration={small:5000,medium:5000,large:5000};
export const defaultPresentation=()=>({mode:'normal',subtitles:true,english:true,voice:false,volume:.7,analysis:true});
export function sanitizePresentation(p){return {mode:['normal','subtle','off'].includes(p?.mode)?p.mode:'normal',subtitles:p?.subtitles!==false,english:p?.english!==false,voice:p?.voice===true,volume:Number.isFinite(p?.volume)?Math.max(0,Math.min(1,p.volume)):.7,analysis:p?.analysis!==false};}
export class PresentationDirector {
  constructor({view,settings,now=()=>performance.now(),timer=(fn,ms)=>setTimeout(fn,ms),clearTimer=id=>clearTimeout(id)}={}){
    this.view=view;this.settings=sanitizePresentation(settings);this.now=now;this.timer=timer;this.clearTimer=clearTimer;
    this.timers=new Set();this.log=[];this.seen=new Set();this.frequency=new Map();this.voicedTerminals=new Set();this.commandTimes=[-Infinity,-Infinity];this.voiceAt=-Infinity;this.sideVoice=[-Infinity,-Infinity];this.serial=0;this.current=null;this.active=null;
  }
  later(fn,ms){const id=this.timer(()=>{this.timers.delete(id);fn();},ms);this.timers.add(id);return id;}
  cancel(reason='cancelled'){
    const keep=reason==='next-position'&&this.active&&!this.active.control&&this.activeUntil>this.now();
    this.serial++;for(const id of this.timers)this.clearTimer(id);this.timers.clear();this.flushTimer=null;this.pending=[];this.reason=reason;
    if(keep)this.expireActive();else{this.active=null;this.view?.clear();}
  }
  expireActive(){const e=this.active,serial=this.serial;this.later(()=>{if(serial===this.serial&&this.active===e){this.active=null;this.view?.hide(e);}},Math.max(0,this.activeUntil-this.now()));}
  begin(identity){if(this.current?.gameId!==identity.gameId){this.frequency.clear();this.sideVoice=[-Infinity,-Infinity];this.voicedTerminals.clear();}this.cancel('next-position');this.current={...identity};this.presented=false;this.pending=[];}
  configure(settings){this.settings=sanitizePresentation(settings);this.cancel('settings');}
  valid(e){return this.current&&e.gameId===this.current.gameId&&e.positionRevision===this.current.positionRevision&&e.policyRevision===this.current.policyRevision;}
  key(e){return `${e.gameId}:${e.positionRevision}:${e.eventId}:${e.side}:${e.subjectPieceIds.join(',')}${e.control?':'+e.policyRevision:''}`;}
  record(e){
    const k=this.key(e),old=this.log.find(v=>v.key===k);if(old)return old;
    const row={...e,key:k,shown:false,voiced:false};this.log.push(row);if(this.log.length>48)this.log.shift();this.view?.log(this.log);return row;
  }
  submit(events,{delay=0}={}){
    for(const e of events){if(!this.valid(e))continue;this.record(e);if(!this.pending.some(p=>this.key(p)===this.key(e)))this.pending.push(e);}
    if(this.flushTimer||this.presented)return;
    const serial=this.serial;this.flushTimer=this.later(()=>{this.flushTimer=null;if(serial===this.serial)this.flush();},delay);
  }
  flush(){
    if(this.presented)return;
    const all=this.pending.filter(e=>this.valid(e)&&!this.seen.has(this.key(e))).sort((a,b)=>b.priority-a.priority);
    const e=all.find(v=>{const last=this.frequency.get(`${v.id}:${v.side}`);return v.intensity!=='medium'||last===undefined||v.ownMove-last>=12;});
    if(!e)return;
    this.presented=true;
    const resultSubtitle=e.id===29?all.find(v=>v.id===60)?.kanji:undefined;
    this.show({...e,resultSubtitle});
    if(e.id===29){const victory=all.find(v=>v.id===30);if(victory)this.later(()=>{if(this.valid(victory))this.show({...victory,resultSubtitle});},duration.large+100);}
  }
  show(e){
    if(!this.valid(e))return;
    const k=this.key(e);if(this.seen.has(k))return;this.seen.add(k);if(this.seen.size>512)this.seen.delete(this.seen.values().next().value);
    this.frequency.set(`${e.id}:${e.side}`,e.ownMove);const row=this.record(e);
    if(this.settings.mode==='off'){this.view?.log(this.log);return;}
    this.active=e;row.shown=true;
    const terminal=[29,30].includes(e.id),now=this.now();
    const terminalKey=`${e.gameId}:${e.id}:${e.side}`;
    const canVoice=this.settings.voice&&e.voice!==false&&(terminal?!this.voicedTerminals.has(terminalKey):(now-this.voiceAt>=8000&&(e.ownMove??0)-this.sideVoice[e.side]>=4));
    const voiced=this.view?.show(e,{...this.settings,canVoice});
    if(voiced){this.voiceAt=now;this.sideVoice[e.side]=e.ownMove??0;row.voiced=true;if(terminal)this.voicedTerminals.add(terminalKey);}
    this.view?.log(this.log);this.activeUntil=this.now()+duration[e.intensity];this.expireActive();
  }
  control(e){
    if(!this.valid(e))return;
    if(e.id===95&&this.now()-this.commandTimes[e.side]<60000)return;
    if(e.id===95)this.commandTimes[e.side]=this.now();
    // Commands use the control card, and do not consume the move's main title.
    this.show({...e,control:true});
  }
  diagnostics(){return {active:this.active?{...this.active}:null,pending:this.pending.length,log:structuredClone(this.log),settings:{...this.settings},timers:this.timers.size,reason:this.reason,audio:this.view?.audioStatus?.()??null};}
}
