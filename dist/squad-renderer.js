import * as T from './three.module.js';
import {mergeGeometries} from './vendor/utils/BufferGeometryUtils.js';
import {formation,SQUADS} from './formations.mjs';

// Merge each model part once, then share its geometry across every member.
// No per-soldier Object3D hierarchy is placed in the scene.
export function createSquadRenderer(scene, army, h, mobile, reducedMotion) {
  army.updateMatrixWorld(true);
  const compiled=new Map(), batches=new Map(), unit=new T.Object3D();
  const material=new T.MeshStandardMaterial({vertexColors:true,roughness:.67,metalness:.32,side:T.DoubleSide});
  const uniformScale=1.25;
  let squads=[], detailed=0, represented=0, dirty=true, previousNear='';
  function compile(type,side,promoted,near) {
    const key=[type,side,+promoted,+near].join(':');
    if(compiled.has(key))return compiled.get(key);
    const root=army.getObjectByName((near?'Unit_':'LOD_')+type);
    if(!root)throw new Error('GLB template missing: '+key);
    const pieces=new Map();
    root.traverse(o=>{
      if(!o.isMesh)return;
      let branch=o,part='Body',pivot=new T.Vector3(),promotion=false;
      while(branch&&branch!==root){
        if(branch.name.endsWith('_Promotion'))promotion=true;
        if((near&&/_(ArmL|ArmR|LegL|LegR|Cape|ForelegL|ForelegR|HindlegL|HindlegR)$/.test(branch.name))||/_(WingL|WingR|Tail)$/.test(branch.name)){
          part=branch.name.split('_').at(-1);pivot.setFromMatrixPosition(branch.matrixWorld);
        }
        branch=branch.parent;
      }
      if(promotion&&!promoted)return;
      let geo=o.geometry.clone().applyMatrix4(o.matrixWorld);
      if(geo.index){const flat=geo.toNonIndexed();geo.dispose();geo=flat;}
      geo.translate(-pivot.x,-pivot.y,-pivot.z);geo.scale(uniformScale,uniformScale,uniformScale);
      const color=new Float32Array(geo.attributes.position.count*3),old=geo.attributes.color;
      const tint=o.material.name==='TeamCloth'?new T.Color(side?0xb32b27:0x225994):o.material.color;
      for(let i=0;i<color.length/3;i++){
        color[i*3]=(old?.getX(i)??1)*tint.r;
        color[i*3+1]=(old?.getY(i)??1)*tint.g;
        color[i*3+2]=(old?.getZ(i)??1)*tint.b;
      }
      for(const attr of Object.keys(geo.attributes))if(!['position','normal'].includes(attr))geo.deleteAttribute(attr);
      geo.setAttribute('color',new T.BufferAttribute(color,3));
      if(!pieces.has(part))pieces.set(part,{geometries:[],pivot:pivot.multiplyScalar(uniformScale)});
      pieces.get(part).geometries.push(geo);
    });
    const result=[];
    for(const [part,{geometries,pivot}] of pieces){
      const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());
      result.push({key:key+':'+part,geometry,part,pivot});
    }
    compiled.set(key,result);return result;
  }
  function batch(spec) {
    if(!batches.has(spec.key)) {
      // A legal position can hold all 18 pawns on one side: 216 members.
      const mesh=new T.InstancedMesh(spec.geometry,material,256);
      mesh.userData={flying:spec.key.startsWith('R:'),cells:[]};
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.count=0;
      mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;
      scene.add(mesh);batches.set(spec.key,mesh);
    }
    return batches.get(spec.key);
  }
  function setSquads(value){squads=value;dirty=true;}
  function update(time,camera,force=false) {
    // Hysteresis prevents flicker when a squad lies on the detail boundary.
    for(const s of squads){const d=camera.position.distanceTo(new T.Vector3(s.x,h(s.x,s.z),s.z));s.near=d<(s.near?98:88);}
    const nearKey=squads.map(s=>+s.near).join('');
    const animate=!reducedMotion&&squads.some(s=>s.near||s.moving||s.retreat||s.piece.t==='R');
    if(!dirty&&!force&&!animate&&nearKey===previousNear)return false;
    previousNear=nearKey;dirty=false;detailed=0;represented=0;
    for(const b of batches.values()){b.count=0;b.visible=false;}
    for(const s of squads){
      const heading=s.heading??(s.piece.s?Math.PI:0),cos=Math.cos(heading),sin=Math.sin(heading);
      if(s.near)detailed++;
      s.members??=formation(s.piece.t,mobile);
      for(let j=0;j<s.members.length;j++){
        const m=s.members[j],phase=time*10+j*1.3;
        // Followers start in sequence, then close ranks on arrival.
        const lag=s.moving?Math.sin(Math.PI*s.progress)*j*.14:0;
        const mx=m.x+(s.moving?Math.sin(phase)*.035:0),mz=m.z+lag;
        const x=s.x+mx*cos+mz*sin,z=s.z-mx*sin+mz*cos;
        const flying=m.type==='R';
        const lift=flying?SQUADS.R.flightHeight+(m.altitudeOffset??0)+(reducedMotion?0:Math.sin(time*2.4+j*.9)*.16+(s.moving?Math.sin(Math.PI*s.progress)*.6:0)):s.moving?Math.abs(Math.sin(phase))*.065:0;
        const y=h(x,z)+.025+lift;
        s.contacts??=[];s.contacts[j]={x,y:flying?y:y-lift,z,airborne:flying,model:m.type};
        for(const spec of compile(m.type,s.piece.s,s.piece.p,s.near)){
          const mesh=batch(spec),p=spec.pivot;
          const size=s.scale??1;
          unit.position.set(x+(p.x*cos+p.z*sin)*size,y+p.y*size,z+(-p.x*sin+p.z*cos)*size);
          unit.rotation.set(0,heading,0);
          let swing=0,wing=0,tail=0;
          if((s.near||flying)&&!reducedMotion){
            const sign=spec.part.endsWith('L')?1:-1;
            if(spec.part==='Cape')swing=Math.sin(time*2+j)*.08;
            else if(spec.part.startsWith('Wing'))wing=(Math.sin(time*(s.moving?7:5)+j*.9)*.62-.12)*sign;
            else if(spec.part==='Tail')tail=Math.sin(time*2+j)*.09;
            else if((m.type==='R'||m.type==='N')&&spec.part.startsWith('Leg'))swing=0;
            else if(/^(Foreleg|Hindleg)/.test(spec.part))swing=spec.part.startsWith('Fore')?.55:-.55;
            else if(spec.part!=='Body')swing=s.moving?Math.sin(phase)*.27*sign:Math.sin(time*1.8+j)*.015;
            if(spec.part==='ArmR')swing-=s.attack||0;
          }
          unit.rotateX(swing);unit.rotateZ(wing);unit.rotateY(tail);unit.scale.setScalar(s.scale??1);unit.updateMatrix();
          mesh.userData.cells[mesh.count]=s.cell;mesh.setMatrixAt(mesh.count++,unit.matrix);mesh.visible=true;
        }
        represented++;
      }
    }
    for(const b of batches.values())if(b.count)b.instanceMatrix.needsUpdate=true;
    return true;
  }
  function pickFlying(ray){
    const meshes=[...batches.values()].filter(b=>b.visible&&b.count&&b.userData.flying);
    // Instance bounds change during flight; refresh them only when picking.
    for(const mesh of meshes)mesh.computeBoundingSphere();
    const hit=ray.intersectObjects(meshes,false)[0];
    return hit?{cell:hit.object.userData.cells[hit.instanceId],distance:hit.distance}:null;
  }
  function pickSurface(ray){
    const meshes=[...batches.values()].filter(b=>b.visible&&b.count);
    for(const mesh of meshes)mesh.computeBoundingSphere();
    const hit=ray.intersectObjects(meshes,false)[0];
    return hit?{point:hit.point,distance:hit.distance}:null;
  }
  return {setSquads,update,pickFlying,pickSurface,stats:()=>({soldiers:squads.reduce((n,s)=>n+SQUADS[s.piece.t].count,0),representedSoldiers:represented,flyingRiders:squads.filter(s=>s.piece.t==='R').reduce((n,s)=>n+(s.members?.length??0),0),detailedSquads:detailed,instanceBatches:[...batches.values()].filter(b=>b.visible).length}),
    contacts:()=>squads.flatMap(s=>(s.contacts||[]).map(p=>({...p,cell:s.cell,ground:h(p.x,p.z)})))};
}
