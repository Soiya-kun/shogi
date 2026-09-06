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
    const entry=this.sources[e.voiceKey]?.[e.side],src=typeof entry==='string'?entry:entry?.src;if(!src)return false;
    const url=new URL(src,location.href);if(url.origin!==location.origin||!url.pathname.startsWith('/audio/'))return false;
    const player=this.audio=this.audioFactory(),generation=this.audioGeneration;player.src=url.href;player.volume=settings.volume;this.audioState='playing';
    player.onended=()=>{if(this.audio===player)this.stopAudio();};
    Promise.resolve(player.play()).catch(()=>{if(generation===this.audioGeneration){this.stopAudio();this.audioState='blocked';}});return true;
  }
  show(e,settings){
    this.layer.replaceChildren();this.markers.replaceChildren();for(const node of document.querySelectorAll('.war-command'))node.remove();
    const commandCard=e.control&&e.id!==95;
    const card=document.createElement('div');card.className=`war-banner ${commandCard?'war-command':''}`;card.dataset.intensity=e.intensity;card.dataset.side=e.side;card.dataset.mode=this.reduced.matches?'subtle':settings.mode;card.dataset.event=e.id;
    const side=document.createElement('div');side.className='war-side';side.textContent=e.side?'△ 後手 · RED':'▲ 先手 · BLUE';
    const title=document.createElement('strong');title.className='war-kanji';title.textContent=e.kanji;
    card.append(side,title);
    if(e.resultSubtitle){const sub=document.createElement('span');sub.className='war-english';sub.textContent=e.resultSubtitle;card.append(sub);}
    if(settings.english){const en=document.createElement('span');en.className='war-english';en.textContent=e.english;card.append(en);}
    if(settings.subtitles){const ja=document.createElement('p');ja.className='war-subtitle';ja.textContent=e.ja;card.append(ja);if(settings.english){const en=document.createElement('p');en.className='war-translation';en.textContent=e.subtitle;card.append(en);}}
    if(commandCard)document.querySelector(`#ai-card-${e.side}`)?.append(card);else this.layer.append(card);
    this.current=e;this.staticMarkers=settings.mode==='subtle'||this.reduced.matches;this.updateMarkers();
    return this.play(e,settings);
  }
  updateMarkers(){
    cancelAnimationFrame(this.frame);this.markers.replaceChildren();const e=this.current;if(!e||e.control)return;
    const bounds=this.world.getBoundingClientRect();
    for(const cell of [...new Set(e.targetCells)].slice(0,4)){
      const p=this.project?.(cell);if(!p||p.x<bounds.left||p.x>bounds.right||p.y<bounds.top||p.y>bounds.bottom)continue;
      const mark=document.createElement('span');mark.className='war-mark';mark.dataset.side=e.side;mark.dataset.static=String(this.staticMarkers);mark.style.left=(p.x-bounds.left)+'px';mark.style.top=(p.y-bounds.top)+'px';mark.textContent=[19,11,12].includes(e.id)&&cell===e.targetCells.at(-1)?'王':e.id===17?'龍':'✦';this.markers.append(mark);
    }
    this.frame=requestAnimationFrame(()=>this.updateMarkers());
  }
  hide(e){if(this.current?.eventId===e.eventId)this.clear();}
  clear(){this.current=null;cancelAnimationFrame(this.frame);this.layer.replaceChildren();this.markers.replaceChildren();for(const node of document.querySelectorAll('.war-command'))node.remove();this.stopAudio();}
  log(events){
    if(!this.logNode)return;this.logNode.replaceChildren();
    for(const e of events.slice(-12).reverse()){const li=document.createElement('li');li.dataset.event=e.id;li.textContent=`${e.side?'△':'▲'} ${e.ply}手 · ${e.detail??e.kanji}${e.shown?'':'（記録）'}`;li.title=e.ja;this.logNode.append(li);}
  }
  audioStatus(){return {state:this.audioState,playing:!!this.audio,available:Object.keys(this.sources).length};}
  destroy(){this.clear();document.removeEventListener('visibilitychange',this.onHidden);this.layer.remove();this.markers.remove();}
}
