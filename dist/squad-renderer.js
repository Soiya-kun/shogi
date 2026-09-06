import * as T from './three.module.js';
import {mergeGeometries} from './vendor/utils/BufferGeometryUtils.js';
import {formation,SQUADS} from './formations.mjs';
import {attackPose,defeatPose} from './combat-motion.mjs';

// Merge each model part once, then share its geometry across every member.
// No per-soldier Object3D hierarchy is placed in the scene.
export function createSquadRenderer(scene, army, h, mobile, reducedMotion) {
  army.updateMatrixWorld(true);
  const compiled=new Map(), batches=new Map(), grips=new Map(),unit=new T.Object3D(),memberRoot=new T.Object3D(),matrix=new T.Matrix4(),flagMatrix=new T.Matrix4(),flagOffset=new T.Matrix4(),handPoint=new T.Vector3();
  const material=new T.MeshStandardMaterial({vertexColors:true,roughness:.67,metalness:.32,side:T.DoubleSide});
  const uniformScale=1.25;
  let squads=[], detailed=0, represented=0, dirty=true, previousNear='';
  function compile(type,side,promoted,near,articulated=near,bearer=false) {
    const key=[type,side,+promoted,+near,+articulated,+bearer].join(':');
    if(compiled.has(key))return compiled.get(key);
    const root=army.getObjectByName((near||(type==='P'&&bearer)?'Unit_':'LOD_')+type);
    if(!root)throw new Error('GLB template missing: '+key);
    const pieces=new Map();
    root.traverse(o=>{
      if(!o.isMesh)return;
      // The selected existing soldier carries the standard instead of a right-hand weapon.
      if(bearer&&(/_(Yari|Tachi|Gunbai|Ofuda|Arrow)$/.test(o.name)||(type==='P'&&o.name.startsWith('P_Yari'))))return;
      let branch=o,part='Body',pivot=new T.Vector3(),promotion=false;
      while(branch&&branch!==root){
        if(branch.name.endsWith('_Promotion'))promotion=true;
        if((articulated&&/_(ArmL|ArmR|LegL|LegR|Cape|ForelegL|ForelegR|HindlegL|HindlegR)$/.test(branch.name))||/_(WingL|WingR|Tail)$/.test(branch.name)){
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
      const group=type==='P'?`${part}:${o.material.name}`:part;
      if(!pieces.has(group))pieces.set(group,{geometries:[],part,sourceMaterial:type==='P'?o.material:null,pivot:pivot.multiplyScalar(uniformScale)});
      pieces.get(group).geometries.push(geo);
    });
    const result=[];
    for(const [group,{geometries,pivot,part,sourceMaterial}] of pieces){
      const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());
      let partMaterial=material;
      if(sourceMaterial){partMaterial=sourceMaterial.clone();partMaterial.color.set(0xffffff);partMaterial.vertexColors=true;partMaterial.side=T.DoubleSide;}
      result.push({key:key+':'+group,geometry,part,pivot,material:partMaterial});
    }
    compiled.set(key,result);return result;
  }
  function batch(spec) {
    if(!batches.has(spec.key)) {
      // A legal position can hold all 18 pawns on one side: 216 members.
      // Up to eight transient captured squads may coexist with the logical position.
      const mesh=new T.InstancedMesh(spec.geometry,spec.material,384);
      mesh.userData={flying:spec.key.startsWith('D:'),cells:[]};
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
    const animate=!reducedMotion&&squads.some(s=>s.near||s.moving||s.retreat||(s.piece.t==='R'&&s.piece.p));
    if(!dirty&&!force&&!animate&&nearKey===previousNear)return false;
    previousNear=nearKey;dirty=false;detailed=0;represented=0;
    for(const b of batches.values()){b.count=0;b.visible=false;}
    for(const s of squads){
      const heading=s.heading??(s.piece.s?Math.PI:0),cos=Math.cos(heading),sin=Math.sin(heading);
      if(s.near)detailed++;
      const piece=s.renderPiece??s.piece,memberKey=piece.t+Number(piece.p),articulated=s.near||!!s.combat||!!s.defeat;
      if(s.memberKey!==memberKey){s.members=s.reserveMembers??formation(piece.t,mobile,piece.p);s.memberKey=memberKey;s.contacts=[];s.carrierIndex=s.members.reduce((best,m,i)=>m.z-Math.abs(m.x)*.1>s.members[best].z-Math.abs(s.members[best].x)*.1?i:best,0);}
      for(let j=0;j<s.members.length;j++){
        const m=s.members[j],phase=time*10+j*1.3,bearer=j===s.carrierIndex;
        const pose=s.combat?attackPose(s.combat.style,m,j,s.combat.progress):null;
        const fallen=s.defeat?defeatPose(m,j,s.defeat.progress,s.defeat.impact):null;
        // Followers start in sequence, then close ranks on arrival.
        const lag=s.moving?Math.sin(Math.PI*s.progress)*j*.14:0;
        const mx=m.x+(s.moving?Math.sin(phase)*.035:0)+(pose?.side??0),mz=m.z+lag-(pose?.forward??0)+(fallen?.back??0);
        const x=s.x+mx*cos+mz*sin,z=s.z-mx*sin+mz*cos;
        const flying=m.type==='D';
        const lift=flying?(SQUADS.R.flightHeight+(m.altitudeOffset??0)+(pose?.lift??0)+(reducedMotion?0:Math.sin(time*2.4+j*.9)*.16+(s.moving?Math.sin(Math.PI*s.progress)*.6:0)))*(1-(fallen?.fall??0)):s.moving?Math.abs(Math.sin(phase))*.065:0;
        const y=h(x,z)+.025+lift;
        s.contacts??=[];s.contacts[j]={x,y:flying?y:y-lift,z,airborne:flying,model:m.type,unitId:s.id,generation:s.generation,ghost:!!s.ghost,side:piece.s,fall:fallen?.fall??0,pose,flagBearer:bearer};
        memberRoot.position.set(x,y,z);memberRoot.rotation.set((pose?.lean??0)+(fallen?.lean??0),heading+(pose?.twist??0),fallen?.roll??0,'YXZ');
        memberRoot.scale.setScalar((s.scale??1)*(fallen?.scale??1));memberRoot.updateMatrix();
        const detail=s.near&&(m.type!=='P'||camera.position.distanceTo(memberRoot.position)<45);
        for(const spec of compile(m.type,piece.s,piece.p,detail,articulated||bearer,bearer)){
          const mesh=batch(spec),p=spec.pivot;
          unit.position.copy(p);unit.rotation.set(0,0,0);
          let swing=0,wing=0,tail=0;
          if((articulated||flying)&&!reducedMotion){
            const sign=spec.part.endsWith('L')?1:-1;
            if(spec.part==='Cape')swing=Math.sin(time*2+j)*.08;
            else if(spec.part.startsWith('Wing'))wing=(Math.sin(time*(s.moving?7:5)+j*.9)*.62-.12)*sign;
            else if(spec.part==='Tail')tail=Math.sin(time*2+j)*.09;
            else if(['R','N','D'].includes(m.type)&&spec.part.startsWith('Leg'))swing=0;
            else if(/^(Foreleg|Hindleg)/.test(spec.part))swing=flying?(spec.part.startsWith('Fore')?.32:-.28):s.moving?Math.sin(phase+(spec.part.startsWith('Hind')?Math.PI:0))*.48*sign:0;
            else if(spec.part!=='Body')swing=s.moving?Math.sin(phase)*.27*sign:Math.sin(time*1.8+j)*.015;
            if(spec.part==='ArmR'&&pose){swing=pose.armR;tail=pose.armRY;}
            if(spec.part==='ArmL'&&pose){swing=pose.armL;tail=pose.armLY;}
            if(fallen?.guard&&['ArmR','ArmL'].includes(spec.part))swing=-(spec.part==='ArmR'?1.15:.85)*fallen.guard;
          }
          if(bearer&&spec.part==='ArmR'){swing=0;tail=0;}
          unit.rotateX(swing);unit.rotateZ(wing);unit.rotateY(tail);unit.scale.setScalar(1);unit.updateMatrix();matrix.multiplyMatrices(memberRoot.matrix,unit.matrix);
          if(bearer&&spec.part==='ArmR'){
            if(!grips.has(m.type)){const hand=army.getObjectByName('Unit_'+m.type).getObjectByName(m.type==='P'?'P_PalmR':m.type+'_Hand1');if(!hand)throw new Error('Flag bearer hand missing: '+m.type);grips.set(m.type,new T.Box3().setFromObject(hand).getCenter(new T.Vector3()).multiplyScalar(uniformScale));}
            const grip=grips.get(m.type);
            handPoint.copy(grip).sub(p).applyMatrix4(matrix);s.contacts[j].flagHand=handPoint.toArray();
            flagMatrix.copy(matrix).multiply(flagOffset.makeTranslation(grip.x-p.x,grip.y-p.y-.8,grip.z-p.z));
            flagMatrix.decompose(s.banner.position,s.banner.quaternion,s.banner.scale);
          }
          // Moving models and defeated ghosts cannot select a stale physical location.
          mesh.userData.cells[mesh.count]=s.ghost||s.motion?-1:s.cell;mesh.setMatrixAt(mesh.count++,matrix);mesh.visible=true;
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
    const hit=ray.intersectObjects(meshes,false).find(hit=>hit.object.userData.cells[hit.instanceId]>=0);
    return hit?{cell:hit.object.userData.cells[hit.instanceId],distance:hit.distance}:null;
  }
  function pickSurface(ray){
    const meshes=[...batches.values()].filter(b=>b.visible&&b.count);
    for(const mesh of meshes)mesh.computeBoundingSphere();
    const hit=ray.intersectObjects(meshes,false)[0];
    return hit?{point:hit.point,distance:hit.distance}:null;
  }
  return {setSquads,update,pickFlying,pickSurface,stats:()=>({soldiers:squads.reduce((n,s)=>n+SQUADS[s.piece.t].count,0),representedSoldiers:represented,flyingRiders:squads.filter(s=>s.piece.t==='R'&&s.piece.p).reduce((n,s)=>n+(s.members?.length??0),0),detailedSquads:detailed,instanceBatches:[...batches.values()].filter(b=>b.visible).length}),
    contacts:()=>squads.flatMap(s=>(s.contacts||[]).map(p=>({...p,cell:s.cell,ground:h(p.x,p.z)})))};
}
