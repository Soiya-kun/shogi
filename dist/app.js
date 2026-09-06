import {createBattlefield} from './battlefield.js';
import {check,names,roles} from './rules.mjs';
import {GameController} from './game-controller.mjs';
import {OPENINGS,ORDERS} from './ai/strategy-policy.mjs';
import {squadSpec} from './formations.mjs';
import {BattlePresentation} from './battle-presentation.mjs';
import {PresentationDirector,sanitizePresentation} from './presentation-director.mjs';
import {PresentationView} from './presentation-view.js';

const $=s=>document.querySelector(s), storageKey='aether-shogi-v1';
let saved;try{saved=JSON.parse(localStorage.getItem(storageKey));}catch{}
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let preferences={effects:!reducedMotion,sound:false,tempo:'normal'};
try{const p=JSON.parse(localStorage.getItem('aether-presentation-v1'));if(p)preferences={effects:p.effects!==false,sound:p.sound===true,tempo:['fast','normal','slow'].includes(p.tempo)?p.tempo:'normal'};}catch{}
function savePreferences(){try{localStorage.setItem('aether-presentation-v1',JSON.stringify(preferences));}catch{}}
let view,war,selected=null,moves=[];
const controller=new GameController({saved,animate:async({before,after,m,event})=>{try{await view.transition(before,after,m,event);}catch(error){if(controller.animations.has(event))view.draw(controller.match.g.b,controller.diagnostics());throw error;}},onChange:()=>{if(!controller.canPlay){selected=null;moves=[];if(promotion.open)promotion.close();showUnit(null);}refresh();save();},onNotice:toast,onEvent:(type,data)=>war?.handle(type,data)});
const match=controller.match;
const promotion=$('#promotion');
function toast(text){$('#toast').textContent=text;$('#toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').hidden=true,2600);}
function save(){try{localStorage.setItem(storageKey,JSON.stringify({...controller.serialize(),presentation:war?.serialize()}));}catch{toast('このブラウザでは対局を保存できません');}}
function showUnit(p){const spec=p?squadSpec(p.t,p.p):null;$('#symbol').textContent=p?names[p.t]:'選';$('#unitname').textContent=p?(p.p?'昇格 ': '')+spec.name:'部隊を選択';$('#unitdesc').textContent=p?spec.count+(spec.unit||'人')+' · '+spec.formation+(p.p?' · 成駒':''):'光るマスへ移動できます';}
function refresh(){
  const g=match.g;
  $('#phase').textContent=g.turn?'後手のターン':'先手のターン';$('#army').textContent=g.turn?'紅の武士団':'蒼の武士団';
  $('#turnIcon').style.background=g.turn?'#793e40':'#244b67';$('#count').textContent=String(g.ply+1).padStart(3,'0');
  $('#status').textContent=match.end||(controller.phase==='error'?'AIを再試行するか、停止して手動で指せます':controller.activeRequest?(controller.engine.ready?'AIが作戦を考えています':'AIを準備しています…'):check(g,g.turn)?'王手 — 王を守ってください':selected?'光るマスへ移動できます':'部隊を選択してください');
  $('#moveCount').textContent=g.ply+' 手';$('#history').replaceChildren();
  if(!match.records.length){const li=document.createElement('li');li.className='muted';li.textContent='両軍が配置につきました。';$('#history').append(li);}
  match.records.slice(-20).reverse().forEach((s,i)=>{const li=document.createElement('li'),em=document.createElement('em');em.textContent=String(match.records.length-i).padStart(2,'0');li.append(em,document.createTextNode(s.text));$('#history').append(li);});
  $('#hands').replaceChildren();
  const entries=Object.entries(g.h[g.turn]).filter(([,n])=>n>0);
  if(!entries.length){const p=document.createElement('p');p.className='muted';p.textContent='待機中の部隊はありません';$('#hands').append(p);}
  for(const [t,n] of entries){const b=document.createElement('button');b.textContent=names[t]+' ×'+n;b.disabled=!controller.canPlay;b.setAttribute('aria-pressed',String(selected?.drop===t));b.onclick=()=>{selected={drop:t};moves=match.moves.filter(m=>m.drop===t);showUnit({t,p:false});refresh();};$('#hands').append(b);}
  $('#undo').disabled=!match.past.length&&match.resignation===null;
  refreshAI();
  view?.highlight(selected,moves,g.b,match.records.at(-1)?.m);
}
async function finish(m){
  if(!controller.canPlay)return;selected=null;moves=[];
  try{const {after,m:move}=await controller.play(m);if(move.promote)toast('部隊昇格 / '+squadSpec(after.b[move.to].t,true).name);if(match.end)toast(match.end);}
  catch(error){toast(error.message);}finally{showUnit(null);refresh();}
}
function pick(i){
  if(!view||match.end||promotion.open)return;
  if(!controller.canPlay){selected=match.g.b[i]?{from:i}:null;moves=[];showUnit(match.g.b[i]);refresh();return;}
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
$('#undo').onclick=()=>{if(!view)return;controller.undo();selected=null;moves=[];view.draw(match.g.b,controller.diagnostics());showUnit(null);refresh();save();};
const resetDialog=$('#reset-confirmation');
$('#reset').onclick=()=>{if(view&&!resetDialog.open)resetDialog.showModal();};
$('#reset-cancel').onclick=()=>resetDialog.close();
$('#reset-confirm').onclick=()=>{if(!view||!resetDialog.open)return;resetDialog.close();controller.reset();selected=null;moves=[];view.draw(match.g.b,controller.diagnostics());showUnit(null);refresh();save();};
function refreshAI(){
  for(const side of [0,1]){
    const policy=controller.settings[side],toggle=$('#ai-toggle-'+side),error=controller.errors[side];
    toggle.textContent=policy.enabled?'AI停止':'AI開始';toggle.setAttribute('aria-pressed',String(policy.enabled));toggle.disabled=!!match.end&&!policy.enabled;
    $('#ai-opening-'+side).value=policy.opening;$('#ai-order-'+side).value=policy.order;
    const status=error?'停止中：'+error:match.end?'対局は終了しました':!policy.enabled?'手動で操作できます':match.g.turn!==side?'次の手番を待っています':controller.engine.ready?'思考中 · '+controller.notices[side]:'AIを準備しています…';
    $('#ai-status-'+side).textContent=status;$('#ai-retry-'+side).hidden=!error;$('#ai-card-'+side).dataset.active=String(policy.enabled);
  }
  $('#ai-stop-all').disabled=!controller.settings.some(p=>p.enabled);
}
for(const side of [0,1]){
  for(const [kind,options] of [['opening',OPENINGS],['order',ORDERS]]){
    const select=$('#ai-'+kind+'-'+side);for(const [value,label] of Object.entries(options)){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);}
    select.onchange=()=>controller.updateSide(side,{[kind]:select.value});
  }
  $('#ai-toggle-'+side).onclick=()=>controller.updateSide(side,{enabled:!controller.settings[side].enabled});
  $('#ai-retry-'+side).onclick=()=>controller.retry(side);
}
$('#ai-stop-all').onclick=()=>{controller.updateSide(0,{enabled:false});controller.updateSide(1,{enabled:false});};
$('#ai-tempo').value=preferences.tempo;
$('#ai-tempo').onchange=()=>{preferences.tempo=$('#ai-tempo').value;controller.setTempo(preferences.tempo);savePreferences();};
$('#battle-effects').checked=preferences.effects&&!reducedMotion;$('#battle-effects').disabled=reducedMotion;
if(reducedMotion)$('#battle-effects').title='端末の「動きを減らす」設定を適用しています';
$('#battle-effects').onchange=()=>{preferences.effects=$('#battle-effects').checked;view?.setPresentation(preferences.effects);savePreferences();};
$('#battle-sound').checked=preferences.sound;
$('#battle-sound').onchange=()=>{preferences.sound=$('#battle-sound').checked;view?.setSound(preferences.sound);savePreferences();};
document.addEventListener('pointerdown',()=>{if(preferences.sound)view?.setSound(true);});
addEventListener('pagehide',()=>controller.destroy());
let warSettings;try{warSettings=JSON.parse(localStorage.getItem('aether-war-presentation-v1'));}catch{}
warSettings=sanitizePresentation(warSettings);
const warView=new PresentationView({world:$('#world'),project:i=>view?.projectCell(i)});
war=new BattlePresentation({controller,director:new PresentationDirector({view:warView,settings:warSettings}),saved:saved?.presentation,save,animated:()=>preferences.effects&&!reducedMotion});
for(const field of ['mode','subtitles','english','voice','volume','analysis']){
  const input=$('#war-'+field);if(input.type==='checkbox')input.checked=warSettings[field];else input.value=warSettings[field];
  input.onchange=()=>{warSettings[field]=input.type==='checkbox'?input.checked:field==='volume'?Number(input.value):input.value;war.configure(warSettings);try{localStorage.setItem('aether-war-presentation-v1',JSON.stringify(warSettings));}catch{}};
}
controller.setTempo(preferences.tempo);
refresh();
try {
  view=await createBattlefield($('#scene'),pick);view.draw(match.g.b,controller.diagnostics());view.setPresentation(preferences.effects);refresh();$('#loading').hidden=true;document.body.dataset.ready='true';controller.start();
  if(new URLSearchParams(location.search).has('debug'))window.__aether={diagnostics:view.diagnostics,presentation:view.presentation,war:()=>war.diagnostics(),projectCell:view.projectCell,projectBanner:view.projectBanner,projectFlying:view.projectFlying,projectPoint:view.projectPoint,zoomAnchor:view.zoomAnchor,height:view.height,contacts:view.contacts,state:()=>structuredClone({...controller.serialize(),presentation:war.serialize()}),ai:()=>controller.diagnostics()};
} catch(error) {
  console.error(error);$('#loading').replaceChildren();const p=document.createElement('p');p.textContent='戦場を読み込めませんでした。WebGL対応ブラウザで再度お試しください。';const b=document.createElement('button');b.textContent='再読み込み';b.onclick=()=>location.reload();$('#loading').append(p,b);
}
