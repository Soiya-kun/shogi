import {control,camera} from './ui-controls.js';
import {test,expect} from '@playwright/test';
import {initial} from '../../dist/rules.mjs';
import {writeFile} from 'node:fs/promises';

async function ready(page){await expect(page.locator('body')).toHaveAttribute('data-ready','true');}
async function cell(page,i){const p=await page.evaluate(i=>window.__aether.projectCell(i),i);await page.mouse.click(p.x,p.y);}
async function settle(page){await expect.poll(()=>page.evaluate(()=>window.__aether.diagnostics().busy)).toBe(false);}
async function fixture(page,g){await page.evaluate(g=>localStorage.setItem('aether-shogi-v1',JSON.stringify({g,past:[],records:[],end:''})),g);await page.reload();await ready(page);}
async function measure(page){return page.evaluate(async()=>{const t=[];await new Promise(resolve=>{let last=performance.now();function step(now){t.push(now-last);last=now;if(t.length<90)requestAnimationFrame(step);else resolve();}requestAnimationFrame(step);});return {meanFrameMs:t.reduce((a,b)=>a+b,0)/t.length,p95FrameMs:t.sort((a,b)=>a-b)[85],...window.__aether.diagnostics()};});}
function blank(){const g=initial();g.b.fill(null);g.b[76]={t:'K',s:0,p:false};g.b[4]={t:'K',s:1,p:false};return g;}

test('reset confirmation supports cancel, Escape and repeated reset without window dialogs',async({page})=>{
  const dialogs=[];page.on('dialog',d=>{dialogs.push(d.type());d.dismiss();});
  await page.goto('/?debug');await ready(page);
  await cell(page,54);await cell(page,45);await settle(page);
  const modal=page.locator('#reset-confirmation');
  await control(page,'#reset','click');await expect(modal).toBeVisible();
  await expect(page.locator('#reset-cancel')).toBeFocused();
  await page.locator('#reset-cancel').click();await expect(modal).not.toBeVisible();
  await expect(page.locator('#moveCount')).toHaveText('1 手');
  await control(page,'#reset','click');await page.keyboard.press('Escape');await expect(modal).not.toBeVisible();
  await expect(page.locator('#moveCount')).toHaveText('1 手');
  for(let i=0;i<2;i++){
    await control(page,'#reset','click');await page.locator('#reset-confirm').click();
    await expect(modal).not.toBeVisible();await expect(page.locator('#moveCount')).toHaveText('0 手');
    expect(await page.evaluate(()=>window.__aether.ai().settings.every(s=>!s.enabled))).toBe(true);
  }
  await page.reload();await ready(page);await expect(page.locator('#moveCount')).toHaveText('0 手');expect(dialogs).toEqual([]);
});

test('40 squads: mouse move, undo, keyboard, restore, views and desktop render',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('/?debug');await ready(page);
  expect((await page.evaluate(()=>window.__aether.diagnostics())).units).toBe(40);
  expect(await page.evaluate(()=>window.__aether.diagnostics())).toMatchObject({soldiers:392,representedSoldiers:392,fieldWidth:108,detailedSquads:0});
  const contacts=await page.evaluate(()=>window.__aether.contacts());
  expect(contacts).toHaveLength(392);
  expect(contacts.filter(p=>p.airborne)).toHaveLength(0);
  expect(contacts.filter(p=>p.model==='R')).toHaveLength(16);
  expect(contacts.filter(p=>p.model==='N')).toHaveLength(4);
  expect(contacts.filter(p=>p.model==='A')).toHaveLength(20);
  expect(contacts.filter(p=>p.model==='H')).toHaveLength(32);
  expect(contacts.filter(p=>p.model==='S')).toHaveLength(10);
  expect(contacts.every(p=>p.airborne?p.y-p.ground>3:Math.abs(p.y-p.ground-.025)<.0001)).toBe(true);
  await cell(page,54);await expect(page.locator('#unitname')).toHaveText('足軽隊');
  await page.screenshot({path:'docs/verification/desktop-selected.png'});
  await cell(page,45);await settle(page);await expect(page.locator('#moveCount')).toHaveText('1 手');
  await page.reload();await ready(page);await expect(page.locator('#moveCount')).toHaveText('1 手');
  await control(page,'#undo','click');await expect(page.locator('#moveCount')).toHaveText('0 手');
  // Focus begins at 76. Move to pawn 58, select it, advance to 49.
  await page.locator('#scene').focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');await settle(page);await expect(page.locator('#moveCount')).toHaveText('1 手');
  await control(page,'#undo','click');await camera(page,'top');await camera(page,'rotate');
  await control(page,'#labels','click');await expect(page.locator('#labels')).toHaveText('駒名 OFF');await control(page,'#labels','click');
  await camera(page,'rotate');await camera(page,'top');
  const timing=await measure(page);
  await writeFile('docs/verification/desktop-performance.json',JSON.stringify(timing,null,2));
  expect(timing.drawCalls).toBeLessThan(500);expect(timing.triangles).toBeLessThan(1100000);
  await page.screenshot({path:'docs/verification/desktop.png'});
  await cell(page,58);await camera(page,'close');
  await expect.poll(()=>page.evaluate(()=>window.__aether.diagnostics().detailedSquads)).toBeGreaterThan(0);
  await page.waitForTimeout(1100);
  await page.screenshot({path:'docs/verification/close.png'});
  const detail=await measure(page);
  expect(detail.triangles).toBeLessThan(1100000);expect(detail.drawCalls).toBeLessThan(500);
  await writeFile('docs/verification/close-performance.json',JSON.stringify(detail,null,2));
  // Clear the selection and select through a raised flag in the low camera view.
  await cell(page,40);
  const banner=await page.evaluate(()=>window.__aether.projectBanner(58));await page.mouse.click(banner.x,banner.y);
  await expect(page.locator('#unitname')).toHaveText('足軽隊');
  await cell(page,49);await settle(page);await expect(page.locator('#moveCount')).toHaveText('1 手');
  await camera(page,'overview');
  await expect.poll(()=>page.evaluate(()=>window.__aether.diagnostics().detailedSquads)).toBe(0);
  expect(errors).toEqual([]);
});

test('capture, drop, promotion choice and promoted model survive reload',async({page})=>{
  await page.goto('/?debug');await ready(page);
  let g=blank();g.b[49]={t:'R',s:0,p:false};g.b[40]={t:'P',s:1,p:true};
  await fixture(page,g);await cell(page,49);await cell(page,40);await settle(page);
  expect(await page.evaluate(()=>window.__aether.state().g.h[0].P)).toBe(1);
  // Opponent king moves, then deploy the captured pawn with the actual hand button.
  await cell(page,4);await cell(page,3);await settle(page);
  await page.getByRole('button',{name:'歩 ×1'}).click();await cell(page,50);await settle(page);
  expect(await page.evaluate(()=>window.__aether.state().g.b[50])).toEqual({t:'P',s:0,p:false});
  g=blank();g.b[22]={t:'P',s:0,p:false};await fixture(page,g);
  await cell(page,22);await cell(page,13);await expect(page.locator('#promotion')).toBeVisible();
  await page.getByRole('button',{name:'成る',exact:true}).click();await settle(page);
  expect(await page.evaluate(()=>window.__aether.state().g.b[13].p)).toBe(true);
  await page.reload();await ready(page);expect(await page.evaluate(()=>window.__aether.state().g.b[13].p)).toBe(true);
  await page.screenshot({path:'docs/verification/promotion.png'});
});

test('mobile portrait: whole field, touch move and no horizontal overflow',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const page=await context.newPage();await page.goto('http://127.0.0.1:5174/?debug');await ready(page);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await page.evaluate(()=>window.__aether.diagnostics())).toMatchObject({soldiers:392,representedSoldiers:240,quality:'compact'});
  const archers=await page.evaluate(()=>window.__aether.contacts().filter(p=>p.model==='N'||p.model==='A'));
  expect(archers.filter(p=>p.model==='N')).toHaveLength(4);expect(archers.filter(p=>p.model==='A')).toHaveLength(20);
  expect(await page.evaluate(()=>window.__aether.contacts().filter(p=>p.model==='H').length)).toBe(24);
  for(const i of [54,45]){const p=await page.evaluate(i=>window.__aether.projectCell(i),i);await page.touchscreen.tap(p.x,p.y);}
  await settle(page);await expect(page.locator('#moveCount')).toHaveText('1 手');
  await page.screenshot({path:'docs/verification/mobile.png',fullPage:true});
  const timing=await measure(page);
  expect(timing.drawCalls).toBeLessThan(500);expect(timing.triangles).toBeLessThan(600000);
  await writeFile('docs/verification/mobile-performance.json',JSON.stringify(timing,null,2));
  await camera(page,'close');
  await expect.poll(()=>page.evaluate(()=>window.__aether.diagnostics().detailedSquads)).toBeGreaterThan(0);
  await camera(page,'overview');
  await expect.poll(()=>page.evaluate(()=>window.__aether.diagnostics().detailedSquads)).toBe(0);
  await context.close();
});

test('missing GLB shows retry instead of silently leaving a broken board',async({page})=>{
  await page.route('**/assets/meadow.glb',route=>route.abort());await page.goto('/');
  await expect(page.getByRole('button',{name:'再読み込み',exact:true})).toBeVisible();
  await expect(page.locator('body')).not.toHaveAttribute('data-ready','true');
});

test('rook cavalry changes to Eastern dragons on promotion, returns to horses on capture and restores correctly',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('/?debug');await ready(page);
  const rook=await page.evaluate(()=>window.__aether.state().g.b.findIndex(p=>p?.t==='R'&&p.s===0));
  await cell(page,rook);await expect(page.locator('#unitname')).toHaveText('騎馬武者隊');
  await expect(page.locator('#unitdesc')).toHaveText('8騎 · 騎馬隊形');
  const first=await page.evaluate(()=>window.__aether.contacts().filter(p=>p.model==='R'));
  expect(first).toHaveLength(16);expect(first.every(p=>!p.airborne&&Math.abs(p.y-p.ground-.025)<.0001)).toBe(true);
  await camera(page,'close');
  await expect.poll(()=>page.evaluate(()=>window.__aether.diagnostics().detailedSquads)).toBeGreaterThan(0);
  // View the horse and Japanese rider from the front quarter.
  await page.mouse.move(760,440);await page.mouse.down();await page.mouse.move(320,440,{steps:12});await page.mouse.up();
  await page.waitForTimeout(1100);await page.screenshot({path:'docs/verification/rook-cavalry.png'});
  const metrics=await measure(page);expect(metrics.drawCalls).toBeLessThan(500);expect(metrics.triangles).toBeLessThan(1100000);
  await writeFile('docs/verification/rook-cavalry-performance.json',JSON.stringify(metrics,null,2));
  for(const side of [0,1]){
    const g=blank(),destination=side?58:22;g.turn=side;g.b[40]={t:'R',s:side,p:false};await fixture(page,g);
    await cell(page,40);await cell(page,destination);await expect(page.locator('#promotion')).toBeVisible();
    await page.getByRole('button',{name:'成る',exact:true}).click();await settle(page);
    expect(await page.evaluate(i=>window.__aether.state().g.b[i],destination)).toEqual({t:'R',s:side,p:true});
    const flying=await page.evaluate(()=>window.__aether.contacts().filter(p=>p.airborne));
    expect(flying).toHaveLength(8);expect(flying.every(p=>p.model==='D'&&p.y-p.ground>3)).toBe(true);
    await page.waitForTimeout(200);const later=await page.evaluate(()=>window.__aether.contacts().filter(p=>p.airborne));expect(later.some((p,i)=>Math.abs(p.y-flying[i].y)>.005)).toBe(true);
    const point=await page.evaluate(i=>window.__aether.projectFlying(i),destination);await page.mouse.click(point.x,point.y);
    await camera(page,'close');await page.waitForTimeout(1100);
    if(side===0){
      // Inspect it on its own turn so the selected unit information is visible.
      await cell(page,4);await cell(page,3);await settle(page);await cell(page,destination);
      await expect(page.locator('#unitname')).toHaveText('昇格 龍武者隊');
      await page.mouse.move(760,440);await page.mouse.down();await page.mouse.move(320,440,{steps:12});await page.mouse.up();await page.waitForTimeout(400);
      await page.screenshot({path:'docs/verification/rook-eastern-dragon.png'});
      await writeFile('docs/verification/rook-eastern-dragon-performance.json',JSON.stringify(await measure(page),null,2));
      await control(page,'#undo','click'); // Undo the king reply, then undo promotion.
    }
    await page.reload();await ready(page);expect(await page.evaluate(i=>window.__aether.state().g.b[i].p,destination)).toBe(true);
    expect(await page.evaluate(()=>window.__aether.contacts().filter(p=>p.model==='D').length)).toBe(8);
    await control(page,'#undo','click');expect(await page.evaluate(()=>window.__aether.state().g.b[40])).toEqual({t:'R',s:side,p:false});
    await expect.poll(()=>page.evaluate(()=>window.__aether.contacts().filter(p=>p.model==='R').length)).toBe(8);
    expect(await page.evaluate(()=>window.__aether.contacts().some(p=>p.airborne))).toBe(false);
  }
  // A captured promoted rook is deployed as a ground-based horse squad.
  const capture=blank();capture.turn=1;capture.b[40]={t:'R',s:0,p:true};capture.b[13]={t:'R',s:1,p:false};await fixture(page,capture);
  await cell(page,13);await cell(page,40);await settle(page);await cell(page,76);await cell(page,75);await settle(page);
  await page.getByRole('button',{name:'飛 ×1'}).click();await cell(page,30);await settle(page);
  expect(await page.evaluate(()=>window.__aether.state().g.b[30])).toEqual({t:'R',s:1,p:false});
  expect(await page.evaluate(()=>window.__aether.contacts().some(p=>p.airborne))).toBe(false);
  const promoted=blank();promoted.b[40]={t:'R',s:0,p:true};await page.emulateMedia({reducedMotion:'reduce'});await fixture(page,promoted);
  const still=await page.evaluate(()=>window.__aether.contacts().filter(p=>p.airborne));
  expect(still).toHaveLength(8);expect(still.every(p=>p.y-p.ground>3)).toBe(true);await page.waitForTimeout(220);
  expect(await page.evaluate(()=>window.__aether.contacts().filter(p=>p.airborne))).toEqual(still);
  await page.setViewportSize({width:390,height:844});await page.reload();await ready(page);
  expect(await page.evaluate(()=>window.__aether.contacts().filter(p=>p.model==='D').length)).toBe(6);
  expect(errors).toEqual([]);
});
