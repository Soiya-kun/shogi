import {control,camera} from './ui-controls.js';
import {test,expect} from './game-fixture.js';
import {Match} from '../../dist/match.mjs';
const ready=page=>page.waitForFunction(()=>window.__aether?.diagnostics().lastTime>0);
test('reserve camps group hands without shrinking soldiers and follow drops, undo, labels and reset',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?debug');await ready(page);
  const g=new Match().g;g.b.fill(null);g.b[80]={t:'K',s:0,p:false};g.b[0]={t:'K',s:1,p:false};
  g.h=[{P:9,L:2,N:2,S:2,G:2,B:1,R:1},{P:9,L:2,N:2,S:2,G:2,B:1,R:1}];
  await page.evaluate(g=>localStorage.setItem('aether-shogi-v1',JSON.stringify({g,past:[],records:[],end:''})),g);
  await page.reload();await ready(page);
  const camps=await page.evaluate(()=>window.__aether.reserves());expect(camps).toHaveLength(14);
  for(const s of camps){expect(s.scale).toBe(1);expect(s.members).toHaveLength(2);expect(Math.abs(s.x)).toBeGreaterThan(54);expect(s.x*(s.side?-1:1)).toBeGreaterThan(0);expect(s.z*(s.side?-1:1)).toBeGreaterThan(0);}
  const p=await page.evaluate(()=>{const c=window.__aether.reserves().find(s=>s.side===0&&s.type==='P').contacts.find(p=>p.flagBearer).flagHand;return window.__aether.projectPoint([c[0],c[1]+4.5,c[2]]);});
  await page.mouse.click(p.x,p.y);await expect(page.locator('#unitname')).toHaveText('足軽隊');
  const to=await page.evaluate(()=>window.__aether.projectCell(40));await page.mouse.click(to.x,to.y);
  await expect.poll(()=>page.evaluate(()=>window.__aether.reserves().find(s=>s.side===0&&s.type==='P').count)).toBe(8);
  await control(page,'#undo','click');expect(await page.evaluate(()=>window.__aether.reserves().find(s=>s.side===0&&s.type==='P').count)).toBe(9);
  await control(page,'#labels','click');expect(await page.evaluate(()=>window.__aether.reserves().every(s=>!s.labelVisible))).toBe(true);
  await page.setViewportSize({width:390,height:844});await page.reload();await ready(page);
  expect(await page.evaluate(()=>window.__aether.reserves().reduce((n,s)=>n+s.members.length,0))).toBe(28);
  await control(page,'#reset','click');await page.locator('#reset-confirm').click();expect(await page.evaluate(()=>window.__aether.reserves())).toHaveLength(0);expect(errors).toEqual([]);
});
