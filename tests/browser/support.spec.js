import {test,expect} from './game-fixture.js';
import {Match} from '../../dist/match.mjs';
import {control} from './ui-controls.js';
import {readFile} from 'node:fs/promises';

async function ready(page){await expect(page.locator('body')).toHaveAttribute('data-ready','true');}
async function seed(page,{effects=false}={}){
  const g=new Match().g;g.b.fill(null);
  for(const [i,t,s] of [[80,'K',0],[4,'K',1],[22,'G',0],[12,'G',0],[14,'G',0]])g.b[i]={t,s,p:false};
  await page.addInitScript(({g,effects})=>{
    if(!localStorage.getItem('support-test-seeded')){
      localStorage.setItem('aether-shogi-v1',JSON.stringify({g,past:[],records:[],end:''}));
      localStorage.setItem('aether-presentation-v1',JSON.stringify({effects}));
      localStorage.setItem('aether-war-presentation-v1',JSON.stringify({mode:effects?'normal':'off',analysis:false}));
      localStorage.setItem('support-test-seeded','1');
    }
  },{g,effects});
}
async function mate(page){for(const i of [22,13]){const p=await page.evaluate(i=>window.__aether.projectCell(i),i);await page.mouse.click(p.x,p.y);}await expect(page.locator('#status')).toContainText('詰み');}

test('actual mate prompts after the victory presentation, preserves board and does not repeat after undo or reload',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await seed(page,{effects:true});await page.goto('/?debug&support-preview=1');await ready(page);await mate(page);
  await expect(page.locator('.war-kanji')).toHaveText('詰み',{timeout:10000});await expect(page.locator('#support-dialog')).not.toBeVisible();
  await expect(page.locator('.war-kanji')).toHaveText('凱歌',{timeout:8000});await expect(page.locator('#support-dialog')).not.toBeVisible();
  await expect(page.locator('#support-dialog')).toBeVisible({timeout:10000});
  await expect(page.locator('#support-result')).toContainText('詰み');
  await page.locator('input[value="500"]').check();await expect(page.locator('#support-pay')).not.toHaveAttribute('href');
  const before=await page.evaluate(()=>window.__aether.state());await page.locator('#support-dismiss').click();
  expect(await page.evaluate(()=>window.__aether.state())).toEqual(before);
  await control(page,'#undo');await mate(page);await page.waitForTimeout(1700);await expect(page.locator('#support-dialog')).not.toBeVisible();
  await page.reload();await ready(page);await page.waitForTimeout(1700);await expect(page.locator('#support-dialog')).not.toBeVisible();
  expect(JSON.parse(await page.evaluate(()=>localStorage.getItem('aether-shogi-v1'))).support.shown).toBe(true);
  expect(errors).toEqual([]);
});

test('mobile preview supports language, keyboard dismissal, reopening and safe payment state',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/?debug&support-preview=1');await ready(page);
  await page.locator('#open-settings').click();await page.locator('#language').selectOption('en');await page.locator('#open-support').click();
  await expect(page.locator('#support-title')).toHaveText('Support Shogi Battle');await expect(page.locator('#support-pay')).toHaveAttribute('aria-disabled','true');
  await page.locator('input[value="1000"]').check();await expect(page.locator('#support-pay')).toContainText('1,000');
  const box=await page.locator('#support-dialog').boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(390);
  await page.keyboard.press('Escape');await expect(page.locator('#support-dialog')).not.toBeVisible();await expect(page.locator('#open-settings')).toBeFocused();
  await page.locator('#open-settings').click();await page.locator('#language').selectOption('ja');await page.locator('#open-support').click();
  await expect(page.locator('#support-pay')).toHaveText('金額を選んでください');await expect(page.locator('#support-title')).toHaveText('将棋バトルを応援する');
  await page.locator('#support-close').click();
});

test('disabled reception never asks for payment and disclosure pages are readable',async({page})=>{
  const source=await readFile(new URL('../../dist/support-config.mjs',import.meta.url),'utf8');
  await page.route('**/support-config.mjs',route=>route.fulfill({contentType:'text/javascript',body:source+'\nsupportConfig.enabled=false;'}));
  await seed(page);await page.goto('/?debug');await ready(page);await mate(page);await page.waitForTimeout(1800);
  await expect(page.locator('#support-dialog')).not.toBeVisible();await expect(page.locator('#end-support')).toBeHidden();
  await page.locator('#open-settings').click();await expect(page.locator('#open-support')).toBeHidden();
  for(const path of ['legal.html','privacy.html','support-terms.html']){
    await page.goto('/'+path);await expect(page.locator('h1')).toBeVisible();await expect(page.locator('[data-support-status]')).toContainText('準備中');
    expect(await page.locator('a[href^="https://buy.stripe.com"]').count()).toBe(0);
  }
});

test('configured checkout selects the exact fixed-price link and clears it on reopen',async({page})=>{
  const source=await readFile(new URL('../../dist/support-config.mjs',import.meta.url),'utf8');
  const fixture={enabled:true,providerApproved:true,disclosuresReviewed:true,operator:{name:'Test operator',address:'Test address',phone:'Test phone',email:'support@example.com'},prices:[300,500,1000].map(amount=>({amount,url:`https://buy.stripe.com/example${amount}`}))};
  await page.route('**/support-config.mjs',route=>route.fulfill({contentType:'text/javascript',body:source+'\nObject.assign(supportConfig,'+JSON.stringify(fixture)+');'}));
  await page.goto('/?debug');await ready(page);await page.locator('#open-settings').click();await page.locator('#open-support').click();
  for(const amount of [300,500,1000]){
    await page.locator(`input[value="${amount}"]`).check();await expect(page.locator('#support-pay')).toHaveAttribute('href',`https://buy.stripe.com/example${amount}`);
    await expect(page.locator('#support-pay')).toHaveAttribute('aria-disabled','false');
  }
  await expect(page.locator('#support-pay')).toHaveAttribute('rel','noopener noreferrer');
  await page.keyboard.press('Escape');await page.locator('#open-settings').click();await page.locator('#open-support').click();
  await expect(page.locator('#support-pay')).not.toHaveAttribute('href');
});
