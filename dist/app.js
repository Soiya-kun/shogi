import {createBattlefield} from './battlefield.js';
import {check,names,roles} from './rules.mjs';
import {Match} from './match.mjs';
import {SQUADS} from './formations.mjs';

const $=s=>document.querySelector(s), storageKey='aether-shogi-v1';
let saved;try{saved=JSON.parse(localStorage.getItem(storageKey));}catch{}
const match=new Match(saved);
let view,selected=null,moves=[],busy=false;
const promotion=$('#promotion');
function toast(text){$('#toast').textContent=text;$('#toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').hidden=true,2600);}
function save(){try{localStorage.setItem(storageKey,JSON.stringify(match.serialize()));}catch{toast('このブラウザでは対局を保存できません');}}
function showUnit(p){$('#symbol').textContent=p?names[p.t]:'選';$('#unitname').textContent=p?(p.p?'昇格 ': '')+SQUADS[p.t].name:'部隊を選択';$('#unitdesc').textContent=p?SQUADS[p.t].count+(SQUADS[p.t].unit||'人')+' · '+SQUADS[p.t].formation+(p.p?' · 成駒':''):'光るマスへ移動できます';}
function refresh(){
  const g=match.g;
  $('#phase').textContent=g.turn?'後手のターン':'先手のターン';$('#army').textContent=g.turn?'紅の騎士団':'蒼の騎士団';
  $('#turnIcon').style.background=g.turn?'#793e40':'#244b67';$('#count').textContent=String(g.ply+1).padStart(3,'0');
  $('#status').textContent=match.end||(busy?'部隊が移動しています':check(g,g.turn)?'王手 — 王を守ってください':selected?'光るマスへ移動できます':'部隊を選択してください');
  $('#moveCount').textContent=g.ply+' 手';$('#history').replaceChildren();
  if(!match.records.length){const li=document.createElement('li');li.className='muted';li.textContent='両軍が配置につきました。';$('#history').append(li);}
  match.records.slice(-20).reverse().forEach((s,i)=>{const li=document.createElement('li'),em=document.createElement('em');em.textContent=String(match.records.length-i).padStart(2,'0');li.append(em,document.createTextNode(s.text));$('#history').append(li);});
  $('#hands').replaceChildren();
  const entries=Object.entries(g.h[g.turn]).filter(([,n])=>n>0);
  if(!entries.length){const p=document.createElement('p');p.className='muted';p.textContent='待機中の部隊はありません';$('#hands').append(p);}
  for(const [t,n] of entries){const b=document.createElement('button');b.textContent=names[t]+' ×'+n;b.disabled=busy||!!match.end;b.setAttribute('aria-pressed',String(selected?.drop===t));b.onclick=()=>{selected={drop:t};moves=match.moves.filter(m=>m.drop===t);showUnit({t,p:false});refresh();};$('#hands').append(b);}
  $('#undo').disabled=busy||!match.past.length;$('#reset').disabled=busy;
  view?.highlight(selected,moves,g.b,match.records.at(-1)?.m);
}
async function finish(m){
  if(busy)return;busy=true;selected=null;moves=[];
  try{
    const {before,after,m:move}=match.play(m);save();refresh();
    await view.transition(before,after,move);
    if(move.promote)toast('CLASS CHANGE / '+roles[after.b[move.to].t]+' 昇格');
    if(match.end)toast(match.end);
  }catch(error){console.error(error);view.draw(match.g.b);toast('操作を完了できませんでした');}
  finally{busy=false;showUnit(null);refresh();}
}
function pick(i){
  if(busy||!view||match.end||promotion.open)return;
  const choices=moves.filter(m=>m.to===i);
  if(choices.length){
    if(choices.length===2){promotion.showModal();$('#yes').onclick=()=>{promotion.close();finish(choices.find(m=>m.promote));};$('#no').onclick=()=>{promotion.close();finish(choices.find(m=>!m.promote));};}
    else finish(choices[0]);return;
  }
  const p=match.g.b[i];
  if(p?.s===match.g.turn){selected={from:i};moves=match.moves.filter(m=>m.from===i);showUnit(p);if(!moves.length)toast('この部隊は今は移動できません');}
  else {selected=null;moves=[];showUnit(null);}refresh();
}
$('#closeView').onclick=()=>view?.close();$('#overview').onclick=()=>view?.overview();
$('#rotate').onclick=()=>view?.rotate();$('#top').onclick=()=>view?.top();
$('#labels').onclick=()=>{if(view){const on=view.labels();$('#labels').textContent='駒名 '+(on?'ON':'OFF');$('#labels').setAttribute('aria-pressed',String(on));}};
$('#design').onclick=()=>$('#architecture').showModal();$('.close').onclick=()=>$('#architecture').close();
$('#undo').onclick=()=>{if(busy||!view)return;match.undo();selected=null;moves=[];view.draw(match.g.b);showUnit(null);refresh();save();};
$('#reset').onclick=()=>{if(busy||!view||!confirm('対局を最初から始めますか？'))return;match.reset();selected=null;moves=[];view.draw(match.g.b);showUnit(null);refresh();save();};
refresh();
try {
  view=await createBattlefield($('#scene'),pick);view.draw(match.g.b);refresh();$('#loading').hidden=true;document.body.dataset.ready='true';
  if(new URLSearchParams(location.search).has('debug'))window.__aether={diagnostics:view.diagnostics,projectCell:view.projectCell,projectBanner:view.projectBanner,projectFlying:view.projectFlying,projectPoint:view.projectPoint,zoomAnchor:view.zoomAnchor,height:view.height,contacts:view.contacts,state:()=>structuredClone(match.serialize())};
} catch(error) {
  console.error(error);$('#loading').replaceChildren();const p=document.createElement('p');p.textContent='戦場を読み込めませんでした。WebGL対応ブラウザで再度お試しください。';const b=document.createElement('button');b.textContent='再読み込み';b.onclick=()=>location.reload();$('#loading').append(p,b);
}
