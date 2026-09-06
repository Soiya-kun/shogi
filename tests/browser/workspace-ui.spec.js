import {test,expect} from './game-fixture.js';
test('independent command, history and settings controls leave a collapsible full-width battlefield',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/?debug');await page.waitForFunction(()=>window.__aether);
 for(const id of ['overview','closeView','rotate','top'])await expect(page.locator('#'+id)).toHaveCount(0);
 await expect(page.locator('#status-panel')).toBeVisible();await expect(page.locator('.ai-command')).not.toBeVisible();
 const width=await page.locator('#world').evaluate(e=>e.clientWidth);
 await page.locator('#close-panel').click();await expect(page.locator('#side-panel')).not.toBeVisible();
 expect(await page.locator('#world').evaluate(e=>e.clientWidth)).toBeGreaterThan(width+250);
 await page.locator('#open-command').click();await expect(page.locator('.ai-command')).toBeVisible();await expect(page.locator('#status-panel')).not.toBeVisible();
 await page.locator('#ai-toggle-0').click();await expect(page.locator('#ai-toggle-0')).toHaveAttribute('aria-pressed','true');
 await page.locator('#open-command').click();await expect(page.locator('#side-panel')).not.toBeVisible();
 await expect.poll(()=>page.evaluate(()=>window.__aether.state().g.ply)).toBeGreaterThan(0);
 await page.locator('#open-history').click();await expect(page.locator('#history')).toBeVisible();await expect(page.locator('.ai-command')).not.toBeVisible();
 await page.locator('#open-settings').click();await expect(page.locator('#settings-dialog')).toBeVisible();
 await page.locator('#language').selectOption('en');await expect(page.locator('#open-command')).toHaveText('Command');
 await page.locator('#labels').click();await expect(page.locator('#labels')).toHaveText('Piece names OFF');
 await page.keyboard.press('Escape');await expect(page.locator('#settings-dialog')).not.toBeVisible();
 await page.locator('#open-command').click();await page.locator('#ai-stop-all').click();
 await page.setViewportSize({width:390,height:844});await expect(page.locator('#side-panel')).not.toBeVisible();
 await page.waitForTimeout(100);
 const corners=await page.evaluate(()=>[0,8,72,80].map(i=>window.__aether.projectCell(i)));for(const p of corners){expect(p.x).toBeGreaterThan(0);expect(p.x).toBeLessThan(390);}
 await page.locator('#open-status').click();await expect(page.locator('#status-panel')).toBeVisible();await page.locator('#close-panel').click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('#open-settings').click();await expect(page.locator('#language')).toHaveValue('en');await page.locator('#close-settings').click();
 expect(errors).toEqual([]);
});
