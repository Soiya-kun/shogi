import {ensureBrowserIsolation} from './browser-isolation.mjs';
const aborted=()=>new DOMException('思考を取り消しました','AbortError');
export class EngineClient {
  constructor({workerFactory=()=>new Worker(new URL('./engine-worker.js',import.meta.url))}={}){this.workerFactory=workerFactory;this.generation=0;this.ready=false;}
  init(){
    if(this.initializing)return this.initializing;
    if(typeof window!=='undefined'&&!window.crossOriginIsolated){
      this.initializing=ensureBrowserIsolation().then(()=>{this.initializing=null;return this.init();}).catch(error=>{this.initializing=null;throw error;});
      return this.initializing;
    }
    const worker=this.worker=this.workerFactory();
    this.initializing=new Promise((resolve,reject)=>{
      this.initReject=reject;
      this.initTimer=setTimeout(()=>this.fail(new Error('AIの準備が時間内に完了しませんでした')),20000);
      worker.onmessage=({data})=>{
        if(worker!==this.worker)return;
        if(data.type==='ready'){clearTimeout(this.initTimer);this.ready=true;this.metadata=data.metadata;resolve(data.metadata);}
        if(data.type==='fatal')this.fail(new Error(data.message));
        if(data.type==='result'||data.type==='error'){
          const pending=this.pending;if(!pending||pending.request.requestId!==data.request.requestId)return;
          clearTimeout(pending.timer);this.pending=null;
          if(data.type==='error')pending.reject(new Error(data.message));else pending.resolve(data);
        }
      };
      worker.onerror=e=>{e.preventDefault?.();this.fail(new Error('AIを読み込めませんでした。再試行するか手動に切り替えてください'));};
      worker.onmessageerror=()=>this.fail(new Error('AIとの通信に失敗しました'));
      worker.postMessage({type:'init'});
    });
    return this.initializing;
  }
  async search(request){
    this.stop();const generation=this.generation;await this.init();
    if(generation!==this.generation)throw aborted();
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>this.fail(new Error('AIの思考が時間内に完了しませんでした')),Math.min(12000,(request.limits?.timeMs??1500)+5000));
      this.pending={request,resolve,reject,timer};this.worker.postMessage({type:'search',request});
    });
  }
  stop(){
    this.generation++;
    if(this.pending){clearTimeout(this.pending.timer);this.pending.reject(aborted());this.pending=null;}
    this.worker?.postMessage({type:'stop'});
  }
  fail(error){
    clearTimeout(this.initTimer);this.initReject?.(error);
    if(this.pending){clearTimeout(this.pending.timer);this.pending.reject(error);this.pending=null;}
    this.worker?.terminate();this.worker=null;this.initializing=null;this.ready=false;this.generation++;
  }
  destroy(){this.stop();this.fail(aborted());}
}
