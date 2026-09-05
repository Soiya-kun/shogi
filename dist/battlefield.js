import * as T from './three.module.js';
import {GLTFLoader} from './vendor/loaders/GLTFLoader.js';
import {CELL_SIZE,HALF_FIELD,cellXZ,cellAt,terrainSampler} from './terrain.mjs';
import {names} from './rules.mjs';
import {SQUADS} from './formations.mjs';
import {createSquadRenderer} from './squad-renderer.js';
import {terrainMaterial} from './terrain-material.js';
const symbols={P:'と',L:'杏',N:'圭',S:'全',R:'龍',B:'馬'};
export async function createBattlefield(canvas,onPick) {
  const mobile=matchMedia('(max-width: 900px)').matches,reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.25:1.6));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
  const scene=new T.Scene();scene.background=new T.Color(0xb9cbd0);scene.fog=new T.Fog(0xb9cbd0,200,485);
  scene.add(new T.HemisphereLight(0xd9e9f6,0x72634d,1.65));
  const sun=new T.DirectionalLight(0xffe4bc,2.8);sun.position.set(-90,140,65);sun.castShadow=true;
  sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);
  Object.assign(sun.shadow.camera,{left:-88,right:88,top:88,bottom:-88,near:5,far:330});
  sun.shadow.bias=-.00015;sun.shadow.normalBias=.09;scene.add(sun);
  const camera=new T.PerspectiveCamera(42,1,.4,900),target=new T.Vector3(),aim=new T.Vector3();
  let angle=.10,elevation=.93,zoom=185,labels=true,busy=false,focusCell=76,selectedCell=null;
  let instances=[],effects=[],lastTime=0,renderMs=0,frames=0,availableTargets=new Set(),squadSequence=0;
  const loader=new GLTFLoader();
  const [field,army,landMaterial]=await Promise.all([loader.loadAsync('./assets/meadow.glb'),loader.loadAsync('./assets/army.glb'),terrainMaterial(renderer)]);
  scene.add(field.scene);field.scene.updateMatrixWorld(true);
  const ground=field.scene.getObjectByName('Terrain');if(!ground)throw new Error('GLBにTerrainがありません');
  ground.geometry=ground.geometry.clone().applyMatrix4(ground.matrixWorld);
  ground.removeFromParent();ground.position.set(0,0,0);ground.rotation.set(0,0,0);ground.scale.set(1,1,1);scene.add(ground);
  const pos=ground.geometry.attributes.position,uv=new Float32Array(pos.count*2);
  for(let i=0;i<pos.count;i++){uv[i*2]=pos.getX(i)/8;uv[i*2+1]=-pos.getZ(i)/8;}
  ground.geometry.setAttribute('uv',new T.BufferAttribute(uv,2));ground.material=landMaterial;ground.receiveShadow=true;
  const h=terrainSampler(pos.array,ground.geometry.index?.array);
  ground.geometry.computeBoundingBox();const groundBounds=ground.geometry.boundingBox;
  field.scene.traverse(o=>{if(o.isMesh){o.receiveShadow=true;o.castShadow=!['GrassAndFlowers','Terrain'].includes(o.name);}});
  const rocks=field.scene.getObjectByName('Rocks');
  if(rocks){const p=rocks.geometry.attributes.position,uv=new Float32Array(p.count*2),v=new T.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(rocks.matrixWorld);uv[i*2]=v.x/3;uv[i*2+1]=-v.z/3;}rocks.geometry.setAttribute('uv',new T.BufferAttribute(uv,2));rocks.material=landMaterial.userData.rockMaterial;}
  const armyView=createSquadRenderer(scene,army.scene,h,mobile,reducedMotion),labelMaterials=new Map();
  function label(text,color,count='') {
    const key=text+color+count;
    if(!labelMaterials.has(key)) {
      const c=document.createElement('canvas');c.width=128;c.height=160;
      const ctx=c.getContext('2d');ctx.fillStyle='#13241eef';ctx.beginPath();ctx.roundRect(10,6,108,146,10);ctx.fill();
      ctx.strokeStyle=color;ctx.lineWidth=3;ctx.stroke();ctx.fillStyle=color;ctx.font='bold 78px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,64,count?62:80);
      if(count){ctx.font='bold 27px sans-serif';ctx.fillText(count,64,126);}
      labelMaterials.set(key,new T.SpriteMaterial({map:new T.CanvasTexture(c),depthTest:true,transparent:true}));
    }
    const sprite=new T.Sprite(labelMaterials.get(key));sprite.scale.set(3.4,4.25,1);return sprite;
  }
  function line(points,color,opacity=1) {
    const geo=new T.BufferGeometry().setFromPoints(points.map(([x,z])=>new T.Vector3(x,h(x,z)+.10,z)));
    scene.add(new T.Line(geo,new T.LineBasicMaterial({color,transparent:true,opacity})));
  }
  for(let k=0;k<=9;k++)for(let direction=0;direction<2;direction++){
    const p=-HALF_FIELD+k*CELL_SIZE;
    line(Array.from({length:217},(_,j)=>{const t=-HALF_FIELD+j*.5;return direction?[t,p]:[p,t];}),k===0||k===9?0xe8d6a4:0xc4c2a0,k===0||k===9?.75:.34);
  }
  for(let i=0;i<9;i++){
    const x=(i-4)*CELL_SIZE;
    for(const [xx,zz,txt] of [[x,HALF_FIELD+4,String(9-i)],[-HALF_FIELD-4,x,'一二三四五六七八九'[i]]]){
      const tag=label(txt,'#e9ddbc');tag.scale.set(2.4,3,1);tag.position.set(xx,h(xx,zz)+1,zz);scene.add(tag);
    }
  }
  const indicators=new T.Group();scene.add(indicators);const patchCache=new Map();
  function patchGeometry(i) {
    if(!patchCache.has(i)){
      const [x,z]=cellXZ(i),geo=new T.PlaneGeometry(CELL_SIZE*.94,CELL_SIZE*.94,12,12);geo.rotateX(-Math.PI/2);const p=geo.attributes.position;
      for(let j=0;j<p.count;j++){const xx=p.getX(j)+x,zz=p.getZ(j)+z;p.setXYZ(j,xx,h(xx,zz)+.13,zz);}geo.computeVertexNormals();patchCache.set(i,geo);
    }return patchCache.get(i);
  }
  function patch(i,color,opacity=.3){return new T.Mesh(patchGeometry(i),new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:T.DoubleSide}));}
  const cursor=patch(focusCell,0xfff2b7,.32);cursor.visible=false;scene.add(cursor);
  function highlight(selected,moves,board,lastMove) {
    availableTargets=new Set(moves.map(m=>m.to));
    selectedCell=selected?.from??null;for(const c of indicators.children)c.material.dispose();indicators.clear();
    if(lastMove)for(const i of [lastMove.from,lastMove.to].filter(v=>v!==undefined))indicators.add(patch(i,0xe9c772,.12));
    if(selectedCell!==null)indicators.add(patch(selectedCell,0xffe3a0,.38));
    for(const i of new Set(moves.map(m=>m.to)))indicators.add(patch(i,board[i]?0xff685c:0x65d8ff,.40));
  }
  const poleGeometry=new T.CylinderGeometry(.055,.075,4.2,6),poleMaterial=new T.MeshStandardMaterial({color:0x6a5140,roughness:.8});
  // Vertical nobori with an original three-disc mon, matching the soldiers' sashimono.
  function noboriMaterial(color,promoted=false){
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=256;const ctx=canvas.getContext('2d');
    ctx.fillStyle=color;ctx.fillRect(0,0,128,256);ctx.fillStyle=promoted?'#49321b':'#f2e4c5';
    for(const angle of [-Math.PI/2,Math.PI/6,Math.PI*5/6]){ctx.beginPath();ctx.arc(64+Math.cos(angle)*19,72+Math.sin(angle)*19,12,0,Math.PI*2);ctx.fill();}
    ctx.fillRect(59,130,10,80);
    const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
    return new T.MeshStandardMaterial({map,side:T.DoubleSide,roughness:.9});
  }
  const flagGeometry=new T.PlaneGeometry(1.15,2.4,2,6),flagMaterials=['#225994','#b32b27'].map(color=>noboriMaterial(color));
  const promotedFlag=noboriMaterial('#dcb35d',true),crossbarGeometry=new T.CylinderGeometry(.04,.04,1.3,6);
  function makeSquad(piece,cell) {
    const [x,z]=cellXZ(cell),banner=new T.Group(),pole=new T.Mesh(poleGeometry,poleMaterial);pole.position.y=2.1;banner.add(pole);
    const flag=new T.Mesh(flagGeometry,piece.p?promotedFlag:flagMaterials[piece.s]);flag.position.set(.575,2.75,0);banner.add(flag);
    const crossbar=new T.Mesh(crossbarGeometry,poleMaterial);crossbar.rotation.z=Math.PI/2;crossbar.position.set(.58,3.99,0);banner.add(crossbar);
    const badge=label(piece.p?symbols[piece.t]||names[piece.t]:names[piece.t],piece.p?'#ffe49a':piece.s?'#ffc2b3':'#c9edff',String(SQUADS[piece.t].count));
    badge.position.set(0,5.3,0);badge.visible=labels;banner.add(badge);scene.add(banner);
    for(const child of banner.children)child.userData.cell=cell;
    return {id:++squadSequence,cell,piece:{...piece},x,z,banner,badge,flag,heading:piece.s?Math.PI:0,progress:0};
  }
  function draw(board) {
    for(const fx of effects){if(fx.cancel)fx.cancel();else fx.done();}effects=[];busy=false;
    for(const s of instances)s.banner.removeFromParent();instances=[];board.forEach((p,i)=>{if(p)instances.push(makeSquad(p,i));});
    armyView.setSquads(instances);renderer.shadowMap.needsUpdate=true;
  }
  function position(i){const [x,z]=cellXZ(i);return new T.Vector3(x,h(x,z)+.025,z);}
  function finishEffect(fx){
    const index=effects.indexOf(fx);if(index<0)return;
    effects.splice(index,1);fx.update(1);fx.done();
  }
  async function transition(before,after,m,event) {
    let arriving=instances.find(s=>!s.ghost&&s.cell===m.from);
    const victim=instances.find(s=>!s.ghost&&s.cell===m.to),destination=position(m.to);
    // Shorten only conflicting presentations. Independent squads continue in parallel.
    if(arriving?.motion)finishEffect(arriving.motion);
    if(victim?.motion)finishEffect(victim.motion);
    const start=arriving?{x:arriving.x,z:arriving.z}:null;
    if(m.drop){arriving=makeSquad(after.b[m.to],m.to);arriving.scale=.01;instances.push(arriving);armyView.setSquads(instances);}
    if(!arriving){draw(after.b);return;}
    arriving.cell=m.to;for(const child of arriving.banner.children)child.userData.cell=m.to;
    if(victim){victim.ghost=true;victim.cell=-1;victim.badge.visible=false;for(const child of victim.banner.children)child.userData.cell=-1;}
    busy=true;
    const duration=reducedMotion?1:victim?1450:m.drop?700:1150;
    const heading=start?Math.atan2(-(destination.x-start.x),-(destination.z-start.z)):arriving.heading,originalHeading=arriving.heading;
    // atan2 can return -PI for the same facing stored as +PI. Settle via the shortest arc.
    const settledHeading=heading+Math.atan2(Math.sin(originalHeading-heading),Math.cos(originalHeading-heading));
    await new Promise(resolve=>{
      const fx={event,squadId:arriving.id,start:performance.now(),duration,update:f=>{
      arriving.progress=f;
      if(start){
        const u=Math.min(1,f/(victim ? .80 : .85)),smooth=u*u*(3-2*u);
        arriving.x=T.MathUtils.lerp(start.x,destination.x,smooth);arriving.z=T.MathUtils.lerp(start.z,destination.z,smooth);
        arriving.moving=u<1;arriving.heading=f<.85?heading:T.MathUtils.lerp(heading,settledHeading,(f-.85)/.15);
        arriving.attack=victim?Math.sin(Math.max(0,(f-.50)/.5)*Math.PI)*.95:0;
      }else arriving.scale=Math.max(.01,Math.sin(f*Math.PI/2));
      if(victim){const retreat=Math.max(0,(f-.48)/.52);victim.retreat=retreat;victim.z=destination.z+(victim.piece.s?-1:1)*retreat*7;victim.scale=1-retreat;}
      armyView.setSquads(instances);renderer.shadowMap.needsUpdate=true;
      },done:()=>{
        if(arriving.motion===fx){
          arriving.motion=null;arriving.x=destination.x;arriving.z=destination.z;arriving.moving=false;arriving.attack=0;arriving.scale=1;arriving.heading=originalHeading;
          arriving.piece={...after.b[m.to]};
          if(m.promote){
            arriving.flag.material=promotedFlag;arriving.badge.material=label(symbols[arriving.piece.t]||names[arriving.piece.t],'#ffe49a',String(SQUADS[arriving.piece.t].count)).material;
            if(!reducedMotion){const glow=patch(m.to,0xffd46c,.8);scene.add(glow);effects.push({start:performance.now(),duration:900,update:f=>glow.material.opacity=.65*(1-f),done:()=>{glow.removeFromParent();glow.material.dispose();}});}
          }
        }
        if(victim){victim.banner.removeFromParent();instances=instances.filter(s=>s!==victim);}
        armyView.setSquads(instances);busy=instances.some(s=>s.motion);renderer.shadowMap.needsUpdate=true;resolve();
      },cancel:()=>{arriving.motion=null;resolve();}};
      arriving.motion=fx;effects.push(fx);
      // Bound transient squads, even under very fast playback or repeated captures.
      while(effects.filter(e=>e.squadId).length>8)finishEffect(effects.find(e=>e.squadId));
      while(effects.length>16)finishEffect(effects.find(e=>!e.squadId));
    });
  }
  const pointers=new Map();let down=null,drag=false,pinch=null;const ray=new T.Raycaster();
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',e=>{
    if(e.button!==0&&e.button!==2)return;
    canvas.focus();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);
    if(pointers.size===1){
      down={id:e.pointerId,button:e.button,x:e.clientX,y:e.clientY,angle,elevation};drag=false;
      if(e.button===2){e.preventDefault();aim.copy(target);updateCamera();down.pan=panAnchor(e.clientX,e.clientY);canvas.classList.add('panning');}
    }
    else{const [a,b]=[...pointers.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom,anchor:zoomAnchor((a.x+b.x)/2,(a.y+b.y)/2)};drag=true;}
  });
  function focusPosition(i){
    const p=position(i),piece=instances.find(s=>s.cell===i)?.piece,type=piece?.t;
    // At close range, frame the soldiers or airborne dragons above their cell.
    const detail=1-T.MathUtils.smoothstep(zoom,12,42);
    p.y+=detail*(type==='R'&&piece.p?SQUADS.R.flightHeight+1.4:['N','R'].includes(type)?1.4:1);
    return p;
  }
  function cameraFloor(p){
    // Cursor navigation can reach the landscape edge; there is no surface outside it.
    return p.x>groundBounds.min.x&&p.x<groundBounds.max.x&&p.z>groundBounds.min.z&&p.z<groundBounds.max.z?h(p.x,p.z)+.8:-Infinity;
  }
  function updateCamera(){
    const r=zoom*(camera.aspect<1?1.50:1);
    camera.position.set(target.x+Math.sin(angle)*Math.cos(elevation)*r,target.y+Math.sin(elevation)*r,target.z+Math.cos(angle)*Math.cos(elevation)*r);
    // Lift the view together, keeping its orientation stable near hills.
    const lift=Math.max(0,cameraFloor(camera.position)-camera.position.y);
    if(lift){target.y+=lift;aim.y+=lift;camera.position.y+=lift;}
    camera.lookAt(target);camera.updateMatrixWorld(true);
  }
  function pointerRay(x,y){
    const r=canvas.getBoundingClientRect();
    ray.setFromCamera(new T.Vector2((x-r.left)/r.width*2-1,1-(y-r.top)/r.height*2),camera);
    return ray;
  }
  function zoomAnchor(x,y){
    pointerRay(x,y);
    const terrain=ray.intersectObject(ground)[0],unit=armyView.pickSurface(ray);
    const hit=unit&&(!terrain||unit.distance<terrain.distance)?unit:terrain;
    if(hit)return hit.point.clone();
    // Sky has no depth: use the view plane through the current orbit target.
    return ray.ray.intersectPlane(new T.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new T.Vector3()),target),new T.Vector3())??target.clone();
  }
  function panAnchor(x,y){
    const anchor=zoomAnchor(x,y);
    return {anchor,plane:new T.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new T.Vector3()),anchor)};
  }
  function panView(x,y){
    const {anchor,plane}=down.pan,point=pointerRay(x,y).ray.intersectPlane(plane,new T.Vector3());
    if(!point)return;
    const shift=anchor.clone().sub(point),proposed=camera.position.clone().add(shift);
    let fraction=1;
    if(proposed.y<cameraFloor(proposed)){
      let safe=0,blocked=1;
      for(let i=0;i<18;i++){const t=(safe+blocked)/2,p=camera.position.clone().addScaledVector(shift,t);if(p.y>=cameraFloor(p))safe=t;else blocked=t;}
      fraction=safe;
    }
    // Translate the view and its target together; keep the grabbed point under the cursor.
    target.addScaledVector(shift,fraction);aim.copy(target);updateCamera();
  }
  function setZoom(value,x,y,anchor){
    const next=T.MathUtils.clamp(value,8,240),ratio=next/zoom;
    if(next===zoom&&!anchor)return;
    anchor??=zoomAnchor(x,y);
    pointerRay(x,y);
    const forward=camera.getWorldDirection(new T.Vector3()),offset=camera.position.clone().sub(target);
    // Preserve the anchor's screen position and depth ratio, also when a pinch midpoint moves.
    const depth=anchor.clone().sub(camera.position).dot(forward);
    const proposed=anchor.clone().addScaledVector(ray.ray.direction,-depth*ratio/ray.ray.direction.dot(forward));
    let fraction=1;
    if(proposed.y<cameraFloor(proposed)){
      // Stop along the dolly path before entering terrain, rather than displacing the anchor.
      let safe=0,blocked=1;
      for(let i=0;i<18;i++){const t=(safe+blocked)/2,p=camera.position.clone().lerp(proposed,t);if(p.y>=cameraFloor(p))safe=t;else blocked=t;}
      fraction=safe;
    }
    const applied=T.MathUtils.lerp(1,ratio,fraction);
    target.copy(camera.position.clone().lerp(proposed,fraction).addScaledVector(offset,-applied));
    aim.copy(target);zoom=T.MathUtils.clamp(zoom*applied,8,240);updateCamera();
  }
  canvas.addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size>1&&pinch){const [a,b]=[...pointers.values()];setZoom(pinch.zoom*pinch.distance/Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),(a.x+b.x)/2,(a.y+b.y)/2,pinch.anchor);return;}
    if(!down||down.id!==e.pointerId)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;
    if(Math.abs(dx)+Math.abs(dy)>7)drag=true;
    if(drag){if(down.pan)panView(e.clientX,e.clientY);else{angle=down.angle-dx*.005;elevation=T.MathUtils.clamp(down.elevation+dy*.003,.28,1.49);}}
  });
  function releasePointer(e){pointers.delete(e.pointerId);down=null;if(pointers.size<2)pinch=null;canvas.classList.remove('panning');}
  canvas.addEventListener('pointerup',e=>{
    if(down?.id===e.pointerId&&down.button===0&&e.button===0&&!drag){
      const r=canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),camera);
      // The full cell is the squad hit area, including gaps between members.
      const hit=ray.intersectObject(ground)[0],groundCell=hit?cellAt(hit.point.x,hit.point.z):null;
      const marker=ray.intersectObjects(instances.filter(s=>!s.ghost).flatMap(s=>s.banner.children.filter(c=>c.visible)),false)[0];
      const flying=armyView.pickFlying(ray);
      // A label can cover a legal destination; movement keeps priority there.
      const unitCell=flying&&(!marker||flying.distance<marker.distance)?flying.cell:marker?.object.userData.cell;
      const i=availableTargets.has(groundCell)?groundCell:unitCell??groundCell;
      if(i!==null&&i>=0){focusCell=i;onPick(i);}
    }releasePointer(e);
  });
  canvas.addEventListener('pointercancel',releasePointer);
  canvas.addEventListener('lostpointercapture',releasePointer);
  addEventListener('blur',()=>{pointers.clear();down=null;pinch=null;canvas.classList.remove('panning');});
  canvas.addEventListener('wheel',e=>{
    e.preventDefault();const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?canvas.clientHeight:1);
    setZoom(zoom*Math.exp(T.MathUtils.clamp(delta*.0012,-1,1)),e.clientX,e.clientY);
    if(down?.pan)down.pan=panAnchor(e.clientX,e.clientY);
  },{passive:false});
  canvas.addEventListener('keydown',e=>{
    let x=focusCell%9,z=Math.floor(focusCell/9);const deltas={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
    if(deltas[e.key]){e.preventDefault();const d=deltas[e.key];x=T.MathUtils.clamp(x+d[0],0,8);z=T.MathUtils.clamp(z+d[1],0,8);focusCell=z*9+x;cursor.geometry=patchGeometry(focusCell);cursor.visible=true;canvas.setAttribute('aria-label',`${9-x}${'一二三四五六七八九'[z]}。Enterで部隊を選択・移動`);if(zoom<150)aim.copy(focusPosition(focusCell));}
    if(e.key==='Enter'||e.key===' '){e.preventDefault();onPick(focusCell);}
  });
  canvas.addEventListener('blur',()=>cursor.visible=false);
  new ResizeObserver(()=>{const r=canvas.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}).observe(canvas.parentElement);
  function frame(t) {
    requestAnimationFrame(frame);if(document.hidden)return;const dt=Math.min((t-lastTime)/1000,.1),time=t*.001;
    scene.fog.near=200*(camera.aspect<1?1.5:1);scene.fog.far=485*(camera.aspect<1?1.5:1);
    target.lerp(aim,reducedMotion?1:1-Math.exp(-dt*7));updateCamera();
    for(const fx of [...effects]){if(!effects.includes(fx))continue;const f=Math.min(1,(t-fx.start)/fx.duration);fx.update(f);if(f===1){effects.splice(effects.indexOf(fx),1);fx.done();}}
    const changed=armyView.update(time,camera,busy);
    for(const s of instances){const flagX=s.x+(SQUADS[s.piece.t].bannerOffsetX??0);s.banner.position.set(flagX,h(flagX,s.z+3.6),s.z+3.6);s.banner.scale.setScalar(s.scale??1);s.flag.rotation.y=reducedMotion?0:Math.sin(time*2+s.cell)*.10;const badgeScale=(mobile?1.5:1)*Math.min(1,camera.position.distanceTo(s.banner.position)/140);s.badge.scale.set(3.4*badgeScale,4.25*badgeScale,1);}
    if(changed&&frames%3===0)renderer.shadowMap.needsUpdate=true;
    const a=performance.now();renderer.render(scene,camera);renderMs+=performance.now()-a;frames++;lastTime=t;
  }
  requestAnimationFrame(frame);
  return {draw,highlight,transition,rotate:()=>angle+=Math.PI,top:()=>elevation=elevation>1.3?.93:1.49,
    close:()=>{aim.copy(position(selectedCell??focusCell));zoom=48;elevation=.36;},overview:()=>{zoom=185;elevation=.93;aim.set(0,0,0);},
    labels:()=>{labels=!labels;for(const s of instances)s.badge.visible=labels&&!s.ghost;return labels;},
    diagnostics:()=>({units:instances.filter(s=>!s.ghost).length,ghosts:instances.filter(s=>s.ghost).length,activeMotions:instances.filter(s=>s.motion).length,...armyView.stats(),fieldWidth:CELL_SIZE*9,quality:mobile?'compact':'full',zoom,cameraPosition:camera.position.toArray(),cameraTarget:target.toArray(),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,averageRenderMs:frames?renderMs/frames:0,busy,lastTime}),
    contacts:armyView.contacts,zoomAnchor:(x,y)=>zoomAnchor(x,y).toArray(),projectPoint:point=>{const p=new T.Vector3(...point).project(camera),r=canvas.getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};},projectCell:i=>{const p=position(i).project(camera),r=canvas.getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};},
    projectFlying:i=>{const member=armyView.contacts().find(p=>p.cell===i&&p.airborne),p=new T.Vector3(member.x,member.y+1.1,member.z).project(camera),r=canvas.getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};},
    projectBanner:i=>{const s=instances.find(s=>s.cell===i),p=s.badge.getWorldPosition(new T.Vector3()).project(camera),r=canvas.getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};},height:h};
}
