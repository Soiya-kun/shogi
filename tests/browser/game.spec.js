import {test,expect} from '@playwright/test';
import {initial} from '../../dist/rules.mjs';
import {writeFile} from 'node:fs/promises';

async function ready(page){await expect(page.locator('body')).toHaveAttribute('data-ready','true');}
async function cell(page,i){const p=await page.evaluate(i=>window.__aether.projectCell(i),i);await page.mouse.click(p.x,p.y);}
async function settle(page){await expect.poll(()=>page.evaluate(()=>window.__aether.diagnostics().busy)).toBe(false);}
async function fixture(page,g){await page.evaluate(g=>localStorage.setItem('aether-shogi-v1',JSON.stringify({g,past:[],records:[],end:''})),g);await page.reload();await ready(page);}
async function measure(page){return page.evaluate(async()=>{const t=[];await new Promise(resolve=>{let last=performance.now();function step(now){t.push(now-last);last=now;if(t.length<90)requestAnimationFrame(step);else resolve();}requestAnimationFrame(step);});return {meanFrameMs:t.reduce((a,b)=>a+b,0)/t.length,p95FrameMs:t.sort((a,b)=>a-b)[85],...window.__aether.diagnostics()};});}
function blank(){const g=initial();g.b.fill(null);g.b[76]={t:'K',s:0,p:false};g.b[4]={t:'K',s:1,p:false};return g;}

test('40 squads: mouse move, undo, keyboard, restore, views and desktop render',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('/?debug');await ready(page);
  expect((await page.evaluate(()=>window.__aether.diagnostics())).units).toBe(40);
  expect(await page.evaluate(()=>window.__aether.diagnostics())).toMatchObject({soldiers:392,representedSoldiers:392,fieldWidth:108,detailedSquads:0});
  const contacts=await page.evaluate(()=>window.__aether.contacts());
  expect(contacts).toHaveLength(392);
  expect(contacts.filter(p=>p.airborne)).toHaveLength(16);
  expect(contacts.every(p=>p.airborne?p.y-p.ground>3:Math.abs(p.y-p.ground-.025)<.0001)).toBe(true);
  await cell(page,54);await expect(page.locator('#unitname')).toHaveText('歩兵隊');
  await page.screenshot({path:'docs/verification/desktop-selected.png'});
  await cell(page,45);await settle(page);await expect(page.locator('#moveCount')).toHaveText('1 手');
  await page.reload();await ready(page);await expect(page.locator('#moveCount')).toHaveText('1 手');
  await page.locator('#undo').click();await expect(page.locator('#moveCount')).toHaveText('0 手');
  // Focus begins at 76. Move to pawn 58, select it, advance to 49.
  await page.locator('#scene').focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');await settle(page);await expect(page.locator('#moveCount')).toHaveText('1 手');
  await page.locator('#undo').click();await page.locator('#top').click();await page.locator('#rotate').click();
  await page.locator('#labels').click();await expect(page.locator('#labels')).toHaveText('駒名 OFF');await page.locator('#labels').click();
  await page.locator('#rotate').click();await page.locator('#top').click();
  await page.locator('#design').click();await expect(page.locator('#architecture')).toBeVisible();await page.locator('.close').click();
  const timing=await measure(page);
  await writeFile('docs/verification/desktop-performance.json',JSON.stringify(timing,null,2));
  expect(timing.drawCalls).toBeLessThan(500);expect(timing.triangles).toBeLessThan(1100000);
  await page.screenshot({path:'docs/verification/desktop.png'});
  await cell(page,58);await page.locator('#closeView').click();
  await expect.poll(()=>page.evaluate(()=>window.__aether.diagnostics().detailedSquads)).toBeGreaterThan(0);
  await page.waitForTimeout(1100);
  await page.screenshot({path:'docs/verification/close.png'});
  const detail=await measure(page);
  expect(detail.triangles).toBeLessThan(1100000);expect(detail.drawCalls).toBeLessThan(500);
  await writeFile('docs/verification/close-performance.json',JSON.stringify(detail,null,2));
  // Clear the selection and select through a raised flag in the low camera view.
  await cell(page,40);
  const banner=await page.evaluate(()=>window.__aether.projectBanner(58));await page.mouse.click(banner.x,banner.y);
  await expect(page.locator('#unitname')).toHaveText('歩兵隊');
  await cell(page,49);await settle(page);await expect(page.locator('#moveCount')).toHaveText('1 手');
  await page.locator('#overview').click();
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
  for(const i of [54,45]){const p=await page.evaluate(i=>window.__aether.projectCell(i),i);await page.touchscreen.tap(p.x,p.y);}
  await settle(page);await expect(page.locator('#moveCount')).toHaveText('1 手');
  await page.screenshot({path:'docs/verification/mobile.png',fullPage:true});
  const timing=await measure(page);
  expect(timing.drawCalls).toBeLessThan(500);expect(timing.triangles).toBeLessThan(600000);
  await writeFile('docs/verification/mobile-performance.json',JSON.stringify(timing,null,2));
  await page.locator('#closeView').click();
  await expect.poll(()=>page.evaluate(()=>window.__aether.diagnostics().detailedSquads)).toBeGreaterThan(0);
  await page.locator('#overview').click();
  await expect.poll(()=>page.evaluate(()=>window.__aether.diagnostics().detailedSquads)).toBe(0);
  await context.close();
});

test('missing GLB shows retry instead of silently leaving a broken board',async({page})=>{
  await page.route('**/assets/meadow.glb',route=>route.abort());await page.goto('/');
  await expect(page.getByRole('button',{name:'再読み込み',exact:true})).toBeVisible();
  await expect(page.locator('body')).not.toHaveAttribute('data-ready','true');
});

test('dragon knights: eight mounted riders, close view, rook movement and dragon-king promotion',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('/?debug');await ready(page);
  const rook=await page.evaluate(()=>window.__aether.state().g.b.findIndex(p=>p?.t==='R'&&p.s===0));
  await cell(page,rook);await expect(page.locator('#unitname')).toHaveText('竜騎士隊');
  await expect(page.locator('#unitdesc')).toHaveText('8騎 · 飛行隊形');
  const first=await page.evaluate(()=>window.__aether.contacts().filter(p=>p.airborne));
  expect(first).toHaveLength(16);expect(first.every(p=>p.y-p.ground>3)).toBe(true);
  await page.waitForTimeout(200);
  const second=await page.evaluate(()=>window.__aether.contacts().filter(p=>p.airborne));
  expect(second.some((p,i)=>Math.abs(p.y-first[i].y)>.005)).toBe(true);
  await page.locator('#closeView').click();
  await expect.poll(()=>page.evaluate(()=>window.__aether.diagnostics().detailedSquads)).toBeGreaterThan(0);
  // Turn around the selected squad so the dragons' heads and riders are visible.
  await page.mouse.move(760,440);await page.mouse.down();await page.mouse.move(320,440,{steps:12});await page.mouse.up();
  await page.waitForTimeout(1100);await page.screenshot({path:'docs/verification/dragon-knights.png'});
  const metrics=await measure(page);expect(metrics.drawCalls).toBeLessThan(500);expect(metrics.triangles).toBeLessThan(1100000);
  await writeFile('docs/verification/dragon-performance.json',JSON.stringify(metrics,null,2));
  await page.locator('#scene').focus();await page.keyboard.press('ArrowDown');
  for(let i=0;i<3;i++)await page.keyboard.press('ArrowLeft');await page.keyboard.press('Enter');
  await expect(page.locator('#unitname')).toHaveText('本陣');
  const flyingPoint=await page.evaluate(i=>window.__aether.projectFlying(i),rook);await page.mouse.click(flyingPoint.x,flyingPoint.y);
  await expect(page.locator('#unitname')).toHaveText('竜騎士隊');
  let g=blank();g.b[40]={t:'R',s:0,p:false};await fixture(page,g);
  await cell(page,40);await cell(page,22);await expect(page.locator('#promotion')).toBeVisible();
  await page.getByRole('button',{name:'成る',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.__aether.diagnostics().busy)).toBe(true);
  await page.waitForTimeout(220);
  const airborneMove=await page.evaluate(()=>window.__aether.contacts().filter(p=>p.airborne));
  expect(airborneMove).toHaveLength(8);expect(airborneMove.every(p=>p.y-p.ground>3)).toBe(true);
  expect(airborneMove.reduce((z,p)=>z+p.z,0)/8).toBeLessThan(-1);
  await settle(page);
  expect(await page.evaluate(()=>window.__aether.state().g.b[22])).toEqual({t:'R',s:0,p:true});
  await cell(page,22);await page.locator('#closeView').click();await page.waitForTimeout(1100);
  await page.screenshot({path:'docs/verification/dragon-promoted.png'});
  await page.reload();await ready(page);expect(await page.evaluate(()=>window.__aether.state().g.b[22].p)).toBe(true);
  await page.locator('#undo').click();expect(await page.evaluate(()=>window.__aether.state().g.b[40])).toEqual({t:'R',s:0,p:false});
  await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await ready(page);
  const still=await page.evaluate(()=>window.__aether.contacts().filter(p=>p.airborne));
  expect(still.every(p=>p.y-p.ground>3)).toBe(true);await page.waitForTimeout(220);
  expect(await page.evaluate(()=>window.__aether.contacts().filter(p=>p.airborne))).toEqual(still);
  expect(errors).toEqual([]);
});
