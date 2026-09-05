const reloadKey='aether-ai-isolation-reload';
export async function ensureBrowserIsolation(){
  if(window.crossOriginIsolated){try{sessionStorage.removeItem(reloadKey);}catch{}return;}
  if(!window.isSecureContext||!navigator.serviceWorker)throw new Error('AIにはHTTPSまたはlocalhostの対応ブラウザが必要です');
  if(sessionStorage.getItem(reloadKey))throw new Error('AIの実行環境を準備できませんでした。配信サーバーのCOOP・COEP設定を確認してください');
  const url=new URL('../coi-serviceworker.js',import.meta.url),sw=navigator.serviceWorker;
  const existing=await sw.getRegistration(url.href);
  if(existing&&[existing.active,existing.waiting,existing.installing].some(w=>w&&w.scriptURL!==url.href))throw new Error('別のService Workerが使用中です。AIには配信サーバーのCOOP・COEP設定が必要です');
  let timer;
  await Promise.race([
    (async()=>{
      await sw.register(url,{updateViaCache:'none'});
      await new Promise((resolve,reject)=>{
        const changed=()=>{if(sw.controller?.scriptURL===url.href){cleanup();resolve();}};
        const timeout=setTimeout(()=>{cleanup();reject(new Error('AIの実行環境の準備がタイムアウトしました'));},7000);
        const cleanup=()=>{clearTimeout(timeout);sw.removeEventListener('controllerchange',changed);};
        sw.addEventListener('controllerchange',changed);changed();
      });
    })(),
    new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('AIの実行環境を準備できませんでした')),9000);})
  ]).finally(()=>clearTimeout(timer));
  // The controller saves the position and instructions before starting initialization.
  sessionStorage.setItem(reloadKey,'1');
  window.location.reload();
  throw new DOMException('AIの準備のため対局を再読み込みします','AbortError');
}
