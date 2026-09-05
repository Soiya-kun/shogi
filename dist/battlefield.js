import * as T from './three.module.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';
import { CELL_SIZE, HALF_FIELD, cellXZ, cellAt, terrainSampler } from './terrain.mjs';
import { names } from './rules.mjs';

const symbols = {P:'と',L:'杏',N:'圭',S:'全',R:'龍',B:'馬'};
export async function createBattlefield(canvas, onPick) {
  const mobile = matchMedia('(max-width: 900px)').matches;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new T.WebGLRenderer({canvas, antialias:true, powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.25 : 1.6));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  const scene = new T.Scene();
  scene.background = new T.Color(0xb6ced0);
  scene.fog = new T.Fog(0xb6ced0, 29, 62);
  scene.add(new T.HemisphereLight(0xc6e8ff,0x677545,2.0));
  const sun = new T.DirectionalLight(0xffedd0,3.0);
  sun.position.set(-10,20,8); sun.castShadow = true;
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(sun.shadow.camera,{left:-13,right:13,top:13,bottom:-13,near:1,far:60});
  sun.shadow.bias=-.0003; sun.shadow.normalBias=.035; scene.add(sun);
  const camera = new T.PerspectiveCamera(42,1,.1,110);
  let angle=.10, elevation=.93, zoom=25, labels=true, busy=false, focusCell=76;
  let instances=[], effects=[], templates=new Map(), lastTime=0, renderMs=0, frames=0, availableTargets=new Set();
  const loader = new GLTFLoader();
  const [field, army] = await Promise.all([loader.loadAsync('./assets/meadow.glb'),loader.loadAsync('./assets/army.glb')]);
  scene.add(field.scene); field.scene.updateMatrixWorld(true);
  const ground = field.scene.getObjectByName('Terrain');
  if (!ground) throw new Error('GLBにTerrainがありません');
  // Bake export node transforms before using coordinates for grid and picking.
  ground.geometry = ground.geometry.clone().applyMatrix4(ground.matrixWorld);
  ground.removeFromParent(); ground.position.set(0,0,0); ground.rotation.set(0,0,0); ground.scale.set(1,1,1); scene.add(ground);
  const h = terrainSampler(ground.geometry.attributes.position.array,ground.geometry.index?.array);
  field.scene.traverse(o => {if(o.isMesh){o.receiveShadow=true; o.castShadow=!['GrassAndFlowers','Terrain'].includes(o.name);}});
  ground.receiveShadow = true;
  for (const role of ['P','L','N','S','G','B','R','K']) {
    const unit = army.scene.getObjectByName('Unit_'+role);
    if (!unit) throw new Error(`GLBに兵種${role}がありません`);
    templates.set(role,unit);
  }
  const cloth = [0x2464a5,0xb43d3b].map(color => {
    const mat = new T.MeshStandardMaterial({color,roughness:.8,side:T.DoubleSide}); return mat;
  });
  const labelMaterials = new Map();
  function label(text, color) {
    const key=text+color;
    if(!labelMaterials.has(key)) {
      const c=document.createElement('canvas'); c.width=c.height=128;
      const ctx=c.getContext('2d'); ctx.fillStyle='#12251fec'; ctx.beginPath(); ctx.roundRect(12,10,104,108,24); ctx.fill();
      ctx.strokeStyle=color; ctx.lineWidth=4; ctx.stroke(); ctx.fillStyle=color;
      ctx.font='bold 78px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,64,66);
      labelMaterials.set(key,new T.SpriteMaterial({map:new T.CanvasTexture(c),depthTest:true,transparent:true}));
    }
    const sprite=new T.Sprite(labelMaterials.get(key)); sprite.scale.set(.50,.50,1); return sprite;
  }
  function line(points,color,opacity=1) {
    const obj=new T.Line(new T.BufferGeometry().setFromPoints(points.map(([x,z])=>new T.Vector3(x,h(x,z)+.038,z))), new T.LineBasicMaterial({color,transparent:true,opacity}));
    scene.add(obj); return obj;
  }
  for(let k=0;k<=9;k++) {
    const p=-HALF_FIELD+k*CELL_SIZE;
    for(let direction=0;direction<2;direction++) {
      const points=Array.from({length:181},(_,j)=>{const t=-HALF_FIELD+j*CELL_SIZE/20;return direction?[t,p]:[p,t];});
      line(points, k===0||k===9?0xf5e7ae:0xe4e4b7,k===0||k===9?.90:.53);
    }
  }
  for(let i=0;i<9;i++) {
    const x=(i-4)*CELL_SIZE;
    for(const [xx,zz,txt] of [[x,7.66,String(9-i)],[-7.66,x,'一二三四五六七八九'[i]]]) {
      const tag=label(txt,'#fff5cc');tag.scale.set(.34,.34,1);tag.position.set(xx,h(xx,zz)+.18,zz);scene.add(tag);
    }
  }
  const indicators=new T.Group();scene.add(indicators);
  const patchCache=new Map();
  function patch(i,color,opacity=.3) {
    if(!patchCache.has(i)) {
      const [x,z]=cellXZ(i),geo=new T.PlaneGeometry(CELL_SIZE*.93,CELL_SIZE*.93,8,8);geo.rotateX(-Math.PI/2);
      const pos=geo.attributes.position;
      for(let j=0;j<pos.count;j++){const xx=pos.getX(j)+x,zz=pos.getZ(j)+z;pos.setXYZ(j,xx,h(xx,zz)+.049,zz);}
      geo.computeVertexNormals();patchCache.set(i,geo);
    }
    return new T.Mesh(patchCache.get(i),new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:T.DoubleSide}));
  }
  const cursor=patch(focusCell,0xfff2b7,.32);cursor.visible=false;scene.add(cursor);
  function highlight(selected,moves,board,lastMove) {
    availableTargets=new Set(moves.map(m=>m.to));
    for(const c of indicators.children)c.material.dispose(); indicators.clear();
    if(lastMove) for(const i of [lastMove.from,lastMove.to].filter(v=>v!==undefined))indicators.add(patch(i,0xe9c772,.15));
    if(selected?.from!==undefined)indicators.add(patch(selected.from,0xffe3a0,.55));
    for(const i of new Set(moves.map(m=>m.to)))indicators.add(patch(i,board[i]?0xff685c:0x65d8ff,.46));
  }
  function makeUnit(p,i) {
    const obj=new T.Group(), body=templates.get(p.t).clone(true);obj.add(body);
    body.rotation.y=p.s?Math.PI:0;
    obj.userData={cell:i, piece:{...p}, body, limbs:[]};
    body.traverse(o=>{
      if(o.name.endsWith('_Promotion'))o.visible=p.p;
      if(/_(ArmL|ArmR|LegL|LegR|Cape)$/.test(o.name))obj.userData.limbs.push(o);
      if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material.name==='TeamCloth')o.material=cloth[p.s];}
      o.userData.cell=i;
    });
    const badge=label(p.p?symbols[p.t]||names[p.t]:names[p.t],p.p?'#ffe49a':p.s?'#ffc2b3':'#c9edff');
    badge.position.set(0,.27,.51);badge.visible=labels;obj.add(badge);obj.userData.badge=badge;
    const [x,z]=cellXZ(i);obj.position.set(x,h(x,z)+.025,z);scene.add(obj);return obj;
  }
  function draw(board) {
    for(const o of instances)o.removeFromParent();
    instances=[];board.forEach((p,i)=>{if(p)instances.push(makeUnit(p,i));});
    renderer.shadowMap.needsUpdate=true;
  }
  function position(i){const [x,z]=cellXZ(i);return new T.Vector3(x,h(x,z)+.025,z);}
  async function transition(before,after,m) {
    busy=true;
    const attacker=instances.find(o=>o.userData.cell===m.from), victim=instances.find(o=>o.userData.cell===m.to);
    const target=position(m.to),start=attacker?.position.clone();
    let arriving=attacker;
    if(m.drop){arriving=makeUnit(after.b[m.to],m.to);arriving.scale.setScalar(.01);instances.push(arriving);}
    if(!arriving){draw(after.b);busy=false;return;}
    const startTime=performance.now(),duration=reducedMotion?1: victim?850:m.drop?500:620;
    await new Promise(resolve=> {
      effects.push({start:startTime,duration,update:f=>{
        if(start){
          const u=Math.min(1,f/(victim?.68:1)),smooth=u*u*(3-2*u);
          arriving.position.lerpVectors(start,target,smooth);
          arriving.position.y=h(arriving.position.x,arriving.position.z)+.025+Math.sin(u*Math.PI)*.07;
          arriving.userData.walk=u<1;
          if(victim && f>.45)arriving.userData.attack=Math.sin((f-.45)/.55*Math.PI)*.8;
        } else arriving.scale.setScalar(Math.max(.01,Math.sin(f*Math.PI/2)));
        if(victim){const fall=Math.max(0,(f-.60)/.4);victim.rotation.z=fall*Math.PI/2;victim.scale.setScalar(1-fall*.92);}
        renderer.shadowMap.needsUpdate=true;
      },done:()=>{draw(after.b);busy=false;resolve();}});
    });
    if(m.promote && !reducedMotion) {
      const glow=patch(m.to,0xffd46c,.8);scene.add(glow);
      effects.push({start:performance.now(),duration:900,update:f=>{glow.material.opacity=.65*(1-f);},done:()=>{glow.removeFromParent();glow.material.dispose();}});
    }
  }
  let down=null,drag=false;
  const ray=new T.Raycaster();
  canvas.addEventListener('pointerdown',e=>{if(!e.isPrimary)return;canvas.focus();down={id:e.pointerId,x:e.clientX,y:e.clientY,angle,elevation};drag=false;canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!down||down.id!==e.pointerId)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;if(Math.abs(dx)+Math.abs(dy)>7)drag=true;if(drag){angle=down.angle-dx*.005;elevation=T.MathUtils.clamp(down.elevation+dy*.003,.63,1.49);}});
  canvas.addEventListener('pointerup',e=>{
    if(!down||down.id!==e.pointerId)return;
    if(!drag&&!busy){const r=canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),camera);
      const unitHit=ray.intersectObjects(instances,true).find(hit=>!hit.object.isSprite);
      const landHit=ray.intersectObject(ground)[0];
      const groundCell=landHit?cellAt(landHit.point.x,landHit.point.z):null;
      // A tall selected soldier can overlap the highlighted square behind it.
      // Keep that destination clickable instead of selecting the same soldier again.
      const i=availableTargets.has(groundCell)?groundCell:unitHit?.object.userData.cell??groundCell;
      if(i!=null){focusCell=i;onPick(i);}
    }down=null;
  });
  canvas.addEventListener('pointercancel',()=>down=null);
  canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=T.MathUtils.clamp(zoom+e.deltaY*.018,17,37);},{passive:false});
  canvas.addEventListener('keydown',e=>{
    let x=focusCell%9,z=Math.floor(focusCell/9);
    const deltas={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
    if(deltas[e.key]){e.preventDefault();const d=deltas[e.key];x=T.MathUtils.clamp(x+d[0],0,8);z=T.MathUtils.clamp(z+d[1],0,8);focusCell=z*9+x;cursor.geometry=patchCache.get(focusCell)||patch(focusCell,0xffffff).geometry;cursor.visible=true;canvas.setAttribute('aria-label',`${9-x}${'一二三四五六七八九'[z]}。Enterで選択・移動`);}
    if(e.key==='Enter'||e.key===' '){e.preventDefault();if(!busy)onPick(focusCell);}
  });
  canvas.addEventListener('blur',()=>cursor.visible=false);
  new ResizeObserver(()=>{const r=canvas.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}).observe(canvas.parentElement);
  function frame(t) {
    requestAnimationFrame(frame); if(document.hidden)return;
    const r=zoom*(camera.aspect<1?1.45:1),time=t*.001;
    camera.position.set(Math.sin(angle)*Math.cos(elevation)*r,Math.sin(elevation)*r,Math.cos(angle)*Math.cos(elevation)*r);camera.lookAt(0,.35,0);
    for(const o of instances){
      const u=o.userData;
      for(const limb of u.limbs){
        const phase=limb.name.endsWith('L')?0:Math.PI;
        limb.rotation.x=reducedMotion?0:u.walk?Math.sin(time*13+phase)*.30:limb.name.endsWith('Cape')?Math.sin(time*1.8+u.cell)*.07:Math.sin(time*1.8+u.cell+phase)*.012;
        if(limb.name.endsWith('ArmR'))limb.rotation.x-=u.attack||0;
      }
    }
    for(const fx of [...effects]){const f=Math.min(1,(t-fx.start)/fx.duration);fx.update(f);if(f===1){effects.splice(effects.indexOf(fx),1);fx.done();}}
    const a=performance.now();renderer.render(scene,camera);renderMs+=(performance.now()-a);frames++;
    lastTime=t;
  }
  requestAnimationFrame(frame);
  return {
    draw,highlight,transition,rotate:()=>angle+=Math.PI,top:()=>elevation=elevation>1.3?.93:1.49,
    labels:()=>{labels=!labels;for(const o of instances)o.userData.badge.visible=labels;return labels;},
    diagnostics:()=>({units:instances.length,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,averageRenderMs:frames?renderMs/frames:0,busy,lastTime}),
    projectCell:i=>{const p=position(i).project(camera),r=canvas.getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};},
    height:h
  };
}
