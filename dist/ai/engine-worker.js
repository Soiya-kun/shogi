// USI has no application request IDs. Drain the old bestmove before starting a new search.
let engine,initializing,pending=null,running=false,active=null,cancelled=false,stopTimer;
const waiters=new Set(),options=new Map();let engineName='やねうら王';
function waitFor(test,timeout=15000){return new Promise((resolve,reject)=>{const waiter={test,resolve:line=>{clearTimeout(timer);waiters.delete(waiter);resolve(line);}};const timer=setTimeout(()=>{waiters.delete(waiter);reject(new Error('AIから応答がありません'));},timeout);waiters.add(waiter);});}
function fatal(error){engine?.terminate();postMessage({type:'fatal',message:error.message||'AIが停止しました'});}
function setOption(name,value){if(options.has(name))engine.postMessage(`setoption name ${name} value ${value}`);}
function initialize(){
  if(initializing)return initializing;
  initializing=(async()=>{
    if(!self.crossOriginIsolated||typeof SharedArrayBuffer==='undefined')throw new Error('AIを使うには対応ブラウザと配信設定が必要です。ページを再読み込みしてください');
    const base=new URL('./vendor/',location.href).href;importScripts(base+'yaneuraou.js');
    engine=await YaneuraOu_nosimd({locateFile:name=>base+name,mainScriptUrlOrBlob:base+'yaneuraou.js',onAbort:()=>fatal(new Error('AIの実行に失敗しました'))});
    engine.addMessageListener(line=>{
      if(line.startsWith('id name '))engineName=line.slice(8);
      if(line.startsWith('option name ')){const name=line.match(/^option name (.+?) type /)?.[1];if(name)options.set(name,line);}
      if(active&&line.startsWith('info '))active.lines.push(line);
      for(const w of [...waiters])if(w.test(line))w.resolve(line);
    });
    let done=waitFor(line=>line==='usiok');engine.postMessage('usi');await done;
    for(const required of ['Threads','USI_Hash','MultiPV'])if(!options.has(required))throw new Error('AIが必要な探索設定に対応していません');
    setOption('Threads',1);setOption('USI_Hash',16);setOption('MultiPV',5);
    // Match the rules engine's legalCount, including optional non-promotion.
    // Otherwise MultiPV can omit a rank and cannot certify a complete comparison.
    setOption('GenerateAllLegalMoves','true');
    setOption('BookFile','no_book');setOption('USI_Ponder','false');setOption('EnteringKingRule','NoEnteringKing');
    setOption('ResignValue',99999);setOption('NetworkDelay',0);setOption('NetworkDelay2',0);setOption('MinimumThinkingTime',0);
    done=waitFor(line=>line==='readyok');engine.postMessage('isready');await done;engine.postMessage('usinewgame');
    postMessage({type:'ready',metadata:{name:engineName,threads:1,hashMiB:16,options:[...options.keys()]}});
  })();return initializing;
}
function stop(){
  pending=null;cancelled=true;
  if(active){engine.postMessage('stop');clearTimeout(stopTimer);stopTimer=setTimeout(()=>fatal(new Error('AIの停止に失敗しました。再試行してください')),900);}
}
async function pass(request,moves){
  const count=moves?moves.length:Math.min(5,request.legalCount);
  setOption('MultiPV',count);engine.postMessage(request.position);
  active={lines:[]};const result=waitFor(line=>line.startsWith('bestmove '),6000);
  engine.postMessage(`go nodes ${moves?6000:request.limits.nodes} movetime ${moves?450:request.limits.timeMs}${moves?' searchmoves '+moves.join(' '):''}`);
  const bestmove=(await result).split(/\s+/)[1],lines=active.lines;active=null;clearTimeout(stopTimer);
  return {bestmove,lines,count};
}
async function pump(){
  if(running)return;running=true;
  try{
    await initialize();
    while(pending){
      const request=pending;pending=null;cancelled=false;
      try{
        const main=await pass(request);
        if(cancelled)continue;
        let opening=null;if(request.openingMoves?.length&&!['resign','win'].includes(main.bestmove))opening=await pass(request,request.openingMoves);
        if(!cancelled)postMessage({type:'result',request,main,opening});
      }catch(error){active=null;clearTimeout(stopTimer);pending=null;fatal(error);break;}
    }
  }catch(error){fatal(error);}finally{running=false;}
}
self.onmessage=({data})=>{
  if(data.type==='init')initialize().catch(fatal);
  if(data.type==='stop')stop();
  if(data.type==='search'){stop();pending=data.request;pump();}
};
