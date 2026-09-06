import * as T from './three.module.js';
import {mergeGeometries} from './vendor/utils/BufferGeometryUtils.js';
// One person (or one rider) per logical piece. Four render units equal one metre.
export function createStreetRenderer(scene,models,h){
 const batches=new Map(),allBatches=[],root=new T.Object3D();let squads=[];
 for(const [type,model] of Object.entries(models)){
  model.updateMatrixWorld(true);const groups=new Map();
  model.traverse(o=>{if(!o.isMesh)return;let g=o.geometry.clone().applyMatrix4(o.matrixWorld);if(g.index){const flat=g.toNonIndexed();g.dispose();g=flat;}g.scale(4,4,4);
   const colors=new Float32Array(g.attributes.position.count*3),c=o.material.color??new T.Color(1,1,1);
   for(let i=0;i<colors.length;i+=3){colors[i]=c.r;colors[i+1]=c.g;colors[i+2]=c.b;}
   for(const a of Object.keys(g.attributes))if(!['position','normal'].includes(a))g.deleteAttribute(a);
   g.setAttribute('color',new T.BufferAttribute(colors,3));
   if(!groups.has(o.material))groups.set(o.material,[]);groups.get(o.material).push(g);
  });
  const parts=[];
  for(const [source,geometries] of groups){
   const material=source.clone();material.color.set(0xffffff);material.vertexColors=true;
   const mesh=new T.InstancedMesh(mergeGeometries(geometries),material,64);geometries.forEach(g=>g.dispose());mesh.count=0;mesh.frustumCulled=false;mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.cells=[];scene.add(mesh);parts.push(mesh);allBatches.push(mesh);
  }
  batches.set(type,parts);
 }
 function update(time){
  for(const b of allBatches){b.count=0;b.visible=false;}
  for(const s of squads){
   const parts=batches.get(s.piece.t),progress=s.defeat?.progress??0,fall=Math.max(0,Math.min(1,(progress-.5)/.25));
   const lunge=s.combat?Math.sin(Math.max(0,s.combat.progress-.23)*Math.PI*8)*.5:0;
   const heading=s.heading??(s.piece.s?Math.PI:0),x=s.x-Math.sin(heading)*lunge,z=s.z-Math.cos(heading)*lunge,y=h(x,z)+.025;
   root.position.set(x,y,z);root.rotation.set(0,heading,fall*1.45);root.scale.setScalar((s.scale??1)*(1-fall*.85));root.updateMatrix();
   for(const mesh of parts){mesh.setMatrixAt(mesh.count,root.matrix);mesh.userData.cells[mesh.count++]=s.ghost?-1:s.cell;mesh.visible=true;}
   s.banner.position.set(x+2,y+7*(1-fall),z);s.banner.rotation.set(0,0,0);s.banner.scale.setScalar(s.scale??1);
   // Keep the shogi title visible; military standards do not belong to this theme.
   for(const c of s.banner.children)if(c!==s.badge)c.visible=false;
   s.badge.position.set(0,1,0);s.carrierIndex=0;s.members=[{x:0,z:0,type:s.piece.t}];
   s.contacts=[{x,y,z,ground:h(x,z),model:s.piece.t,airborne:false,unitId:s.id,generation:s.generation,ghost:!!s.ghost,side:s.piece.s,fall}];
  }
  for(const b of allBatches)if(b.count)b.instanceMatrix.needsUpdate=true;return true;
 }
 function pickSurface(ray){const active=allBatches.filter(b=>b.count);for(const b of active)b.computeBoundingSphere();const hit=ray.intersectObjects(active,false)[0];return hit?{point:hit.point,distance:hit.distance}:null;}
 return {setSquads:value=>squads=value,update,pickSurface,pickFlying:()=>null,contacts:()=>squads.flatMap(s=>(s.contacts??[]).map(p=>({...p,cell:s.cell}))),stats:()=>({soldiers:squads.length,representedSoldiers:squads.length,flyingRiders:0,detailedSquads:0,instanceBatches:allBatches.filter(b=>b.count).length})};
}
