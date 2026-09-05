import assert from 'node:assert/strict';
import {initial,legal,apply,check,forced} from '../dist/rules.mjs';
let g=initial();assert.equal(g.b.filter(Boolean).length,40);assert.equal(legal(g).length,30);assert(!check(g,0));assert(!check(g,1));
let n=apply(g,{from:54,to:45});assert.equal(n.turn,1);assert.equal(n.b[45].t,'P');assert.equal(n.b[54],null);
function blank(){let q=initial();q.b.fill(null);q.b[76]={t:'K',s:0,p:false};q.b[4]={t:'K',s:1,p:false};return q;}
g=blank();g.h[0]={P:1,N:1,L:1};g.b[54]={t:'P',s:0,p:false};let a=legal(g);assert(!a.some(m=>m.drop==='P'&&m.to%9===0));assert(!a.some(m=>m.drop==='P'&&m.to<9));assert(!a.some(m=>m.drop==='N'&&m.to<18));
g=blank();g.b[22]={t:'P',s:0,p:false};a=legal(g).filter(m=>m.from===22&&m.to===13);assert.equal(a.length,2);
g=blank();g.b[10]={t:'P',s:0,p:false};a=legal(g).filter(m=>m.from===10&&m.to===1);assert.equal(a.length,1);assert(a[0].promote);
g=blank();g.b[40]={t:'R',s:1,p:false};g.b[67]={t:'G',s:0,p:false};assert(!legal(g).some(m=>m.from===67&&m.to===66));
g=blank();g.b[40]={t:'P',s:1,p:true};g.b[49]={t:'R',s:0,p:false};n=apply(g,{from:49,to:40});assert.equal(n.h[0].P,1);assert(!n.b[40].p);
// Pawn drop mate: king hemmed in by own lances; gold protects dropped pawn.
g=blank();g.b[3]={t:'L',s:1,p:false};g.b[5]={t:'L',s:1,p:false};g.b[12]={t:'P',s:1,p:false};g.b[14]={t:'P',s:1,p:false};g.b[22]={t:'G',s:0,p:false};g.h[0]={P:1};assert(!legal(g).some(m=>m.drop==='P'&&m.to===13));
for(let i=0,g=initial();i<80;i++){let a=legal(g);if(!a.length)break;let turn=g.turn;g=apply(g,a[(i*17+3)%a.length]);assert(!check(g,turn));assert.equal(g.b.filter(Boolean).length+g.h.flatMap(h=>Object.values(h)).reduce((a,b)=>a+b,0),40);}
console.log('PASS: setup, moves, captures, promotion, pins, drops, pawn-drop mate, 80-ply invariants');
