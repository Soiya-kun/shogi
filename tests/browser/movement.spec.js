import {test,expect} from '@playwright/test';
import {initial} from '../../dist/rules.mjs';

test('squads settle through the shortest turn after forward moves, captures and diagonals',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?debug');await expect(page.locator('body')).toHaveAttribute('data-ready','true');
  for(const example of [
    {name:'後手の歩の前進',type:'P',side:1,from:22,to:31,minDot:.99},
    {name:'後手の歩の捕獲',type:'P',side:1,from:22,to:31,capture:true,minDot:.99},
    {name:'後手の銀の斜め前進',type:'S',side:1,from:22,to:32,minDot:.65},
    {name:'先手の歩の前進',type:'P',side:0,from:58,to:49,minDot:.99},
  ]){
    const g=initial();g.b.fill(null);g.turn=example.side;
    g.b[76]={t:'K',s:0,p:false};g.b[4]={t:'K',s:1,p:false};
    g.b[example.from]={t:example.type,s:example.side,p:false};
    if(example.capture)g.b[example.to]={t:'P',s:1-example.side,p:false};
    await page.evaluate(g=>localStorage.setItem('aether-shogi-v1',JSON.stringify({g,past:[],records:[],end:''})),g);
    await page.reload();await expect(page.locator('body')).toHaveAttribute('data-ready','true');
    const from=await page.evaluate(i=>window.__aether.projectCell(i),example.from);await page.mouse.click(from.x,from.y);
    // Observe actual rendered formation positions every frame, including the settling animation.
    await page.evaluate(example=>{
      window.turnSamples=[];window.turnComplete=false;
      let started=false,after=0;
      function sample(){
        const busy=window.__aether.diagnostics().busy;started||=busy;
        if(started){
          const members=window.__aether.contacts().filter(p=>p.cell===(busy?example.from:example.to));
          if(members.length>1){
            const dx=members[1].x-members[0].x,dz=members[1].z-members[0].z;
            window.turnSamples.push({busy,heading:Math.atan2(-dz,dx)});
          }
          if(!busy&&++after===5){window.turnComplete=true;return;}
        }
        requestAnimationFrame(sample);
      }requestAnimationFrame(sample);
    },example);
    const to=await page.evaluate(i=>window.__aether.projectCell(i),example.to);await page.mouse.click(to.x,to.y);
    await page.waitForFunction(()=>window.turnComplete);
    const samples=await page.evaluate(()=>window.turnSamples);
    expect(samples.filter(s=>s.busy).length,example.name).toBeGreaterThan(15);
    const facing=example.side?Math.PI:0;
    const smallestDot=Math.min(...samples.map(s=>Math.cos(s.heading-facing)));
    expect(smallestDot,example.name+'で逆向きや一回転が発生しない').toBeGreaterThan(example.minDot);
    expect(Math.cos(samples.at(-1).heading-facing)).toBeCloseTo(1,6);
    expect(await page.evaluate(i=>window.__aether.state().g.b[i],example.to)).toEqual({t:example.type,s:example.side,p:false});
    if(example.capture)expect(await page.evaluate(s=>window.__aether.state().g.h[s].P,example.side)).toBe(1);
  }
  expect(errors).toEqual([]);
});
