import {control,camera} from './ui-controls.js';
import {test,expect} from '@playwright/test';
import {Match} from '../../dist/match.mjs';

async function cell(page,i){const p=await page.evaluate(i=>window.__aether.projectCell(i),i);await page.mouse.click(p.x,p.y);}
async function move(page,from,to,n){await cell(page,from);await cell(page,to);await expect.poll(()=>page.evaluate(()=>window.__aether.state().g.ply)).toBe(n);}
async function synced(page){
  await expect.poll(()=>page.evaluate(()=>window.__aether.diagnostics().busy)).toBe(false);
  const result=await page.evaluate(()=>({cells:[...new Set(window.__aether.contacts().map(p=>p.cell))].sort((a,b)=>a-b),expected:window.__aether.state().g.b.flatMap((p,i)=>p?[i]:[]),view:window.__aether.diagnostics()}));
  expect(result.cells).toEqual(result.expected);expect(result.view.ghosts).toBe(0);expect(result.view.units).toBe(result.expected.length);
}

test('consecutive captures, immediate drops and repeated movement never restore old visual positions',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/?debug');await expect(page.locator('body')).toHaveAttribute('data-ready','true');
  const g=new Match().g;g.b.fill(null);for(const [i,t,s] of [[80,'K',0],[0,'K',1],[58,'R',0],[4,'R',1],[40,'P',1]])g.b[i]={t,s,p:false};
  await page.evaluate(g=>localStorage.setItem('aether-shogi-v1',JSON.stringify({g,past:[],records:[],end:''})),g);await page.reload();await expect(page.locator('body')).toHaveAttribute('data-ready','true');
  await move(page,58,40,1);expect(await page.evaluate(()=>window.__aether.diagnostics().busy)).toBe(true);
  await move(page,4,40,2);await page.locator('#hands button').filter({hasText:'歩'}).click();await cell(page,50);
  await expect.poll(()=>page.evaluate(()=>window.__aether.state().g.ply)).toBe(3);
  await page.locator('#hands button').filter({hasText:'飛'}).click();await cell(page,30);await expect.poll(()=>page.evaluate(()=>window.__aether.state().g.ply)).toBe(4);
  await move(page,50,41,5);await move(page,30,39,6);await synced(page);
  const state=await page.evaluate(()=>window.__aether.state()),replay=new Match({g,past:[],records:[],end:''});for(const r of state.records)replay.play(r.m);expect(replay.g).toEqual(state.g);
  await move(page,41,32,7);await control(page,'#undo','click');await page.waitForTimeout(1600);await synced(page);expect(await page.evaluate(()=>window.__aether.state().g.ply)).toBe(6);
  await move(page,41,32,7);await control(page,'#reset','click');await page.locator('#reset-confirm').click();await page.waitForTimeout(1600);await synced(page);expect(await page.evaluate(()=>window.__aether.state().g.ply)).toBe(0);expect(errors).toEqual([]);
});
