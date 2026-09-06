import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {Match} from '../../dist/match.mjs';
import {COMBATS,COMBAT_LIMITS} from '../../dist/combat-motion.mjs';

async function ready(page){await expect(page.locator('body')).toHaveAttribute('data-ready','true');await page.waitForFunction(()=>window.__aether?.diagnostics().lastTime>0);}
async function load(page,g,preferences={effects:true,sound:false,tempo:'fast'}){
  await page.goto('/?debug');await ready(page);
  await page.evaluate(({g,preferences})=>{localStorage.setItem('aether-shogi-v1',JSON.stringify({g,past:[],records:[],end:''}));localStorage.setItem('aether-presentation-v1',JSON.stringify(preferences));},{g,preferences});await page.reload();await ready(page);
}
async function cell(page,i){const p=await page.evaluate(i=>window.__aether.projectCell(i),i);await page.mouse.click(p.x,p.y);}
async function move(page,from,to,ply){await cell(page,from);await cell(page,to);await expect.poll(()=>page.evaluate(()=>window.__aether.state().g.ply)).toBe(ply);}
async function synced(page){
  await expect.poll(()=>page.evaluate(()=>window.__aether.diagnostics().busy)).toBe(false);
  const result=await page.evaluate(()=>({squads:window.__aether.presentation().squads,board:window.__aether.state().g.b,view:window.__aether.diagnostics()}));
  expect(result.squads.map(s=>s.cell).sort((a,b)=>a-b)).toEqual(result.board.flatMap((p,i)=>p?[i]:[]));
  for(const s of result.squads)expect(s.piece).toEqual(result.board[s.cell]);
  expect(result.view.ghosts).toBe(0);expect(result.view.particles).toBe(0);expect(result.view.audioVoices).toBe(0);
}
function capturePosition(type,promoted=false,side=0){
  const g=new Match().g;g.b.fill(null);g.b[80]={t:'K',s:0,p:false};g.b[0]={t:'K',s:1,p:false};
  const from=type==='N'&&!promoted?49:40,to=type==='N'&&!promoted||type==='B'&&!promoted?30:31;
  if(type==='K')g.b[80]=null;
  g.b[from]={t:type,s:0,p:promoted};g.b[to]={t:'P',s:1,p:false};
  if(side){g.b.reverse();g.b=g.b.map(p=>p?{...p,s:1-p.s}:null);g.turn=1;}
  return {g,from:side?80-from:from,to:side?80-to:to};
}
function skirmish(){
  const g=new Match().g;g.b.fill(null);g.b[76]={t:'K',s:0,p:false};g.b[4]={t:'K',s:1,p:false};
  for(let i=0;i<9;i++){g.b[45+i]={t:'P',s:0,p:false};g.b[36+i]={t:'P',s:1,p:false};}
  return g;
}

test('piece labels follow ON/OFF for both battling squads and restored positions',async({page})=>{
  const {g,from,to}=capturePosition('P');await load(page,g);
  const labels=async expected=>expect(await page.evaluate(v=>window.__aether.presentation().squads.every(s=>s.labelVisible===v),expected)).toBe(true);
  await move(page,from,to,1);
  await page.waitForFunction(()=>window.__aether.presentation().squads.some(s=>s.ghost));
  await labels(true);
  await page.locator('#labels').click();await labels(false);
  await page.locator('#labels').click();await labels(true);
  expect(await page.evaluate(()=>window.__aether.presentation().squads.some(s=>s.ghost&&s.labelVisible))).toBe(true);
  await synced(page);await labels(true);
  await page.locator('#labels').click();await page.locator('#undo').click();await labels(false);
  await move(page,from,to,1);await labels(false);
  await page.locator('#labels').click();await labels(true);
});

test('every troop attacks, hits, staggers the enemy and occupies; promotion and rear army keep their identity',async({page})=>{
  test.setTimeout(180000);const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const cases=[['P',false,0],['L',false,1],['N',false,0],['S',false,1],['G',false,0],['B',false,1],['R',false,0],['R',true,1],['K',false,0],['N',true,1],['B',true,0]];
  for(const [type,promoted,side] of cases){
    const {g,from,to}=capturePosition(type,promoted,side),style=type==='R'&&promoted?'D':type;
    await load(page,g);await cell(page,from);if(side)await page.locator('#rotate').click();await page.locator('#closeView').click();await page.waitForTimeout(850);
    const before=await page.evaluate(()=>window.__aether.diagnostics());await cell(page,to);
    await expect.poll(()=>page.evaluate(()=>window.__aether.state().g.ply)).toBe(1);
    await page.waitForFunction(()=>window.__aether.presentation().history.at(-1)?.progress>.38);
    const attack=await page.evaluate(()=>({event:window.__aether.presentation().history.at(-1),squads:window.__aether.presentation().squads,contacts:window.__aether.contacts(),view:window.__aether.diagnostics()}));
    expect(attack.event).toMatchObject({style,status:'playing'});expect(attack.event.event.actor.piece).toEqual(g.b[from]);expect(attack.event.event.target.piece).toEqual(g.b[to]);
    expect(attack.squads.filter(s=>!s.ghost&&s.cell===to)).toHaveLength(1);
    expect(attack.contacts.some(p=>p.pose&&Math.abs(p.pose.armR)>.3)).toBe(true);
    for(const squad of attack.squads){const carrier=attack.contacts.find(p=>p.unitId===squad.id&&p.generation===squad.generation&&p.flagBearer);expect(carrier?.flagHand).toBeTruthy();expect(Math.hypot(...squad.flagGrip.map((v,i)=>v-carrier.flagHand[i]))).toBeLessThan(.0001);}
    const actor=attack.squads.find(s=>s.cell===to);expect(Math.hypot(actor.x-((to%9)-4)*12,actor.z-(Math.floor(to/9)-4)*12)).toBeGreaterThan(4);
    expect(attack.view.zoom).toBe(before.zoom); // No forced camera cut.
    if(['N','B','D'].includes(style))expect(attack.view.particles).toBeGreaterThan(0);
    if(!promoted||type==='R')await page.screenshot({path:`docs/verification/combat-${style}.png`});
    await page.waitForFunction(impact=>window.__aether.presentation().history.at(-1)?.progress>impact+.16,COMBATS[style].impact);
    const defeat=await page.evaluate(()=>window.__aether.contacts().filter(p=>p.ghost));expect(defeat.some(p=>p.fall>.5)).toBe(true);
    await synced(page);const done=await page.evaluate(()=>window.__aether.presentation().history.at(-1));expect(done.phase).toBe('settle');expect(done.status).toBe('complete');
    results.push({type,promoted,side,style,attackProgress:attack.event.progress,duration:done.duration,drawCalls:attack.view.drawCalls,triangles:attack.view.triangles,particles:attack.view.particles});
  }
  await writeFile('docs/verification/combat-troops.json',JSON.stringify(results,null,2));expect(errors).toEqual([]);
});

test('actual fast WASM AIs start further searches and independent captures before earlier battles finish',async({page})=>{
  test.setTimeout(120000);
  const g=skirmish();await load(page,g);
  await page.locator('#battle-sound').check();
  await page.evaluate(()=>{
    window.battleOverlap={samples:[],maxBattles:0,maxMotions:0,maxParticles:0,maxDrawCalls:0,maxTriangles:0,maxAudio:0};
    function record(){const d=window.__aether.diagnostics(),p=window.__aether.presentation(),ai=window.__aether.ai(),s=window.battleOverlap;
      s.maxBattles=Math.max(s.maxBattles,d.activeBattles);s.maxMotions=Math.max(s.maxMotions,d.activeMotions);s.maxParticles=Math.max(s.maxParticles,d.particles);s.maxDrawCalls=Math.max(s.maxDrawCalls,d.drawCalls);s.maxTriangles=Math.max(s.maxTriangles,d.triangles);s.maxAudio=Math.max(s.maxAudio,d.audioVoices);
      if(d.activeBattles&&ai.activeRequest&&s.samples.length<120)s.samples.push({ply:window.__aether.state().g.ply,searchRevision:ai.activeRequest.positionRevision,battles:p.history.filter(e=>e.status==='playing'&&e.style).map(e=>({revision:e.event.positionRevision,actor:e.event.actor.id,progress:e.progress}))});
      if(!s.stopped)requestAnimationFrame(record);
    }requestAnimationFrame(record);
  });
  await page.locator('#ai-toggle-0').click();await page.locator('#ai-toggle-1').click();
  await page.waitForFunction(()=>window.battleOverlap.maxBattles>=3&&window.battleOverlap.maxParticles>0&&window.__aether.state().g.ply>=12,null,{timeout:30000});
  await page.locator('#ai-stop-all').click();
  const data=await page.evaluate(()=>{window.battleOverlap.stopped=true;return {overlap:window.battleOverlap,state:window.__aether.state(),engine:window.__aether.ai().engine,history:window.__aether.presentation().history};});
  expect(data.engine).toMatchObject({threads:1});expect(data.overlap.samples.some(s=>s.battles.some(b=>s.searchRevision>b.revision&&b.progress<1))).toBe(true);
  expect(data.overlap.maxBattles).toBeGreaterThanOrEqual(3);expect(data.overlap.maxMotions).toBeLessThanOrEqual(COMBAT_LIMITS.battles);expect(data.overlap.maxParticles).toBeLessThanOrEqual(COMBAT_LIMITS.particles);expect(data.overlap.maxAudio).toBeGreaterThan(0);expect(data.overlap.maxAudio).toBeLessThanOrEqual(4);
  expect(data.overlap.maxDrawCalls).toBeLessThan(500);expect(data.overlap.maxTriangles).toBeLessThan(1400000);
  const replay=new Match({g,past:[],records:[],end:''});for(const r of data.state.records){expect(r.actor).toBe('ai');replay.play(r.m);}expect(replay.g).toEqual(data.state.g);
  await page.screenshot({path:'docs/verification/combat-parallel-ai.png'});await writeFile('docs/verification/combat-parallel-ai.json',JSON.stringify(data,null,2));
  await synced(page);
  // Replaying the same committed moves with presentation disabled must be identical.
  await load(page,g,{effects:false,sound:false,tempo:'fast'});
  for(let i=0;i<data.state.records.length;i++){
    const m=data.state.records[i].m;if(m.drop)await page.locator('#hands button').filter({hasText:{P:'歩',L:'香',N:'桂',S:'銀',G:'金',B:'角',R:'飛'}[m.drop]}).click();else await cell(page,m.from);
    await cell(page,m.to);if(await page.locator('#promotion').isVisible())await page.locator(m.promote?'#yes':'#no').click();
    await expect.poll(()=>page.evaluate(()=>window.__aether.state().g.ply)).toBe(i+1);
  }
  expect(await page.evaluate(()=>window.__aether.state().g)).toEqual(data.state.g);await synced(page);
});

test('capture and immediate redeployment use distinct generations; undo, restore and effects OFF discard obsolete work',async({page})=>{
  const g=new Match().g;g.b.fill(null);for(const [i,t,s] of [[80,'K',0],[0,'K',1],[58,'R',0],[4,'R',1],[40,'P',1]])g.b[i]={t,s,p:false};
  await load(page,g);await page.locator('#battle-sound').check();
  const original=await page.evaluate(()=>window.__aether.presentation().squads.find(s=>s.cell===40));
  await move(page,58,40,1);const first=await page.evaluate(()=>window.__aether.presentation().history.at(-1));
  // This king move is independent, so the defeated pawn must still exist when dropped.
  await move(page,0,1,2);await page.locator('#hands button').filter({hasText:'歩'}).click();await cell(page,50);
  await expect.poll(()=>page.evaluate(()=>window.__aether.state().g.ply)).toBe(3);
  const both=await page.evaluate(()=>window.__aether.presentation().squads),pawn=both.find(s=>s.cell===50);
  expect(both.some(s=>s.ghost&&s.id===original.id)).toBe(true);expect(pawn.id).toBe(original.id);expect(pawn.generation).toBeGreaterThan(original.generation);expect(pawn.piece.s).toBe(0);
  await move(page,4,40,4);const interrupted=await page.evaluate(id=>window.__aether.presentation().history.find(e=>e.event.eventId===id),first.event.eventId);expect(interrupted.status).toBe('superseded');
  await move(page,50,41,5);await move(page,40,49,6);await page.locator('#undo').click();await synced(page);await page.waitForTimeout(4500);await synced(page);
  expect(await page.evaluate(()=>window.__aether.state().g.ply)).toBe(5);
  await move(page,40,49,6);await page.reload();await ready(page);await page.waitForTimeout(4500);await synced(page);expect(await page.evaluate(()=>window.__aether.state().g.ply)).toBe(6);
  await move(page,41,32,7);await page.locator('#battle-effects').uncheck();await synced(page);expect(await page.evaluate(()=>window.__aether.state().g.ply)).toBe(7);
  await page.locator('#battle-effects').check();await move(page,49,48,8);page.once('dialog',d=>d.accept());await page.locator('#reset').click();await page.waitForTimeout(4500);await synced(page);expect(await page.evaluate(()=>window.__aether.state().g.ply)).toBe(0);
});

test('rapid independent battles stay bounded, retain current-cell picking, and finish safely at game end',async({page})=>{
  await load(page,skirmish());
  for(let col=0;col<9;col++){
    const from=col%2?36+col:45+col,to=col%2?45+col:36+col;await move(page,from,to,col+1);
    const d=await page.evaluate(()=>window.__aether.diagnostics());expect(d.activeMotions).toBeLessThanOrEqual(COMBAT_LIMITS.battles);expect(d.ghosts).toBeLessThanOrEqual(COMBAT_LIMITS.battles);expect(d.particles).toBeLessThanOrEqual(COMBAT_LIMITS.particles);
  }
  await synced(page);
  const g=new Match().g;g.b.fill(null);g.b[76]={t:'K',s:0,p:false};g.b[0]={t:'K',s:1,p:false};g.b[9]={t:'P',s:1,p:false};g.b[1]={t:'P',s:1,p:false};g.b[10]={t:'P',s:0,p:false};g.b[11]={t:'G',s:0,p:false};
  await load(page,g);await cell(page,10);await cell(page,1);
  await expect.poll(()=>page.evaluate(()=>window.__aether.ai().phase)).toBe('ended');
  expect(await page.evaluate(()=>window.__aether.diagnostics().busy)).toBe(true);await synced(page);
  await page.locator('#undo').click();await synced(page);expect(await page.evaluate(()=>window.__aether.state().g.ply)).toBe(0);
});

test('compact touch view bounds concurrent combat and reduced motion skips all delayed presentation',async({browser})=>{
  const context=await browser.newContext({baseURL:'http://127.0.0.1:5174',viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await load(page,skirmish());
  await page.evaluate(()=>{window.compactCombat={motions:0,particles:0,triangles:0};function sample(){const d=window.__aether.diagnostics(),s=window.compactCombat;s.motions=Math.max(s.motions,d.activeMotions);s.particles=Math.max(s.particles,d.particles);s.triangles=Math.max(s.triangles,d.triangles);if(!s.stop)requestAnimationFrame(sample);}requestAnimationFrame(sample);});
  await page.locator('#ai-toggle-0').tap();await page.locator('#ai-toggle-1').tap();await page.waitForFunction(()=>window.__aether.state().g.ply>=8);await page.locator('#ai-stop-all').tap();
  const measured=await page.evaluate(()=>{window.compactCombat.stop=true;return window.compactCombat;});
  expect(measured.motions).toBeGreaterThan(1);expect(measured.motions).toBeLessThanOrEqual(COMBAT_LIMITS.mobileBattles);expect(measured.particles).toBeLessThanOrEqual(COMBAT_LIMITS.particles);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await synced(page);
  await page.locator('#world').scrollIntoViewIfNeeded();await page.screenshot({path:'docs/verification/combat-mobile.png',fullPage:true});await writeFile('docs/verification/combat-mobile.json',JSON.stringify(measured,null,2));
  await page.emulateMedia({reducedMotion:'reduce'});const {g,from,to}=capturePosition('P');await load(page,g);
  await expect(page.locator('#battle-effects')).toBeDisabled();await expect(page.locator('#battle-effects')).not.toBeChecked();
  for(const i of [from,to]){const p=await page.evaluate(i=>window.__aether.projectCell(i),i);await page.touchscreen.tap(p.x,p.y);}
  await expect.poll(()=>page.evaluate(()=>window.__aether.state().g.ply)).toBe(1);expect(await page.evaluate(()=>window.__aether.presentation().history)).toHaveLength(0);await synced(page);
  expect(errors).toEqual([]);await context.close();
});

test('standard AI commits about every three seconds while the previous three-second battle continues',async({page})=>{
  await load(page,skirmish(),{effects:true,sound:false,tempo:'normal'});
  expect(await page.evaluate(()=>window.__aether.ai().minimumThinkMs)).toBe(3000);
  await page.locator('#ai-toggle-0').click();await page.locator('#ai-toggle-1').click();
  await page.waitForFunction(()=>window.__aether.presentation().history.length>=2,null,{timeout:15000});
  const check=await page.evaluate(()=>({history:window.__aether.presentation().history,ai:window.__aether.ai(),view:window.__aether.diagnostics()}));
  await page.locator('#ai-stop-all').click();
  const [first,second]=check.history,interval=second.started-first.started;
  expect(interval).toBeGreaterThanOrEqual(2950);expect(interval).toBeLessThan(4200);
  expect(first).toMatchObject({status:'playing',duration:4200});expect(second).toMatchObject({status:'playing',duration:4200});
  expect(check.view.activeBattles).toBe(2);expect(check.ai.activeRequest.positionRevision).toBeGreaterThan(first.event.positionRevision);
  await writeFile('docs/verification/combat-standard-tempo.json',JSON.stringify({interval,...check},null,2));await synced(page);
});
