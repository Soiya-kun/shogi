import {control,camera} from './ui-controls.js';
import {test,expect} from './game-fixture.js';
import {writeFile} from 'node:fs/promises';

async function ready(page){await expect(page.locator('body')).toHaveAttribute('data-ready','true');await page.waitForFunction(()=>window.__aether.diagnostics().lastTime>0);}
async function anchorAt(page,point){return page.evaluate(p=>window.__aether.zoomAnchor(p.x,p.y),point);}
async function anchored(page,anchor,point){
  const projected=await page.evaluate(p=>window.__aether.projectPoint(p),anchor);
  expect(Math.hypot(projected.x-point.x,projected.y-point.y)).toBeLessThan(1);
}
async function wheel(page,point,delta){
  point={x:Math.floor(point.x),y:Math.floor(point.y)}; // Native wheel coordinates are integer CSS pixels.
  const anchor=await anchorAt(page,point),before=await page.evaluate(()=>window.__aether.diagnostics().zoom);
  await page.mouse.move(point.x,point.y);await page.mouse.wheel(0,delta);
  await expect.poll(()=>page.evaluate(()=>window.__aether.diagnostics().zoom)).not.toBe(before);
  await anchored(page,anchor,point);await page.waitForTimeout(180);await anchored(page,anchor,point);
  return anchor;
}

test('wheel zoom stays under the pointer across selection, rotation, limits and airborne units',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?debug');await ready(page);
  // Select one squad, then zoom into a different, off-centre patch of terrain.
  const selected=await page.evaluate(()=>window.__aether.projectCell(54));await page.mouse.click(selected.x,selected.y);
  const point=await page.evaluate(()=>window.__aether.projectCell(42));
  await wheel(page,point,-240);await wheel(page,point,-350);await wheel(page,point,260);
  await expect(page.locator('#unitname')).toHaveText('足軽隊');
  // Wheel events can arrive before the next frame, with a changing pointer position.
  const checks=await page.evaluate(()=>{
    const c=document.querySelector('#scene'),r=c.getBoundingClientRect(),results=[];
    for(const [x,y,d] of [[.25,.65,-90],[.65,.45,-80],[.40,.60,100]]){
      const p={x:r.left+x*r.width,y:r.top+y*r.height},a=window.__aether.zoomAnchor(p.x,p.y);
      c.dispatchEvent(new WheelEvent('wheel',{clientX:p.x,clientY:p.y,deltaY:d,cancelable:true}));
      const q=window.__aether.projectPoint(a);results.push(Math.hypot(q.x-p.x,q.y-p.y));
    }return results;
  });expect(checks.every(v=>v<1)).toBe(true);
  await camera(page,'top');await camera(page,'rotate');await page.waitForTimeout(100);
  const rotated={x:730,y:470};await wheel(page,rotated,-200);await wheel(page,rotated,200);
  await camera(page,'overview');await page.waitForTimeout(100);
  // Use one fixed terrain coordinate down to the closest zoom and back out.
  const centre=await page.evaluate(()=>{const p=window.__aether.projectCell(40);return {x:Math.floor(p.x),y:Math.floor(p.y)};}),anchor=await anchorAt(page,centre);
  for(let i=0;i<5;i++){await page.mouse.move(centre.x,centre.y);await page.mouse.wheel(0,-800);await page.waitForTimeout(60);}
  expect(await page.evaluate(()=>window.__aether.diagnostics().zoom)).toBeCloseTo(8,5);await anchored(page,anchor,centre);
  const atLimit=await page.evaluate(()=>window.__aether.diagnostics().cameraPosition);
  await page.mouse.wheel(0,-400);await page.waitForTimeout(80);
  expect(await page.evaluate(()=>window.__aether.diagnostics().cameraPosition)).toEqual(atLimit);
  const clearance=await page.evaluate(()=>{const p=window.__aether.diagnostics().cameraPosition;return p[1]-window.__aether.height(p[0],p[2]);});expect(clearance).toBeGreaterThanOrEqual(.799);
  await page.screenshot({path:'docs/verification/cursor-zoom.png'});
  for(let i=0;i<4;i++){await page.mouse.wheel(0,800);await page.waitForTimeout(60);}
  expect(await page.evaluate(()=>window.__aether.diagnostics().zoom)).toBeCloseTo(240,5);await anchored(page,anchor,centre);
  await camera(page,'overview');await page.waitForTimeout(100);
  // The rook flies only after promotion. Keep the airborne cursor case explicit.
  await page.evaluate(()=>{const s=window.__aether.state();s.g.b[70].p=true;localStorage.setItem('aether-shogi-v1',JSON.stringify(s));});await page.reload();await ready(page);
  const rook=await page.evaluate(()=>window.__aether.projectCell(70));await page.mouse.click(rook.x,rook.y);await camera(page,'close');await page.waitForTimeout(100);
  const flying=await page.evaluate(()=>window.__aether.projectFlying(70)),surface=await anchorAt(page,flying);
  expect(await page.evaluate(p=>p[1]-window.__aether.height(p[0],p[2]),surface)).toBeGreaterThan(2.5);
  await wheel(page,flying,-200);await wheel(page,flying,200);
  // A cursor over the sky still produces a finite view, even near the field edge.
  await wheel(page,{x:40,y:100},-100);
  expect(await page.evaluate(()=>window.__aether.diagnostics().cameraPosition.every(Number.isFinite))).toBe(true);
  await camera(page,'overview');await page.waitForTimeout(100);
  expect(await page.evaluate(()=>window.__aether.diagnostics())).toMatchObject({zoom:185,cameraTarget:[0,0,0]});
  expect(errors).toEqual([]);
});

test('pinch keeps the world point at the moving midpoint of two fingers',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const page=await context.newPage();await page.goto('http://127.0.0.1:5174/?debug');await ready(page);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const point=await page.evaluate(()=>window.__aether.projectCell(41)),anchor=await anchorAt(page,point);
  const cdp=await context.newCDPSession(page);
  const fingers=(mid,half)=>[{x:mid.x-half,y:mid.y,id:1},{x:mid.x+half,y:mid.y,id:2}];
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:fingers(point,20)});
  const midpoint={x:point.x-8,y:point.y+12};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:fingers(midpoint,60)});await page.waitForTimeout(120);
  expect(await page.evaluate(()=>window.__aether.diagnostics().zoom)).toBeCloseTo(185/3,3);await anchored(page,anchor,midpoint);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:fingers(point,30)});await page.waitForTimeout(120);await anchored(page,anchor,point);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.screenshot({path:'docs/verification/cursor-zoom-mobile.png',fullPage:true});
  await writeFile('docs/verification/cursor-zoom-mobile.json',JSON.stringify({anchor,point,...await page.evaluate(()=>window.__aether.diagnostics())},null,2));
  expect(await page.evaluate(()=>window.__aether.state().past)).toHaveLength(0);
  expect(errors).toEqual([]);await context.close();
});

test('a wheel gesture interrupts view easing without drifting afterwards',async({page})=>{
  await page.goto('/?debug');await ready(page);
  const point=await page.evaluate(()=>window.__aether.projectCell(54));await page.mouse.click(point.x,point.y);
  await camera(page,'close');await page.waitForTimeout(40);
  // Capture the anchor inside the actual event, while the camera is still moving.
  await page.evaluate(()=>document.querySelector('#scene').addEventListener('wheel',e=>{
    window.zoomCheck={anchor:window.__aether.zoomAnchor(e.clientX,e.clientY),point:{x:e.clientX,y:e.clientY}};
  },{once:true,capture:true}));
  await page.mouse.move(670,560);await page.mouse.wheel(0,-200);
  await page.waitForFunction(()=>window.zoomCheck);
  const check=await page.evaluate(()=>window.zoomCheck);await anchored(page,check.anchor,check.point);
  await page.waitForTimeout(550);await anchored(page,check.anchor,check.point);
  await camera(page,'overview');
  await expect.poll(()=>page.evaluate(()=>Math.hypot(...window.__aether.diagnostics().cameraTarget))).toBeLessThan(.01);
  await expect(page.locator('#unitname')).toHaveText('足軽隊');
});
