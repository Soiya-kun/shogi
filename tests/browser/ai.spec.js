import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import {resolve,sep,extname} from 'node:path';
import {Match} from '../../dist/match.mjs';

async function ready(page){await expect(page.locator('body')).toHaveAttribute('data-ready','true');}
async function settled(page){await expect.poll(()=>page.evaluate(()=>window.__aether.ai().phase)).toBe('human-turn');await expect.poll(()=>page.evaluate(()=>window.__aether.diagnostics().busy)).toBe(false);}
async function ply(page,n){await expect.poll(()=>page.evaluate(()=>window.__aether.state().g.ply),{timeout:20000}).toBeGreaterThanOrEqual(n);}
async function manual(page){const state=await page.evaluate(()=>window.__aether.state()),m=new Match(state).moves.find(m=>m.from!==undefined&&!m.promote);for(const i of [m.from,m.to]){const p=await page.evaluate(i=>window.__aether.projectCell(i),i);await page.mouse.click(p.x,p.y);}}

test('a static host without isolation headers prepares AI once and preserves the ongoing game',async({browser})=>{
  const root=fileURLToPath(new URL('../../dist/',import.meta.url)),types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm','.css':'text/css'};
  const server=createServer(async(req,res)=>{
    try{const pathname=new URL(req.url,'http://localhost').pathname,file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
      if(!file.startsWith(resolve(root)+sep)){res.writeHead(403).end();return;}
      const body=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]??'application/octet-stream','Cache-Control':'no-store'}).end(body);
    }catch{res.writeHead(404).end();}
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const context=await browser.newContext(),page=await context.newPage();
  try{
    let navigations=0;page.on('framenavigated',f=>{if(f===page.mainFrame())navigations++;});
    await page.goto(`http://127.0.0.1:${server.address().port}/?debug`);await ready(page);expect(await page.evaluate(()=>crossOriginIsolated)).toBe(false);
    await manual(page);await settled(page);await page.locator('#ai-opening-1').selectOption('central');await page.locator('#ai-toggle-1').click();
    await expect.poll(()=>page.evaluate(()=>crossOriginIsolated).catch(()=>false),{timeout:20000}).toBe(true);await ready(page);await ply(page,2);await settled(page);
    expect(navigations).toBe(2);const state=await page.evaluate(()=>window.__aether.state());expect(state.records[0].actor).toBe('human');expect(state.records[1].actor).toBe('ai');
    expect(await page.locator('#ai-opening-1').inputValue()).toBe('central');await page.locator('#ai-stop-all').click();
    await page.reload();await ready(page);expect(navigations).toBe(3);expect(await page.evaluate(()=>window.__aether.state().g.ply)).toBe(2);
    expect(await page.evaluate(()=>window.__aether.ai().settings.every(p=>!p.enabled))).toBe(true);
  }finally{await context.close();await new Promise(r=>server.close(r));}
});

test('actual WASM: lazy load, rapid instructions, stop, both sides, restore and human decision undo',async({page})=>{
  const errors=[],wasm=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().endsWith('.wasm'))wasm.push(r.url());});
  await page.goto('/?debug');await ready(page);expect(wasm).toHaveLength(0);
  await page.locator('#ai-opening-0').selectOption('fourth');await page.locator('#ai-toggle-0').click();
  await page.evaluate(()=>{for(const value of ['attack','defend','counter']){const s=document.querySelector('#ai-order-0');s.value=value;s.dispatchEvent(new Event('change'));}document.querySelector('#ai-toggle-0').click();});
  await page.waitForTimeout(850);expect(await page.evaluate(()=>window.__aether.state().g.ply)).toBe(0);
  await page.locator('#ai-toggle-0').click();await ply(page,1);await page.locator('#ai-toggle-0').click();
  await page.locator('#ai-opening-1').selectOption('central');await page.locator('#ai-toggle-1').click();await ply(page,2);await settled(page);
  expect(wasm.length).toBeGreaterThan(0);expect(await page.evaluate(()=>window.__aether.ai().engine)).toMatchObject({threads:1,hashMiB:16});
  await page.reload();await ready(page);expect(await page.locator('#ai-opening-1').inputValue()).toBe('central');await expect(page.locator('#ai-toggle-1')).toHaveText('AI停止');
  await manual(page);await ply(page,4);await settled(page);await page.locator('#undo').click();await settled(page);
  expect(await page.evaluate(()=>window.__aether.state().g.ply)).toBe(2);await page.locator('#ai-stop-all').click();expect(errors).toEqual([]);
});

test('AI versus AI remains legal with live strategy changes, 3D rendering and pause on undo',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/?debug');await ready(page);
  await page.locator('#ai-opening-0').selectOption('fourth');await page.locator('#ai-order-0').selectOption('attack');
  await page.locator('#ai-opening-1').selectOption('central');await page.locator('#ai-order-1').selectOption('counter');
  await page.locator('#ai-toggle-0').click();await page.locator('#ai-toggle-1').click();
  await expect.poll(()=>page.evaluate(()=>window.__aether.diagnostics().activeMotions),{timeout:20000}).toBeGreaterThanOrEqual(2);await ply(page,4);
  await page.locator('#ai-order-0').selectOption('defend');await page.locator('#ai-opening-1').selectOption('static');await ply(page,8);
  const perf=await page.evaluate(async()=>{const intervals=[];await new Promise(resolve=>{let last=performance.now();function step(now){intervals.push(now-last);last=now;if(intervals.length<90)requestAnimationFrame(step);else resolve();}requestAnimationFrame(step);});return {meanFrameMs:intervals.reduce((a,b)=>a+b,0)/90,p95FrameMs:intervals.sort((a,b)=>a-b)[85],...window.__aether.diagnostics(),ai:window.__aether.ai()};});
  await page.locator('#ai-stop-all').click();await settled(page);const state=await page.evaluate(()=>window.__aether.state());
  const replay=new Match();for(const r of state.records){expect(r.actor).toBe('ai');replay.play(r.m);}expect(replay.g).toEqual(state.g);
  await page.waitForTimeout(900);expect(await page.evaluate(()=>window.__aether.state().g.ply)).toBe(state.g.ply);
  expect(perf.drawCalls).toBeLessThan(500);expect(perf.triangles).toBeLessThan(1100000);
  await writeFile('docs/verification/ai-performance.json',JSON.stringify(perf,null,2));
  await page.locator('#ai-heading').scrollIntoViewIfNeeded();await page.screenshot({path:'docs/verification/ai-commanders.png'});
  await page.locator('#ai-toggle-0').click();await page.locator('#ai-toggle-1').click();await ply(page,state.g.ply+2);
  await expect(page.locator('#undo')).toBeEnabled({timeout:10000});await page.locator('#undo').click();await settled(page);
  expect((await page.evaluate(()=>window.__aether.ai().settings)).every(p=>!p.enabled)).toBe(true);expect(errors).toEqual([]);
});

test('engine load failure leaves the board intact and retry recovers',async({page})=>{
  await page.route('**/ai/vendor/yaneuraou.wasm',route=>route.fulfill({status:404,body:'not available'}));
  await page.goto('/?debug');await ready(page);await page.locator('#ai-toggle-0').click();await expect(page.locator('#ai-retry-0')).toBeVisible({timeout:25000});
  expect(await page.evaluate(()=>window.__aether.state().g.ply)).toBe(0);await page.unroute('**/ai/vendor/yaneuraou.wasm');
  await page.locator('#ai-retry-0').click();await ply(page,1);await page.locator('#ai-stop-all').click();await settled(page);
});

test('mobile commanders allow touch start and stop without horizontal overflow',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});const page=await context.newPage();
  await page.goto('http://127.0.0.1:5174/?debug');await ready(page);await page.locator('#ai-opening-0').selectOption('central');await page.locator('#ai-toggle-0').tap();await ply(page,1);
  await page.locator('#ai-stop-all').tap();await settled(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('#ai-card-0').scrollIntoViewIfNeeded();await page.screenshot({path:'docs/verification/ai-mobile.png'});await context.close();
});

test('actual engine delivers a mating drop and a forced promoted move for the rear army',async({page})=>{
  await page.goto('/?debug');await ready(page);
  for(const rear of [false,true]){
    const g=new Match().g;g.b.fill(null);g.b[76]={t:'K',s:0,p:false};
    if(!rear){g.b[4]={t:'K',s:1,p:false};for(const i of [3,5,12,14])g.b[i]={t:'P',s:1,p:false};g.b[22]={t:'G',s:0,p:false};g.h[0].R=1;}
    else{g.b[0]={t:'K',s:1,p:false};g.b[9]={t:'P',s:1,p:false};g.b[10]={t:'P',s:0,p:false};g.b[11]={t:'G',s:0,p:false};g.b.reverse();g.b=g.b.map(p=>p?{...p,s:1-p.s}:null);g.turn=1;}
    await page.evaluate(g=>localStorage.setItem('aether-shogi-v1',JSON.stringify({g,past:[],records:[],end:''})),g);await page.reload();await ready(page);
    await page.locator('#ai-toggle-'+(rear?1:0)).click();await expect.poll(()=>page.evaluate(()=>window.__aether.ai().phase),{timeout:20000}).toBe('ended');
    const state=await page.evaluate(()=>window.__aether.state());expect(state.end).toContain('詰み');expect(state.g.ply).toBe(1);
    if(rear)expect(state.records[0].m.promote).toBe(true);else expect(state.records[0].m.drop).toBe('R');
  }
});
