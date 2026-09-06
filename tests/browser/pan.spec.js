import {test,expect} from '@playwright/test';

async function ready(page){await page.goto('/?debug');await expect(page.locator('body')).toHaveAttribute('data-ready','true');await page.waitForFunction(()=>window.__aether.diagnostics().lastTime>0);}
async function view(page){return page.evaluate(()=>window.__aether.diagnostics());}
function offset(d){return d.cameraPosition.map((v,i)=>v-d.cameraTarget[i]);}
async function anchored(page,anchor,point){
  const q=await page.evaluate(a=>window.__aether.projectPoint(a),anchor);
  expect(Math.hypot(q.x-point.x,q.y-point.y)).toBeLessThan(1);
}
async function pan(page,start,end){
  const before=await view(page),anchor=await page.evaluate(p=>window.__aether.zoomAnchor(p.x,p.y),start);
  await page.mouse.move(start.x,start.y);await page.mouse.down({button:'left'});
  await expect(page.locator('#scene')).toHaveCSS('cursor','grabbing');
  await page.mouse.move(end.x,end.y,{steps:8});await page.mouse.up({button:'left'});
  await expect(page.locator('#scene')).toHaveCSS('cursor','grab');
  await anchored(page,anchor,end);
  const after=await view(page);
  expect(after.zoom).toBe(before.zoom);
  offset(after).forEach((v,i)=>expect(v).toBeCloseTo(offset(before)[i],5));
  expect(Math.hypot(...after.cameraTarget.map((v,i)=>v-before.cameraTarget[i]))).toBeGreaterThan(.1);
  await page.waitForTimeout(120);await anchored(page,anchor,end);
}

test('left drag pans at the grabbed depth while right drag rotates and the wheel still anchors',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.emulateMedia({reducedMotion:'reduce'});await ready(page);
  await pan(page,{x:530,y:510},{x:700,y:580});
  const before=await view(page);
  await page.mouse.move(600,500);await page.mouse.down({button:'right'});await page.mouse.move(690,470,{steps:8});await page.mouse.up({button:'right'});
  const after=await view(page);
  expect(after.cameraTarget).toEqual(before.cameraTarget);expect(after.zoom).toBe(before.zoom);
  expect(Math.hypot(...offset(after).map((v,i)=>v-offset(before)[i]))).toBeGreaterThan(1);
  await pan(page,{x:480,y:530},{x:390,y:460});
  const point={x:590,y:570},anchor=await page.evaluate(p=>window.__aether.zoomAnchor(p.x,p.y),point);
  await page.mouse.move(point.x,point.y);await page.mouse.wheel(0,-700);
  await expect.poll(async()=> (await view(page)).zoom).toBeLessThan(before.zoom);await anchored(page,anchor,point);
  await pan(page,point,{x:710,y:500});
  await page.screenshot({path:'docs/verification/right-drag-pan.png'});
  expect(await page.evaluate(()=>window.__aether.state().past)).toHaveLength(0);
  expect(errors).toEqual([]);
});

test('right click never selects or moves a squad and suppresses the canvas context menu',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await ready(page);
  await page.evaluate(()=>window.addEventListener('contextmenu',e=>window.menuPrevented=e.defaultPrevented));
  const from=await page.evaluate(()=>window.__aether.projectCell(54));
  const label=await page.locator('#unitname').textContent();
  await page.mouse.click(from.x,from.y,{button:'right'});
  await expect(page.locator('#unitname')).toHaveText(label);
  expect(await page.evaluate(()=>window.menuPrevented)).toBe(true);
  await page.mouse.click(from.x,from.y);await expect(page.locator('#unitname')).toHaveText('足軽隊');
  const to=await page.evaluate(()=>window.__aether.projectCell(45));
  await page.mouse.click(to.x,to.y,{button:'right'});
  expect(await page.evaluate(()=>window.__aether.state().past)).toHaveLength(0);
  await expect(page.locator('#unitname')).toHaveText('足軽隊');
  await page.mouse.click(to.x,to.y);
  await expect.poll(()=>page.evaluate(()=>window.__aether.state().past.length)).toBe(1);
});

test('panning interrupts easing, ends outside the canvas or on capture loss, and stays above terrain',async({page})=>{
  await ready(page);
  const selected=await page.evaluate(()=>window.__aether.projectCell(54));await page.mouse.click(selected.x,selected.y);
  await page.locator('#closeView').click();
  // Observe the world point at the input event, while the close-up is still easing.
  await page.evaluate(()=>document.querySelector('#scene').addEventListener('pointerdown',e=>{
    window.panCheck={anchor:window.__aether.zoomAnchor(e.clientX,e.clientY),id:e.pointerId};
  },{capture:true,once:true}));
  await page.mouse.move(580,450);await page.mouse.down({button:'left'});
  const check=await page.evaluate(()=>window.panCheck);
  await page.mouse.move(1300,420,{steps:8});await page.mouse.up({button:'left'});
  await anchored(page,check.anchor,{x:1300,y:420});
  const released=await view(page);await page.mouse.move(600,500);await page.waitForTimeout(500);
  expect((await view(page)).cameraPosition).toEqual(released.cameraPosition);
  await expect(page.locator('#scene')).toHaveCSS('cursor','grab');
  await page.mouse.down({button:'left'});await page.mouse.move(650,500,{steps:4});
  await page.evaluate(id=>document.querySelector('#scene').releasePointerCapture(id),check.id);
  // The browser applies pending capture changes before the next pointer event.
  await page.mouse.move(650,500);
  await expect(page.locator('#scene')).toHaveCSS('cursor','grab');
  const cancelled=await view(page);await page.mouse.move(800,540);await page.mouse.up({button:'left'});
  expect((await view(page)).cameraPosition).toEqual(cancelled.cameraPosition);
  // Reset near the soldiers, zoom in, then push the camera towards the ground.
  await page.locator('#closeView').click();await page.waitForTimeout(1200);
  const centre=await page.evaluate(()=>window.__aether.projectCell(54));await page.mouse.move(centre.x,centre.y);
  for(let i=0;i<3;i++){await page.mouse.wheel(0,-800);await page.waitForTimeout(80);}
  const near=await view(page);expect(near.zoom).toBeLessThan(12);
  await page.mouse.move(550,500);await page.mouse.down({button:'left'});await page.mouse.move(550,950,{steps:20});await page.mouse.up({button:'left'});
  const final=await view(page);
  expect(final.cameraPosition.every(Number.isFinite)).toBe(true);
  expect(await page.evaluate(()=>{const p=window.__aether.diagnostics().cameraPosition;return p[1]-window.__aether.height(p[0],p[2]);})).toBeGreaterThanOrEqual(.799);
  expect(final.zoom).toBe(near.zoom);offset(final).forEach((v,i)=>expect(v).toBeCloseTo(offset(near)[i],5));
  expect(await page.evaluate(()=>window.__aether.state().past)).toHaveLength(0);
});
