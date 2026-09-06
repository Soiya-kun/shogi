import {test,expect} from '@playwright/test';
test('first launch chooses a real stage; restore, captures, promotion and new-game switching preserve rules',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/?debug');
 await expect(page.locator('#stage-dialog')).toBeVisible();await page.locator('input[name=initial-stage][value=yankee]').check();await page.locator('#stage-start').click();
 await page.waitForFunction(()=>window.__aether?.diagnostics().lastTime>0);
 expect(await page.evaluate(()=>window.__aether.diagnostics())).toMatchObject({stage:'yankee',units:40,representedSoldiers:40,fieldWidth:27});
 for(const i of [54,45]){const p=await page.evaluate(i=>window.__aether.projectCell(i),i);await page.mouse.click(p.x,p.y);}
 await expect.poll(()=>page.evaluate(()=>window.__aether.state().g.ply)).toBe(1);
 await page.reload();await page.waitForFunction(()=>window.__aether);await expect(page.locator('#stage-dialog')).not.toBeVisible();
 expect(await page.evaluate(()=>window.__aether.state().g.ply)).toBe(1);
 await page.evaluate(()=>{const g=window.__aether.state().g;g.b.fill(null);g.b[80]={t:'K',s:0,p:false};g.b[0]={t:'K',s:1,p:false};g.b[31]={t:'R',s:0,p:false};g.b[22]={t:'P',s:1,p:false};g.turn=0;g.ply=0;localStorage.setItem('aether-shogi-v1',JSON.stringify({g,past:[],records:[],end:'',stage:'yankee'}));});
 await page.reload();await page.waitForFunction(()=>window.__aether);
 for(const i of [31,22]){const p=await page.evaluate(i=>window.__aether.projectCell(i),i);await page.mouse.click(p.x,p.y);}await page.locator('#yes').click();
 await expect.poll(()=>page.evaluate(()=>window.__aether.diagnostics().busy)).toBe(false);
 expect(await page.evaluate(()=>window.__aether.state().g.b[22])).toMatchObject({t:'R',p:true});expect(await page.evaluate(()=>window.__aether.reserves()[0].count)).toBe(1);
 await page.locator('#reset').click();await page.locator('input[name=reset-stage][value=samurai]').check();await page.locator('#reset-confirm').click();
 await page.waitForFunction(()=>window.__aether?.diagnostics().stage==='samurai');
 expect(await page.evaluate(()=>window.__aether.diagnostics())).toMatchObject({units:40,representedSoldiers:392,fieldWidth:108});expect(await page.evaluate(()=>window.__aether.state().g.ply)).toBe(0);expect(errors).toEqual([]);
});
test('mobile stage chooser supports English and street AI while retaining one person per piece',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/?debug');
 await page.locator('#stage-language').selectOption('en');await expect(page.locator('#stage-title')).toHaveText('Choose your stage');
 await page.locator('input[name=initial-stage][value=yankee]').check();await page.locator('#stage-start').click();await page.waitForFunction(()=>window.__aether?.diagnostics().lastTime>0);
 expect(await page.evaluate(()=>window.__aether.diagnostics())).toMatchObject({stage:'yankee',representedSoldiers:40,fieldWidth:27});
 await page.locator('#open-command').click();await page.locator('#ai-toggle-0').click();await page.locator('#close-panel').click();
 await expect.poll(()=>page.evaluate(()=>window.__aether.state().g.ply),{timeout:15000}).toBe(1);
 await page.locator('#open-command').click();await page.locator('#ai-stop-all').click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('#open-status').click();await page.locator('#reset').click();await page.locator('input[name=reset-stage][value=samurai]').check();await page.locator('#reset-confirm').click();
 await page.waitForFunction(()=>window.__aether?.diagnostics().stage==='samurai');expect(await page.evaluate(()=>window.__aether.diagnostics().representedSoldiers)).toBe(240);
});
