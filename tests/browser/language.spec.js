import {test,expect} from '@playwright/test';
import {Match} from '../../dist/match.mjs';
test('language switches UI and one dialogue line while preserving kanji titles, game state and saved preference',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/?debug');await page.waitForFunction(()=>window.__aether);
 const g=new Match().g;g.b.fill(null);g.b[80]={t:'K',s:0,p:false};g.b[0]={t:'K',s:1,p:false};g.b[31]={t:'R',s:0,p:false};
 await page.evaluate(g=>{localStorage.setItem('aether-shogi-v1',JSON.stringify({g,past:[],records:[],end:''}));localStorage.setItem('aether-presentation-v1',JSON.stringify({effects:false}));},g);
 await page.reload();await page.waitForFunction(()=>window.__aether);
 await page.locator('#language').selectOption('en');await expect(page.locator('html')).toHaveAttribute('lang','en');
 await expect(page.locator('#reset')).toHaveText('New game');await expect(page.locator('#ai-toggle-0')).toHaveText('Start AI');
 for(const i of [31,22]){const p=await page.evaluate(i=>window.__aether.projectCell(i),i);await page.mouse.click(p.x,p.y);}
 await expect(page.locator('#promotion h2')).toHaveText('Promote this squad?');await page.locator('#yes').click();
 await expect(page.locator('.war-kanji')).toHaveText('昇龍');await expect(page.locator('.war-subtitle')).toHaveText('Take the skies! Dragon, command the battlefield!');
 await expect(page.locator('.war-subtitle')).toHaveCount(1);await expect(page.locator('.war-translation')).toHaveCount(0);
 await page.locator('#language').selectOption('ja');await expect(page.locator('.war-kanji')).toHaveText('昇龍');await expect(page.locator('.war-subtitle')).toHaveText('天を駆けよ！ 竜よ、戦場を制せ！');
 await expect(page.locator('#reset')).toHaveText('最初から');await expect(page.locator('#moveCount')).toHaveText('1 手');
 await page.locator('#language').selectOption('en');await page.locator('#reset').click();await expect(page.locator('#reset-title')).toHaveText('Start a new game?');await page.locator('#reset-cancel').click();
 await page.reload();await page.waitForFunction(()=>window.__aether);await expect(page.locator('#language')).toHaveValue('en');await expect(page.locator('#moveCount')).toHaveText('1 move');
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('#language').selectOption('ja');await expect(page.locator('#undo')).toHaveText('一手戻す');expect(errors).toEqual([]);
});
