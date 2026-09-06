import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {Match} from '../../dist/match.mjs';
const base=()=>{const g=new Match().g;g.b.fill(null);g.b[80]={t:'K',s:0,p:false};g.b[0]={t:'K',s:1,p:false};return g;};
const put=(g,i,t,s=0,p=false)=>g.b[i]={t,s,p};
async function ready(page){await expect(page.locator('body')).toHaveAttribute('data-ready','true');await page.waitForFunction(()=>window.__aether?.war());}
async function load(page,g,{effects=false,analysis=false,...war}={}){
  await page.goto('/?debug');await ready(page);
  await page.evaluate(({g,effects,analysis,war})=>{localStorage.setItem('aether-shogi-v1',JSON.stringify({g,past:[],records:[],end:''}));localStorage.setItem('aether-presentation-v1',JSON.stringify({effects,tempo:'normal'}));localStorage.setItem('aether-war-presentation-v1',JSON.stringify({analysis,...war}));},{g,effects,analysis,war});
  await page.reload();await ready(page);
}
async function cell(page,i){const p=await page.evaluate(i=>window.__aether.projectCell(i),i);await page.mouse.click(p.x,p.y);}
async function move(page,from,to,promote){await cell(page,from);await cell(page,to);if(promote!==undefined)await page.locator(promote?'#yes':'#no').click();}
const logged=(page,id)=>expect.poll(()=>page.evaluate(id=>window.__aether.war().log.some(e=>e.id===id),id)).toBe(true);

test('promotion, reinforcement and check render kanji/subtitles without voices; undo/reset cancel',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let g=base();put(g,31,'R');await load(page,g);expect(await page.locator('.war-banner').count()).toBe(0);
  await move(page,31,22,true);await logged(page,17);await expect(page.locator('.war-kanji')).toHaveText('昇龍');await expect(page.locator('.war-translation')).toHaveText('Take the skies! Dragon, command the battlefield!');
  expect(await page.locator('#war-presentation').evaluate(el=>getComputedStyle(el).pointerEvents)).toBe('none');
  await page.screenshot({path:'docs/verification/war-promotion.png'});
  expect(await page.evaluate(()=>window.__aether.war().audio.available)).toBe(0);
  await page.locator('#undo').click();expect(await page.locator('.war-banner').count()).toBe(0);expect(await page.evaluate(()=>window.__aether.state().g.b[31].p)).toBe(false);
  g=base();g.h[0].S=1;await load(page,g);await page.locator('#hands button').click();await cell(page,40);await logged(page,18);await expect(page.locator('.war-kanji')).toHaveText('援軍');
  await page.reload();await ready(page);expect(await page.locator('.war-banner').count()).toBe(0);expect(await page.evaluate(()=>window.__aether.war().chronicle.board[40])).toContain('hand:0:S:0');
  g=base();put(g,40,'R');await load(page,g,{effects:true});await move(page,40,36);await logged(page,19);await expect(page.locator('.war-kanji')).toHaveText('王手');
  await page.screenshot({path:'docs/verification/war-check.png'});
  await page.locator('#undo').click();expect(await page.locator('.war-banner').count()).toBe(0);
  page.once('dialog',d=>d.accept());await page.locator('#reset').click();expect(await page.evaluate(()=>window.__aether.war().log.length)).toBe(0);expect(errors).toEqual([]);
});
test('actual checkmate plays 29 then 30 once, after arrival; reload does not replay the result',async({page})=>{
  const g=base();g.b[0]=null;put(g,4,'K',1);put(g,22,'G');put(g,12,'G');put(g,14,'G');await load(page,g,{effects:true});
  await move(page,22,13);await logged(page,29);await expect(page.locator('.war-kanji')).toHaveText('詰み');await expect(page.locator('#status')).toContainText('詰み');
  await page.screenshot({path:'docs/verification/war-checkmate.png'});
  await expect(page.locator('.war-kanji')).toHaveText('凱歌',{timeout:7000});expect(await page.evaluate(()=>window.__aether.war().log.filter(e=>e.id===30).length)).toBe(1);
  await page.reload();await ready(page);expect(await page.locator('.war-banner').count()).toBe(0);await expect(page.locator('#status')).toContainText('詰み');
});
test('actual AI command acknowledgements use the current request, 3-second cadence and stop cancellation',async({page})=>{
  await load(page,new Match().g);await page.locator('#ai-toggle-1').click();expect(await page.evaluate(()=>window.__aether.war().log.some(e=>e.id===95))).toBe(false);
  await page.locator('#ai-toggle-0').click();await logged(page,95);
  await expect(page.locator('#war-presentation > .war-banner[data-event="95"]')).toBeVisible();
  await expect(page.locator('#ai-card-0 .war-banner[data-event="95"]')).toHaveCount(0);
  await page.evaluate(()=>{for(const value of ['attack','defend','counter']){const el=document.querySelector('#ai-order-0');el.value=value;el.dispatchEvent(new Event('change'));}});
  await logged(page,97);expect(await page.evaluate(()=>window.__aether.war().log.filter(e=>e.id===97).at(-1).subtitle)).toContain('watch for our moment');
  const times=[];for(let n=1;n<=3;n++){await page.waitForFunction(n=>window.__aether.state().g.ply>=n,n);times.push(Date.now());}
  await page.locator('#ai-stop-all').click();await logged(page,96);expect(await page.evaluate(()=>window.__aether.ai().settings.every(p=>!p.enabled))).toBe(true);
  const stopped=await page.evaluate(()=>window.__aether.state().g.ply);await page.waitForTimeout(3200);expect(await page.evaluate(()=>window.__aether.state().g.ply)).toBe(stopped);
  expect(times[1]-times[0]).toBeGreaterThan(2600);expect(times[2]-times[1]).toBeGreaterThan(2600);
  await writeFile('docs/verification/war-ai.json',JSON.stringify({intervals:times.slice(1).map((t,i)=>t-times[i]),stopped,events:await page.evaluate(()=>window.__aether.war().log.map(e=>({id:e.id,ply:e.ply,shown:e.shown})))},null,2));
});
test('mobile reduced motion, subtitle/language switches and OFF retain check status and selection',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});const g=base();put(g,40,'R');await load(page,g);
  await move(page,40,36);await expect(page.locator('.war-kanji')).toHaveText('王手');await expect(page.locator('.war-banner')).toHaveAttribute('data-mode','subtle');
  const box=await page.locator('.war-banner').boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(390);await page.screenshot({path:'docs/verification/war-mobile.png'});
  await page.locator('.war-settings summary').click();await page.locator('#war-mode').selectOption('off');await page.locator('#war-english').uncheck();await page.locator('#war-subtitles').uncheck();
  await expect(page.locator('#status')).toContainText('王手');expect(await page.locator('.war-banner').count()).toBe(0);await page.reload();await ready(page);expect(await page.locator('#war-mode').inputValue()).toBe('off');
});
test('voice manifest playback, unavailable audio and cancellation use one player without delaying game logic',async({page})=>{
  await page.goto('/?debug');await ready(page);
  const result=await page.evaluate(async()=>{
    const {PresentationView}=await import('/presentation-view.js');const {event}=await import('/battle-events.mjs');
    const calls=[];const voice=new PresentationView({world:document.createElement('div'),audioFactory:()=>({src:'',volume:0,play(){calls.push('play');return Promise.resolve();},pause(){calls.push('pause');},removeAttribute(){},load(){}})});
    await voice.ready;voice.sources={'17':{'0':'/audio/test.ogg'}};
    const e=event(17,{gameId:'audio',positionRevision:1,side:0,ply:1}),settings={canVoice:true,volume:.5,english:true,subtitles:true};
    const starts=voice.show(e,settings);voice.clear();const stopped=voice.audioStatus();voice.sources={};const absent=voice.show(e,settings);voice.destroy();
    return {starts,absent,stopped,calls};
  });expect(result.starts).toBe(true);expect(result.absent).toBe(false);expect(result.stopped.playing).toBe(false);expect(result.calls.filter(c=>c==='play')).toHaveLength(1);
});
test('manual tactical analysis uses real WASM in a separate worker and records a matching certificate',async({page})=>{
  const g=base();put(g,31,'P');put(g,22,'R',1);await load(page,g,{effects:true,analysis:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await move(page,31,22,true);
  await expect.poll(()=>page.evaluate(()=>window.__aether.state().presentation.proofs.length),{timeout:20000}).toBe(1);
  const result=await page.evaluate(()=>({proof:window.__aether.state().presentation.proofs[0],war:window.__aether.war(),ai:window.__aether.ai()}));
  expect(result.proof.certificate).toMatchObject({usi:'5d5c+',side:0,safe:true});expect(result.proof.certificate.depth).toBeGreaterThan(0);
  expect(result.war.log.some(e=>e.id===16)).toBe(true);expect(result.war.log.some(e=>e.id===46)).toBe(true);expect(result.ai.activeRequest).toBeNull();
  await writeFile('docs/verification/war-analysis.json',JSON.stringify({proof:result.proof,events:result.war.log.map(e=>e.id)},null,2));
  await page.reload();await ready(page);expect(await page.evaluate(()=>window.__aether.war().chronicle.units[window.__aether.war().chronicle.board[22]].captures[0].safe)).toBe(true);
  expect(await page.locator('.war-banner').count()).toBe(0);await page.locator('#undo').click();expect(await page.evaluate(()=>window.__aether.state().presentation.proofs.length)).toBe(0);expect(errors).toEqual([]);
});
test('adding a local voice asset starts actual HTMLAudio and undo cancels playback',async({page})=>{
  const wav=Buffer.alloc(44+24000*2);wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
  for(let i=0;i<24000;i++)wav.writeInt16LE(Math.round(Math.sin(i*Math.PI*2*220/8000)*1000),44+i*2);
  await page.route('**/audio/voices.json',route=>route.fulfill({json:{version:1,voices:{'17':{'0':'/audio/fixture.wav'}}}}));
  await page.route('**/audio/fixture.wav',route=>route.fulfill({contentType:'audio/wav',body:wav}));
  const g=base();put(g,31,'R');await load(page,g,{voice:true});await move(page,31,22,true);
  await expect.poll(()=>page.evaluate(()=>window.__aether.war().audio.playing)).toBe(true);await page.locator('#undo').click();expect(await page.evaluate(()=>window.__aether.war().audio.playing)).toBe(false);
});
