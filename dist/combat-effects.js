import * as T from './three.module.js';
import {mergeGeometries} from './vendor/utils/BufferGeometryUtils.js';
import {COMBAT_LIMITS,clamp} from './combat-motion.mjs';

// Fixed GPU batches are shared by every battle; no particle owns a timer or mesh.
export function createCombatEffects(scene,h){
  const batches=new Map(),unit=new T.Object3D(),up=new T.Vector3(0,1,0),direction=new T.Vector3();
  const color=new T.Color();let particles=0;
  const shaft=new T.CylinderGeometry(.025,.025,1.1,4),tip=new T.ConeGeometry(.095,.26,4);tip.translate(0,.66,0);
  const arrowParts=[shaft.toNonIndexed(),tip.toNonIndexed()],arrow=mergeGeometries(arrowParts);arrowParts.forEach(g=>g.dispose());shaft.dispose();tip.dispose();
  const c=document.createElement('canvas');c.width=64;c.height=128;const ctx=c.getContext('2d');
  ctx.fillStyle='#f8ecc9';ctx.fillRect(0,0,64,128);ctx.strokeStyle='#a43d29';ctx.lineWidth=3;ctx.strokeRect(7,7,50,114);
  ctx.fillStyle='#923820';ctx.font='bold 29px serif';ctx.textAlign='center';ctx.fillText('鎮',32,45);ctx.fillText('護',32,83);
  const paperMap=new T.CanvasTexture(c);paperMap.colorSpace=T.SRGBColorSpace;
  const basic=(options={})=>new T.MeshBasicMaterial({depthWrite:false,...options});
  const specs={
    dust:[new T.IcosahedronGeometry(1,1),basic({transparent:true,opacity:.30})],
    spark:[new T.IcosahedronGeometry(1,0),basic({transparent:true,opacity:.88,blending:T.AdditiveBlending})],
    arrow:[arrow,basic()],paper:[new T.PlaneGeometry(.48,.86),basic({map:paperMap,side:T.DoubleSide})],
    arc:[new T.TorusGeometry(1,.045,3,18,Math.PI*1.15),basic({transparent:true,opacity:.85,side:T.DoubleSide})],
    ring:[new T.TorusGeometry(1,.025,3,48),basic({transparent:true,opacity:.7})],
  };
  for(const [kind,[geometry,material]] of Object.entries(specs)){
    const mesh=new T.InstancedMesh(geometry,material,COMBAT_LIMITS.particles);mesh.count=0;mesh.frustumCulled=false;
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(mesh);batches.set(kind,mesh);
  }
  function put(kind,x,y,z,sx,sy,sz,tint,rotation=[0,0,0],velocity=null){
    const mesh=batches.get(kind);if(particles>=COMBAT_LIMITS.particles)return;particles++;
    unit.position.set(x,y,z);unit.rotation.set(...rotation);unit.scale.set(sx,sy,sz);
    if(velocity)unit.quaternion.setFromUnitVectors(up,direction.set(...velocity).normalize());
    unit.updateMatrix();mesh.setMatrixAt(mesh.count,unit.matrix);mesh.setColorAt(mesh.count++,color.set(tint));
  }
  const random=(seed)=>{const v=Math.sin(seed*127.1+311.7)*43758.5453;return v-Math.floor(v);};
  function update(effects){
    particles=0;
    for(const mesh of batches.values())mesh.count=0;
    for(const fx of effects){
      if(!fx.combat)continue;
      const {style,impact}=fx.combat,f=fx.progress,src=fx.attackPoint,dst=fx.destination,heading=fx.heading;
      const cos=Math.cos(heading),sin=Math.sin(heading),seed=fx.squadId*17,hit=(f-impact)/.30;
      if(f>.15&&f<.65&&['L','R'].includes(style)){
        for(let j=0;j<8;j++){const age=(f*5+j/8)%1,x=fx.actor.x+(random(j+seed)-.5)*8,z=fx.actor.z+cos*age*4,r=.15+age*.9;
          put('dust',x,h(x,z)+r*.4,z,r,r*.6,r,0xb29468);}
      }
      if(hit>0&&hit<1){
        for(let j=0;j<16;j++){
          const a=random(seed+j)*Math.PI*2,r=(1+random(j+5))*hit*4,x=dst.x+Math.cos(a)*r,z=dst.z+Math.sin(a)*r;
          const size=(.16+hit*.9)*(1-hit);
          put('dust',x,h(x,z)+hit*.6+.12,z,size*2,size,size*2,0xb99c75);
          if(j<10){const lift=Math.sin(hit*Math.PI)*(1+random(j+1)*2),s=.08*(1-hit);
            put('spark',x,h(x,z)+lift+.3,z,s,s*3,s,style==='B'?0x90e8ff:0xffce77);}
        }
      }
      if(style==='N'){
        const archers=(fx.actor.contacts??[]).filter(p=>p.model==='A');
        for(let j=0;j<5;j++){
          const u=(f-.36-j*.008)/(.21),archer=archers[j],x0=(archer?.x??src.x)-.35*cos,z0=(archer?.z??src.z)+.35*sin;
          const x1=dst.x+(j%3-1)*2.2,z1=dst.z+(j<2?-1.5:1.5);
          if(u<0||u>1)continue;
          const y0=h(x0,z0)+1.5,y1=h(x1,z1)+.8,arc=3+Math.hypot(x1-x0,z1-z0)*.12;
          put('arrow',T.MathUtils.lerp(x0,x1,u),T.MathUtils.lerp(y0,y1,u)+Math.sin(Math.PI*u)*arc,T.MathUtils.lerp(z0,z1,u),1,1,1,0xd6bf91,[0,0,0],[x1-x0,y1-y0+Math.cos(Math.PI*u)*Math.PI*arc,z1-z0]);
        }
      }
      if(style==='B'){
        for(let j=0;j<5;j++){
          const u=clamp((f-.23-j*.012)/.26),a=j*Math.PI*2/5+f*3;
          if(f<.23||f>.74)continue;
          const x=T.MathUtils.lerp(src.x,dst.x+Math.cos(a)*3.6,u),z=T.MathUtils.lerp(src.z,dst.z+Math.sin(a)*3.6,u);
          put('paper',x,h(x,z)+1.4+Math.sin(u*Math.PI)*3,z,1.3,1.3,1.3,0xffffff,[0,-heading+f*10,a*.15]);
        }
        const rune=Math.sin(clamp((f-.43)/.34)*Math.PI);
        if(rune>.01){
          for(const r of [2.3,3.9])put('ring',dst.x,h(dst.x,dst.z)+.25,dst.z,r,r,1,0x86e8ef,[-Math.PI/2,0,f]);
          for(let j=0;j<8;j++){const a=j*Math.PI/4,x=dst.x+Math.cos(a)*3,z=dst.z+Math.sin(a)*3;
            put('paper',x,h(x,z)+.30,z,rune,rune,rune,0xe6fdff,[-Math.PI/2,0,a]);}
        }
      }
      if(style==='D'&&f>.28&&f<.68){
        const dragons=(fx.actor.contacts??[]).filter(p=>p.airborne);
        for(let lane=0;lane<3;lane++)for(let j=0;j<12;j++){
          const u=(f*3+j/12)%1,side=(lane-1)*3.8,mount=dragons[lane],x0=(mount?.x??fx.actor.x+side*cos)-2.7*sin,z0=(mount?.z??fx.actor.z-side*sin)-2.7*cos;
          const x1=dst.x+side*.75,z1=dst.z+(random(seed+j)-.5)*4;
          const x=T.MathUtils.lerp(x0,x1,u),z=T.MathUtils.lerp(z0,z1,u),y=T.MathUtils.lerp((mount?.y??h(x0,z0)+1.6)+1.45,h(x1,z1)+.5,u);
          const strength=Math.sin((f-.28)/.40*Math.PI),r=(.12+u*.65)*strength;
          put('spark',x,y+Math.sin(j*4)*u*.5,z,r,r*1.3,r,u<.4?0xffdd82:0xff7629);
        }
      }
      const slash=(f-(style==='B'?.53:impact-.035))/.17;
      if(slash>0&&slash<1&&['S','G','B','K','R'].includes(style)){
        for(let j=0;j<3;j++){const r=(style==='S'?1.8:1.2)*Math.sin(slash*Math.PI),x=dst.x+(j-1)*2.8*cos,z=dst.z-(j-1)*2.8*sin;
          put('arc',x,h(x,z)+1.4,z,r,r,r,style==='B'?0xb9efff:0xffe1a0,[.5,heading,slash*2+j]);}
      }
    }
    for(const mesh of batches.values()){
      mesh.visible=mesh.count>0;
      if(mesh.count){mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;}
    }
  }
  return {update,clear:()=>update([]),stats:()=>({particles:[...batches.values()].reduce((n,b)=>n+b.count,0),particleBatches:[...batches.values()].filter(b=>b.count).length})};
}

// User-enabled synthesized impacts. No delayed callbacks can outlive their battle.
export function createCombatAudio(){
  let context,enabled=false,last=-Infinity,buffer;const voices=new Map();
  function stop(id){const voice=voices.get(id);if(!voice)return;voices.delete(id);for(const node of voice.sources){try{node.stop();}catch{}node.disconnect();}voice.gain.disconnect();}
  function clear(){for(const id of [...voices.keys()])stop(id);}
  function enable(value){
    enabled=value;if(!value){clear();return;}
    try{context??=new (window.AudioContext||window.webkitAudioContext)();context.resume().catch(()=>{});}catch{enabled=false;}
  }
  function play(id,style){
    if(!enabled||!context||context.state!=='running'||context.currentTime-last<.07)return;
    last=context.currentTime;while(voices.size>=4)stop(voices.keys().next().value);
    buffer??=(()=>{const b=context.createBuffer(1,context.sampleRate*.5,context.sampleRate),data=b.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;return b;})();
    const time=context.currentTime,duration=style==='D'?.42:style==='N'?.16:.24;
    const gain=context.createGain();gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(.07,time+.01);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);gain.connect(context.destination);
    const noise=context.createBufferSource(),tone=context.createOscillator();noise.buffer=buffer;noise.connect(gain);
    tone.type='triangle';tone.frequency.setValueAtTime(style==='B'?520:style==='S'?110:200,time);tone.frequency.exponentialRampToValueAtTime(style==='B'?280:55,time+duration);tone.connect(gain);
    const voice={sources:[noise,tone],gain};voices.set(id,voice);tone.onended=()=>{if(voices.get(id)===voice)stop(id);};
    for(const source of voice.sources){source.start(time);source.stop(time+duration);}
  }
  return {enable,play,stop,clear,stats:()=>({audioVoices:voices.size,soundEnabled:enabled})};
}
