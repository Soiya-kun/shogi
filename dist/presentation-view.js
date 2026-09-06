import {language} from './i18n.js';
import {stage} from './stages.js';
import {presentEvent} from './presentation-themes.mjs';
export class PresentationView {
  constructor({world,project,manifestURL='./audio/voices.json',audioFactory=()=>new Audio()}={}){
    this.world=world;this.project=project;this.audioFactory=audioFactory;this.sources={};this.audio=null;this.audioState='unavailable';this.reduced=matchMedia('(prefers-reduced-motion: reduce)');
    this.layer=document.createElement('div');this.layer.id='war-presentation';this.layer.setAttribute('aria-live','polite');this.layer.setAttribute('aria-atomic','true');world.append(this.layer);
    this.markers=document.createElement('div');this.markers.className='war-markers';this.markers.setAttribute('aria-hidden','true');world.append(this.markers);
    this.logNode=document.querySelector('#war-log');
    this.ready=fetch(manifestURL).then(r=>{if(!r.ok)throw new Error('manifest');return r.json();}).then(m=>{this.sources=m.version===1&&m.voices&&typeof m.voices==='object'?m.voices:{};this.audioState=Object.keys(this.sources).length?'ready':'unavailable';}).catch(()=>{this.audioState='unavailable';});
    this.onHidden=()=>{if(document.hidden)this.stopAudio();};document.addEventListener('visibilitychange',this.onHidden);
  }
  stopAudio(){this.audioGeneration=(this.audioGeneration??0)+1;if(this.audio){this.audio.pause();this.audio.removeAttribute('src');this.audio.load();this.audio=null;}if(this.audioState==='playing')this.audioState='ready';}
  play(e,settings){
    this.stopAudio();if(!settings.canVoice||document.hidden)return false;
    const entry=this.sources[e.voiceKey]?.[e.side],localized=entry?.[language],src=typeof localized==='string'?localized:localized?.src??(language==='ja'?(typeof entry==='string'?entry:entry?.src):undefined);if(!src)return false;
    const url=new URL(src,location.href);if(url.origin!==location.origin||!url.pathname.startsWith('/audio/'))return false;
    const player=this.audio=this.audioFactory(),generation=this.audioGeneration;player.src=url.href;player.volume=settings.volume;this.audioState='playing';
    player.onended=()=>{if(this.audio===player)this.stopAudio();};
    Promise.resolve(player.play()).catch(()=>{if(generation===this.audioGeneration){this.stopAudio();this.audioState='blocked';}});return true;
  }
  show(e,settings){
    this.sourceEvent=e;e=presentEvent(e,stage.id);
    this.layer.replaceChildren();this.markers.replaceChildren();for(const node of document.querySelectorAll('.war-command'))node.remove();
    const commandHost=document.querySelector(`#ai-card-${e.side}`);
    const commandCard=e.control&&e.id!==95&&(stage.id!=='yankee'||!!commandHost?.getClientRects().length);
    const card=document.createElement('div');card.className=`war-banner ${commandCard?'war-command':''}`;card.dataset.intensity=e.intensity;card.dataset.side=e.side;card.dataset.mode=this.reduced.matches?'subtle':settings.mode;card.dataset.event=e.id;
    card.dataset.theme=stage.id;
    const side=document.createElement('div');side.className='war-side';side.textContent=language==='en'?(e.side?'△ RED · Second':'▲ BLUE · First'):(e.side?'△ 後手 · RED':'▲ 先手 · BLUE');
    const title=document.createElement('strong');title.className='war-kanji';title.textContent=e.kanji;
    card.append(side,title);
    if(e.formationName){const name=document.createElement('span');name.className='war-english';name.textContent=e.formationName;card.append(name);}
    if(e.resultSubtitle){const sub=document.createElement('span');sub.className='war-english';sub.textContent=e.resultSubtitle;card.append(sub);}
    if(settings.english){const en=document.createElement('span');en.className='war-english';en.textContent=e.english;card.append(en);}
    if(settings.subtitles){const line=document.createElement('p');line.className='war-subtitle';line.lang=language;line.textContent=language==='en'?e.subtitle:e.ja;card.append(line);}
    if(commandCard)commandHost?.append(card);else this.layer.append(card);
    this.current=e;this.staticMarkers=settings.mode==='subtle'||this.reduced.matches;this.updateMarkers();
    return this.play(e,settings);
  }
  updateMarkers(){
    cancelAnimationFrame(this.frame);this.markers.replaceChildren();const e=this.current;if(!e||e.control)return;
    const bounds=this.world.getBoundingClientRect();
    for(const cell of [...new Set(e.targetCells)].slice(0,4)){
      const p=this.project?.(cell);if(!p||p.x<bounds.left||p.x>bounds.right||p.y<bounds.top||p.y>bounds.bottom)continue;
      const mark=document.createElement('span');mark.className='war-mark';mark.dataset.side=e.side;mark.dataset.theme=stage.id;mark.dataset.static=String(this.staticMarkers);mark.style.left=(p.x-bounds.left)+'px';mark.style.top=(p.y-bounds.top)+'px';mark.textContent=[19,11,12].includes(e.id)&&cell===e.targetCells.at(-1)?'王':e.marker??(e.id===17?'龍':'✦');this.markers.append(mark);
    }
    this.frame=requestAnimationFrame(()=>this.updateMarkers());
  }
  hide(e){if(this.current?.eventId===e.eventId)this.clear();}
  clear(){this.current=null;cancelAnimationFrame(this.frame);this.layer.replaceChildren();this.markers.replaceChildren();for(const node of document.querySelectorAll('.war-command'))node.remove();this.stopAudio();}
  localize(settings,events){if(this.current)this.show(this.sourceEvent,{...settings,canVoice:false});this.log(events);}
  log(events){
    if(!this.logNode)return;this.logNode.replaceChildren();
    for(const raw of events.slice(-12).reverse()){const e=presentEvent(raw,stage.id);const li=document.createElement('li');li.dataset.event=e.id;li.textContent=`${e.side?'△':'▲'} ${e.ply}${language==='en'?' moves':'手'} · ${language==='en'?e.kanji:e.detail??e.kanji}${e.shown?'':language==='en'?' (recorded)':'（記録）'}`;li.title=language==='en'?e.subtitle:e.ja;this.logNode.append(li);}
  }
  audioStatus(){return {state:this.audioState,playing:!!this.audio,available:Object.keys(this.sources).length};}
  destroy(){this.clear();document.removeEventListener('visibilitychange',this.onHidden);this.layer.remove();this.markers.remove();}
}
