import {test,expect} from '@playwright/test';
import {initial} from '../../dist/rules.mjs';
import {writeFile} from 'node:fs/promises';

async function ready(page){await expect(page.locator('body')).toHaveAttribute('data-ready','true');}
async function cell(page,i){const p=await page.evaluate(i=>window.__aether.projectCell(i),i);await page.mouse.click(p.x,p.y);}
async function settle(page){await expect.poll(()=>page.evaluate(()=>window.__aether.diagnostics().busy)).toBe(false);}
async function fixture(page,g){await page.evaluate(g=>localStorage.setItem('aether-shogi-v1',JSON.stringify({g,past:[],records:[],end:''})),g);await page.reload();await ready(page);}
function blank(){const g=initial();g.b.fill(null);g.b[76]={t:'K',s:0,p:false};g.b[4]={t:'K',s:1,p:false};return g;}

test('40 soldiers: mouse move, undo, keyboard, restore, views and desktop render',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?debug');await ready(page);
  expect((await page.evaluate(()=>window.__aether.diagnostics())).units).toBe(40);
  await cell(page,54);await expect(page.locator('#unitname')).toHaveText('歩兵');
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
  const timing=await page.evaluate(async()=>{const t=[];await new Promise(resolve=>{let last=performance.now();function step(now){t.push(now-last);last=now;if(t.length<90)requestAnimationFrame(step);else resolve();}requestAnimationFrame(step);});return {meanFrameMs:t.reduce((a,b)=>a+b,0)/t.length,p95FrameMs:t.sort((a,b)=>a-b)[85],...window.__aether.diagnostics()};});
  await writeFile('docs/verification/desktop-performance.json',JSON.stringify(timing,null,2));
  expect(timing.drawCalls).toBeLessThan(500);expect(timing.triangles).toBeLessThan(250000);
  await page.screenshot({path:'docs/verification/desktop.png'});
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
  for(const i of [54,45]){const p=await page.evaluate(i=>window.__aether.projectCell(i),i);await page.touchscreen.tap(p.x,p.y);}
  await settle(page);await expect(page.locator('#moveCount')).toHaveText('1 手');
  await page.screenshot({path:'docs/verification/mobile.png',fullPage:true});
  await writeFile('docs/verification/mobile-performance.json',JSON.stringify(await page.evaluate(()=>window.__aether.diagnostics()),null,2));
  await context.close();
});

test('missing GLB shows retry instead of silently leaving a broken board',async({page})=>{
  await page.route('**/assets/meadow.glb',route=>route.abort());await page.goto('/');
  await expect(page.getByRole('button',{name:'再読み込み',exact:true})).toBeVisible();
  await expect(page.locator('body')).not.toHaveAttribute('data-ready','true');
});
