import {test,expect} from '@playwright/test';
const ready=page=>page.waitForFunction(()=>window.__aether?.diagnostics().lastTime>0);
async function attachment(page){
  const result=await page.evaluate(()=>{
    const squads=window.__aether.presentation().squads,contacts=window.__aether.contacts();
    return {count:contacts.length,squads:squads.length,errors:squads.flatMap(s=>{
      const bearers=contacts.filter(p=>p.unitId===s.id&&p.generation===s.generation&&p.flagBearer);
      if(bearers.length!==1||!bearers[0].flagHand)return [{id:s.id,reason:'missing bearer'}];
      const distance=Math.hypot(...s.flagGrip.map((v,i)=>v-bearers[0].flagHand[i]));
      return distance>1e-4?[{id:s.id,distance}]:[];
    })};
  });expect(result.errors).toEqual([]);return result;
}
test('existing soldiers carry flags through both armies movement, interruption and undo',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/?debug');await ready(page);
  expect((await attachment(page)).count).toBe(392);
  for(const [from,to,side] of [[54,45,0],[18,27,1]]){
    for(const i of [from,to]){const p=await page.evaluate(i=>window.__aether.projectCell(i),i);await page.mouse.click(p.x,p.y);}
    await page.waitForFunction(side=>window.__aether.presentation().history.some(e=>e.event.actor.piece.s===side&&e.status==='playing'&&e.progress>.15&&e.progress<.7),side);
    await attachment(page);
    const moving=await page.evaluate(to=>window.__aether.presentation().squads.find(s=>s.cell===to),to);expect(moving.moving).toBe(true);
  }
  await page.locator('#undo').click();await ready(page);await attachment(page);expect(errors).toEqual([]);
});
test('mounted and flying flag bearers retain attachments on compact displays and restoration',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/?debug');await ready(page);
  await page.evaluate(()=>{const g=window.__aether.state().g;g.b[10].p=true;g.b[70].p=true;localStorage.setItem('aether-shogi-v1',JSON.stringify({g,past:[],records:[],end:''}));});
  await page.reload();await ready(page);expect((await attachment(page)).count).toBe(240);
  const riders=await page.evaluate(()=>window.__aether.contacts().filter(p=>p.flagBearer&&p.model==='D'));expect(riders).toHaveLength(2);
  for(const r of riders)expect(r.flagHand[1]-r.ground).toBeGreaterThan(3.5);
  await page.locator('#closeView').click();await page.waitForTimeout(600);await attachment(page);
  await page.locator('#battle-effects').uncheck();await page.waitForTimeout(100);await attachment(page);
});
